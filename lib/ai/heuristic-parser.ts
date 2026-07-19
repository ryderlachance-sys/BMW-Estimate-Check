import "server-only";
import { ParsedEstimateSchema, type ParsedEstimate } from "./schema";
import { repairOcrText, sanitizeGrandTotal } from "@/lib/ocr/repair";

/**
 * Zero-cost estimate parser: extracts parts, labor, and totals from estimate
 * text using pattern matching. Used when no AI provider is configured, or as
 * a fallback when the AI call fails. Works on text-based PDFs.
 */

// Money: "$1,234.56", "1234.56", or "$850" (bare integers require a $ sign).
const MONEY_RE = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(?<![\d.])(\d{1,3}(?:,\d{3})*\.\d{2})(?![\d%])/g;

// BMW OEM part numbers: 11 digits, often grouped "31 12 6 852 991".
const OEM_RE = /\b(\d{2})[\s.-]?(\d{2})[\s.-]?(\d)[\s.-]?(\d{3})[\s.-]?(\d{3})\b/;

const LABOR_RE =
  /\b(labor|labour|diagnos\w*|misfire|r\s*&\s*r|remove\s+(and|&)\s+replace|install(ation)?\s+(fee|charge)|shop\s+time)\b/i;
const FEE_RE =
  /\b(shop\s+suppl\w*|supplies|hazmat|disposal|environmental|misc(ellaneous)?\s+charge|fee)\b/i;
const TAX_RE = /\b(tax|hst|gst|vat)\b/i;
const TOTAL_RE = /\b(grand\s+total|total\s+(estimate|due|amount)|estimate\s+total|\btotal\b)\b/i;
const SUBTOTAL_RE = /\bsub\s*-?\s*total\b/i;
const QTY_RE = /(?:^|\b)(?:qty\.?\s*:?\s*(\d{1,2})|x\s?(\d{1,2})\b|(\d{1,2})\s*(?:x|ea\.?|each)\b)/i;
const LEADING_QTY_RE = /^\s*(\d{1,2})\s+(?=[A-Za-z])/;
// Quantity-column layouts: a lone small number right before the price at end
// of line, e.g. "Ignition coil   4   $260.00".
const QTY_COLUMN_RE = /\s(\d{1,2})\s+\$\s*[\d,]+(?:\.\d{2})?\s*$/;

const YEAR_RE = /\b(19[89]\d|20[0-4]\d)\b/;
const MODEL_RE =
  /\b(M340i|M550i|M\d|[0-9]{3}\s?[a-z]{1,2}|X[1-7]\s?M?|Z4|i[3-8X]|iX)\b/i;
const ENGINE_RE = /\b([NBS]\d{2}|S55|S58|S63|B46|B48|B58)[A-Z]?\b/i;

function normalizeModel(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/^(\d{3})([A-Z]+)$/, (_, d, s) => d + s.toLowerCase())
    .replace(/^IX$/i, "iX")
    .replace(/^(I)(\d)$/i, (_, _i, n) => `i${n}`);
}

/** Pull year / model / engine from estimate text (Vehicle: line preferred). */
export function extractVehicleFromText(text: string): {
  year: number | null;
  model: string | null;
  engine: string | null;
} {
  const fullText = text.replace(/\s+/g, " ");

  let year: number | null = null;
  let model: string | null = null;
  let engine: string | null = null;

  // "Vehicle: 2020 BMW M5 Competition Engine: S63"
  const labeled = fullText.match(
    /(?:vehicle|veh)\s*:?\s*(19[89]\d|20[0-4]\d)\s+(?:BMW\s+)?(M340i|M550i|M\d|[0-9]{3}\s?[a-z]{1,2}|X[1-7]\s?M?|Z4|i[3-8X]|iX)\b/i
  );
  if (labeled) {
    year = Number(labeled[1]);
    model = normalizeModel(labeled[2]);
  }

  const engineLabeled = fullText.match(
    /engine\s*:?\s*([NBS]\d{2}|S55|S58|S63|B46|B48|B58)[A-Z]?\b/i
  );
  if (engineLabeled) engine = engineLabeled[1].toUpperCase();

  if (!year) {
    const vehicleYearMatch = fullText.match(
      new RegExp(`${YEAR_RE.source}\\s+(?:BMW\\b|${MODEL_RE.source})`, "i")
    );
    const yearMatch = vehicleYearMatch ?? fullText.match(YEAR_RE);
    if (yearMatch) year = Number(yearMatch[1]);
  }

  if (!model) {
    const afterBmw = fullText.match(
      /\bBMW\s+(M340i|M550i|M\d|[0-9]{3}\s?[a-z]{1,2}|X[1-7]\s?M?|Z4|i[3-8X]|iX)\b/i
    );
    const modelMatch = afterBmw ?? fullText.match(MODEL_RE);
    if (modelMatch) model = normalizeModel(modelMatch[1]);
  }

  if (!engine) {
    const engineMatch = fullText.match(ENGINE_RE);
    if (engineMatch) engine = engineMatch[1].toUpperCase();
  }

  return { year, model, engine };
}

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
  return repairOcrText(text);
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

  const { year, model, engine } = extractVehicleFromText(text);

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

  const partsSum = parts.reduce((s, p) => s + p.mechanicPrice, 0);
  totalEstimate = sanitizeGrandTotal(totalEstimate, partsSum, laborTotal);

  return ParsedEstimateSchema.parse({
    shopName,
    vehicle: { year, model, engine },
    laborTotal: laborTotal > 0 ? laborTotal : null,
    parts,
    totalEstimate,
  });
}
