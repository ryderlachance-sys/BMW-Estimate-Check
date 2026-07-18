import Link from "next/link";
import { Download, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatAppointment } from "@/lib/delivery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderShippingEditor, OrderStatusSelect } from "@/components/admin-controls";

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    include: {
      user: true,
      items: { include: { catalogPart: true } },
      fulfillment: { include: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {orders.length} total — after payment we auto-create buy sheets / webhook jobs. Paste tracking when shipped.
          </CardDescription>
        </div>
        <Link href="/api/admin/orders/export">
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Export CSV
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Buy / fulfill</TableHead>
              <TableHead>Ship to</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => {
              const isMechanic = order.shippingDestination === "MECHANIC";
              const lines = order.fulfillment?.lines?.length
                ? order.fulfillment.lines
                : order.items.map((i) => ({
                    id: i.id,
                    description: `${i.catalogPart.brand} ${i.catalogPart.name}`,
                    quantity: i.quantity,
                    oemNumber: i.catalogPart.oemNumbers[0] ?? null,
                    buyUrl: i.catalogPart.oemNumbers[0]
                      ? `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(i.catalogPart.oemNumbers[0])}`
                      : null,
                  }));
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <p className="font-semibold">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    {isMechanic && (
                      <Badge variant="secondary" className="mt-1 gap-1 text-[10px]">
                        <Wrench className="size-3" /> Mechanic
                      </Badge>
                    )}
                    {order.fulfillment && (
                      <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                        Fulfill: {order.fulfillment.status}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{order.user.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{order.user.email}</p>
                  </TableCell>
                  <TableCell className="max-w-72">
                    <ul className="space-y-1.5 text-xs">
                      {lines.map((l) => (
                        <li key={l.id}>
                          <span className="text-muted-foreground">
                            {l.quantity}× {l.description}
                            {"oemNumber" in l && l.oemNumber ? ` · ${l.oemNumber}` : ""}
                          </span>
                          {"buyUrl" in l && l.buyUrl ? (
                            <>
                              <br />
                              <a
                                href={l.buyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                Buy on RockAuto
                              </a>
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.shippingName ? (
                      <>
                        <span className="font-medium text-foreground">
                          {isMechanic ? "Shop: " : ""}
                          {order.shippingName}
                        </span>
                        <br />
                        {order.shippingAddress}, {order.shippingCity}, {order.shippingState}{" "}
                        {order.shippingZip}
                        {isMechanic && order.appointmentDate && (
                          <>
                            <br />
                            Appt: {formatAppointment(order.appointmentDate, order.appointmentTime)}
                          </>
                        )}
                        {order.trackingNumber && (
                          <>
                            <br />
                            Track: {order.trackingNumber}
                          </>
                        )}
                        {order.estimatedDelivery && (
                          <>
                            <br />
                            ETA: {formatDate(order.estimatedDelivery)}
                          </>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                    <OrderShippingEditor
                      orderId={order.id}
                      trackingNumber={order.trackingNumber}
                      estimatedDelivery={order.estimatedDelivery}
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusSelect orderId={order.id} status={order.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
