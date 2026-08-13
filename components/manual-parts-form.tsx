"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { createManualPartsSearch } from "@/app/actions/estimate";
import { MAKES, MODELS_BY_MAKE } from "@/lib/vehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const YEARS = Array.from({ length: new Date().getFullYear() - 1989 }, (_, index) => new Date().getFullYear() - index);

export function ManualPartsForm() {
  const [make, setMake] = useState("Toyota");
  const models = useMemo(() => MODELS_BY_MAKE[make] ?? [], [make]);

  return (
    <form action={createManualPartsSearch} className="mt-5 grid gap-4 text-left sm:grid-cols-2">
      <div>
        <Label htmlFor="manual-year">Year</Label>
        <Select id="manual-year" name="year" required defaultValue="" className="mt-1.5">
          <option value="" disabled>Select year</option>
          {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="manual-make">Make</Label>
        <Select id="manual-make" name="make" value={make} onChange={(event) => setMake(event.target.value)} className="mt-1.5">
          {MAKES.filter((item) => item !== "Other").map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="manual-model">Model</Label>
        {models.length > 0 ? (
          <Select id="manual-model" name="model" required defaultValue="" className="mt-1.5">
            <option value="" disabled>Select model</option>
            {models.map((model) => <option key={model} value={model}>{model}</option>)}
          </Select>
        ) : <Input id="manual-model" name="model" required className="mt-1.5" placeholder="Vehicle model" />}
      </div>
      <div>
        <Label htmlFor="manual-engine">Engine or trim (optional)</Label>
        <Input id="manual-engine" name="engine" className="mt-1.5" placeholder="2.5L, EcoBoost, Sport…" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="manual-vin">VIN (optional, best for fitment)</Label>
        <Input id="manual-vin" name="vin" maxLength={17} className="mt-1.5 font-mono uppercase" placeholder="17-character VIN" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="manual-parts">What parts do you need?</Label>
        <Textarea id="manual-parts" name="parts" required rows={5} className="mt-1.5" placeholder={"Front brake pads\nFront brake rotors\nAlternator | optional OEM number"} />
        <p className="mt-1 text-xs text-muted-foreground">Enter one part per line. Add an OEM number after | when you know it.</p>
      </div>
      <Button type="submit" size="lg" className="sm:col-span-2">
        <Search className="size-5" /> Find cheaper parts
      </Button>
    </form>
  );
}
