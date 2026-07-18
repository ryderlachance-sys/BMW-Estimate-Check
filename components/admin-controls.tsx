"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  overrideComparisonMatch,
  updateCatalogPart,
  updateOrderShipping,
  updateOrderStatus,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { OrderStatus, StockStatus } from "@prisma/client";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "FULFILLING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const STOCK_STATUSES: StockStatus[] = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "SPECIAL_ORDER"];

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        disabled={pending}
        className="h-8 w-36 text-xs"
        onChange={(e) =>
          startTransition(() => updateOrderStatus(orderId, e.target.value as OrderStatus))
        }
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function OrderShippingEditor({
  orderId,
  trackingNumber,
  estimatedDelivery,
}: {
  orderId: string;
  trackingNumber: string | null;
  estimatedDelivery: Date | null;
}) {
  const [pending, startTransition] = useTransition();
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [eta, setEta] = useState(
    estimatedDelivery
      ? new Date(estimatedDelivery).toISOString().slice(0, 10)
      : ""
  );
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Input
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        placeholder="Tracking #"
        className="h-8 w-36 text-xs"
        aria-label="Tracking number"
      />
      <Input
        type="date"
        value={eta}
        onChange={(e) => setEta(e.target.value)}
        className="h-8 w-36 text-xs"
        aria-label="Estimated delivery"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await updateOrderShipping(orderId, {
              trackingNumber: tracking,
              estimatedDelivery: eta || undefined,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : "Save ship"}
      </Button>
    </div>
  );
}

export function PartEditor({
  partId,
  price,
  stockStatus,
}: {
  partId: string;
  price: number;
  stockStatus: StockStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [newPrice, setNewPrice] = useState(price.toFixed(2));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedPrice = Number(newPrice);
  const priceValid = Number.isFinite(parsedPrice) && parsedPrice > 0;

  return (
    <div className="flex flex-col gap-1">
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
