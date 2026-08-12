/**
 * Fault-tolerant local keyword scanner for shop estimates.
 * No external APIs — normalize, dictionary lookup, line-by-line part scan.
 */

export type KeywordVehicle = {
  year: number | null;
  make: string | null;
  model: string | null;
};

export type KeywordPart = {
  keyword: string;
  description: string;
  mechanicPrice: number;
  line: string;
};

export type KeywordScanResult = {
  normalized: string;
  vehicle: KeywordVehicle;
  parts: KeywordPart[];
};

/** 1) Lowercase + strip punctuation for matching. */
export function normalizeEstimateText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s$./-]/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 2) Any 4-digit year in 1990–2026. Prefers vehicle-labeled years. */
export function extractYearKeyword(text: string): number | null {
  const raw = text;

  // "Vehicle: 2019 Lexus…" / "veh year: 2019" / "model year 2019"
  const labeled = raw.match(
    /(?:vehicle|model\s*year|veh(?:icle)?\s*year|\byear\b)\s*[:=]?\s*(19[9]\d|20[0-2]\d)/i
  );
  if (labeled) {
    const y = Number(labeled[1]);
    if (y >= 1990 && y <= 2026) return y;
  }

  // Year sitting right before a make name
  const beforeMake = raw.match(
    /\b(19[9]\d|20[0-2]\d)\s+(?:bmw|toyota|honda|ford|lexus|jeep|chevrolet|chevy|nissan|hyundai|kia|subaru|mazda|audi|volkswagen|vw|ram|gmc|tesla|dodge)\b/i
  );
  if (beforeMake) {
    const y = Number(beforeMake[1]);
    if (y >= 1990 && y <= 2026) return y;
  }

  const years: number[] = [];
  for (const m of raw.matchAll(/\b(19[9]\d|20[0-2]\d)\b/g)) {
    const y = Number(m[1]);
    if (y >= 1990 && y <= 2026) years.push(y);
  }
  if (years.length === 0) return null;
  // Prefer car model years over invoice "Date: … 2026"
  const carish = years.filter((y) => y >= 1995 && y <= 2025);
  return carish[0] ?? years[0];
}

type MakeModelEntry = {
  make: string;
  model: string;
  /** All tokens must appear (order flexible) — used for multi-word models */
  must?: string[];
  /** Any of these phrases triggers (after normalize) */
  phrases: string[];
};

/**
 * 3) Local make/model dictionary. Phrases are matched on normalized text.
 * Jeep Grand Cherokee has explicit fuzzy variants.
 */
