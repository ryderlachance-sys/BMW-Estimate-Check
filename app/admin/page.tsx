import { Activity, Car, MousePointerClick, PackageSearch, ShieldCheck, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, round2 } from "@/lib/utils";
import { affiliateProgramsConfigured } from "@/lib/affiliates";
import { hasEbayBrowseConfigured } from "@/lib/retailers/ebay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAiBudgetStatus } from "@/lib/ai/budget";
import { toggleAiParsing } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

function countBy(values: Array<string | null | undefined>, limit = 6) {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function isExactProductUrl(url: string) {
  return /amazon\.com\/(?:dp|gp\/product)\/|ebay\.com\/itm\/|autopartsprime\.com\//i.test(url);
}

export default async function AdminAnalyticsPage() {
  const affiliates = affiliateProgramsConfigured();
  const ebayBrowse = hasEbayBrowseConfigured();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [comparisonAgg, estimateCount, parsedEstimateCount, topModels, clickCount, recentClicks, recentEvents, aiBudget] = await Promise.all([
    db.comparison.aggregate({ _avg: { savings: true }, _sum: { savings: true }, _count: true }),
    db.estimate.count(),
    db.estimate.count({ where: { status: "PARSED" } }),
    db.vehicle.groupBy({ by: ["make", "model"], _count: { model: true }, orderBy: { _count: { model: "desc" } }, take: 8 }),
    db.outboundClick.count(),
    db.outboundClick.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, orderBy: { createdAt: "desc" }, take: 1000 }),
    db.funnelEvent.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { event: true, source: true } }),
    getAiBudgetStatus(),
  ]);

  const exactClicks = recentClicks.filter((click) => isExactProductUrl(click.url));
  const lastSevenDays = recentClicks.filter((click) => click.createdAt >= sevenDaysAgo);
  const topRetailers = countBy(recentClicks.map((click) => click.retailer));
  const topParts = countBy(recentClicks.map((click) => click.partName));
  const topVehicles = countBy(recentClicks.map((click) => click.vehicle));
  const clickPerEstimate = parsedEstimateCount > 0 ? clickCount / parsedEstimateCount : 0;
  const eventCount = (event: string) => recentEvents.filter((row) => row.event === event).length;
  const landingViews = eventCount("LANDING_VIEW");
  const uploadStarts = eventCount("UPLOAD_STARTED") + eventCount("MANUAL_SEARCH_STARTED");
  const parsedEvents = eventCount("ESTIMATE_PARSED");
  const sourceRows = countBy(recentEvents.map((row) => row.source), 8);
  const percent = (value: number, total: number) => total > 0 ? `${Math.round((value / total) * 100)}%` : "—";

  const stats = [
    { icon: Car, label: "Estimates analyzed", value: String(estimateCount), sub: `${parsedEstimateCount} completed` },
    { icon: MousePointerClick, label: "Retailer clicks", value: String(clickCount), sub: `${clickPerEstimate.toFixed(1)} clicks per completed estimate` },
    { icon: ShieldCheck, label: "Exact-product clicks (30d)", value: String(exactClicks.length), sub: `${recentClicks.length - exactClicks.length} retailer-search clicks` },
    { icon: TrendingUp, label: "Average catalog savings", value: formatCurrency(round2(comparisonAgg._avg.savings ?? 0)), sub: `${comparisonAgg._count} matched part lines` },
  ];

  return (
    <div className="space-y-8">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle>Revenue connections</CardTitle>
          <CardDescription>Clicks are tracked here; confirmed commissions and sales remain in each retailer dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-4"><p className="font-bold">Amazon Associates</p><p className={affiliates.amazon ? "mt-1 text-green-700" : "mt-1 text-amber-700"}>{affiliates.amazon ? "Tracking tag connected" : "Tracking tag missing"}</p></div>
          <div className="rounded-xl border bg-background p-4"><p className="font-bold">eBay Partner Network</p><p className={affiliates.ebay ? "mt-1 text-green-700" : "mt-1 text-amber-700"}>{affiliates.ebay ? "Campaign connected" : "Campaign awaiting approval"}</p></div>
          <div className="rounded-xl border bg-background p-4"><p className="font-bold">eBay exact matching</p><p className={ebayBrowse ? "mt-1 text-green-700" : "mt-1 text-amber-700"}>{ebayBrowse ? "Browse API active" : "Developer credentials awaiting approval"}</p></div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Launch funnel (30 days)</CardTitle>
            <CardDescription>Anonymous first-party events, including ad campaign tags.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Visitors", landingViews, "100%"],
              ["Started", uploadStarts, percent(uploadStarts, landingViews)],
              ["Parsed", parsedEvents, percent(parsedEvents, uploadStarts)],
              ["Retailer clicks", recentClicks.length, percent(recentClicks.length, parsedEvents)],
            ].map(([label, value, rate]) => (
              <div key={String(label)} className="rounded-xl border bg-background p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
                <p className="text-xs font-semibold text-primary">{rate}</p>
              </div>
            ))}
            <div className="col-span-2 text-xs text-muted-foreground sm:col-span-4">
              Sources: {sourceRows.length ? sourceRows.map(([source, count]) => `${source} (${count})`).join(" · ") : "No campaign traffic yet"}
            </div>
          </CardContent>
        </Card>

        <Card className={aiBudget.enabled ? "border-emerald-200" : "border-amber-200"}>
          <CardHeader>
            <CardTitle>AI spending guard</CardTitle>
            <CardDescription>The free local parser takes over automatically when AI is off or reaches a limit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-sm">
              <p className="font-bold">{aiBudget.enabled ? "AI parsing is on" : "AI parsing is off"}</p>
              <p className="mt-1 text-muted-foreground">Today: {aiBudget.today}/{aiBudget.limits.globalDaily} · Month: {aiBudget.month}/{aiBudget.limits.globalMonthly} · Per visitor: {aiBudget.limits.perUserDaily}/day</p>
            </div>
            <form action={toggleAiParsing}>
              <input type="hidden" name="enabled" value={String(!aiBudget.enabled)} />
              <Button type="submit" variant={aiBudget.enabled ? "outline" : "default"}>
                Turn AI {aiBudget.enabled ? "off" : "on"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}><CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><stat.icon className="size-4 text-primary" /> {stat.label}</CardDescription><CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{stat.sub}</CardContent></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: "Top clicked parts (30d)", icon: PackageSearch, rows: topParts },
          { title: "Top clicked vehicles (30d)", icon: Car, rows: topVehicles },
          { title: "Retailers (30d)", icon: MousePointerClick, rows: topRetailers },
        ].map((section) => (
          <Card key={section.title}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><section.icon className="size-5 text-primary" /> {section.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {section.rows.length === 0 && <p className="text-sm text-muted-foreground">No clicks yet.</p>}
              {section.rows.map(([label, count]) => <div key={label} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{label}</span><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold tabular-nums">{count}</span></div>)}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" /> Recent retailer activity</CardTitle><CardDescription>{lastSevenDays.length} clicks in the last seven days</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {recentClicks.slice(0, 12).map((click) => (
            <div key={click.id} className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="truncate font-semibold">{click.partName || "Unknown part"}</p><p className="truncate text-xs text-muted-foreground">{click.vehicle || "Unknown vehicle"}</p></div>
              <div className="flex items-center gap-2 text-xs"><span className="font-bold text-primary">{click.retailer}</span><span className="text-muted-foreground">{isExactProductUrl(click.url) ? "Exact product" : "Search"}</span><span className="text-muted-foreground">{click.createdAt.toLocaleDateString("en-US")}</span></div>
            </div>
          ))}
          {recentClicks.length === 0 && <p className="text-sm text-muted-foreground">No retailer activity yet.</p>}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Catalog savings are planning comparisons, not verified affiliate revenue. Use retailer dashboards to confirm ordered items and commission amounts.</p>
    </div>
  );
}
