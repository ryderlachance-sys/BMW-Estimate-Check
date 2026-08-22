"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  FitmentInterstitial,
  type FitmentContext,
} from "@/components/affiliate-links";
import type { ProductBuyBundle, PricedAffiliateLink } from "@/lib/affiliates";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Amazon + eBay product-style CTAs (primary).
 * RockAuto as a quiet wholesaler text link (secondary).
 * Never use a single RockAuto primary or "Compare other stores" control.
 */
export function PartBuyAction({
  bundle,
  fitment,
  className,
  directListing,
}: {
  bundle: ProductBuyBundle;
  fitment?: FitmentContext;
  className?: string;
  /** Optional verified listing — merges into Amazon/eBay when it matches that store. */
  directListing?: PricedAffiliateLink | null;
}) {
  const [pending, setPending] = useState<PricedAffiliateLink | null>(null);
  const amazon = mergeDirectListing(bundle.amazon, directListing);
  const ebay = mergeDirectListing(bundle.ebay, directListing);
  const { rockAuto } = bundle;

  return (
    <div className={cn("flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[14rem]", className)}>
      <PrimaryBuyButton link={amazon} onClick={() => setPending(amazon)} />
      <PrimaryBuyButton link={ebay} onClick={() => setPending(ebay)} tone="secondary" />

      <button
        type="button"
        onClick={() => setPending(rockAuto)}
        className="mt-0.5 text-left text-[11px] leading-snug text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:text-right"
      >
        Alternative wholesaler deal on RockAuto ({formatCurrency(rockAuto.estimatedPrice)})
      </button>

      {pending && (
        <FitmentInterstitial
          link={pending}
          fitment={fitment}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}

function mergeDirectListing(
  store: PricedAffiliateLink,
  directListing?: PricedAffiliateLink | null
): PricedAffiliateLink {
  if (!directListing?.isProductPage) return store;
  const label = directListing.label.toLowerCase();
  const id = directListing.id.toLowerCase();
  const matchesStore =
    (store.id === "amazon" && (id.includes("amazon") || label.includes("amazon"))) ||
    (store.id === "ebay" && (id.includes("ebay") || label.includes("ebay")));
  if (!matchesStore) return store;
  return {
    ...store,
    ...directListing,
    id: store.id,
    label: store.label,
  };
}

function PrimaryBuyButton({
  link,
  onClick,
  tone = "primary",
}: {
  link: PricedAffiliateLink;
  onClick: () => void;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-3",
        "text-sm font-bold tracking-tight shadow-sm transition active:scale-[0.99]",
        tone === "primary"
          ? "bg-zinc-950 text-white hover:bg-zinc-800"
          : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
      )}
    >
      Buy on {link.label} ({formatCurrency(link.estimatedPrice)})
      <ExternalLink className="size-3.5 opacity-80" />
    </button>
  );
}
