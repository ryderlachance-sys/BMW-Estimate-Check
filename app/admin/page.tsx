import { BadgeDollarSign, Car, Package, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, round2 } from "@/lib/utils";
import { affiliateProgramsConfigured } from "@/lib/affiliates";
import { isStripeConfigured } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AdminAnalyticsPage() {
  const affiliates = affiliateProgramsConfigured();
  const stripeReady = isStripeConfigured();
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

  const stats = [
    {
      icon: BadgeDollarSign,
      label: "Revenue (paid orders)",
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
      <Card className="border-primary/30 bg-accent/40">
        <CardHeader>
          <CardTitle>How you get paid</CardTitle>
          <CardDescription>
            Card checkout uses Stripe (free account; ~2.9% + $0.30 only when a payment
            succeeds). Affiliate buy buttons also earn when you add free program IDs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <span>
            Stripe card payments:{" "}
            <strong>{stripeReady ? "connected — cards will be charged" : "not set (demo checkout)"}</strong>
          </span>
          <span>
            Amazon Associates:{" "}
            <strong>{affiliates.amazon ? "connected" : "not set"}</strong>
          </span>
          <span>
            eBay Partner Network:{" "}
            <strong>{affiliates.ebay ? "connected" : "not set"}</strong>
          </span>
          <span>
            FCP Euro (Impact):{" "}
            <strong>{affiliates.fcpEuro ? "connected" : "not set"}</strong>
          </span>
          <span className="w-full text-xs text-muted-foreground">
            Stripe keys + affiliate IDs go in <code>.env</code> — see <code>.env.example</code>.
          </span>
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
