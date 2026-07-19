import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, round2 } from "@/lib/utils";
import { bestBuyForPart } from "@/lib/affiliates";
import { AffiliateCheckoutSteps } from "@/components/affiliate-links";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const user = await ensureUser();
  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { catalogPart: true }, orderBy: { id: "asc" } } },
  });
  if (!cart || cart.items.length === 0) redirect("/cart");

  const lines = cart.items.map((item) => {
    const best = bestBuyForPart({
      brand: item.catalogPart.brand,
      name: item.catalogPart.name,
      oemNumbers: item.catalogPart.oemNumbers,
    });
    const lineTotal = round2(item.catalogPart.price * item.quantity);
    return {
      id: item.id,
      name: item.catalogPart.name,
      store: best.label,
      url: best.url,
      brand: item.catalogPart.brand,
      quantity: item.quantity,
      priceLabel: formatCurrency(lineTotal),
      price: item.catalogPart.price,
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to cart
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Checkout</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Buy every part from the best store we picked. Retailers ship to you — we earn a
        commission when you use these links. Your card is never charged on this site.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Your parts</CardTitle>
          </CardHeader>
          <CardContent>
            <AffiliateCheckoutSteps lines={lines} />
          </CardContent>
        </Card>

        <Card className="h-fit lg:col-span-2 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              {lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3">
                  <span className="min-w-0 text-muted-foreground">
                    {line.quantity > 1 ? `${line.quantity}× ` : ""}
                    {line.name}
                    <span className="block text-[11px]">via {line.store}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{line.priceLabel}</span>
                </li>
              ))}
            </ul>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-bold">Est. total</span>
              <span className="font-extrabold tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Final price and shipping are set by each retailer at checkout.
            </p>
            <Link href="/cart" className="block pt-1">
              <Button variant="outline" className="w-full" type="button">
                Edit cart
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
