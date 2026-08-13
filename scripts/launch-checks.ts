import assert from "node:assert/strict";
import { buildAmazonLink, buildEbayLink } from "../lib/affiliates";
import { findCuratedListing } from "../lib/curated-listings";
import { scanEstimateKeywords } from "../lib/ai/keyword-scanner";

const jeep = scanEstimateKeywords(`
  Vehicle: 2020 Jeep G Cherokee
  Front brake pads $450.00
  Alternator assembly 725.50
  Labor $300.00
`);
assert.deepEqual(jeep.vehicle, { year: 2020, make: "Jeep", model: "Grand Cherokee" });
assert.equal(jeep.parts.length, 2);
assert.equal(jeep.parts[0]?.mechanicPrice, 450);

const amazon = buildAmazonLink({
  brand: "TRQ",
  name: "Front brake rotors",
  amazonAsin: "B09HZ459FG",
});
assert.equal(amazon.isProductPage, true);
assert.match(amazon.url, /^https:\/\/www\.amazon\.com\/dp\/B09HZ459FG/);

const ebay = buildEbayLink({
  brand: "Bosch",
  name: "Alternator",
  ebayItemId: "123456789012",
});
assert.equal(ebay.isProductPage, true);
assert.match(ebay.url, /^https:\/\/www\.ebay\.com\/itm\/123456789012/);

const lexusRotor = findCuratedListing({
  year: 2021,
  make: "Lexus",
  model: "ES 350",
  description: "Front brake rotor pair",
});
assert.equal(lexusRotor?.amazonAsin, "B09HZ459FG");
assert.equal(lexusRotor?.retailerPrice, 92.95);

console.log("Launch checks passed: parsing, vehicle detection, pricing, and direct retailer links.");
