"use client";

import { useMemo } from "react";
import { scanEstimateKeywords } from "@/lib/ai/keyword-scanner";
import { formatCurrency } from "@/lib/utils";

/** Live local keyword scan table — updates as OCR / pasted text arrives. */
export function KeywordScanTable({ text }: { text: string }) {
  const scan = useMemo(() => {
    if (!text || text.trim().length < 8) return null;
    return scanEstimateKeywords(text);
  }, [text]);

  if (!scan) return null;

  const { vehicle, parts } = scan;
  const hasVehicle = vehicle.year || vehicle.make || vehicle.model;

  return (
    <div className="rounded-xl border bg-card p-4 text-left shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">
        Local scan (no APIs)
      </p>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-secondary/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Year</p>
          <p className="font-semibold tabular-nums">{vehicle.year ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-secondary/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Make</p>
          <p className="font-semibold">{vehicle.make ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-secondary/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Model</p>
          <p className="font-semibold">{vehicle.model ?? "—"}</p>
        </div>
      </div>
      {!hasVehicle && (
        <p className="mt-2 text-xs text-muted-foreground">
          No year/make/model keywords found yet — we&apos;ll still try the full parser.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Part keyword</th>
              <th className="pb-2 pr-3 font-medium">Line</th>
              <th className="pb-2 text-right font-medium">Shop $</th>
            </tr>
          </thead>
          <tbody>
            {parts.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3 text-muted-foreground">
                  No part keywords + prices on the same line yet.
                </td>
              </tr>
            ) : (
              parts.map((p, i) => (
                <tr key={`${p.keyword}-${p.mechanicPrice}-${i}`} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-semibold capitalize">{p.keyword}</td>
                  <td className="max-w-[14rem] truncate py-2 pr-3 text-muted-foreground">
                    {p.description}
                  </td>
                  <td className="py-2 text-right font-bold tabular-nums">
                    {formatCurrency(p.mechanicPrice)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
