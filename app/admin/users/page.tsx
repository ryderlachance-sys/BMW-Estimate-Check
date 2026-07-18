import { db } from "@/lib/db";
import { formatCurrency, formatDate, round2 } from "@/lib/utils";
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

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    include: {
      orders: { select: { total: true, status: true } },
      estimates: { select: { id: true } },
      vehicles: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>{users.length} registered</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Vehicles</TableHead>
              <TableHead>Estimates</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead className="text-right">Lifetime spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const spend = round2(
                user.orders
                  .filter((o) => o.status !== "PENDING" && o.status !== "CANCELLED")
                  .reduce((s, o) => s + o.total, 0)
              );
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="flex items-center gap-2 font-medium">
                      {user.name ?? "—"}
                      {user.isAdmin && <Badge className="text-[10px]">ADMIN</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>{user.vehicles.length}</TableCell>
                  <TableCell>{user.estimates.length}</TableCell>
                  <TableCell>{user.orders.length}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(spend)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
