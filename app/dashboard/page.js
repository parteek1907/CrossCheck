"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History as HistoryIcon,
  Archive,
  Radio,
  Settings as SettingsIcon,
  HelpCircle,
  Search,
  Plus,
  Bookmark,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  FileText,
  Link as LinkIcon,
  File as FileIcon,
  ImageIcon,
  Menu,
  X,
  Sparkles,
  ArrowUpRight,
  Sun,
  Moon,
  Languages,
  Check,
  Copy,
  Volume2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Share2,
  KeyRound,
  Users,
  PhoneCall,
  Clock,
  ShieldAlert,
  AlertCircle,
  Upload,
  Send,
  FilePlus,
  Phone,
  FileDown,
  Mic,
  MicOff,
  Edit3,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

import {
  getStoredReports,
  saveStoredReport,
  deleteReportById,
  toggleSaveReport,
  computeDashboardStats,
  INITIAL_STATS,
  getUserProfile,
  saveUserProfile,
  getSettings,
  saveSettings,
} from "../../lib/storage.js";
import {
  getVaultEntries,
  verifyVaultIntegrity,
  fileIncidentReport,
  deleteVaultEntry,
  generateComplaintDraft,
} from "../../lib/vault.js";
import {
  getFamilySafeWord,
  setFamilySafeWord,
  resetFamilySafeWord,
  verifyFamilySafeWord,
  SAFE_WORD_LANGUAGES,
  getSafeWordLanguage,
  setSafeWordLanguage,
} from "../../lib/safecircle.js";
import { VerificationModal } from "../../components/VerificationModal";
import { CommandPalette } from "../../components/CommandPalette";
import { ToastProvider, useToast } from "../../components/Toast";

// Bilingual labels (English / Hindi)
const I18N = {
  en: {
    dashboard: "Dashboard",
    history: "History",
    vault: "Evidence Vault",
    safeCircle: "Family Safe-Word",
    settings: "Settings",
    helpCenter: "Help Center (1930)",
    newVerification: "New verification",
    searchPlaceholder: "Search reports",
    totalProofs: "Total proofs",
    totalProofsCaption: "Total verified reports on this device",
    flaggedClaims: "Flagged claims",
    flaggedClaimsCaption: "Likely manipulated / all checks",
    avgDuration: "Average time to verdict",
    avgDurationCaption: "Average duration per check",
    highConfidence: "High-confidence results",
    highConfidenceCaption: "Score margin of ±10 or less",
    quickDropzone: "Paste a claim, drop an image or PDF, or paste a link.",
    quickDropzoneHint: "Click to start check or drag & drop a file here directly",
    recentVerifications: "Recent verifications",
    runFirstCheck: "Run your first check",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    history: "इतिहास",
    vault: "साक्ष्य वॉल्ट",
    safeCircle: "फ़ैमिली सेफ़-वर्ड",
    settings: "सेटिंग्स",
    helpCenter: "सहायता केंद्र (1930)",
    newVerification: "नया सत्यापन",
    searchPlaceholder: "रिपोर्ट खोजें",
    totalProofs: "कुल सत्यापन",
    totalProofsCaption: "इस डिवाइस पर कुल सत्यापित रिपोर्ट",
    flaggedClaims: "संदिग्ध दावे",
    flaggedClaimsCaption: "संभावित हेरफेर / कुल जांच",
    avgDuration: "औसत समय",
    avgDurationCaption: "प्रति जांच औसत समय",
    highConfidence: "उच्च विश्वसनीयता",
    highConfidenceCaption: "±10 या कम का स्कोर मार्जिन",
    quickDropzone: "कोई दावा पेस्ट करें, छवि/PDF ड्रॉप करें, या लिंक दर्ज करें।",
    quickDropzoneHint: "सत्यापन शुरू करने के लिए क्लिक करें या फ़ाइल यहाँ छोड़ें",
    recentVerifications: "हाल के सत्यापन",
    runFirstCheck: "पहला सत्यापन चलाएं",
  },
};

const VALID_NAVS = ["dashboard", "history", "vault", "safecircle", "settings", "help"];

