import "server-only";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { sendOrderEmail } from "@/lib/email";

export type ShipTo = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
  company?: string | null;
};

export type ProcurementPayload = {
  orderId: string;
  total: number;
  currency: "usd";
  shipTo: ShipTo;
  destination: "HOME" | "MECHANIC";
  appointmentDate?: string | null;
  lines: {
    sku: string;
    brand: string;
    name: string;
    oemNumber: string | null;
    quantity: number;
    unitPrice: number;
    buyUrl: string;
  }[];
  /** Your site's callback so Zapier/Make can post tracking back. */
  trackingCallbackUrl: string;
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function rockAutoUrl(oem: string | null, fallbackQuery: string): string {
  const q = oem || fallbackQuery;
  return `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(q)}`;
}

function buildShipTo(order: {
  shippingDestination: string;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  mechanicShopName: string | null;
  mechanicPhone: string | null;
  mechanicContact: string | null;
}): ShipTo {
  return {
    name:
      order.shippingDestination === "MECHANIC"
        ? order.mechanicContact || order.shippingName || order.mechanicShopName || "Shop"
        : order.shippingName || "Customer",
    company: order.shippingDestination === "MECHANIC" ? order.mechanicShopName : null,
    address: order.shippingAddress || "",
    city: order.shippingCity || "",
    state: order.shippingState || "",
    zip: order.shippingZip || "",
    country: order.shippingCountry || "US",
    phone: order.mechanicPhone,
  };
}

/**
 * After a successful card payment: move order to FULFILLING, create a
 * procurement job, and dispatch to the configured fulfillment provider.
 *
 * Providers (first match wins for "primary", webhook+email can both fire):
 * - FULFILLMENT_WEBHOOK_URL → POST JSON to Zapier/Make/n8n/PartsTech bridge
 * - FULFILLMENT_EMAIL → write a buy-sheet email (also always stored in DB)
 */
export async function startFulfillment(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: { include: { catalogPart: true } },
      fulfillment: true,
    },
  });
  if (!order) return;
  if (order.status === "CANCELLED" || order.status === "SHIPPED" || order.status === "DELIVERED") {
    return;
  }
  if (order.fulfillment && order.fulfillment.status !== "FAILED") {
    return; // already running / done
  }

  const shipTo = buildShipTo(order);
  const lines = order.items.map((item) => {
    const oem = item.catalogPart.oemNumbers[0] ?? null;
    return {
      catalogPartId: item.catalogPartId,
      sku: item.catalogPart.sku,
      brand: item.catalogPart.brand,
      name: item.catalogPart.name,
      oemNumber: oem,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      buyUrl: rockAutoUrl(oem, `${item.catalogPart.brand} ${item.catalogPart.name}`),
      description: `${item.catalogPart.brand} ${item.catalogPart.name}`,
    };
  });

  const job = await db.fulfillmentJob.upsert({
    where: { orderId },
    create: {
      orderId,
      status: "PROCURING",
      provider: "pending",
      lines: {
        create: lines.map((l) => ({
          catalogPartId: l.catalogPartId,
          oemNumber: l.oemNumber,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          buyUrl: l.buyUrl,
        })),
      },
    },
    update: {
      status: "PROCURING",
      lastError: null,
      provider: "pending",
    },
    include: { lines: true },
  });

  await db.order.update({
    where: { id: orderId },
    data: { status: "FULFILLING" },
  });

  const payload: ProcurementPayload = {
    orderId: order.id,
    total: order.total,
    currency: "usd",
    shipTo,
    destination: order.shippingDestination,
    appointmentDate: order.appointmentDate?.toISOString() ?? null,
    lines: lines.map((l) => ({
      sku: l.sku,
      brand: l.brand,
      name: l.name,
      oemNumber: l.oemNumber,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      buyUrl: l.buyUrl,
    })),
    trackingCallbackUrl: `${appUrl()}/api/fulfillment/tracking`,
  };

  const providersUsed: string[] = [];
  const notes: string[] = [];

  // 1) External automation (Zapier / Make / custom PartsTech bridge)
  const webhook = process.env.FULFILLMENT_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.FULFILLMENT_WEBHOOK_SECRET
            ? { Authorization: `Bearer ${process.env.FULFILLMENT_WEBHOOK_SECRET}` }
            : {}),
        },
        body: JSON.stringify({
          event: "order.paid",
          ...payload,
        }),
      });
      if (!res.ok) {
        throw new Error(`Webhook HTTP ${res.status}`);
      }
      let externalRef: string | undefined;
      try {
        const data = (await res.json()) as { id?: string; orderId?: string };
        externalRef = data.id ?? data.orderId;
      } catch {
        // non-JSON ok
      }
      providersUsed.push("webhook");
      notes.push(`Webhook dispatched (${res.status})${externalRef ? ` ref=${externalRef}` : ""}`);
      if (externalRef) {
        await db.fulfillmentJob.update({
          where: { id: job.id },
          data: { externalRef },
        });
      }
    } catch (err) {
      notes.push(
        `Webhook failed: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  // 2) Always create an actionable buy sheet (email + DB) so nothing is lost
  const buySheet = [
    `PROCUREMENT ORDER — ${order.id.slice(-8).toUpperCase()}`,
    `Customer paid ${formatCurrency(order.total)} via Stripe.`,
    "",
    "SHIP TO:",
    shipTo.company ? `  ${shipTo.company}` : "",
    `  ${shipTo.name}`,
    `  ${shipTo.address}`,
    `  ${shipTo.city}, ${shipTo.state} ${shipTo.zip}`,
    `  ${shipTo.country}`,
    shipTo.phone ? `  Phone: ${shipTo.phone}` : "",
    order.appointmentDate
      ? `  Appointment: ${formatDate(order.appointmentDate)}${order.appointmentTime ? ` ${order.appointmentTime}` : ""}`
      : "",
    "",
    "BUY THESE PARTS (RockAuto links — use OEM #):",
    ...lines.map(
      (l, i) =>
        `${i + 1}. qty ${l.quantity} × ${l.description}` +
        (l.oemNumber ? ` | OEM ${l.oemNumber}` : "") +
        `\n   ${l.buyUrl}`
    ),
    "",
    `When shipped, POST tracking to: ${payload.trackingCallbackUrl}`,
    `Body JSON: { "orderId": "${order.id}", "trackingNumber": "1Z...", "secret": "FULFILLMENT_WEBHOOK_SECRET" }`,
    "",
    "Or paste tracking in Admin → Orders.",
  ]
    .filter(Boolean)
    .join("\n");

  const fulfillTo =
    process.env.FULFILLMENT_EMAIL?.trim() || order.user.email;

  await sendOrderEmail({
    userId: order.userId,
    orderId: order.id,
    toEmail: fulfillTo,
    type: "FULFILLMENT_BUY_SHEET",
    subject: `[FULFILL] Buy & ship parts for order #${order.id.slice(-8).toUpperCase()}`,
    body: buySheet,
  });
  providersUsed.push("email");
  notes.push(`Buy sheet emailed to ${fulfillTo}`);

  // Customer-facing: we're ordering their parts now
  await sendOrderEmail({
    userId: order.userId,
    orderId: order.id,
    toEmail: order.user.email,
    type: "PARTS_ORDERING",
    subject: `We're ordering your parts — #${order.id.slice(-8).toUpperCase()}`,
    body: [
      `Hi ${order.user.name ?? "there"},`,
      "",
      "Payment received. We're ordering your parts from our suppliers now and will ship them to:",
      "",
      shipTo.company ? shipTo.company : "",
      shipTo.name,
      shipTo.address,
      `${shipTo.city}, ${shipTo.state} ${shipTo.zip}`,
      "",
      "You'll get another email with tracking when the package is on the way.",
      `Order #${order.id.slice(-8).toUpperCase()}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const webhookOk = providersUsed.includes("webhook");
  await db.fulfillmentJob.update({
    where: { id: job.id },
    data: {
      provider: providersUsed.join("+"),
      status: webhookOk ? "ORDERED_FROM_SUPPLIER" : "PROCURING",
      procuredAt: webhookOk ? new Date() : null,
      procurementNotes: notes.join("\n"),
      lastError: webhook && !webhookOk ? notes.find((n) => n.startsWith("Webhook failed")) : null,
    },
  });
}

/**
 * Mark fulfillment shipped (from admin UI or tracking webhook).
 */
export async function markFulfillmentShipped(
  orderId: string,
  trackingNumber: string
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: true, fulfillment: true },
  });
  if (!order) throw new Error("Order not found");

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        trackingNumber,
        shippedAt: new Date(),
      },
    }),
    ...(order.fulfillment
      ? [
          db.fulfillmentJob.update({
            where: { id: order.fulfillment.id },
            data: { status: "SHIPPED" },
          }),
        ]
      : []),
  ]);

  await sendOrderEmail({
    userId: order.userId,
    orderId: order.id,
    toEmail: order.user.email,
    type: "PARTS_SHIPPED",
    subject: `Parts shipped — tracking ${trackingNumber}`,
    body: [
      `Hi ${order.user.name ?? "there"},`,
      "",
      `Your parts for order #${order.id.slice(-8).toUpperCase()} are on the way.`,
      `Tracking: ${trackingNumber}`,
      "",
      "You can also follow the order from your dashboard.",
    ].join("\n"),
  });
}
