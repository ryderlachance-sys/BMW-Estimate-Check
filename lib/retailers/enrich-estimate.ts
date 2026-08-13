import "server-only";
import { db } from "@/lib/db";
import { findVerifiedRetailerListing } from "@/lib/retailers/find-listing";

/** Re-check every estimate line against currently configured retailer APIs. */
export async function enrichEstimateRetailerListings(estimateId: string): Promise<void> {
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { vehicle: true, items: true },
  });

  const matches = await Promise.all(
    estimate.items.map(async (item) => ({
      item,
      listing: await findVerifiedRetailerListing({
        year: estimate.vehicle.year,
        make: estimate.vehicle.make,
        model: estimate.vehicle.model,
        trim: estimate.vehicle.trim,
        engine: estimate.vehicle.engine,
        description: item.description,
        oemPartNumber: item.oemPartNumber,
      }),
    }))
  );

  await db.$transaction(
    matches.map(({ item, listing }) =>
      db.estimateItem.update({
        where: { id: item.id },
        data: {
          amazonAsin: listing?.amazonAsin ?? null,
          ebayItemId: listing?.ebayItemId ?? null,
          retailerName: listing?.retailerName ?? null,
          retailerPrice: listing?.retailerPrice ?? null,
          productTitle: listing?.productTitle ?? null,
          retailerUrl: listing?.retailerUrl ?? null,
          retailerCheckedAt: listing ? new Date() : null,
          fitmentNote: listing?.fitmentNote ?? null,
        },
      })
    )
  );
}
