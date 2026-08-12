/**
 * Affiliate / referral links for real retailers.
 *
 * Prefer single-product Amazon (ASIN) and eBay (item ID) pages so shoppers
 * land on a Buy Now listing — not a search results grid.
 */

export type AffiliateLink = {
  id: string;
  label: string;
  hint: string;
  url: string;
  /** True when URL is a direct product page (ASIN / item ID). */
  isProductPage?: boolean;
};

export type PartAffiliateQuery = {
  brand: string;
  name: string;
  oemNumbers?: string[] | null;
  oemPartNumber?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  engine?: string | null;
  amazonAsin?: string | null;
  ebayItemId?: string | null;
};

function firstOem(q: PartAffiliateQuery): string | null {
  const fromList = q.oemNumbers?.find((n) => n && /[0-9A-Za-z]{7,}/.test(n));
  if (fromList) return fromList.replace(/[^0-9A-Za-z]/g, "");
  if (q.oemPartNumber) return q.oemPartNumber.replace(/[^0-9A-Za-z]/g, "");
  return null;
}

function cleanName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bOEM\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function vehiclePhrase(q: PartAffiliateQuery): string {
  const bits = [
    q.year ? String(q.year) : null,
    q.make && q.make !== "Unknown" ? q.make : null,
    q.model ?? null,
    q.engine ?? null,
  ].filter(Boolean);
  return bits.join(" ");
}

function amazonSearchQuery(q: PartAffiliateQuery): string {
  const name = cleanName(q.name);
  const vehicle = vehiclePhrase(q);
  const oem = firstOem(q);
  if (oem && name) return `${oem} ${name}`;
  if (vehicle && name) return `${vehicle} ${name}`;
  if (name && q.make && q.make !== "Unknown") return `${q.make} ${name}`;
  if (name) return name;
  return vehicle || "auto parts";
}

function partsSearchQuery(q: PartAffiliateQuery): string {
  const oem = firstOem(q);
  if (oem) return oem;
  const name = cleanName(q.name);
  const vehicle = vehiclePhrase(q);
  if (vehicle && name) return `${vehicle} ${name}`;
  return name.trim();
}

function withAmazonTag(url: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim();
  if (!tag) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tag=${encodeURIComponent(tag)}`;
}

function withEbayCampid(url: string): string {
  const campid = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID?.trim();
  if (!campid) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${encodeURIComponent(campid)}&toolid=10001&mkevt=1`;
}

function normalizeAsin(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return /^[A-Z0-9]{10}$/.test(cleaned) ? cleaned : null;
}

function normalizeEbayItemId(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length >= 9 && cleaned.length <= 15 ? cleaned : null;
}

/** Amazon product page when ASIN known; otherwise a tight automotive search. */
export function buildAmazonLink(q: PartAffiliateQuery): AffiliateLink {
  const asin = normalizeAsin(q.amazonAsin);
  if (asin) {
    return {
      id: "amazon",
      label: "Amazon",
      hint: "Buy Now",
      isProductPage: true,
      url: withAmazonTag(`https://www.amazon.com/dp/${asin}`),
    };
  }
  const amazonQ = encodeURIComponent(amazonSearchQuery(q));
  return {
    id: "amazon",
    label: "Amazon",
    hint: "Fast shipping",
    isProductPage: false,
    // Automotive department bias keeps results closer to a single-product feel
    url: withAmazonTag(
      `https://www.amazon.com/s?k=${amazonQ}&i=automotive-intl-ship&rh=n%3A15684181`
    ),
  };
}

/** eBay Motors item page when item ID known; otherwise Motors search. */
export function buildEbayLink(q: PartAffiliateQuery): AffiliateLink {
  const itemId = normalizeEbayItemId(q.ebayItemId);
  if (itemId) {
    return {
      id: "ebay",
      label: "eBay",
      hint: "Buy It Now",
      isProductPage: true,
      url: withEbayCampid(`https://www.ebay.com/itm/${itemId}`),
    };
  }
  const oem = firstOem(q);
  const ebayText = encodeURIComponent(
    oem ? `${vehiclePhrase(q)} ${oem}`.trim() || oem : amazonSearchQuery(q)
  );
  return {
    id: "ebay",
    label: "eBay",
    hint: "Motors",
    isProductPage: false,
    url: withEbayCampid(
      `https://www.ebay.com/sch/i.html?_nkw=${ebayText}&_sacat=6000`
    ),
  };
}

