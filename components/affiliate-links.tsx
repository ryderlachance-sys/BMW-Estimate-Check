"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";

export type ShopAllPart = {
  id: string;
  name: string;
  /** Retailer id → buy URL (amazon, ebay, rockauto, fcpeuro, …) */
  urls: Record<string, string>;
};

const STORES: { id: string; label: string }[] = [
  { id: "amazon", label: "Amazon" },
  { id: "ebay", label: "eBay" },
  { id: "rockauto", label: "RockAuto" },
  { id: "fcpeuro", label: "FCP Euro" },
];

/**
 * Pick a store, then open every part on that store.
 * Browsers block multi-popups — we show every link so nothing gets skipped.
 */
export function ShopAllParts({ parts }: { parts: ShopAllPart[] }) {
  const [storeId, setStoreId] = useState<string | null>(null);

  if (parts.length === 0) return null;

  const store = STORES.find((s) => s.id === storeId) ?? null;
  const linksForStore = store
    ? parts
        .map((p) => ({ id: p.id, name: p.name, url: p.urls[store.id] }))
        .filter((p): p is { id: string; name: string; url: string } => Boolean(p.url))
    : [];

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold">Buy all {parts.length} parts on</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STORES.map((s) => (
          <Button
            key={s.id}
            type="button"
            size="lg"
            variant={storeId === s.id ? "default" : "outline"}
            className="h-12 font-semibold"
            onClick={() => setStoreId(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {store && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Open each part on {store.label} — they ship; you don&apos;t handle inventory.
          </p>
          <ol className="mt-3 space-y-2">
            {linksForStore.map((p, i) => (
              <li key={p.id}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm font-semibold hover:border-primary hover:bg-accent"
                >
                  <span className="min-w-0 truncate">
                    {i + 1}. {p.name}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    Open
                    <ExternalLink className="size-3.5" />
                  </span>
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
  primaryId,
}: {
  links: AffiliateLink[];
  compact?: boolean;
  /** Optional: highlight one retailer. Default: none preferred. */
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
