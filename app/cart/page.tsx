import type { Metadata } from "next";
import Link from "next/link";
import { Cog, ShoppingCart } from "lucide-react";
import { getOrCreateCart } from "@/app/actions/cart";
import { calculateShipping, formatCurrency, round2 } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuantityControls, RemoveItemButton } from "@/components/cart-controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false },
};

export default async function CartPage() {
  const cart = await getOrCreateCart();

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
        <ShoppingCart className="size-12 text-muted-foreground/40" />
        <h1 className="mt-6 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-3 text-muted-foreground">
          Upload an estimate to get matched parts, or browse the catalog.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/upload"><Button>Check an estimate</Button></Link>
          <Link href="/catalog"><Button variant="outline">Browse catalog</Button></Link>
        </div>
      </div>
    );
  }

  const subtotal = round2(
    cart.items.reduce((s, i) => s + i.catalogPart.price * i.quantity, 0)
  );
  const shipping = calculateShipping(subtotal);
  const total = round2(subtotal + shipping);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className="hidden size-16 shrink-0 items-center justify-center rounded-lg bg-secondary sm:flex">
                  <Cog className="size-7 text-muted-foreground/40" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    {item.catalogPart.brand}
                  </p>
                  <p className="truncate font-semibold">{item.catalogPart.name}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU {item.catalogPart.sku} · {formatCurrency(item.catalogPart.price)} each
                  </p>
                </div>
                <QuantityControls itemId={item.id} quantity={item.quantity} />
                <p className="w-24 text-right font-bold tabular-nums">
                  {formatCurrency(round2(item.catalogPart.price * item.quantity))}
                </p>
                <RemoveItemButton itemId={item.id} />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated shipping</span>
              <span className="font-semibold tabular-nums">
                {shipping === 0 ? <span className="text-success">Free</span> : formatCurrency(shipping)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-semibold tabular-nums">{formatCurrency(0)}</span>
            </div>
            {shipping > 0 && (
              <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
                Add {formatCurrency(round2(149 - subtotal))} more for free shipping.
              </p>
            )}
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-extrabold tabular-nums">{formatCurrency(total)}</span>
            </div>
            <div className="pt-2">
              <Link href="/checkout">
                <Button size="lg" className="w-full">
                  Proceed to checkout <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Shipping (or Mechanic Delivery) collected at checkout, then card payment via Stripe when configured.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
