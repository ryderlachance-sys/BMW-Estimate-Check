/**
 * Re-OCR + reparse a production estimate using local sharp/tesseract.
 * Usage: npx tsx --conditions=react-server scripts/reparse-estimate.ts <id>
 */
import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { ocrQualityScore, repairOcrText } from "../lib/ocr/repair";
import { parseEstimateHeuristically } from "../lib/ai/heuristic-parser";
import { normalizeOemNumber } from "../lib/comparison";

const url = process.env.DATABASE_URL?.replace(/\\r\\n/g, "").replace(/\r?\n/g, "").trim();
const db = new PrismaClient({ datasources: { db: { url } } });

async function preprocess(buffer: Buffer): Promise<Buffer> {
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

async function ocrBuffer(buffer: Buffer): Promise<string> {
  const processed = await preprocess(buffer);
  const worker = await createWorker("eng");
  try {
    let best = "";
    let bestScore = -1;
    for (const psm of ["4", "6"] as const) {
      await worker.setParameters({ tessedit_pageseg_mode: psm });
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

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error("Pass estimate id");
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id },
    include: { vehicle: true },
  });

  const res = await fetch(estimate.originalFileUrl);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join("tmp", `reparse-${id}.png`), buffer);

  const text = await ocrBuffer(buffer);
  const parsed = parseEstimateHeuristically(text);
  console.log(JSON.stringify(parsed, null, 2));

  if (parsed.parts.length === 0) throw new Error("No parts parsed");

  await db.$transaction([
    db.comparison.deleteMany({ where: { estimateId: id } }),
    db.estimateItem.deleteMany({ where: { estimateId: id } }),
    db.estimateItem.createMany({
      data: parsed.parts.map((p) => ({
        estimateId: id,
        description: p.description,
        quantity: Math.max(1, p.quantity),
        mechanicPrice: p.mechanicPrice,
        oemPartNumber: normalizeOemNumber(p.oemPartNumber),
      })),
    }),
    db.estimate.update({
      where: { id },
      data: {
        extractedText: text,
        mechanicShopName: parsed.shopName,
        mechanicTotal: parsed.totalEstimate,
        laborTotal: parsed.laborTotal,
        status: "PARSED",
        errorMessage: null,
      },
    }),
  ]);

  // Build comparisons inline (same logic as buildComparisons but without server-only import issues)
  const { buildComparisons } = await import("../lib/comparison");
  await buildComparisons(id);

  const updated = await db.estimate.findUniqueOrThrow({
    where: { id },
    include: { items: true, comparisons: true },
  });
  console.log({
    total: updated.mechanicTotal,
    labor: updated.laborTotal,
    items: updated.items.length,
    matches: updated.comparisons.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
