import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { ParsedEstimateSchema, type ParsedEstimate } from "./schema";

/** Default model: cheap vision + text. Override with OPENAI_MODEL. */
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/**
 * True when a usable AI provider is configured. Works with any
 * OpenAI-compatible endpoint via OPENAI_BASE_URL.
 */
export function hasAiConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.trim() && !key.includes("placeholder"));
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

/**
 * Strict JSON shape returned by gpt-4o-mini (matches product contract).
 * year may arrive as string "2019" or number — we coerce.
 */
export const GptMechanicExtractSchema = z.object({
  year: z.union([z.string(), z.number(), z.null()]),
  make: z.string().nullable(),
  model: z.string().nullable(),
  vin: z.string().nullable(),
  parts: z.array(
    z.object({
      part_name: z.string(),
      mechanic_price: z.number(),
      amazon_asin: z.string().nullable().optional(),
      ebay_item_id: z.union([z.string(), z.number()]).nullable().optional(),
    })
  ),
});

export type GptMechanicExtract = z.infer<typeof GptMechanicExtractSchema>;

const SYSTEM_PROMPT = `You are an expert automotive mechanic estimator.
You read shop repair estimates (photos, screenshots, or pasted text) for ANY car make.

Your job is to extract vehicle details, replacement PARTS with shop prices, and — when you
know a real retail listing — the Amazon ASIN and/or eBay Item ID so the shopper can open a
single product page (Buy Now), not a search results grid.

Rules:
- Act like a seasoned estimator: read blurry OCR, abbreviations, and messy invoices carefully.
- Extract EVERY parts line (pads, rotors, filters, alternators, etc.). Do NOT invent parts.
- Exclude labor, diagnosis, shop supplies, hazmat, fees, and tax from the parts list.
- mechanic_price is the shop's parts price for that line in USD (include quantity in the total).
- year is the vehicle model year (e.g. "2019"). make/model as printed (e.g. Jeep / Grand Cherokee).
- vin is the 17-character VIN if present, otherwise null.
- amazon_asin: ONLY a real 10-character Amazon ASIN for a matching automotive part if you are
  highly confident it exists. Otherwise null. NEVER invent or guess ASINs.
- ebay_item_id: ONLY a real eBay item ID (numeric) for a matching listing if highly confident.
  Otherwise null. NEVER invent IDs.
- If a field is missing, use null (or [] for parts).

Return ONLY a single JSON object with this exact structure (no markdown, no commentary):
{
  "year": "YYYY",
  "make": "Jeep",
  "model": "Grand Cherokee",
  "vin": "17-digit-VIN-or-null",
  "parts": [
    {
      "part_name": "Front Brake Pads",
      "mechanic_price": 150.00,
      "amazon_asin": "B00EXAMPLE1",
      "ebay_item_id": "123456789012"
    },
    {
      "part_name": "Brake Rotors",
      "mechanic_price": 200.00,
      "amazon_asin": null,
      "ebay_item_id": null
    }
  ]
}`;

type UserContent = OpenAI.Chat.Completions.ChatCompletionContentPart[];

function coerceYear(value: string | number | null): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d]/g, "").slice(0, 4));
  if (!Number.isFinite(n)) return null;
  if (n < 1990 || n > new Date().getFullYear() + 1) return null;
  return Math.trunc(n);
}

function normalizeVin(vin: string | null): string | null {
  if (!vin) return null;
  const cleaned = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
  return cleaned.length === 17 ? cleaned : null;
}

/** Amazon ASIN: 10 alphanumeric chars (not starting with empty). */
export function normalizeAsin(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(cleaned)) return null;
  return cleaned;
}

/** eBay item IDs are typically 9–15 digits. */
export function normalizeEbayItemId(
  value: string | number | null | undefined
): string | null {
  if (value == null) return null;
  const cleaned = String(value).replace(/\D/g, "");
  if (cleaned.length < 9 || cleaned.length > 15) return null;
  return cleaned;
}

/** Map GPT JSON → internal ParsedEstimate (+ optional _vin). */
export function mapGptExtractToParsed(
  raw: GptMechanicExtract
): ParsedEstimate & { _vin?: string | null } {
  const parts = raw.parts
    .filter((p) => p.part_name?.trim() && Number.isFinite(p.mechanic_price) && p.mechanic_price > 0)
    .map((p) => ({
      description: p.part_name.trim().slice(0, 200),
      quantity: 1,
      mechanicPrice: Math.round(p.mechanic_price * 100) / 100,
      oemPartNumber: null as string | null,
      amazonAsin: normalizeAsin(p.amazon_asin ?? null),
      ebayItemId: normalizeEbayItemId(p.ebay_item_id ?? null),
    }));

  const partsSum = parts.reduce((s, p) => s + p.mechanicPrice, 0);
  const vin = normalizeVin(raw.vin);

  const parsed = ParsedEstimateSchema.parse({
    shopName: null,
    vehicle: {
      year: coerceYear(raw.year),
      make: raw.make?.trim() || null,
      model: raw.model?.trim() || null,
      engine: null,
    },
    laborTotal: null,
    parts,
    totalEstimate: partsSum > 0 ? partsSum : null,
  });

  return { ...parsed, _vin: vin };
}

function stripCodeFences(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Secure server-side call to OpenAI (gpt-4o-mini by default).
 * Accepts pasted/OCR text and/or an image data URL / remote URL.
 * Never expose OPENAI_API_KEY to the browser.
 */
export async function parseEstimate(input: {
  text?: string;
  imageUrl?: string;
}): Promise<ParsedEstimate & { _vin?: string | null }> {
  const openai = getClient();

  const content: UserContent = [];
  if (input.text?.trim()) {
    content.push({
      type: "text",
      text: `Here is text from a mechanic estimate (OCR or pasted). Extract vehicle + parts as JSON:\n\n${input.text.trim().slice(0, 30_000)}`,
    });
  }
  if (input.imageUrl) {
    content.push({
      type: "text",
      text: input.text?.trim()
        ? "Also use this photo/screenshot of the same estimate to improve accuracy:"
        : "Here is a photo/screenshot of a mechanic estimate. Extract vehicle + parts as JSON:",
    });
    content.push({
      type: "image_url",
      image_url: { url: input.imageUrl, detail: "high" },
    });
  }
  if (content.length === 0) throw new Error("No estimate content provided");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
  });

  const rawText = completion.choices[0]?.message?.content;
  if (!rawText) throw new Error("AI did not return estimate JSON");

  let json: unknown;
  try {
    json = JSON.parse(stripCodeFences(rawText));
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const extracted = GptMechanicExtractSchema.parse(json);
  return mapGptExtractToParsed(extracted);
}
