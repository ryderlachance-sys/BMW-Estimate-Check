"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  overrideComparisonMatch,
  updateCatalogPart,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StockStatus } from "@prisma/client";
const STOCK_STATUSES: StockStatus[] = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "SPECIAL_ORDER"];

export function PartEditor({
  partId,
  price,
  stockStatus,
  amazonAsin,
  ebayItemId,
}: {
  partId: string;
  price: number;
  stockStatus: StockStatus;
  amazonAsin: string | null;
  ebayItemId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [newPrice, setNewPrice] = useState(price.toFixed(2));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asin, setAsin] = useState(amazonAsin ?? "");
  const [ebayId, setEbayId] = useState(ebayItemId ?? "");
  const parsedPrice = Number(newPrice);
  const priceValid = Number.isFinite(parsedPrice) && parsedPrice > 0;

  return (
    <div className="flex min-w-72 flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={newPrice}
          onChange={(e) => {
            setNewPrice(e.target.value);
            setError(null);
          }}
          className="h-8 w-24 text-xs tabular-nums"
          aria-label="Price"
        />
        <Select
          value={stockStatus}
          disabled={pending}
          className="h-8 w-36 text-xs"
          onChange={(e) =>
            startTransition(() =>
              updateCatalogPart(partId, { stockStatus: e.target.value as StockStatus })
            )
          }
        >
          {STOCK_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={pending || !priceValid || parsedPrice === price}
          onClick={() => {
            if (!priceValid) {
              setError("Enter a price above $0");
              return;
            }
            startTransition(async () => {
              try {
                await updateCatalogPart(partId, { price: parsedPrice });
                setSaved(true);
                setError(null);
                setTimeout(() => setSaved(false), 1500);
              } catch {
                setError("Could not save price");
              }
            });
          }}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : "Save"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={asin}
          onChange={(e) => { setAsin(e.target.value.toUpperCase()); setError(null); }}
          placeholder="Amazon ASIN"
          maxLength={10}
          className="h-8 w-32 font-mono text-xs"
          aria-label="Amazon ASIN"
        />
        <Input
          value={ebayId}
          onChange={(e) => { setEbayId(e.target.value.replace(/\D/g, "")); setError(null); }}
          placeholder="eBay item ID"
          className="h-8 w-36 font-mono text-xs"
          aria-label="eBay item ID"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={pending}
          onClick={() => startTransition(async () => {
            try {
              await updateCatalogPart(partId, {
                price: parsedPrice,
                amazonAsin: asin || null,
                ebayItemId: ebayId || null,
              });
              setSaved(true);
              setError(null);
              setTimeout(() => setSaved(false), 1500);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not save listing");
            }
          })}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Save exact listing"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Price must match the exact Amazon ASIN or eBay item ID entered here.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function MatchOverrideSelect({
  comparisonId,
  currentPartId,
  parts,
}: {
  comparisonId: string;
  currentPartId: string;
  parts: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentPartId}
        disabled={pending}
        className="h-8 max-w-72 text-xs"
        onChange={(e) =>
          startTransition(() => overrideComparisonMatch(comparisonId, e.target.value))
        }
      >
        {parts.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </Select>
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
