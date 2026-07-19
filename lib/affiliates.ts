/**
 * Affiliate / referral links for real retailers.
 *
 * Money path: shoppers buy on Amazon/eBay/FCP via your tagged links.
 * We auto-pick one best store per part so the UI stays one-button simple.
 */

export type AffiliateLink = {
  id: string;
  label: string;
  hint: string;
  url: string;
};

export type PartAffiliateQuery = {
  brand: string;
  name: string;
  oemNumbers?: string[] | null;
  oemPartNumber?: string | null;
  year?: number | null;
  model?: string | null;
  engine?: string | null;
};

function firstOem(q: PartAffiliateQuery): string | null {
  const fromList = q.oemNumbers?.find((n) => n && /\d{7,}/.test(n));
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
    "BMW",
    q.model ?? null,
    q.engine ?? null,
  ].filter(Boolean);
  return bits.join(" ");
}

function amazonSearchQuery(q: PartAffiliateQuery): string {
  const name = cleanName(q.name);
  const vehicle = vehiclePhrase(q);
  if (vehicle && name) return `${vehicle} ${name}`;
  if (name) return `BMW ${name}`;
  return vehicle || "BMW auto parts";
}

function partsSearchQuery(q: PartAffiliateQuery): string {
  const oem = firstOem(q);
  if (oem) return oem;
  const name = cleanName(q.name);
  const vehicle = vehiclePhrase(q);
  if (vehicle && name) return `${vehicle} ${name}`;
  return `BMW ${name}`.trim();
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

/** Build buy links for all retailers. */
export function buildAffiliateLinks(q: PartAffiliateQuery): AffiliateLink[] {
  const oem = firstOem(q);
  const amazonQ = encodeURIComponent(amazonSearchQuery(q));
  const partsQ = encodeURIComponent(partsSearchQuery(q));
  const ebayText = encodeURIComponent(
    oem ? `${vehiclePhrase(q)} ${oem}`.trim() || oem : amazonSearchQuery(q)
  );

  const links: AffiliateLink[] = [];

  links.push({
    id: "amazon",
    label: "Amazon",
    hint: "Fast shipping",
    url: withAmazonTag(`https://www.amazon.com/s?k=${amazonQ}`),
  });

  const rockQuery = oem ?? partsSearchQuery(q);
  links.push({
    id: "rockauto",
    label: "RockAuto",
    hint: "Usually cheapest",
    url: `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(rockQuery)}`,
  });

  const fcpBase = `https://www.fcpeuro.com/search?q=${partsQ}`;
  const fcpClick = process.env.NEXT_PUBLIC_FCP_EURO_CLICK_ID?.trim();
  links.push({
    id: "fcpeuro",
    label: "FCP Euro",
    hint: "Lifetime warranty",
    url: fcpClick
      ? `https://fcpeuro.sjv.io/${fcpClick}?u=${encodeURIComponent(fcpBase)}`
      : fcpBase,
  });

  links.push({
    id: "ebay",
    label: "eBay",
    hint: "Used & new",
    url: withEbayCampid(`https://www.ebay.com/sch/i.html?_nkw=${ebayText}`),
  });

  return links;
}

/**
 * Pick one store per part: balance price, reliability, and whether you earn
 * a commission. Customer never chooses — one cart, one buy flow.
 */
export function pickBestAffiliateLink(
  links: AffiliateLink[],
  opts?: { brand?: string; partName?: string }
): AffiliateLink {
  const programs = affiliateProgramsConfigured();
  const brand = (opts?.brand ?? "").toLowerCase();
  const name = (opts?.partName ?? "").toLowerCase();

  const premiumBrand =
    brand.includes("genuine") ||
    brand.includes("pierburg") ||
    brand.includes("bosch") ||
    brand.includes("mahle") ||
    brand.includes("brembo") ||
    brand.includes("ngk") ||
    brand.includes("elring");
  const safetyPart = /brake|rotor|pad|sensor|plug|gasket|housing|pump/.test(name);

  const scores: Record<string, { cheap: number; reliable: number; commission: number }> = {
    rockauto: { cheap: 1, reliable: 0.72, commission: 0 },
    amazon: {
      cheap: 0.58,
      reliable: 0.88,
      commission: programs.amazon ? 1 : 0.15,
    },
    fcpeuro: {
      cheap: 0.48,
      reliable: 1,
      commission: programs.fcpEuro ? 0.85 : 0.1,
    },
    ebay: {
      cheap: 0.72,
      reliable: 0.42,
      commission: programs.ebay ? 1 : 0.1,
    },
  };

  let best = links[0];
  let bestScore = -1;
  for (const link of links) {
    const s = scores[link.id] ?? { cheap: 0.5, reliable: 0.5, commission: 0 };
    let reliableW = 0.35;
    let cheapW = 0.35;
    let commissionW = 0.3;
    if (premiumBrand || safetyPart) {
      reliableW = 0.45;
      cheapW = 0.25;
      commissionW = 0.3;
    }
    const score = cheapW * s.cheap + reliableW * s.reliable + commissionW * s.commission;
    if (score > bestScore) {
      bestScore = score;
      best = link;
    }
  }
  return best;
}

export function bestBuyForPart(q: PartAffiliateQuery): AffiliateLink {
  return pickBestAffiliateLink(buildAffiliateLinks(q), {
    brand: q.brand,
    partName: q.name,
  });
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
