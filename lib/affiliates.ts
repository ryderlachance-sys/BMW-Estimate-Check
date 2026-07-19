/**
 * Affiliate / referral links for real retailers.
 *
 * Money path #1: shoppers click these, buy on Amazon/eBay/FCP/RockAuto,
 * and those programs pay you a commission when your IDs are in env.
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

/** Build buy links — Amazon first (your commission), RockAuto second (usually cheapest). */
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
