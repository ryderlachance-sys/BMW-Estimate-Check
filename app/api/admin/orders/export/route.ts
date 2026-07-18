import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await db.order.findMany({
    include: { user: true, items: { include: { catalogPart: true } } },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Order ID", "Date", "Customer", "Email", "Status", "Destination",
    "Subtotal", "Shipping", "Tax", "Total", "Ship To", "Address", "City",
    "State", "Zip", "Country", "Mechanic Phone", "Appointment", "Tracking",
    "Estimated Delivery", "Items",
  ];

  const rows = orders.map((o) => [
    o.id,
    o.createdAt.toISOString(),
    o.user.name ?? "",
    o.user.email,
    o.status,
    o.shippingDestination,
    o.subtotal.toFixed(2),
    o.shipping.toFixed(2),
    o.tax.toFixed(2),
    o.total.toFixed(2),
    o.shippingName ?? "",
    o.shippingAddress ?? "",
    o.shippingCity ?? "",
    o.shippingState ?? "",
    o.shippingZip ?? "",
    o.shippingCountry ?? "",
    o.mechanicPhone ?? "",
    o.appointmentDate
      ? `${o.appointmentDate.toISOString().slice(0, 10)}${o.appointmentTime ? ` ${o.appointmentTime}` : ""}`
      : "",
    o.trackingNumber ?? "",
    o.estimatedDelivery?.toISOString().slice(0, 10) ?? "",
    o.items
      .map((i) => `${i.quantity}x ${i.catalogPart.sku} ${i.catalogPart.name} @ $${i.unitPrice.toFixed(2)}`)
      .join(" | "),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
