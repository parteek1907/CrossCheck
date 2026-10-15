// TrustLens - The Family Safe-Word Engine
// "Assume the fake is perfect."
// Out-of-band daily cryptographic authentication against AI voice-clone & deepfake scams.
// Features: Daily rotating safe-word, multi-language native wordlists, silent duress protocol.

const DEFAULT_SECRET = "CROSSCHECK-CIRCLE-FAMILY-2026";
const STORAGE_SECRET_KEY = "trustlens_safecircle_secret";
const STORAGE_LANG_KEY = "trustlens_safeword_language";

export const SAFE_WORD_LANGUAGES = {
  en: { id: "en", label: "English", native: "English", flag: "🇬🇧" },
  hi: { id: "hi", label: "Hindi (हिन्दी)", native: "हिन्दी", flag: "🇮🇳" },
  hinglish: { id: "hinglish", label: "Hinglish (Roman)", native: "Hinglish", flag: "🇮🇳" },
  ta: { id: "ta", label: "Tamil (தமிழ்)", native: "தமிழ்", flag: "🇮🇳" },
  bn: { id: "bn", label: "Bengali (বাংলা)", native: "বাংলা", flag: "🇮🇳" },
  te: { id: "te", label: "Telugu (తెలుగు)", native: "తెలుగు", flag: "🇮🇳" },
  mr: { id: "mr", label: "Marathi (मराठी)", native: "मराठी", flag: "🇮🇳" }
};

// Embedded high-frequency, memorable phonetic wordlists for instant 100% offline usage
export const LOCALIZED_WORDLISTS = {
  en: [
    "SILVER", "FALCON", "GOLDEN", "LOTUS", "SUMMIT", "RIVER", "CEDAR", "BEACON",
    "BREEZE", "FOREST", "HARBOR", "VALLEY", "SHIELD", "ORCHID", "AURORA", "MARBLE",
    "JASPER", "EMERALD", "PEBBLE", "AMBER", "DOLPHIN", "WILLOW", "CYPRESS", "SAPPHIRE",
    "GALAXY", "MEADOW", "OCEAN", "PINNACLE", "CRYSTAL", "HAVEN", "RADAR", "HORIZON"
  ],
  hi: [
    "नीला", "पर्वत", "सूरज", "किरण", "चाँदी", "तारा", "सफेद", "बादल",
    "कमल", "सागर", "सुंदर", "उपवन", "शांत", "झरना", "शीतल", "हवा",
    "सोना", "दीपक", "मधुर", "आँगन", "अमृत", "वृक्ष", "उजाला", "सवेरा",
    "गंगा", "कस्तूरी", "चंदन", "तुलसी", "केसर", "माला", "मोती", "छाँव"
  ],
  hinglish: [
    "Neela", "Parvat", "Suraj", "Kiran", "Chandi", "Taara", "Safed", "Baadal",
    "Kamal", "Saagar", "Sundar", "Upvan", "Shaant", "Jharna", "Sheetal", "Hawa",
    "Sona", "Deepak", "Madhur", "Aangan", "Amrit", "Vriksh", "Ujaala", "Savera",
    "Ganga", "Chandan", "Tulsi", "Kesar", "Chai", "Moti", "Chhawn", "Mausam"
  ],
  ta: [
    "வெள்ளி", "நிலா", "தங்க", "மலர்", "நீல", "கடல்", "அமைதி", "காற்று",
    "செம்பருத்தி", "மலை", "வானம்", "முத்து", "கதிரவன்", "தீபம்", "சோலை", "அருவி",
    "சந்தனம்", "புறா", "மழை", "தென்றல்", "தாமரை", "மணல்", "பூங்கா", "விடிவெள்ளி"
  ],
  bn: [
    "সোনার", "তারা", "নীল", "আকাশ", "সাদা", "মেঘ", "শান্ত", "নদী",
    "পদ্ম", "সাগর", "মিষ্টি", "বাতাস", "উজ্জ্বল", "আলো", "সবুজ", "বন",
    "মুক্তা", "ঝর্ণা", "চন্দন", "প্রভাত", "সূর্য", "কিরণ", "কমল", "শীতল"
  ],
  te: [
    "బంగారు", "దీపం", "వెండి", "కొండ", "నీలి", "ఆకాశం", "శాంతి", "నది",
    "కమలం", "సముద్రం", "చల్లని", "గాలి", "వెలుగు", "కిరణం", "ముత్యం", "పువ్వు",
    "జాబిల్లి", "సెలయేరు", "తోట", "మేఘం", "సూర్యుడు", "చందనం", "సుగంధం", "ప్రభాతం"
  ],
  mr: [
    "सोनेरी", "कमळ", "शांत", "वारा", "निळा", "समुद्र", "उंच", "डोंगर",
    "पांढरा", "ढग", "गोड", "झरा", "शीतल", "सावली", "मोती", "किरण",
    "सूर्य", "चंद्र", "सुंदर", "बाग", "दिवा", "सकाळ", "चंदन", "प्रकाश"
  ]
};

