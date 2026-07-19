import { BadgeDollarSign, Car, ExternalLink, Package, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, round2 } from "@/lib/utils";
import { affiliateProgramsConfigured } from "@/lib/affiliates";
import { isStripeConfigured } from "@/lib/stripe";
import { isAutoDropshipConfigured } from "@/lib/fulfillment";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminAnalyticsPage() {
  const affiliates = affiliateProgramsConfigured();
  const stripeReady = isStripeConfigured();
  const dropship = isAutoDropshipConfigured();
  const [paidOrders, comparisonAgg, estimateCount, topModels] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ["PAID", "FULFILLING", "SHIPPED"] } },
      select: { total: true },
    }),
    db.comparison.aggregate({ _avg: { savings: true }, _sum: { savings: true }, _count: true }),
    db.estimate.count(),
    db.vehicle.groupBy({
      by: ["model"],
      _count: { model: true },
      orderBy: { _count: { model: "desc" } },
      take: 6,
    }),
  ]);

  const revenue = round2(paidOrders.reduce((s, o) => s + o.total, 0));
  const moneyReady = stripeReady && dropship.ready;

  const stats = [
    {
      icon: BadgeDollarSign,
      label: "Revenue (paid cart orders)",
      value: formatCurrency(revenue),
      sub: `${paidOrders.length} paid orders`,
    },
    {
      icon: TrendingUp,
      label: "Average savings per matched part",
      value: formatCurrency(round2(comparisonAgg._avg.savings ?? 0)),
      sub: `${comparisonAgg._count} comparisons total`,
    },
    {
      icon: Package,
      label: "Total customer savings identified",
      value: formatCurrency(round2(comparisonAgg._sum.savings ?? 0)),
      sub: "across all parsed estimates",
    },
    {
      icon: Car,
      label: "Estimates analyzed",
      value: String(estimateCount),
      sub: "all-time uploads",
    },
  ];

  return (
    <div className="space-y-8">
      <Card className={moneyReady ? "border-green-300 bg-green-50/50" : "border-amber-300 bg-amber-50/60"}>
        <CardHeader>
          <CardTitle className="text-xl">
            {moneyReady
              ? "Auto dropship is live — customers pay you, suppliers ship"
              : "Finish setup: take payment + auto-order parts"}
          </CardTitle>
          <CardDescription>
            Customers pay on your site (Stripe). After payment we automatically send the
            order to your dropship provider. Suppliers ship to the customer. You keep the
            margin (~25% built into catalog prices) — you never click Buy yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <ol className="list-decimal space-y-4 pl-5">
            <li>
              <p className="font-semibold">
                Stripe (customer pays you){" "}
                <span className={stripeReady ? "text-green-700" : "text-amber-800"}>
                  ({stripeReady ? "connected" : "not set"})
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Add <code>STRIPE_SECRET_KEY</code> + webhook secret on Vercel. Customers
                checkout on your site for the whole cart.
              </p>
            </li>
            <li>
              <p className="font-semibold">
                Auto dropship (orders parts for you){" "}
                <span className={dropship.ready ? "text-green-700" : "text-amber-800"}>
                  ({dropship.ready ? "connected" : "not set"})
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Pick one: <strong>Order Desk</strong> (<code>ORDERDESK_STORE_ID</code> +{" "}
                <code>ORDERDESK_API_KEY</code>) — connect Amazon/suppliers once — or a{" "}
                <strong>Make/Zapier</strong> webhook (<code>FULFILLMENT_WEBHOOK_URL</code>).
                Optional backup: <code>FULFILLMENT_EMAIL</code> gets a buy sheet if auto-buy
                fails (never emailed to the customer).
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Status: Order Desk {dropship.orderDesk ? "on" : "off"} · Webhook{" "}
                {dropship.webhook ? "on" : "off"} · Buyer email{" "}
                {dropship.emailBuyer ? "on" : "off"}
              </p>
            </li>
            <li>
              <p className="font-semibold">
                Optional affiliate links on results{" "}
                <span
                  className={
                    affiliates.amazon || affiliates.ebay || affiliates.fcpEuro
                      ? "text-green-700"
                      : "text-muted-foreground"
                  }
                >
                  (
                  {affiliates.amazon || affiliates.ebay || affiliates.fcpEuro
                    ? "connected"
                    : "optional"}
                  )
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Extra commission if someone buys on Amazon/FCP from the results page
                instead of your cart.
              </p>
            </li>
          </ol>

          <div className="rounded-lg border bg-background px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How you make money</p>
            <p className="mt-1">
              Customer pays catalog price on Stripe → we auto-order at ~supplier cost →
              difference is your profit. No inventory on your shelf.
            </p>
          </div>

          <a
            href="https://www.orderdesk.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              Open Order Desk
              <ExternalLink className="size-3.5" />
            </Button>
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <s.icon className="size-4 text-primary" /> {s.label}
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{s.sub}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top BMW models</CardTitle>
          <CardDescription>By number of vehicles added with estimates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topModels.length === 0 && (
            <p className="text-sm text-muted-foreground">No vehicles yet.</p>
          )}
          {topModels.map((m) => {
            const max = topModels[0]._count.model;
            return (
              <div key={m.model} className="flex items-center gap-4">
                <span className="w-20 text-sm font-semibold">BMW {m.model}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(8, (m._count.model / max) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                  {m._count.model}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