export const MAKE_MODEL_DICTIONARY: MakeModelEntry[] = [
  {
    make: "Jeep",
    model: "Grand Cherokee",
    phrases: [
      "grand cherokee",
      "g cherokee",
      "grandcherokee",
      "gr cherokee",
      "jeep grand cherokee",
      "jeep g cherokee",
    ],
  },
  { make: "Jeep", model: "Wrangler", phrases: ["wrangler", "jeep wrangler"] },
  { make: "Jeep", model: "Cherokee", phrases: ["jeep cherokee"] },
  { make: "BMW", model: "330i", phrases: ["330i", "330 i"] },
  { make: "BMW", model: "328i", phrases: ["328i", "328 i"] },
  { make: "BMW", model: "335i", phrases: ["335i"] },
  { make: "BMW", model: "340i", phrases: ["340i", "m340i"] },
  { make: "BMW", model: "M5", phrases: ["bmw m5", " m5 "] },
  { make: "BMW", model: "X5", phrases: ["bmw x5", " x5 "] },
  { make: "Toyota", model: "Camry", phrases: ["camry", "toyota camry"] },
  { make: "Toyota", model: "RAV4", phrases: ["rav4", "rav 4", "toyota rav4"] },
  { make: "Toyota", model: "Corolla", phrases: ["corolla", "toyota corolla"] },
  { make: "Toyota", model: "Tacoma", phrases: ["tacoma", "toyota tacoma"] },
  { make: "Honda", model: "Civic", phrases: ["civic", "honda civic"] },
  { make: "Honda", model: "Accord", phrases: ["accord", "honda accord"] },
  { make: "Honda", model: "CR-V", phrases: ["cr-v", "crv", "honda cr-v", "honda crv"] },
  { make: "Ford", model: "F-150", phrases: ["f-150", "f150", "f 150", "ford f-150"] },
  { make: "Ford", model: "Mustang", phrases: ["mustang", "ford mustang"] },
  { make: "Ford", model: "Escape", phrases: ["ford escape", " escape "] },
  { make: "Chevrolet", model: "Silverado", phrases: ["silverado", "chevy silverado"] },
  { make: "Chevrolet", model: "Equinox", phrases: ["equinox"] },
  { make: "Nissan", model: "Altima", phrases: ["altima", "nissan altima"] },
  { make: "Nissan", model: "Rogue", phrases: ["nissan rogue", " rogue "] },
  { make: "Subaru", model: "Outback", phrases: ["outback", "subaru outback"] },
  { make: "Subaru", model: "Forester", phrases: ["forester", "subaru forester"] },
  { make: "Hyundai", model: "Elantra", phrases: ["elantra", "hyundai elantra"] },
  { make: "Hyundai", model: "Tucson", phrases: ["tucson", "hyundai tucson"] },
  { make: "Kia", model: "Sportage", phrases: ["sportage", "kia sportage"] },
  { make: "Mazda", model: "CX-5", phrases: ["cx-5", "cx5", "mazda cx-5"] },
  { make: "Volkswagen", model: "Jetta", phrases: ["jetta", "vw jetta"] },
  { make: "Audi", model: "A4", phrases: ["audi a4", " a4 "] },
  { make: "Lexus", model: "RX", phrases: ["lexus rx", "rx 350", "rx350"] },
  { make: "Ram", model: "1500", phrases: ["ram 1500", "ram1500"] },
  { make: "GMC", model: "Sierra", phrases: ["gmc sierra", "sierra 1500"] },
  { make: "Tesla", model: "Model 3", phrases: ["model 3", "tesla model 3"] },
  { make: "Tesla", model: "Model Y", phrases: ["model y", "tesla model y"] },
];

/** Jeep Grand Cherokee: keywords near each other in normalized text. */
export function detectJeepGrandCherokee(normalized: string): boolean {
  const hasJeep = /\bjeep\b/.test(normalized);
  const hasGrandCherokee =
    /\bgrand\s*cherokee\b/.test(normalized) ||
    /\bg\s*cherokee\b/.test(normalized) ||
    /\bgr(?:and)?\s*cherokee\b/.test(normalized);
  const hasCherokee = /\bcherokee\b/.test(normalized);

  if (hasGrandCherokee) return true;
  if (hasJeep && hasCherokee) {
    // Proximity: within ~40 chars of each other
    const jeepIdx = normalized.search(/\bjeep\b/);
    const cherIdx = normalized.search(/\bcherokee\b/);
    if (jeepIdx >= 0 && cherIdx >= 0 && Math.abs(jeepIdx - cherIdx) < 40) return true;
  }
  return false;
}

