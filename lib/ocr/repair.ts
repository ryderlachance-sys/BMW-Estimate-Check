/**
 * Shared OCR helpers (safe for browser + server).
 * Used to score and lightly repair tesseract output before parsing.
 */

/** Prefer OCR results that look like real estimates (money + OEM numbers). */
export function ocrQualityScore(text: string): number {
  const money = (text.match(/\$?\d{1,3}(?:,\d{3})*\.\d{2}\b/g) ?? []).length;
  const partNumbers = (
    text.match(/\b\d{2}[\s.-]?\d{2}[\s.-]?\d[\s.-]?\d{3}[\s.-]?\d{3}\b/g) ?? []
  ).length;
  const words = (text.match(/\b[a-z]{4,}\b/gi) ?? []).length;
  const laborHits = (text.match(/\blabor\b/gi) ?? []).length;
  return money * 4 + partNumbers * 6 + words + laborHits * 3;
}

/**
 * Fix common tesseract misreads on BMW shop estimates before heuristic parse.
 */
export function repairOcrText(text: string): string {
  return (
    text
      // € is almost always a misread 6 on US invoices (e.g. "€07" in "607")
      .replace(/€/g, "6")
      .replace(/\bBUW\b/g, "BMW")
      .replace(/\bRERATR\s+ESTATE\b/gi, "REPAIR ESTIMATE")
      .replace(/\bCRM\s*TOTAL\b/gi, "GRAND TOTAL")
      .replace(/\bGRANDTOTAL\b/gi, "GRAND TOTAL")
      .replace(/\bSuctotal\b/gi, "Subtotal")
      .replace(/\bTex\b(?=\s*\(?\s*\d)/gi, "Tax")
      .replace(/\bLazer\b/gi, "Labor")
      .replace(/\bassgrostic\b/gi, "diagnostic")
      .replace(/\bSnes\s+morsiies\b/gi, "Shop supplies")
      .replace(/\bshop\s+suppl\w*/gi, "shop supplies")
      .replace(/\bFront\s+brave\b/gi, "Front brake")
      .replace(/\bbave\s+rotors\b/gi, "brake rotors")
      .replace(/\brotors\s*\(\s*pain\s*\)/gi, "rotors (pair)")
      .replace(/\bpad\s+set\b/gi, "pad set")
      // Currency: "s39.50" / "S260.00" → "$39.50"
      .replace(/£/g, "$")
      .replace(/\b[Ss](?=\d{1,3}(?:,\d{3})*\.\d{2}\b)/g, "$")
  );
}

/**
 * When tesseract reads "$1,684.68" as "51,684.68", strip the false leading 5
 * if the remainder is in a plausible range vs parts+labor.
 */
export function sanitizeGrandTotal(
  total: number | null,
  partsSum: number,
  laborTotal: number
): number | null {
  if (total == null || total <= 0) return null;
  const baseline = partsSum + Math.max(0, laborTotal);
  if (baseline <= 0) return total;
  if (total <= baseline * 2.5) return total;

  const asText = String(total);
  if (asText.startsWith("5")) {
    const stripped = Number(asText.replace(/^5/, ""));
    if (
      Number.isFinite(stripped) &&
      stripped >= baseline * 0.45 &&
      stripped <= baseline * 2.5
    ) {
      return stripped;
    }
  }

  // Still absurd — don't show a fake $50k quote; fall back to parts+labor (+~tax).
  if (total > baseline * 3) {
    return Math.round(baseline * 1.0725 * 100) / 100;
  }
  return total;
}
