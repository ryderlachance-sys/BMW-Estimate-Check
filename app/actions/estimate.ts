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
import { buildComparisons, normalizeOemNumber } from "@/lib/comparison";

const CreateEstimateSchema = z.object({
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional(),
  engine: z.string().optional(),
  vin: z
    .string()
    .optional()
    .refine((v) => !v || /^[A-HJ-NPR-Z0-9]{17}$/i.test(v), "VIN must be 17 characters"),
  fileUrl: z
    .string()
    .min(1, "Please upload your estimate first")
    .refine(
      (v) => v.startsWith("/uploads/") || /^https?:\/\//.test(v),
      "Invalid uploaded file reference"
    ),
  fileType: z.string().min(1, "Please upload your estimate first"),
});

export type CreateEstimateState = { error?: string } | null;

export async function createEstimate(
  _prev: CreateEstimateState,
  formData: FormData
): Promise<CreateEstimateState> {
  const user = await ensureUser();

  const parsed = CreateEstimateSchema.safeParse({
    year: formData.get("year"),
    model: formData.get("model"),
    trim: formData.get("trim") || undefined,
    engine: formData.get("engine") || undefined,
    vin: formData.get("vin") || undefined,
    fileUrl: formData.get("fileUrl"),
    fileType: formData.get("fileType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const vehicle = await db.vehicle.create({
    data: {
      userId: user.id,
      year: data.year,
      make: "BMW",
      model: data.model,
      trim: data.trim ?? null,
      engine: data.engine ?? null,
      vin: data.vin ? data.vin.toUpperCase() : null,
    },
  });

  const estimate = await db.estimate.create({
    data: {
      userId: user.id,
      vehicleId: vehicle.id,
      originalFileUrl: data.fileUrl,
      originalFileType: data.fileType,
      status: "PROCESSING",
    },
  });

  // Parse in the background so the upload form can redirect immediately.
  // Photo OCR is too slow to finish inside the form POST on Vercel.
  after(async () => {
    try {
      await processEstimate(estimate.id);
    } catch (err) {
      console.error("background processEstimate failed", err);
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
    const { text, isImage } = await extractTextFromFile(
      estimate.originalFileUrl,
      estimate.originalFileType
    );

    let result: ParsedEstimate;
    if (hasAiConfigured()) {
      try {
        result = await parseEstimate(
          isImage
            ? { imageUrl: await getImageForAi(estimate.originalFileUrl, estimate.originalFileType) }
            : { text: text ?? "" }
        );
      } catch {
        // AI provider unavailable — fall back to the free built-in parser
        // (PDF text or OCR text) rather than failing the whole estimate.
        if (!text) throw new Error("Could not read any text from this file.");
        result = parseEstimateHeuristically(text);
      }
    } else if (text) {
      result = parseEstimateHeuristically(text);
    } else {
      throw new Error("Could not read any text from this file.");
    }

    if (result.parts.length === 0) {
      throw new Error(
        "No part line items could be found on this estimate. Try a clearer photo or the original PDF."
      );
    }

    await db.$transaction([
      db.estimateItem.deleteMany({ where: { estimateId } }),
      db.estimateItem.createMany({
        data: result.parts.map((p) => ({
          estimateId,
          description: p.description,
          quantity: Math.max(1, p.quantity),
          mechanicPrice: p.mechanicPrice,
          oemPartNumber: normalizeOemNumber(p.oemPartNumber),
        })),
      }),
      db.estimate.update({
        where: { id: estimateId },
        data: {
          extractedText: text,
          mechanicShopName: result.shopName,
          mechanicTotal: result.totalEstimate,
          laborTotal: result.laborTotal,
          status: "PARSED",
        },
      }),
    ]);

    await buildComparisons(estimateId);
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

/** Re-run AI parsing for a failed estimate. */
export async function retryEstimate(estimateId: string): Promise<void> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({ where: { id: estimateId } });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");
  await processEstimate(estimateId);
}
