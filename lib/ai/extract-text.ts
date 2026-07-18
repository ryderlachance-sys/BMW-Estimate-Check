import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ocrQualityScore, repairOcrText } from "@/lib/ocr/repair";

/** Reads an uploaded estimate: local files from public/, remote URLs via fetch. */
async function readFileBuffer(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith("/")) {
    // Local upload saved under public/ — guard against path traversal.
    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.normalize(path.join(publicDir, fileUrl));
    if (!filePath.startsWith(publicDir)) throw new Error("Invalid file path");
    return readFile(filePath);
  }
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to download estimate file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

interface PdfTextItem {
  str: string;
  transform: number[];
}

/**
 * Custom page renderer: pdf-parse's default joins table cells with no
 * separator ("Ignition coil4$260.00"). We join items on the same visual line
 * with spaces and start a new line when the Y position changes, so estimate
 * tables come out as parseable rows.
 */
function renderPageWithSpacing(pageData: {
  getTextContent: (opts: object) => Promise<{ items: PdfTextItem[] }>;
}): Promise<string> {
  return pageData
    .getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false })
    .then((content) => {
      let text = "";
      let lastY: number | undefined;
      for (const item of content.items) {
        if (!item.str) continue;
        const y = item.transform[5];
        if (lastY !== undefined && Math.abs(y - lastY) > 1.5) {
          text += "\n";
        } else if (text && !text.endsWith("\n")) {
          text += " ";
        }
        text += item.str;
        lastY = y;
      }
      return text;
    });
}

/**
 * Upscale + clean the image so OCR can read small text reliably.
 * Photos and screenshots of estimates are usually too low-resolution for
 * tesseract at native size.
 */
async function preprocessForOcr(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const image = sharp(buffer);
  const meta = await image.metadata();
  const targetWidth = Math.max((meta.width ?? 1000) * 2, 2400);
  return image
    .resize({ width: Math.min(targetWidth, 4800) })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

/**
 * Free local OCR for photos/screenshots — no external service required.
 * Runs two page-segmentation modes and keeps the better result, since
 * invoice-style tables trip up single-mode OCR.
 */
async function ocrImage(buffer: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const processed = await preprocessForOcr(buffer);
  const cachePath = path.join(process.env.VERCEL ? "/tmp" : process.cwd(), ".tesseract");
  const worker = await createWorker("eng", 1, { cachePath });
  try {
    let best = "";
    let bestScore = -1;
    for (const psm of ["4", "6"]) {
      await worker.setParameters({ tessedit_pageseg_mode: psm as never });
      const { data } = await worker.recognize(processed);
      const score = ocrQualityScore(data.text);
      if (score > bestScore) {
        best = data.text;
        bestScore = score;
      }
    }
    return repairOcrText(best);
  } finally {
    await worker.terminate();
  }
}

/**
 * Extracts raw text from an estimate file.
 * PDFs are parsed directly; images go through local OCR (tesseract.js).
 */
export async function extractTextFromFile(
  fileUrl: string,
  fileType: string
): Promise<{ text: string | null; isImage: boolean }> {
  const isImage = fileType.startsWith("image/");
  if (isImage) {
    const buffer = await readFileBuffer(fileUrl);
    const text = await ocrImage(buffer);
    return { text, isImage: true };
  }

  if (fileType === "application/pdf") {
    const buffer = await readFileBuffer(fileUrl);

    // Import the internal module to avoid pdf-parse's debug-mode file reads.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
      b: Buffer,
      opts?: object
    ) => Promise<{ text: string }>;
    const result = await pdfParse(buffer, { pagerender: renderPageWithSpacing });
    return { text: result.text, isImage: false };
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

/**
 * Returns an image reference an AI provider can consume: remote URLs pass
 * through; local uploads are inlined as base64 data URLs.
 */
export async function getImageForAi(fileUrl: string, fileType: string): Promise<string> {
  if (!fileUrl.startsWith("/")) return fileUrl;
  const buffer = await readFileBuffer(fileUrl);
  return `data:${fileType};base64,${buffer.toString("base64")}`;
}
