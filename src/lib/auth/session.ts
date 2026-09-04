// Session signing built on the Web Crypto API (globalThis.crypto.subtle) so
// it works identically in the Next.js Edge middleware runtime and in the
// Node.js server runtime — no dependency on `node:crypto`.

const SESSION_COOKIE_NAME = "cfid_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

interface SessionPayload {
  user: string;
  issuedAt: number;
  expiresAt: number;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is not set (or too short). Set a random string of at least 16 characters in your environment."
    );
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(signature);
}

/** Build a signed, opaque session token: base64url(payload).base64url(hmac) */
export async function createSessionToken(user: string): Promise<string> {
  const secret = getAuthSecret();
  const now = Date.now();
  const payload: SessionPayload = {
    user,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
  };
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

/** Verify a session token's signature and expiry. Returns the payload if valid, else null. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  let secret: string;
  try {
    secret = getAuthSecret();
  } catch {
    return null;
  }

  try {
    const key = await getHmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as BufferSource,
      new TextEncoder().encode(encodedPayload)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

async function timingSafeStringEqual(a: string, b: string): Promise<boolean> {
  // Compare HMACs of both values (both keyed by AUTH_SECRET) instead of the
  // raw strings, so the comparison is fixed-length regardless of input
  // length and never short-circuits on a length mismatch.
  const secret = getAuthSecret();
  const [macA, macB] = await Promise.all([sign(a, secret), sign(b, secret)]);
  if (macA.length !== macB.length) return false;
  let diff = 0;
  for (let i = 0; i < macA.length; i++) diff |= macA.charCodeAt(i) ^ macB.charCodeAt(i);
  return diff === 0;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.PILOT_USERNAME;
  const expectedPass = process.env.PILOT_PASSWORD;
  if (!expectedUser || !expectedPass) {
    throw new Error("PILOT_USERNAME / PILOT_PASSWORD are not configured in the environment.");
  }
  const [userOk, passOk] = await Promise.all([
    timingSafeStringEqual(username, expectedUser),
    timingSafeStringEqual(password, expectedPass),
  ]);
  return userOk && passOk;
}

export const SESSION_COOKIE = {
  name: SESSION_COOKIE_NAME,
  maxAgeSeconds: SESSION_TTL_SECONDS,
};
