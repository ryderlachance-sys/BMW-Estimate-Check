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
import { VerifiedPartsCheckout } from "@/components/verified-parts-checkout";
import { EstimateReviewForm } from "@/components/estimate-review-form";
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

  const reviewParts = estimate.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    mechanicPrice: item.mechanicPrice,
    oemPartNumber: item.oemPartNumber ?? "",
  }));
  const reviewVehicle = {
    year: estimate.vehicle.year,
    make: estimate.vehicle.make,
    model: estimate.vehicle.model,
    engine: estimate.vehicle.engine,
    vin: estimate.vehicle.vin,
  };

  if (estimate.errorMessage === "CONFIRM_VEHICLE") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl bg-primary px-6 py-7 text-primary-foreground">
          <p className="text-sm font-bold uppercase tracking-wide opacity-85">One quick check</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Is this your vehicle and repair?</h1>
          <p className="mt-3 text-sm leading-relaxed opacity-90">
            Confirm what we read before we look for exact products. Correcting a year, engine,
            part name, or OEM number now prevents the wrong part from being recommended.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <EstimateReviewForm
            estimateId={estimate.id}
            vehicle={reviewVehicle}
            initialParts={reviewParts}
            required
          />
        </div>
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
  const manualSearch = estimate.originalFileUrl === "manual://parts";

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

    // Parts were found but nothing in our catalog matched — still show shop
    // prices + affiliate search so the user can buy (and we can earn).
    if (!laborOnly && unmatchedItems.length > 0) {
      const shopParts = round2(
        unmatchedItems.reduce((s, i) => s + i.mechanicPrice, 0)
      );
      const verifiedOnline = round2(
        unmatchedItems.reduce((sum, item) => sum + (item.retailerPrice ?? 0), 0)
      );
      const verifiedShop = round2(
        unmatchedItems.reduce(
          (sum, item) => sum + (item.retailerPrice ? item.mechanicPrice : 0),
          0
        )
      );
      const verifiedSavings = round2(Math.max(0, verifiedShop - verifiedOnline));
      const checkoutItems = unmatchedItems.flatMap((item) => {
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
        const bundle = buildProductBuyBundle(query, item.retailerPrice ?? 0.01);
        const link = item.retailerUrl && item.retailerName
          ? { label: item.retailerName, url: item.retailerUrl }
          : [bundle.amazon, bundle.ebay].find((candidate) => candidate.isProductPage);
        return item.retailerPrice && link
          ? [{
              id: item.id,
              title: item.productTitle ?? item.description,
              retailer: link.label,
              price: item.retailerPrice,
              url: link.url,
              vehicle: carLabel,
              mechanicPrice: item.mechanicPrice,
              fitmentNote: item.fitmentNote,
              checkedAt: item.retailerCheckedAt?.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            }]
          : [];
      });
      return (
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Car className="size-3.5" />
            {carLabel}
            {vinHint}
          </p>
          <div className="mt-6 rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground">
            <p className="text-sm font-medium uppercase tracking-wide opacity-90">
              {manualSearch ? "Parts requested" : verifiedOnline > 0 ? "Verified parts savings" : "Shop parts total"}
            </p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
              {manualSearch ? unmatchedItems.length : formatCurrency(verifiedOnline > 0 ? verifiedSavings : shopParts)}
            </p>
            <p className="mt-3 text-sm opacity-90">
              {manualSearch
                ? "We’ll show exact verified listings where fitment data is available."
                : verifiedOnline > 0
                ? `Mechanic parts ${formatCurrency(verifiedShop)} · verified online ${formatCurrency(verifiedOnline)}`
                : "We found the parts. Choose a retailer below and confirm fitment before buying."}
            </p>
          </div>
          <VerifiedPartsCheckout items={checkoutItems} />
          {unmatchedItems.some((item) => !item.retailerPrice) && <ul className="mt-6 space-y-2.5">
            {unmatchedItems.filter((item) => !item.retailerPrice).map((item) => {
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
              const listingPrice = item.retailerPrice ?? item.mechanicPrice * 0.55;
              const bundle = buildProductBuyBundle(query, listingPrice);
              const directListing =
                item.retailerUrl && item.retailerName && item.retailerPrice
                  ? {
                      id: item.retailerName.toLowerCase(),
                      label: item.retailerName,
                      hint: "Verified exact product listing",
                      url: item.retailerUrl,
                      isProductPage: true,
                      estimatedPrice: item.retailerPrice,
                    }
                  : null;
              const savings = item.retailerPrice
                ? Math.max(0, item.mechanicPrice - item.retailerPrice)
                : null;
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-snug">
                      {item.productTitle ?? item.description}
                    </p>
                    {!manualSearch && <p className="mt-0.5 text-xs text-muted-foreground">
                      Shop charged {formatCurrency(item.mechanicPrice)}
                    </p>}
                    {item.retailerPrice && (
                      <p className="mt-1 text-sm font-extrabold text-primary">
                        {item.retailerName ?? "Online"} {formatCurrency(item.retailerPrice)}
                        {!manualSearch && savings !== null && (
                          <span className="ml-2 text-xs font-semibold text-success">
                            Save {formatCurrency(savings)}
                          </span>
                        )}
                      </p>
                    )}
                    {item.fitmentNote && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        ✓ {item.fitmentNote}
                      </p>
                    )}
                    {item.retailerCheckedAt && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Price checked {item.retailerCheckedAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <PartBuyAction
                    bundle={bundle}
                    directListing={directListing}
                    className="sm:w-auto sm:shrink-0"
                    fitment={{
                      year: estimate.vehicle.year,
                      make: estimate.vehicle.make,
                      model: estimate.vehicle.model,
                      vin: estimate.vehicle.vin,
                      partName: item.productTitle ?? item.description,
                      savingsPercent:
                        savings !== null && item.mechanicPrice > 0
                          ? (savings / item.mechanicPrice) * 100
                          : undefined,
                    }}
                  />
                </li>
              );
            })}
          </ul>}
          <EstimateReviewForm
            estimateId={estimate.id}
            vehicle={reviewVehicle}
            initialParts={reviewParts}
          />
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
          <Link href="/upload">
            <Button variant="outline">Try another estimate</Button>
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
        <p className="text-sm font-medium uppercase tracking-wide opacity-90">
          {manualSearch ? "Estimated online parts total" : "Estimated parts savings"}
        </p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
          {formatCurrency(manualSearch ? onlineParts : Math.max(0, totalSavings))}
        </p>
        <p className="mt-3 text-sm opacity-90">
          {manualSearch
            ? "Confirm current price and exact fitment with the retailer before buying."
            : <>Shop wants {formatCurrency(shopParts)} for these parts → catalog estimate about {formatCurrency(onlineParts)}</>}
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Catalog estimates are not live Amazon or eBay prices. A retailer button opens one
        exact product only when that listing has been verified; otherwise it opens matching
        options so you can confirm the current price and fitment.
      </p>

      <ul className="mt-6 space-y-2.5">
        {lines.map((line) => {
          const primary = line.premium ?? line.budget!;
          const shopName =
            primary.estimateItem?.description ?? primary.catalogPart.name;
          const qty = primary.estimateItem?.quantity ?? 1;
          const query = {
            brand: primary.catalogPart.brand,
            name: primary.catalogPart.name,
            oemNumbers: primary.catalogPart.oemNumbers,
            oemPartNumber: primary.estimateItem?.oemPartNumber,
            year: estimate.vehicle.year,
            make: estimate.vehicle.make,
            model: estimate.vehicle.model,
            engine: estimate.vehicle.engine,
            amazonAsin: primary.catalogPart.amazonAsin ?? primary.estimateItem?.amazonAsin,
            ebayItemId: primary.catalogPart.ebayItemId ?? primary.estimateItem?.ebayItemId,
          };
          const bundle = buildProductBuyBundle(query, primary.ourPrice);
          const hasVerifiedListing = bundle.amazon.isProductPage || bundle.ebay.isProductPage;
          const title = cleanPartDisplayName(
            primary.catalogPart.brand,
            primary.catalogPart.name,
            { isPremium: primary.matchMethod !== "BUDGET" }
          );
          const savingsPct =
            primary.mechanicPrice > 0
              ? (Math.max(0, primary.savings) / primary.mechanicPrice) * 100
              : null;

          return (
            <li key={primary.id} className="rounded-xl border bg-card px-3 py-2.5 sm:px-3.5">
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                Shop: {shopName}
                {qty > 1 ? ` ×${qty}` : ""}
              </p>
              <div className="mt-2">
                    <div className="flex flex-col gap-3 rounded-lg bg-secondary/40 px-3 py-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <CatalogPartImage
                          name={title}
                          category={primary.catalogPart.category}
                          imageUrl={primary.catalogPart.imageUrl}
                          className="relative size-10 shrink-0 overflow-hidden rounded-md bg-secondary"
                          sizes="40px"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                            Recommended part
                          </p>
                          <p className="truncate text-sm font-bold leading-snug">{title}</p>
                          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            {!manualSearch && <span className="text-xs tabular-nums text-muted-foreground line-through">
                              {formatCurrency(primary.mechanicPrice)}
                            </span>}
                            <span className="text-sm font-extrabold tabular-nums text-primary">
                              {hasVerifiedListing ? "Verified listing" : "Catalog estimate"}{" "}
                              {formatCurrency(primary.ourPrice)}
                            </span>
                            {!manualSearch && primary.savings > 0 && (
                              <span className="text-[11px] font-semibold text-success">
                                Est. save {formatCurrency(primary.savings)}
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
              </div>
            </li>
          );
        })}
      </ul>

      <EstimateReviewForm
        estimateId={estimate.id}
        vehicle={reviewVehicle}
        initialParts={reviewParts}
      />

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
