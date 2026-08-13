"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { confirmEstimateVehicle } from "@/app/actions/estimate";
import { MAKES, MODELS_BY_MAKE } from "@/lib/vehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + 1 - i);

export function ConfirmVehicleForm({ estimateId }: { estimateId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [make, setMake] = useState("");
  const router = useRouter();

  const models = useMemo(() => MODELS_BY_MAKE[make] ?? [], [make]);

  return (
    <form
      className="mx-auto mt-8 max-w-sm space-y-4 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const year = Number(fd.get("year"));
        const makeVal = String(fd.get("make") ?? "");
        const modelRaw = String(fd.get("model") ?? "");
        const modelOther = String(fd.get("modelOther") ?? "");
        const model = makeVal === "Other" || models.length === 0 ? modelOther : modelRaw;
        const engine = String(fd.get("engine") ?? "") || undefined;
        const vin = String(fd.get("vin") ?? "") || undefined;
        setError(null);
        startTransition(async () => {
          const res = await confirmEstimateVehicle(estimateId, {
            year,
            make: makeVal,
            model,
            engine,
            vin,
          });
          if (res.error) {
            setError(res.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t read the year/make/model from that estimate. Enter your car — a VIN
        is best for exact fitment.
      </p>
      <div>
        <Label htmlFor="vin">VIN (recommended)</Label>
        <Input
          id="vin"
          name="vin"
          placeholder="17-character VIN from the estimate"
          className="mt-1.5 font-mono uppercase"
          autoComplete="off"
          maxLength={17}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          We decode it with NHTSA (free) for exact year, make, model, and engine.
        </p>
      </div>
      <div>
        <Label htmlFor="year">Year</Label>
        <Select id="year" name="year" required defaultValue="" className="mt-1.5">
          <option value="" disabled>
            Select year
          </option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="make">Make</Label>
        <Select
          id="make"
          name="make"
          required
          value={make}
          className="mt-1.5"
          onChange={(e) => setMake(e.target.value)}
        >
          <option value="" disabled>
            Select make
          </option>
          {MAKES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="model">Model</Label>
        {models.length > 0 && make !== "Other" ? (
          <Select id="model" name="model" required defaultValue="" className="mt-1.5">
            <option value="" disabled>
              Select model
            </option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            id="modelOther"
            name="modelOther"
            required
            placeholder="e.g. Camry, Civic, F-150"
            className="mt-1.5"
            autoComplete="off"
          />
        )}
      </div>
      <div>
        <Label htmlFor="engine">Engine (optional)</Label>
        <Input
          id="engine"
          name="engine"
          placeholder="e.g. 2.5L, B58, EcoBoost"
          className="mt-1.5"
          autoComplete="off"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Continue
      </Button>
    </form>
  );
}
