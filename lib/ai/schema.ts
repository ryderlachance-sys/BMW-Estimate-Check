import { z } from "zod";

export const ParsedEstimateSchema = z.object({
  shopName: z.string().nullable().describe("Name of the repair shop, if present"),
  vehicle: z
    .object({
      year: z.number().int().nullable(),
      make: z
        .string()
        .nullable()
        .describe("Vehicle make/manufacturer if present, e.g. BMW, Toyota, Honda, Ford"),
      model: z.string().nullable(),
      engine: z.string().nullable(),
    })
    .describe("Vehicle info found on the estimate, if any"),
  laborTotal: z
    .number()
    .nullable()
    .describe("Total labor charges in USD across all line items"),
  parts: z
    .array(
      z.object({
        description: z.string().describe("Part name / line item description"),
        quantity: z.number().int().describe("Quantity for this line, minimum 1"),
        mechanicPrice: z
          .number()
          .describe("Total price quoted by the mechanic for this line (parts only, all quantities)"),
        oemPartNumber: z
          .string()
          .nullable()
          .describe(
            "OEM / manufacturer part number if printed (BMW 11-digit, Toyota 5-5, Honda 5-3-3, etc.), digits/letters only"
          ),
      })
    )
    .describe("Every part line item on the estimate. Exclude labor, shop fees and taxes."),
  totalEstimate: z
    .number()
    .nullable()
    .describe("Grand total of the estimate in USD including labor and fees"),
});

export type ParsedEstimate = z.infer<typeof ParsedEstimateSchema>;
