"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";
import { round2 } from "@/lib/utils";
import type { StockStatus } from "@prisma/client";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Admin access required");
  return admin;
}

export async function updateCatalogPart(
  partId: string,
  data: {
    price?: number;
    stockStatus?: StockStatus;
    amazonAsin?: string | null;
    ebayItemId?: string | null;
  }
): Promise<void> {
  await requireAdmin();
  if (data.price !== undefined && !(data.price > 0)) {
    throw new Error("Price must be greater than 0");
  }
  const amazonAsin = data.amazonAsin?.trim().toUpperCase() || null;
  if (amazonAsin && !/^[A-Z0-9]{10}$/.test(amazonAsin)) {
    throw new Error("Amazon ASIN must be exactly 10 letters or numbers");
  }
  const ebayItemId = data.ebayItemId?.trim() || null;
  if (ebayItemId && !/^\d{9,15}$/.test(ebayItemId)) {
    throw new Error("eBay item ID must contain 9 to 15 digits");
  }
  await db.catalogPart.update({
    where: { id: partId },
    data: {
      ...(data.price !== undefined ? { price: round2(data.price) } : {}),
      ...(data.stockStatus ? { stockStatus: data.stockStatus } : {}),
      ...(data.amazonAsin !== undefined ? { amazonAsin } : {}),
      ...(data.ebayItemId !== undefined ? { ebayItemId } : {}),
      ...((data.amazonAsin !== undefined || data.ebayItemId !== undefined) &&
      (amazonAsin || ebayItemId)
        ? { retailerCheckedAt: new Date() }
        : {}),
    },
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/results/[id]", "page");
}

export async function overrideComparisonMatch(
  comparisonId: string,
  newCatalogPartId: string
): Promise<void> {
  await requireAdmin();
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
    include: { estimateItem: true },
  });
  const part = await db.catalogPart.findUniqueOrThrow({ where: { id: newCatalogPartId } });
  const quantity = comparison.estimateItem?.quantity ?? 1;
  const ourPrice = round2(part.price * quantity);
  await db.comparison.update({
    where: { id: comparisonId },
    data: {
      catalogPartId: part.id,
      ourPrice,
      savings: round2(comparison.mechanicPrice - ourPrice),
      matchMethod: "MANUAL",
      matchScore: 1,
    },
  });
  revalidatePath(`/admin/estimates/${comparison.estimateId}`);
  revalidatePath(`/results/${comparison.estimateId}`);
}
