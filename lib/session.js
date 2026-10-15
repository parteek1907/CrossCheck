// Crosscheck Web Crypto Session Token & Cookie Utility
// Compatible with both Node.js route handlers and Next.js Edge Middleware

const SESSION_SECRET = process.env.SESSION_SECRET || "crosscheck-dev-secret-session-key-2026";
export const COOKIE_NAME = "crosscheck_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function base64UrlEncode(str) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64url");
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64url").toString("utf-8");
  }
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

async function getHmacKey() {
  const cryptoObj = (typeof window !== "undefined" && window.crypto) || globalThis.crypto;
  const encoder = new TextEncoder();
  return cryptoObj.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a signed JWT-like token string: `${body}.${sig}`
 */
export async function signSession(payload) {
  const cryptoObj = (typeof window !== "undefined" && window.crypto) || globalThis.crypto;
  const encoder = new TextEncoder();
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const fullPayload = { ...payload, exp };

  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const key = await getHmacKey();
  const signatureBuffer = await cryptoObj.subtle.sign("HMAC", key, encoder.encode(body));

  let sig = "";
  if (typeof Buffer !== "undefined") {
    sig = Buffer.from(signatureBuffer).toString("base64url");
  } else {
    sig = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  return `${body}.${sig}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export async function verifySession(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  try {
    const cryptoObj = (typeof window !== "undefined" && window.crypto) || globalThis.crypto;
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;

    const encoder = new TextEncoder();
    const key = await getHmacKey();

    let sigBytes;
    if (typeof Buffer !== "undefined") {
      sigBytes = Buffer.from(sig, "base64url");
    } else {
      let base64 = sig.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    }

    const isValid = await cryptoObj.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
    if (!isValid) return null;

    const decoded = JSON.parse(base64UrlDecode(body));
    if (!decoded.exp || decoded.exp < Date.now()) {
      return null;
    }

    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Helper to get session from Request headers / cookies
 */
export async function getSessionFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  return verifySession(token);
}
