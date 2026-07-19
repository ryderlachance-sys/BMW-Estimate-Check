"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { confirmEstimateVehicle } from "@/app/actions/estimate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const MODELS = [
  "228i", "230i", "320i", "328i", "330i", "335i", "340i", "M340i",
  "428i", "430i", "435i", "440i", "530i", "535i", "540i", "550i",
  "630i", "640i", "650i",
  "M2", "M3", "M4", "M5", "M8",
  "X1", "X2", "X3", "X4", "X5", "X6", "X7",
  "Z4", "i3", "i4", "i5", "i7", "iX",
];

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + 1 - i);

export function ConfirmVehicleForm({ estimateId }: { estimateId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="mx-auto mt-8 max-w-sm space-y-4 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const year = Number(fd.get("year"));
        const model = String(fd.get("model") ?? "");
        const engine = String(fd.get("engine") ?? "") || undefined;
        setError(null);
        startTransition(async () => {
          const res = await confirmEstimateVehicle(estimateId, { year, model, engine });
          if (res.error) {
            setError(res.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t read the year/model from that estimate. Enter your BMW so we can match
        parts.
      </p>
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
        <Label htmlFor="model">Model</Label>
        <Select id="model" name="model" required defaultValue="" className="mt-1.5">
          <option value="" disabled>
            Select model
          </option>
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="engine">Engine (optional)</Label>
        <Input
          id="engine"
          name="engine"
          placeholder="e.g. B58, S63"
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
