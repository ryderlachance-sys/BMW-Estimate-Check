import "server-only";

export type RetailerMatchInput = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim?: string | null;
  engine?: string | null;
  description: string;
  oemPartNumber?: string | null;
};

export type VerifiedRetailerListing = {
  retailerName: string;
  retailerPrice: number;
  retailerUrl?: string;
  productTitle: string;
  fitmentNote: string;
  amazonAsin?: string;
  ebayItemId?: string;
};

type EbayItem = {
  itemId?: string;
  title?: string;
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  price?: { value?: string; currency?: string };
  condition?: string;
  buyingOptions?: string[];
  topRatedBuyingExperience?: boolean;
  seller?: { feedbackPercentage?: string; feedbackScore?: number };
};

type EbaySearchResponse = { itemSummaries?: EbayItem[] };

let cachedToken: { value: string; expiresAt: number } | null = null;

export function hasEbayBrowseConfigured(): boolean {
  return Boolean(
    process.env.EBAY_CLIENT_ID?.trim() && process.env.EBAY_CLIENT_SECRET?.trim()
  );
}

async function getApplicationToken(): Promise<string | null> {
  if (!hasEbayBrowseConfigured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.EBAY_CLIENT_ID!.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET!.trim();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) return null;
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + Math.max(60, json.expires_in ?? 7_200) * 1_000,
  };
  return cachedToken.value;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const PART_FAMILIES: Array<{ name: string; pattern: RegExp }> = [
  { name: "brake pad", pattern: /brake\s*pad|ceramic\s*pad|disc\s*pad/i },
  { name: "brake rotor", pattern: /brake\s*(?:disc|rotor)|\brotor\b/i },
  { name: "alternator", pattern: /alternator|generator assembly/i },
  { name: "battery", pattern: /\bbattery\b/i },
  { name: "air filter", pattern: /(?:engine\s*)?air\s*filter/i },
  { name: "cabin filter", pattern: /cabin\s*(?:air\s*)?filter/i },
  { name: "oil filter", pattern: /oil\s*filter/i },
  { name: "spark plug", pattern: /spark\s*plug/i },
  { name: "ignition coil", pattern: /ignition\s*coil|coil\s*pack/i },
  { name: "control arm", pattern: /control\s*arm/i },
  { name: "water pump", pattern: /water\s*pump/i },
  { name: "fuel pump", pattern: /fuel\s*pump/i },
  { name: "valve cover gasket", pattern: /valve\s*cover\s*gasket/i },
  { name: "belt", pattern: /serpentine\s*belt|drive\s*belt|accessory\s*belt/i },
  { name: "strut", pattern: /\bstrut\b/i },
  { name: "shock", pattern: /shock\s*absorber|\bshock\b/i },
  { name: "starter", pattern: /\bstarter\b/i },
  { name: "radiator", pattern: /\bradiator\b/i },
  { name: "caliper", pattern: /brake\s*caliper|\bcaliper\b/i },
  { name: "wheel bearing", pattern: /wheel\s*(?:hub|bearing)/i },
];

function familyOf(value: string): string | null {
  return PART_FAMILIES.find((family) => family.pattern.test(value))?.name ?? null;
}

function itemLooksRelevant(item: EbayItem, input: RetailerMatchInput): boolean {
  const title = item.title ?? "";
  const requestedFamily = familyOf(input.description);
  const itemFamily = familyOf(title);
  if (requestedFamily && itemFamily !== requestedFamily) return false;

  const oem = normalize(input.oemPartNumber ?? "");
  if (oem && !normalize(title).includes(oem)) return false;

  const price = Number(item.price?.value);
  return (
    Boolean(item.itemId && item.title && (item.itemAffiliateWebUrl || item.itemWebUrl)) &&
    Number.isFinite(price) &&
    price > 0 &&
    item.price?.currency === "USD" &&
    item.buyingOptions?.includes("FIXED_PRICE") === true
  );
}

