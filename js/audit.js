// Adapted from Veralon server/scoring/auditHash.ts

/**
 * Recursively sorts object keys for canonical deterministic JSON serialization.
 * @param {*} value
 * @returns {*}
 */
function sortKeysRecursively(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysRecursively);
  }
  const sorted = {};
  Object.keys(value)
    .sort()
    .forEach(key => {
      sorted[key] = sortKeysRecursively(value[key]);
    });
  return sorted;
}

/**
 * Computes SHA-256 hash in hex string using the browser Web Crypto API.
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function sha256Hex(message) {
  const cryptoObj = (typeof window !== "undefined" && window.crypto) || globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API is not supported in this environment");
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await cryptoObj.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Adapted from Veralon server/scoring/auditHash.ts
 * Generates a deterministic audit record and unique Report ID:
 * Format: TL-{base36 timestamp}-{hash8}
 *
 * @param {Object} reportData - The report contents (scores, claim, timestamps, etc.)
 * @returns {Promise<Object>} { reportId, auditHash, canonicalJson, timestamp, base36Time }
 */
export async function generateAuditRecord(reportData) {
  const timestamp = Date.now();
  const base36Time = Math.floor(timestamp).toString(36).toUpperCase();

  const auditPayload = {
    ...reportData,
    _generatedTime: timestamp,
    _system: "TrustLens v1.0",
    _standard: "Deterministic Trust Audit v1"
  };

  const canonicalSorted = sortKeysRecursively(auditPayload);
  const canonicalJson = JSON.stringify(canonicalSorted);
  const fullHash = await sha256Hex(canonicalJson);

  const hash8 = fullHash.substring(0, 8).toUpperCase();
  const reportId = `TL-${base36Time}-${hash8}`;

  return {
    reportId,
    auditHash: fullHash,
    shortHash: hash8,
    timestamp: new Date(timestamp).toISOString(),
    base36Time,
    canonicalJson
  };
}

/**
 * Verifies an audit record against its claimed SHA-256 hash.
 * @param {string} canonicalJson
 * @param {string} expectedHash
 * @returns {Promise<boolean>}
 */
export async function verifyAuditRecord(canonicalJson, expectedHash) {
  const computed = await sha256Hex(canonicalJson);
  return computed.toLowerCase() === expectedHash.toLowerCase();
}
