"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  FitmentInterstitial,
  type FitmentContext,
} from "@/components/affiliate-links";
import type { ProductBuyBundle, PricedAffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";

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
}: {
  bundle: ProductBuyBundle;
  fitment?: FitmentContext;
  className?: string;
}) {
  const [pending, setPending] = useState<PricedAffiliateLink | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const { amazon, ebay, rockAuto } = bundle;

  const recommended = useMemo(
    () =>
      [amazon, ebay].find((link) => link.isProductPage) ?? amazon,
    [amazon, ebay]
  );
  const alternatives = [amazon, ebay, rockAuto].filter(
    (link) => link.id !== recommended.id
  );

  return (
    <div className={cn("w-full sm:w-[15rem] sm:shrink-0", className)}>
      <button
        type="button"
        onClick={() => setPending(recommended)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99]"
      >
        {recommended.isProductPage
          ? `Open exact part on ${recommended.label}`
          : `Compare matches on ${recommended.label}`}
        <ExternalLink className="size-3.5 opacity-80" />
      </button>

      <button
        type="button"
        aria-expanded={showAlternatives}
        onClick={() => setShowAlternatives((value) => !value)}
        className="mx-auto mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Compare other stores
        <ChevronDown
          className={cn("size-3.5 transition-transform", showAlternatives && "rotate-180")}
        />
      </button>

      {showAlternatives && (
        <div className="mt-2 grid gap-1.5 rounded-xl border bg-background p-2">
          {alternatives.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => setPending(link)}
              className="flex min-h-9 items-center justify-between rounded-lg px-2.5 text-left text-xs font-semibold hover:bg-secondary"
            >
              <span>
                {link.isProductPage ? "View product on" : "Search"} {link.label}
              </span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
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