function compatibilityProperties(input: RetailerMatchInput) {
  return [
    input.year ? { name: "Year", value: String(input.year) } : null,
    input.make ? { name: "Make", value: input.make } : null,
    input.model ? { name: "Model", value: input.model } : null,
    input.trim ? { name: "Trim", value: input.trim } : null,
    input.engine ? { name: "Engine", value: input.engine } : null,
  ].filter((entry): entry is { name: string; value: string } => Boolean(entry));
}

async function isCompatible(
  token: string,
  item: EbayItem,
  input: RetailerMatchInput,
  headers: Record<string, string>
): Promise<boolean> {
  const oem = normalize(input.oemPartNumber ?? "");
  if (oem && normalize(item.title ?? "").includes(oem)) return true;
  if (!item.itemId || !input.year || !input.make || !input.model) return false;

  try {
    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(item.itemId)}/check_compatibility`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ compatibilityProperties: compatibilityProperties(input) }),
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      }
    );
    if (!response.ok) return false;
    const json = (await response.json()) as { compatibilityStatus?: string };
    return json.compatibilityStatus === "COMPATIBLE";
  } catch {
    return false;
  }
}

function affiliateUrl(item: EbayItem): string | null {
  const url = item.itemAffiliateWebUrl ?? item.itemWebUrl;
  if (!url) return null;
  if (item.itemAffiliateWebUrl) return url;
  const campid = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID?.trim();
  if (!campid) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${encodeURIComponent(campid)}&toolid=10001&mkevt=1`;
}

/**
 * Returns one purchasable eBay listing only after eBay reports that it is
 * compatible with the supplied vehicle (or its exact OEM number matches).
 */
export async function findExactEbayListing(
  input: RetailerMatchInput
): Promise<VerifiedRetailerListing | null> {
  if (!input.year || !input.make || !input.model) return null;
  try {
    const token = await getApplicationToken();
    if (!token) return null;

    const campaignId = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID?.trim();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    };
    if (campaignId) {
      headers["X-EBAY-C-ENDUSERCTX"] = `affiliateCampaignId=${campaignId}`;
    }

    const oem = input.oemPartNumber?.trim();
    const query = oem
      ? `${oem} ${input.description}`
      : `${input.year} ${input.make} ${input.model} ${input.description}`;
    const params = new URLSearchParams({
      q: query,
      limit: "12",
      filter: "buyingOptions:{FIXED_PRICE},conditions:{NEW}",
    });
    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) }
    );
    if (!response.ok) return null;
    const json = (await response.json()) as EbaySearchResponse;
    const candidates = (json.itemSummaries ?? [])
      .filter((item) => itemLooksRelevant(item, input))
      .slice(0, 5);

    const checked = await Promise.all(
      candidates.map(async (item) => ({
        item,
        compatible: await isCompatible(token, item, input, headers),
      }))
    );
    const compatible = checked
      .filter((entry) => entry.compatible)
      .map((entry) => entry.item)
      .sort((a, b) => {
        const topRated = Number(Boolean(b.topRatedBuyingExperience)) - Number(Boolean(a.topRatedBuyingExperience));
        if (topRated) return topRated;
        const seller = Number(b.seller?.feedbackPercentage ?? 0) - Number(a.seller?.feedbackPercentage ?? 0);
        if (seller) return seller;
        return Number(a.price?.value ?? Infinity) - Number(b.price?.value ?? Infinity);
      });
    const best = compatible[0];
    const url = best ? affiliateUrl(best) : null;
    if (!best?.itemId || !best.title || !url) return null;
    const legacyId = best.itemId.split("|").find((part) => /^\d{9,15}$/.test(part));

    return {
      retailerName: "eBay",
      retailerPrice: Number(best.price!.value),
      retailerUrl: url,
      productTitle: best.title,
      ebayItemId: legacyId,
      fitmentNote: `eBay compatibility verified for ${input.year} ${input.make} ${input.model}${input.engine ? ` · ${input.engine}` : ""}`,
    };
  } catch {
    return null;
  }
}
