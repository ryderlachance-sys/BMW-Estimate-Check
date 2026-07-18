"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";
import { formatCurrency, formatDate, round2 } from "@/lib/utils";
import {
  addBusinessDays,
  generateTrackingNumber,
} from "@/lib/delivery";
import { sendOrderEmail } from "@/lib/email";
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

  const data: {
    status: OrderStatus;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
  } = { status };

  if (status === "SHIPPED") {
    data.trackingNumber = existing.trackingNumber ?? generateTrackingNumber();
    data.estimatedDelivery =
      existing.estimatedDelivery ?? addBusinessDays(new Date(), 3);
    data.shippedAt = existing.shippedAt ?? new Date();
  }
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

  if (status === "SHIPPED" && existing.status !== "SHIPPED") {
    const dest =
      order.shippingDestination === "MECHANIC"
        ? order.mechanicShopName ?? "your repair shop"
        : order.shippingName ?? "your address";
    await sendOrderEmail({
      userId: order.userId,
      orderId: order.id,
      toEmail: order.user.email,
      type: "PARTS_SHIPPED",
      subject: `Parts shipped — tracking ${order.trackingNumber}`,
      body: [
        `Hi ${order.user.name ?? "there"},`,
        "",
        `Your parts for order #${order.id.slice(-8).toUpperCase()} have shipped.`,
        `Destination: ${dest}`,
        `Tracking number: ${order.trackingNumber}`,
        order.estimatedDelivery
          ? `Estimated delivery: ${formatDate(order.estimatedDelivery)}`
          : "",
        "",
        "Watch status updates on your dashboard.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

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
  await db.order.update({
    where: { id: orderId },
    data: {
      ...(data.trackingNumber !== undefined
        ? { trackingNumber: data.trackingNumber.trim() || null }
        : {}),
      ...(data.estimatedDelivery
        ? { estimatedDelivery: new Date(data.estimatedDelivery) }
        : {}),
    },
  });
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
