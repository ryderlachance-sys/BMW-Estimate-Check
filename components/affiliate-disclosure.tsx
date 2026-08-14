import { cn } from "@/lib/utils";

export function AffiliateDisclosure({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] leading-relaxed text-muted-foreground", className)}>
      Paid retailer link — Engine Genie may earn a commission if you buy, at no extra cost to you.
    </p>
  );
}
