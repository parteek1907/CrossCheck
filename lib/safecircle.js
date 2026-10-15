// TrustLens - The Family Safe-Word Engine
// "Assume the fake is perfect."
// Out-of-band persistent authentication against AI voice-clone & deepfake scams.
// Features: User-editable persistent safe-word, silent duress protocol, speech call analyzer.

const DEFAULT_SECRET = "CROSSCHECK-CIRCLE-FAMILY-2026";
const STORAGE_LANG_KEY = "trustlens_safeword_language";
const STORAGE_CUSTOM_SAFEWORD_KEY = "trustlens_custom_safeword";
const STORAGE_CUSTOM_DURESSWORD_KEY = "trustlens_custom_duressword";

export const SAFE_WORD_LANGUAGES = {
  en: { id: "en", label: "English", native: "English", flag: "🇬🇧" },
  hi: { id: "hi", label: "Hindi (हिन्दी)", native: "हिन्दी", flag: "🇮🇳" },
  hinglish: { id: "hinglish", label: "Hinglish (Roman)", native: "Hinglish", flag: "🇮🇳" },
  ta: { id: "ta", label: "Tamil (தமிழ்)", native: "தமிழ்", flag: "🇮🇳" },
  bn: { id: "bn", label: "Bengali (বাংলা)", native: "বাংলা", flag: "🇮🇳" },
  te: { id: "te", label: "Telugu (తెలుగు)", native: "తెలుగు", flag: "🇮🇳" },
  mr: { id: "mr", label: "Marathi (मराठी)", native: "मराठी", flag: "🇮🇳" }
};

export const DEFAULT_SAFE_WORDS = {
  en: "GOLDEN LOTUS",
  hi: "नीला पर्वत",
  hinglish: "Neela Parvat",
  ta: "தங்க மலர்",
  bn: "সোনার তারা",
  te: "బంగారు దీపం",
  mr: "सोनेरी कमळ"
};

export const DEFAULT_DURESS_WORDS = {
  en: "SILVER FALCON",
  hi: "सफेद बादल",
  hinglish: "Safed Baadal",
  ta: "வெள்ளி நிலா",
  bn: "সাদা মেঘ",
  te: "వెండి కొండ",
  mr: "पांढरा ढग"
};

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
    try {
      window.dispatchEvent(new CustomEvent("crosscheck_safeword_updated"));
    } catch {}
  }
}

/**
 * Retrieves the persistent, user-editable family safe-word and duress word.
 * @param {string} [lang]
 * @returns {{ code: string, duressCode: string, language: Object, isCustom: boolean }}
 */
export function getFamilySafeWord(lang = getSafeWordLanguage()) {
  const langKey = SAFE_WORD_LANGUAGES[lang] ? lang : "en";
  const defaultSafe = DEFAULT_SAFE_WORDS[langKey] || "GOLDEN LOTUS";
  const defaultDuress = DEFAULT_DURESS_WORDS[langKey] || "SILVER FALCON";

  if (typeof window === "undefined" || !window.localStorage) {
    return {
      code: defaultSafe,
      duressCode: defaultDuress,
      language: SAFE_WORD_LANGUAGES[langKey] || SAFE_WORD_LANGUAGES.en,
      isCustom: false
    };
  }

  const storedSafe = localStorage.getItem(STORAGE_CUSTOM_SAFEWORD_KEY);
  const storedDuress = localStorage.getItem(STORAGE_CUSTOM_DURESSWORD_KEY);

  return {
    code: (storedSafe && storedSafe.trim()) ? storedSafe.trim() : defaultSafe,
    duressCode: (storedDuress && storedDuress.trim()) ? storedDuress.trim() : defaultDuress,
    language: SAFE_WORD_LANGUAGES[langKey] || SAFE_WORD_LANGUAGES.en,
    isCustom: Boolean(storedSafe || storedDuress)
  };
}

/**
 * Updates the user's custom safe-word and/or duress word.
 * @param {string} safeWord
 * @param {string} duressWord
 * @returns {boolean}
 */
export function setFamilySafeWord(safeWord, duressWord) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  if (safeWord && safeWord.trim().length >= 2) {
    localStorage.setItem(STORAGE_CUSTOM_SAFEWORD_KEY, safeWord.trim().toUpperCase());
  }
  if (duressWord && duressWord.trim().length >= 2) {
    localStorage.setItem(STORAGE_CUSTOM_DURESSWORD_KEY, duressWord.trim().toUpperCase());
  }
  try {
    window.dispatchEvent(new CustomEvent("crosscheck_safeword_updated"));
  } catch {}
  return true;
}