export function buildRockAutoLink(q: PartAffiliateQuery): AffiliateLink {
  const rockQuery = firstOem(q) ?? partsSearchQuery(q);
  return {
    id: "rockauto",
    label: "RockAuto",
    hint: "Wholesaler",
    isProductPage: false,
    url: `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(rockQuery)}`,
  };
}

/** Build buy links for all retailers (legacy helpers + cart flows). */
export function buildAffiliateLinks(q: PartAffiliateQuery): AffiliateLink[] {
  const partsQ = encodeURIComponent(partsSearchQuery(q));
  const fcpBase = `https://www.fcpeuro.com/search?q=${partsQ}`;
  const fcpClick = process.env.NEXT_PUBLIC_FCP_EURO_CLICK_ID?.trim();

  return [
    buildAmazonLink(q),
    buildRockAutoLink(q),
    {
      id: "fcpeuro",
      label: "FCP Euro",
      hint: "Lifetime warranty",
      isProductPage: false,
      url: fcpClick
        ? `https://fcpeuro.sjv.io/${fcpClick}?u=${encodeURIComponent(fcpBase)}`
        : fcpBase,
    },
    buildEbayLink(q),
  ];
}

/**
 * Pick one store per part for the cart "Buy all" flow.
 * Prefer Amazon/eBay product pages when we have ASIN / item ID.
 */
export function pickBestAffiliateLink(
  links: AffiliateLink[],
  opts?: {
    brand?: string;
    partName?: string;
    hasOem?: boolean;
    make?: string;
    preferProductPages?: boolean;
  }
): AffiliateLink {
  if (opts?.preferProductPages !== false) {
    const product = links.find((l) => l.isProductPage && (l.id === "amazon" || l.id === "ebay"));
    if (product) return product;
    const amazon = links.find((l) => l.id === "amazon");
    if (amazon) return amazon;
  }

  const brand = (opts?.brand ?? "").toLowerCase();
  const name = (opts?.partName ?? "").toLowerCase();
  const make = (opts?.make ?? "").toLowerCase();
  const hasOem = Boolean(opts?.hasOem);
  const euroMake = /bmw|mini|audi|volkswagen|vw|mercedes|porsche|volvo/.test(make);

  const genuine = brand.includes("genuine");
  const oeSupplier =
    brand.includes("pierburg") ||
    brand.includes("bosch") ||
    brand.includes("mahle") ||
    brand.includes("brembo") ||
    brand.includes("lemf") ||
    brand.includes("elring") ||
    brand.includes("ngk") ||
    brand.includes("mann") ||
    brand.includes("denso") ||
    brand.includes("motorcraft") ||
    brand.includes("acdelco");

  const wearItem = /brake|rotor|pad|filter|plug|belt|wiper|sensor|gasket|seal|oring|o-ring/.test(
    name
  );
  const warrantySensitive =
    genuine || /gasket|seal|pump|thermostat|control arm|mount|coil/.test(name);
  const convenienceItem = /fluid|oil|coolant|battery|wiper/.test(name);

  const scores: Record<string, number> = {
    amazon: 0.7,
    ebay: 0.55,
    rockauto: 0.35,
    fcpeuro: euroMake ? 0.45 : 0.2,
  };

  if (hasOem || wearItem) scores.rockauto += 0.15;
  if (euroMake && (warrantySensitive || oeSupplier)) scores.fcpeuro += 0.25;
  if (euroMake && genuine) scores.fcpeuro += 0.25;
  if (convenienceItem) scores.amazon += 0.2;
  if (!/brake|rotor|pad|sensor/.test(name)) scores.ebay += 0.1;
  const programs = affiliateProgramsConfigured();
  if (programs.amazon) scores.amazon += 0.05;
  if (programs.ebay) scores.ebay += 0.05;
  if (programs.fcpEuro && euroMake) scores.fcpeuro += 0.05;

  let best = links[0];
  let bestScore = -1;
  for (const link of links) {
    const score = scores[link.id] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = link;
    }
  }
  return best;
}

