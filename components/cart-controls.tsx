"use client";

import { useTransition } from "react";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { removeCartItem, updateCartItemQuantity } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";

export function QuantityControls({ itemId, quantity }: { itemId: string; quantity: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        aria-label="Decrease quantity"
        disabled={pending}
        onClick={() => startTransition(() => updateCartItemQuantity(itemId, quantity - 1))}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-9 text-center text-sm font-semibold tabular-nums">
        {pending ? <Loader2 className="mx-auto size-4 animate-spin" /> : quantity}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        aria-label="Increase quantity"
        disabled={pending}
        onClick={() => startTransition(() => updateCartItemQuantity(itemId, quantity + 1))}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}

export function RemoveItemButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Remove item"
      disabled={pending}
      onClick={() => startTransition(() => removeCartItem(itemId))}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-muted-foreground" />}
    </Button>
  );
}

