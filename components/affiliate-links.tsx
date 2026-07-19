"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";

export type CartBuyLine = {
  id: string;
  name: string;
  store: string;
  url: string;
  brand?: string;
  quantity?: number;
  priceLabel?: string;
};

/**
 * Guided checkout: open each retailer’s product page (affiliate-tagged).
 * Retailers ship; we earn commission — customer never pays us for parts.
 */
export function AffiliateCheckoutSteps({ lines }: { lines: CartBuyLine[] }) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  if (lines.length === 0) return null;

  const doneCount = lines.filter((l) => done[l.id]).length;
  const allDone = doneCount === lines.length;

  function openLine(line: CartBuyLine) {
    window.open(line.url, "_blank", "noopener,noreferrer");
    setDone((prev) => ({ ...prev, [line.id]: true }));
  }

  function startCheckout() {
    setStarted(true);
    openLine(lines[0]);
  }

  return (
    <div className="space-y-4">
      {!started ? (
        <>
          <Button
            type="button"
            size="lg"
            className="h-14 w-full text-base font-bold"
            onClick={startCheckout}
          >
            Checkout — buy all {lines.length} parts
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Retailers ship to you. We earn a small commission when you buy through these
            links — you never pay us for the parts.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 text-sm">
            <p className="font-semibold">
              {allDone
                ? "All parts opened — finish buying on each store tab"
                : `Opened ${doneCount} of ${lines.length} — keep going`}
            </p>
            {!allDone && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = lines.find((l) => !done[l.id]);
                  if (next) openLine(next);
                }}
              >
                Open next
              </Button>
            )}
          </div>
          <ol className="space-y-2">
            {lines.map((line, i) => {
              const isDone = Boolean(done[line.id]);
              return (
                <li
                  key={line.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-3",
                    isDone && "border-primary/30 bg-accent/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-snug">
                      {line.quantity && line.quantity > 1 ? `${line.quantity}× ` : ""}
                      {line.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.brand ? `${line.brand} · ` : ""}via {line.store}
                      {line.priceLabel ? ` · ${line.priceLabel}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isDone ? "outline" : "default"}
                    className="shrink-0 gap-1"
                    onClick={() => openLine(line)}
                  >
                    {isDone ? "Reopen" : "Open store"}
                    <ExternalLink className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ol>
          <p className="text-center text-xs text-muted-foreground">
            Complete checkout on each retailer tab. They ship to you — we get paid a
            commission by the store, not by charging your card here.
          </p>
        </>
      )}
    </div>
  );
}

/** @deprecated Use AffiliateCheckoutSteps — kept for any stray imports. */
export function BuyAllCartParts({ lines }: { lines: CartBuyLine[] }) {
  return <AffiliateCheckoutSteps lines={lines} />;
}

/** Per-part retailer buy buttons (optional secondary). */
export function AffiliateBuyButtons({
  links,
  compact = false,
  primaryId,
}: {
  links: AffiliateLink[];
  compact?: boolean;
  primaryId?: string;
}) {
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
      {links.map((link) => {
        const isPrimary = primaryId != null && link.id === primaryId;
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
              variant={isPrimary ? "default" : "outline"}
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
