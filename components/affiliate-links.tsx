"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/lib/affiliates";
import { cn } from "@/lib/utils";

/** Big retailer buy buttons — primary actions on the parts page. */
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
