"use client";

import { useState } from "react";
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

/**
 * Bulk buy CTA. Browsers block multi-tab window.open after the first,
 * so we open the first link immediately and list the rest for one-click opens.
 */
export function BuyAllAtRetailersButton({
  urls,
  count,
}: {
  urls: string[];
  count: number;
}) {
  const [showList, setShowList] = useState(false);

  if (urls.length === 0) {
    return (
      <Button size="lg" disabled>
        <ExternalLink className="size-5" />
        Buy all cheaper parts online
      </Button>
    );
  }

  if (!showList) {
    return (
      <Button
        size="lg"
        onClick={() => {
          window.open(urls[0], "_blank", "noopener,noreferrer");
          setShowList(true);
        }}
      >
        <ExternalLink className="size-5" />
        Buy all {count} cheaper parts online
      </Button>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-3 rounded-xl border bg-card p-4 text-left">
      <p className="text-sm font-medium">
        Opened part 1 of {urls.length}. Click each remaining link (browsers block opening many tabs at once):
      </p>
      <ol className="space-y-2">
        {urls.map((url, i) => (
          <li key={`${url}-${i}`}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Part {i + 1}
              <ExternalLink className="size-3.5" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
