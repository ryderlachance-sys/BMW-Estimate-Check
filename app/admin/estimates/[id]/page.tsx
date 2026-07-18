import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MatchOverrideSelect } from "@/components/admin-controls";

export default async function AdminEstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [estimate, catalogParts] = await Promise.all([
    db.estimate.findUnique({
      where: { id },
      include: {
        user: true,
        vehicle: true,
        items: true,
        comparisons: { include: { catalogPart: true, estimateItem: true } },
      },
    }),
    db.catalogPart.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);
  if (!estimate) notFound();

  const partOptions = catalogParts.map((p) => ({
    id: p.id,
    label: `${p.brand} ${p.name} — ${formatCurrency(p.price)}`,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Estimate — {estimate.vehicle.year} BMW {estimate.vehicle.model}
          </CardTitle>
          <CardDescription>
            {estimate.user.email} · {formatDate(estimate.createdAt)} ·{" "}
            {estimate.mechanicShopName ?? "Unknown shop"} · Quote:{" "}
            {estimate.mechanicTotal != null ? formatCurrency(estimate.mechanicTotal) : "—"} ·
            Labor: {estimate.laborTotal != null ? formatCurrency(estimate.laborTotal) : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary">{estimate.status}</Badge>
          <a
            href={estimate.originalFileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            View original file <ExternalLink className="size-3.5" />
          </a>
          <Link href={`/results/${estimate.id}`} className="flex items-center gap-1 text-primary hover:underline">
            View customer results page <ExternalLink className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI matches</CardTitle>
          <CardDescription>
            Override any match — savings recalculate automatically and update the
            customer&apos;s results page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate line</TableHead>
                <TableHead>Match method</TableHead>
                <TableHead>Matched part</TableHead>
                <TableHead className="text-right">Shop</TableHead>
                <TableHead className="text-right">Ours</TableHead>
                <TableHead className="text-right">Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.comparisons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No matches for this estimate.
                  </TableCell>
                </TableRow>
              )}
              {estimate.comparisons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.estimateItem?.description ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {c.estimateItem?.quantity ?? 1}
                      {c.estimateItem?.oemPartNumber && ` · OEM ${c.estimateItem.oemPartNumber}`}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={c.matchMethod === "OEM_NUMBER" ? "success" : "secondary"}
                      className="text-[10px]"
                    >
                      {c.matchMethod}
                      {c.matchMethod === "SEMANTIC" && ` (${Math.round(c.matchScore * 100)}%)`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <MatchOverrideSelect
                      comparisonId={c.id}
                      currentPartId={c.catalogPartId}
                      parts={partOptions}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(c.mechanicPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(c.ourPrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-success">
                    {formatCurrency(c.savings)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {estimate.extractedText && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted text</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-4 text-xs">
              {estimate.extractedText}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
