"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { extractTextFromFile, getImageForAi } from "@/lib/ai/extract-text";
import { hasAiConfigured, parseEstimate } from "@/lib/ai/parse-estimate";
import { parseEstimateHeuristically, extractVehicleFromText } from "@/lib/ai/heuristic-parser";
import type { ParsedEstimate } from "@/lib/ai/schema";
import { scanEstimateKeywords } from "@/lib/ai/keyword-scanner";
import { ocrQualityScore, repairOcrText } from "@/lib/ocr/repair";
import { buildComparisons, normalizeOemNumber } from "@/lib/comparison";
import { findCuratedListing } from "@/lib/curated-listings";
import {
  decodeVin,
  extractAndDecodeVin,
  extractVinFromText,
  isTrustworthyVinDecode,
} from "@/lib/vin";
import { normalizeMake } from "@/lib/vehicles";

function isLaborJunkLine(description: string): boolean {
  return /job\s*t[ui]me|without\s+allowance|fuel\s+conditioning|fuel\s+tank|fuel\s+delivery|fr[uil]\b|998729|monsoon|wrong\s+fuel|electrical\s+system|quick-?inspection|sum\s+labor/i.test(
    description
  );
}

/** Prefer labeled vehicle reads over logo OCR that invents "iX". */
function mergeVehicleFromText(
  parsed: ParsedEstimate,
  text: string | null
): ParsedEstimate {
  if (!text) return parsed;
  const fromText = extractVehicleFromText(text);
  const aiModel = parsed.vehicle.model?.toLowerCase() ?? "";
  const textModel = fromText.model?.toLowerCase() ?? "";

  let year = fromText.year ?? parsed.vehicle.year;
  let make = fromText.make ?? parsed.vehicle.make ?? null;
  let model = fromText.model ?? parsed.vehicle.model;
  let engine = fromText.engine ?? parsed.vehicle.engine;

  const kw = scanEstimateKeywords(text).vehicle;
  if (kw.make === "Jeep" && kw.model === "Grand Cherokee") {
    make = "Jeep";
    model = "Grand Cherokee";
  } else {
    if (!make && kw.make) make = kw.make;
    if (
      kw.model &&
      (!model ||
        (kw.model.toLowerCase().startsWith(model.toLowerCase()) && kw.model.length > model.length))
    ) {
      model = kw.model;
    }
  }
  if (!year && kw.year) year = kw.year;

  // Never keep logo-OCR iX when the estimate clearly has a series model
  if (aiModel === "ix" && textModel && textModel !== "ix") {
    model = fromText.model;
    year = fromText.year ?? year;
    make = fromText.make ?? make ?? "BMW";
  }
  if (model?.toLowerCase() === "ix" && /63[0h]?\s*m\s*sport|\bG32\b|\b630i\b/i.test(text)) {
    model = fromText.model ?? "630i";
    year = fromText.year ?? year;
    make = make ?? "BMW";
  }

  // Merge keyword-found parts the AI/heuristic may have missed
  const kwParts = scanEstimateKeywords(text).parts;
  const canonicalPart = (description: string) =>
    description
      .toLowerCase()
      .replace(/\$?\d[\d,.]*/g, " ")
      .replace(/\b(parts?|sets?|kits?|assembly|assy|qty|quantity|each|ea)\b/g, " ")
      .replace(/\b(pads|rotors|belts|plugs|coils|gaskets|struts)\b/g, (word) => word.slice(0, -1))
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const existing = parsed.parts.map((p) => ({
    name: canonicalPart(p.description),
    price: p.mechanicPrice,
  }));
  const extra = kwParts
    .filter((p) => {
      const candidate = canonicalPart(p.description);
      return !existing.some(
        (current) =>
          Math.abs(current.price - p.mechanicPrice) < 0.01 &&
          (current.name === candidate ||
            current.name.includes(candidate) ||
            candidate.includes(current.name))
      );
    })
    .map((p) => ({
      description: p.description,
      quantity: 1,
      mechanicPrice: p.mechanicPrice,
      oemPartNumber: null as string | null,
      amazonAsin: null as string | null,
      ebayItemId: null as string | null,
    }));

  return {
    ...parsed,
    vehicle: { year, make, model, engine },
    parts: [...parsed.parts.filter((p) => !isLaborJunkLine(p.description)), ...extra],
  };
}

