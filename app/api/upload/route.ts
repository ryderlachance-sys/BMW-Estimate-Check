import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { CUSTOMER_COOKIE, readCustomerToken } from "@/lib/session";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const MAX_SIZE = 16 * 1024 * 1024; // 16 MB
const uploadWindows = new Map<string, { count: number; resetAt: number }>();
const MAX_UPLOADS_PER_HOUR = 12;

function hasExpectedSignature(bytes: Buffer, type: string): boolean {
  if (type === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") {
    return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estimate upload. On Vercel (BLOB_READ_WRITE_TOKEN set) files go to Vercel Blob.
 * Locally without that token, files are saved under public/uploads.
 */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const sessionId = await readCustomerToken(store.get(CUSTOMER_COOKIE)?.value);
    if (!sessionId) {
      return NextResponse.json({ error: "Refresh the page before uploading." }, { status: 401 });
    }
    const now = Date.now();
    const current = uploadWindows.get(sessionId);
    if (current && current.resetAt > now && current.count >= MAX_UPLOADS_PER_HOUR) {
      return NextResponse.json(
        { error: "Upload limit reached. Try again in an hour." },
        { status: 429 }
      );
    }
    uploadWindows.set(sessionId, {
      count: current && current.resetAt > now ? current.count + 1 : 1,
      resetAt: current && current.resetAt > now ? current.resetAt : now + 60 * 60 * 1000,
    });

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
    if (!hasExpectedSignature(bytes, file.type)) {
      return NextResponse.json(
        { error: "That file does not match its declared PDF or image format." },
        { status: 400 }
      );
    }

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
