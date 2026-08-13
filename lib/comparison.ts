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
  "genuine toyota": 3,
  "genuine honda": 3,
  motorcraft: 2,
  denso: 2,
  acdelco: 2,
  "aisin": 2,
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
  // Budget / economy aftermarket
  "detroit axle": 0,
  durago: 0,
  "centric": 0,
  "power stop": 1,
  wagner: 1,
  raybestos: 1,
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
  brave: "brake",
  "valve cover gskt": "valve cover gasket",
  "vcg": "valve cover gasket",
  "t-stat": "thermostat",
  "serp belt": "serpentine belt",
  "drive belt": "serpentine belt",
  "wtr pump": "water pump",
  "ctrl arm": "control arm",
  plugs: "plug",
  gaskets: "gasket",
  gskt: "gasket",
  seals: "seal",
  "w/pulley": "water pump",
  "oil filter housing": "oil filter housing",
  "coolant line": "coolant line",
  "coolant pipe": "coolant pipe",
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "with", "new", "replace",
  "replacement", "install", "installation",
  "lh", "rh", "l", "r", "bmw", "oem", "kit", "assembly", "assy", "each",
  "pair", "qty", "ea", "ee",
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
 * Name/category must share tokens — a gasket that merely *mentions* spark
 * plugs in its description must not beat an actual spark plug part.
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

  const nameScore = nameOverlap / itemTokens.size;
  const allScore = allOverlap / itemTokens.size;
  // Description-only hits are almost worthless for matching.
  if (nameOverlap === 0) return allScore * 0.15;

  let score = 0.75 * nameScore + 0.25 * allScore;

  // Don't match "oil filter housing" to a gasket, or vice versa.
  const TYPE_WORDS = [
    "gasket", "seal", "sensor", "kit", "oring", "ring", "pump", "thermostat",
    "alternator", "starter", "belt", "plug", "coil", "pad", "rotor", "strut",
    "shock", "filter", "compressor", "radiator", "caliper",
  ];
  for (const tw of TYPE_WORDS) {
    const inItem = itemTokens.has(tw);
    const inName = nameTokens.has(tw);
    if (inItem !== inName) score -= 0.4;
  }

  return Math.max(0, score);
}

export function normalizeOemNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (cleaned.length >= 7) return cleaned;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length >= 7 ? digits : null;
}

function extractEngineCodes(text: string): string[] {
  const codes = new Set<string>();
  for (const m of text.matchAll(/\b([NBS]\d{2}|S55|S58|S63|B46|B48|B58)[A-Z]?\b/gi)) {
    codes.add(m[1].toUpperCase());
  }
  return [...codes];
}

function isCompatible(part: CatalogPart, vehicle: Vehicle): boolean {
  const makeOk =
    part.compatibleMakes.length === 0 ||
    part.compatibleMakes.some(
      (m) => m.toLowerCase() === (vehicle.make || "").toLowerCase()
    );
  if (!makeOk) return false;

  const modelOk =
    part.compatibleModels.length === 0 ||
    part.compatibleModels.some(
      (m) =>
        vehicle.model.toLowerCase().includes(m.toLowerCase()) ||
        m.toLowerCase().includes(vehicle.model.toLowerCase())
    );
  const yearOk =
    part.compatibleYears.length === 0 || part.compatibleYears.includes(vehicle.year);

  // If the vehicle has an engine and the catalog part is labeled for other
  // engines only, reject — never sell N54 plugs for an S63 M5.
  if (vehicle.engine) {
    const partEngines = extractEngineCodes(`${part.name} ${part.description}`);
    if (partEngines.length > 0) {
      const vehicleEngine = vehicle.engine.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const engineOk = partEngines.some(
        (e) => vehicleEngine.startsWith(e) || e.startsWith(vehicleEngine.slice(0, 3))
      );
      if (!engineOk) return false;
    }
  }

  return modelOk && yearOk;
}

