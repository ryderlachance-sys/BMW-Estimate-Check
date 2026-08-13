import assert from "node:assert/strict";
import { parseEstimateHeuristically } from "../lib/ai/heuristic-parser";
import { scanEstimateKeywords } from "../lib/ai/keyword-scanner";

const samples = [
  {
    name: "dealer-style Toyota invoice",
    text: `
      CUSTOMER ESTIMATE
      Vehicle: 2020 Toyota Camry SE 2.5L
      FRONT BRAKE PAD SET 04465-33480   QTY 1   PARTS $189.99
      FRONT BRAKE ROTORS PAIR          QTY 1   PARTS $329.99
      ENGINE AIR FILTER                QTY 1   PARTS $49.99
      Labor $410.00   Estimate Total $979.97
    `,
    expected: { year: 2020, make: "Toyota", part: /brake/i },
  },
  {
    name: "flattened phone OCR Lexus estimate",
    text: `2019 LEXUS RX 350 VIN JTJZZZAA1K2123456\nRECOMMENDED REPAIRS\nFront ceramic brake pads .... 129.99\nFront brake rotor pair .... 239.99\nBattery 12V .... 159.99\nEngine air filter .... 24.99\nSHOP PARTS TOTAL 554.96`,
    expected: { year: 2019, make: "Lexus", part: /battery|brake/i },
  },
  {
    name: "tabular Ford truck estimate",
    text: `
      YEAR 2021 MAKE Ford MODEL F-150 ENGINE 3.5L EcoBoost
      DESCRIPTION                         PART NO       QTY      AMOUNT
      Rear Brake Rotor                    ML3Z2C026A     2       $318.00
      Rear Brake Pad Kit                  ML3Z2200E      1       $164.00
      Serpentine Belt                     JK6948         1       $72.50
      Parts subtotal $554.50
    `,
    expected: { year: 2021, make: "Ford", part: /rotor|belt/i },
  },
  {
    name: "noisy Jeep screenshot OCR",
    text: `AUTO SERVICE\nVehic1e 2017 Jeep G Cherokee 3.6L\nALTERNAT0R ASSEMBLY $894.00\nFR0NT BRAKE PAD SET $214.50\nDRIVE BELT 58.75\nTOTAL EST 1,447.25`,
    expected: { year: 2017, make: "Jeep", part: /belt|pad/i },
  },
  {
    name: "estimate without vehicle information",
    text: `Repair estimate\nFront brake pads $175.00\nFront rotors $320.00\nCabin air filter $65.00\nLabor $280.00\nTotal $840.00`,
    expected: { year: null, make: null, part: /brake|filter/i },
  },
];

for (const sample of samples) {
  const keyword = scanEstimateKeywords(sample.text);
  const parsed = parseEstimateHeuristically(sample.text);
  assert.equal(keyword.vehicle.year ?? parsed.vehicle.year, sample.expected.year, `${sample.name}: year`);
  assert.equal(keyword.vehicle.make ?? parsed.vehicle.make, sample.expected.make, `${sample.name}: make`);
  const descriptions = [...keyword.parts.map((part) => part.description), ...parsed.parts.map((part) => part.description)].join(" ");
  assert.match(descriptions, sample.expected.part, `${sample.name}: expected repair part`);
  assert.ok(keyword.parts.length + parsed.parts.length > 0, `${sample.name}: at least one part`);
  console.log(`✓ ${sample.name}`);
}

console.log(`Validated ${samples.length} estimate layouts.`);
