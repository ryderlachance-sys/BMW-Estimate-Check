import type { Metadata } from "next";
import Link from "next/link";
import { Cog, ShoppingCart } from "lucide-react";
import { getOrCreateCart } from "@/app/actions/cart";
import { formatCurrency, round2 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuantityControls, RemoveItemButton } from "@/components/cart-controls";
import { BuyAllCartParts } from "@/components/affiliate-links";
import { bestBuyForPart } from "@/lib/affiliates";

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
          <Link href="/upload">
            <Button>Check an estimate</Button>
          </Link>
          <Link href="/catalog">
            <Button variant="outline">Browse catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const lines = cart.items.map((item) => {
    const best = bestBuyForPart({
      brand: item.catalogPart.brand,
      name: item.catalogPart.name,
      oemNumbers: item.catalogPart.oemNumbers,
    });
    return {
      id: item.id,
      name: item.catalogPart.name,
      store: best.label,
      url: best.url,
      brand: item.catalogPart.brand,
      price: item.catalogPart.price,
      quantity: item.quantity,
      sku: item.catalogPart.sku,
    };
  });

  const subtotal = round2(lines.reduce((s, i) => s + i.price * i.quantity, 0));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Your cart</h1>
      <p className="mt-2 text-muted-foreground">
        Each part already has the best store picked — cheap + reliable, and where we can earn a
        commission.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item, idx) => {
            const line = lines[idx];
            return (
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
                      Buy via {line.store} · {formatCurrency(item.catalogPart.price)} each
                    </p>
                  </div>
                  <QuantityControls itemId={item.id} quantity={item.quantity} />
                  <p className="w-24 text-right font-bold tabular-nums">
                    {formatCurrency(round2(item.catalogPart.price * item.quantity))}
                  </p>
                  <RemoveItemButton itemId={item.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parts (est.)</span>
              <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-extrabold tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="pt-2">
              <BuyAllCartParts
                lines={lines.map((l) => ({
                  id: l.id,
                  name: l.name,
                  store: l.store,
                  url: l.url,
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
