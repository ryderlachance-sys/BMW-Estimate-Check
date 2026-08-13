import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const bodySchema = z.object({
  retailer: z.string().min(1).max(60),
  url: z.string().url().max(2000),
  partName: z.string().max(240).optional(),
  vehicle: z.string().max(160).optional(),
});

const allowedHosts = [
  "amazon.com",
  "ebay.com",
  "rockauto.com",
  "fcpeuro.com",
  "autopartsprime.com",
];

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const hostname = new URL(parsed.data.url).hostname.toLowerCase().replace(/^www\./, "");
  if (!allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await db.outboundClick.create({ data: parsed.data });
  return NextResponse.json({ ok: true });
}
