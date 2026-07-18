"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/lib/affiliates";

/** Compact retailer buttons for a single part. */
export function AffiliateBuyButtons({
  links,
  compact = false,
}: {
  links: AffiliateLink[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex"
        >
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className={compact ? "h-8 gap-1 px-2.5 text-xs" : "gap-1.5"}
          >
            {link.label}
            <ExternalLink className={compact ? "size-3" : "size-3.5 opacity-60"} />
          </Button>
        </a>
      ))}
    </div>
  );
}

/** Primary money CTA: open every matched part at the cheapest-style retailer. */
export function BuyAllAtRetailersButton({
  urls,
  count,
}: {
  urls: string[];
  count: number;
}) {
  return (
    <Button
      size="lg"
      disabled={urls.length === 0}
      onClick={() => {
        // Open one tab per part. Browsers may block extras until the first click —
        // RockAuto (usually cheapest) is first so it always opens.
        for (const url of urls) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }}
    >
      <ExternalLink className="size-5" />
      Buy all {count} cheaper parts online
    </Button>
  );
}