export function extractMakeModelKeyword(normalized: string): {
  make: string | null;
  model: string | null;
} {
  // Specific Jeep Grand Cherokee fuzzy check first
  if (detectJeepGrandCherokee(normalized)) {
    return { make: "Jeep", model: "Grand Cherokee" };
  }

  // Longer phrases first
  const sorted = [...MAKE_MODEL_DICTIONARY].sort(
    (a, b) =>
      Math.max(...b.phrases.map((p) => p.length)) - Math.max(...a.phrases.map((p) => p.length))
  );

  for (const entry of sorted) {
    for (const phrase of entry.phrases) {
      const needle = phrase.trim();
      if (needle.length < 3) continue;
      // Word-ish boundaries for short tokens
      const re =
        needle.length <= 4
          ? new RegExp(`(?:^|\\s)${escapeRe(needle)}(?:\\s|$)`)
          : new RegExp(escapeRe(needle));
      if (re.test(normalized)) {
        return { make: entry.make, model: entry.model };
      }
    }
  }

  // Make-only fallback
  const makes = [
    "bmw",
    "toyota",
    "honda",
    "ford",
    "chevrolet",
    "chevy",
    "nissan",
    "jeep",
    "hyundai",
    "kia",
    "subaru",
    "mazda",
    "volkswagen",
    "vw",
    "audi",
    "lexus",
    "ram",
    "gmc",
    "tesla",
    "dodge",
  ];
  for (const m of makes) {
    if (new RegExp(`\\b${m}\\b`).test(normalized)) {
      const make =
        m === "chevy" ? "Chevrolet" : m === "vw" ? "Volkswagen" : m.charAt(0).toUpperCase() + m.slice(1);
      return { make: make === "Bmw" ? "BMW" : make, model: null };
    }
  }

  return { make: null, model: null };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 4) Common part keywords (longer phrases first when scanning). */
export const PART_KEYWORDS = [
  "spark plug",
  "control arm",
  "water pump",
  "oil filter",
  "air filter",
  "cabin filter",
  "brake pad",
  "brake pads",
  "brake rotor",
  "serpentine belt",
  "timing belt",
  "valve cover",
  "ignition coil",
  "wheel bearing",
  "tie rod",
  "ball joint",
  "alternator",
  "radiator",
  "thermostat",
  "compressor",
  "caliper",
  "strut",
  "shock",
  "rotor",
  "rotors",
  "pad",
  "pads",
  "belt",
  "gasket",
  "sensor",
  "battery",
  "starter",
  "hose",
  "mount",
  "bushing",
  "wiper",
  "coil",
  "filter",
  "plug",
  "plugs",
] as const;

const MONEY_ON_LINE =
  /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(?<![\d.])(\d{1,3}(?:,\d{3})*\.\d{2})(?![\d%])/g;

function priceOnLine(line: string): number | null {
  const values: number[] = [];
  for (const m of line.matchAll(MONEY_ON_LINE)) {
    const raw = m[1] ?? m[2];
    if (raw) values.push(Number(raw.replace(/,/g, "")));
  }
  if (values.length === 0) return null;
  return values[values.length - 1];
}

const SKIP_PART_LINE =
  /\b(labor|labour|tax|subtotal|grand total|shop supply|diagnosis|diagnostic|job time|r\s*&\s*r|r\s*\/\s*r|replacement|hr\s*@|hours?\s*@)\b/i;

/**
 * Line-by-line: if a part keyword appears, grab keyword + dollar amount on that line.
 */
export function extractPartsByKeyword(text: string): KeywordPart[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const found: KeywordPart[] = [];
  const keywords = [...PART_KEYWORDS].sort((a, b) => b.length - a.length);

  for (const line of lines) {
    if (SKIP_PART_LINE.test(line)) continue;
    const price = priceOnLine(line);
    if (price == null || price <= 0 || price > 2500) continue;

    const normLine = normalizeEstimateText(line);
    let hit: string | null = null;
    for (const kw of keywords) {
      if (normLine.includes(kw)) {
        hit = kw;
        break;
      }
    }
    if (!hit) continue;

    found.push({
      keyword: hit,
      description: line.replace(/\s+/g, " ").trim().slice(0, 120),
      mechanicPrice: price,
      line,
    });
  }

  // Dedupe by keyword + price
  const deduped: KeywordPart[] = [];
  for (const p of found) {
    if (deduped.some((d) => d.keyword === p.keyword && d.mechanicPrice === p.mechanicPrice)) {
      continue;
    }
    deduped.push(p);
  }
  return deduped;
}

/** Full local scan — no network. */
export function scanEstimateKeywords(text: string): KeywordScanResult {
  const normalized = normalizeEstimateText(text);
  const year = extractYearKeyword(text);
  const { make, model } = extractMakeModelKeyword(normalized);
  const parts = extractPartsByKeyword(text);

  return {
    normalized,
    vehicle: { year, make, model },
    parts,
  };
}