/**
 * Resets family safe-words back to default for the given language.
 * @param {string} [lang]
 */
export function resetFamilySafeWord(lang = getSafeWordLanguage()) {
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.removeItem(STORAGE_CUSTOM_SAFEWORD_KEY);
  localStorage.removeItem(STORAGE_CUSTOM_DURESSWORD_KEY);
  try {
    window.dispatchEvent(new CustomEvent("crosscheck_safeword_updated"));
  } catch {}
}

/**
 * Normalizes input string across multiple scripts and spacing
 */
export function normalizeCandidate(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[\-_\s]+/g, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’‘“”]/g, "")
    .trim();
}

/**
 * Verifies a candidate safe-word spoken or transcribed by a caller.
 * Checks against the persistent family safe-word and silent duress code.
 *
 * @param {string} candidateWords - Words spoken by the caller
 * @param {Object} [options={}]
 * @param {string} [options.language]
 * @param {string} [options.safeWord]
 * @param {string} [options.duressWord]
 * @returns {Object}
 */
export function verifyFamilySafeWord(candidateWords, options = {}) {
  if (!candidateWords || !candidateWords.trim()) {
    return {
      isValid: false,
      isDuress: false,
      status: "EMPTY",
      title: "No Audio / Words Received",
      message: "Please speak into the microphone or enter the words spoken by the caller.",
      severity: "warning",
      matchedCode: null
    };
  }

  const lang = options.language || getSafeWordLanguage();
  const config = getFamilySafeWord(lang);
  const activeSafe = (options.safeWord || config.code).toUpperCase();
  const activeDuress = (options.duressWord || config.duressCode).toUpperCase();

  const normInput = normalizeCandidate(candidateWords);
  const normSafe = normalizeCandidate(activeSafe);
  const normDuress = normalizeCandidate(activeDuress);

  // 1. Check for Silent Duress Code (Highest Priority - Immediate physical threat)
  if (normInput === normDuress || (normDuress.length >= 3 && normInput.includes(normDuress))) {
    return {
      isValid: true,
      isDuress: true,
      status: "DURESS_ALERT",
      title: "Duress Alert: Caller Under Coercion",
      message: `The caller recited your family's secret distress code ("${activeDuress}"). They may be under pressure, kidnap, or extortion threat. Do not transfer funds. Contact emergency services and family immediately.`,
      severity: "critical",
      matchedCode: activeDuress
    };
  }

  // 2. Check for Authentic Family Safe-Word
  if (normInput === normSafe || (normSafe.length >= 3 && normInput.includes(normSafe))) {
    return {
      isValid: true,
      isDuress: false,
      status: "AUTHENTIC_FAMILY",
      title: "Verified: Authentic Family Member",
      message: `The caller accurately recited your family safe-word ("${activeSafe}"). Identity confirmed.`,
      severity: "success",
      matchedCode: activeSafe
    };
  }

  // 3. Imposter / Unrecognized Safe-Word
  return {
    isValid: false,
    isDuress: false,
    status: "IMPOSTOR_DETECTED",
    title: "Authentication Failed: Unrecognized Safe-Word",
    message: "The caller did not provide your family safe-word. Hang up and contact your family member directly on their known phone number.",
    severity: "danger",
    matchedCode: null
  };
}

/**
 * Backward compatibility helper for existing callers of generateDailyFamilySafeWord
 */
export async function generateDailyFamilySafeWord(options = {}) {
  const langKey = options.language || getSafeWordLanguage();
  const config = getFamilySafeWord(langKey);
  return {
    code: config.code,
    hyphenated: config.code.replace(/\s+/g, "-"),
    duressCode: config.duressCode,
    duressHyphenated: config.duressCode.replace(/\s+/g, "-"),
    language: config.language,
    isCustom: config.isCustom,
    timeRemainingFormatted: "Permanent (Editable)"
  };
}

// Backward compatibility stubs for legacy components
export function getSafeCircleSecret() {
  return DEFAULT_SECRET;
}
export function setSafeCircleSecret() {
  return true;
}
export async function generateSafeCircleCode(wordlist) {
  const config = getFamilySafeWord();
  return {
    code: config.code,
    secondsRemaining: 0,
    progressPercent: 100
  };
}
