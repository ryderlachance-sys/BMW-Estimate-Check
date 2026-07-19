/**
 * Upsert B46/B48 430i catalog parts + rematch one estimate.
 * Usage: npx tsx --conditions=react-server scripts/seed-430i-and-rematch.ts <estimateId>
 */
import { PrismaClient } from "@prisma/client";
import { buildComparisons } from "../lib/comparison";
import { parseEstimateHeuristically } from "../lib/ai/heuristic-parser";
import { normalizeOemNumber } from "../lib/comparison";

const url = process.env.DATABASE_URL?.replace(/\\r\\n/g, "").replace(/\r?\n/g, "").trim();
const db = new PrismaClient({ datasources: { db: { url } } });

const parts430i = [
  {
    sku: "BMW-11427589156",
    brand: "Genuine BMW",
    name: "Oil Filter Housing Gasket (B46/B48)",
    description:
      "Genuine BMW oil filter housing gasket for B46/B48 engines in 430i, 330i, and 230i. Common oil leak repair.",
    category: "Gaskets & Seals",
    oemNumbers: ["11427589156", "11428613157"],
    compatibleModels: ["430i", "330i", "230i", "530i", "X3", "X4"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 18.99,
  },
  {
    sku: "BMW-11428637840",
    brand: "Genuine BMW",
    name: "Oil Filter Housing (B46/B48)",
    description:
      "Genuine BMW oil filter housing assembly for B46/B48. Often replaced when the housing cracks or the gasket leaks repeatedly.",
    category: "Engine",
    oemNumbers: ["11428637840", "11428511253"],
    compatibleModels: ["430i", "330i", "230i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 189.99,
  },
  {
    sku: "PIE-11518658955",
    brand: "Pierburg",
    name: "Water Pump with Pulley (B46/B48)",
    description:
      "OE-supplier water pump with pulley for B46/B48 engines. Fits 430i / 330i / 230i.",
    category: "Cooling",
    oemNumbers: ["11518658955", "11518617169"],
    compatibleModels: ["430i", "330i", "230i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 149.99,
  },
  {
    sku: "BMW-11538647941",
    brand: "Genuine BMW",
    name: "Turbo Coolant Line",
    description:
      "Genuine BMW turbocharger coolant line for B46/B48 turbo engines. Sold individually — cars often need two.",
    category: "Cooling",
    oemNumbers: ["11538647941", "11538647942"],
    compatibleModels: ["430i", "330i", "230i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 42.99,
  },
  {
    sku: "BMW-11537589122",
    brand: "Genuine BMW",
    name: "Coolant Pipe O-Ring",
    description: "Genuine BMW coolant pipe O-ring / seal for B46/B48 cooling circuit repairs.",
    category: "Cooling",
    oemNumbers: ["11537589122", "07119906362"],
    compatibleModels: ["430i", "330i", "230i", "340i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 6.99,
  },
];

async function main() {
  const estimateId = process.argv[2];
  if (!estimateId) throw new Error("Pass estimate id");

  for (const part of parts430i) {
    await db.catalogPart.upsert({
      where: { sku: part.sku },
      update: { ...part, stockStatus: "IN_STOCK" },
      create: { ...part, stockStatus: "IN_STOCK" },
    });
    console.log("upserted", part.sku);
  }

  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { vehicle: true },
  });

  // Prefer stored OCR text; re-parse with improved heuristic
  const text = estimate.extractedText;
  if (!text || text.length < 40) {
    throw new Error("Estimate has no extracted text — run reparse-estimate.ts first");
  }

  const parsed = parseEstimateHeuristically(text);
  console.log("parsed parts:", parsed.parts.map((p) => `${p.description} @ ${p.mechanicPrice}`));

  // Update vehicle if we got a better read
  if (parsed.vehicle.year && parsed.vehicle.model) {
    await db.vehicle.update({
      where: { id: estimate.vehicleId },
      data: {
        year: parsed.vehicle.year,
        model: parsed.vehicle.model,
        ...(parsed.vehicle.engine ? { engine: parsed.vehicle.engine } : {}),
      },
    });
  }

  await db.$transaction([
    db.comparison.deleteMany({ where: { estimateId } }),
    db.estimateItem.deleteMany({ where: { estimateId } }),
    db.estimateItem.createMany({
      data: parsed.parts.map((p) => ({
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
        mechanicShopName: parsed.shopName,
        mechanicTotal: parsed.totalEstimate,
        laborTotal: parsed.laborTotal,
        status: "PARSED",
        errorMessage: null,
      },
    }),
  ]);

  await buildComparisons(estimateId);

  const updated = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: {
      items: true,
      comparisons: { include: { catalogPart: true } },
    },
  });

  const savings = updated.comparisons.reduce((s, c) => s + Math.max(0, c.savings), 0);
  console.log({
    status: updated.status,
    items: updated.items.length,
    matches: updated.comparisons.length,
    savings: Math.round(savings * 100) / 100,
    matchesDetail: updated.comparisons.map(
      (c) =>
        `${c.catalogPart.name}: shop $${c.mechanicPrice} → $${c.ourPrice} (save $${c.savings})`
    ),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
