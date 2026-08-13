"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { reviewEstimateDetails } from "@/app/actions/estimate";
import { MAKES } from "@/lib/vehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReviewPart = {
  id: string;
  description: string;
  quantity: number;
  mechanicPrice: number;
  oemPartNumber: string;
};

export function EstimateReviewForm({
  estimateId,
  vehicle,
  initialParts,
  required = false,
}: {
  estimateId: string;
  vehicle: {
    year: number;
    make: string;
    model: string;
    engine: string | null;
    vin: string | null;
  };
  initialParts: ReviewPart[];
  required?: boolean;
}) {
  const [parts, setParts] = useState(initialParts);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const makeOptions = useMemo(
    () => Array.from(new Set([...MAKES.filter((make) => make !== "Other"), vehicle.make])),
    [vehicle.make]
  );

  const form = (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await reviewEstimateDetails(estimateId, {
            year: Number(data.get("year")),
            make: String(data.get("make") ?? ""),
            model: String(data.get("model") ?? ""),
            engine: String(data.get("engine") ?? ""),
            vin: String(data.get("vin") ?? ""),
            parts,
          });
          if (result.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`year-${estimateId}`}>Year</Label>
          <Input id={`year-${estimateId}`} name="year" type="number" min={1990} max={new Date().getFullYear() + 1} defaultValue={vehicle.year} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor={`make-${estimateId}`}>Make</Label>
          <Input id={`make-${estimateId}`} name="make" list={`makes-${estimateId}`} defaultValue={vehicle.make} required className="mt-1.5" />
          <datalist id={`makes-${estimateId}`}>
            {makeOptions.map((make) => <option key={make} value={make} />)}
          </datalist>
        </div>
        <div>
          <Label htmlFor={`model-${estimateId}`}>Model</Label>
          <Input id={`model-${estimateId}`} name="model" defaultValue={vehicle.model} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor={`engine-${estimateId}`}>Engine <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id={`engine-${estimateId}`} name="engine" defaultValue={vehicle.engine ?? ""} placeholder="e.g. 2.5L, B58" className="mt-1.5" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`vin-${estimateId}`}>VIN <span className="font-normal text-muted-foreground">(recommended)</span></Label>
          <Input id={`vin-${estimateId}`} name="vin" defaultValue={vehicle.vin ?? ""} maxLength={17} placeholder="17-character VIN" className="mt-1.5 font-mono uppercase" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold">Parts from the estimate</h3>
            <p className="text-xs text-muted-foreground">Correct anything that was read incorrectly before matching.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setParts((rows) => [...rows, { id: `new-${Date.now()}`, description: "", quantity: 1, mechanicPrice: 0, oemPartNumber: "" }])}
          >
            <Plus className="size-4" /> Add part
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {parts.map((part, index) => (
            <div key={part.id} className="rounded-xl border bg-background p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`part-${part.id}`}>Part {index + 1}</Label>
                  <Input
                    id={`part-${part.id}`}
                    value={part.description}
                    required
                    placeholder="e.g. Front brake pads"
                    className="mt-1.5"
                    onChange={(event) => setParts((rows) => rows.map((row) => row.id === part.id ? { ...row, description: event.target.value } : row))}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove part ${index + 1}`} disabled={parts.length === 1} onClick={() => setParts((rows) => rows.filter((row) => row.id !== part.id))}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor={`qty-${part.id}`}>Quantity</Label>
                  <Input id={`qty-${part.id}`} type="number" min={1} max={99} value={part.quantity} className="mt-1.5" onChange={(event) => setParts((rows) => rows.map((row) => row.id === part.id ? { ...row, quantity: Number(event.target.value) } : row))} />
                </div>
                <div>
                  <Label htmlFor={`price-${part.id}`}>Shop parts price</Label>
                  <Input id={`price-${part.id}`} type="number" min={0} step="0.01" value={part.mechanicPrice} className="mt-1.5" onChange={(event) => setParts((rows) => rows.map((row) => row.id === part.id ? { ...row, mechanicPrice: Number(event.target.value) } : row))} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor={`oem-${part.id}`}>OEM number <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id={`oem-${part.id}`} value={part.oemPartNumber} className="mt-1.5" onChange={(event) => setParts((rows) => rows.map((row) => row.id === part.id ? { ...row, oemPartNumber: event.target.value } : row))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        {pending ? "Checking exact matches…" : required ? "Everything looks right — find my parts" : "Save changes and rematch"}
      </Button>
    </form>
  );

  if (required) return form;
  return (
    <details className="mt-6 rounded-xl border bg-card px-4 py-3">
      <summary className="cursor-pointer text-sm font-bold">Something wrong? Edit vehicle or parts</summary>
      <div className="mt-5">{form}</div>
    </details>
  );
}
