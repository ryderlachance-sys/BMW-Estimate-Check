import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Car, Loader2 } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, round2 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProcessingPoller, RetryParseButton } from "@/components/results-actions";
import { AffiliateBuyButtons, ShopAllParts } from "@/components/affiliate-links";
import { buildAffiliateLinks } from "@/lib/affiliates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Your Savings",
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
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center">
        <ProcessingPoller />
        <Loader2 className="size-12 animate-spin text-primary" />
        <h1 className="mt-6 text-2xl font-bold">Finding your savings…</h1>
        <p className="mt-3 text-muted-foreground">
          Reading the estimate and matching parts. Usually a few seconds.
        </p>
      </div>
    );
  }

  if (estimate.status === "FAILED") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center">
        <AlertTriangle className="size-12 text-destructive" />
        <h1 className="mt-6 text-2xl font-bold">Couldn&apos;t read that estimate</h1>
        <p className="mt-3 text-muted-foreground">
          {estimate.errorMessage ?? "Try a clearer photo or the PDF from the shop."}
        </p>
        <div className="mt-8 flex gap-3">
          <RetryParseButton estimateId={estimate.id} />
          <Link href="/upload">
            <Button>Upload again</Button>
          </Link>
        </div>
      </div>
    );
  }

  const comparisons = estimate.comparisons.filter((c) => c.savings >= 0 || c.ourPrice > 0);
  const totalSavings = round2(comparisons.reduce((s, c) => s + Math.max(0, c.savings), 0));
  const shopParts = round2(
    comparisons.length > 0
      ? comparisons.reduce((s, c) => s + c.mechanicPrice, 0)
      : estimate.items.reduce((s, i) => s + i.mechanicPrice, 0)
  );
  const onlineParts = round2(comparisons.reduce((s, c) => s + c.ourPrice, 0));
  const carLabel = `${estimate.vehicle.year} BMW ${estimate.vehicle.model}${
    estimate.vehicle.engine ? ` · ${estimate.vehicle.engine}` : ""
  }`;

  const buyParts = comparisons.map((c) => {
    const links = buildAffiliateLinks({
      brand: c.catalogPart.brand,
      name: c.catalogPart.name,
      oemNumbers: c.catalogPart.oemNumbers,
      oemPartNumber: c.estimateItem?.oemPartNumber,
      year: estimate.vehicle.year,
      model: estimate.vehicle.model,
      engine: estimate.vehicle.engine,
    });
    return {
      id: c.id,
      name: c.catalogPart.name,
      urls: Object.fromEntries(links.map((l) => [l.id, l.url])),
      links,
      qty: c.estimateItem?.quantity ?? 1,
      mechanicPrice: c.mechanicPrice,
      ourPrice: c.ourPrice,
      savings: c.savings,
      brand: c.catalogPart.brand,
    };
  });

  // No usable matches — keep it short, don't dump garbage OCR lines.
  if (comparisons.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Car className="size-3.5" />
          {carLabel}
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          We couldn&apos;t match those parts yet
        </h1>
        <p className="mt-3 text-muted-foreground">
          Upload a clearer photo or the shop PDF so we can show your savings and buy links.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <RetryParseButton estimateId={estimate.id} />
          <Link href="/upload">
            <Button>Upload again</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Car className="size-3.5" />
        {carLabel}
      </p>

      {/* THE money moment */}
      <div className="mt-6 rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground">
        <p className="text-sm font-medium uppercase tracking-wide opacity-90">You can save</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
          {formatCurrency(Math.max(0, totalSavings))}
        </p>
        <p className="mt-3 text-sm opacity-90">
          Shop wants {formatCurrency(shopParts)} for these parts → online about{" "}
          {formatCurrency(onlineParts)}
        </p>
      </div>

      <div className="mt-8">
        <ShopAllParts parts={buyParts} />
      </div>

      <ul className="mt-10 space-y-3">
        {buyParts.map((p) => (
          <li key={p.id} className="rounded-2xl border bg-card px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold leading-snug">
                  {p.name}
                  {p.qty > 1 ? ` ×${p.qty}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.brand}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm tabular-nums text-muted-foreground line-through">
                  {formatCurrency(p.mechanicPrice)}
                </p>
                <p className="text-lg font-extrabold tabular-nums text-primary">
                  {formatCurrency(p.ourPrice)}
                </p>
                {p.savings > 0 && (
                  <p className="text-xs font-semibold text-success">
                    Save {formatCurrency(p.savings)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3">
              <AffiliateBuyButtons links={p.links} compact />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-10 text-center">
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Check another estimate
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
