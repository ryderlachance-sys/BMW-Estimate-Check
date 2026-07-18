"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState } from "react";
import { Loader2, Search, ShoppingCart, CheckCircle2 } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function CatalogFilters({
  models,
  brands,
  categories,
  years,
}: {
  models: string[];
  brands: string[];
  categories: string[];
  years: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search parts…"
          className="pl-9"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
        />
      </div>
      <Select
        aria-label="Model"
        value={searchParams.get("model") ?? ""}
        onChange={(e) => setParam("model", e.target.value)}
      >
        <option value="">All models</option>
        {models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </Select>
      <Select
        aria-label="Year"
        value={searchParams.get("year") ?? ""}
        onChange={(e) => setParam("year", e.target.value)}
      >
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
      <Select
        aria-label="Brand"
        value={searchParams.get("brand") ?? ""}
        onChange={(e) => setParam("brand", e.target.value)}
      >
        <option value="">All brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </Select>
      <Select
        aria-label="Category"
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
    </div>
  );
}

export function AddToCartButton({
  partId,
  disabled,
}: {
  partId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  return (
    <Button
      className="w-full"
      disabled={pending || disabled}
      onClick={() =>
        startTransition(async () => {
          await addToCart(partId, 1);
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : added ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <ShoppingCart className="size-4" />
      )}
      {added ? "Added to cart" : disabled ? "Out of stock" : "Add to cart"}
    </Button>
  );
}
