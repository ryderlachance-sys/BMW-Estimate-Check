import "server-only";
import { findCuratedListing } from "@/lib/curated-listings";
import {
  findExactEbayListing,
  type RetailerMatchInput,
  type VerifiedRetailerListing,
} from "@/lib/retailers/ebay";

export async function findVerifiedRetailerListing(
  input: RetailerMatchInput
): Promise<VerifiedRetailerListing | null> {
  const curated = findCuratedListing(input);
  if (curated) return curated;
  return findExactEbayListing(input);
}
