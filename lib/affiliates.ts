/**
 * Affiliate / referral links for real retailers.
 *
 * How you make money: sign up for each program (free), put your IDs in .env,
 * and when a visitor clicks "Buy" and purchases, the retailer pays you a
 * commission. No inventory, no Stripe, no shipping.
 */

export type AffiliateLink = {
  id: string;
  label: string;
  /** Short blurb shown under the button */
  hint: string;
  url: string;
};

export type PartAffiliateQuery = {
  brand: string;
  name: string;
  oemNumbers?: string[] | null;
  oemPartNumber?: string | null;
};

function firstOem(q: PartAffiliateQuery): string | null {
  const fromList = q.oemNumbers?.find((n) => n && /\d{7,}/.test(n));
  if (fromList) return fromList.replace(/[^0-9A-Za-z]/g, "");
  if (q.oemPartNumber) return q.oemPartNumber.replace(/[^0-9A-Za-z]/g, "");
  return null;
}

function cleanName(name: string): string {
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Amazon search text. Bare 11-digit BMW OEMs often land on "product not found"
 * because Amazon treats them like bad ASINs — always include BMW + part name.
 */
function amazonSearchQuery(q: PartAffiliateQuery): string {
  const oem = firstOem(q);
  const name = cleanName(q.name);
  const brand = q.brand && !/^genuine\s*bmw$/i.test(q.brand) ? q.brand : "BMW";
  if (oem && name) return `BMW ${name} ${oem}`;
  if (oem) return `BMW ${oem} auto part`;
  return `${brand} ${name} BMW`.trim();
}

/** RockAuto / eBay / FCP: OEM alone is fine; fall back to brand + name. */
function partsSearchQuery(q: PartAffiliateQuery): string {
  const oem = firstOem(q);
  if (oem) return oem;
  return `${q.brand} ${cleanName(q.name)}`.trim();
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

/** Build buy links for a catalog / matched part. Works with or without affiliate IDs. */
export function buildAffiliateLinks(q: PartAffiliateQuery): AffiliateLink[] {
  const oem = firstOem(q);
  const amazonQ = encodeURIComponent(amazonSearchQuery(q));
  const partsQ = encodeURIComponent(partsSearchQuery(q));
  const links: AffiliateLink[] = [];

  // Automotive department search — not /dp/OEM (that causes "product not found")
  links.push({
    id: "amazon",
    label: "Amazon",
    hint: "Fast shipping",
    url: withAmazonTag(`https://www.amazon.com/s?k=${amazonQ}&i=automotive`),
  });

  links.push({
    id: "ebay",
    label: "eBay",
    hint: "Used & new",
    url: withEbayCampid(`https://www.ebay.com/sch/i.html?_nkw=${partsQ}`),
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

  return links;
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
