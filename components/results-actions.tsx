"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw, ShoppingCart } from "lucide-react";
import { addAllFromEstimate } from "@/app/actions/cart";
import { retryEstimate } from "@/app/actions/estimate";
import { Button } from "@/components/ui/button";

export function AddAllToCartButton({
  estimateId,
  count,
  variant = "outline",
  className,
}: {
  estimateId: string;
  count: number;
  /** Default outline — retailer buy links are the primary money path. */
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const router = useRouter();

  return (
    <Button
      size="lg"
      variant={variant}
      className={className}
      disabled={pending || count === 0}
      onClick={() =>
        startTransition(async () => {
          await addAllFromEstimate(estimateId);
          setAdded(true);
          router.push("/cart");
        })
      }
    >
      {pending ? (
        <Loader2 className="size-5 animate-spin" />
      ) : added ? (
        <CheckCircle2 className="size-5" />
      ) : (
        <ShoppingCart className="size-5" />
      )}
      {added ? "Added — opening cart" : `Add all ${count} parts to cart`}
    </Button>
  );
}

export function RetryParseButton({ estimateId }: { estimateId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => retryEstimate(estimateId))}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      Retry analysis
    </Button>
  );
}

/** Auto-refreshes the page while an estimate is still processing. */
export function ProcessingPoller() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
