import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { calculateShipping, formatCurrency, round2 } from "@/lib/utils";
import { estimateDeliveryWindow } from "@/lib/delivery";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckoutForm } from "@/components/checkout-form";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merchant checkout (admin)",
  robots: { index: false },
};

/**
 * Legacy Stripe path: you take payment and must buy + ship parts.
 * Kept for admin/demo only — main /checkout is affiliate-based.
 */
export default async function MerchantCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;
  const user = await ensureUser();
  if (!user.isAdmin) redirect("/checkout");

  const stripeEnabled = isStripeConfigured();
  const [cart, mechanics] = await Promise.all([
    db.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { catalogPart: true }, orderBy: { id: "asc" } } },
    }),
    db.mechanic.findMany({
      where: { userId: user.id },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    }),
  ]);
  if (!cart || cart.items.length === 0) redirect("/cart");

  const subtotal = round2(
    cart.items.reduce((s, i) => s + i.catalogPart.price * i.quantity, 0)
  );
  const shipping = calculateShipping(subtotal);
  const total = round2(subtotal + shipping);
  const delivery = estimateDeliveryWindow(new Date(), shipping === 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/checkout"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Affiliate checkout
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Merchant checkout</h1>
      <p className="mt-2 max-w-2xl text-amber-800">
        Admin only: charging cards here means <strong>you</strong> must buy and ship the
        parts. Prefer the main checkout for affiliate commissions with zero inventory.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Shipping destination</CardTitle>
            <CardDescription>
              Ship to your address or directly to your mechanic — equally simple either way.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cancelled && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Payment was cancelled — your cart is still here. Update details and try again
                when you&apos;re ready.
              </div>
            )}
            <CheckoutForm
              savedMechanics={mechanics}
              deliveryLabel={delivery.label}
              stripeEnabled={stripeEnabled}
            />
          </CardContent>
        </Card>

        <Card className="h-fit lg:col-span-2 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              {cart.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {item.quantity}× {item.catalogPart.brand} {item.catalogPart.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatCurrency(round2(item.catalogPart.price * item.quantity))}
                  </span>
                </li>
              ))}
            </ul>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-semibold tabular-nums">
                {shipping === 0 ? "Free" : formatCurrency(shipping)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-extrabold tabular-nums">{formatCurrency(total)}</span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">{delivery.label}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
