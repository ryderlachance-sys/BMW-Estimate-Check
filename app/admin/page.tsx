import { BadgeDollarSign, Car, ExternalLink, Package, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, round2 } from "@/lib/utils";
import { affiliateProgramsConfigured } from "@/lib/affiliates";
import { isStripeConfigured } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const moneyReady = affiliates.amazon || affiliates.ebay || affiliates.fcpEuro;

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
            {moneyReady ? "Affiliate payouts are connected" : "Finish this to get paid (5–10 min)"}
          </CardTitle>
          <CardDescription>
            Your real money path: people click <strong>Find on Amazon / eBay / FCP</strong> and buy.
            Those companies pay you a commission. Cart/Stripe is optional and harder (you ship parts).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <ol className="list-decimal space-y-4 pl-5">
            <li>
              <p className="font-semibold">
                Amazon Associates{" "}
                <span className={affiliates.amazon ? "text-green-700" : "text-amber-800"}>
                  ({affiliates.amazon ? "connected" : "not connected"})
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Sign up at affiliate-program.amazon.com (must be 18+ — a parent can open the account).
                After approval, copy your <strong>Store ID / Associate tag</strong> (looks like{" "}
                <code>yourname-20</code>).
              </p>
              <a
                href="https://affiliate-program.amazon.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex"
              >
                <Button type="button" size="sm" variant="outline" className="gap-1.5">
                  Open Amazon signup <ExternalLink className="size-3.5" />
                </Button>
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Then tell Cursor your tag (or add{" "}
                <code>NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG</code> in Vercel → Redeploy).
              </p>
            </li>
            <li>
              <p className="font-semibold">
                eBay Partner Network{" "}
                <span className={affiliates.ebay ? "text-green-700" : "text-amber-800"}>
                  ({affiliates.ebay ? "connected" : "not connected"})
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Sign up, create a campaign, copy the <strong>Campaign ID</strong> (numbers).
              </p>
              <a
                href="https://partnernetwork.ebay.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex"
              >
                <Button type="button" size="sm" variant="outline" className="gap-1.5">
                  Open eBay signup <ExternalLink className="size-3.5" />
                </Button>
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Env key: <code>NEXT_PUBLIC_EBAY_CAMPAIGN_ID</code>
              </p>
            </li>
            <li>
              <p className="font-semibold">
                FCP Euro (Impact){" "}
                <span className={affiliates.fcpEuro ? "text-green-700" : "text-amber-800"}>
                  ({affiliates.fcpEuro ? "connected" : "not connected"})
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Apply via Impact / FCP&apos;s partner page. Paste the click/tracking ID as{" "}
                <code>NEXT_PUBLIC_FCP_EURO_CLICK_ID</code>.
              </p>
            </li>
          </ol>

          <div className="rounded-lg border bg-background px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How you get paid</p>
            <p className="mt-1">
              Customers checkout on the site, then buy at Amazon / RockAuto / FCP via your
              tagged links. You earn commission — zero inventory.
            </p>
            <p className="mt-2">
              Stripe merchant checkout (you buy + ship):{" "}
              <strong>{stripeReady ? "keys live" : "not set"}</strong> — only at{" "}
              <a href="/checkout/ship" className="font-medium text-primary underline">
                /checkout/ship
              </a>
              .
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