function CrosscheckAppContent() {
  const router = useRouter();
  const { showToast } = useToast();

  // Navigation: 'dashboard' | 'history' | 'vault' | 'safecircle' | 'clustering' | 'settings' | 'help'
  // Persisted across page reloads via URL search params (?tab=...) and localStorage
  const [activeNav, setActiveNavState] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        if (urlTab && VALID_NAVS.includes(urlTab)) {
          return urlTab;
        }
        const storedTab = localStorage.getItem("crosscheck_active_tab");
        if (storedTab && VALID_NAVS.includes(storedTab)) {
          return storedTab;
        }
      } catch (e) {
        console.warn("Could not read initial active tab:", e);
      }
    }
    return "dashboard";
  });

  const setActiveNav = useCallback((tab) => {
    if (!VALID_NAVS.includes(tab)) return;
    setActiveNavState(tab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("crosscheck_active_tab", tab);
        const url = new URL(window.location.href);
        if (tab === "dashboard") {
          url.searchParams.delete("tab");
        } else {
          url.searchParams.set("tab", tab);
        }
        window.history.replaceState(null, "", url.toString());
      } catch (e) {
        console.warn("Could not persist active tab:", e);
      }
    }
  }, []);

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Storage state
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [userProfile, setUserProfile] = useState({ displayName: "Guest", role: "Forensic Analyst" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("Guest");

  // Settings: Theme & Language
  const [settings, setLocalSettings] = useState({ theme: "light", language: "en" });

  // Loading skeleton state
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPrefill, setModalPrefill] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Filters
  const [historyFilterSaved, setHistoryFilterSaved] = useState(false);

  // Vault state
  const [vaultEntries, setVaultEntries] = useState([]);

  // Evidence Vault Incident Reporting state
  const [isFilingIncident, setIsFilingIncident] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState("scam");
  const [incidentDetails, setIncidentDetails] = useState("");
  const [incidentPlatform, setIncidentPlatform] = useState("WhatsApp");
  const [incidentScreenshot, setIncidentScreenshot] = useState(null);
  const [incidentContactName, setIncidentContactName] = useState("");
  const [incidentContactPhone, setIncidentContactPhone] = useState("");
  const [incidentContactEmail, setIncidentContactEmail] = useState("");
  const [incidentSuspectInfo, setIncidentSuspectInfo] = useState("");
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [submittedIncidentResult, setSubmittedIncidentResult] = useState(null);
  const [selectedDossierEntry, setSelectedDossierEntry] = useState(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [copiedCaseId, setCopiedCaseId] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const screenshotFileRef = useRef(null);

  // The Family Safe-Word state (Persistent & User-Editable)
  const [safeWordLang, setSafeWordLang] = useState("en");
  const [safeWordData, setSafeWordData] = useState(() => getFamilySafeWord("en"));
  const [isDuressRevealed, setIsDuressRevealed] = useState(false);
  const [copiedSafeWord, setCopiedSafeWord] = useState(false);
  const [copiedDuressWord, setCopiedDuressWord] = useState(false);

  // Edit Safe-Word Modal State
  const [isEditWordModalOpen, setIsEditWordModalOpen] = useState(false);
  const [editSafeInput, setEditSafeInput] = useState("");
  const [editDuressInput, setEditDuressInput] = useState("");

  // Microphone & Live Call Audio Analysis State
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isAnalyzingCall, setIsAnalyzingCall] = useState(false);
  const [callAnalysisResult, setCallAnalysisResult] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputText, setManualInputText] = useState("");
  const recognitionRef = useRef(null);
  const liveTranscriptRef = useRef("");
  const isStoppingToAnalyzeRef = useRef(false);
  const analyzeTimeoutRef = useRef(null);

  // Legacy safeCode & wordlist for tests / 60s demo mode
  const [wordlist, setWordlist] = useState([]);
  const [safeCode, setSafeCode] = useState({ code: "LOADING...", secondsRemaining: 60, progressPercent: 100 });

  // Row action menu dropdown state
  const [activeMenuReportId, setActiveMenuReportId] = useState(null);

  // Translations shortcut
  const t = I18N[settings.language] || I18N.en;

  const refreshLocalData = useCallback(() => {
    const stored = getStoredReports();
    setReports(stored);
    setStats(computeDashboardStats(stored));
    setVaultEntries(getVaultEntries());
    const prof = getUserProfile();
    setUserProfile(prof);
    setTempName(prof.displayName || "Guest");
    const sett = getSettings();
    setLocalSettings(sett);
    setSafeWordLang(getSafeWordLanguage());
    setSafeWordData(getFamilySafeWord(getSafeWordLanguage()));
    if (sett.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    refreshLocalData();
    setIsLoading(false);

    fetch("/data/wordlist.json")
      .then((r) => r.json())
      .then((words) => setWordlist(words))
      .catch(() => setWordlist([]));

    window.addEventListener("crosscheck_reports_updated", refreshLocalData);
    window.addEventListener("crosscheck_profile_updated", refreshLocalData);
    window.addEventListener("crosscheck_settings_updated", refreshLocalData);
    window.addEventListener("crosscheck_vault_updated", refreshLocalData);
    window.addEventListener("focus", refreshLocalData);

    return () => {
      window.removeEventListener("crosscheck_reports_updated", refreshLocalData);
      window.removeEventListener("crosscheck_profile_updated", refreshLocalData);
      window.removeEventListener("crosscheck_settings_updated", refreshLocalData);
      window.removeEventListener("crosscheck_vault_updated", refreshLocalData);
      window.removeEventListener("focus", refreshLocalData);
    };
  }, [refreshLocalData]);

  // Set document title per active page
  useEffect(() => {
    const navTitles = {
      dashboard: "Dashboard",
      history: "History",
      vault: "Evidence Vault",
      safecircle: "The Family Safe-Word",
      settings: "Settings",
      help: "Help Center",
    };
    const title = navTitles[activeNav] || "Dashboard";
    document.title = `${title} | Crosscheck`;
  }, [activeNav]);

  // Sync tab state with browser URL search params (?tab=...) and browser back/forward history
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      if (urlTab && VALID_NAVS.includes(urlTab)) {
        setActiveNavState(urlTab);
        localStorage.setItem("crosscheck_active_tab", urlTab);
      } else {
        const storedTab = localStorage.getItem("crosscheck_active_tab");
        if (storedTab && VALID_NAVS.includes(storedTab)) {
          setActiveNavState(storedTab);
          if (storedTab !== "dashboard") {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", storedTab);
            window.history.replaceState(null, "", url.toString());
          }
        }
      }
    } catch (e) {
      console.warn("Tab hydration error:", e);
    }

    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        if (urlTab && VALID_NAVS.includes(urlTab)) {
          setActiveNavState(urlTab);
        } else {
          const stored = localStorage.getItem("crosscheck_active_tab");
          if (stored && VALID_NAVS.includes(stored)) {
            setActiveNavState(stored);
          } else {
            setActiveNavState("dashboard");
          }
        }
      } catch {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Global Keyboard Shortcuts: ⌘K for search palette, "N" / "n" for new verification
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable;

      // ⌘K / Ctrl+K opens Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // "N" / "n" opens New Verification Modal when not typing
      if (!isInput && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setModalPrefill(null);
        setIsModalOpen(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Live update for The Family Safe-Word (no daily rotation, stays set until edited)
  useEffect(() => {
    const updateWords = () => {
      const data = getFamilySafeWord(safeWordLang);
      setSafeWordData(data);
    };
    updateWords();
    window.addEventListener("crosscheck_safeword_updated", updateWords);
    return () => window.removeEventListener("crosscheck_safeword_updated", updateWords);
  }, [safeWordLang]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, []);

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition not supported in this browser. Please use quick simulation or manual typing.", "warning");
      setShowManualInput(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }

      liveTranscriptRef.current = "";
      isStoppingToAnalyzeRef.current = false;
      setLiveTranscript("");
      setCallAnalysisResult(null);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      const langMap = {
        en: "en-US",
        hi: "hi-IN",
        hinglish: "hi-IN",
        ta: "ta-IN",
        bn: "bn-IN",
        te: "te-IN",
        mr: "mr-IN",
      };
      recognition.lang = langMap[safeWordLang] || "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        showToast("Microphone listening... Hold phone near speaker or speak caller words.", "info");
      };

      recognition.onresult = (event) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
        const combined = fullTranscript.trim();
        if (combined) {
          liveTranscriptRef.current = combined;
          setLiveTranscript(combined);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error !== "no-speech") {
          showToast(`Microphone notice: ${event.error}`, "warning");
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setIsListening(false);
          showToast("Microphone access denied. Please allow microphone permissions or use quick simulation.", "error");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isStoppingToAnalyzeRef.current) {
          isStoppingToAnalyzeRef.current = false;
          if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
          const captured = (liveTranscriptRef.current || "").trim();
          if (captured) {
            handleAnalyzeCallerSpeech(captured);
          } else {
            showToast("No speech audio was detected. Hold mic near caller speaker, or choose a simulation below.", "warning");
            setShowManualInput(true);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      showToast("Could not access microphone. Please verify mic permissions in browser.", "error");
      setIsListening(false);
    }
  };

  const stopListening = (autoAnalyze = true) => {
    setIsListening(false);

    if (autoAnalyze) {
      isStoppingToAnalyzeRef.current = true;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Recognition stop error:", e);
      }
    }

    if (!autoAnalyze) return;

    // Safety fallback: in case recognition.onend doesn't fire or is delayed by browser
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    analyzeTimeoutRef.current = setTimeout(() => {
      if (isStoppingToAnalyzeRef.current) {
        isStoppingToAnalyzeRef.current = false;
        const captured = (liveTranscriptRef.current || liveTranscript).trim();
        if (captured) {
          handleAnalyzeCallerSpeech(captured);
        } else {
          showToast("No speech audio was detected. Hold mic near caller speaker, or choose a simulation below.", "warning");
          setShowManualInput(true);
        }
      }
    }, 350);
  };

  const handleAnalyzeCallerSpeech = async (speechText) => {
    const textToAnalyze = (speechText || liveTranscriptRef.current || liveTranscript || manualInputText).trim();
    if (!textToAnalyze) {
      showToast("No spoken or written words detected to analyze.", "warning");
      setShowManualInput(true);
      return;
    }

    // Keep transcript in sync for display
    setLiveTranscript(textToAnalyze);
    liveTranscriptRef.current = textToAnalyze;

    setIsAnalyzingCall(true);
    setCallAnalysisResult(null);
    try {
      const res = await fetch("/api/analyze-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: textToAnalyze,
          safeWord: safeWordData?.code || "GOLDEN LOTUS",
          duressWord: safeWordData?.duressCode || "SILVER FALCON",
          language: safeWordLang,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCallAnalysisResult(data.data);
        if (data.data.verdict === "VERIFIED_FAMILY") {
          showToast("Identity Confirmed: Authentic Family Member!", "success");
        } else if (data.data.verdict === "DURESS_ALERT") {
          showToast("CRITICAL: Silent Duress Emergency Word Spoken!", "error");
        } else {
          showToast("SCAM WARNING: Imposter / Safe-Word Missing!", "error");
        }
      } else {
        throw new Error(data.error || "Failed to analyze call");
      }
    } catch (err) {
      console.warn("Remote call analysis failed, falling back to local verification:", err);
      const local = verifyFamilySafeWord(textToAnalyze, {
        safeWord: safeWordData?.code,
        duressWord: safeWordData?.duressCode,
        language: safeWordLang,
      });

      const isScam = local.status === "IMPOSTOR_DETECTED";
      setCallAnalysisResult({
        verdict: local.status === "AUTHENTIC_FAMILY" ? "VERIFIED_FAMILY" : local.status === "DURESS_ALERT" ? "DURESS_ALERT" : "SCAM_IMPOSTER",
        confidence: isScam ? 90 : 98,
        headline: local.title,
        summary: local.message,
        hasSafeWord: local.status === "AUTHENTIC_FAMILY",
        hasDuressWord: local.status === "DURESS_ALERT",
        threatSignals: isScam ? ["Safe-word verification failed", "Unverified caller on phone"] : [],
        recommendedActions: isScam
          ? ["Immediately disconnect the call.", "Do not transfer money or OTPs.", "Call your relative directly on their known phone."]
          : ["Safe-word verified. You may proceed normally."],
        transcript: textToAnalyze,
      });
    } finally {
      setIsAnalyzingCall(false);
    }
  };

  const handleCopySafeWord = (text, type = "safe") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "safe") {
      setCopiedSafeWord(true);
      setTimeout(() => setCopiedSafeWord(false), 2000);
    } else {
      setCopiedDuressWord(true);
      setTimeout(() => setCopiedDuressWord(false), 2000);
    }
    showToast("Copied to clipboard!", "success");
  };

  const handleShareToWhatsApp = () => {
    if (!safeWordData) return;
    const text = `🛡️ *Crosscheck - Family Safe-Word Protocol*\n\nTo defeat AI voice-clone & phone extortion scams, our family is using this authentication word:\n\n🗣️ *Family Safe-Word:* "${safeWordData.code}"\n🤫 *Silent Duress Code:* "${safeWordData.duressCode}"\n\n⚠️ *Family Rule:* If anyone calls asking for urgent money claiming to be family from an unknown number, ALWAYS ask for this safe-word first!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleSpeakSafeWord = (word, langId) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      if (langId === "hi") utterance.lang = "hi-IN";
      else if (langId === "ta") utterance.lang = "ta-IN";
      else if (langId === "bn") utterance.lang = "bn-IN";
      else if (langId === "te") utterance.lang = "te-IN";
      else if (langId === "mr") utterance.lang = "mr-IN";
      else utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS error:", e);
    }
  };

  const handleOpenEditWordModal = () => {
    setEditSafeInput(safeWordData?.code || "");
    setEditDuressInput(safeWordData?.duressCode || "");
    setIsEditWordModalOpen(true);
  };

  const handleSaveEditedWords = () => {
    if (!editSafeInput.trim() || editSafeInput.trim().length < 2) {
      showToast("Safe-word must be at least 2 characters.", "warning");
      return;
    }
    setFamilySafeWord(editSafeInput.trim(), editDuressInput.trim() || "SILVER FALCON");
    setSafeWordData(getFamilySafeWord(safeWordLang));
    setIsEditWordModalOpen(false);
    showToast("Family safe-word updated! Stays active permanently until edited.", "success");
  };

  const handleResetToDefaultWords = () => {
    resetFamilySafeWord(safeWordLang);
    setSafeWordData(getFamilySafeWord(safeWordLang));
    setIsEditWordModalOpen(false);
    showToast("Reset to language default safe-words.", "info");
  };

  const handleAddCallToEvidenceVault = async () => {
    if (!callAnalysisResult) return;
    try {
      const details = `Caller Transcript: "${callAnalysisResult.transcript}"\nForensic Classification: ${callAnalysisResult.headline}\nAnalysis: ${callAnalysisResult.summary}\nThreat Signals: ${callAnalysisResult.threatSignals?.join(", ") || "None"}`;
      await fileIncidentReport({
        category: "scam",
        details,
        platform: "Incoming Phone Call",
        contactName: userProfile?.displayName || "Citizen Complainant",
        suspectInfo: "Unknown caller claiming to be family",
      });
      setVaultEntries(getVaultEntries());
      showToast("Call incident logged in Evidence Vault!", "success");
    } catch (err) {
      showToast("Failed to add to Evidence Vault: " + err.message, "error");
    }
  };

  const handleScreenshotChange = (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showToast("Screenshot must be under 15MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIncidentScreenshot({
        name: file.name,
        size: file.size,
        mimeType: file.type,
        previewUrl: typeof reader.result === "string" ? reader.result : null
      });
      showToast("Screenshot attached successfully!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitIncident = async (e) => {
    e?.preventDefault();
    if (!incidentDetails.trim()) {
      showToast("Please provide details of what happened.", "error");
      return;
    }

    setIsSubmittingIncident(true);
    try {
      const result = await fileIncidentReport({
        category: incidentCategory,
        details: incidentDetails.trim(),
        platform: incidentPlatform,
        screenshot: incidentScreenshot,
        contactName: incidentContactName.trim() || userProfile.displayName || "Citizen Complainant",
        contactPhone: incidentContactPhone.trim(),
        contactEmail: incidentContactEmail.trim() || userProfile.email || "",
        suspectInfo: incidentSuspectInfo.trim(),
      });

      setSubmittedIncidentResult(result);
      showToast("Incident report successfully queued & dispatched to Cyber Cell!", "success");
      setVaultEntries(getVaultEntries());
      // Reset form fields
      setIncidentDetails("");
      setIncidentScreenshot(null);
      setIncidentSuspectInfo("");
      setIsFilingIncident(false);
    } catch (err) {
      console.error("Failed to file incident report:", err);
      showToast("Failed to file report: " + err.message, "error");
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const handleDownloadDossier = (entry) => {
    if (!entry) return;
    const text = generateComplaintDraft(entry);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cyber_Complaint_${entry.caseId || entry.reportId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Complaint dossier downloaded successfully!", "success");
  };

  const handleDeleteVaultEntry = (id) => {
    if (confirm("Are you sure you want to remove this record from the Evidence Vault?")) {
      deleteVaultEntry(id);
      setVaultEntries(getVaultEntries());
      showToast("Record removed from Evidence Vault.", "info");
      if (selectedDossierEntry?.reportId === id || selectedDossierEntry?.caseId === id) {
        setIsDossierModalOpen(false);
      }
    }
  };

  const handleSaveName = () => {
    const clean = tempName.trim() || "Guest";
    const updated = { ...userProfile, displayName: clean };
    saveUserProfile(updated);
    setUserProfile(updated);
    setIsEditingName(false);
    showToast("Profile name updated", "success");
  };

  const handleThemeToggle = (theme) => {
    const updated = { ...settings, theme };
    saveSettings(updated);
    setLocalSettings(updated);
    showToast(`Switched to ${theme} theme`, "info");
  };

  const handleLanguageToggle = (lang) => {
    const updated = { ...settings, language: lang };
    saveSettings(updated);
    setLocalSettings(updated);
    showToast(lang === "hi" ? "भाषा बदलकर हिन्दी की गई" : "Language switched to English", "info");
  };

  const handleVerificationComplete = (report) => {
    saveStoredReport(report);
    refreshLocalData();
    showToast("Verification complete! Record added to ledger.", "success");
    router.push(`/report/${encodeURIComponent(report.reportId)}`);
  };

  const handleDeleteReport = (reportId, e) => {
    e?.stopPropagation();
    if (confirm("Delete this verification record from this device?")) {
      deleteReportById(reportId);
      refreshLocalData();
      showToast("Report deleted from device", "info");
    }
    setActiveMenuReportId(null);
  };

  const handleBookmarkToggle = (reportId, e) => {
    e?.stopPropagation();
    const isNowSaved = toggleSaveReport(reportId);
    refreshLocalData();
    showToast(isNowSaved ? "Saved to bookmarks" : "Removed from bookmarks", "success");
    setActiveMenuReportId(null);
  };

  // Quick Dropzone drag handlers
  const handleDropzoneDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      setModalPrefill({ tab: "file", file: files[0] });
      setIsModalOpen(true);
      return;
    }
    const text = e.dataTransfer?.getData("text");
    if (text) {
      if (text.startsWith("http://") || text.startsWith("https://")) {
        setModalPrefill({ tab: "link", link: text.trim() });
      } else {
        setModalPrefill({ tab: "text", text: text.trim() });
      }
      setIsModalOpen(true);
    }
  };

  // Helper for input type icon
  const getInputTypeIcon = (r) => {
    if (r.submittedMedia?.type?.includes("pdf") || r.category?.toLowerCase().includes("pdf")) {
      return <FileIcon className="w-3.5 h-3.5 text-gray-400" title="PDF Document" />;
    }
    if (r.submittedMedia?.type?.includes("image") || r.category?.toLowerCase().includes("photo")) {
      return <ImageIcon className="w-3.5 h-3.5 text-gray-400" title="Image File" />;
    }
    if (r.inputText?.startsWith("http://") || r.inputText?.startsWith("https://") || r.inputText?.includes("URL Verification")) {
      return <LinkIcon className="w-3.5 h-3.5 text-gray-400" title="Web Link" />;
    }
    return <FileText className="w-3.5 h-3.5 text-gray-400" title="Text Statement" />;
  };

  const filteredReports = reports.filter((r) => {
    if (historyFilterSaved && !r.isSaved) return false;
    return true;
  });

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0A0C10] text-gray-900 dark:text-gray-100 font-sans flex antialiased relative selection:bg-blue-500/20">
      {/* ========================================================
          AMBIENT LUMINOUS GLASS AURAS (Dynamic Background Depth)
          ======================================================== */}
      <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-br from-blue-500/12 via-indigo-500/8 to-transparent blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-cyan-500/10 via-purple-500/8 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-tr from-sky-400/6 via-blue-500/5 to-transparent blur-[110px] pointer-events-none -z-10" />

      {/* ========================================================
          MOBILE FLOATING HAMBURGER (MD:HIDDEN)
          ======================================================== */}
      <button
        type="button"
        onClick={() => setIsMobileDrawerOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden p-2.5 rounded-2xl backdrop-blur-xl bg-white/75 dark:bg-[#131620]/75 border border-white/80 dark:border-white/10 text-gray-700 dark:text-gray-200 shadow-lg active:scale-95 transition-all"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ========================================================
          MOBILE DRAWER BACKDROP
          ======================================================== */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md md:hidden transition-all duration-300"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ========================================================
          FIXED FROSTED SIDEBAR DOCK (260PX WIDE, 100VH)
          ======================================================== */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 h-[100dvh] backdrop-blur-2xl bg-white/75 dark:bg-[#0D1017]/75 border-r border-white/80 dark:border-white/10 flex flex-col justify-between transition-all duration-300 ease-in-out shadow-[4px_0_30px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.3)] ${
          isMobileDrawerOpen
            ? "translate-x-0 w-[260px] p-6 shadow-2xl"
            : "-translate-x-full md:translate-x-0 w-20 min-[1100px]:w-[260px] p-4 min-[1100px]:p-6"
        }`}
      >
        {/* Top: Brand, Primary "+ New verification", Search */}
        <div className="space-y-5">
          {/* Brand Logo & Close for Mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5" title="Crosscheck">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/25 border border-white/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
                </svg>
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent hidden min-[1100px]:inline">
                Crosscheck
              </span>
            </div>
            {isMobileDrawerOpen && (
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Primary "+ New verification" button (ILLUMINATED GLASS PILL) */}
          <button
            type="button"
            title={t.newVerification}
            onClick={() => {
              setModalPrefill(null);
              setIsModalOpen(true);
              setIsMobileDrawerOpen(false);
            }}
            className="w-full h-10 px-3.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.3)] border border-blue-400/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden min-[1100px]:inline tracking-tight">{t.newVerification}</span>
          </button>

          {/* Search field (⌘K hint for search palette - TRANSLUCENT) */}
          <div
            onClick={() => setIsCommandPaletteOpen(true)}
            title={`${t.searchPlaceholder} (⌘K)`}
            className="h-10 px-3 rounded-xl border border-white/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] hover:bg-white/80 dark:hover:bg-white/[0.08] backdrop-blur-md flex items-center justify-between cursor-pointer transition-all shadow-xs hover:border-blue-400/40"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="hidden min-[1100px]:inline truncate">{t.searchPlaceholder}</span>
            </div>
            <kbd className="hidden min-[1100px]:inline px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white/80 dark:bg-white/10 rounded-md border border-black/5 dark:border-white/10">
              ⌘K
            </kbd>
          </div>

          {/* Middle Navigation (Translucent active capsules) */}
          <nav aria-label="Main Navigation" className="pt-2">
            <ul className="space-y-1.5">
              {[
                { id: "dashboard", label: t.dashboard, icon: LayoutDashboard },
                { id: "history", label: t.history, icon: HistoryIcon, badge: reports.length },
                { id: "vault", label: t.vault, icon: Archive, badge: vaultEntries.length },
                { id: "safecircle", label: t.safeCircle, icon: KeyRound },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      title={item.label}
                      onClick={() => {
                        setActiveNav(item.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 cursor-pointer ${
                        isActive
                          ? "bg-blue-600/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 dark:border-blue-400/25 shadow-xs backdrop-blur-md font-bold"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.06] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden min-[1100px]:inline">{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="hidden min-[1100px]:inline text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Bottom: Settings, Help Center (1930), User Chip, Privacy Note */}
        <div className="mt-auto pt-4 border-t border-white/60 dark:border-white/10 space-y-2">
          <button
            type="button"
            title={t.settings}
            onClick={() => {
              setActiveNav("settings");
              setIsMobileDrawerOpen(false);
            }}
            aria-current={activeNav === "settings" ? "page" : undefined}
            className={`w-full h-10 px-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
              activeNav === "settings"
                ? "bg-blue-600/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 dark:border-blue-400/25 font-bold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.06] border border-transparent"
            }`}
          >
            <SettingsIcon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden min-[1100px]:inline">{t.settings}</span>
          </button>

          <button
            type="button"
            title={t.helpCenter}
            onClick={() => {
              setActiveNav("help");
              setIsMobileDrawerOpen(false);
            }}
            aria-current={activeNav === "help" ? "page" : undefined}
            className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
              activeNav === "help"
                ? "bg-blue-600/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 dark:border-blue-400/25 font-bold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.06] border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span className="hidden min-[1100px]:inline">{t.helpCenter}</span>
            </div>
            <span className="hidden min-[1100px]:inline text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.2 rounded-full">
              SOS
            </span>
          </button>

          {/* User Chip (FROSTED CAPSULE) */}
          <div className="pt-2">
            <div
              title={`${userProfile.displayName || "Guest"} — Stored on this device`}
              className="p-2.5 rounded-xl backdrop-blur-md bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 flex items-center gap-2.5 shadow-xs"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                {userProfile.displayName ? userProfile.displayName.slice(0, 1).toUpperCase() : "G"}
              </div>
              <div className="hidden min-[1100px]:block overflow-hidden flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      className="w-20 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-black rounded"
                      autoFocus
                    />
                    <button onClick={handleSaveName} className="text-[10px] text-blue-600 font-bold">
                      Save
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingName(true)}
                    className="cursor-pointer group truncate"
                    title="Click to edit name"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
                      {userProfile.displayName || "Guest"}
                    </span>
                    <span className="text-[10px] text-gray-400 block truncate">
                      Stored on this device
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Small Privacy Note */}
          <p className="hidden min-[1100px]:block text-[10px] text-gray-400 text-center pt-1 font-medium">
            Images are analysed on your device.
          </p>
        </div>
      </aside>

      {/* ========================================================
          MAIN AREA (FILLS REST OF WIDTH, ONLY THIS AREA SCROLLS)
          PADDING: 32PX (P-8). NO HORIZONTAL OVERFLOW.
          ======================================================== */}
      <div className="flex-1 min-w-0 md:ml-20 min-[1100px]:ml-[260px] h-[100dvh] overflow-y-auto overflow-x-hidden">
        <div className="p-8 min-[1601px]:max-w-[1400px] min-[1601px]:mx-auto w-full space-y-8">
          {/* ========================================================
              DASHBOARD VIEW
              ======================================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-8 animate-in fade-in-0 duration-200">
              {/* Page Header (No buttons here!) */}
              <div className="pl-12 md:pl-0">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {t.dashboard}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Real-time digital forensics, open wire corroboration, and tamper-evident proof ledger.
                </p>
              </div>

              {/* QUICK-CHECK DROPZONE CARD (STEP 5 - FROSTED LIQUID GLASS) */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropzoneDrop}
                onClick={() => {
                  setModalPrefill(null);
                  setIsModalOpen(true);
                }}
                className="p-5 sm:p-6 border-2 border-dashed border-blue-400/40 dark:border-blue-500/30 hover:border-blue-500 dark:hover:border-blue-400 bg-white/60 dark:bg-[#131620]/50 hover:bg-white/80 dark:hover:bg-[#181C28]/70 backdrop-blur-xl rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 group shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-blue-500/10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform backdrop-blur-md shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                      {t.quickDropzone}
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.quickDropzoneHint}
                    </p>
                  </div>
                </div>
                <kbd className="hidden sm:inline px-2.5 py-1 text-[10px] font-mono text-gray-500 dark:text-gray-300 bg-white/80 dark:bg-white/10 rounded-lg border border-white/80 dark:border-white/10 shadow-xs backdrop-blur-md">
                  Press N
                </kbd>
              </div>

              {/* KPI ROW (4 EQUAL HEIGHT CARDS - FROSTED SPECULAR GLASS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Proofs */}
                <div className="p-5 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:shadow-lg hover:border-blue-400/30 transition-all duration-300 flex flex-col justify-between group">
                  <div className="text-[11px] font-mono uppercase text-gray-400 dark:text-gray-400 font-semibold tracking-wider">
                    {t.totalProofs}
                  </div>
                  <div className="my-2 text-3xl font-extrabold font-mono text-gray-900 dark:text-white group-hover:translate-x-0.5 transition-transform">
                    {isLoading ? "—" : stats.totalProofs > 0 ? stats.totalProofs : "—"}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.totalProofsCaption}
                  </div>
                </div>

                {/* 2. Flagged Claims */}
                <div className="p-5 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:shadow-lg hover:border-red-400/30 transition-all duration-300 flex flex-col justify-between group">
                  <div className="text-[11px] font-mono uppercase text-gray-400 dark:text-gray-400 font-semibold tracking-wider">
                    {t.flaggedClaims}
                  </div>
                  <div className={`my-2 text-3xl font-extrabold font-mono group-hover:translate-x-0.5 transition-transform ${stats.totalProofs > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : `${stats.disputedPercent}%`}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.flaggedClaimsCaption}
                  </div>
                </div>

                {/* 3. Average time to verdict */}
                <div className="p-5 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:shadow-lg hover:border-blue-400/30 transition-all duration-300 flex flex-col justify-between group">
                  <div className="text-[11px] font-mono uppercase text-gray-400 dark:text-gray-400 font-semibold tracking-wider">
                    {t.avgDuration}
                  </div>
                  <div className={`my-2 text-3xl font-extrabold font-mono group-hover:translate-x-0.5 transition-transform ${stats.totalProofs > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : stats.avgDurationFormatted}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.avgDurationCaption}
                  </div>
                </div>

                {/* 4. High-confidence results */}
                <div className="p-5 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:shadow-lg hover:border-emerald-400/30 transition-all duration-300 flex flex-col justify-between group">
                  <div className="text-[11px] font-mono uppercase text-gray-400 dark:text-gray-400 font-semibold tracking-wider">
                    {t.highConfidence}
                  </div>
                  <div className={`my-2 text-3xl font-extrabold font-mono group-hover:translate-x-0.5 transition-transform ${stats.totalProofs > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : stats.highConfidenceCount}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.highConfidenceCaption}
                  </div>
                </div>
              </div>

              {/* CHARTS ROW: 30-DAY ACTIVITY & VERDICT MIX (FROSTED LIQUID GLASS) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 30-Day Activity Chart */}
                <div className="lg:col-span-2 p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col justify-between transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        30-Day Verification Activity
                      </h3>
                      <p className="text-xs text-gray-400">
                        Daily verification volume computed from local audit records
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded-md border border-white/80 dark:border-white/10">
                      Past 30 Days
                    </span>
                  </div>

                  {stats.totalProofs === 0 ? (
                    <div className="h-44 flex items-center justify-center text-center text-xs text-gray-400 border border-dashed border-white/80 dark:border-white/10 rounded-xl my-2 bg-white/30 dark:bg-white/[0.02]">
                      No activity yet. Run a check to see your trend.
                    </div>
                  ) : (
                    <>
                      <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-gray-100 dark:border-white/10">
                        {stats.chartDays.map((d, idx) => {
                          const maxCount = Math.max(1, ...stats.chartDays.map((c) => c.count));
                          const barHeight = d.count > 0 ? `${Math.max(15, Math.round((d.count / maxCount) * 100))}%` : "4px";
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center group relative h-full justify-end"
                            >
                              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                <div className="backdrop-blur-xl bg-slate-900/90 dark:bg-white/95 text-white dark:text-gray-900 text-[10px] font-mono px-2.5 py-1 rounded-lg shadow-xl border border-white/20 dark:border-black/10 whitespace-nowrap">
                                  {d.label}: {d.count} checks
                                </div>
                              </div>
                              <div
                                style={{ height: barHeight }}
                                className={`w-full rounded-t transition-all ${
                                  d.count > 0
                                    ? "bg-gradient-to-t from-blue-600 via-indigo-600 to-indigo-500 hover:brightness-110 shadow-xs shadow-blue-500/20"
                                    : "bg-gray-200/60 dark:bg-white/10 hover:bg-gray-300/70"
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
                        <span>30 days ago</span>
                        <span>15 days ago</span>
                        <span>Today</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Verdict Distribution */}
                <div className="p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col justify-between transition-all duration-300">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      Verdict Distribution
                    </h3>
                    <p className="text-xs text-gray-400 mb-6">
                      Breakdown across all evaluated claims
                    </p>

                    {stats.totalProofs === 0 ? (
                      <div className="h-32 flex items-center justify-center text-center text-xs text-gray-400 border border-dashed border-white/80 dark:border-white/10 rounded-xl bg-white/30 dark:bg-white/[0.02]">
                        No verdicts recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-red-600 shadow-xs shadow-red-500/50" />
                              Likely Manipulated
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {stats.verdictMix.likelyManipulated}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100/90 dark:bg-white/10 rounded-full overflow-hidden backdrop-blur-xs">
                            <div
                              className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full shadow-xs shadow-red-500/30"
                              style={{
                                width: stats.totalProofs > 0
                                  ? `${(stats.verdictMix.likelyManipulated / stats.totalProofs) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" />
                              Inconclusive
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {stats.verdictMix.inconclusive}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100/90 dark:bg-white/10 rounded-full overflow-hidden backdrop-blur-xs">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full shadow-xs shadow-amber-500/30"
                              style={{
                                width: stats.totalProofs > 0
                                  ? `${(stats.verdictMix.inconclusive / stats.totalProofs) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-xs shadow-emerald-500/50" />
                              No Signs Found
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {stats.verdictMix.noSignsFound}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100/90 dark:bg-white/10 rounded-full overflow-hidden backdrop-blur-xs">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full shadow-xs shadow-emerald-500/30"
                              style={{
                                width: stats.totalProofs > 0
                                  ? `${(stats.verdictMix.noSignsFound / stats.totalProofs) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/10 text-xs text-gray-400 font-mono flex items-center justify-between">
                    <span>Active Storage:</span>
                    <span className="text-gray-900 dark:text-white font-bold">Stored on this device</span>
                  </div>
                </div>
              </div>

              {/* RECENT VERIFICATIONS TABLE (FROSTED LIQUID GLASS CONTAINER) */}
              <div className="p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.recentVerifications}</h3>
                    <p className="text-xs text-gray-400">Live cryptographic proof records stored on this device</p>
                  </div>
                  {reports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveNav("history")}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>View all</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {reports.length === 0 ? (
                  /* Calm empty state with "Run your first check" button */
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/80 dark:border-white/10 rounded-xl bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-xs">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">No verifications on this device yet</h4>
                    <p className="mt-1 text-xs text-gray-400 max-w-sm">
                      Submit any viral headline, WhatsApp message, or photo to run multi-source news wire verification.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setModalPrefill(null);
                        setIsModalOpen(true);
                      }}
                      className="mt-5 flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.3)] border border-blue-400/30 transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.runFirstCheck}</span>
                    </button>
                  </div>
                ) : (
                  /* Populated Table with Row Actions & Clickable Rows */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-white/10 text-gray-400 font-semibold uppercase tracking-wider text-[10px] font-mono">
                          <th className="py-3 px-3">Verdict</th>
                          <th className="py-3 px-3">Claim</th>
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Score</th>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Audit ID</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100/70 dark:divide-white/5">
                        {reports.slice(0, 8).map((r) => {
                          const isManip = (r.verdict || "").toLowerCase().includes("manipulated");
                          const isNoSigns = (r.verdict || "").toLowerCase().includes("no signs");
                          return (
                            <tr
                              key={r.reportId}
                              onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                              className="hover:bg-white/60 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-xs ${
                                    isManip
                                      ? "bg-red-500/10 text-red-700 border border-red-500/30 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50"
                                      : isNoSigns
                                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
                                      : "bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
                                  }`}
                                >
                                  {r.verdict || "Inconclusive"}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-gray-900 dark:text-gray-100 max-w-xs truncate">
                                {r.claimText || r.inputText}
                              </td>
                              <td className="py-3 px-3">
                                {getInputTypeIcon(r)}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-white">
                                {r.score ?? 50}
                                {r.confidence?.margin ? (
                                  <span className="text-[10px] text-gray-400 font-normal ml-1">
                                    ±{r.confidence.margin}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 px-3 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Today"}
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px] text-gray-400">
                                {r.reportId}
                              </td>
                              <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveMenuReportId(activeMenuReportId === r.reportId ? null : r.reportId)
                                    }
                                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {activeMenuReportId === r.reportId && (
                                    <div className="absolute right-0 mt-1 w-44 backdrop-blur-2xl bg-white/90 dark:bg-[#151922]/90 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-30 py-1.5 text-xs overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                                        className="w-full text-left px-3.5 py-2 hover:bg-white/80 dark:hover:bg-white/10 font-semibold text-gray-900 dark:text-white flex items-center justify-between transition-colors"
                                      >
                                        <span>Open report</span>
                                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (typeof window !== "undefined") {
                                            const url = `${window.location.origin}/report/${encodeURIComponent(r.reportId)}`;
                                            navigator.clipboard.writeText(url);
                                            showToast("Report link copied to clipboard", "success");
                                          }
                                          setActiveMenuReportId(null);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-white/80 dark:hover:bg-white/10 font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between transition-colors"
                                      >
                                        <span>Copy link</span>
                                        <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleBookmarkToggle(r.reportId, e)}
                                        className="w-full text-left px-3.5 py-2 hover:bg-white/80 dark:hover:bg-white/10 font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between transition-colors"
                                      >
                                        <span>{r.isSaved ? "Unsave" : "Save"}</span>
                                        <Bookmark className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteReport(r.reportId, e)}
                                        className="w-full text-left px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium flex items-center justify-between transition-colors"
                                      >
                                        <span>Delete</span>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              HISTORY VIEW (FROSTED LIQUID GLASS)
              ======================================================== */}
          {activeNav === "history" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">History</h2>
                  <p className="text-xs text-gray-400">All local verification records on this device</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryFilterSaved(!historyFilterSaved)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    historyFilterSaved
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/30 shadow-[0_2px_12px_rgba(37,99,235,0.3)]"
                      : "backdrop-blur-md bg-white/70 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-white/80 dark:border-white/10 hover:bg-white/90 shadow-2xs"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Cases Only</span>
                </button>
              </div>

              <div className="p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                {filteredReports.length === 0 ? (
                  <p className="text-xs text-gray-400 py-12 text-center">
                    {historyFilterSaved ? "No saved reports found." : "No verification history found on this device."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((r) => (
                      <div
                        key={r.reportId}
                        onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                        className="p-4 backdrop-blur-md bg-white/50 dark:bg-[#181C26]/60 hover:bg-white/80 dark:hover:bg-[#202534]/80 border border-white/70 dark:border-white/10 rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer shadow-2xs group hover:border-blue-400/30"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {r.claimText || r.inputText}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {r.reportId} • Score: {r.score} • {r.verdict}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleBookmarkToggle(r.reportId, e)}
                            className={`p-1.5 rounded-full border transition-all ${
                              r.isSaved ? "bg-amber-100 text-amber-700 border-amber-300" : "backdrop-blur-md bg-white/80 dark:bg-white/10 text-gray-400 border-white/80 dark:border-white/10"
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                            className="px-3.5 py-1 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:border-blue-500/30 rounded-full border border-white/80 dark:border-white/15 backdrop-blur-md shadow-xs transition-all"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              EVIDENCE VAULT VIEW (FROSTED LIQUID GLASS)
              ======================================================== */}
          {activeNav === "vault" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              {/* Top Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60 dark:border-white/10">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Evidence Vault & Incident Reporting
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Document cyber crimes (scams, bullying, harassment). Reports are sealed in the vault and queued for Cyber Cell review.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFilingIncident(!isFilingIncident);
                      setSubmittedIncidentResult(null);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all ${
                      isFilingIncident
                        ? "backdrop-blur-md bg-white/80 dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-white/80 dark:border-white/10"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_20px_rgba(37,99,235,0.3)] border border-blue-400/30"
                    }`}
                  >
                    {isFilingIncident ? <X className="w-3.5 h-3.5" /> : <FilePlus className="w-3.5 h-3.5" />}
                    <span>{isFilingIncident ? "Cancel Report" : "File Incident Report"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await verifyVaultIntegrity();
                      if (res.isValid) {
                        showToast(`Hash chain verified! All ${res.totalEntries} blocks cryptographically intact.`, "success");
                      } else {
                        showToast(`Ledger alert: ${res.errorReason}`, "error");
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/15 rounded-xl shadow-2xs transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verify Chain</span>
                  </button>
                </div>
              </div>

              {/* Official Cyber Cell Emergency Hotline Banner (TRANSLUCENT AMBER GLASS) */}
              <div className="p-4 rounded-2xl backdrop-blur-xl bg-amber-500/10 dark:bg-amber-400/5 border border-amber-400/30 dark:border-amber-400/20 shadow-[0_4px_20px_rgba(245,158,11,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 border border-amber-400/30 flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 dark:text-amber-200 block sm:inline mr-1">
                      National Cyber Crime Helpline: Dial 1930 (Toll-Free 24x7)
                    </span>
                    <span className="text-amber-800/90 dark:text-amber-300/80 text-[11px]">
                      • For active UPI or banking fraud, call within the golden hour to freeze transactions.
                    </span>
                  </div>
                </div>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 flex-shrink-0 text-[11px]"
                >
                  <span>cybercrime.gov.in</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Confirmation Card (When Report is Queued & Dispatched - FROSTED EMERALD GLASS) */}
              {submittedIncidentResult && (
                <div className="p-6 backdrop-blur-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-400/30 dark:border-emerald-500/30 rounded-3xl shadow-[0_8px_32px_0_rgba(16,185,129,0.08)] space-y-4 animate-in fade-in-0 duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/30">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-400 font-bold block">
                          Case Registered & Dispatched
                        </span>
                        <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">
                          Your Report Has Been Queued for Cyber Cell Authorities
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSubmittedIncidentResult(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 backdrop-blur-md bg-white/70 dark:bg-black/30 rounded-2xl border border-emerald-400/30 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Case Reference Number:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 rounded-lg font-mono font-bold text-xs border border-emerald-300/40">
                          {submittedIncidentResult.caseId}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(submittedIncidentResult.caseId);
                            setCopiedCaseId(true);
                            setTimeout(() => setCopiedCaseId(false), 2000);
                            showToast("Case Reference copied!", "success");
                          }}
                          className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded"
                          title="Copy Case Reference ID"
                        >
                          {copiedCaseId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                      <strong>Next Steps:</strong> Your incident dossier has been sealed in the local tamper-evident vault with a SHA-256 cryptographic digest. It has been queued for investigation by the Cyber Crime Response Division. An authorized officer will review your statement and contact you on your provided contact details within <strong>24 to 48 hours</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadDossier(submittedIncidentResult)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 rounded-xl shadow-xs transition-all border border-white/10"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download Official Complaint Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDossierEntry(submittedIncidentResult);
                        setIsDossierModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/15 hover:bg-white/90 rounded-xl transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubmittedIncidentResult(null)}
                      className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline px-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* The Incident Report Filing Form (FROSTED LIQUID GLASS FORM) */}
              {isFilingIncident && (
                <div className="p-6 sm:p-8 backdrop-blur-xl bg-white/75 dark:bg-[#131620]/75 border border-white/80 dark:border-white/10 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] space-y-6 animate-in fade-in-0 duration-200">
                  <div className="flex items-start justify-between border-b border-gray-100 dark:border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                        File a New Incident Report
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Select what happened, describe the incident, attach any proof, and submit for cyber cell review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFilingIncident(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitIncident} className="space-y-6">
                    {/* Step 1: Category Selection */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2.5">
                        1. Select Incident Type
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          {
                            id: "scam",
                            label: "Financial Scam / Fraud",
                            desc: "UPI fraud, fake investment schemes, phishing links, extortion, or voice-clone impersonation."
                          },
                          {
                            id: "bullying",
                            label: "Cyberbullying / Defamation",
                            desc: "Targeted online abuse, defamation, public trolling, character assassination, or group harassment."
                          },
                          {
                            id: "harassment",
                            label: "Online Harassment & Threats",
                            desc: "Direct intimidation, stalking, abusive DMs, extortion, or non-consensual deepfakes."
                          },
                          {
                            id: "impersonation",
                            label: "Identity Theft & Impersonation",
                            desc: "Cloned social media profile posing as you or an executive to deceive contacts."
                          },
                          {
                            id: "other",
                            label: "Other Digital Crime",
                            desc: "Unauthorized account takeover, ransomware, malware link, or digital sabotage."
                          }
                        ].map((cat) => {
                          const isSelected = incidentCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setIncidentCategory(cat.id)}
                              className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between backdrop-blur-md ${
                                isSelected
                                  ? "bg-blue-600/10 dark:bg-blue-500/15 border-blue-500 text-blue-950 dark:text-blue-200 shadow-sm"
                                  : "bg-white/50 dark:bg-white/[0.03] border-white/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/[0.08]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-xs">{cat.label}</span>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                                {cat.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: What happened details */}
                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        2. Incident Details
                      </label>

                      <div>
                        <textarea
                          rows={4}
                          value={incidentDetails}
                          onChange={(e) => setIncidentDetails(e.target.value)}
                          placeholder="Please explain what happened in detail... (e.g. what the person said, message timeline, fraudulent amount or payment requests, threats made, etc.)"
                          className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white backdrop-blur-md bg-white/60 dark:bg-black/20 border border-white/70 dark:border-white/10 rounded-2xl placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-[#11141D] focus:border-blue-500/60 transition-all resize-none shadow-xs"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Platform / Channel Where It Occurred
                          </label>
                          <select
                            value={incidentPlatform}
                            onChange={(e) => setIncidentPlatform(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs font-medium backdrop-blur-md bg-white/60 dark:bg-[#151922] border border-white/70 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white shadow-xs"
                          >
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Telegram">Telegram</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Phone Call / Voice">Phone Call / Voice</option>
                            <option value="Email">Email</option>
                            <option value="SMS">SMS Message</option>
                            <option value="Facebook">Facebook</option>
                            <option value="X (Twitter)">X (Twitter)</option>
                            <option value="Other">Other Website or App</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Suspect Phone / Username / UPI ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={incidentSuspectInfo}
                            onChange={(e) => setIncidentSuspectInfo(e.target.value)}
                            placeholder="e.g. +91 98765 43210 or user@okhdfc"
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white backdrop-blur-md bg-white/60 dark:bg-black/20 border border-white/70 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-gray-400 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Screenshot or Evidence Upload */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                        3. Attach Screenshot or Supporting Proof (Optional)
                      </label>

                      <input
                        type="file"
                        ref={screenshotFileRef}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleScreenshotChange(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {!incidentScreenshot ? (
                        <div
                          onClick={() => screenshotFileRef.current?.click()}
                          className="p-6 border-2 border-dashed border-blue-400/40 dark:border-blue-500/30 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-md bg-white/40 dark:bg-white/[0.02] hover:bg-white/70 shadow-xs"
                        >
                          <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 text-center">
                            Click to upload screenshot of messages, payment receipts, or threatening posts
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 text-center">
                            Supports JPG, PNG, WEBP, or PDF up to 15MB
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 backdrop-blur-md bg-white/60 dark:bg-[#181C26]/60 border border-white/70 dark:border-white/10 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {incidentScreenshot.previewUrl ? (
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 border border-white/80 dark:border-white/10 shadow-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={incidentScreenshot.previewUrl}
                                  alt="Screenshot preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {incidentScreenshot.name}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {(incidentScreenshot.size / 1024).toFixed(1)} KB • Evidence Attached
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIncidentScreenshot(null);
                              if (screenshotFileRef.current) screenshotFileRef.current.value = "";
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full"
                            title="Remove screenshot"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Step 4: Contact details */}
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                          4. Your Contact Details (So Cyber Cell Authorities Can Reach You)
                        </label>
                        <span className="text-[11px] text-gray-400">Review within 24-48 hrs</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Your Full Name
                          </label>
                          <input
                            type="text"
                            value={incidentContactName}
                            onChange={(e) => setIncidentContactName(e.target.value)}
                            placeholder={userProfile.displayName || "Complainant Name"}
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white backdrop-blur-md bg-white/60 dark:bg-black/20 border border-white/70 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500 shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Contact Phone / WhatsApp *
                          </label>
                          <input
                            type="tel"
                            value={incidentContactPhone}
                            onChange={(e) => setIncidentContactPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white backdrop-blur-md bg-white/60 dark:bg-black/20 border border-white/70 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500 font-mono shadow-xs"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Email Address (Optional)
                          </label>
                          <input
                            type="email"
                            value={incidentContactEmail}
                            onChange={(e) => setIncidentContactEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white backdrop-blur-md bg-white/60 dark:bg-black/20 border border-white/70 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit and Action Buttons */}
                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-white/10">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Sealed with tamper-evident SHA-256 hash. Queued for official review.</span>
                      </p>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsFilingIncident(false)}
                          className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl transition-all"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmittingIncident}
                          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-75 rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.3)] border border-blue-400/30 transition-all cursor-pointer"
                        >
                          {isSubmittingIncident ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Queuing Report...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit Report to Cyber Cell</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Records & Ledger Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Evidence Ledger & Filed Cases ({vaultEntries.length})
                  </h3>
                  <span className="text-xs text-gray-400">Cryptographically Chained</span>
                </div>

                {vaultEntries.length === 0 ? (
                  <div className="p-10 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-3xl text-center space-y-3 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto shadow-xs">
                      <Archive className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      No Records in Evidence Vault Yet
                    </p>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      File an incident report above if you encountered scams, bullying, or harassment, or save analyzed claims from verification reports.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsFilingIncident(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-xs border border-blue-400/30 transition-all"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>File an Incident Report</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {vaultEntries.map((e, idx) => {
                      const isIncident = e.isIncidentReport;
                      const categoryBadgeColor = {
                        scam: "bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60",
                        bullying: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60",
                        harassment: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
                        impersonation: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60",
                        other: "bg-gray-500/10 text-gray-700 border-gray-400/30 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700"
                      }[e.incidentCategory || "other"] || "bg-gray-500/10 text-gray-700 border-gray-400/30";

                      return (
                        <div
                          key={idx}
                          className="p-5 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:border-blue-400/30 transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-gray-100 dark:border-white/10">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                                #{e.caseId || e.reportId}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border uppercase backdrop-blur-xs ${categoryBadgeColor}`}>
                                {e.incidentCategory || "Digital Harm"}
                              </span>
                              {isIncident ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  <span>Queued for Cyber Cell Review</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-white/60 text-gray-700 dark:bg-white/10 dark:text-gray-300 rounded-full border border-white/70 dark:border-white/10">
                                  <span>Ledger Verified</span>
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] font-mono text-gray-400">
                              {new Date(e.timestamp).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row gap-4 items-start">
                            {e.screenshot?.previewUrl && (
                              <div
                                onClick={() => {
                                  setSelectedDossierEntry(e);
                                  setIsDossierModalOpen(true);
                                }}
                                className="w-24 h-24 rounded-xl overflow-hidden border border-white/80 dark:border-white/15 bg-white/50 dark:bg-black/20 flex-shrink-0 cursor-pointer group relative shadow-xs"
                                title="Click to view attached evidence"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={e.screenshot.previewUrl}
                                  alt="Evidence thumbnail"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold backdrop-blur-2xs">
                                  View
                                </div>
                              </div>
                            )}

                            <div className="flex-1 space-y-1.5">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                                {e.details || e.claimText}
                              </p>

                              {isIncident && (
                                <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1 flex-wrap">
                                  {e.platform && <span>Channel: <strong>{e.platform}</strong></span>}
                                  {e.contactPhone && <span>Contact: <strong>{e.contactPhone}</strong></span>}
                                  {e.suspectInfo && <span>Suspect: <code className="font-mono bg-white/80 dark:bg-white/10 px-1 py-0.5 rounded border border-white/80 dark:border-white/10">{e.suspectInfo}</code></span>}
                                </div>
                              )}

                              <p className="font-mono text-[10px] text-gray-400 truncate pt-0.5">
                                SHA-256: {e.entryHash}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-white/10 text-xs">
                            <span className="text-[11px] text-gray-500">
                              {isIncident
                                ? "Queued for Cyber Cell • Review ETA 24-48 hrs"
                                : `Trust Score: ${e.score}/100 • Verdict: ${e.verdict}`}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDossierEntry(e);
                                  setIsDossierModalOpen(true);
                                }}
                                className="px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/15 hover:bg-white rounded-lg transition-all"
                              >
                                View Dossier
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadDossier(e)}
                                className="px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-400/30 hover:bg-blue-500/20 rounded-lg transition-all"
                                title="Download formal complaint letter"
                              >
                                Download Draft
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteVaultEntry(e.caseId || e.reportId)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                title="Delete vault entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              THE FAMILY SAFE-WORD VIEW (FROSTED LIQUID GLASS)
              "Assume the fake is perfect."
              Out-of-band persistent authentication against AI voice cloning.
              ======================================================== */}
          {activeNav === "safecircle" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              {/* Header & Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60 dark:border-white/10">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    The Family Safe-Word
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Assume the fake is perfect. Persistent out-of-band authentication for families against voice-clone scams.
                  </p>
                </div>

                {/* Top Action Controls: Language, Edit Words, WhatsApp */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Language Selector */}
                  <div className="relative flex items-center">
                    <Languages className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                    <select
                      value={safeWordLang}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setSafeWordLang(newLang);
                        setSafeWordLanguage(newLang);
                        showToast(`Language set to ${SAFE_WORD_LANGUAGES[newLang]?.label}`, "success");
                      }}
                      aria-label="Select family safe-word language"
                      className="pl-8 pr-7 py-1.5 text-xs font-semibold backdrop-blur-md bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-xl shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer"
                    >
                      {Object.values(SAFE_WORD_LANGUAGES).map((l) => (
                        <option key={l.id} value={l.id} className="dark:bg-[#15171C]">
                          {l.flag} {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Edit Word Button */}
                  <button
                    type="button"
                    onClick={handleOpenEditWordModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/15 rounded-xl shadow-xs transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Edit Word</span>
                  </button>

                  {/* WhatsApp Share Button */}
                  <button
                    type="button"
                    onClick={handleShareToWhatsApp}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 backdrop-blur-md bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl shadow-xs transition-all"
                    title="Share safe-word via WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share via WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Editorial Statement: The Hook & Counter-Intuitive Twist */}
              <div className="p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-3">
                <blockquote className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                  “Voice-clone scams can't be detected, so stop trying and make them irrelevant.”
                </blockquote>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong className="font-semibold text-gray-900 dark:text-gray-200">The Counter-Intuitive Twist:</strong> Every detector assumes a fake can be spotted. Voice and video clones will soon be indistinguishable, so we break that assumption. Borrowing from banking dual-control and espionage duress codes: authentication happens out of band, through something an imposter cannot know.
                </p>
              </div>

              {/* Main Interactive Grid: Left Column (Words) | Right Column (Verify Incoming Call via Mic) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Persistent Safe-Word, Silent Duress Word & Playbook */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Card 1: Persistent Family Safe-Word */}
                  <div className="p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Family Safe-Word
                      </span>
                      <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-full border border-blue-400/30">
                        {safeWordData?.isCustom ? "Custom Word" : "Standard Word"}
                      </span>
                    </div>

                    {/* Word Display Box */}
                    <div className="p-6 backdrop-blur-md bg-gradient-to-br from-blue-500/10 via-white/50 to-indigo-500/5 dark:from-blue-500/15 dark:via-white/[0.02] dark:to-indigo-500/10 border border-blue-400/30 dark:border-blue-500/20 rounded-2xl text-center space-y-3 shadow-xs">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">
                        Ask caller for this word when contacted by family
                      </span>
                      <div className="text-3xl sm:text-4xl font-extrabold tracking-wide bg-gradient-to-r from-gray-900 via-blue-950 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-200 bg-clip-text text-transparent py-1">
                        {safeWordData?.code || "GOLDEN LOTUS"}
                      </div>
                      <div className="text-xs text-gray-400 font-medium">
                        {safeWordData?.language?.label || "English"}
                      </div>

                      {/* Action Buttons: Pronounce, Copy, Edit */}
                      <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSpeakSafeWord(safeWordData?.code, safeWordLang)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/15 hover:bg-white rounded-xl transition-all active:scale-95 shadow-xs"
                          title="Listen to pronunciation"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Pronounce</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopySafeWord(safeWordData?.code, "safe")}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/15 hover:bg-white rounded-xl transition-all active:scale-95 shadow-xs"
                        >
                          {copiedSafeWord ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Word</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenEditWordModal}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-400/30 hover:bg-blue-500/20 rounded-xl transition-all active:scale-95 shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400 text-center font-medium">
                      Stays set permanently for your family until you choose to edit it.
                    </div>
                  </div>

                  {/* Card 2: The Silent Duress Word (TRANSLUCENT AMBER GLASS) */}
                  <div className="p-6 backdrop-blur-xl bg-gradient-to-br from-amber-500/10 via-white/50 to-amber-500/5 dark:from-amber-400/10 dark:via-[#131620]/60 dark:to-transparent border border-amber-400/30 dark:border-amber-400/20 rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.05)] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-amber-400/20">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                          Silent Duress Word
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenEditWordModal}
                        className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      If you or your family member is coerced to give the safe-word under physical threat, recite this word instead. It sounds normal to the scammer, but discreetly triggers an emergency alarm to refuse transfers and notify authorities.
                    </p>

                    {/* Masked Duress Word */}
                    <div className="p-4 backdrop-blur-md bg-amber-500/10 dark:bg-amber-400/5 border border-amber-400/30 dark:border-amber-400/20 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                      <div>
                        <div className="text-[11px] font-medium text-amber-800 dark:text-amber-400">
                          Coercion signal word
                        </div>
                        <div className="text-xl font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                          {isDuressRevealed ? (safeWordData?.duressCode || "SILVER FALCON") : "••••••••••••••"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsDuressRevealed(!isDuressRevealed)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/15 hover:bg-white rounded-lg transition-all"
                        >
                          {isDuressRevealed ? "Hide" : "Reveal"}
                        </button>

                        {isDuressRevealed && (
                          <button
                            type="button"
                            onClick={() => handleCopySafeWord(safeWordData?.duressCode, "duress")}
                            className="p-1.5 text-xs text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/15 hover:bg-white rounded-lg transition-all"
                            title="Copy duress code"
                          >
                            {copiedDuressWord ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Indian Family Protection Playbook */}
                  <div className="p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-3">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Family Protocol</span>
                    </h4>
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="p-3 backdrop-blur-md bg-white/50 dark:bg-white/[0.03] rounded-xl border border-white/70 dark:border-white/10 flex gap-2.5">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">1.</span>
                        <span><strong>The Shared Rule:</strong> Agree that no urgent money will ever be sent from an unknown caller without reciting the safe-word.</span>
                      </div>
                      <div className="p-3 backdrop-blur-md bg-white/50 dark:bg-white/[0.03] rounded-xl border border-white/70 dark:border-white/10 flex gap-2.5">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">2.</span>
                        <span><strong>The Question:</strong> When a crying voice says <em>"Papa, accident ho gaya hai, turant paise bhejo"</em>, calmly ask: <strong>"Beta, safe-word kya hai?"</strong></span>
                      </div>
                      <div className="p-3 backdrop-blur-md bg-white/50 dark:bg-white/[0.03] rounded-xl border border-white/70 dark:border-white/10 flex gap-2.5">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">3.</span>
                        <span><strong>Zero AI Trust:</strong> Voice and face can be synthesized by deepfakes in seconds, but an offline secret cannot be guessed.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Microphone Listening & Live Phone Call Verifier */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-6 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <PhoneCall className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          Verify Incoming Call
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Put the caller on speaker. Press the microphone button to listen to the call audio. The AI model inspects the words, checks against your family safe-word, and identifies voice-clone extortion tactics.
                      </p>
                    </div>

                    {/* Microphone Listening Central Component */}
                    <div className="space-y-4">
                      {!isListening && !isAnalyzingCall && (
                        <button
                          type="button"
                          onClick={startListening}
                          className="w-full p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_8px_30px_rgba(37,99,235,0.35)] border border-blue-400/30 transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer active:scale-98"
                        >
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <Mic className="w-7 h-7 text-white" />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold tracking-tight">
                              Tap to Listen to Caller Speech
                            </div>
                            <div className="text-xs text-blue-100 opacity-90 mt-0.5">
                              Hold phone near speaker or speak caller words into microphone
                            </div>
                          </div>
                        </button>
                      )}

                      {isListening && (
                        <div className="w-full p-6 rounded-2xl backdrop-blur-xl bg-red-500/10 dark:bg-red-500/15 border-2 border-red-500/70 shadow-[0_8px_30px_rgba(239,68,68,0.2)] flex flex-col items-center justify-center gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center relative z-10 shadow-lg shadow-red-600/40">
                              <Mic className="w-7 h-7 text-white animate-pulse" />
                            </div>
                          </div>
                          <div className="text-center space-y-1">
                            <div className="flex items-center justify-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                              <span>Listening to Incoming Call Audio...</span>
                            </div>
                            <p className="text-xs text-red-600 dark:text-red-300">
                              Caller speech is being captured in real-time
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => stopListening(true)}
                            className="mt-2 px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-full shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                          >
                            <MicOff className="w-3.5 h-3.5" />
                            <span>Stop & Analyze Call</span>
                          </button>
                        </div>
                      )}

                      {isAnalyzingCall && (
                        <div className="w-full p-7 rounded-2xl backdrop-blur-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-400/40 shadow-[0_8px_30px_rgba(37,99,235,0.15)] flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                          <div className="text-center space-y-1">
                            <div className="text-sm font-bold text-blue-950 dark:text-blue-200">
                              Forensic AI Analyzing Call Audio...
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              Comparing against family safe-word & identifying voice-clone extortion patterns
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Audio Transcript Box */}
                      {liveTranscript && (
                        <div className="p-3.5 backdrop-blur-md bg-white/60 dark:bg-black/25 border border-white/80 dark:border-white/10 rounded-xl space-y-1.5 animate-in fade-in-0 shadow-xs">
                          <div className="text-[10px] font-mono font-semibold uppercase text-gray-500 flex items-center justify-between">
                            <span>Transcribed Audio Stream</span>
                            {isListening ? (
                              <span className="text-red-600 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                LIVE RECORDING
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAnalyzeCallerSpeech(liveTranscript)}
                                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                              >
                                Re-analyze
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-900 dark:text-white font-medium italic leading-relaxed">
                            "{liveTranscript}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick Simulation Chips */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-medium text-gray-400 block">
                        Quick Call Simulation:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const text = `Hey, it's me. Don't worry, our family safe-word is ${safeWordData?.code || "GOLDEN LOTUS"}.`;
                            liveTranscriptRef.current = text;
                            setLiveTranscript(text);
                            handleAnalyzeCallerSpeech(text);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 backdrop-blur-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Simulate: Safe-word Match</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const text = "Papa! I had a terrible accident, police are arresting me, please urgently send ₹50,000 on this UPI right now!";
                            liveTranscriptRef.current = text;
                            setLiveTranscript(text);
                            handleAnalyzeCallerSpeech(text);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 backdrop-blur-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Simulate: Voice-Clone Scam</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const text = `I am in urgent trouble, transfer the funds immediately, code is ${safeWordData?.duressCode || "SILVER FALCON"}.`;
                            liveTranscriptRef.current = text;
                            setLiveTranscript(text);
                            handleAnalyzeCallerSpeech(text);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 backdrop-blur-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Simulate: Duress Coercion</span>
                        </button>
                      </div>
                    </div>

                    {/* Manual Input Toggle for Noisy Environments or Accessibility */}
                    <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowManualInput(!showManualInput)}
                        className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-1"
                      >
                        <span>{showManualInput ? "▲ Hide manual typing" : "▼ Or type caller text manually"}</span>
                      </button>

                      {showManualInput && (
                        <div className="mt-3 space-y-2 animate-in fade-in-0">
                          <input
                            type="text"
                            value={manualInputText}
                            onChange={(e) => setManualInputText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAnalyzeCallerSpeech(manualInputText);
                              }
                            }}
                            placeholder="Type what caller spoke on the phone..."
                            className="w-full px-4 py-2.5 text-xs backdrop-blur-md bg-white/60 dark:bg-black/25 border border-white/70 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleAnalyzeCallerSpeech(manualInputText)}
                            className="w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all shadow-xs"
                          >
                            Authenticate Typed Speech
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Forensic Call Analysis Verdict Card (FROSTED GLASS VERDICT) */}
                    {callAnalysisResult && (
                      <div
                        className={`p-5 rounded-2xl border backdrop-blur-xl transition-all animate-in fade-in-0 duration-200 space-y-3.5 ${
                          callAnalysisResult.verdict === "VERIFIED_FAMILY"
                            ? "bg-emerald-500/15 dark:bg-emerald-400/10 border-emerald-400/40 text-emerald-950 dark:text-emerald-100 shadow-[0_8px_30px_rgba(16,185,129,0.1)]"
                            : callAnalysisResult.verdict === "DURESS_ALERT"
                            ? "bg-red-500/15 dark:bg-red-400/15 border-red-500/50 text-red-950 dark:text-red-100 shadow-[0_8px_30px_rgba(239,68,68,0.15)]"
                            : "bg-red-500/15 dark:bg-red-400/10 border-red-400/40 text-red-950 dark:text-red-100 shadow-[0_8px_30px_rgba(239,68,68,0.1)]"
                        }`}
                      >
                        {/* Verdict Header Badge */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            {callAnalysisResult.verdict === "VERIFIED_FAMILY" ? (
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                              </div>
                            ) : callAnalysisResult.verdict === "DURESS_ALERT" ? (
                              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse shadow-xs">
                                <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                              </div>
                            )}
                            <div>
                              <div className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-80">
                                {callAnalysisResult.verdict === "VERIFIED_FAMILY"
                                  ? "Authentication Confirmed"
                                  : callAnalysisResult.verdict === "DURESS_ALERT"
                                  ? "Duress Emergency Alert"
                                  : "Imposter Scam Alert"}
                              </div>
                              <h4 className="text-sm font-extrabold tracking-tight">
                                {callAnalysisResult.headline}
                              </h4>
                            </div>
                          </div>

                          <div className="px-3 py-1 rounded-full text-xs font-mono font-bold backdrop-blur-md bg-white/70 dark:bg-black/30 border border-current/20 shadow-xs">
                            {callAnalysisResult.confidence}% {callAnalysisResult.verdict === "VERIFIED_FAMILY" ? "Confidence" : "Scam Risk"}
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="text-xs leading-relaxed opacity-95">
                          {callAnalysisResult.summary}
                        </p>

                        {/* Red Flags / Threat Signals */}
                        {callAnalysisResult.threatSignals?.length > 0 && (
                          <div className="p-3.5 backdrop-blur-md bg-white/60 dark:bg-black/30 rounded-xl space-y-1.5 text-xs border border-current/10">
                            <span className="font-bold text-[11px] uppercase tracking-wider block">
                              Detected Threat Signals:
                            </span>
                            <ul className="space-y-1 list-disc list-inside">
                              {callAnalysisResult.threatSignals.map((sig, idx) => (
                                <li key={idx} className="font-medium">
                                  {sig}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Actions */}
                        {callAnalysisResult.recommendedActions?.length > 0 && (
                          <div className="space-y-1 text-xs pt-1">
                            <span className="font-bold text-[11px] uppercase tracking-wider block">
                              Recommended Immediate Action:
                            </span>
                            <div className="space-y-1">
                              {callAnalysisResult.recommendedActions.map((action, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 font-medium">
                                  <span className="font-mono font-bold">{idx + 1}.</span>
                                  <span>{action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add to Evidence Vault Action Button for Scams */}
                        {callAnalysisResult.verdict !== "VERIFIED_FAMILY" && (
                          <div className="pt-2 border-t border-red-300/40 dark:border-red-800/40 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] opacity-85">
                              Helpline: <strong>1930</strong> (National Cybercrime Reporting)
                            </span>
                            <button
                              type="button"
                              onClick={handleAddCallToEvidenceVault}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <FilePlus className="w-3.5 h-3.5" />
                              <span>Log to Evidence Vault</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Safe-Word & Duress Word Modal (FROSTED GLASS DIALOG) */}
              {isEditWordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in-0 duration-200">
                  <div className="backdrop-blur-2xl bg-white/90 dark:bg-[#11141D]/90 border border-white/80 dark:border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.35)] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          Edit Family Safe-Word
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditWordModalOpen(false)}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Set a permanent safe-word known only to your family. It stays set until you edit it again.
                    </p>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase font-mono">
                          Family Safe-Word (Confirmation)
                        </label>
                        <input
                          type="text"
                          value={editSafeInput}
                          onChange={(e) => setEditSafeInput(e.target.value.toUpperCase())}
                          placeholder="e.g. GOLDEN LOTUS or NEELAM PARVAT"
                          className="w-full px-4 py-2.5 font-mono text-xs uppercase backdrop-blur-md bg-white/60 dark:bg-black/25 border border-white/70 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
                        />
                        <span className="text-[10px] text-gray-400">
                          Recited when family calls asking for urgent funds.
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase font-mono">
                          Silent Duress Word (Coercion Alarm)
                        </label>
                        <input
                          type="text"
                          value={editDuressInput}
                          onChange={(e) => setEditDuressInput(e.target.value.toUpperCase())}
                          placeholder="e.g. SILVER FALCON"
                          className="w-full px-4 py-2.5 font-mono text-xs uppercase backdrop-blur-md bg-white/60 dark:bg-black/25 border border-white/70 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-600 shadow-xs"
                        />
                        <span className="text-[10px] text-gray-400">
                          Recited covertly if family is coerced under threat.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleResetToDefaultWords}
                        className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Defaults</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditWordModalOpen(false)}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/15 hover:bg-white rounded-full transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedWords}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full shadow-[0_4px_15px_rgba(37,99,235,0.3)] border border-blue-400/30 transition-all"
                      >
                        Save Safe-Word
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              SETTINGS VIEW (LIGHT/DARK + ENGLISH/HINDI TOGGLE)
              ======================================================== */}
          {activeNav === "settings" && (
            <div className="p-6 sm:p-8 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-6 animate-in fade-in-0 duration-200">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t.settings}</h2>

              {/* Theme Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Theme Preference</label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("light")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all ${
                      settings.theme === "light"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/40 shadow-[0_4px_15px_rgba(37,99,235,0.25)]"
                        : "backdrop-blur-md bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-white/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("dark")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all ${
                      settings.theme === "dark"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/40 shadow-[0_4px_15px_rgba(37,99,235,0.25)]"
                        : "backdrop-blur-md bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-white/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>

              {/* Language Toggle (English / Hindi) */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Language (भाषा)</label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle("en")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all ${
                      settings.language === "en"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/40 shadow-[0_4px_15px_rgba(37,99,235,0.25)]"
                        : "backdrop-blur-md bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-white/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle("hi")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all ${
                      settings.language === "hi"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/40 shadow-[0_4px_15px_rgba(37,99,235,0.25)]"
                        : "backdrop-blur-md bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-white/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>हिन्दी (Hindi)</span>
                  </button>
                </div>
              </div>

              {/* Analyst Display Name */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Analyst Display Name</label>
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs backdrop-blur-md bg-white/60 dark:bg-black/25 border border-white/70 dark:border-white/10 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full shadow-[0_4px_15px_rgba(37,99,235,0.3)] border border-blue-400/30 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Clear storage */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Clear all local reports and vault records on this device?")) {
                      localStorage.clear();
                      refreshLocalData();
                      showToast("Local storage cleared", "info");
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 backdrop-blur-md bg-red-500/10 dark:bg-red-400/10 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-all"
                >
                  Clear Local Storage
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              HELP CENTER VIEW
              ======================================================== */}
          {activeNav === "help" && (
            <div className="p-6 sm:p-8 backdrop-blur-xl bg-white/70 dark:bg-[#131620]/65 border border-white/80 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-4 animate-in fade-in-0 duration-200">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t.helpCenter}</h2>
              <div className="p-5 backdrop-blur-xl bg-red-500/10 dark:bg-red-500/10 border border-red-400/30 rounded-2xl text-xs space-y-2 shadow-sm">
                <p className="font-bold text-red-900 dark:text-red-300">National Cybercrime Helpline: Dial 1930</p>
                <p className="text-red-700 dark:text-red-400">Immediate reporting for financial UPI/bank fraud within the golden hour to freeze fraudulent recipient accounts.</p>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 font-bold text-red-900 dark:text-red-300 underline"
                >
                  cybercrime.gov.in
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          NEW VERIFICATION MODAL
          ======================================================== */}
      <VerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleVerificationComplete}
        initialData={modalPrefill}
      />

      {/* ========================================================
          COMMAND PALETTE (TRIGGERED VIA ⌘K OR SEARCH FIELD)
          ======================================================== */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        reports={reports}
        onOpenNewVerification={() => {
          setModalPrefill(null);
          setIsModalOpen(true);
        }}
      />

      {/* ========================================================
          EVIDENCE VAULT CASE DOSSIER MODAL
          ======================================================== */}
      {isDossierModalOpen && selectedDossierEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in-0 duration-200 overflow-y-auto">
          <div className="backdrop-blur-2xl bg-white/90 dark:bg-[#0E121A]/90 border border-white/80 dark:border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] space-y-6 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/40 dark:border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                      #{selectedDossierEntry.caseId || selectedDossierEntry.reportId}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300 border border-blue-400/30 uppercase">
                      {selectedDossierEntry.incidentCategory || "Digital Harm"}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight mt-0.5">
                    Official Incident Dossier & Evidence Log
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDossierModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="space-y-5 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Authority Status Banner */}
              <div className="p-4 backdrop-blur-md bg-emerald-500/15 dark:bg-emerald-400/10 border border-emerald-400/30 rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                    {selectedDossierEntry.status === "QUEUED_FOR_REVIEW"
                      ? "Dispatched & Queued for Cyber Cell Review"
                      : "Cryptographically Verified Ledger Record"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {selectedDossierEntry.statusMessage ||
                    "This case has been logged with cryptographic immutability. An investigating officer has been notified for triage."}
                </p>
              </div>

              {/* Complainant & Incident Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 backdrop-blur-md bg-white/60 dark:bg-[#131620]/50 rounded-2xl border border-white/70 dark:border-white/10 shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block mb-0.5">
                    Complainant
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedDossierEntry.contactName || "Citizen Complainant"}
                  </p>
                  {selectedDossierEntry.contactPhone && (
                    <p className="text-gray-500 font-mono text-[11px]">{selectedDossierEntry.contactPhone}</p>
                  )}
                  {selectedDossierEntry.contactEmail && (
                    <p className="text-gray-500 text-[11px]">{selectedDossierEntry.contactEmail}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block mb-0.5">
                    Channel & Suspect
                  </span>
                  <p className="text-gray-700 dark:text-gray-300">
                    Platform: <strong className="text-gray-900 dark:text-white">{selectedDossierEntry.platform || "Online"}</strong>
                  </p>
                  {selectedDossierEntry.suspectInfo && (
                    <p className="text-gray-700 dark:text-gray-300">
                      Suspect: <code className="font-mono bg-white/60 dark:bg-black/30 border border-white/60 dark:border-white/10 px-1 py-0.5 rounded text-[11px]">{selectedDossierEntry.suspectInfo}</code>
                    </p>
                  )}
                  <p className="text-gray-400 text-[10px] font-mono mt-0.5">
                    {new Date(selectedDossierEntry.timestamp).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Statement of Facts */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block">
                  Incident Statement
                </span>
                <div className="p-4 backdrop-blur-md bg-white/60 dark:bg-[#131620]/50 border border-white/70 dark:border-white/10 rounded-2xl text-gray-800 dark:text-gray-200 leading-relaxed font-sans shadow-xs">
                  {selectedDossierEntry.details || selectedDossierEntry.claimText || "No statement provided."}
                </div>
              </div>

              {/* Attached Screenshot Evidence */}
              {selectedDossierEntry.screenshot?.previewUrl && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block">
                    Attached Evidence Screenshot ({selectedDossierEntry.screenshot.name})
                  </span>
                  <div className="p-3 backdrop-blur-md bg-white/60 dark:bg-[#131620]/50 border border-white/70 dark:border-white/10 rounded-2xl shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedDossierEntry.screenshot.previewUrl}
                      alt="Evidence Screenshot"
                      className="max-h-72 rounded-xl object-contain mx-auto border border-gray-200 dark:border-gray-700 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Cryptographic Ledger Verification */}
              <div className="p-3.5 backdrop-blur-md bg-white/60 dark:bg-[#131620]/50 border border-white/70 dark:border-white/10 rounded-2xl space-y-1 font-mono text-[10px] shadow-xs">
                <div className="flex items-center justify-between text-gray-500">
                  <span>SHA-256 Digest:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-bold truncate max-w-[280px]">
                    {selectedDossierEntry.entryHash}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Ledger Anchor:</span>
                  <span className="truncate max-w-[280px]">
                    {selectedDossierEntry.previousHash}
                  </span>
                </div>
              </div>

              {/* Formal Legal Complaint Letter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-400">
                    Formal Legal Complaint Draft (Ready for 1930 / cybercrime.gov.in)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = generateComplaintDraft(selectedDossierEntry);
                      navigator.clipboard.writeText(text);
                      setCopiedDraft(true);
                      setTimeout(() => setCopiedDraft(false), 2000);
                      showToast("Complaint draft copied to clipboard!", "success");
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                  >
                    {copiedDraft ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDraft ? "Copied" : "Copy Draft"}</span>
                  </button>
                </div>
                <pre className="p-4 backdrop-blur-md bg-white/60 dark:bg-[#131620]/50 border border-white/70 dark:border-white/10 rounded-2xl font-mono text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap shadow-xs">
                  {generateComplaintDraft(selectedDossierEntry)}
                </pre>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 border-t border-white/40 dark:border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsDossierModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = generateComplaintDraft(selectedDossierEntry);
                    navigator.clipboard.writeText(text);
                    setCopiedDraft(true);
                    setTimeout(() => setCopiedDraft(false), 2000);
                    showToast("Complaint draft copied to clipboard!", "success");
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 backdrop-blur-md bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/15 rounded-full transition-all shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Statement</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDossier(selectedDossierEntry)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full shadow-[0_4px_15px_rgba(37,99,235,0.3)] border border-blue-400/30 transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download Formal Letter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrosscheckApp() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[100dvh] w-full bg-[#F9FAFB] dark:bg-[#0B0C0E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 tracking-wide">
            Loading Crosscheck Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <CrosscheckAppContent />
    </ToastProvider>
  );
}
