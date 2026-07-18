import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { put } from "@vercel/blob";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const MAX_SIZE = 16 * 1024 * 1024; // 16 MB

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estimate upload. On Vercel (BLOB_READ_WRITE_TOKEN set) files go to Vercel Blob.
 * Locally without that token, files are saved under public/uploads.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type — upload a PDF, PNG, JPG, or WebP" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File is larger than 16 MB" }, { status: 400 });
    }

    const filename = `estimates/${crypto.randomUUID()}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, bytes, {
        access: "public",
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return NextResponse.json({ url: blob.url, type: file.type });
    }

    // Local disk fallback for development without Blob.
    const localName = path.basename(filename);
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, localName), bytes);
    return NextResponse.json({ url: `/uploads/${localName}`, type: file.type });
  } catch (err) {
    console.error("upload failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
