import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Car, Loader2 } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, round2 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ProcessingPoller,
  RetryParseButton,
} from "@/components/results-actions";
import { ConfirmVehicleForm } from "@/components/confirm-vehicle-form";
import { CatalogPartImage } from "@/components/catalog-part-image";
import { PasteEstimateFallback } from "@/components/paste-estimate-fallback";
import { PartBuyAction } from "@/components/part-buy-action";
import { cleanPartDisplayName, buildProductBuyBundle } from "@/lib/affiliates";

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
    const needsVehicle =
      estimate.errorMessage === "NEED_VEHICLE" ||
      estimate.vehicle.model.toLowerCase() === "pending";
    // Older failed uploads that only lacked vehicle info — offer the form too
    const vehicleMissingMsg =
      estimate.errorMessage?.toLowerCase().includes("year/model") ||
      estimate.errorMessage?.toLowerCase().includes("couldn't find your") ||
      estimate.errorMessage?.toLowerCase().includes("couldn't find your bmw");

    if (needsVehicle || vehicleMissingMsg) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
          <Car className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Tell us your car</h1>
          <ConfirmVehicleForm estimateId={estimate.id} />
          <div className="mt-6 flex justify-center gap-3">
            <RetryParseButton estimateId={estimate.id} />
            <Link href="/upload">
              <Button variant="outline">Upload again</Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6">
        <PasteEstimateFallback
          estimateId={estimate.id}
          initialText={estimate.extractedText ?? ""}
          heading="Couldn't read that estimate"
        />
        <Link href="/upload" className="mt-2">
          <Button variant="outline">Upload again</Button>
        </Link>
      </div>
    );
  }

  const needsVehicle =
    estimate.errorMessage === "NEED_VEHICLE" ||
    estimate.vehicle.model.toLowerCase() === "pending";

  if (needsVehicle) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <Car className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Tell us your car</h1>
        <ConfirmVehicleForm estimateId={estimate.id} />
      </div>
    );
  }

  const comparisons = estimate.comparisons.filter((c) => c.savings >= 0 || c.ourPrice > 0);
  // Group premium + budget tiers per estimate line
  const byItem = new Map<
    string,
    { premium?: (typeof comparisons)[0]; budget?: (typeof comparisons)[0] }
  >();
  for (const c of comparisons) {
    const key = c.estimateItemId ?? c.id;
    const row = byItem.get(key) ?? {};
    if (c.matchMethod === "BUDGET") row.budget = c;
    else row.premium = c;
    byItem.set(key, row);
  }
  const lines = [...byItem.values()];
  const primaryLines = lines.map((l) => l.premium ?? l.budget!).filter(Boolean);
  const totalSavings = round2(
    primaryLines.reduce((s, c) => s + Math.max(0, c.savings), 0)
  );
  const shopParts = round2(
    primaryLines.length > 0
      ? primaryLines.reduce((s, c) => s + c.mechanicPrice, 0)
      : estimate.items.reduce((s, i) => s + i.mechanicPrice, 0)
  );
  const onlineParts = round2(primaryLines.reduce((s, c) => s + c.ourPrice, 0));
  const carLabel = `${estimate.vehicle.year} ${estimate.vehicle.make !== "Unknown" ? estimate.vehicle.make + " " : ""}${estimate.vehicle.model}${
    estimate.vehicle.engine ? ` · ${estimate.vehicle.engine}` : ""
  }`;
  const vinHint = estimate.vehicle.vin
    ? ` · VIN …${estimate.vehicle.vin.slice(-6)}`
    : "";

  if (primaryLines.length === 0) {
    const laborOnly =
      estimate.errorMessage === "NO_PARTS" ||
      estimate.items.length === 0 ||
      estimate.items.every((i) =>
        /job\s*t[ui]me|without\s+allowance|fuel\s+conditioning|998729|fr[uil]\b/i.test(
          i.description
        )
      );
    const unmatchedItems = estimate.items.filter(
      (i) =>
        !/job\s*t[ui]me|without\s+allowance|fuel\s+conditioning|998729|fr[uil]\b/i.test(
          i.description
        )
    );
    const catalogHref = `/catalog?model=${encodeURIComponent(estimate.vehicle.model)}&year=${estimate.vehicle.year}`;

    // Parts were found but nothing in our catalog matched — still show shop
    // prices + affiliate search so the user can buy (and we can earn).
    if (!laborOnly && unmatchedItems.length > 0) {
      const shopParts = round2(
        unmatchedItems.reduce((s, i) => s + i.mechanicPrice, 0)
      );
      return (
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Car className="size-3.5" />
            {carLabel}
            {vinHint}
          </p>
          <div className="mt-6 rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground">
            <p className="text-sm font-medium uppercase tracking-wide opacity-90">
              Shop parts total
            </p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
              {formatCurrency(shopParts)}
            </p>
            <p className="mt-3 text-sm opacity-90">
              We read these lines from your estimate — buy them cheaper online below.
            </p>
          </div>
          <ul className="mt-6 space-y-2.5">
            {unmatchedItems.map((item) => {
              const query = {
                brand: "",
                name: item.description,
                oemPartNumber: item.oemPartNumber,
                year: estimate.vehicle.year,
                make: estimate.vehicle.make,
                model: estimate.vehicle.model,
                engine: estimate.vehicle.engine,
                amazonAsin: item.amazonAsin,
                ebayItemId: item.ebayItemId,
              };
              const bundle = buildProductBuyBundle(query, item.mechanicPrice * 0.55);
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-snug">
                      {item.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Shop charged {formatCurrency(item.mechanicPrice)}
                    </p>
                  </div>
                  <PartBuyAction
                    bundle={bundle}
                    className="sm:w-auto sm:shrink-0"
                    fitment={{
                      year: estimate.vehicle.year,
                      make: estimate.vehicle.make,
                      model: estimate.vehicle.model,
                      vin: estimate.vehicle.vin,
                      partName: item.description,
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <RetryParseButton estimateId={estimate.id} />
            <Link href="/upload">
              <Button variant="outline">Upload again</Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Car className="size-3.5" />
          {carLabel}
          {vinHint}
        </p>
        <PasteEstimateFallback
          estimateId={estimate.id}
          initialText={estimate.extractedText ?? ""}
          heading={
            laborOnly ? "We couldn't pull parts from that image" : "We couldn't match those parts yet"
          }
        />
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href={catalogHref}>
            <Button variant="outline">Browse {estimate.vehicle.model} parts</Button>
          </Link>
          <Link href="/upload">
            <Button variant="outline">Upload again</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Car className="size-3.5" />
        {carLabel}
        {vinHint}
      </p>

      <div className="mt-6 rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground">
        <p className="text-sm font-medium uppercase tracking-wide opacity-90">You can save</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
          {formatCurrency(Math.max(0, totalSavings))}
        </p>
        <p className="mt-3 text-sm opacity-90">
          Shop wants {formatCurrency(shopParts)} for these parts → OEM/premium online about{" "}
          {formatCurrency(onlineParts)}
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        OEM/premium matches quality; budget is cheaper aftermarket when available. Always
        verify fitment on the retailer before buying.
      </p>

      <ul className="mt-6 space-y-2.5">
        {lines.map((line) => {
          const primary = line.premium ?? line.budget!;
          const tiers = [
            line.premium
              ? { label: "OEM / Premium", c: line.premium, badge: "quality" as const }
              : null,
            line.budget
              ? { label: "Budget choice", c: line.budget, badge: "budget" as const }
              : null,
          ].filter(Boolean) as {
            label: string;
            c: (typeof comparisons)[0];
            badge: "quality" | "budget";
          }[];

          const shopName =
            primary.estimateItem?.description ?? primary.catalogPart.name;
          const qty = primary.estimateItem?.quantity ?? 1;

          return (
            <li key={primary.id} className="rounded-xl border bg-card px-3 py-2.5 sm:px-3.5">
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                Shop: {shopName}
                {qty > 1 ? ` ×${qty}` : ""}
              </p>
              <div className="mt-2 space-y-2">
                {tiers.map(({ label, c, badge }) => {
                  const query = {
                    brand: c.catalogPart.brand,
                    name: c.catalogPart.name,
                    oemNumbers: c.catalogPart.oemNumbers,
                    oemPartNumber: c.estimateItem?.oemPartNumber,
                    year: estimate.vehicle.year,
                    make: estimate.vehicle.make,
                    model: estimate.vehicle.model,
                    engine: estimate.vehicle.engine,
                    amazonAsin: c.catalogPart.amazonAsin ?? c.estimateItem?.amazonAsin,
                    ebayItemId: c.catalogPart.ebayItemId ?? c.estimateItem?.ebayItemId,
                  };
                  const bundle = buildProductBuyBundle(query, c.ourPrice);
                  const title = cleanPartDisplayName(
                    c.catalogPart.brand,
                    c.catalogPart.name,
                    { isPremium: badge === "quality" }
                  );
                  const savingsPct =
                    c.mechanicPrice > 0
                      ? (Math.max(0, c.savings) / c.mechanicPrice) * 100
                      : null;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2.5 rounded-lg bg-secondary/40 px-2.5 py-2 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <CatalogPartImage
                          name={title}
                          category={c.catalogPart.category}
                          imageUrl={c.catalogPart.imageUrl}
                          className="relative size-10 shrink-0 overflow-hidden rounded-md bg-secondary"
                          sizes="40px"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                            {label}
                          </p>
                          <p className="truncate text-sm font-bold leading-snug">{title}</p>
                          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="text-xs tabular-nums text-muted-foreground line-through">
                              {formatCurrency(c.mechanicPrice)}
                            </span>
                            <span className="text-sm font-extrabold tabular-nums text-primary">
                              {formatCurrency(c.ourPrice)}
                            </span>
                            {c.savings > 0 && (
                              <span className="text-[11px] font-semibold text-success">
                                Save {formatCurrency(c.savings)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <PartBuyAction
                        bundle={bundle}
                        className="sm:w-auto sm:shrink-0"
                        fitment={{
                          year: estimate.vehicle.year,
                          make: estimate.vehicle.make,
                          model: estimate.vehicle.model,
                          vin: estimate.vehicle.vin,
                          savingsPercent: savingsPct,
                          partName: title,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
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
