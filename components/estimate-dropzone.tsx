"use client";

import { useRef, useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  url: string;
  type: string;
  name: string;
  /** Browser OCR text for photos — required on Vercel where server OCR can't load WASM. */
  extractedText?: string;
}

async function ocrInBrowser(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    return data.text;
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
