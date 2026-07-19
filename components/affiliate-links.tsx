"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";

export type CartBuyLine = {
  id: string;
  name: string;
  store: string;
  url: string;
};

/** One click → full list of auto-picked store links for every cart line. */
export function BuyAllCartParts({ lines }: { lines: CartBuyLine[] }) {
  const [open, setOpen] = useState(false);

  if (lines.length === 0) return null;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base font-bold"
        onClick={() => {
          setOpen(true);
          window.open(lines[0].url, "_blank", "noopener,noreferrer");
        }}
      >
        Buy all {lines.length} parts
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We already picked the best store for each part. They ship to you — we earn a small
        commission.
      </p>
      {open && (
        <ol className="space-y-2 rounded-xl border bg-card p-3 text-left">
          {lines.map((line, i) => (
            <li key={line.id}>
              <a
                href={line.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold hover:border-primary hover:bg-accent"
              >
                <span className="min-w-0 truncate">
                  {i + 1}. {line.name}
                  <span className="ml-1 font-normal text-muted-foreground">via {line.store}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-primary" />
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
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
