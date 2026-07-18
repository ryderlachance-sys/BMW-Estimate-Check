import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Car, FileText, MapPin, Package, Star, Upload, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  deliveryMissesAppointment,
  formatAppointment,
} from "@/lib/delivery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MechanicFavoriteActions } from "@/components/garage-controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
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

const estimateBadge: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  UPLOADED: "secondary",
  PROCESSING: "warning",
  PARSED: "success",
  FAILED: "destructive",
};

export default async function DashboardPage() {
  const user = await ensureUser();

  const [orders, vehicles, estimates, mechanics] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      include: { items: { include: { catalogPart: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.estimate.findMany({
      where: { userId: user.id },
      include: { vehicle: true, comparisons: true },
      orderBy: { createdAt: "desc" },
    }),
    db.mechanic.findMany({
      where: { userId: user.id },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your garage, mechanic favorites, orders, and estimate history.
          </p>
        </div>
        <Link href="/upload">
          <Button>
            <Upload className="size-4" /> Check a new estimate
          </Button>
        </Link>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5 text-primary" /> Order history
            </CardTitle>
            <CardDescription>
              {orders.length} order{orders.length === 1 ? "" : "s"} — track Mechanic Delivery here
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orders.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No orders yet — your purchased parts will appear here.
              </p>
            )}
            {orders.map((order) => {
              const miss = deliveryMissesAppointment(
                order.estimatedDelivery,
                order.appointmentDate
              );
              const isMechanic = order.shippingDestination === "MECHANIC";
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block rounded-xl border p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">#{order.id.slice(-8).toUpperCase()}</p>
                      <Badge variant={orderBadge[order.status]}>{order.status}</Badge>
                      {isMechanic && (
                        <Badge variant="secondary" className="gap-1">
                          <Wrench className="size-3" /> Mechanic Delivery
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>

                  {isMechanic ? (
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Mechanic: </span>
                        <span className="font-medium">{order.mechanicShopName}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Appointment: </span>
                        <span className="font-medium">
                          {formatAppointment(order.appointmentDate, order.appointmentTime)}
                        </span>
                      </p>
                      <p className="sm:col-span-2">
                        <span className="text-muted-foreground">Shop: </span>
                        {order.shippingAddress}, {order.shippingCity}, {order.shippingState}{" "}
                        {order.shippingZip}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Tracking: </span>
                        {order.trackingNumber ?? "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Est. delivery: </span>
                        {order.estimatedDelivery
                          ? formatDate(order.estimatedDelivery)
                          : "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Home · {order.shippingCity}, {order.shippingState}
                      {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
                      {order.estimatedDelivery
                        ? ` · ETA ${formatDate(order.estimatedDelivery)}`
                        : ""}
                    </p>
                  )}

                  {miss && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800">
                      <AlertTriangle className="size-3.5" />
                      Delivery may arrive after appointment
                    </p>
                  )}

                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {order.items.map((i) => (
                      <li key={i.id}>
                        {i.quantity}× {i.catalogPart.brand} {i.catalogPart.name}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-right font-bold tabular-nums">
                    {formatCurrency(order.total)}
                  </p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="size-5 text-primary" /> Your Garage
              </CardTitle>
              <CardDescription>BMWs you&apos;ve checked estimates for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicles.length === 0 && (
                <p className="text-sm text-muted-foreground">No vehicles saved yet.</p>
              )}
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-lg border px-4 py-3">
                  <p className="font-semibold">
                    {v.year} BMW {v.model}
                    {v.trim ? ` ${v.trim}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.engine ? `${v.engine} engine` : "Engine not specified"}
                    {v.vin ? ` · VIN …${v.vin.slice(-6)}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="size-5 text-primary" /> Favorite Mechanics
              </CardTitle>
              <CardDescription>
                One-click select at checkout for Mechanic Delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mechanics.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Save a shop during checkout and it will show up here.
                </p>
              )}
              {mechanics.map((m) => (
                <div key={m.id} className="rounded-lg border px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold">
                        <MapPin className="size-3.5 text-primary" />
                        {m.shopName}
                        {m.isFavorite && (
                          <Star className="size-3.5 fill-primary text-primary" />
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {m.address}, {m.city}, {m.state} {m.zip}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.phone}</p>
                    </div>
                    <MechanicFavoriteActions
                      mechanicId={m.id}
                      isFavorite={m.isFavorite}
                    />
                  </div>
                </div>
              ))}
              {mechanics.length > 0 && (
                <Link href="/checkout">
                  <Button variant="outline" size="sm" className="w-full">
                    Use at checkout
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5 text-primary" /> Past estimates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {estimates.length === 0 && (
                <p className="text-sm text-muted-foreground">No estimates uploaded yet.</p>
              )}
              {estimates.map((e) => {
                const savings = e.comparisons.reduce((s, c) => s + Math.max(0, c.savings), 0);
                return (
                  <Link
                    key={e.id}
                    href={`/results/${e.id}`}
                    className="block rounded-lg border px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {e.vehicle.year} {e.vehicle.model}
                      </p>
                      <Badge variant={estimateBadge[e.status]} className="text-[10px]">
                        {e.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.mechanicShopName ?? "Unknown shop"} · {formatDate(e.createdAt)}
                      {savings > 0 && (
                        <span className="ml-2 font-semibold text-success">
                          Save {formatCurrency(savings)}
                        </span>
                      )}
                    </p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
