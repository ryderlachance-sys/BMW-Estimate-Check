import { Car, MousePointerClick, Package, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, round2 } from "@/lib/utils";
import { affiliateProgramsConfigured } from "@/lib/affiliates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AdminAnalyticsPage() {
  const affiliates = affiliateProgramsConfigured();
  const [comparisonAgg, estimateCount, topModels, clickCount, topRetailers] = await Promise.all([
    db.comparison.aggregate({ _avg: { savings: true }, _sum: { savings: true }, _count: true }),
    db.estimate.count(),
    db.vehicle.groupBy({
      by: ["model"],
      _count: { model: true },
      orderBy: { _count: { model: "desc" } },
      take: 6,
    }),
    db.outboundClick.count(),
    db.outboundClick.groupBy({
      by: ["retailer"],
      _count: { retailer: true },
      orderBy: { _count: { retailer: "desc" } },
      take: 5,
    }),
  ]);

  const stats = [
    {
      icon: Car,
      label: "Estimates analyzed",
      value: String(estimateCount),
      sub: "all-time uploads",
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
      icon: MousePointerClick,
      label: "Retailer buy clicks",
      value: String(clickCount),
      sub: topRetailers.map((item) => `${item.retailer} ${item._count.retailer}`).join(" · ") || "No clicks yet",
    },
  ];

  return (
    <div className="space-y-8">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-xl">
            Affiliate revenue status
          </CardTitle>
          <CardDescription>
            Customers open verified retailer listings and complete their purchase there.
            Qualifying affiliate purchases can earn commission without you holding inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <ol className="list-decimal space-y-4 pl-5">
            <li>
              <p className="font-semibold">
                Affiliate links{" "}
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
                    : "not configured"}
                  )
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Amazon links include your tracking tag. Add approved retailer programs as access becomes available.
              </p>
            </li>
          </ol>

          <div className="rounded-lg border bg-background px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How you make money</p>
            <p className="mt-1">
              A visitor clicks a verified product → completes checkout at the retailer →
              the retailer attributes a qualifying commission to your affiliate account.
            </p>
          </div>

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
          <CardTitle>Top vehicle models</CardTitle>
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
                <span className="w-24 text-sm font-semibold">{m.model}</span>
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
