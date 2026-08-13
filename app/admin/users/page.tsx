import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    include: {
      estimates: { select: { id: true } },
      vehicles: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>{users.length} visitors with saved sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Joined</TableHead><TableHead>Vehicles</TableHead><TableHead>Estimates</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <p className="flex items-center gap-2 font-medium">{user.name ?? "Guest"}{user.isAdmin && <Badge className="text-[10px]">ADMIN</Badge>}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                <TableCell>{user.vehicles.length}</TableCell>
                <TableCell>{user.estimates.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
