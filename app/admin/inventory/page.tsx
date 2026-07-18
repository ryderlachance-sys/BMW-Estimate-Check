import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PartEditor } from "@/components/admin-controls";

export default async function AdminInventoryPage() {
  const parts = await db.catalogPart.findMany({
    orderBy: [{ category: "asc" }, { brand: "asc" }, { name: "asc" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
        <CardDescription>
          {parts.length} catalog parts — edit pricing and stock status inline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Part</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Fitment</TableHead>
              <TableHead>Price / Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.map((part) => (
              <TableRow key={part.id}>
                <TableCell className="font-mono text-xs">{part.sku}</TableCell>
                <TableCell>
                  <p className="font-medium">
                    {part.brand} {part.name}
                  </p>
                  {part.oemNumbers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      OEM {part.oemNumbers.join(", ")}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{part.category}</TableCell>
                <TableCell className="max-w-48 text-xs text-muted-foreground">
                  {part.compatibleModels.join(", ")}
                </TableCell>
                <TableCell>
                  <PartEditor
                    partId={part.id}
                    price={part.price}
                    stockStatus={part.stockStatus}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
