"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  FitmentInterstitial,
  type FitmentContext,
} from "@/components/affiliate-links";
import type { PricedAffiliateLink } from "@/lib/affiliates";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * One premium "Buy on Store ($price)" CTA + collapsed "Compare other stores".
 */
export function PartBuyAction({
  pricedLinks,
  fitment,
  className,
}: {
  pricedLinks: PricedAffiliateLink[];
  fitment?: FitmentContext;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PricedAffiliateLink | null>(null);

  if (pricedLinks.length === 0) return null;

  const cheapest = pricedLinks[0];
  const others = pricedLinks.slice(1);

  return (
    <div className={cn("flex w-full flex-col items-stretch sm:items-end", className)}>
      <button
        type="button"
        onClick={() => setPending(cheapest)}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4",
          "bg-zinc-950 text-sm font-bold tracking-tight text-white shadow-sm",
          "transition hover:bg-zinc-800 active:scale-[0.99]",
          "sm:min-w-[13.5rem] sm:w-auto"
        )}
      >
        Buy on {cheapest.label} ({formatCurrency(cheapest.estimatedPrice)})
        <ExternalLink className="size-3.5 opacity-80" />
      </button>

      {others.length > 0 && (
        <div className="mt-1.5 w-full sm:w-auto sm:text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            aria-expanded={open}
          >
            Compare other stores
            <ChevronDown
              className={cn("size-3 transition-transform", open && "rotate-180")}
            />
          </button>
          {open && (
            <div className="mt-1.5 rounded-lg border bg-background/80 p-2 text-left shadow-sm sm:min-w-[12rem]">
              <ul className="space-y-0.5">
                {others.map((link) => (
                  <li key={link.id}>
                    <button
                      type="button"
                      onClick={() => setPending(link)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs hover:bg-secondary"
                    >
                      <span className="font-medium">{link.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(link.estimatedPrice)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
