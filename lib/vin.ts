import "server-only";

/**
 * VIN extraction + free NHTSA vPIC decode.
 * https://vpic.nhtsa.dot.gov/api/
 */

const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/gi;

export function extractVinFromText(text: string): string | null {
  const labeled = text.match(
    /\b(?:VIN|V\.?I\.?N\.?|vehicle\s*(?:id|identification)\s*(?:no|number|#)?)\s*[:#.]?\s*([A-HJ-NPR-Z0-9]{17})\b/i
  );
  if (labeled) return labeled[1].toUpperCase();

  for (const m of text.matchAll(VIN_RE)) {
    const vin = m[1].toUpperCase();
    // Skip obvious false positives (all same char, etc.)
    if (/^(.)\1{16}$/.test(vin)) continue;
    if (!/[A-Z]/.test(vin) || !/\d/.test(vin)) continue;
    return vin;
  }
  return null;
}

export type VinDecode = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  rawError?: string | null;
};

function pick(results: { Variable: string; Value: string | null }[], name: string): string | null {
  const row = results.find((r) => r.Variable === name);
  const v = row?.Value?.trim();
  return v && v !== "Not Applicable" && v !== "null" ? v : null;
}

/** Decode a VIN via NHTSA (free, no API key). */
export async function decodeVin(vin: string): Promise<VinDecode | null> {
  const clean = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
  if (clean.length !== 17) return null;

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(clean)}?format=json`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { vin: clean, year: null, make: null, model: null, trim: null, engine: null, rawError: `HTTP ${res.status}` };

    const data = (await res.json()) as {
      Results?: Record<string, string>[];
    };
    const row = data.Results?.[0];
    if (!row) {
      return { vin: clean, year: null, make: null, model: null, trim: null, engine: null, rawError: "empty" };
    }

    // DecodeVinValues returns a flat object, not Variable/Value pairs
    const yearNum = row.ModelYear ? Number(row.ModelYear) : NaN;
    const displacement = row.DisplacementL ? `${row.DisplacementL}L` : null;
    const cylinders = row.EngineCylinders ? `${row.EngineCylinders}cyl` : null;
    const engineBits = [displacement, cylinders, row.EngineModel].filter(Boolean);

    return {
      vin: clean,
      year: Number.isFinite(yearNum) ? yearNum : null,
      make: row.Make?.trim() || null,
      model: row.Model?.trim() || null,
      trim: row.Trim?.trim() || row.Series?.trim() || null,
      engine: engineBits.length ? engineBits.join(" ") : null,
      rawError: row.ErrorCode && row.ErrorCode !== "0" ? row.ErrorText || row.ErrorCode : null,
    };
  } catch (err) {
    return {
      vin: clean,
      year: null,
      make: null,
      model: null,
      trim: null,
      engine: null,
      rawError: err instanceof Error ? err.message : "decode failed",
    };
  }
}

/** Extract VIN from text and decode when present. */
export async function extractAndDecodeVin(text: string): Promise<VinDecode | null> {
  const vin = extractVinFromText(text);
  if (!vin) return null;
  return decodeVin(vin);
}

/**
 * Whether NHTSA year/make/model/engine should override estimate text.
 * Invalid check digits still return a guessed vehicle — do not trust those fields.
 */
export function isTrustworthyVinDecode(decoded: VinDecode): boolean {
  const hasVehicle = Boolean(decoded.year || decoded.make || decoded.model);
  if (!hasVehicle) return false;

  const err = (decoded.rawError ?? "").trim().toLowerCase();
  if (!err) return true;
  if (err.includes("check digit")) return false;
  if (
    err.startsWith("http") ||
    err === "empty" ||
    err.includes("decode failed") ||
    err.includes("aborted") ||
    err.includes("timeout")
  ) {
    return false;
  }
  // Soft NHTSA advisories (non-check-digit) can still be usable.
  return true;
}
