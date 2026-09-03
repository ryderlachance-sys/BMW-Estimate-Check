"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  FitmentInterstitial,
  type FitmentContext,
} from "@/components/affiliate-links";
import type { ProductBuyBundle, PricedAffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

/**
 * One clear recommendation. A direct product CTA is shown only when the
 * catalog contains a verified ASIN or eBay item ID. Search fallbacks are
 * labeled honestly so a customer never expects a single listing and lands on
 * a results grid by surprise.
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
  directListing?: PricedAffiliateLink | null;
}) {
  const [pending, setPending] = useState<PricedAffiliateLink | null>(null);
  const { amazon, ebay, rockAuto } = bundle;

  const recommended = useMemo(
    () => directListing ?? [amazon, ebay].find((link) => link.isProductPage) ?? null,
    [amazon, ebay, directListing]
  );

  const primaryLinks = recommended
    ? [recommended, ...[amazon, ebay].filter(
        (l) => l.url !== recommended.url && l.isProductPage
      )]
    : [amazon, ebay];

  return (
    <div className={cn("w-full sm:w-[15rem] sm:shrink-0", className)}>
      <div className="grid gap-2">
        {primaryLinks.map((link, i) => (
          <button
            key={link.id}
            type="button"
            onClick={() => setPending(link)}
            className={cn(
              "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm transition active:scale-[0.99]",
              i === 0
                ? "bg-zinc-950 text-white hover:bg-zinc-800"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {link.isProductPage ? `Buy on ${link.label}` : `Find on ${link.label}`}
            <ExternalLink className="size-3.5 opacity-80" />
          </button>
        ))}
      </div>
      <AffiliateDisclosure className="mt-1.5 text-center" />

      {rockAuto.url && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => setPending(rockAuto)}
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            Alternative wholesaler deal on RockAuto
            {rockAuto.estimatedPrice != null && ` ($${rockAuto.estimatedPrice})`}
          </button>
        </p>
      )}

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
