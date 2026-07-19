/**
 * Upsert full catalog seed to production DATABASE_URL.
 * Usage: npx tsx scripts/seed-catalog-prod.ts
 */
import { PrismaClient, StockStatus } from "@prisma/client";
import { catalogImageForCategory } from "../lib/catalog-images";

// Re-run the same parts list via dynamic import of seed is messy — call prisma seed instead.
// This script shells the upsert logic by importing compiled parts from a shared module.
// Simpler: exec the seed file's parts by requiring seed after setting DATABASE_URL.

async function main() {
  const url = process.env.DATABASE_URL?.replace(/\\r\\n/g, "").replace(/\r?\n/g, "").trim();
  if (!url) throw new Error("DATABASE_URL required");

  // Import parts by evaluating seed — instead duplicate thin wrapper:
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(
    "npx",
    ["tsx", "prisma/seed.ts"],
    {
      env: { ...process.env, DATABASE_URL: url },
      encoding: "utf8",
      shell: true,
    }
  );
  console.log(r.stdout);
  if (r.stderr) console.error(r.stderr);
  if (r.status !== 0) process.exit(r.status ?? 1);

  // Backfill imageUrl on any parts missing it
  const db = new PrismaClient({ datasources: { db: { url } } });
  const all = await db.catalogPart.findMany({ select: { id: true, category: true, imageUrl: true } });
  let n = 0;
  for (const p of all) {
    if (!p.imageUrl) {
      await db.catalogPart.update({
        where: { id: p.id },
        data: { imageUrl: catalogImageForCategory(p.category), stockStatus: StockStatus.IN_STOCK },
      });
      n++;
    }
  }
  console.log(`Backfilled images on ${n} parts. Total catalog: ${all.length}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
