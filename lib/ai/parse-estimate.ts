import "server-only";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ParsedEstimateSchema, type ParsedEstimate } from "./schema";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5";

/**
 * True when a usable AI provider is configured. Works with any
 * OpenAI-compatible endpoint (OpenAI, Google Gemini, Groq, Ollama, …) via
 * OPENAI_BASE_URL. When false, the app falls back to the heuristic parser.
 */
export function hasAiConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && !key.includes("placeholder"));
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

const SYSTEM_PROMPT = `You are an expert BMW service advisor. You read mechanic repair estimates
(invoices, quotes, screenshots) and extract structured data.

Rules:
- Extract EVERY part line item. Do not invent parts that are not on the estimate.
- "mechanicPrice" is the parts price the shop quoted for that line (quantity included), in USD.
- Labor, shop supplies, hazmat fees and tax are NOT parts — exclude them from the parts array.
- Sum all labor lines into "laborTotal".
- BMW OEM part numbers are 11-digit numbers, sometimes formatted like "31 12 6 852 991".
  Normalize them to digits only (e.g. "31126852991"). Use null when not printed.
- "totalEstimate" is the grand total of the whole estimate.
- Use null for anything that is not present on the document.`;

type UserContent = OpenAI.Chat.Completions.ChatCompletionContentPart[];

/**
 * Parses a mechanic estimate into structured data using OpenAI.
 * Accepts either extracted text (PDFs) or an image URL (photos/screenshots).
 */
export async function parseEstimate(input: {
  text?: string;
  imageUrl?: string;
}): Promise<ParsedEstimate> {
  const openai = getClient();

  const content: UserContent = [];
  if (input.text) {
    content.push({
      type: "text",
      text: `Here is the text extracted from a mechanic estimate. Extract the structured data:\n\n${input.text.slice(0, 30_000)}`,
    });
  }
  if (input.imageUrl) {
    content.push({
      type: "text",
      text: "Here is a photo/screenshot of a mechanic estimate. Extract the structured data:",
    });
    content.push({ type: "image_url", image_url: { url: input.imageUrl } });
  }
  if (content.length === 0) throw new Error("No estimate content provided");

  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    response_format: zodResponseFormat(ParsedEstimateSchema, "parsed_estimate"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error("AI did not return a valid estimate structure");

  // zodResponseFormat already validated, but re-validate defensively.
  return ParsedEstimateSchema.parse(parsed);
}
