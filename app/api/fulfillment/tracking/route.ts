import { NextResponse } from "next/server";
import { z } from "zod";
import { markFulfillmentShipped } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().min(4),
  secret: z.string().optional(),
});

/**
 * External fulfillment systems (Zapier / Make / PartsTech bridge) POST here
 * when a supplier package has tracking.
 *
 * POST /api/fulfillment/tracking
 * { "orderId": "...", "trackingNumber": "1Z...", "secret": "<FULFILLMENT_WEBHOOK_SECRET>" }
 */
export async function POST(req: Request) {
  const expected = process.env.FULFILLMENT_WEBHOOK_SECRET?.trim();
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const provided = parsed.data.secret ?? bearer ?? req.headers.get("x-fulfillment-secret");

  if (expected && provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await markFulfillmentShipped(parsed.data.orderId, parsed.data.trackingNumber.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
