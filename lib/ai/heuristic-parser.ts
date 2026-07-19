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
  /\b(M340i|M550i|M\d|[0-9]{3}\s?[a-z]{1,2}|X[1-7]\s?M?|Z4|i[3-8]|iX)\b/i;
const ENGINE_RE = /\b([NBS]\d{2}|S55|S58|S63|S68|B46|B48|B58)[A-Z]?\b/i;

function normalizeModel(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/^(\d{3})([A-Z]+)$/, (_, d, s) => d + s.toLowerCase())
    .replace(/^IX$/i, "iX")
    .replace(/^(I)(\d)$/i, (_, _i, n) => `i${n}`);
}

/** Pull year / model / engine from estimate text (labeled fields preferred). */
export function extractVehicleFromText(text: string): {
  year: number | null;
  model: string | null;
  engine: string | null;
} {
  const fullText = text.replace(/\s+/g, " ");

  let year: number | null = null;
  let model: string | null = null;
  let engine: string | null = null;

  // Dealer forms: "Model 630i M Sport" / OCR "63h M Sport" near Model:
  const modelNearSport = fullText.match(
    /\b(\d{2}[h1l]|\d{3}[a-zh1l]{1,2}|M[2-8]|X[1-7]|i[3-8]|iX)\s+M\s*Sport\b/i
  );
  if (modelNearSport) {
    model = normalizeModel(repairModelToken(modelNearSport[1]));
  }

  if (!model) {
    const modelField = fullText.match(
      /\bModel\b(?:\s*Code)?[^A-Za-z0-9]{0,40}([A-Za-z0-9][A-Za-z0-9\s/-]{0,24})/i
    );
    if (modelField) {
      const chunk = modelField[1];
      const inField =
        chunk.match(
          /\b(M340i|M550i|M[2-8]|[0-9]{2,3}\s?[a-z0-9h1l]{1,2}|X[1-7]|Z4|i[3-8]|iX)\b/i
        ) ?? chunk.match(/\b(\d{2}[h1l]|\d{3}[a-z0-9h1l])\b/i);
      if (inField) model = normalizeModel(repairModelToken(inField[1]));
    }
  }

  // Scan after the word Model for a nearby ###i token (OCR often wraps lines)
  if (!model) {
    const afterModel = fullText.match(
      /\bModel\b[\s\S]{0,120}?\b(\d{2}[h1l]|\d{3}[a-zh1l]{1,2}|M[2-8]|X[1-7]|i[3-8]|iX)\b/i
    );
    if (afterModel) model = normalizeModel(repairModelToken(afterModel[1]));
  }

  // "Series: G32" → 6-series hint if model still missing
  const series = fullText.match(/\bSeries\s*:?\s*(G\d{2}|F\d{2}|E\d{2})\b/i);
  if (!model && series) {
    const code = series[1].toUpperCase();
    if (code.startsWith("G32") || code === "G32") model = "630i"; // common on G32 estimates
  }

  // Explicit "Vehicle: 2020 BMW M5"
  const labeled = fullText.match(
    /(?:vehicle|veh|estimate\s+for)\s*:?\s*(19[89]\d|20[0-4]\d)\s+(?:BMW\s+)?(M340i|M550i|M\d|[0-9]{3}\s?[a-z]{1,2}|X[1-7]\s?M?|Z4|i[3-8]|iX)\b/i
  );
  if (labeled) {
    year = Number(labeled[1]);
    if (!model) model = normalizeModel(labeled[2]);
  }

  const engineLabeled = fullText.match(
    /engine\s*:?\s*([NBS]\d{2}|S55|S58|S63|S68|B46|B48|B58)[A-Z]?\b/i
  );
  if (engineLabeled) engine = engineLabeled[1].toUpperCase();

  // Prefer warranty / model year over document date (15-Nov-2024 is not the car year)
  if (!year) {
    const warranty = fullText.match(
      /warranty\s+start(?:\s+date)?[\s\S]{0,120}?\(?\s*(\d{1,2})[-/.]([A-Za-z]{3}|\d{1,2})[-/.](20[0-4]\d)/i
    );
    if (warranty) year = Number(warranty[3]);
  }
  if (!year) {
    const modelYear = fullText.match(
      /(?:model\s*year|year)\s*:?\s*(19[89]\d|20[0-4]\d)\b/i
    );
    if (modelYear) year = Number(modelYear[1]);
  }
  if (!year) {
    const vehicleYearMatch = fullText.match(
      new RegExp(`${YEAR_RE.source}\\s+(?:BMW\\b|${MODEL_RE.source})`, "i")
    );
    if (vehicleYearMatch) year = Number(vehicleYearMatch[1]);
  }

  if (!model) {
    // Avoid "BMW Ix" logo OCR — require clear iX / ###i after BMW, not "BMW SERVICE"
    const afterBmw = fullText.match(
      /\bBMW\s+(?!SERVICE|MOTOR|GROUP|AG\b)(M340i|M550i|M\d|[0-9]{3}\s?[a-z]{1,2}|X[1-7]|Z4|i[3-8]|iX)\b/i
    );
    if (afterBmw) model = normalizeModel(repairModelToken(afterBmw[1]));
  }

  // Last resort: any ###i in text (skip bare "Ix" from logo noise)
  if (!model) {
    const seriesModel = fullText.match(
      /\b(M340i|M550i|M[2-8]|[1-8]\d{2}\s?[idxta]{1,2}|X[1-7]|Z4|i[3-8]|iX)\b/i
    );
    if (seriesModel) {
      const cand = normalizeModel(repairModelToken(seriesModel[1]));
      // Don't accept lone iX unless it's clearly "BMW iX" style (already handled) —
      // logo OCR "BMW Ix" often appears without a real iX vehicle.
      if (cand.toLowerCase() !== "ix") model = cand;
    }
  }

  if (!engine) {
    const engineMatch = fullText.match(ENGINE_RE);
    if (engineMatch) engine = engineMatch[1].toUpperCase();
  }

  // If we have model but no year, use warranty year or leave null (manual entry)
  if (!year && model) {
    const anyYear = fullText.match(/\b(20[1-2]\d)\b/);
    // Only as last resort when Model: / M Sport gave us a clear model
    if (anyYear) year = Number(anyYear[1]);
  }

  return { year, model, engine };
}

/** Fix common OCR typos in model tokens: 63h → 630i, 6401 → 640i */
function repairModelToken(raw: string): string {
  const t = raw.replace(/\s+/g, "");
  if (/^\d{2}h$/i.test(t)) return `${t.slice(0, 2)}0i`; // 63h → 630i
  if (/^\d{3}[h1l]$/i.test(t)) return `${t.slice(0, 2)}0i`; // 630h / 6301 → 630i
  return t;
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

/** Merge description-only lines with the following priced line (common OCR wrap). */
function joinBrokenLines(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (
      i + 1 < lines.length &&
      moneyValues(line).length === 0 &&
      /[A-Za-z]{2,}/.test(line) &&
      moneyValues(lines[i + 1]).length > 0 &&
      !/^(subtotal|tax|total|grand|labor|job|approve|decline|part\s*qty)/i.test(lines[i + 1]) &&
      !/coolant line to|replace leaking|turbo and water/i.test(lines[i + 1]) &&
      // Cap join into part lines only — totals/headers may have large job amounts
      (/job\s*total|grand\s*total|subtotal|tax/i.test(line) ||
        moneyValues(lines[i + 1])[moneyValues(lines[i + 1]).length - 1] <= 1500)
    ) {
      i += 1;
      line = `${line} ${lines[i]}`;
    }
    out.push(line);
  }
  return out;
}

const SKIP_LINE_RE =
  /\b(approve|decline|labor\s*total|job\s*total|subtotal\s*est|part\s*qty|retail\s*total|tech\s*:|replace\s+leaking|water\s+pump\s*$|base\s*$|job\s*time\s+without|without\s+allowance|monsoon\s+campaign|wrong\s+fuel|sum\s+labor|fru\b|fri\b|frl\b)\b/i;

export function parseEstimateHeuristically(rawText: string): ParsedEstimate {
  const text = normalizeOcrArtifacts(rawText);
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lines = joinBrokenLines(rawLines);

  let shopName: string | null = null;
  let laborTotal = 0;
  let totalEstimate: number | null = null;
  const parts: ParsedEstimate["parts"] = [];

  for (const line of lines.slice(0, 8)) {
    if (
      /[A-Za-z]{3,}/.test(line) &&
      moneyValues(line).length === 0 &&
      !YEAR_RE.test(line) &&
      !/vehicle|estimate\s+for/i.test(line) &&
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

    if (SKIP_LINE_RE.test(line)) {
      // "Job Total $5,518.41" / labor block totals (sometimes money is on the next line)
      if (/job\s*total|grand\s*total|estimate\s+for/i.test(line) || /total/i.test(line)) {
        if (price > 200) totalEstimate = Math.max(totalEstimate ?? 0, price);
        const idx = lines.indexOf(line);
        const next = idx >= 0 ? lines[idx + 1] : undefined;
        if (next) {
          const nextPrices = moneyValues(next);
          if (nextPrices.length > 0 && !/[A-Za-z]{4,}/.test(next)) {
            const jobTotal = nextPrices[nextPrices.length - 1];
            if (jobTotal > 200) totalEstimate = Math.max(totalEstimate ?? 0, jobTotal);
          }
        }
      }
      continue;
    }

    if (SUBTOTAL_RE.test(line)) continue;
    if (TAX_RE.test(line) && !/gasket|exhaust/i.test(line)) continue;
    if (/total/i.test(line) || TOTAL_RE.test(line)) {
      totalEstimate = Math.max(totalEstimate ?? 0, price);
      continue;
    }
    if (LABOR_RE.test(line)) {
      laborTotal += price;
      continue;
    }
    if (FEE_RE.test(line)) continue;

    // Labor packages / narrative blocks — not parts
    if (/coolant line to|turbo and water|pump assembly|replace leaking/i.test(line)) {
      continue;
    }
    if (
      /job\s*time|fuel\s+conditioning|fuel\s+tank|fuel\s+delivery|electrical\s+system|quick-?inspection/i.test(
        line
      )
    ) {
      laborTotal += price;
      continue;
    }

    // Individual parts on BMW estimates are rarely > $1,500 each
    if (price <= 0 || price > 1_500) continue;

    const description = cleanDescription(line)
      .replace(/\b(qty|retail|total)\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Require a real part-like description (not "TO", "Line" alone without context — after join should be longer)
    if (!/[A-Za-z]{3,}/.test(description)) continue;
    if (description.length < 6) continue;
    if (/^(to|and|with|the|for|a)$/i.test(description)) continue;

    parts.push({
      description,
      quantity: extractQuantity(line),
      mechanicPrice: price,
      oemPartNumber: extractOem(line),
    });
  }

  // Deduplicate near-identical lines (OCR sometimes doubles)
  const deduped: typeof parts = [];
  for (const p of parts) {
    const key = `${p.description.toLowerCase()}|${p.mechanicPrice}`;
    if (deduped.some((d) => `${d.description.toLowerCase()}|${d.mechanicPrice}` === key)) {
      continue;
    }
    deduped.push(p);
  }

  const partsSum = deduped.reduce((s, p) => s + p.mechanicPrice, 0);
  totalEstimate = sanitizeGrandTotal(totalEstimate, partsSum, laborTotal);

  return ParsedEstimateSchema.parse({
    shopName,
    vehicle: { year, model, engine },
    laborTotal: laborTotal > 0 ? laborTotal : null,
    parts: deduped,
    totalEstimate,
  });
}
