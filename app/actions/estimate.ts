"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import { extractTextFromFile, getImageForAi } from "@/lib/ai/extract-text";
import { hasAiConfigured, parseEstimate } from "@/lib/ai/parse-estimate";
import { parseEstimateHeuristically } from "@/lib/ai/heuristic-parser";
import type { ParsedEstimate } from "@/lib/ai/schema";
import { ocrQualityScore, repairOcrText } from "@/lib/ocr/repair";
import { buildComparisons, normalizeOemNumber } from "@/lib/comparison";

const CreateEstimateSchema = z.object({
  fileUrl: z
    .string()
    .min(1, "Please upload your estimate first")
    .refine(
      (v) => v.startsWith("/uploads/") || /^https?:\/\//.test(v),
      "Invalid uploaded file reference"
    ),
  fileType: z.string().min(1, "Please upload your estimate first"),
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

  if (data.fileType.startsWith("image/") && !(data.extractedText && data.extractedText.trim().length > 10)) {
    return {
      error:
        "Could not read text from that photo. Try a clearer image, or upload the estimate as a PDF.",
    };
  }

  // Placeholder — year/model/engine are filled from the estimate during processEstimate.
  const vehicle = await db.vehicle.create({
    data: {
      userId: user.id,
      year: new Date().getFullYear(),
      make: "BMW",
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
    let text: string | null = estimate.extractedText
      ? repairOcrText(estimate.extractedText)
      : null;

    const clientScore = text ? ocrQualityScore(text) : 0;
    // Prefer solid browser OCR. If it's weak (or missing), try server extraction
    // (works locally; may fail on Vercel — then we keep client text).
    if (!text || text.trim().length < 10 || (isImage && clientScore < 40)) {
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

    let result: ParsedEstimate;
    if (hasAiConfigured()) {
      try {
        result = await parseEstimate(
          isImage && !text
            ? { imageUrl: await getImageForAi(estimate.originalFileUrl, estimate.originalFileType) }
            : { text: text ?? "" }
        );
      } catch {
        if (!text) throw new Error("Could not read any text from this file.");
        result = parseEstimateHeuristically(text);
      }
    } else if (text) {
      result = parseEstimateHeuristically(text);
    } else {
      throw new Error("Could not read any text from this file.");
    }

    // Prefer vehicle printed on the estimate; if missing, keep Pending and ask the user.
    const detectedYear = result.vehicle.year;
    const detectedModel = result.vehicle.model;
    const detectedEngine = result.vehicle.engine;
    const needsVehicle =
      !detectedYear ||
      !detectedModel ||
      detectedModel.toLowerCase() === "pending";

    await db.estimateItem.deleteMany({ where: { estimateId } });
    if (result.parts.length > 0) {
      await db.estimateItem.createMany({
        data: result.parts.map((p) => ({
          estimateId,
          description: p.description,
          quantity: Math.max(1, p.quantity),
          mechanicPrice: p.mechanicPrice,
          oemPartNumber: normalizeOemNumber(p.oemPartNumber),
        })),
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
            model: "Pending",
            engine: null,
          }
        : {
            year: detectedYear!,
            model: detectedModel!,
            ...(detectedEngine ? { engine: detectedEngine } : { engine: null }),
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
export async function retryEstimate(estimateId: string): Promise<void> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({ where: { id: estimateId } });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");
  await processEstimate(estimateId);
}

/** Customer fills year/model only when the estimate didn't print them clearly. */
export async function confirmEstimateVehicle(
  estimateId: string,
  input: { year: number; model: string; engine?: string }
): Promise<{ error?: string }> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { items: true },
  });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");

  const year = Number(input.year);
  const model = input.model.trim().replace(/\s+/g, "");
  if (!Number.isFinite(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    return { error: "Enter a valid model year." };
  }
  if (model.length < 2 || model.toLowerCase() === "pending") {
    return { error: "Enter your BMW model (e.g. 330i, M5, X5)." };
  }

  const engine = input.engine?.trim() ? input.engine.trim().toUpperCase() : null;

  await db.vehicle.update({
    where: { id: estimate.vehicleId },
    data: { year, model, engine },
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
