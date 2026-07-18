import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { finalizePaidOrder } from "@/lib/orders";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook: marks the matching order PAID when Checkout completes.
 * Configure at https://dashboard.stripe.com/test/webhooks → this URL +
 * event `checkout.session.completed`. Local tip: `stripe listen --forward-to
 * localhost:3000/api/webhooks/stripe`
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  let event;
  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Dev convenience when webhook secret isn't set yet — still parse JSON.
      event = JSON.parse(body);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id?: string;
      metadata?: { orderId?: string };
      payment_status?: string;
    };
    const orderId =
      session.metadata?.orderId ??
      (
        await db.order.findFirst({
          where: { stripeSessionId: session.id },
          select: { id: true },
        })
      )?.id;

    if (orderId && session.payment_status === "paid") {
      await finalizePaidOrder(orderId);
    } else if (orderId && !session.payment_status) {
      // Some webhook payloads omit payment_status when already completed.
      await finalizePaidOrder(orderId);
    }
  }

  return NextResponse.json({ received: true });
}
