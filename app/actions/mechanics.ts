"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { canEditMechanicDelivery, deliveryMissesAppointment } from "@/lib/delivery";
import { formatDate } from "@/lib/utils";
import { sendOrderEmail } from "@/lib/email";

const MechanicUpdateSchema = z.object({
  shopName: z.string().min(2),
  contactPerson: z.string().optional(),
  address: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  phone: z.string().min(7),
  appointmentDate: z.string().min(1),
  appointmentTime: z.string().optional(),
  repairNotes: z.string().optional(),
  saveToFavorites: z.boolean().optional(),
});

export type MechanicActionState = { error?: string; ok?: boolean } | null;

function parseAppointmentDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** Edit mechanic delivery details on an order until fulfillment starts. */
export async function updateOrderMechanicDelivery(
  _prev: MechanicActionState,
  formData: FormData
): Promise<MechanicActionState> {
  const user = await ensureUser();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
  });
  if (!order) return { error: "Order not found" };
  if (order.shippingDestination !== "MECHANIC") {
    return { error: "This order is not a mechanic delivery" };
  }
  if (!canEditMechanicDelivery(order.status)) {
    return { error: "Mechanic details can no longer be edited — order is already processing" };
  }

  const parsed = MechanicUpdateSchema.safeParse({
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
    saveToFavorites: formData.get("saveToFavorites") === "yes",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid details" };
  }
  const m = parsed.data;
  const appointmentDate = parseAppointmentDate(m.appointmentDate);

  let mechanicId = order.mechanicId;
  if (m.saveToFavorites) {
    if (mechanicId) {
      await db.mechanic.update({
        where: { id: mechanicId },
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
    } else {
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
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      mechanicId,
      mechanicShopName: m.shopName,
      mechanicContact: m.contactPerson ?? null,
      mechanicPhone: m.phone,
      shippingName: m.shopName,
      shippingAddress: m.address,
      shippingCity: m.city,
      shippingState: m.state,
      shippingZip: m.zip,
      appointmentDate,
      appointmentTime: m.appointmentTime ?? null,
      repairNotes: m.repairNotes ?? null,
    },
  });

  if (
    deliveryMissesAppointment(order.estimatedDelivery, appointmentDate)
  ) {
    await sendOrderEmail({
      userId: user.id,
      orderId: order.id,
      toEmail: user.email,
      type: "DELIVERY_AFTER_APPOINTMENT",
      subject: "Heads up: parts may arrive after your appointment",
      body: [
        `Hi ${user.name ?? "there"},`,
        "",
        `You updated your appointment to ${formatDate(appointmentDate)}.`,
        order.estimatedDelivery
          ? `Estimated delivery is still ${formatDate(order.estimatedDelivery)}.`
          : "Estimated delivery has not been confirmed yet.",
        "",
        "Consider adjusting the appointment or asking about expedited shipping.",
      ].join("\n"),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/orders/${order.id}`);
  return { ok: true };
}

export async function removeFavoriteMechanic(mechanicId: string): Promise<void> {
  const user = await ensureUser();
  await db.mechanic.deleteMany({ where: { id: mechanicId, userId: user.id } });
  revalidatePath("/dashboard");
  revalidatePath("/checkout");
}

export async function toggleFavoriteMechanic(
  mechanicId: string,
  isFavorite: boolean
): Promise<void> {
  const user = await ensureUser();
  await db.mechanic.updateMany({
    where: { id: mechanicId, userId: user.id },
    data: { isFavorite },
  });
  revalidatePath("/dashboard");
  revalidatePath("/checkout");
}
