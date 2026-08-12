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
  const { amazon, ebay, rockAuto } = bundle;

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