export function bestBuyForPart(q: PartAffiliateQuery): AffiliateLink {
  const oem = q.oemNumbers?.some((n) => n && /[0-9A-Za-z]{7,}/.test(n)) || Boolean(q.oemPartNumber);
  return pickBestAffiliateLink(buildAffiliateLinks(q), {
    brand: q.brand,
    partName: q.name,
    hasOem: Boolean(oem),
    make: q.make ?? undefined,
  });
}

export type PricedAffiliateLink = AffiliateLink & { estimatedPrice: number };

export type ProductBuyBundle = {
  amazon: PricedAffiliateLink;
  ebay: PricedAffiliateLink;
  rockAuto: PricedAffiliateLink;
};

/** Amazon + eBay primary CTAs; RockAuto priced for the secondary wholesaler link. */
export function buildProductBuyBundle(
  q: PartAffiliateQuery,
  catalogPrice: number
): ProductBuyBundle {
  const base = Math.max(0.01, catalogPrice);
  const price = (factor: number) => Math.round(base * factor * 100) / 100;
  return {
    amazon: { ...buildAmazonLink(q), estimatedPrice: price(1.02) },
    ebay: { ...buildEbayLink(q), estimatedPrice: price(0.96) },
    rockAuto: { ...buildRockAutoLink(q), estimatedPrice: price(0.88) },
  };
}

/**
 * Estimate relative store prices from our catalog reference price, then sort
 * cheapest-first. Used for legacy single-CTA flows.
 */
export function pricedAffiliateLinks(
  q: PartAffiliateQuery,
  catalogPrice: number
): PricedAffiliateLink[] {
  const base = Math.max(0.01, catalogPrice);
  const factors: Record<string, number> = {
    rockauto: 0.9,
    ebay: 0.94,
    amazon: 1.04,
    fcpeuro: 1.1,
  };
  return buildAffiliateLinks(q)
    .map((link) => ({
      ...link,
      estimatedPrice: Math.round(base * (factors[link.id] ?? 1) * 100) / 100,
    }))
    .sort((a, b) => a.estimatedPrice - b.estimatedPrice);
}

export function cheapestAffiliateLink(
  q: PartAffiliateQuery,
  catalogPrice: number
): PricedAffiliateLink {
  return pricedAffiliateLinks(q, catalogPrice)[0];
}

/** Clean card titles: "Bosch Alternator" — never leave "(Budget)" on premium rows. */
export function cleanPartDisplayName(
  brand: string,
  name: string,
  opts?: { isPremium?: boolean }
): string {
  let n = name
    .replace(/\s*\(Budget\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = n.split(/\s*[—–]\s*/)[0]?.trim() || n;
  const brandTrim = brand?.trim() ?? "";
  if (
    brandTrim &&
    !base.toLowerCase().startsWith(brandTrim.toLowerCase()) &&
    !/^genuine\b/i.test(brandTrim)
  ) {
    return `${brandTrim} ${base}`.replace(/\s+/g, " ").trim();
  }
  if (/^genuine\b/i.test(brandTrim) && !/^genuine\b/i.test(base)) {
    return `${brandTrim} ${base}`.replace(/\s+/g, " ").trim();
  }
  if (opts?.isPremium) {
    return base.replace(/\bbudget\b/gi, "").replace(/\s+/g, " ").trim();
  }
  return base;
}

export function affiliateProgramsConfigured(): {
  amazon: boolean;
  ebay: boolean;
  fcpEuro: boolean;
} {
  return {
    amazon: Boolean(process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim()),
    ebay: Boolean(process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID?.trim()),
    fcpEuro: Boolean(process.env.NEXT_PUBLIC_FCP_EURO_CLICK_ID?.trim()),
  };
}
