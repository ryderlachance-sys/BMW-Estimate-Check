"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";
import { formatCurrency, round2 } from "@/lib/utils";
import { generateTrackingNumber } from "@/lib/delivery";
import { sendOrderEmail } from "@/lib/email";
import { markFulfillmentShipped } from "@/lib/fulfillment";
import type { OrderStatus, StockStatus } from "@prisma/client";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Admin access required");
  return admin;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await requireAdmin();
  const existing = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { user: true },
  });

  if (status === "SHIPPED") {
    const tracking = existing.trackingNumber ?? generateTrackingNumber();
    await markFulfillmentShipped(orderId, tracking);
    revalidatePath("/admin/orders");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/orders/${orderId}`);
    return;
  }

  const data: {
    status: OrderStatus;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
  } = { status };

  if (status === "DELIVERED") {
    data.deliveredAt = existing.deliveredAt ?? new Date();
    if (!existing.shippedAt) data.shippedAt = new Date();
    if (!existing.trackingNumber) data.trackingNumber = generateTrackingNumber();
  }

  const order = await db.order.update({
    where: { id: orderId },
    data,
    include: { user: true },
  });

  if (status === "DELIVERED" && existing.status !== "DELIVERED") {
    const dest =
      order.shippingDestination === "MECHANIC"
        ? order.mechanicShopName ?? "your repair shop"
        : "you";
    await sendOrderEmail({
      userId: order.userId,
      orderId: order.id,
      toEmail: order.user.email,
      type: "PARTS_DELIVERED",
      subject: `Parts delivered to ${dest}`,
      body: [
        `Hi ${order.user.name ?? "there"},`,
        "",
        `Good news — order #${order.id.slice(-8).toUpperCase()} (${formatCurrency(order.total)}) was delivered.`,
        order.shippingDestination === "MECHANIC"
          ? "Your parts are at the shop and ready for your appointment."
          : "Your parts have arrived.",
        order.trackingNumber ? `Tracking: ${order.trackingNumber}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function updateOrderShipping(
  orderId: string,
  data: { trackingNumber?: string; estimatedDelivery?: string }
): Promise<void> {
  await requireAdmin();
  const tracking = data.trackingNumber?.trim();
  if (tracking) {
    await markFulfillmentShipped(orderId, tracking);
  } else {
    await db.order.update({
      where: { id: orderId },
      data: {
        ...(data.estimatedDelivery
          ? { estimatedDelivery: new Date(data.estimatedDelivery) }
          : {}),
      },
    });
  }
  if (data.estimatedDelivery && tracking) {
    await db.order.update({
      where: { id: orderId },
      data: { estimatedDelivery: new Date(data.estimatedDelivery) },
    });
  }
  revalidatePath("/admin/orders");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function updateCatalogPart(
  partId: string,
  data: { price?: number; stockStatus?: StockStatus }
): Promise<void> {
  await requireAdmin();
  if (data.price !== undefined && !(data.price > 0)) {
    throw new Error("Price must be greater than 0");
  }
  await db.catalogPart.update({
    where: { id: partId },
    data: {
      ...(data.price !== undefined ? { price: round2(data.price) } : {}),
      ...(data.stockStatus ? { stockStatus: data.stockStatus } : {}),
    },
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/catalog");
}

/** Admin override of a part match: point a comparison at a different catalog part. */
export async function overrideComparisonMatch(
  comparisonId: string,
  newCatalogPartId: string
): Promise<void> {
  await requireAdmin();
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
    include: { estimateItem: true },
  });
  const part = await db.catalogPart.findUniqueOrThrow({ where: { id: newCatalogPartId } });

  const quantity = comparison.estimateItem?.quantity ?? 1;
  const ourPrice = round2(part.price * quantity);

  await db.comparison.update({
    where: { id: comparisonId },
    data: {
      catalogPartId: part.id,
      ourPrice,
      savings: round2(comparison.mechanicPrice - ourPrice),
      matchMethod: "MANUAL",
      matchScore: 1,
    },
  });
  revalidatePath(`/admin/estimates/${comparison.estimateId}`);
  revalidatePath(`/results/${comparison.estimateId}`);
}
