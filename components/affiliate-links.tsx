"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";

export type FitmentContext = {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  /** e.g. 40 for "40% cheaper" */
  savingsPercent?: number | null;
  partName?: string | null;
};

function trackRetailerClick(link: AffiliateLink, fitment?: FitmentContext) {
  const vehicle = [fitment?.year, fitment?.make, fitment?.model].filter(Boolean).join(" ");
  void fetch("/api/outbound-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      retailer: link.label,
      url: link.url,
      partName: fitment?.partName ?? undefined,
      vehicle: vehicle || undefined,
    }),
  }).catch(() => undefined);
}

/** Optional per-part retailer links — opens a fitment warning before leaving. */
export function AffiliateBuyButtons({
  links,
  compact = false,
  primaryId,
  fitment,
}: {
  links: AffiliateLink[];
  compact?: boolean;
  primaryId?: string;
  fitment?: FitmentContext;
}) {
  const [pending, setPending] = useState<AffiliateLink | null>(null);

  return (
    <>
      <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
        {links.map((link) => {
          const isPrimary = primaryId != null && link.id === primaryId;
          return (
            <Button
              key={link.id}
              type="button"
              variant={isPrimary ? "default" : "outline"}
              size={compact ? "sm" : "default"}
              className={cn(
                compact ? "h-8 gap-1 px-2.5 text-xs" : "gap-1.5",
                !compact && isPrimary && "min-w-[8.5rem]"
              )}
              onClick={() => setPending(link)}
            >
              {compact ? link.label : `Find on ${link.label}`}
              <ExternalLink className={compact ? "size-3" : "size-3.5 opacity-70"} />
            </Button>
          );
        })}
      </div>

      {pending && (
        <FitmentInterstitial
          link={pending}
          fitment={fitment}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}

export function FitmentInterstitial({
  link,
  fitment,
  onClose,
}: {
  link: AffiliateLink;
  fitment?: FitmentContext;
  onClose: () => void;
}) {
  const car =
    [fitment?.year, fitment?.make !== "Unknown" ? fitment?.make : null, fitment?.model]
      .filter(Boolean)
      .join(" ") || "your vehicle";
  const pct =
    fitment?.savingsPercent != null && fitment.savingsPercent > 0
      ? Math.round(fitment.savingsPercent)
      : null;
  const exactProduct = link.isProductPage === true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fitment-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-background p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <AlertTriangle className="size-5" />
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <h2 id="fitment-title" className="mt-3 text-lg font-extrabold tracking-tight">
          Verify fitment before you buy
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {exactProduct && pct != null ? (
            <>
              We found this part about <strong>{pct}% cheaper</strong> on {link.label}.
            </>
          ) : exactProduct ? (
            <>We found a match on {link.label}.</>
          ) : (
            <>
              We built a focused {link.label} search using the vehicle and part from your
              estimate.
            </>
          )}{" "}
          Cars often change parts mid-year, and trim/engine variants matter. Always confirm
          fitment for <strong>{car}</strong>
          {fitment?.vin ? (
            <>
              {" "}
              (VIN ending <strong>…{fitment.vin.slice(-6)}</strong>)
            </>
          ) : null}{" "}
          on the retailer&apos;s page before checkout.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Enter your VIN or garage on the next site when they ask</li>
          <li>Check the fitment / compatibility box before buying</li>
          <li>We don&apos;t sell or ship parts — the retailer does</li>
        </ul>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex flex-1"
            onClick={() => {
              trackRetailerClick(link, fitment);
              onClose();
            }}
          >
            <Button type="button" className="h-11 w-full gap-1.5 font-bold">
              {exactProduct ? `Continue to ${link.label}` : `See options on ${link.label}`}
              <ExternalLink className="size-4" />
            </Button>
          </a>
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={onClose}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
