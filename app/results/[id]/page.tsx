import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Car, Loader2, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, round2 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AddAllToCartButton,
  ProcessingPoller,
  RetryParseButton,
} from "@/components/results-actions";
import { AffiliateBuyButtons } from "@/components/affiliate-links";
import { buildAffiliateLinks } from "@/lib/affiliates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Cheaper Parts",
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
        <h1 className="mt-6 text-2xl font-bold">Finding cheaper parts…</h1>
        <p className="mt-3 text-muted-foreground">Usually takes a few seconds.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <RetryParseButton estimateId={estimate.id} />
          <Link href="/upload">
            <Button variant="outline">Try a different photo</Button>
          </Link>
        </div>
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

  const comparisons = estimate.comparisons;
  const matchedItemIds = new Set(comparisons.map((c) => c.estimateItemId));
  const unmatchedItems = estimate.items.filter((i) => !matchedItemIds.has(i.id));
  const totalSavings = round2(comparisons.reduce((s, c) => s + Math.max(0, c.savings), 0));
  const shopParts = round2(estimate.items.reduce((s, i) => s + i.mechanicPrice, 0));
  const onlineParts = round2(comparisons.reduce((s, c) => s + c.ourPrice, 0));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Car className="size-3.5" />
          {estimate.vehicle.year} BMW {estimate.vehicle.model}
        </span>
        {estimate.mechanicShopName && (
          <span className="flex items-center gap-1.5">
            <Wrench className="size-3.5" />
            {estimate.mechanicShopName}
          </span>
        )}
      </p>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {comparisons.length > 0 ? (
          totalSavings > 0 ? (
            <>You can save {formatCurrency(totalSavings)} on these parts</>
          ) : (
            <>Here are your parts — buy them cheaper online</>
          )
        ) : (
          <>Parts from your estimate</>
        )}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {comparisons.length > 0
          ? `Shop parts ${formatCurrency(shopParts)} → online about ${formatCurrency(onlineParts)}. Tap a store to buy.`
          : "We couldn’t match these to our catalog yet — search them online below."}
      </p>

      <div className="mt-10 space-y-4">
        {comparisons.map((c) => {
          const links = buildAffiliateLinks({
            brand: c.catalogPart.brand,
            name: c.catalogPart.name,
            oemNumbers: c.catalogPart.oemNumbers,
            oemPartNumber: c.estimateItem?.oemPartNumber,
            year: estimate.vehicle.year,
            model: estimate.vehicle.model,
            engine: estimate.vehicle.engine,
          });
          const qty = c.estimateItem?.quantity ?? 1;
          return (
            <article
              key={c.id}
              className="rounded-2xl border bg-card px-5 py-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-snug">
                    {c.catalogPart.name}
                    {qty > 1 ? ` × ${qty}` : ""}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fits {estimate.vehicle.year} BMW {estimate.vehicle.model}
                    {estimate.vehicle.engine ? ` · ${estimate.vehicle.engine}` : ""}
                    {" · "}
                    {c.catalogPart.brand}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Shop charged
                  </p>
                  <p className="text-lg tabular-nums text-muted-foreground line-through">
                    {formatCurrency(c.mechanicPrice)}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Online from
                  </p>
                  <p className="text-2xl font-extrabold tabular-nums text-primary">
                    {formatCurrency(c.ourPrice)}
                  </p>
                  {c.savings > 0 && (
                    <p className="mt-0.5 text-sm font-semibold text-success">
                      Save {formatCurrency(c.savings)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <AffiliateBuyButtons links={links} />
              </div>
            </article>
          );
        })}

        {unmatchedItems.map((item) => {
          const links = buildAffiliateLinks({
            brand: "BMW",
            name: item.description,
            oemPartNumber: item.oemPartNumber,
            year: estimate.vehicle.year,
            model: estimate.vehicle.model,
            engine: estimate.vehicle.engine,
          });
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-dashed bg-muted/30 px-5 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold leading-snug">{item.description}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Search for your {estimate.vehicle.year} BMW {estimate.vehicle.model}
                    {item.oemPartNumber ? ` · OEM ${item.oemPartNumber}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-muted-foreground">Shop charged</p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatCurrency(item.mechanicPrice)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <AffiliateBuyButtons links={links} />
              </div>
            </article>
          );
        })}
      </div>

      {comparisons.length === 0 && unmatchedItems.length === 0 && (
        <div className="mt-10 rounded-2xl border px-5 py-10 text-center">
          <p className="font-medium">No parts found on that estimate.</p>
          <Link href="/upload" className="mt-4 inline-block">
            <Button>Upload again</Button>
          </Link>
        </div>
      )}

      {comparisons.length === 0 && unmatchedItems.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <RetryParseButton estimateId={estimate.id} />
          <Link href="/upload">
            <Button variant="outline">Upload a clearer photo</Button>
          </Link>
        </div>
      )}

      {comparisons.length > 0 && (
        <div className="mt-10 space-y-3 border-t pt-8">
          <p className="text-sm text-muted-foreground">
            Want parts shipped to you or your mechanic instead?
          </p>
          <AddAllToCartButton estimateId={estimate.id} count={comparisons.length} />
        </div>
      )}

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
