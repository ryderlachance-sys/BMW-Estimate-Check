"use client";

import { useState } from "react";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";

export type BuyAllPart = {
  id: string;
  name: string;
  amazonUrl: string;
};

/**
 * Primary money path: customer buys on Amazon (they ship).
 * You earn affiliate commission — you never buy or mail parts.
 */
export function BuyAllOnAmazonButton({
  parts,
  className,
}: {
  parts: BuyAllPart[];
  className?: string;
}) {
  const [started, setStarted] = useState(false);

  if (parts.length === 0) return null;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        className={cn("h-14 w-full text-base font-bold", className)}
        onClick={() => {
          setStarted(true);
          // Browsers only allow one popup per click — open the first, list the rest.
          window.open(parts[0].amazonUrl, "_blank", "noopener,noreferrer");
        }}
      >
        <ShoppingBag className="size-5" />
        Buy all {parts.length} parts on Amazon
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Amazon ships to them. You earn a commission — no inventory, no packing.
      </p>
      {started && parts.length > 1 && (
        <div className="rounded-2xl border bg-card p-4 text-left">
          <p className="text-sm font-semibold">Opened part 1 — tap the rest:</p>
          <ol className="mt-3 space-y-2">
            {parts.map((p, i) => (
              <li key={p.id}>
                <a
                  href={p.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <span className="min-w-0 truncate">
                    {i + 1}. {p.name}
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Per-part retailer buy buttons. */
export function AffiliateBuyButtons({
  links,
  compact = false,
  primaryId = "amazon",
}: {
  links: AffiliateLink[];
  compact?: boolean;
  /** Which retailer gets the filled primary style */
  primaryId?: string;
}) {
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
      {links.map((link) => {
        const isPrimary = link.id === primaryId;
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex"
          >
            <Button
              type="button"
              variant={isPrimary && !compact ? "default" : "outline"}
              size={compact ? "sm" : "default"}
              className={cn(
                compact ? "h-8 gap-1 px-2.5 text-xs" : "gap-1.5",
                !compact && isPrimary && "min-w-[8.5rem]"
              )}
            >
              {compact ? link.label : `Find on ${link.label}`}
              <ExternalLink className={compact ? "size-3" : "size-3.5 opacity-70"} />
            </Button>
          </a>
        );
      })}
    </div>
  );
}