const MIN_SEMANTIC_SCORE = 0.45;

/** Labor / R&R lines that should never become catalog matches. */
export function isLaborLikeEstimateLine(
  description: string,
  oemPartNumber?: string | null
): boolean {
  if (oemPartNumber && /\d{7,}/.test(oemPartNumber)) return false;
  const d = description.toLowerCase();
  if (/\b(labor|labour|diagnos|job\s*time|hr\s*@|hours?\s*@|\d+\.?\d*\s*hr\b)\b/.test(d)) {
    return true;
  }
  if (/\b(replacement|r\s*&\s*r|r\s*\/\s*r|remove\s+(and|&)\s+replace)\b/.test(d)) {
    if (!/\b(kit|set|pair|assy|assembly|gasket|pad|rotor|filter|plug|sensor)\b/.test(d)) {
      return true;
    }
    // "Spark plug replacement" / "brake pad replacement" without OEM = labor package
    if (/\breplacement\b/.test(d)) return true;
  }
  return false;
}

export interface MatchResult {
  item: EstimateItem;
  part: CatalogPart;
  method: "OEM_NUMBER" | "SEMANTIC" | "PREMIUM" | "BUDGET";
  score: number;
  tier: "premium" | "budget";
}

function pickBestAmong(
  candidates: { part: CatalogPart; score: number; method: MatchResult["method"] }[],
  prefer: "quality" | "price"
): { part: CatalogPart; score: number; method: MatchResult["method"] } | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    if (prefer === "quality") {
      return (
        brandRank(b.part.brand) - brandRank(a.part.brand) ||
        b.score - a.score ||
        a.part.price - b.part.price
      );
    }
    return a.part.price - b.part.price || b.score - a.score;
  })[0];
}

/**
 * Matching algorithm:
 * 1. Exact OEM part-number match — only if that part fits this vehicle.
 * 2. Otherwise, semantic similarity within compatible parts.
 * 3. Returns up to two tiers per line: OEM/Premium and Budget (when different).
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
    if (isLaborLikeEstimateLine(item.description, item.oemPartNumber)) {
      continue;
    }

    const oem = normalizeOemNumber(item.oemPartNumber);
    const scored: { part: CatalogPart; score: number; method: MatchResult["method"] }[] = [];

    if (oem) {
      for (const p of catalog) {
        if (
          p.oemNumbers.some((n) => normalizeOemNumber(n) === oem) &&
          isCompatible(p, vehicle)
        ) {
          scored.push({ part: p, score: 1, method: "OEM_NUMBER" });
        }
      }
    }

    if (scored.length === 0) {
      for (const part of compatible) {
        const score = similarityScore(item.description, part);
        if (score < MIN_SEMANTIC_SCORE) continue;
        scored.push({ part, score, method: "SEMANTIC" });
      }
    }

    if (scored.length === 0) continue;

    const premiumPool = scored.filter(
      (s) => s.method === "OEM_NUMBER" || brandRank(s.part.brand) >= 2
    );
    const budgetPool = scored.filter((s) => brandRank(s.part.brand) <= 1);

    const premium =
      pickBestAmong(premiumPool.length ? premiumPool : scored, "quality") ??
      pickBestAmong(scored, "quality");
    const budget = pickBestAmong(
      budgetPool.length ? budgetPool : scored,
      "price"
    );

    if (premium) {
      results.push({
        item,
        part: premium.part,
        method: premium.method === "OEM_NUMBER" ? "OEM_NUMBER" : "PREMIUM",
        score: round2(premium.score),
        tier: "premium",
      });
    }

    if (
      budget &&
      (!premium || budget.part.id !== premium.part.id) &&
      budget.part.price < (premium?.part.price ?? Infinity)
    ) {
      results.push({
        item,
        part: budget.part,
        method: "BUDGET",
        score: round2(budget.score),
        tier: "budget",
      });
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
