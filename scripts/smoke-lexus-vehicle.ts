/**
 * Health-check smoke: Lexus sample vehicle + untrustworthy VIN must not win.
 * Run: npx tsx --conditions=react-server scripts/smoke-lexus-vehicle.ts
 */
import { readFileSync } from "node:fs";
import { extractVehicleFromText, parseEstimateHeuristically } from "../lib/ai/heuristic-parser";
import { decodeVin, isTrustworthyVinDecode } from "../lib/vin";

async function main() {
  const text = readFileSync("public/samples/lexus-rx350-test-estimate.txt", "utf8");
  const vehicle = extractVehicleFromText(text);
  const parsed = parseEstimateHeuristically(text);
  const decoded = await decodeVin("JTJBARBZ5K2123456");

  console.log("extractVehicleFromText", vehicle);
  console.log("heuristic vehicle", parsed.vehicle);
  console.log(
    "heuristic parts",
    parsed.parts.map((p) => `${p.description}: $${p.mechanicPrice}`)
  );
  console.log("nhtsa", {
    model: decoded?.model,
    engine: decoded?.engine,
    rawError: decoded?.rawError,
    trustworthy: decoded ? isTrustworthyVinDecode(decoded) : null,
  });

  const partsOk =
    parsed.parts.length >= 3 &&
    parsed.parts.some((p) => /pad/i.test(p.description)) &&
    parsed.parts.some((p) => /rotor/i.test(p.description)) &&
    parsed.parts.some((p) => /alternator/i.test(p.description));

  const vehicleOk =
    vehicle.year === 2019 &&
    vehicle.make === "Lexus" &&
    /^RX\s*350$/i.test(vehicle.model ?? "");

  const vinGuardOk = Boolean(decoded && !isTrustworthyVinDecode(decoded));

  if (!vehicleOk || !partsOk || !vinGuardOk) {
    console.error("SMOKE_FAIL", { vehicleOk, partsOk, vinGuardOk });
    process.exit(1);
  }
  console.log("SMOKE_OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
