"use client";

import { useRef, useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ocrQualityScore, repairOcrText } from "@/lib/ocr/repair";

export interface UploadedFile {
  url: string;
  type: string;
  name: string;
  /** Browser OCR text for photos — required on Vercel where server OCR can't load WASM. */
  extractedText?: string;
}

/** Upscale + grayscale + contrast so small estimate text is readable by tesseract. */
async function preprocessImageForOcr(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.max(2, 2400 / Math.max(bitmap.width, 1));
    const width = Math.min(Math.round(bitmap.width * scale), 4800);
    const height = Math.round(bitmap.height * (width / bitmap.width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    let min = 255;
    let max = 0;
    const gray = new Float32Array(data.length / 4);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[p] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(max - min, 1);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const normalized = ((gray[p] - min) / range) * 255;
      const contrasted = ((normalized / 255 - 0.5) * 1.35 + 0.5) * 255;
      const v = Math.min(255, Math.max(0, contrasted));
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw new Error("Image preprocess failed");
    return blob;
  } finally {
    bitmap.close();
  }
}

async function ocrInBrowser(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const processed = await preprocessImageForOcr(file);
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

/** Drag-and-drop uploader. Photos are OCR'd in the browser before submit. */
export function EstimateDropzone({
  onUploaded,
  onError,
}: {
  onUploaded: (file: UploadedFile) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("Uploading…");

  async function handleFile(file: File | undefined | null) {
    if (!file || uploading) return;
    setUploading(true);
    setStatus("Uploading…");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Upload failed");
        return;
      }

      let extractedText: string | undefined;
      if (file.type.startsWith("image/")) {
        setStatus("Reading text from photo…");
        extractedText = await ocrInBrowser(file);
        if (!extractedText || extractedText.trim().length < 10) {
          onError(
            "Couldn't read text from that photo. Try a clearer image or upload the PDF."
          );
          return;
        }
      }

      onUploaded({
        url: data.url,
        type: data.type,
        name: file.name,
        extractedText,
      });
    } catch {
      onError("Upload failed — please try again.");
    } finally {
      setUploading(false);
      setStatus("Uploading…");
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      disabled={uploading}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-input px-6 py-12 text-center transition-colors",
        dragOver ? "border-primary bg-accent" : "hover:border-primary/50 hover:bg-secondary/50",
        uploading && "pointer-events-none opacity-60"
      )}
    >
      {uploading ? (
        <Loader2 className="size-9 animate-spin text-primary" />
      ) : (
        <CloudUpload className="size-9 text-primary" />
      )}
      <span className="font-semibold">
        {uploading ? status : "Drop your estimate here, or click to browse"}
      </span>
      <span className="text-xs text-muted-foreground">
        PDF, PNG, JPG, or WebP — up to 16 MB
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </button>
  );
}
