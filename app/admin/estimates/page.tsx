import Link from "next/link";
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

const statusVariant: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  UPLOADED: "secondary",
  PROCESSING: "warning",
  PARSED: "success",
  FAILED: "destructive",
};

export default async function AdminEstimatesPage() {
  const estimates = await db.estimate.findMany({
    include: { user: true, vehicle: true, items: true, comparisons: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimates</CardTitle>
        <CardDescription>
          {estimates.length} uploaded — click one to review and override AI matches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Uploaded</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead className="text-right">Quote</TableHead>
              <TableHead>Parts / Matches</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No estimates yet.
                </TableCell>
              </TableRow>
            )}
            {estimates.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/admin/estimates/${e.id}`} className="font-semibold text-primary hover:underline">
                    {formatDate(e.createdAt)}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{e.user.email}</TableCell>
                <TableCell className="text-sm">
                  {e.vehicle.year} {e.vehicle.model}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {e.mechanicShopName ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.mechanicTotal != null ? formatCurrency(e.mechanicTotal) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {e.items.length} / {e.comparisons.length}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
