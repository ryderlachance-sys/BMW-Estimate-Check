import "server-only";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { sendOrderEmail } from "@/lib/email";
import { bestBuyForPart } from "@/lib/affiliates";

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
  customerEmail: string;
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
    /** Estimated supplier cost (~75% of sell price) — your margin is the rest. */
    estimatedCost: number;
    buyUrl: string;
    store: string;
  }[];
  estimatedProfit: number;
  trackingCallbackUrl: string;
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    .replace(/\\r\\n/g, "")
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/\/$/, "");
}

/** True when a hands-off buyer is configured (you don't click RockAuto yourself). */
export function isAutoDropshipConfigured(): {
  orderDesk: boolean;
  webhook: boolean;
  emailBuyer: boolean;
  ready: boolean;
} {
  const orderDesk = Boolean(
    process.env.ORDERDESK_STORE_ID?.trim() && process.env.ORDERDESK_API_KEY?.trim()
  );
  const webhook = Boolean(process.env.FULFILLMENT_WEBHOOK_URL?.trim());
  const emailBuyer = Boolean(process.env.FULFILLMENT_EMAIL?.trim());
  return { orderDesk, webhook, emailBuyer, ready: orderDesk || webhook };
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

async function dispatchOrderDesk(payload: ProcurementPayload): Promise<{ ok: boolean; ref?: string; error?: string }> {
  const storeId = process.env.ORDERDESK_STORE_ID?.trim();
  const apiKey = process.env.ORDERDESK_API_KEY?.trim();
  if (!storeId || !apiKey) return { ok: false, error: "Order Desk not configured" };

  const nameParts = payload.shipTo.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || "Order";

  const body = {
    source_id: payload.orderId,
    email: payload.customerEmail,
    shipping_method: "freeform",
    shipping: {
      first_name: firstName,
      last_name: lastName,
      company: payload.shipTo.company || "",
      address1: payload.shipTo.address,
      city: payload.shipTo.city,
      state: payload.shipTo.state,
      postal_code: payload.shipTo.zip,
      country: payload.shipTo.country,
      phone: payload.shipTo.phone || "",
    },
    order_items: payload.lines.map((l) => ({
      name: `${l.brand} ${l.name}`,
      price: l.estimatedCost.toFixed(2),
      quantity: l.quantity,
      code: l.oemNumber || l.sku,
      delivery_type: "ship",
      metadata: {
        sell_price: String(l.unitPrice),
        buy_url: l.buyUrl,
        store: l.store,
        oem: l.oemNumber || "",
      },
    })),
    note: `BMW Estimate Check dropship. Customer paid $${payload.total.toFixed(2)}. Est. profit $${payload.estimatedProfit.toFixed(2)}. Callback: ${payload.trackingCallbackUrl}`,
  };

  const res = await fetch("https://app.orderdesk.me/api/v2/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ORDERDESK-STORE-ID": storeId,
      "ORDERDESK-API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Order Desk HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  let ref: string | undefined;
  try {
    const data = (await res.json()) as { id?: number | string; order?: { id?: number | string } };
    ref = String(data.id ?? data.order?.id ?? "");
  } catch {
    // ok
  }
  return { ok: true, ref: ref || undefined };
}

async function dispatchWebhook(payload: ProcurementPayload): Promise<{ ok: boolean; ref?: string; error?: string }> {
  const webhook = process.env.FULFILLMENT_WEBHOOK_URL?.trim();
  if (!webhook) return { ok: false, error: "Webhook not configured" };

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
    return { ok: false, error: `Webhook HTTP ${res.status}` };
  }

  let ref: string | undefined;
  try {
    const data = (await res.json()) as { id?: string; orderId?: string };
    ref = data.id ?? data.orderId;
  } catch {
    // non-JSON ok
  }
  return { ok: true, ref };
}

/**
 * After a successful card payment: move order to FULFILLING and auto-dispatch
 * procurement to Order Desk and/or your fulfillment webhook so you never
 * manually buy parts. Customer already paid you — margin = sell − supplier cost.
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
    return;
  }

  const shipTo = buildShipTo(order);
  const lines = order.items.map((item) => {
    const oem = item.catalogPart.oemNumbers[0] ?? null;
    const best = bestBuyForPart({
      brand: item.catalogPart.brand,
      name: item.catalogPart.name,
      oemNumbers: item.catalogPart.oemNumbers,
    });
    const estimatedCost = Math.round(item.unitPrice * 0.75 * 100) / 100;
    return {
      catalogPartId: item.catalogPartId,
      sku: item.catalogPart.sku,
      brand: item.catalogPart.brand,
      name: item.catalogPart.name,
      oemNumber: oem,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      estimatedCost,
      buyUrl: best.url,
      store: best.label,
      description: `${item.catalogPart.brand} ${item.catalogPart.name}`,
    };
  });

  const estimatedProfit = Math.round(
    (order.total -
      lines.reduce((s, l) => s + l.estimatedCost * l.quantity, 0) -
      order.shipping) *
      100
  ) / 100;

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
    customerEmail: order.user.email,
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
      estimatedCost: l.estimatedCost,
      buyUrl: l.buyUrl,
      store: l.store,
    })),
    estimatedProfit,
    trackingCallbackUrl: `${appUrl()}/api/fulfillment/tracking`,
  };

  const providersUsed: string[] = [];
  const notes: string[] = [];
  let externalRef: string | undefined;
  let autoOk = false;

  // 1) Order Desk — routes to Amazon/suppliers that ship for you
  if (isAutoDropshipConfigured().orderDesk) {
    try {
      const result = await dispatchOrderDesk(payload);
      if (result.ok) {
        autoOk = true;
        providersUsed.push("orderdesk");
        notes.push(`Order Desk accepted${result.ref ? ` ref=${result.ref}` : ""}`);
        if (result.ref) externalRef = result.ref;
      } else {
        notes.push(`Order Desk failed: ${result.error}`);
      }
    } catch (err) {
      notes.push(`Order Desk error: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // 2) Custom webhook (Make / Zapier / n8n / PartsTech bridge)
  if (isAutoDropshipConfigured().webhook) {
    try {
      const result = await dispatchWebhook(payload);
      if (result.ok) {
        autoOk = true;
        providersUsed.push("webhook");
        notes.push(`Webhook dispatched${result.ref ? ` ref=${result.ref}` : ""}`);
        if (result.ref) externalRef = result.ref;
      } else {
        notes.push(`Webhook failed: ${result.error}`);
      }
    } catch (err) {
      notes.push(`Webhook error: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // 3) Buyer email — ONLY to FULFILLMENT_EMAIL (never the customer)
  const buyerEmail = process.env.FULFILLMENT_EMAIL?.trim();
  if (buyerEmail) {
    const buySheet = [
      `AUTO-DROPSHIP FALLBACK — ${order.id.slice(-8).toUpperCase()}`,
      `Customer paid ${formatCurrency(order.total)}. Est. profit ${formatCurrency(estimatedProfit)}.`,
      autoOk
        ? "Primary auto-dispatch already ran — this is a backup copy."
        : "WARNING: No Order Desk / webhook succeeded. Buy these parts and ship to the address below.",
      "",
      "SHIP TO:",
      shipTo.company ? `  ${shipTo.company}` : "",
      `  ${shipTo.name}`,
      `  ${shipTo.address}`,
      `  ${shipTo.city}, ${shipTo.state} ${shipTo.zip}`,
      `  ${shipTo.country}`,
      shipTo.phone ? `  Phone: ${shipTo.phone}` : "",
      "",
      "PARTS (best store link each):",
      ...lines.map(
        (l, i) =>
          `${i + 1}. qty ${l.quantity} × ${l.description}` +
          (l.oemNumber ? ` | OEM ${l.oemNumber}` : "") +
          `\n   via ${l.store}: ${l.buyUrl}`
      ),
      "",
      `POST tracking to: ${payload.trackingCallbackUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    await sendOrderEmail({
      userId: order.userId,
      orderId: order.id,
      toEmail: buyerEmail,
      type: "FULFILLMENT_BUY_SHEET",
      subject: `[DROPSHIP] Order #${order.id.slice(-8).toUpperCase()} — ${autoOk ? "auto-sent" : "NEEDS BUY"}`,
      body: buySheet,
    });
    providersUsed.push("email");
    notes.push(`Buyer sheet emailed to ${buyerEmail}`);
  } else if (!autoOk) {
    notes.push(
      "No ORDERDESK_*/FULFILLMENT_WEBHOOK_URL/FULFILLMENT_EMAIL — set one in Vercel env for hands-off buying."
    );
  }

  // Customer: we handle ordering — they never see supplier links
  await sendOrderEmail({
    userId: order.userId,
    orderId: order.id,
    toEmail: order.user.email,
    type: "PARTS_ORDERING",
    subject: `We're ordering your parts — #${order.id.slice(-8).toUpperCase()}`,
    body: [
      `Hi ${order.user.name ?? "there"},`,
      "",
      "Payment received. We're ordering your parts from our suppliers automatically and will ship them to:",
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

  await db.fulfillmentJob.update({
    where: { id: job.id },
    data: {
      provider: providersUsed.length ? providersUsed.join("+") : "none",
      status: autoOk ? "ORDERED_FROM_SUPPLIER" : "PROCURING",
      procuredAt: autoOk ? new Date() : null,
      externalRef: externalRef || null,
      procurementNotes: notes.join("\n"),
      lastError: autoOk
        ? null
        : notes.find((n) => /failed|error|No ORDERDESK/i.test(n)) ??
          "Auto-dropship not configured — add Order Desk or FULFILLMENT_WEBHOOK_URL",
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
