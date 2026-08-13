"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export type VerifiedCheckoutItem = {
  id: string;
  title: string;
  retailer: string;
  price: number;
  url: string;
  vehicle: string;
  mechanicPrice: number;
  fitmentNote?: string | null;
  checkedAt?: string | null;
};

function track(item: VerifiedCheckoutItem) {
  void fetch("/api/outbound-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ retailer: item.retailer, url: item.url, partName: item.title, vehicle: item.vehicle }),
  }).catch(() => undefined);
}

export function VerifiedPartsCheckout({ items }: { items: VerifiedCheckoutItem[] }) {
  const [opened, setOpened] = useState<string[]>([]);
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const retailerCount = new Set(items.map((item) => item.retailer)).size;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-sm">
      <div className="flex items-center gap-3 px-4 py-4 text-left sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShoppingCart className="size-5" />
        </span>
        <span>
          <span className="block font-extrabold">Buy your {items.length} verified parts</span>
          <span className="block text-sm text-muted-foreground">
            Exact listings total {formatCurrency(total)} · {retailerCount} retailer checkout{retailerCount === 1 ? "" : "s"}
          </span>
        </span>
      </div>

      <div className="border-t px-4 py-4 sm:px-5">
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Open each exact product, add it to that retailer&apos;s cart, then return here for the next part.
        </p>
        <div className="space-y-2">
          {items.map((item) => {
            const complete = opened.includes(item.id);
            return (
              <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-secondary/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">Shop charged {formatCurrency(item.mechanicPrice)}</p>
                  <p className="text-sm font-extrabold text-primary">
                    {item.retailer} {formatCurrency(item.price)}{" "}
                    <span className="text-xs text-success">Save {formatCurrency(Math.max(0, item.mechanicPrice - item.price))}</span>
                  </p>
                  {item.fitmentNote ? (
                    <p className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold leading-relaxed text-emerald-800">
                      ✓ {item.fitmentNote}
                    </p>
                  ) : null}
                  {item.checkedAt ? <p className="text-[10px] text-muted-foreground">Price checked {item.checkedAt}</p> : null}
                </div>
                <a href={item.url} target="_blank" rel="noopener noreferrer sponsored" onClick={() => {
                  track(item);
                  setOpened((current) => current.includes(item.id) ? current : [...current, item.id]);
                }} className="shrink-0">
                  <Button size="sm" variant={complete ? "outline" : "default"} className="w-full gap-1.5 sm:w-auto">
                    {complete ? <CheckCircle2 className="size-4 text-success" /> : null}
                    {complete ? "Opened" : `Buy on ${item.retailer}`}
                    <ExternalLink className="size-3.5" />
                  </Button>
                </a>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
          {opened.length} of {items.length} exact product pages opened
        </p>
      </div>
    </section>
  );
}
