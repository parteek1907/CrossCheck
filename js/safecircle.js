// TrustLens Rotating Safe Circle Module
// Offline TOTP two-word authentication code using Web Crypto HMAC-SHA256

const DEFAULT_SECRET = "TRUSTLENS-CIRCLE-FAMILY-2026";
const STORAGE_SECRET_KEY = "trustlens_safecircle_secret";

/**
 * Retrieves the currently configured Safe Circle shared secret.
 * @returns {string}
 */
export function getSafeCircleSecret() {
  return localStorage.getItem(STORAGE_SECRET_KEY) || DEFAULT_SECRET;
}

/**
 * Updates the shared family Safe Circle secret.
 * @param {string} newSecret
 */
export function setSafeCircleSecret(newSecret) {
  if (newSecret && newSecret.trim().length >= 4) {
    localStorage.setItem(STORAGE_SECRET_KEY, newSecret.trim());
    return true;
  }
  return false;
}

/**
 * Computes an HMAC-SHA256 digest using Web Crypto API.
 * @param {string} secret
 * @param {Uint8Array} dataBuffer
 * @returns {Promise<Uint8Array>}
 */
async function computeHmacSha256(secret, dataBuffer) {
  const cryptoObj = (typeof window !== "undefined" && window.crypto) || globalThis.crypto;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await cryptoObj.subtle.sign("HMAC", cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}

/**
 * Generates the offline Rotating Safe Circle two-word passcode for the current or specified 60-second window.
 *
 * @param {Array<string>} wordlist - Array of distinct English words
 * @param {string} [secret] - Shared family secret
 * @param {number} [timeOffsetSeconds=0] - Offset in seconds (for verifying adjacent windows)
 * @returns {Promise<Object>} { code, word1, word2, secondsRemaining, currentWindow, progressPercent }
 */
export async function generateSafeCircleCode(wordlist, secret = getSafeCircleSecret(), timeOffsetSeconds = 0) {
  if (!wordlist || wordlist.length === 0) {
    throw new Error("Wordlist is required for Safe Circle generation");
  }

  const nowMs = Date.now() + timeOffsetSeconds * 1000;
  const currentWindow = Math.floor(nowMs / 60000);
  const secondsRemaining = 60 - Math.floor((nowMs / 1000) % 60);
  const progressPercent = Math.round((secondsRemaining / 60) * 100);

  // Pack 64-bit integer timestamp counter
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(currentWindow), false);

  const hmacBytes = await computeHmacSha256(secret, new Uint8Array(buffer));

  // Extract two distinct words using 16-bit slices
  const idx1 = ((hmacBytes[0] << 8) | hmacBytes[1]) % wordlist.length;
  let idx2 = ((hmacBytes[2] << 8) | hmacBytes[3]) % wordlist.length;

  // Ensure words are different for clear phonetic recitation
  if (idx1 === idx2) {
    idx2 = (idx2 + 1) % wordlist.length;
  }

  const word1 = wordlist[idx1];
  const word2 = wordlist[idx2];
  const code = `${word1}-${word2}`;

  return {
    code,
    word1,
    word2,
    secondsRemaining,
    progressPercent,
    currentWindow,
    timestamp: new Date().toISOString()
  };
}

/**
 * Verifies a candidate two-word phrase spoken by a caller (e.g. over telephone or voice message).
 * Checks the current 60s window plus adjacent windows (-1, +1) to accommodate transmission delay.
 *
 * @param {string} candidateWords - Candidate phrase e.g. "SILVER-FALCON" or "silver falcon"
 * @param {Array<string>} wordlist - The wordlist
 * @param {string} [secret] - Shared secret
 * @returns {Promise<Object>} { isValid, verifiedWindow, timeDeltaDescription }
 */
export async function verifySafeCircleSpokenCode(candidateWords, wordlist, secret = getSafeCircleSecret()) {
  if (!candidateWords) return { isValid: false, reason: "No code provided" };

  const normalized = candidateWords
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s\-]/g, "")
    .replace(/\s+/g, "-");

  // Check 3 windows: current (0), previous (-60s), next (+60s)
  const windowOffsets = [0, -60, 60];

  for (const offset of windowOffsets) {
    const generated = await generateSafeCircleCode(wordlist, secret, offset);
    if (generated.code === normalized) {
      let deltaDesc = "Active Current Window (Immediate Match)";
      if (offset === -60) deltaDesc = "Previous Window (Allowed 60s Grace Period)";
      if (offset === 60) deltaDesc = "Upcoming Window (Clock Drift Adjusted)";

      return {
        isValid: true,
        matchedCode: generated.code,
        timeDeltaDescription: deltaDesc
      };
    }
  }

  return {
    isValid: false,
    reason: "Code did not match any active 60-second rotation window. Potential synthetic imposter or incorrect secret."
  };
}
