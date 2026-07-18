import "server-only";
import { ParsedEstimateSchema, type ParsedEstimate } from "./schema";

/**
 * Zero-cost estimate parser: extracts parts, labor, and totals from estimate
 * text using pattern matching. Used when no AI provider is configured, or as
 * a fallback when the AI call fails. Works on text-based PDFs.
 */

// Money: "$1,234.56", "1234.56", or "$850" (bare integers require a $ sign).
const MONEY_RE = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(?<![\d.])(\d{1,3}(?:,\d{3})*\.\d{2})(?![\d%])/g;

// BMW OEM part numbers: 11 digits, often grouped "31 12 6 852 991".
const OEM_RE = /\b(\d{2})[\s.-]?(\d{2})[\s.-]?(\d)[\s.-]?(\d{3})[\s.-]?(\d{3})\b/;

const LABOR_RE = /\b(labor|labour|diagnos\w*|r\s*&\s*r|remove\s+(and|&)\s+replace|install(ation)?\s+(fee|charge)|shop\s+time)\b/i;
const FEE_RE = /\b(shop\s+suppl\w*|hazmat|disposal|environmental|misc(ellaneous)?\s+charge|fee)\b/i;
const TAX_RE = /\b(tax|hst|gst|vat)\b/i;
const TOTAL_RE = /\b(grand\s+total|total\s+(estimate|due|amount)|estimate\s+total|\btotal\b)\b/i;
const SUBTOTAL_RE = /\bsub\s*-?\s*total\b/i;
const QTY_RE = /(?:^|\b)(?:qty\.?\s*:?\s*(\d{1,2})|x\s?(\d{1,2})\b|(\d{1,2})\s*(?:x|ea\.?|each)\b)/i;
const LEADING_QTY_RE = /^\s*(\d{1,2})\s+(?=[A-Za-z])/;
// Quantity-column layouts: a lone small number right before the price at end
// of line, e.g. "Ignition coil   4   $260.00".
const QTY_COLUMN_RE = /\s(\d{1,2})\s+\$\s*[\d,]+(?:\.\d{2})?\s*$/;

const YEAR_RE = /\b(19[89]\d|20[0-4]\d)\b/;
const MODEL_RE = /\b(\d{3}\s?[a-z]{1,2}|X[1-7]\s?M?|M[2-8]|Z4|i[3-8]|M340i|M550i)\b/i;
const ENGINE_RE = /\b([NBS]\d{2}|S55|S58|S63)[A-Z]?\b/;

function moneyValues(line: string): number[] {
  const values: number[] = [];
  for (const match of line.matchAll(MONEY_RE)) {
    const raw = match[1] ?? match[2];
    if (raw) values.push(Number(raw.replace(/,/g, "")));
  }
  return values;
}

function extractOem(line: string): string | null {
  const match = line.match(OEM_RE);
  if (!match) return null;
  const digits = match.slice(1).join("");
  return digits.length === 11 ? digits : null;
}

function extractQuantity(line: string): number {
  const leading = line.match(LEADING_QTY_RE);
  if (leading) return Number(leading[1]);
  const qty = line.match(QTY_RE);
  if (qty) return Number(qty[1] ?? qty[2] ?? qty[3]);
  const column = line.match(QTY_COLUMN_RE);
  if (column) return Number(column[1]);
  return 1;
}

function cleanDescription(line: string): string {
  return line
    .replace(MONEY_RE, " ")
    .replace(OEM_RE, " ")
    .replace(LEADING_QTY_RE, " ")
    .replace(/\bqty\.?\s*:?\s*\d{1,2}\b/gi, " ")
    .replace(/\bx\s?\d{1,2}\b/gi, " ")
    .replace(/[|•·]+/g, " ")
    .replace(/[^\w\s&/()-]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/(\s+\d{1,2})+$/, ""); // stray quantity-column digits
}

/** Correct common OCR character confusions before parsing. */
function normalizeOcrArtifacts(text: string): string {
  return (
    text
      // Currency symbol misreads: £310.00 / S260.00 → $310.00 / $260.00
      .replace(/£/g, "$")
      .replace(/\bS(?=\d{1,3}(?:[,\d]*)\.\d{2}\b)/g, "$")
      // € is almost always a misread 6 on US invoices (e.g. "€07" in "607")
      .replace(/€/g, "6")
  );
}

export function parseEstimateHeuristically(rawText: string): ParsedEstimate {
  const text = normalizeOcrArtifacts(rawText);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let shopName: string | null = null;
  let laborTotal = 0;
  let totalEstimate: number | null = null;
  let year: number | null = null;
  let model: string | null = null;
  let engine: string | null = null;
  const parts: ParsedEstimate["parts"] = [];

  // Shop name: first meaningful text line without prices.
  for (const line of lines.slice(0, 6)) {
    if (
      /[A-Za-z]{3,}/.test(line) &&
      moneyValues(line).length === 0 &&
      !YEAR_RE.test(line) &&
      line.length >= 3 &&
      line.length <= 60
    ) {
      shopName = line;
      break;
    }
  }

  // Vehicle info from anywhere in the document. Prefer a year immediately
  // followed by "BMW" or a model name so we don't grab the invoice date.
  const fullText = lines.join(" ");
  const vehicleYearMatch = fullText.match(
    new RegExp(`${YEAR_RE.source}\\s+(?:BMW\\b|${MODEL_RE.source})`, "i")
  );
  const yearMatch = vehicleYearMatch ?? fullText.match(YEAR_RE);
  if (yearMatch) year = Number(yearMatch[1]);
  const modelMatch = fullText.match(MODEL_RE);
  if (modelMatch) model = modelMatch[1].replace(/\s+/g, "").toUpperCase().replace(/^(\d{3})([A-Z]+)$/, (_, d, s) => d + s.toLowerCase());
  const engineMatch = fullText.match(ENGINE_RE);
  if (engineMatch) engine = engineMatch[0].toUpperCase();

  for (const line of lines) {
    const prices = moneyValues(line);
    if (prices.length === 0) continue;
    const price = prices[prices.length - 1];

    if (SUBTOTAL_RE.test(line)) continue;
    if (TAX_RE.test(line) && !/gasket|exhaust/i.test(line)) continue;
    // Any "total"-ish line (incl. OCR misreads like "Suctotal", "GRANDTOTAL")
    // is never a part; the grand total is the largest such value.
    if (/total/i.test(line) || TOTAL_RE.test(line)) {
      totalEstimate = Math.max(totalEstimate ?? 0, price);
      continue;
    }
    if (LABOR_RE.test(line)) {
      laborTotal += price;
      continue;
    }
    if (FEE_RE.test(line)) continue;

    // Sanity bounds: OCR sometimes produces $0 or absurd values.
    if (price <= 0 || price > 100_000) continue;

    const description = cleanDescription(line);
    // Require a real description (letters) so we skip stray number rows.
    if (!/[A-Za-z]{3,}/.test(description)) continue;

    parts.push({
      description,
      quantity: extractQuantity(line),
      mechanicPrice: price,
      oemPartNumber: extractOem(line),
    });
  }

  return ParsedEstimateSchema.parse({
    shopName,
    vehicle: { year, model, engine },
    laborTotal: laborTotal > 0 ? laborTotal : null,
    parts,
    totalEstimate,
  });
}
