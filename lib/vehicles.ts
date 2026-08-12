/** Supported vehicle makes and popular models for confirm forms + parsing. */

export const MAKES = [
  "BMW",
  "Toyota",
  "Honda",
  "Ford",
  "Chevrolet",
  "Nissan",
  "Hyundai",
  "Kia",
  "Subaru",
  "Mazda",
  "Volkswagen",
  "Audi",
  "Mercedes-Benz",
  "Lexus",
  "Jeep",
  "Ram",
  "GMC",
  "Dodge",
  "Tesla",
  "Other",
] as const;

export type Make = (typeof MAKES)[number];

export const MODELS_BY_MAKE: Record<string, string[]> = {
  BMW: [
    "228i", "230i", "320i", "328i", "330i", "335i", "340i", "M340i",
    "428i", "430i", "435i", "440i", "530i", "535i", "540i", "550i",
    "630i", "640i", "650i",
    "M2", "M3", "M4", "M5", "M8",
    "X1", "X2", "X3", "X4", "X5", "X6", "X7",
    "Z4", "i3", "i4", "i5", "i7", "iX",
  ],
  Toyota: [
    "Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "Prius",
    "4Runner", "Sienna", "Avalon", "C-HR", "Venza",
  ],
  Honda: [
    "Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline",
    "Passport", "Fit", "Insight",
  ],
  Ford: [
    "F-150", "F-250", "Mustang", "Escape", "Explorer", "Edge", "Bronco",
    "Ranger", "Focus", "Fusion", "Expedition",
  ],
  Chevrolet: [
    "Silverado", "Equinox", "Malibu", "Tahoe", "Suburban", "Traverse",
    "Colorado", "Camaro", "Trax",
  ],
  Nissan: ["Altima", "Sentra", "Rogue", "Pathfinder", "Frontier", "Maxima", "Murano"],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Kona"],
  Kia: ["Forte", "K5", "Sportage", "Telluride", "Sorento", "Soul"],
  Subaru: ["Outback", "Forester", "Crosstrek", "Impreza", "Legacy", "Ascent"],
  Mazda: ["Mazda3", "Mazda6", "CX-5", "CX-30", "CX-50", "CX-9", "MX-5"],
  Volkswagen: ["Jetta", "Golf", "Passat", "Tiguan", "Atlas", "ID.4"],
  Audi: ["A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "Q8"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE", "CLA", "S-Class"],
  Lexus: ["RX", "ES", "NX", "IS", "GX", "UX"],
  Jeep: ["Wrangler", "Grand Cherokee", "Cherokee", "Gladiator", "Compass"],
  Ram: ["1500", "2500", "3500"],
  GMC: ["Sierra", "Yukon", "Terrain", "Acadia", "Canyon"],
  Dodge: ["Charger", "Challenger", "Durango", "Hornet"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
  Other: [],
};

const MAKE_RE =
  /\b(BMW|Toyota|Honda|Ford|Chevrolet|Chevy|Nissan|Hyundai|Kia|Subaru|Mazda|Volkswagen|VW|Audi|Mercedes[- ]?Benz|Mercedes|Lexus|Jeep|Ram|GMC|Dodge|Tesla|Acura|Buick|Cadillac|Chrysler|Infiniti|Lincoln|Volvo|Porsche|Mini)\b/i;

const NON_BMW_MODELS =
  /\b(Camry|Corolla|RAV4|Highlander|Tacoma|Tundra|Prius|4Runner|Sienna|Civic|Accord|CR-?V|Pilot|Odyssey|HR-?V|F-?150|F-?250|Mustang|Escape|Explorer|Edge|Bronco|Ranger|Silverado|Equinox|Malibu|Tahoe|Altima|Sentra|Rogue|Elantra|Sonata|Tucson|Santa\s*Fe|Outback|Forester|Crosstrek|Jetta|Golf|Tiguan|Wrangler|Grand\s*Cherokee|Model\s*[3YXS]|CX-?[3590]+|Mazda[36])\b/i;

export function normalizeMake(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/\s+/g, " ");
  const lower = t.toLowerCase();
  if (lower === "chevy") return "Chevrolet";
  if (lower === "vw") return "Volkswagen";
  if (lower.startsWith("mercedes")) return "Mercedes-Benz";
  if (lower === "mini") return "MINI";
  const hit = MAKES.find((m) => m.toLowerCase() === lower);
  if (hit) return hit;
  return t
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(t.includes("-") ? "-" : " ");
}

/** Infer make from free text (estimates, OCR). */
export function extractMakeFromText(text: string): string | null {
  const full = text.replace(/\s+/g, " ");
  const labeled = full.match(
    /\b(?:make|manufacturer|vehicle)\s*:?\s*(BMW|Toyota|Honda|Ford|Chevrolet|Chevy|Nissan|Hyundai|Kia|Subaru|Mazda|Volkswagen|VW|Audi|Mercedes[- ]?Benz|Mercedes|Lexus|Jeep|Ram|GMC|Dodge|Tesla)\b/i
  );
  if (labeled) return normalizeMake(labeled[1]);

  const m = full.match(MAKE_RE);
  if (m) return normalizeMake(m[1]);

  // Model-only hints when make word is missing
  if (NON_BMW_MODELS.test(full)) {
    const model = full.match(NON_BMW_MODELS)?.[1]?.toLowerCase() ?? "";
    if (/camry|corolla|rav4|highlander|tacoma|tundra|prius|4runner|sienna/.test(model))
      return "Toyota";
    if (/civic|accord|cr-?v|pilot|odyssey|hr-?v/.test(model)) return "Honda";
    if (/f-?150|f-?250|mustang|escape|explorer|edge|bronco|ranger/.test(model)) return "Ford";
    if (/silverado|equinox|malibu|tahoe/.test(model)) return "Chevrolet";
    if (/altima|sentra|rogue/.test(model)) return "Nissan";
    if (/elantra|sonata|tucson|santa/.test(model)) return "Hyundai";
    if (/outback|forester|crosstrek/.test(model)) return "Subaru";
    if (/jetta|golf|tiguan/.test(model)) return "Volkswagen";
    if (/wrangler|cherokee/.test(model)) return "Jeep";
    if (/model\s*[3yxs]/.test(model)) return "Tesla";
    if (/cx-|mazda/.test(model)) return "Mazda";
  }

  // BMW series tokens strongly imply BMW
  if (
    /\b(M340i|M550i|M[2-8]|[1-8]\d{2}\s?[idxta]|X[1-7]|Z4|i[3-8]|iX|G\d{2}|F\d{2}|E\d{2})\b/i.test(
      full
    )
  ) {
    return "BMW";
  }

  return null;
}

export function extractNonBmwModel(text: string): string | null {
  const m = text.replace(/\s+/g, " ").match(NON_BMW_MODELS);
  if (!m) return null;
  return m[1].replace(/\s+/g, " ").replace(/crv/i, "CR-V").replace(/hrv/i, "HR-V");
}
