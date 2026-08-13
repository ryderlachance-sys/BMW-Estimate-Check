const CUSTOMER_COOKIE = "engine_genie_session";
const ADMIN_COOKIE = "engine_genie_admin";

export { CUSTOMER_COOKIE, ADMIN_COOKIE };

function sessionSecret(): string | null {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    (process.env.NODE_ENV === "production" ? null : "engine-genie-local-development-only")
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signature(value: string): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return bytesToHex(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)))
  );
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createCustomerToken(id = crypto.randomUUID()): Promise<string> {
  const sig = await signature(id);
  if (!sig) throw new Error("AUTH_SECRET is required in production");
  return `${id}.${sig}`;
}

export async function readCustomerToken(token?: string | null): Promise<string | null> {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const id = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = await signature(id);
  return expected && constantTimeEqual(supplied, expected) ? id : null;
}

export async function createAdminToken(): Promise<string> {
  const issuedAt = Date.now().toString();
  const sig = await signature(`admin:${issuedAt}`);
  if (!sig) throw new Error("AUTH_SECRET is required in production");
  return `${issuedAt}.${sig}`;
}

export async function isValidAdminToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  const [issuedAt, supplied, extra] = token.split(".");
  if (!issuedAt || !supplied || extra) return false;
  const timestamp = Number(issuedAt);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
    return false;
  }
  const expected = await signature(`admin:${issuedAt}`);
  return Boolean(expected && constantTimeEqual(supplied, expected));
}
