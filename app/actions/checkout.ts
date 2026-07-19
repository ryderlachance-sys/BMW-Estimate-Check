"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { calculateShipping, round2 } from "@/lib/utils";
import { estimateDeliveryWindow } from "@/lib/delivery";
import { finalizePaidOrder } from "@/lib/orders";
import { dollarsToCents, getStripe, isStripeConfigured } from "@/lib/stripe";

const HomeSchema = z.object({
  destination: z.literal("HOME"),
  name: z.string().min(2, "Full name is required"),
  address: z.string().min(4, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
});

const MechanicSchema = z.object({
  destination: z.literal("MECHANIC"),
  mechanicId: z.string().optional(),
  shopName: z.string().min(2, "Shop name is required"),
  contactPerson: z.string().optional(),
  address: z.string().min(4, "Shop address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  phone: z
    .string()
    .min(7, "Phone number is required")
    .regex(/^[\d\s()+.-]+$/, "Enter a valid phone number"),
  appointmentDate: z.string().min(1, "Appointment date is required"),
  appointmentTime: z.string().optional(),
  repairNotes: z.string().optional(),
  saveMechanic: z.enum(["yes", "no"]).optional(),
});

export type PlaceOrderState = { error?: string } | null;

function parseAppointmentDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    .replace(/\\r\\n/g, "")
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/\/$/, "");
}

/**
 * Checkout: collect shipping / Mechanic Delivery, create a PENDING order,
 * then charge the card via Stripe Checkout when configured.
 * Without Stripe keys, completes locally (demo) so the rest of the app still works.
 */
export async function placeOrder(
  _prev: PlaceOrderState,
  formData: FormData
): Promise<PlaceOrderState> {
  const user = await ensureUser();
  const destination = String(formData.get("destination") ?? "HOME");

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { catalogPart: true } } },
  });
  if (!cart || cart.items.length === 0) redirect("/cart");

  const subtotal = round2(
    cart.items.reduce((sum, i) => sum + i.catalogPart.price * i.quantity, 0)
  );
  const shippingCost = calculateShipping(subtotal);
  const total = round2(subtotal + shippingCost);
  const window = estimateDeliveryWindow(new Date(), shippingCost === 0);

  let orderId = "";

  if (destination === "MECHANIC") {
    const parsed = MechanicSchema.safeParse({
      destination: "MECHANIC",
      mechanicId: String(formData.get("mechanicId") ?? "") || undefined,
      shopName: formData.get("shopName"),
      contactPerson: String(formData.get("contactPerson") ?? "") || undefined,
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      zip: formData.get("zip"),
      phone: formData.get("phone"),
      appointmentDate: formData.get("appointmentDate"),
      appointmentTime: String(formData.get("appointmentTime") ?? "") || undefined,
      repairNotes: String(formData.get("repairNotes") ?? "") || undefined,
      saveMechanic: formData.get("saveMechanic") === "yes" ? "yes" : "no",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid mechanic details" };
    }
    const m = parsed.data;
    const appointmentDate = parseAppointmentDate(m.appointmentDate);

    let mechanicId = m.mechanicId ?? null;
    if (mechanicId) {
      const existing = await db.mechanic.findFirst({
        where: { id: mechanicId, userId: user.id },
      });
      if (!existing) mechanicId = null;
      else {
        await db.mechanic.update({
          where: { id: existing.id },
          data: {
            shopName: m.shopName,
            contactPerson: m.contactPerson ?? null,
            address: m.address,
            city: m.city,
            state: m.state,
            zip: m.zip,
            phone: m.phone,
            notes: m.repairNotes ?? null,
            isFavorite: true,
          },
        });
      }
    }

    if (!mechanicId && m.saveMechanic !== "no") {
      const created = await db.mechanic.create({
        data: {
          userId: user.id,
          shopName: m.shopName,
          contactPerson: m.contactPerson ?? null,
          address: m.address,
          city: m.city,
          state: m.state,
          zip: m.zip,
          phone: m.phone,
          notes: m.repairNotes ?? null,
          isFavorite: true,
        },
      });
      mechanicId = created.id;
    }

    const order = await db.order.create({
      data: {
        userId: user.id,
        subtotal,
        shipping: shippingCost,
        tax: 0,
        total,
        status: "PENDING",
        shippingDestination: "MECHANIC",
        shippingName: m.shopName,
        shippingAddress: m.address,
        shippingCity: m.city,
        shippingState: m.state,
        shippingZip: m.zip,
        shippingCountry: "US",
        mechanicId,
        mechanicShopName: m.shopName,
        mechanicContact: m.contactPerson ?? null,
        mechanicPhone: m.phone,
        appointmentDate,
        appointmentTime: m.appointmentTime ?? null,
        repairNotes: m.repairNotes ?? null,
        estimatedDelivery: window.latest,
        items: {
          create: cart.items.map((i) => ({
            catalogPartId: i.catalogPartId,
            quantity: i.quantity,
            unitPrice: i.catalogPart.price,
          })),
        },
      },
    });
    orderId = order.id;
  } else {
    const parsed = HomeSchema.safeParse({
      destination: "HOME",
      name: formData.get("name"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      zip: formData.get("zip"),
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid shipping details" };
    }
    const shippingInfo = parsed.data;

    const order = await db.order.create({
      data: {
        userId: user.id,
        subtotal,
        shipping: shippingCost,
        tax: 0,
        total,
        status: "PENDING",
        shippingDestination: "HOME",
        shippingName: shippingInfo.name,
        shippingAddress: shippingInfo.address,
        shippingCity: shippingInfo.city,
        shippingState: shippingInfo.state,
        shippingZip: shippingInfo.zip,
        shippingCountry: "US",
        estimatedDelivery: window.latest,
        items: {
          create: cart.items.map((i) => ({
            catalogPartId: i.catalogPartId,
            quantity: i.quantity,
            unitPrice: i.catalogPart.price,
          })),
        },
      },
    });
    orderId = order.id;
  }

  // Real money path: Stripe-hosted card form.
  if (isStripeConfigured()) {
    const stripe = getStripe();
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { catalogPart: true } } },
    });

    const lineItems = order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: dollarsToCents(item.unitPrice),
        product_data: {
          name: `${item.catalogPart.brand} ${item.catalogPart.name}`,
          description: item.catalogPart.sku,
        },
      },
    }));

    if (order.shipping > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: dollarsToCents(order.shipping),
          product_data: {
            name: "Shipping",
            description: "Ground shipping",
          },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: lineItems,
      client_reference_id: order.id,
      metadata: { orderId: order.id, userId: user.id },
      success_url: `${appUrl()}/checkout/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/checkout?cancelled=1`,
    });

    await db.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    if (!session.url) {
      return { error: "Could not start Stripe Checkout. Try again." };
    }
    redirect(session.url);
  }

  // Demo path (no Stripe keys): mark paid locally so flows still work.
  await finalizePaidOrder(orderId);
  redirect(`/checkout/success?order=${orderId}`);
}
