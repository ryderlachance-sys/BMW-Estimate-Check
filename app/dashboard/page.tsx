import type { Metadata } from "next";
import Link from "next/link";
import { Car, FileText, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Estimates", robots: { index: false } };

const estimateBadge: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  UPLOADED: "secondary",
  PROCESSING: "warning",
  PARSED: "success",
  FAILED: "destructive",
};

export default async function DashboardPage() {
  const user = await ensureUser();
  const [vehicles, estimates] = await Promise.all([
    db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.estimate.findMany({
      where: { userId: user.id },
      include: { vehicle: true, comparisons: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My estimates</h1>
          <p className="mt-2 text-muted-foreground">Saved vehicles and previous parts comparisons.</p>
        </div>
        <Link href="/upload"><Button><Upload className="size-4" /> Check another repair</Button></Link>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="size-5 text-primary" /> Saved vehicles</CardTitle>
            <CardDescription>{vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicles.length === 0 && <p className="text-sm text-muted-foreground">No vehicles yet.</p>}
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-lg border px-4 py-3">
                <p className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {vehicle.engine || "Engine not specified"}{vehicle.vin ? ` · VIN …${vehicle.vin.slice(-6)}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> Estimate history</CardTitle>
            <CardDescription>Reopen a result or correct its vehicle and part details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {estimates.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No estimates uploaded yet.</p>}
            {estimates.map((estimate) => {
              const savings = estimate.comparisons.reduce((sum, comparison) => sum + Math.max(0, comparison.savings), 0);
              return (
                <Link key={estimate.id} href={`/results/${estimate.id}`} className="block rounded-xl border p-4 transition-colors hover:bg-secondary/50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{estimate.vehicle.year} {estimate.vehicle.make} {estimate.vehicle.model}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{estimate.items.length} part line{estimate.items.length === 1 ? "" : "s"} · {formatDate(estimate.createdAt)}</p>
                    </div>
                    <Badge variant={estimateBadge[estimate.status]}>{estimate.status}</Badge>
                  </div>
                  {savings > 0 && <p className="mt-3 text-sm font-bold text-success">Potential parts savings {formatCurrency(savings)}</p>}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
