export type CuratedListing = {
  retailerName: "Amazon" | "AutoPartsPrime";
  retailerPrice: number;
  amazonAsin?: string;
  retailerUrl?: string;
  productTitle: string;
  fitmentNote: string;
};

const listings: Array<{
  make: string;
  model: RegExp;
  years: [number, number];
  part: RegExp;
  listing: CuratedListing;
}> = [
  {
    make: "lexus",
    model: /\bes\s*350\b/i,
    years: [2019, 2022],
    part: /front.*(?:ceramic.*)?brake.*pad|front.*brake.*pad/i,
    listing: {
      retailerName: "Amazon",
      retailerPrice: 39.49,
      amazonAsin: "B0BHL39JV9",
      productTitle: "Bosch BE2076H Blue Ceramic Front Brake Pad Set with Hardware",
      fitmentNote: "Fits 2021 Lexus ES 350 front brakes · Amazon must show BE2076H — do not select another variation",
    },
  },
  {
    make: "lexus",
    model: /\bes\s*350\b/i,
    years: [2019, 2024],
    part: /front.*brake.*rotor.*(?:pair|set)|front.*rotor.*(?:pair|set)/i,
    listing: {
      retailerName: "Amazon",
      retailerPrice: 92.95,
      amazonAsin: "B09HZ459FG",
      productTitle: "TRQ BRA72719 Front Vented Brake Rotor Set",
      fitmentNote: "Fits 2019–2022 Lexus ES 350 · Amazon must show Style BRA72719 — do not select another variation",
    },
  },
  {
    make: "lexus",
    model: /\bes\s*350\b/i,
    years: [2019, 2024],
    part: /alternator/i,
    listing: {
      retailerName: "AutoPartsPrime",
      retailerPrice: 361.87,
      retailerUrl:
        "https://www.autopartsprime.com/lexus/alternator-assembly-with-regulator/oe-270600p440",
      productTitle: "Genuine Lexus Alternator Assembly 27060-0P440",
      fitmentNote: "Exact Lexus OEM 27060-0P440 · 3.5L V6 — confirm this number before buying",
    },
  },
];

export function findCuratedListing(input: {
  year: number | null;
  make: string | null;
  model: string | null;
  description: string;
}): CuratedListing | null {
  if (!input.year || !input.make || !input.model) return null;
  const make = input.make.trim().toLowerCase();
  return (
    listings.find(
      (entry) =>
        entry.make === make &&
        entry.model.test(input.model ?? "") &&
        input.year! >= entry.years[0] &&
        input.year! <= entry.years[1] &&
        entry.part.test(input.description)
    )?.listing ?? null
  );
}
