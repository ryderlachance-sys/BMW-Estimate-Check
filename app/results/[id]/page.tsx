import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeDollarSign,
  Car,
  FileText,
  Loader2,
  Wrench,
} from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { estimateLaborRange } from "@/lib/comparison";
import { formatCurrency, formatDate, round2 } from "@/lib/utils";
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
import {
  AddAllToCartButton,
  ProcessingPoller,
  RetryParseButton,
} from "@/components/results-actions";
import {
  AffiliateBuyButtons,
  BuyAllAtRetailersButton,
} from "@/components/affiliate-links";
import { buildAffiliateLinks } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estimate Results",
  robots: { index: false },
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await ensureUser();

  const estimate = await db.estimate.findUnique({
    where: { id },
    include: {
      vehicle: true,
      items: { orderBy: { id: "asc" } },
      comparisons: { include: { catalogPart: true, estimateItem: true } },
    },
  });
  if (!estimate || (estimate.userId !== user.id && !user.isAdmin)) notFound();

  if (estimate.status === "UPLOADED" || estimate.status === "PROCESSING") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
        <ProcessingPoller />
        <Loader2 className="size-12 animate-spin text-primary" />
        <h1 className="mt-6 text-2xl font-bold">Analyzing your estimate…</h1>
        <p className="mt-3 text-muted-foreground">
          Reading every line item and matching parts to our catalog. This usually
          takes a few seconds.
        </p>
      </div>
    );
  }

  if (estimate.status === "FAILED") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
        <AlertTriangle className="size-12 text-destructive" />
        <h1 className="mt-6 text-2xl font-bold">We couldn&apos;t read that estimate</h1>
        <p className="mt-3 text-muted-foreground">
          {estimate.errorMessage ??
            "The file may be blurry or in an unsupported format. Try a clearer photo or a PDF."}
        </p>
        <div className="mt-8 flex gap-3">
          <RetryParseButton estimateId={estimate.id} />
          <Link href="/upload">
            <Button>Upload a different file</Button>
          </Link>
        </div>
      </div>
    );
  }

  const comparisons = estimate.comparisons;
  const matchedItemIds = new Set(comparisons.map((c) => c.estimateItemId));
  const unmatchedItems = estimate.items.filter((i) => !matchedItemIds.has(i.id));

  const mechanicPartsTotal = round2(estimate.items.reduce((s, i) => s + i.mechanicPrice, 0));
  const ourPartsTotal = round2(comparisons.reduce((s, c) => s + c.ourPrice, 0));
  const matchedMechanicTotal = round2(comparisons.reduce((s, c) => s + c.mechanicPrice, 0));
  const totalSavings = round2(comparisons.reduce((s, c) => s + c.savings, 0));
  const savingsPct =
    matchedMechanicTotal > 0 ? Math.round((totalSavings / matchedMechanicTotal) * 100) : 0;
  const laborRange = estimateLaborRange(estimate.laborTotal);

  const affiliateByComparison = comparisons.map((c) => ({
    id: c.id,
    links: buildAffiliateLinks({
      brand: c.catalogPart.brand,
      name: c.catalogPart.name,
      oemNumbers: c.catalogPart.oemNumbers,
      oemPartNumber: c.estimateItem?.oemPartNumber,
    }),
  }));
  // Prefer RockAuto first (usually cheapest BMW parts) for the bulk buy action.
  const buyAllUrls = affiliateByComparison
    .map((row) => row.links.find((l) => l.id === "rockauto")?.url ?? row.links[0]?.url)
    .filter((u): u is string => Boolean(u));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your estimate, decoded</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Car className="size-4" />
              {estimate.vehicle.year} BMW {estimate.vehicle.model}
              {estimate.vehicle.engine ? ` · ${estimate.vehicle.engine}` : ""}
            </span>
            {estimate.mechanicShopName && (
              <span className="flex items-center gap-1.5">
                <Wrench className="size-4" /> {estimate.mechanicShopName}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <FileText className="size-4" /> Uploaded {formatDate(estimate.createdAt)}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <BuyAllAtRetailersButton urls={buyAllUrls} count={comparisons.length} />
          <AddAllToCartButton estimateId={estimate.id} count={comparisons.length} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mechanic quote (total)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {estimate.mechanicTotal != null ? formatCurrency(estimate.mechanicTotal) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Parts on estimate: {formatCurrency(mechanicPartsTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Our parts price</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-primary">
              {formatCurrency(ourPartsTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {comparisons.length} of {estimate.items.length} parts matched
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated labor range</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {laborRange
                ? `${formatCurrency(laborRange.low)}–${formatCurrency(laborRange.high)}`
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {estimate.laborTotal != null
              ? `Shop quoted ${formatCurrency(estimate.laborTotal)} labor`
              : "No labor found on estimate"}
          </CardContent>
        </Card>
        <Card className="border-primary/40 bg-accent">
          <CardHeader className="pb-2">
            <CardDescription className="text-accent-foreground/80">
              Estimated parts savings
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold tabular-nums text-primary">
              {formatCurrency(Math.max(0, totalSavings))}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-medium text-accent-foreground/80">
            {savingsPct > 0 ? `${savingsPct}% less than shop parts pricing` : "on matched parts"}
          </CardContent>
        </Card>
      </div>

      {/* Comparison table */}
      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Line-by-line comparison</CardTitle>
          <CardDescription>
            Every part found on your estimate, matched against our catalog. Buy
            from a retailer below — that&apos;s how this site earns when you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate line</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Our match</TableHead>
                <TableHead className="text-right">Shop price</TableHead>
                <TableHead className="text-right">Our price</TableHead>
                <TableHead className="text-right">You save</TableHead>
                <TableHead>Buy online</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((c) => {
                const links =
                  affiliateByComparison.find((row) => row.id === c.id)?.links ?? [];
                return (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.estimateItem?.description ?? "—"}</p>
                    {c.estimateItem?.oemPartNumber && (
                      <p className="text-xs text-muted-foreground">
                        OEM {c.estimateItem.oemPartNumber}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{c.estimateItem?.quantity ?? 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">
                      {c.catalogPart.brand} {c.catalogPart.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      SKU {c.catalogPart.sku}
                      <Badge
                        variant={c.matchMethod === "OEM_NUMBER" ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {c.matchMethod === "OEM_NUMBER"
                          ? "Exact OEM match"
                          : c.matchMethod === "MANUAL"
                            ? "Expert verified"
                            : "Best match"}
                      </Badge>
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(c.mechanicPrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(c.ourPrice)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-success">
                    {c.savings > 0 ? formatCurrency(c.savings) : "—"}
                  </TableCell>
                  <TableCell>
                    <AffiliateBuyButtons links={links} compact />
                  </TableCell>
                </TableRow>
                );
              })}
              {unmatchedItems.map((item) => (
                <TableRow key={item.id} className="opacity-60">
                  <TableCell>
                    <p className="font-medium">{item.description}</p>
                    {item.oemPartNumber && (
                      <p className="text-xs text-muted-foreground">OEM {item.oemPartNumber}</p>
                    )}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    No catalog match yet —{" "}
                    <Link href="/catalog" className="text-primary underline">
                      browse catalog
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(item.mechanicPrice)}
                  </TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {comparisons.length > 0 && (
            <div className="mt-6 flex flex-col items-end gap-2 border-t pt-6">
              <p className="text-sm text-muted-foreground">
                Total project savings on parts
              </p>
              <p className="flex items-center gap-2 text-3xl font-extrabold text-success">
                <BadgeDollarSign className="size-7" />
                {formatCurrency(Math.max(0, totalSavings))}
                {savingsPct > 0 && (
                  <span className="text-base font-semibold text-muted-foreground">
                    ({savingsPct}%)
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-col items-stretch gap-2 sm:items-end">
                <BuyAllAtRetailersButton urls={buyAllUrls} count={comparisons.length} />
                <p className="max-w-sm text-right text-xs text-muted-foreground">
                  Opens RockAuto (usually cheapest) for each matched part. Or use the
                  per-row Amazon / eBay / FCP Euro buttons above.
                </p>
                <AddAllToCartButton estimateId={estimate.id} count={comparisons.length} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Labor estimates are informational only, based on typical independent BMW shop
        rates in the US. Savings are calculated on parts pricing only. Always confirm
        fitment with your VIN before installation. Retailer links may be affiliate
        links — if you buy through them, we may earn a commission at no extra cost to you.
      </p>
    </div>
  );
}
