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

  if (process.env.NODE_ENV === "production" && !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook signing is not configured" },
      { status: 503 }
    );
  }
  if (webhookSecret && !signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 401 });
  }

  let event;
  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else if (process.env.NODE_ENV !== "production") {
      // Dev convenience when webhook secret isn't set yet — still parse JSON.
      event = JSON.parse(body);
    } else {
      return NextResponse.json({ error: "Webhook verification required" }, { status: 401 });
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
    }
  }

  return NextResponse.json({ received: true });
}
