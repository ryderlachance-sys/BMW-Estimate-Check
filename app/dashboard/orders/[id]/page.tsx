import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Package, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  canEditMechanicDelivery,
  deliveryMissesAppointment,
  formatAppointment,
} from "@/lib/delivery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MechanicOrderEditForm } from "@/components/mechanic-order-edit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false },
};

const orderBadge: Record<string, "secondary" | "success" | "warning" | "destructive" | "default"> = {
  PENDING: "secondary",
  PAID: "success",
  FULFILLING: "warning",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await ensureUser();
  const order = await db.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: { include: { catalogPart: true } },
      emails: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const isMechanic = order.shippingDestination === "MECHANIC";
  const miss = deliveryMissesAppointment(order.estimatedDelivery, order.appointmentDate);
  const editable = isMechanic && canEditMechanicDelivery(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDate(order.createdAt)} · {formatCurrency(order.total)}
          </p>
        </div>
        <Badge variant={orderBadge[order.status]}>{order.status}</Badge>
      </div>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isMechanic ? (
                <Wrench className="size-5 text-primary" />
              ) : (
                <Package className="size-5 text-primary" />
              )}
              {isMechanic ? "Mechanic Delivery" : "Home delivery"}
            </CardTitle>
            <CardDescription>Shipping status and destination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isMechanic ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mechanic name
                  </p>
                  <p className="font-semibold">{order.mechanicShopName}</p>
                  {order.mechanicContact && (
                    <p className="text-muted-foreground">Contact: {order.mechanicContact}</p>
                  )}
                  {order.mechanicPhone && (
                    <p className="text-muted-foreground">{order.mechanicPhone}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Shop address
                  </p>
                  <p>
                    {order.shippingAddress}
                    <br />
                    {order.shippingCity}, {order.shippingState} {order.shippingZip}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Appointment date
                  </p>
                  <p className="font-medium">
                    {formatAppointment(order.appointmentDate, order.appointmentTime)}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ship to
                </p>
                <p className="font-semibold">{order.shippingName}</p>
                <p>
                  {order.shippingAddress}
                  <br />
                  {order.shippingCity}, {order.shippingState} {order.shippingZip}
                </p>
              </div>
            )}

            <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Shipping status
                </p>
                <p className="font-semibold">{order.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tracking number
                </p>
                <p className="font-semibold tabular-nums">
                  {order.trackingNumber ?? "Not shipped yet"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estimated delivery
                </p>
                <p className="font-semibold">
                  {order.estimatedDelivery
                    ? formatDate(order.estimatedDelivery)
                    : "Pending"}
                </p>
              </div>
            </div>

            {miss && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Estimated delivery is later than your appointment date.
              </div>
            )}

            {order.repairNotes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Repair notes
                </p>
                <p className="text-muted-foreground">{order.repairNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {editable && (
          <MechanicOrderEditForm
            orderId={order.id}
            shopName={order.mechanicShopName ?? ""}
            contactPerson={order.mechanicContact}
            address={order.shippingAddress ?? ""}
            city={order.shippingCity ?? ""}
            shopState={order.shippingState ?? "OH"}
            zip={order.shippingZip ?? ""}
            phone={order.mechanicPhone ?? ""}
            appointmentDate={order.appointmentDate}
            appointmentTime={order.appointmentTime}
            repairNotes={order.repairNotes}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between gap-3">
                <span>
                  {i.quantity}× {i.catalogPart.brand} {i.catalogPart.name}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(i.unitPrice * i.quantity)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {order.emails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Local email copies (also saved under <code>.emails/</code>)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.emails.map((e) => (
                <div key={e.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{e.subject}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {e.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(e.createdAt)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Link href="/dashboard">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
