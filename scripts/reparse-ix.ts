import { PrismaClient } from "@prisma/client";
import { parseEstimateHeuristically } from "../lib/ai/heuristic-parser";
import { normalizeOemNumber } from "../lib/comparison";
import { buildComparisons } from "../lib/comparison";

const url = process.env.DATABASE_URL?.replace(/\\r\\n/g, "").replace(/\r?\n/g, "").trim();
const db = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const id = process.argv[2] ?? "cmrsainxg0004l104no68kncm";
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id },
    include: { vehicle: true },
  });
  if (!estimate.extractedText) throw new Error("no text");

  const parsed = parseEstimateHeuristically(estimate.extractedText);
  console.log("vehicle", parsed.vehicle, "parts", parsed.parts.length, "labor", parsed.laborTotal);

  const needsVehicle =
    !parsed.vehicle.year ||
    !parsed.vehicle.model ||
    parsed.vehicle.model.toLowerCase() === "pending";

  await db.estimateItem.deleteMany({ where: { estimateId: id } });
  if (parsed.parts.length > 0) {
    await db.estimateItem.createMany({
      data: parsed.parts.map((p) => ({
        estimateId: id,
        description: p.description,
        quantity: Math.max(1, p.quantity),
        mechanicPrice: p.mechanicPrice,
        oemPartNumber: normalizeOemNumber(p.oemPartNumber),
      })),
    });
  }

  await db.estimate.update({
    where: { id },
    data: {
      mechanicShopName: parsed.shopName,
      mechanicTotal: parsed.totalEstimate,
      laborTotal: parsed.laborTotal,
      status: "PARSED",
      errorMessage: needsVehicle
        ? "NEED_VEHICLE"
        : parsed.parts.length === 0
          ? "NO_PARTS"
          : null,
    },
  });

  await db.vehicle.update({
    where: { id: estimate.vehicleId },
    data: needsVehicle
      ? { model: "Pending", engine: null }
      : {
          year: parsed.vehicle.year!,
          model: parsed.vehicle.model!,
          engine: parsed.vehicle.engine,
        },
  });

  if (!needsVehicle && parsed.parts.length > 0) {
    await buildComparisons(id);
  }

  const updated = await db.estimate.findUniqueOrThrow({
    where: { id },
    include: { vehicle: true, items: true, comparisons: true },
  });
  console.log({
    vehicle: updated.vehicle,
    items: updated.items.length,
    comparisons: updated.comparisons.length,
    error: updated.errorMessage,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