/**
 * Retrieves the currently configured Family Safe-Word secret seed.
 * @returns {string}
 */
export function getSafeCircleSecret() {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_SECRET;
  }
  return localStorage.getItem(STORAGE_SECRET_KEY) || DEFAULT_SECRET;
}

/**
 * Updates the shared Family Safe-Word secret seed.
 * @param {string} newSecret
 * @returns {boolean}
 */
export function setSafeCircleSecret(newSecret) {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  if (newSecret && newSecret.trim().length >= 4) {
    localStorage.setItem(STORAGE_SECRET_KEY, newSecret.trim().toUpperCase());
    return true;
  }
  return false;
}

/**
 * Retrieves preferred language for the family safe word.
 * @returns {string}
 */
export function getSafeWordLanguage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return "en";
  }
  return localStorage.getItem(STORAGE_LANG_KEY) || "en";
}

/**
 * Sets preferred language for the family safe word.
 * @param {string} lang
 */
export function setSafeWordLanguage(lang) {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (SAFE_WORD_LANGUAGES[lang]) {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  }
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
 * Derives a 2-word phrase from an HMAC hash and a wordlist
 */
function deriveTwoWords(hmacBytes, wordlist) {
  const idx1 = ((hmacBytes[0] << 8) | hmacBytes[1]) % wordlist.length;
  let idx2 = ((hmacBytes[2] << 8) | hmacBytes[3]) % wordlist.length;

  if (idx1 === idx2) {
    idx2 = (idx2 + 1) % wordlist.length;
  }

  const word1 = wordlist[idx1];
  const word2 = wordlist[idx2];
  return {
    word1,
    word2,
    code: `${word1} ${word2}`,
    hyphenated: `${word1}-${word2}`
  };
}

/**
 * Generates The Family Safe-Word for the day (Daily TOTP) along with the Silent Duress Word.
 *
 * @param {Object} [options={}]
 * @param {string} [options.language="en"] - Language ID
 * @param {string} [options.secret] - Family secret seed
 * @param {number} [options.dayOffset=0] - 0 for today, -1 for yesterday, 1 for tomorrow
 * @returns {Promise<Object>}
 */
export async function generateDailyFamilySafeWord(options = {}) {
  const langKey = options.language || getSafeWordLanguage();
  const wordlist = LOCALIZED_WORDLISTS[langKey] || LOCALIZED_WORDLISTS.en;
  const secret = options.secret || getSafeCircleSecret();
  const dayOffset = options.dayOffset || 0;

  const DAY_MS = 86400000;
  const now = Date.now();
  const targetTime = now + (dayOffset * DAY_MS);

  // Epoch day window (UTC based)
  const currentDayWindow = Math.floor(targetTime / DAY_MS);

  // Time remaining until next UTC/Local rollover
  const msIntoDay = targetTime % DAY_MS;
  const msRemaining = DAY_MS - msIntoDay;
  const hoursRemaining = Math.floor(msRemaining / 3600000);
  const minutesRemaining = Math.floor((msRemaining % 3600000) / 60000);
  const secondsRemaining = Math.floor((msRemaining % 60000) / 1000);
  const progressPercent = Math.round(((DAY_MS - msRemaining) / DAY_MS) * 100);

  // Pack 64-bit integer timestamp counter
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(currentDayWindow), false);

  // 1. Primary Daily Safe-Word HMAC
  const safeHmacBytes = await computeHmacSha256(secret, new Uint8Array(buffer));
  const safePhrase = deriveTwoWords(safeHmacBytes, wordlist);

  // 2. Silent Duress Word HMAC (Salting with DURESS_PROTOCOL)
  // Used when caller is under coercion; sounds normal to scammer but triggers silent alert
  const duressHmacBytes = await computeHmacSha256(`${secret}::DURESS_PROTOCOL_v1`, new Uint8Array(buffer));
  const duressPhrase = deriveTwoWords(duressHmacBytes, wordlist);

  // 3. Yesterday's Safe Word for Grace Period
  const yesterdayBuffer = new ArrayBuffer(8);
  const yView = new DataView(yesterdayBuffer);
  yView.setBigUint64(0, BigInt(currentDayWindow - 1), false);
  const yHmacBytes = await computeHmacSha256(secret, new Uint8Array(yesterdayBuffer));
  const yesterdayPhrase = deriveTwoWords(yHmacBytes, wordlist);

  const yDuressBytes = await computeHmacSha256(`${secret}::DURESS_PROTOCOL_v1`, new Uint8Array(yesterdayBuffer));
  const yesterdayDuressPhrase = deriveTwoWords(yDuressBytes, wordlist);

  return {
    code: safePhrase.code,
    hyphenated: safePhrase.hyphenated,
    word1: safePhrase.word1,
    word2: safePhrase.word2,
    duressCode: duressPhrase.code,
    duressHyphenated: duressPhrase.hyphenated,
    duressWord1: duressPhrase.word1,
    duressWord2: duressPhrase.word2,
    yesterdayCode: yesterdayPhrase.code,
    yesterdayDuressCode: yesterdayDuressPhrase.code,
    currentDayWindow,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    progressPercent,
    timeRemainingFormatted: `${hoursRemaining}h ${minutesRemaining}m`,
    language: SAFE_WORD_LANGUAGES[langKey] || SAFE_WORD_LANGUAGES.en,
    secretMasked: `${secret.slice(0, 4)}••••${secret.slice(-4)}`
  };
}