const CreateEstimateSchema = z.object({
  fileUrl: z
    .string()
    .min(1, "Please upload your estimate or paste the text")
    .refine(
      (v) =>
        v.startsWith("/uploads/") ||
        v === "paste://estimate" ||
        /^https?:\/\//.test(v),
      "Invalid uploaded file reference"
    ),
  fileType: z.string().min(1, "Please upload your estimate or paste the text"),
  extractedText: z.string().optional(),
});

export type CreateEstimateState = { error?: string } | null;

export async function createEstimate(
  _prev: CreateEstimateState,
  formData: FormData
): Promise<CreateEstimateState> {
  const user = await ensureUser();

  const parsed = CreateEstimateSchema.safeParse({
    fileUrl: formData.get("fileUrl"),
    fileType: formData.get("fileType"),
    extractedText: String(formData.get("extractedText") ?? "") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const hasPaste = Boolean(data.extractedText && data.extractedText.trim().length >= 20);
  if (data.fileUrl === "paste://estimate" && !hasPaste) {
    return { error: "Paste the estimate text (part names and prices) before continuing." };
  }

  // Weak / empty OCR on images is OK — results page offers paste fallback.

  // Placeholder — year/model/engine are filled from the estimate during processEstimate.
  const vehicle = await db.vehicle.create({
    data: {
      userId: user.id,
      year: new Date().getFullYear(),
      make: "Unknown",
      model: "Pending",
      trim: null,
      engine: null,
      vin: null,
    },
  });

  const estimate = await db.estimate.create({
    data: {
      userId: user.id,
      vehicleId: vehicle.id,
      originalFileUrl: data.fileUrl,
      originalFileType: data.fileType,
      extractedText: data.extractedText ?? null,
      status: "PROCESSING",
    },
  });

  after(async () => {
    try {
      await processEstimate(estimate.id);
    } catch (err) {
      console.error("background processEstimate failed", err);
      try {
        await db.estimate.update({
          where: { id: estimate.id },
          data: {
            status: "FAILED",
            errorMessage:
              err instanceof Error
                ? err.message
                : "Estimate analysis crashed. Tap Retry analysis.",
          },
        });
      } catch {
        // ignore secondary failure
      }
    }
  });

  redirect(`/results/${estimate.id}`);
}

/** Extracts text, runs AI parsing, stores line items, and builds comparisons. */
export async function processEstimate(estimateId: string): Promise<void> {
  const estimate = await db.estimate.findUniqueOrThrow({ where: { id: estimateId } });

  await db.estimate.update({
    where: { id: estimateId },
    data: { status: "PROCESSING", errorMessage: null },
  });

  try {
    const isImage = estimate.originalFileType.startsWith("image/");
    const isPasteOnly = estimate.originalFileType === "text/plain" || estimate.originalFileUrl === "paste://estimate";
    let text: string | null = estimate.extractedText
      ? repairOcrText(estimate.extractedText)
      : null;

    const clientScore = text ? ocrQualityScore(text) : 0;
    // Prefer solid browser OCR. If it's weak (or missing), try server extraction
    // (works locally; may fail on Vercel — then we keep client text).
    if (!isPasteOnly && (!text || text.trim().length < 10 || (isImage && clientScore < 40))) {
      try {
        const extracted = await extractTextFromFile(
          estimate.originalFileUrl,
          estimate.originalFileType
        );
        const serverText = extracted.text ? repairOcrText(extracted.text) : null;
        if (
          serverText &&
          (!text || ocrQualityScore(serverText) > clientScore)
        ) {
          text = serverText;
        }
      } catch {
        // Keep client OCR if server OCR isn't available.
      }
    }

    if (text) text = repairOcrText(text);

    const canUseVision =
      hasAiConfigured() && isImage && !isPasteOnly && estimate.originalFileUrl !== "paste://estimate";

    if ((!text || text.trim().length < 12) && !canUseVision) {
      await db.estimate.update({
        where: { id: estimateId },
        data: {
          extractedText: text,
          status: "FAILED",
          errorMessage: "OCR_EMPTY",
        },
      });
      return;
    }

    let result: ParsedEstimate & { _vin?: string | null };
    if (hasAiConfigured()) {
      try {
        const imageUrl = canUseVision
          ? await getImageForAi(estimate.originalFileUrl, estimate.originalFileType)
          : undefined;
        result = await parseEstimate({
          text: text && text.trim().length >= 12 ? text : undefined,
          imageUrl,
        });
      } catch (err) {
        console.error("gpt parseEstimate failed, falling back", err);
        if (!text || text.trim().length < 12) {
          throw new Error("Could not read any text from this file.");
        }
        result = parseEstimateHeuristically(text);
      }
    } else if (text && text.trim().length >= 12) {
      result = parseEstimateHeuristically(text);
    } else {
      throw new Error("Could not read any text from this file.");
    }

    result = mergeVehicleFromText(result, text ?? "");

    // Prefer VIN from GPT extract, then NHTSA decode from text.
    // Keep the VIN string even when the check digit is bad, but never let an
    // untrustworthy NHTSA guess overwrite a labeled Vehicle: line (e.g. sample
    // VINs that decode as a different Lexus model).
    if (result._vin) {
      // keep AI VIN
    } else if (text) {
      const decoded = await extractAndDecodeVin(text);
      if (decoded?.vin) {
        result = { ...result, _vin: decoded.vin };
        if (isTrustworthyVinDecode(decoded)) {
          result = {
            ...result,
            vehicle: {
              year: decoded.year ?? result.vehicle.year,
              make: normalizeMake(decoded.make) ?? result.vehicle.make,
              model: decoded.model ?? result.vehicle.model,
              engine: decoded.engine ?? result.vehicle.engine,
            },
          };
        }
      }
    }

    // If GPT returned a VIN, optionally enrich missing year/make/model via NHTSA
    if (result._vin && (!result.vehicle.year || !result.vehicle.make || !result.vehicle.model)) {
      const decoded = await decodeVin(result._vin);
      if (decoded && isTrustworthyVinDecode(decoded)) {
        result = {
          ...result,
          vehicle: {
            year: decoded.year ?? result.vehicle.year,
            make: normalizeMake(decoded.make) ?? result.vehicle.make,
            model: decoded.model ?? result.vehicle.model,
            engine: decoded.engine ?? result.vehicle.engine,
          },
        };
      }
    }

    const detectedYear = result.vehicle.year;
    const detectedMake = result.vehicle.make;
    const detectedModel = result.vehicle.model;
    const detectedEngine = result.vehicle.engine;
    const detectedVin =
      result._vin ?? (text ? extractVinFromText(text) : null);
    const needsVehicle =
      !detectedYear ||
      !detectedModel ||
      detectedModel.toLowerCase() === "pending";

    // Vision-only parses leave OCR empty — store a readable summary for retries / admin
    if ((!text || text.trim().length < 12) && result.parts.length > 0) {
      const header = [detectedYear, detectedMake, detectedModel].filter(Boolean).join(" ");
      text = [
        header,
        detectedVin ? `VIN: ${detectedVin}` : null,
        ...result.parts.map((p) => `${p.description} $${p.mechanicPrice.toFixed(2)}`),
      ]
        .filter(Boolean)
        .join("\n");
    }

    await db.estimateItem.deleteMany({ where: { estimateId } });
    if (result.parts.length > 0) {
      await db.estimateItem.createMany({
        data: result.parts.map((p) => {
          const listing = findCuratedListing({
            year: detectedYear,
            make: detectedMake,
            model: detectedModel,
            description: p.description,
          });
          return {
            estimateId,
            description: p.description,
            quantity: Math.max(1, p.quantity),
            mechanicPrice: p.mechanicPrice,
            oemPartNumber: normalizeOemNumber(p.oemPartNumber),
            amazonAsin: listing?.amazonAsin ?? p.amazonAsin ?? null,
            ebayItemId: p.ebayItemId ?? null,
            retailerName: listing?.retailerName ?? null,
            retailerPrice: listing?.retailerPrice ?? null,
            productTitle: listing?.productTitle ?? null,
            retailerUrl: listing?.retailerUrl ?? null,
          };
        }),
      });
    }

    await db.estimate.update({
      where: { id: estimateId },
      data: {
        extractedText: text,
        mechanicShopName: result.shopName,
        mechanicTotal: result.totalEstimate,
        laborTotal: result.laborTotal,
        status: "PARSED",
        errorMessage: needsVehicle
          ? "NEED_VEHICLE"
          : result.parts.length === 0
            ? "NO_PARTS"
            : null,
      },
    });

    await db.vehicle.update({
      where: { id: estimate.vehicleId },
      data: needsVehicle
        ? {
            year: detectedYear ?? new Date().getFullYear(),
            make: detectedMake ?? "Unknown",
            model: "Pending",
            engine: null,
            ...(detectedVin ? { vin: detectedVin } : {}),
          }
        : {
            year: detectedYear!,
            make: detectedMake ?? "Unknown",
            model: detectedModel!,
            ...(detectedEngine ? { engine: detectedEngine } : { engine: null }),
            ...(detectedVin ? { vin: detectedVin } : {}),
          },
    });

    if (!needsVehicle && result.parts.length > 0) {
      await buildComparisons(estimateId);
    }
  } catch (err) {
    await db.estimate.update({
      where: { id: estimateId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown parsing error",
      },
    });
  }

  revalidatePath(`/results/${estimateId}`);
}

/** Re-run parsing for a failed or weak estimate (applies latest OCR repairs). */
export async function retryEstimate(
  estimateId: string,
  opts?: { clearExtractedText?: boolean }
): Promise<void> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({ where: { id: estimateId } });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");

  if (opts?.clearExtractedText) {
    await db.estimate.update({
      where: { id: estimateId },
      data: {
        extractedText: null,
        errorMessage: null,
        status: "PARSED",
      },
    });
    await db.estimateItem.deleteMany({ where: { estimateId } });
    revalidatePath(`/results/${estimateId}`);
    return;
  }

  await processEstimate(estimateId);
}

/**
 * User pasted estimate text after OCR / image resolution failed.
 * Runs the local keyword scanner + heuristic parse on the pasted text.
 */
export async function reparseWithPastedText(
  estimateId: string,
  pastedText: string
): Promise<{ error?: string }> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({ where: { id: estimateId } });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");

  const text = pastedText.trim();
  if (text.length < 20) {
    return { error: "Paste more of the estimate — include part names and prices." };
  }

  await db.estimate.update({
    where: { id: estimateId },
    data: {
      extractedText: text,
      errorMessage: null,
      status: "PROCESSING",
    },
  });

  await processEstimate(estimateId);
  revalidatePath(`/results/${estimateId}`);
  revalidatePath("/catalog");
  return {};
}

