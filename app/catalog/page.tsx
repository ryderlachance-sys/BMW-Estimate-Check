import type { Metadata } from "next";
import { Cog } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddToCartButton, CatalogFilters } from "@/components/catalog-controls";
import { CatalogPartImage } from "@/components/catalog-part-image";
import { AffiliateBuyButtons } from "@/components/affiliate-links";
import { bestBuyForPart, buildAffiliateLinks } from "@/lib/affiliates";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BMW Parts Catalog",
  description:
    "Shop genuine BMW and OE-supplier parts: control arms, water pumps, brakes, suspension, ignition and more. Verified fitment by model and year.",
  alternates: { canonical: "/catalog" },
};

const stockBadge: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  IN_STOCK: { label: "In stock", variant: "success" },
  LOW_STOCK: { label: "Low stock", variant: "warning" },
  OUT_OF_STOCK: { label: "Out of stock", variant: "destructive" },
  SPECIAL_ORDER: { label: "Special order", variant: "secondary" },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; model?: string; year?: string; brand?: string; category?: string }>;
}) {
  const { q, model, year, brand, category } = await searchParams;

  const where: Prisma.CatalogPartWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { oemNumbers: { has: q.replace(/[^0-9]/g, "") || q } },
            ],
          }
        : {},
      model ? { compatibleModels: { has: model } } : {},
      year && !Number.isNaN(Number(year)) ? { compatibleYears: { has: Number(year) } } : {},
      brand ? { brand } : {},
      category ? { category } : {},
    ],
  };

  const [parts, allParts] = await Promise.all([
    db.catalogPart.findMany({ where, orderBy: [{ category: "asc" }, { price: "desc" }] }),
    db.catalogPart.findMany({
      select: { brand: true, category: true, compatibleModels: true, compatibleYears: true },
    }),
  ]);

  const models = [...new Set(allParts.flatMap((p) => p.compatibleModels))].sort();
  const brands = [...new Set(allParts.map((p) => p.brand))].sort();
  const categories = [...new Set(allParts.map((p) => p.category))].sort();
  const years = [...new Set(allParts.flatMap((p) => p.compatibleYears))].sort((a, b) => b - a);

  const productsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: parts.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: `${p.brand} ${p.name}`,
        sku: p.sku,
        brand: { "@type": "Brand", name: p.brand },
        description: p.description,
        offers: {
          "@type": "Offer",
          price: p.price.toFixed(2),
          priceCurrency: "USD",
          availability:
            p.stockStatus === "OUT_OF_STOCK"
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productsJsonLd) }}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">BMW Parts Catalog</h1>
          <p className="mt-2 text-muted-foreground">
            Genuine BMW and OE-supplier parts with verified fitment.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {parts.length} part{parts.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-8">
        <CatalogFilters models={models} brands={brands} categories={categories} years={years} />
      </div>

      {parts.length === 0 ? (
        <div className="mt-20 text-center text-muted-foreground">
          <Cog className="mx-auto size-12 opacity-40" />
          <p className="mt-4 font-medium">No parts match those filters.</p>
          <p className="text-sm">Try clearing a filter or searching by OEM part number.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {parts.map((part) => {
            const stock = stockBadge[part.stockStatus];
            return (
              <Card key={part.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
                <CatalogPartImage
                  name={part.name}
                  category={part.category}
                  imageUrl={part.imageUrl}
                />
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {part.brand}
                    </p>
                    <Badge variant={stock.variant} className="shrink-0 text-[10px]">
                      {stock.label}
                    </Badge>
                  </div>
                  <h2 className="mt-1 font-semibold leading-snug">{part.name}</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {part.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Fits: {part.compatibleModels.join(", ")}
                    {part.compatibleYears.length > 0 &&
                      ` (${Math.min(...part.compatibleYears)}–${Math.max(...part.compatibleYears)})`}
                  </p>
                  <div className="mt-auto pt-4">
                    <p className="text-xl font-extrabold tabular-nums">
                      {formatCurrency(part.price)}
                    </p>
                    <div className="mt-3 space-y-2">
                      {(() => {
                        const q = {
                          brand: part.brand,
                          name: part.name,
                          oemNumbers: part.oemNumbers,
                        };
                        const best = bestBuyForPart(q);
                        return (
                          <AffiliateBuyButtons
                            links={buildAffiliateLinks(q)}
                            compact
                            primaryId={best.id}
                          />
                        );
                      })()}
                      <AddToCartButton
                        partId={part.id}
                        disabled={part.stockStatus === "OUT_OF_STOCK"}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