/**
 * Normalizes input string across multiple scripts and spacing
 */
function normalizeCandidate(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[\-_\s]+/g, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .trim();
}

/**
 * Verifies a candidate safe-word spoken by a caller
 * Checks today's safe-word, yesterday's grace period, and silent duress codes
 *
 * @param {string} candidateWords - Word(s) spoken by the caller
 * @param {Object} [options={}]
 * @param {string} [options.language] - Language ID
 * @param {string} [options.secret] - Family secret
 * @returns {Promise<Object>}
 */
export async function verifyFamilySafeWord(candidateWords, options = {}) {
  if (!candidateWords || !candidateWords.trim()) {
    return {
      isValid: false,
      status: "EMPTY",
      title: "No Word Provided",
      message: "Please enter the words spoken by the caller."
    };
  }

  const normalizedInput = normalizeCandidate(candidateWords);
  const dailyData = await generateDailyFamilySafeWord(options);

  const todaySafeNorm = normalizeCandidate(dailyData.code);
  const yesterdaySafeNorm = normalizeCandidate(dailyData.yesterdayCode);
  const todayDuressNorm = normalizeCandidate(dailyData.duressCode);
  const yesterdayDuressNorm = normalizeCandidate(dailyData.yesterdayDuressCode);

  // 1. Check for Active Silent Duress Code (Highest Priority - Physical Danger)
  if (normalizedInput === todayDuressNorm || normalizedInput === yesterdayDuressNorm) {
    return {
      isValid: true,
      isDuress: true,
      status: "DURESS_ALERT",
      title: "Duress Alert: Caller Under Coercion",
      message: "The caller recited your family's secret distress code. They may be under pressure or coerced. Do not transfer funds. Contact emergency services and family immediately.",
      severity: "critical",
      matchedCode: dailyData.duressCode
    };
  }

  // 2. Check for Active Today's Safe-Word
  if (normalizedInput === todaySafeNorm) {
    return {
      isValid: true,
      isDuress: false,
      status: "AUTHENTIC_TODAY",
      title: "Verified: Authentic Family Member",
      message: `The caller accurately recited today's safe-word ("${dailyData.code}"). Identity confirmed.`,
      severity: "success",
      matchedCode: dailyData.code
    };
  }

  // 3. Check for Yesterday's Safe-Word (Grace Period)
  if (normalizedInput === yesterdaySafeNorm) {
    return {
      isValid: true,
      isDuress: false,
      status: "GRACE_PERIOD",
      title: "Grace Period: Yesterday's Safe-Word",
      message: `The caller recited yesterday's word ("${dailyData.yesterdayCode}"). Accepted under the grace period.`,
      severity: "warning",
      matchedCode: dailyData.yesterdayCode
    };
  }

  // 4. Failed Match -> Unrecognized Word
  return {
    isValid: false,
    isDuress: false,
    status: "IMPOSTOR_DETECTED",
    title: "Authentication Failed: Unrecognized Safe-Word",
    message: "The caller did not provide the correct safe-word. Hang up and contact your family member directly on their known phone number.",
    severity: "danger",
    matchedCode: null
  };
}

// =========================================================================
// BACKWARD COMPATIBILITY EXPORTS FOR LEGACY 60s TOTP UNIT TESTS
// =========================================================================

export async function generateSafeCircleCode(wordlist, secret = getSafeCircleSecret(), timeOffsetSeconds = 0) {
  if (!wordlist || wordlist.length === 0) {
    throw new Error("Wordlist is required for Safe Circle generation");
  }

  const nowMs = Date.now() + timeOffsetSeconds * 1000;
  const currentWindow = Math.floor(nowMs / 60000);
  const secondsRemaining = 60 - Math.floor((nowMs / 1000) % 60);
  const progressPercent = Math.round((secondsRemaining / 60) * 100);

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(currentWindow), false);

  const hmacBytes = await computeHmacSha256(secret, new Uint8Array(buffer));

  const idx1 = ((hmacBytes[0] << 8) | hmacBytes[1]) % wordlist.length;
  let idx2 = ((hmacBytes[2] << 8) | hmacBytes[3]) % wordlist.length;

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

export async function verifySafeCircleSpokenCode(candidateWords, wordlist, secret = getSafeCircleSecret()) {
  if (!candidateWords) return { isValid: false, reason: "No code provided" };

  const normalized = candidateWords
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s\-]/g, "")
    .replace(/\s+/g, "-");

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
