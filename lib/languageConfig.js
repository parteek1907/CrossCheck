// Crosscheck Multilingual Language Configuration
// Supports 11 Indic Languages + English for Voice Incident Intake
// Maps ISO-639-1 codes to Groq Whisper parameters with native script labels and test confidence tiers.

export const SUPPORTED_LANGUAGES = [
  {
    code: "auto",
    name: "Auto Detect",
    nativeName: "स्वतः पहचान",
    isBeta: false,
    description: "Whisper automatically identifies your language and dialect",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English (Indian / Global)",
    isBeta: false,
    description: "High accuracy transcription for English and Hinglish terms",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    isBeta: false,
    description: "High accuracy transcription for Hindi and mixed Hinglish narratives",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    isBeta: true,
    description: "Regional transcription - verified for cybercrime terms",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    isBeta: false,
    description: "Verified Indic pipeline for Bengali incident intake",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    isBeta: false,
    description: "Verified Indic pipeline for Maharashtra cyber cell reporting",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    isBeta: true,
    description: "Regional transcription - verified for financial fraud terms",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    isBeta: false,
    description: "Verified Indic pipeline for Tamil Nadu reporting",
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    isBeta: false,
    description: "Verified Indic pipeline for Telangana/AP cyber reporting",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    isBeta: true,
    description: "Regional transcription - verify names and numbers carefully",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    isBeta: true,
    description: "Regional transcription - verify transaction IDs carefully",
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    isBeta: true,
    description: "Regional transcription - verified for helpline reporting",
  },
];

export function getLanguageByCode(code) {
  if (!code) return SUPPORTED_LANGUAGES[0];
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || {
    code,
    name: code.toUpperCase(),
    nativeName: code.toUpperCase(),
    isBeta: true,
  };
}
