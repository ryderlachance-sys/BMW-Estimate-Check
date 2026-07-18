/** Business-day delivery estimates for Mechanic Delivery / home shipping. */

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  d.setHours(17, 0, 0, 0);
  return d;
}

/**
 * Recommended delivery window for parts orders.
 * Free shipping over $149 still uses ground (4–6 business days);
 * paid ground is typically 3–5.
 */
export function estimateDeliveryWindow(
  orderDate: Date = new Date(),
  freeShipping = false
): { earliest: Date; latest: Date; label: string } {
  const earliest = addBusinessDays(orderDate, freeShipping ? 4 : 3);
  const latest = addBusinessDays(orderDate, freeShipping ? 6 : 5);
  return {
    earliest,
    latest,
    label: freeShipping
      ? "Typically 4–6 business days"
      : "Typically 3–5 business days",
  };
}

/** True when the latest estimated arrival is after the appointment day. */
export function deliveryMissesAppointment(
  estimatedDelivery: Date | null | undefined,
  appointmentDate: Date | null | undefined
): boolean {
  if (!estimatedDelivery || !appointmentDate) return false;
  const est = new Date(estimatedDelivery);
  const appt = new Date(appointmentDate);
  est.setHours(0, 0, 0, 0);
  appt.setHours(0, 0, 0, 0);
  return est.getTime() > appt.getTime();
}

export function formatAppointment(
  date: Date | null | undefined,
  time?: string | null
): string {
  if (!date) return "—";
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return time ? `${day} · ${time}` : day;
}

/** Orders still editable for mechanic details until fulfillment starts. */
export function canEditMechanicDelivery(status: string): boolean {
  return status === "PENDING" || status === "PAID";
}

export function generateTrackingNumber(): string {
  const n = Math.floor(100_000_000 + Math.random() * 900_000_000);
  return `BEC${n}`;
}
