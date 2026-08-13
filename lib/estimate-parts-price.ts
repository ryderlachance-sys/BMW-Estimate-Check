import type { ParsedEstimate } from "@/lib/ai/schema";
import { round2 } from "@/lib/utils";

const moneyPattern = /\$?\s*([\d,]+(?:\.\d{2}))/g;

function moneyValues(line: string): number[] {
  return [...line.matchAll(moneyPattern)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter((value) => Number.isFinite(value));
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\$?\s*[\d,]+(?:\.\d{2})/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["assembly", "pair", "set"].includes(word));
}

/**
 * Repair tables commonly print PARTS, LABOR, LINE TOTAL. If those columns are
 * present, force mechanicPrice to the parts-only amount so savings never
 * compare an online part against parts + labor.
 */
export function correctPartsOnlyPrices(text: string | null, parsed: ParsedEstimate): ParsedEstimate {
  if (!text) return parsed;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parts = parsed.parts.map((part) => {
    const tokens = words(part.description).slice(0, 4);
    const candidate = lines
      .map((line) => ({
        line,
        score: tokens.filter((token) => line.toLowerCase().includes(token)).length,
      }))
      .filter(({ score }) => score >= Math.min(2, tokens.length))
      .sort((a, b) => b.score - a.score)[0]?.line ?? part.description;
    const values = moneyValues(candidate);
    if (values.length < 3) return part;
    const [partsPrice, laborPrice, lineTotal] = values.slice(-3);
    if (Math.abs(partsPrice + laborPrice - lineTotal) > 0.05) return part;
    return { ...part, mechanicPrice: round2(partsPrice) };
  });
  return { ...parsed, parts };
}