/** Customer fills year/make/model when the estimate didn't print them clearly. */
export async function confirmEstimateVehicle(
  estimateId: string,
  input: { year: number; make: string; model: string; engine?: string; vin?: string }
): Promise<{ error?: string }> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { items: true },
  });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");

  const year = Number(input.year);
  const make = input.make.trim();
  // OCR / form sometimes appends "Engine" from a column header
  const model = input.model
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+Engine$/i, "")
    .trim();
  if (!Number.isFinite(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    return { error: "Enter a valid model year." };
  }
  if (make.length < 2) {
    return { error: "Select your vehicle make." };
  }
  if (model.length < 2 || model.toLowerCase() === "pending") {
    return { error: "Enter your model (e.g. Camry, Civic, 330i, F-150)." };
  }

  let vin = input.vin?.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase() || null;
  if (vin && vin.length !== 17) {
    return { error: "VIN must be exactly 17 characters (no I, O, or Q)." };
  }

  let engine = input.engine?.trim() ? input.engine.trim().toUpperCase() : null;
  let trim: string | null = null;
  let finalYear = year;
  let finalMake = make;
  let finalModel = model;

  if (vin) {
    const decoded = await decodeVin(vin);
    if (decoded && isTrustworthyVinDecode(decoded)) {
      if (decoded.year) finalYear = decoded.year;
      if (decoded.make) finalMake = normalizeMake(decoded.make) ?? finalMake;
      if (decoded.model) finalModel = decoded.model;
      if (decoded.engine) engine = decoded.engine;
      if (decoded.trim) trim = decoded.trim;
    }
  }

  await db.vehicle.update({
    where: { id: estimate.vehicleId },
    data: {
      year: finalYear,
      make: finalMake,
      model: finalModel,
      engine,
      trim,
      vin,
    },
  });
  await db.estimate.update({
    where: { id: estimateId },
    data: {
      errorMessage: estimate.items.length === 0 ? "NO_PARTS" : null,
    },
  });

  if (estimate.items.length > 0) {
    await buildComparisons(estimateId);
  }

  revalidatePath(`/results/${estimateId}`);
  revalidatePath("/catalog");
  return {};
}
