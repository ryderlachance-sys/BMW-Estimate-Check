import "server-only";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  deliveryMissesAppointment,
  estimateDeliveryWindow,
} from "@/lib/delivery";
import { sendOrderEmail } from "@/lib/email";

/**
 * Marks a PENDING order as PAID after successful payment (Stripe or local demo),
 * clears the cart, and sends confirmation / appointment-warning emails.
 * Safe to call more than once.
 */
export async function finalizePaidOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) return;
  if (order.status !== "PENDING") return;

  await db.order.update({
    where: { id: orderId },
    data: { status: "PAID" },
  });

  await db.cartItem.deleteMany({
    where: { cart: { userId: order.userId } },
  });

  const window = estimateDeliveryWindow(
    order.createdAt,
    order.shipping === 0
  );
  const eta = order.estimatedDelivery ?? window.latest;
  const alreadyConfirmed = await db.emailNotification.findFirst({
    where: { orderId, type: "ORDER_CONFIRMED" },
  });
  if (alreadyConfirmed) return;

  if (order.shippingDestination === "MECHANIC") {
    await sendOrderEmail({
      userId: order.userId,
      orderId: order.id,
      toEmail: order.user.email,
      type: "ORDER_CONFIRMED",
      subject: `Order confirmed — parts shipping to ${order.mechanicShopName}`,
      body: [
        `Hi ${order.user.name ?? "there"},`,
        "",
        `Your payment for order #${order.id.slice(-8).toUpperCase()} (${formatCurrency(order.total)}) went through.`,
        "",
        "Your parts will be shipped directly to your repair shop before your scheduled appointment.",
        "",
        `Shop: ${order.mechanicShopName}`,
        `Address: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingState} ${order.shippingZip}`,
        order.appointmentDate
          ? `Appointment: ${formatDate(order.appointmentDate)}${order.appointmentTime ? ` at ${order.appointmentTime}` : ""}`
          : "",
        `Recommended delivery: ${window.label}`,
        `Estimated arrival by: ${formatDate(eta)}`,
        "",
        "Track everything from your dashboard.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    if (deliveryMissesAppointment(eta, order.appointmentDate)) {
      await sendOrderEmail({
        userId: order.userId,
        orderId: order.id,
        toEmail: order.user.email,
        type: "DELIVERY_AFTER_APPOINTMENT",
        subject: "Heads up: parts may arrive after your appointment",
        body: [
          `Hi ${order.user.name ?? "there"},`,
          "",
          order.appointmentDate
            ? `Your appointment is ${formatDate(order.appointmentDate)}, but estimated delivery is ${formatDate(eta)}.`
            : `Estimated delivery is ${formatDate(eta)}.`,
          "",
          "Consider rescheduling with your shop, or contact us about expedited shipping.",
          `Order #${order.id.slice(-8).toUpperCase()}`,
        ].join("\n"),
      });
    }
  } else {
    await sendOrderEmail({
      userId: order.userId,
      orderId: order.id,
      toEmail: order.user.email,
      type: "ORDER_CONFIRMED",
      subject: `Payment received — #${order.id.slice(-8).toUpperCase()}`,
      body: [
        `Hi ${order.user.name ?? "there"},`,
        "",
        `Your payment for order #${order.id.slice(-8).toUpperCase()} (${formatCurrency(order.total)}) went through.`,
        `Shipping to: ${order.shippingName}, ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingState} ${order.shippingZip}`,
        `Recommended delivery: ${window.label}`,
        `Estimated arrival by: ${formatDate(eta)}`,
        "",
        "Track everything from your dashboard.",
      ].join("\n"),
    });
  }
}
