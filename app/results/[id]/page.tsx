import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Car, Loader2 } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, round2 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AddAllToCartButton,
  ProcessingPoller,
  RetryParseButton,
} from "@/components/results-actions";
import { ConfirmVehicleForm } from "@/components/confirm-vehicle-form";
import { bestBuyForPart } from "@/lib/affiliates";

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
      estimate.errorMessage?.toLowerCase().includes("couldn't find your bmw");

    if (needsVehicle || vehicleMissingMsg) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
          <Car className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Tell us your BMW</h1>
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

  const needsVehicle =
    estimate.errorMessage === "NEED_VEHICLE" ||
    estimate.vehicle.model.toLowerCase() === "pending";

  if (needsVehicle) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <Car className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Tell us your BMW</h1>
        <ConfirmVehicleForm estimateId={estimate.id} />
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

  if (comparisons.length === 0) {
    const laborOnly =
      estimate.errorMessage === "NO_PARTS" || estimate.items.length === 0;
    const catalogHref = `/catalog?model=${encodeURIComponent(estimate.vehicle.model)}&year=${estimate.vehicle.year}`;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Car className="size-3.5" />
          {carLabel}
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          {laborOnly ? "No parts on this estimate" : "We couldn't match those parts yet"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {laborOnly
            ? "This looks like labor or service only (no replacement parts listed). Browse the catalog for your BMW, or upload an estimate that lists parts."
            : "Upload a clearer photo or the shop PDF so we can show your savings."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={catalogHref}>
            <Button>Browse {estimate.vehicle.model} parts</Button>
          </Link>
          <RetryParseButton estimateId={estimate.id} />
          <Link href="/upload">
            <Button variant="outline">Upload again</Button>
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

      <div className="mt-8 space-y-2">
        <AddAllToCartButton
          estimateId={estimate.id}
          count={comparisons.length}
          variant="default"
          className="h-14 w-full text-base font-bold"
        />
        <p className="text-center text-xs text-muted-foreground">
          We pick the best part + store for each line. One button — then buy from your cart.
        </p>
      </div>

      <ul className="mt-10 space-y-3">
        {comparisons.map((c) => {
          const best = bestBuyForPart({
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
            <li key={c.id} className="rounded-2xl border bg-card px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold leading-snug">
                    {c.catalogPart.name}
                    {qty > 1 ? ` ×${qty}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.catalogPart.brand} · best via {best.label}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm tabular-nums text-muted-foreground line-through">
                    {formatCurrency(c.mechanicPrice)}
                  </p>
                  <p className="text-lg font-extrabold tabular-nums text-primary">
                    {formatCurrency(c.ourPrice)}
                  </p>
                  {c.savings > 0 && (
                    <p className="text-xs font-semibold text-success">
                      Save {formatCurrency(c.savings)}
                    </p>
                  )}
                </div>
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
