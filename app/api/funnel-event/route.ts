import { NextResponse } from "next/server";
import { z } from "zod";
import { FUNNEL_EVENTS, recordFunnelEvent } from "@/lib/analytics";

const schema = z.object({
  event: z.enum(FUNNEL_EVENTS),
  sessionId: z.string().max(80).optional(),
  path: z.string().max(240).optional(),
  source: z.string().max(120).optional(),
  medium: z.string().max(120).optional(),
  campaign: z.string().max(160).optional(),
  content: z.string().max(160).optional(),
  term: z.string().max(160).optional(),
  referrer: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordFunnelEvent(parsed.data.event, parsed.data);
  return NextResponse.json({ ok: true });
}
