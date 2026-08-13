import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cog } from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CatalogFilters } from "@/components/catalog-controls";
import { CatalogPartImage } from "@/components/catalog-part-image";
import { AffiliateBuyButtons } from "@/components/affiliate-links";
import { buildAffiliateLinks } from "@/lib/affiliates";
import { MAKES, MODELS_BY_MAKE } from "@/lib/vehicles";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parts Catalog",
  description:
    "Browse automotive parts with listed vehicle compatibility and verified retailer links when available.",
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
  searchParams: Promise<{ q?: string; make?: string; model?: string; year?: string; brand?: string; category?: string }>;
}) {
  const { q, make, model, year, brand, category } = await searchParams;

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
      make ? { compatibleMakes: { has: make } } : {},
      model ? { compatibleModels: { has: model } } : {},
      year && !Number.isNaN(Number(year)) ? { compatibleYears: { has: Number(year) } } : {},
      brand ? { brand } : {},
      category ? { category } : {},
    ],
  };

  const [parts, allParts] = await Promise.all([
    db.catalogPart.findMany({ where, orderBy: [{ category: "asc" }, { price: "desc" }] }),
    db.catalogPart.findMany({
      select: { brand: true, category: true, compatibleMakes: true, compatibleModels: true, compatibleYears: true },
    }),
  ]);

  const makes = MAKES.filter((item) => item !== "Other");
  const makeParts = allParts.filter((p) => !make || p.compatibleMakes.includes(make));
  const catalogModels = [...new Set(makeParts.flatMap((p) => p.compatibleModels))];
  const models = [
    ...new Set(make ? [...(MODELS_BY_MAKE[make] ?? []), ...catalogModels] : catalogModels),
  ].sort();
  const brands = [...new Set(makeParts.map((p) => p.brand))].sort();
  const categories = [...new Set(makeParts.map((p) => p.category))].sort();
  const catalogYears = [...new Set(makeParts.flatMap((p) => p.compatibleYears))];
  const years = (catalogYears.length > 0
    ? catalogYears
    : Array.from({ length: new Date().getFullYear() - 1989 }, (_, index) => 1990 + index)
  ).sort((a, b) => b - a);

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
        ...(p.amazonAsin || p.ebayItemId
          ? {
              offers: {
                "@type": "Offer",
                price: p.price.toFixed(2),
                priceCurrency: "USD",
                availability:
                  p.stockStatus === "OUT_OF_STOCK"
                    ? "https://schema.org/OutOfStock"
                    : "https://schema.org/InStock",
              },
            }
          : {}),
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
          <h1 className="text-3xl font-extrabold tracking-tight">Car Parts Catalog</h1>
          <p className="mt-2 text-muted-foreground">
            Reference catalog with exact retailer links only where the listing has been verified.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {parts.length} part{parts.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-8">
        <CatalogFilters makes={makes} models={models} brands={brands} categories={categories} years={years} />
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">Don&apos;t see your exact car or repair?</p>
          <p className="text-sm text-muted-foreground">
            This is a growing reference catalog. Upload the estimate to identify the parts for any make.
          </p>
        </div>
        <Link href="/upload" className="shrink-0">
          <Button className="w-full gap-1.5 sm:w-auto">
            Check my estimate <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>

      {parts.length === 0 ? (
        <div className="mt-20 text-center text-muted-foreground">
          <Cog className="mx-auto size-12 opacity-40" />
          <p className="mt-4 font-medium">
            {make ? `No verified ${make} catalog listings yet.` : "No parts match those filters."}
          </p>
          <p className="text-sm">
            Upload the estimate and we&apos;ll identify the exact repair parts instead of guessing.
          </p>
          <Link href="/upload" className="mt-5 inline-block">
            <Button>Upload my estimate</Button>
          </Link>
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
                    Fits: {part.compatibleMakes.join(", ")} {part.compatibleModels.join(", ")}
                    {part.compatibleYears.length > 0 &&
                      ` (${Math.min(...part.compatibleYears)}–${Math.max(...part.compatibleYears)})`}
                  </p>
                  <div className="mt-auto pt-4">
                    <p className="text-xl font-extrabold tabular-nums">
                      <span className="mr-1 text-xs font-semibold text-muted-foreground">
                        {part.amazonAsin || part.ebayItemId ? "Verified" : "Catalog estimate"}
                      </span>
                      {formatCurrency(part.price)}
                    </p>
                    {part.retailerCheckedAt && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Price checked {part.retailerCheckedAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      {(() => {
                        const q = {
                          brand: part.brand,
                          name: part.name,
                          oemNumbers: part.oemNumbers,
                        };
                        const directLinks = buildAffiliateLinks({
                          ...q,
                          amazonAsin: part.amazonAsin,
                          ebayItemId: part.ebayItemId,
                        }).filter((link) => link.isProductPage);
                        return directLinks.length > 0 ? (
                          <AffiliateBuyButtons
                            links={directLinks}
                            compact
                            primaryId={directLinks[0].id}
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Exact retailer listing not verified yet
                          </p>
                        );
                      })()}
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
