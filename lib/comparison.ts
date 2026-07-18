import "server-only";
import { db } from "@/lib/db";
import { round2 } from "@/lib/utils";
import type { CatalogPart, EstimateItem, Vehicle } from "@prisma/client";

/**
 * Brand quality ranking used as a tie-breaker: Genuine BMW first, then
 * well-known OE suppliers, then everything else.
 */
const BRAND_RANK: Record<string, number> = {
  "genuine bmw": 3,
  lemforder: 2,
  lemförder: 2,
  sachs: 2,
  bilstein: 2,
  bosch: 2,
  mahle: 2,
  pierburg: 2,
  brembo: 2,
  zimmermann: 2,
  ngk: 2,
  elring: 2,
  "victor reinz": 2,
  continental: 2,
  corteco: 2,
  delphi: 2,
  akebono: 2,
  rein: 1,
  meyle: 1,
};

function brandRank(brand: string): number {
  return BRAND_RANK[brand.toLowerCase()] ?? 0;
}

/** Synonyms so "coil pack" matches "ignition coil", etc. */
const SYNONYMS: Record<string, string> = {
  "coil pack": "ignition coil",
  "sway bar link": "sway bar end link",
  "stabilizer link": "sway bar end link",
  "stabilizer bar": "sway bar",
  "motor mount": "engine mount",
  rotors: "rotor",
  pads: "pad",
  "disc brake": "brake",
  "valve cover gskt": "valve cover gasket",
  "vcg": "valve cover gasket",
  "t-stat": "thermostat",
  "serp belt": "serpentine belt",
  "drive belt": "serpentine belt",
  "wtr pump": "water pump",
  "ctrl arm": "control arm",
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "with", "new", "replace",
  "replacement", "install", "installation", "left", "right", "front", "rear",
  "lh", "rh", "l", "r", "bmw", "oem", "kit", "set", "assembly", "assy", "each",
  "pair", "qty",
]);

export function normalizeDescription(input: string): string[] {
  let text = input.toLowerCase();
  for (const [from, to] of Object.entries(SYNONYMS)) {
    text = text.replaceAll(from, to);
  }
  return (
    text
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      // Drop stop words, pure numbers, and 2-char alphanumeric fragments —
      // OCR noise like "319", "e5", "s2" would otherwise dilute match scores.
      .filter(
        (t) =>
          t.length > 1 &&
          !STOP_WORDS.has(t) &&
          !/^\d+$/.test(t) &&
          !(t.length === 2 && /\d/.test(t))
      )
  );
}

/**
 * Token-overlap similarity between an estimate line and a catalog part.
 * The part *name* is weighted heavier than its long description, so
 * "water pump" prefers the pump itself over a thermostat whose description
 * merely mentions the pump.
 */
export function similarityScore(itemDescription: string, part: CatalogPart): number {
  const itemTokens = new Set(normalizeDescription(itemDescription));
  if (itemTokens.size === 0) return 0;

  const nameTokens = new Set(normalizeDescription(`${part.name} ${part.category}`));
  const allTokens = new Set(
    normalizeDescription(`${part.name} ${part.category} ${part.description}`)
  );

  let nameOverlap = 0;
  let allOverlap = 0;
  for (const t of itemTokens) {
    if (nameTokens.has(t)) nameOverlap++;
    if (allTokens.has(t)) allOverlap++;
  }

  // Overlap is measured against the estimate line's tokens (shorter, specific).
  return 0.6 * (allOverlap / itemTokens.size) + 0.4 * (nameOverlap / itemTokens.size);
}

export function normalizeOemNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length >= 7 ? digits : null;
}

function isCompatible(part: CatalogPart, vehicle: Vehicle): boolean {
  const modelOk =
    part.compatibleModels.length === 0 ||
    part.compatibleModels.some(
      (m) =>
        vehicle.model.toLowerCase().includes(m.toLowerCase()) ||
        m.toLowerCase().includes(vehicle.model.toLowerCase())
    );
  const yearOk =
    part.compatibleYears.length === 0 || part.compatibleYears.includes(vehicle.year);
  return modelOk && yearOk;
}

const MIN_SEMANTIC_SCORE = 0.34;

export interface MatchResult {
  item: EstimateItem;
  part: CatalogPart;
  method: "OEM_NUMBER" | "SEMANTIC";
  score: number;
}

/**
 * Matching algorithm:
 * 1. Exact OEM part-number match against the catalog.
 * 2. Otherwise, semantic (token-overlap) similarity on descriptions.
 * 3. Only parts compatible with the vehicle's model/year are considered.
 * 4. Ties broken by brand quality rank, then lower price.
 */
export async function matchEstimateItems(
  items: EstimateItem[],
  vehicle: Vehicle
): Promise<MatchResult[]> {
  const catalog = await db.catalogPart.findMany({
    where: { stockStatus: { not: "OUT_OF_STOCK" } },
  });
  const compatible = catalog.filter((p) => isCompatible(p, vehicle));

  const results: MatchResult[] = [];

  for (const item of items) {
    const oem = normalizeOemNumber(item.oemPartNumber);

    // 1) OEM number match — search the full catalog (number is authoritative).
    if (oem) {
      const oemMatches = catalog.filter((p) =>
        p.oemNumbers.some((n) => normalizeOemNumber(n) === oem)
      );
      if (oemMatches.length > 0) {
        const best = oemMatches.sort(
          (a, b) => brandRank(b.brand) - brandRank(a.brand) || a.price - b.price
        )[0];
        results.push({ item, part: best, method: "OEM_NUMBER", score: 1 });
        continue;
      }
    }

    // 2) Semantic match within compatible parts.
    let best: { part: CatalogPart; score: number } | null = null;
    for (const part of compatible) {
      const score = similarityScore(item.description, part);
      if (score < MIN_SEMANTIC_SCORE) continue;
      if (
        !best ||
        score > best.score + 0.001 ||
        (Math.abs(score - best.score) <= 0.001 &&
          (brandRank(part.brand) > brandRank(best.part.brand) ||
            (brandRank(part.brand) === brandRank(best.part.brand) &&
              part.price < best.part.price)))
      ) {
        best = { part, score };
      }
    }
    if (best) {
      results.push({ item, part: best.part, method: "SEMANTIC", score: round2(best.score) });
    }
  }

  return results;
}

/** Runs matching for an estimate and persists Comparison rows (replacing old ones). */
export async function buildComparisons(estimateId: string): Promise<void> {
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { items: true, vehicle: true },
  });

  const matches = await matchEstimateItems(estimate.items, estimate.vehicle);

  await db.$transaction([
    db.comparison.deleteMany({ where: { estimateId } }),
    db.comparison.createMany({
      data: matches.map((m) => {
        const ourPrice = round2(m.part.price * m.item.quantity);
        return {
          estimateId,
          estimateItemId: m.item.id,
          catalogPartId: m.part.id,
          mechanicPrice: m.item.mechanicPrice,
          ourPrice,
          savings: round2(m.item.mechanicPrice - ourPrice),
          matchMethod: m.method,
          matchScore: m.score,
        };
      }),
    }),
  ]);
}

/**
 * Heuristic fair-labor range. Shops bill $120–$220/hr for BMW work; we show a
 * range assuming the quoted labor reflects a mid-to-high book rate.
 */
export function estimateLaborRange(laborTotal: number | null): {
  low: number;
  high: number;
} | null {
  if (laborTotal == null || laborTotal <= 0) return null;
  return { low: round2(laborTotal * 0.7), high: round2(laborTotal * 0.95) };
}
