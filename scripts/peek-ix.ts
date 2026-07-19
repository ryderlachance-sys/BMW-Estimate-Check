import { PrismaClient } from "@prisma/client";
import { extractVehicleFromText } from "../lib/ai/heuristic-parser";

const url = process.env.DATABASE_URL?.replace(/\\r\\n/g, "").replace(/\r?\n/g, "").trim();
const db = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const id = process.argv[2] ?? "cmrsainxg0004l104no68kncm";
  const e = await db.estimate.findUnique({
    where: { id },
    include: { items: true, vehicle: true, comparisons: true },
  });
  if (!e) {
    console.log("not found");
    return;
  }
  console.log({
    status: e.status,
    error: e.errorMessage,
    vehicle: e.vehicle,
    items: e.items.map((i) => ({ d: i.description, p: i.mechanicPrice })),
    textSnippet: e.extractedText?.slice(0, 1500),
    extractedVehicle: e.extractedText ? extractVehicleFromText(e.extractedText) : null,
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
