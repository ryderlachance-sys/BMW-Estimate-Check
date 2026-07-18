import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Package, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  deliveryMissesAppointment,
  estimateDeliveryWindow,
  formatAppointment,
} from "@/lib/delivery";
import { finalizePaidOrder } from "@/lib/orders";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; session_id?: string }>;
}) {
  const { order: orderId, session_id: sessionId } = await searchParams;
  const user = await ensureUser();

  // Confirm Stripe payment if we returned from Checkout with a session id.
  if (sessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      const paidOrderId =
        session.metadata?.orderId ??
        (
          await db.order.findFirst({
            where: { stripeSessionId: sessionId, userId: user.id },
            select: { id: true },
          })
        )?.id;
      if (
        paidOrderId &&
        (session.payment_status === "paid" || session.status === "complete")
      ) {
        await finalizePaidOrder(paidOrderId);
      }
    } catch {
      // Webhook may still finalize; page will show current order state.
    }
  }

  const order = orderId
    ? await db.order.findFirst({
        where: { id: orderId, userId: user.id },
        include: { items: { include: { catalogPart: true } } },
      })
    : null;

  const isMechanic = order?.shippingDestination === "MECHANIC";
  const window = estimateDeliveryWindow(
    order?.createdAt ?? new Date(),
    (order?.shipping ?? 0) === 0
  );
  const miss =
    order &&
    deliveryMissesAppointment(
      order.estimatedDelivery ?? window.latest,
      order.appointmentDate
    );
  const paid = order?.status === "PAID" || order?.status === "FULFILLING" ||
    order?.status === "SHIPPED" || order?.status === "DELIVERED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="size-9 text-success" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
        {paid ? "Payment confirmed!" : "Order received"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {paid
          ? isMechanic
            ? "Card charged. We're ordering the parts from our suppliers and shipping them to your shop."
            : "Card charged. We're ordering the parts from our suppliers and shipping them to your address."
          : "We're confirming your payment. Refresh in a moment if status hasn't updated yet."}
      </p>

      {order && (
        <Card className="mt-10 text-left">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">
                Order #{order.id.slice(-8).toUpperCase()}
              </p>
              <p className="font-bold tabular-nums">{formatCurrency(order.total)}</p>
            </div>

            {isMechanic ? (
              <div className="rounded-xl border bg-accent/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Wrench className="size-4 text-primary" /> Mechanic Delivery
                </p>
                <p className="mt-2 font-medium">{order.mechanicShopName}</p>
                <p className="text-sm text-muted-foreground">
                  {order.shippingAddress}, {order.shippingCity}, {order.shippingState}{" "}
                  {order.shippingZip}
                </p>
                <p className="mt-2 text-sm">
                  Appointment:{" "}
                  <strong>
                    {formatAppointment(order.appointmentDate, order.appointmentTime)}
                  </strong>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {window.label}. Estimated arrival by{" "}
                  <strong>
                    {formatDate(order.estimatedDelivery ?? window.latest)}
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <div className="rounded-xl border p-4 text-sm">
                <p className="font-semibold">Shipping to</p>
                <p className="mt-1 text-muted-foreground">
                  {order.shippingName}
                  <br />
                  {order.shippingAddress}, {order.shippingCity}, {order.shippingState}{" "}
                  {order.shippingZip}
                </p>
                <p className="mt-2 text-muted-foreground">
                  {window.label}. Estimated arrival by{" "}
                  <strong>
                    {formatDate(order.estimatedDelivery ?? window.latest)}
                  </strong>
                  .
                </p>
              </div>
            )}

            {miss && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  Estimated delivery may arrive <strong>after</strong> your appointment
                  date. We emailed you this heads-up — consider rescheduling with the shop
                  or asking about expedited shipping.
                </p>
              </div>
            )}

            <ul className="space-y-2 border-t pt-4 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.quantity}× {item.catalogPart.brand} {item.catalogPart.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-10 flex justify-center gap-3">
        <Link href={order ? `/dashboard/orders/${order.id}` : "/dashboard"}>
          <Button>
            <Package className="size-4" /> Track my order
          </Button>
        </Link>
        <Link href="/catalog">
          <Button variant="outline">Keep shopping</Button>
        </Link>
      </div>
    </div>
  );
}
