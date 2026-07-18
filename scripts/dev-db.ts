/**
 * Runs a local embedded PostgreSQL server for development — no Docker or
 * system Postgres install required. Data persists in ./.pgdata.
 *
 * Usage: npm run db:local   (keep it running in its own terminal)
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".pgdata");
const DB_NAME = "bmw_estimate_check";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

async function main() {
  const alreadyInitialized = existsSync(path.join(DATA_DIR, "PG_VERSION"));

  if (!alreadyInitialized) {
    console.log("Initializing embedded PostgreSQL data directory…");
    await pg.initialise();
  }

  await pg.start();

  if (!alreadyInitialized) {
    await pg.createDatabase(DB_NAME);
    console.log(`Created database "${DB_NAME}".`);
  }

  console.log("PostgreSQL is running on postgresql://postgres:postgres@localhost:5432");
  console.log("Press Ctrl+C to stop.");
}

async function shutdown() {
  console.log("\nStopping PostgreSQL…");
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (err) => {
  console.error(err);
  try {
    await pg.stop();
  } catch {}
  process.exit(1);
});
