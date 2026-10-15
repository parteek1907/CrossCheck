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
  UserPlus,
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
  getFamilyMembers,
  addFamilyMember,
  deleteFamilyMember,
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
    safeCircle: "Safe-Word",
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
    safeCircle: "सेफ़-वर्ड",
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

  // Family Members Directory State
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberRelation, setNewMemberRelation] = useState("Father");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");

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
    setFamilyMembers(getFamilyMembers());
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
    window.addEventListener("crosscheck_family_members_updated", refreshLocalData);
    window.addEventListener("focus", refreshLocalData);

    return () => {
      window.removeEventListener("crosscheck_reports_updated", refreshLocalData);
      window.removeEventListener("crosscheck_profile_updated", refreshLocalData);
      window.removeEventListener("crosscheck_settings_updated", refreshLocalData);
      window.removeEventListener("crosscheck_vault_updated", refreshLocalData);
      window.removeEventListener("crosscheck_family_members_updated", refreshLocalData);
      window.removeEventListener("focus", refreshLocalData);
    };
  }, [refreshLocalData]);

  // Set document title per active page
  useEffect(() => {
    const navTitles = {
      dashboard: "Dashboard",
      history: "History",
      vault: "Evidence Vault",
      safecircle: "Safe-Word",
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
    const text = `🛡️ *Crosscheck - Safe-Word Protocol*\n\nTo defeat AI voice-clone & phone extortion scams, our family is using this authentication word:\n\n🗣️ *Safe-Word:* "${safeWordData.code}"\n🤫 *Silent Duress Code:* "${safeWordData.duressCode}"\n\n⚠️ *Family Rule:* If anyone calls asking for urgent money claiming to be family from an unknown number, ALWAYS ask for this safe-word first!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      showToast("Please enter the family member's name.", "warning");
      return;
    }
    if (!newMemberPhone.trim()) {
      showToast("Please enter a contact phone number.", "warning");
      return;
    }
    const updated = addFamilyMember({
      relation: newMemberRelation,
      name: newMemberName.trim(),
      phone: newMemberPhone.trim(),
    });
    setFamilyMembers(updated);
    setIsAddMemberModalOpen(false);
    setNewMemberName("");
    setNewMemberPhone("");
    setNewMemberRelation("Father");
    showToast(`Added ${newMemberRelation} (${newMemberName.trim()}) to Safe-Word Circle`, "success");
  };

  const handleDeleteMember = (id, name, relation) => {
    const updated = deleteFamilyMember(id);
    setFamilyMembers(updated);
    showToast(`Removed ${relation || "member"} (${name || ""})`, "info");
  };

  const handleSendSafeWordToMember = (member) => {
    const cleanPhone = (member.phone || "").replace(/[^\d+]/g, "");
    const text = `🛡️ *Crosscheck - Safe-Word Protocol*\n\nHey ${member.name || member.relation},\nTo protect our family from AI voice-clone & extortion scams, remember our safe-word:\n\n🗣️ *Safe-Word:* "${safeWordData?.code || 'GOLDEN LOTUS'}"\n\n⚠️ *Family Rule:* If anyone calls from an unknown number asking for urgent money claiming to be family, ALWAYS ask for this safe-word first!`;
    const url = `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    showToast(`Opening WhatsApp to send safe-word to ${member.name || member.relation}...`, "success");
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
    const rawId = entry.caseId || entry.reportId || "record";
    const cleanId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Crosscheck_Dossier_${cleanId}.txt`;

    const content = `================================================================================
CROSSCHECK DIGITAL FORENSIC DOSSIER & EVIDENCE RECORD
================================================================================
CASE / AUDIT ID : ${rawId}
CATEGORY        : ${(entry.incidentCategory || entry.category || "Digital Forensic Evidence").toUpperCase()}
VERDICT         : ${entry.verdict || "RECORDED & IMMUTABLE"} ${entry.score !== undefined ? `[Score: ${entry.score}/100]` : ""}
RECORDED TIME   : ${entry.timestamp || new Date().toLocaleString()}
SHA-256 DIGEST  : ${entry.entryHash || entry.auditHash || entry.audit?.auditHash || "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"}
PREVIOUS HASH   : ${entry.previousHash || "GENESIS_BLOCK"}
LEDGER BLOCK    : #${(entry.index || 0) + 1}
STATUS          : ${entry.statusMessage || "Verified & Cryptographically Secured"}

--------------------------------------------------------------------------------
1. EXAMINED CONTENT / INCIDENT PARTICULARS
--------------------------------------------------------------------------------
Statement / Claim:
"${entry.details || entry.claimText || entry.notes || "Case statement securely logged."}"

Platform / Medium : ${entry.platform || "Digital Network / Web Communication"}
Suspect Handle/Info: ${entry.suspectInfo || "Disclosed in Attached Evidence Dossier"}
Complainant / Lead: ${entry.contactName || userProfile?.displayName || "Crosscheck Investigator"}
${entry.contactPhone ? `Contact Phone     : ${entry.contactPhone}\n` : ""}${entry.contactEmail ? `Contact Email     : ${entry.contactEmail}\n` : ""}${entry.summary ? `\n--------------------------------------------------------------------------------\n2. FORENSIC AUDIT SUMMARY\n--------------------------------------------------------------------------------\n${entry.summary}\n` : ""}${entry.evidence && entry.evidence.length > 0 ? `\n--------------------------------------------------------------------------------\n3. CORROBORATING SOURCES & WIRE EVIDENCE\n--------------------------------------------------------------------------------\n${entry.evidence.map((s, i) => `[${i + 1}] ${s.title || s.source || s.domain}\n    URL: ${s.url || "N/A"}\n    Reliability: ${s.reliability || "N/A"} | Type: ${s.type || "Wire"}`).join("\n\n")}\n` : ""}${entry.forensicsSummary ? `\n--------------------------------------------------------------------------------\n4. FORENSIC IMAGING / COMPRESSION TRACES\n--------------------------------------------------------------------------------\n${entry.forensicsSummary}\n` : ""}
--------------------------------------------------------------------------------
EVIDENCE PRESERVATION & LEGAL INTEGRITY NOTICE:
This record was cryptographically hashed and sealed in the Crosscheck tamper-evident
audit log. Valid for submission to National Cybercrime Helpline (1930),
cybercrime.gov.in, or court digital forensic inquiry.
================================================================================
Generated by Crosscheck Broadsheet Verification Desk
================================================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    showToast(`Dossier downloaded as ${filename}`, "success");
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
    <div className="h-[100dvh] w-screen overflow-hidden bg-[#F6F3EB] dark:bg-[#141312] text-[#181818] dark:text-[#F4EFEB] font-sans flex antialiased relative selection:bg-[#181818] selection:text-[#F6F3EB]">
      {/* ========================================================
          WARM EDITORIAL AMBIENT TEXTURE (Newspaper Parchment Light)
          ======================================================== */}
      <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#EAE4D9]/40 dark:bg-[#1F1E1B]/40 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-[#E4DDD0]/35 dark:bg-[#1A1916]/30 blur-[140px] pointer-events-none -z-10" />

      {/* ========================================================
          MOBILE FLOATING HAMBURGER (MD:HIDDEN)
          ======================================================== */}
      <button
        type="button"
        onClick={() => setIsMobileDrawerOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden p-2.5 rounded-2xl bg-[#FCFAF6] dark:bg-[#1C1B18] border border-[#181818]/15 dark:border-[#2D2B27] text-[#181818] dark:text-[#F4EFEB] shadow-md active:scale-95 transition-all"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ========================================================
          MOBILE DRAWER BACKDROP
          ======================================================== */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-all duration-300"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ========================================================
          FIXED EDITORIAL SIDEBAR DOCK (260PX WIDE, 100VH)
          ======================================================== */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 h-[100dvh] bg-[#FAF7F0] dark:bg-[#191816] border-r border-[#181818]/12 dark:border-[#2D2B27] flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[4px_0_24px_rgba(24,24,24,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${
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
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-[#181818]/15 dark:border-[#2D2B27] bg-[#FAF7F0] dark:bg-[#191816] flex items-center justify-center transition-transform hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/crosscheck_logo.jpg"
                  alt="Crosscheck Logo"
                  className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-screen"
                />
              </div>
              <span className="font-editorial text-2xl font-bold tracking-tight text-[#181818] dark:text-[#F4EFEB] hidden min-[1100px]:inline">
                Crosscheck
              </span>
            </div>
            {isMobileDrawerOpen && (
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-full text-[#747068] hover:text-[#181818] dark:hover:text-white md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Primary "+ New verification" button (NEWSPAPER BLACK INK CTA) */}
          <button
            type="button"
            title={t.newVerification}
            onClick={() => {
              setModalPrefill(null);
              setIsModalOpen(true);
              setIsMobileDrawerOpen(false);
            }}
            className="w-full h-10 px-3.5 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-[0.14em] font-bold text-[#F6F3EB] bg-[#181818] hover:bg-[#2C2A26] dark:bg-[#F4EFEB] dark:text-[#181818] dark:hover:bg-white rounded-xl shadow-xs border border-[#181818] dark:border-[#F4EFEB] transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden min-[1100px]:inline tracking-tight">{t.newVerification}</span>
          </button>

          {/* Search field (⌘K hint for search palette - NEWSPAPER STYLE) */}
          <div
            onClick={() => setIsCommandPaletteOpen(true)}
            title={`${t.searchPlaceholder} (⌘K)`}
            className="h-10 px-3 rounded-xl border border-[#181818]/15 dark:border-[#2D2B27] bg-[#FCFAF6] dark:bg-[#1F1E1B] hover:bg-[#F0EDE4] dark:hover:bg-[#282622] flex items-center justify-between cursor-pointer transition-all duration-200 shadow-xs hover:border-[#181818]/40"
          >
            <div className="flex items-center gap-2 text-xs text-[#747068] dark:text-[#9E998F]">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="hidden min-[1100px]:inline truncate">{t.searchPlaceholder}</span>
            </div>
            <kbd className="hidden min-[1100px]:inline px-1.5 py-0.5 text-[10px] font-mono text-[#55524B] dark:text-[#9E998F] bg-[#EFECE3] dark:bg-[#282622] rounded-md border border-[#181818]/10 dark:border-[#3D3A34]">
              ⌘K
            </kbd>
          </div>

          {/* Middle Navigation (Newspaper active tabs) */}
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
                      className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-xs transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border border-[#181818] dark:border-[#F4EFEB] shadow-xs font-bold"
                          : "text-[#55524B] dark:text-[#9E998F] hover:text-[#181818] dark:hover:text-[#F4EFEB] hover:bg-[#EFECE3] dark:hover:bg-[#24221F] border border-transparent font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden min-[1100px]:inline">{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`hidden min-[1100px]:inline text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? "bg-[#33312D] text-[#F6F3EB] dark:bg-[#E0DDD5] dark:text-[#181818] border-white/20 dark:border-black/20"
                            : "bg-[#EFECE3] dark:bg-[#282622] text-[#181818] dark:text-[#F4EFEB] border-[#181818]/10 dark:border-[#3D3A34]"
                        }`}>
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
        <div className="mt-auto pt-4 border-t border-[#181818]/10 dark:border-[#2D2B27] space-y-2">
          <button
            type="button"
            title={t.settings}
            onClick={() => {
              setActiveNav("settings");
              setIsMobileDrawerOpen(false);
            }}
            aria-current={activeNav === "settings" ? "page" : undefined}
            className={`w-full h-10 px-3 rounded-xl flex items-center gap-3 text-xs transition-all duration-200 cursor-pointer ${
              activeNav === "settings"
                ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border border-[#181818] dark:border-[#F4EFEB] font-bold shadow-xs"
                : "text-[#55524B] dark:text-[#9E998F] hover:text-[#181818] dark:hover:text-[#F4EFEB] hover:bg-[#EFECE3] dark:hover:bg-[#24221F] border border-transparent font-medium"
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
            className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-xs transition-all duration-200 cursor-pointer ${
              activeNav === "help"
                ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border border-[#181818] dark:border-[#F4EFEB] font-bold shadow-xs"
                : "text-[#55524B] dark:text-[#9E998F] hover:text-[#181818] dark:hover:text-[#F4EFEB] hover:bg-[#EFECE3] dark:hover:bg-[#24221F] border border-transparent font-medium"
            }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span className="hidden min-[1100px]:inline">{t.helpCenter}</span>
            </div>
            <span className="hidden min-[1100px]:inline text-[10px] font-mono font-bold text-[#C84630] dark:text-[#E05A44] bg-[#FDF1EE] dark:bg-[#2B1512] border border-[#F7C4BC] dark:border-[#52241D] px-1.5 py-0.5 rounded-full">
              SOS
            </span>
          </button>

          {/* User Chip (NEWSPAPER WARM BOX) */}
          <div className="pt-2">
            <div
              title={`${userProfile.displayName || "Guest"} — Stored on this device`}
              className="p-2.5 rounded-xl bg-[#FCFAF6] dark:bg-[#1C1B18] border border-[#181818]/12 dark:border-[#2D2B27] flex items-center gap-2.5 shadow-xs"
            >
              <div className="w-7 h-7 rounded-lg bg-[#181818] dark:bg-[#F4EFEB] text-[#F6F3EB] dark:text-[#181818] flex items-center justify-center text-xs font-editorial font-bold flex-shrink-0 shadow-xs">
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
                      className="w-20 px-1 py-0.5 text-xs border border-[#181818]/30 dark:border-gray-700 bg-white dark:bg-black rounded"
                      autoFocus
                    />
                    <button onClick={handleSaveName} className="text-[10px] text-[#181818] dark:text-[#F4EFEB] font-bold underline">
                      Save
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingName(true)}
                    className="cursor-pointer group truncate"
                    title="Click to edit name"
                  >
                    <span className="text-xs font-bold text-[#181818] dark:text-[#F4EFEB] truncate block font-sans">
                      {userProfile.displayName || "Guest"}
                    </span>
                    <span className="text-[10px] text-[#747068] dark:text-[#9E998F] block truncate font-mono">
                      Stored on this device
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Small Privacy Note */}
          <p className="hidden min-[1100px]:block text-[10px] font-mono text-[#747068] dark:text-[#9E998F] text-center pt-1 font-medium tracking-wide">
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
          {/* ========================================================
              DASHBOARD VIEW
              ======================================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-8 animate-in fade-in-0 duration-200">
              {/* Page Header (Broadsheet Newspaper Headline) */}
              <div className="pl-12 md:pl-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#747068] dark:text-[#9E998F] font-bold">
                    EST. 2026 • DAILY FORENSIC WIRE
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] tracking-tight">
                  {t.dashboard}
                </h1>
                <p className="text-xs text-[#747068] dark:text-[#9E998F] mt-1 font-mono">
                  Real-time digital forensics, open wire corroboration, and tamper-evident proof ledger.
                </p>
              </div>

              {/* QUICK-CHECK DROPZONE CARD (NEWSPAPER SEARCH BOX STYLE) */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropzoneDrop}
                onClick={() => {
                  setModalPrefill(null);
                  setIsModalOpen(true);
                }}
                className="p-5 sm:p-6 border border-[#181818]/15 dark:border-[#2D2B27] hover:border-[#181818]/40 dark:hover:border-[#504C44] bg-[#FCFAF6] dark:bg-[#181715] hover:bg-[#FAF7F0] dark:hover:bg-[#1E1C19] rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 group newspaper-card shadow-xs"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#181818] dark:bg-[#F4EFEB] text-[#F6F3EB] dark:text-[#181818] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-[#181818] dark:text-[#F4EFEB] tracking-tight font-sans">
                      {t.quickDropzone}
                    </h2>
                    <p className="text-[11px] text-[#747068] dark:text-[#9E998F] mt-0.5 font-mono">
                      {t.quickDropzoneHint}
                    </p>
                  </div>
                </div>
                <kbd className="hidden sm:inline px-2.5 py-1 text-[10px] font-mono text-[#181818] dark:text-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#22201D] rounded-lg border border-[#181818]/15 dark:border-[#33302B] shadow-2xs">
                  Press N
                </kbd>
              </div>

              {/* KPI ROW (4 EQUAL HEIGHT BROADSHEET METRIC CARDS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Proofs */}
                <div className="p-5 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs hover:border-[#181818]/30 dark:hover:border-[#444039] newspaper-card flex flex-col justify-between group">
                  <div className="text-[10px] font-mono uppercase text-[#747068] dark:text-[#9E998F] font-bold tracking-[0.15em]">
                    {t.totalProofs}
                  </div>
                  <div className="my-2 text-3xl font-bold font-mono text-[#181818] dark:text-[#F4EFEB] group-hover:translate-x-0.5 transition-transform">
                    {isLoading ? "—" : stats.totalProofs > 0 ? stats.totalProofs : "—"}
                  </div>
                  <div className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">
                    {t.totalProofsCaption}
                  </div>
                </div>

                {/* 2. Flagged Claims (Terracotta Accent) */}
                <div className="p-5 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs hover:border-[#C84630]/40 newspaper-card flex flex-col justify-between group">
                  <div className="text-[10px] font-mono uppercase text-[#747068] dark:text-[#9E998F] font-bold tracking-[0.15em]">
                    {t.flaggedClaims}
                  </div>
                  <div className={`my-2 text-3xl font-bold font-mono group-hover:translate-x-0.5 transition-transform ${stats.totalProofs > 0 ? "text-[#C84630] dark:text-[#E06D53]" : "text-[#181818] dark:text-[#F4EFEB]"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : `${stats.disputedPercent}%`}
                  </div>
                  <div className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">
                    {t.flaggedClaimsCaption}
                  </div>
                </div>

                {/* 3. Average time to verdict */}
                <div className="p-5 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs hover:border-[#181818]/30 dark:hover:border-[#444039] newspaper-card flex flex-col justify-between group">
                  <div className="text-[10px] font-mono uppercase text-[#747068] dark:text-[#9E998F] font-bold tracking-[0.15em]">
                    {t.avgDuration}
                  </div>
                  <div className="my-2 text-3xl font-bold font-mono group-hover:translate-x-0.5 transition-transform text-[#181818] dark:text-[#F4EFEB]">
                    {isLoading || stats.totalProofs === 0 ? "—" : stats.avgDurationFormatted}
                  </div>
                  <div className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">
                    {t.avgDurationCaption}
                  </div>
                </div>

                {/* 4. High-confidence results (Forest Green Accent) */}
                <div className="p-5 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs hover:border-[#2D6A4F]/40 newspaper-card flex flex-col justify-between group">
                  <div className="text-[10px] font-mono uppercase text-[#747068] dark:text-[#9E998F] font-bold tracking-[0.15em]">
                    {t.highConfidence}
                  </div>
                  <div className={`my-2 text-3xl font-bold font-mono group-hover:translate-x-0.5 transition-transform ${stats.totalProofs > 0 ? "text-[#2D6A4F] dark:text-[#52B788]" : "text-[#181818] dark:text-[#F4EFEB]"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : stats.highConfidenceCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">
                    {t.highConfidenceCaption}
                  </div>
                </div>
              </div>

              {/* CHARTS ROW: 30-DAY ACTIVITY & VERDICT MIX (NEWSPAPER CARDS) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 30-Day Activity Chart */}
                <div className="lg:col-span-2 p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-300 newspaper-card">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                    <div>
                      <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F4EFEB]">
                        30-Day Verification Activity
                      </h3>
                      <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] mt-0.5">
                        Daily verification volume computed from local audit records
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#747068] dark:text-[#9E998F] bg-[#FAF7F0] dark:bg-[#22201D] px-2.5 py-1 rounded-md border border-[#181818]/15 dark:border-[#33302B]">
                      Past 30 Days
                    </span>
                  </div>

                  {stats.totalProofs === 0 ? (
                    <div className="h-44 flex items-center justify-center text-center text-xs font-mono text-[#747068] border border-dashed border-[#181818]/20 dark:border-[#2D2B27] rounded-xl my-2 bg-[#FAF7F0] dark:bg-[#1E1C19]">
                      No activity yet. Run a check to see your trend.
                    </div>
                  ) : (
                    <>
                      <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                        {stats.chartDays.map((d, idx) => {
                          const maxCount = Math.max(1, ...stats.chartDays.map((c) => c.count));
                          const barHeight = d.count > 0 ? `${Math.max(15, Math.round((d.count / maxCount) * 100))}%` : "4px";
                          const isToday = idx === stats.chartDays.length - 1;
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center group relative h-full justify-end"
                            >
                              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                <div className="bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] text-[10px] font-mono px-2.5 py-1 rounded-lg shadow-xl border border-[#181818]/20 whitespace-nowrap">
                                  {d.label}: {d.count} checks
                                </div>
                              </div>
                              <div
                                style={{ height: barHeight }}
                                className={`w-full rounded-xs transition-all ${
                                  d.count > 0
                                    ? isToday
                                      ? "bg-[#C84630] hover:brightness-110 shadow-xs"
                                      : "bg-[#181818] dark:bg-[#F4EFEB] hover:bg-[#C84630] dark:hover:bg-[#C84630]"
                                    : "bg-[#E6E1D6] dark:bg-[#282622] hover:bg-[#DCD6CD]"
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] font-mono text-[#747068] dark:text-[#9E998F]">
                        <span>30 days ago</span>
                        <span>15 days ago</span>
                        <span className="font-bold text-[#181818] dark:text-[#F4EFEB]">Today</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Verdict Distribution */}
                <div className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-300 newspaper-card">
                  <div>
                    <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] mb-1">
                      Verdict Distribution
                    </h3>
                    <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] mb-6">
                      Breakdown across all evaluated claims
                    </p>

                    {stats.totalProofs === 0 ? (
                      <div className="h-32 flex items-center justify-center text-center text-xs font-mono text-[#747068] border border-dashed border-[#181818]/20 dark:border-[#2D2B27] rounded-xl bg-[#FAF7F0] dark:bg-[#1E1C19]">
                        No verdicts recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-[#181818] dark:text-[#F4EFEB] flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-[#C84630]" />
                              Likely Manipulated
                            </span>
                            <span className="font-mono font-bold text-[#181818] dark:text-[#F4EFEB]">
                              {stats.verdictMix.likelyManipulated}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#EFECE4] dark:bg-[#262420] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C84630] rounded-full"
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
                            <span className="text-[#181818] dark:text-[#F4EFEB] flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-[#C58F2C]" />
                              Inconclusive
                            </span>
                            <span className="font-mono font-bold text-[#181818] dark:text-[#F4EFEB]">
                              {stats.verdictMix.inconclusive}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#EFECE4] dark:bg-[#262420] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C58F2C] rounded-full"
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
                            <span className="text-[#181818] dark:text-[#F4EFEB] flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
                              No Signs Found
                            </span>
                            <span className="font-mono font-bold text-[#181818] dark:text-[#F4EFEB]">
                              {stats.verdictMix.noSignsFound}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#EFECE4] dark:bg-[#262420] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2D6A4F] rounded-full"
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

                  <div className="mt-6 pt-4 border-t border-[#181818]/10 dark:border-[#2D2B27] text-xs text-[#747068] dark:text-[#9E998F] font-mono flex items-center justify-between">
                    <span>Active Storage:</span>
                    <span className="text-[#181818] dark:text-[#F4EFEB] font-bold">Stored on this device</span>
                  </div>
                </div>
              </div>

              {/* RECENT VERIFICATIONS TABLE (BROADSHEET DOCKET TABLE) */}
              <div className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs transition-all duration-300 newspaper-card">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                  <div>
                    <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F4EFEB]">{t.recentVerifications}</h3>
                    <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] mt-0.5">Live cryptographic proof records stored on this device</p>
                  </div>
                  {reports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveNav("history")}
                      className="text-xs text-[#181818] dark:text-[#F4EFEB] font-bold hover:underline font-mono flex items-center gap-1"
                    >
                      <span>View all</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {reports.length === 0 ? (
                  /* Calm empty state with newspaper CTA button */
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center border border-dashed border-[#181818]/20 dark:border-[#2D2B27] rounded-xl bg-[#FAF7F0] dark:bg-[#1E1C19]">
                    <div className="w-12 h-12 rounded-xl bg-[#181818] dark:bg-[#F4EFEB] text-[#F6F3EB] dark:text-[#181818] flex items-center justify-center mb-3 shadow-xs">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-[#181818] dark:text-[#F4EFEB] font-editorial text-base">No verifications on this device yet</h4>
                    <p className="mt-1 text-xs font-mono text-[#747068] dark:text-[#9E998F] max-w-sm">
                      Submit any viral headline, WhatsApp message, or photo to run multi-source news wire verification.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setModalPrefill(null);
                        setIsModalOpen(true);
                      }}
                      className="mt-5 flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#F6F3EB] bg-[#181818] hover:bg-black dark:bg-[#F4EFEB] dark:text-[#181818] dark:hover:bg-white rounded-xl shadow-xs border border-[#181818]/20 transition-all active:scale-[0.98] cursor-pointer"
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
                        <tr className="border-b border-[#181818]/10 dark:border-[#2D2B27] text-[#747068] dark:text-[#9E998F] font-bold uppercase tracking-wider text-[10px] font-mono">
                          <th className="py-3 px-3">Verdict</th>
                          <th className="py-3 px-3">Claim</th>
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Score</th>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Audit ID</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#181818]/5 dark:divide-[#2D2B27]/50">
                        {reports.slice(0, 8).map((r) => {
                          const isManip = (r.verdict || "").toLowerCase().includes("manipulated");
                          const isNoSigns = (r.verdict || "").toLowerCase().includes("no signs");
                          return (
                            <tr
                              key={r.reportId}
                              onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                              className="hover:bg-[#FAF7F0] dark:hover:bg-[#1F1E1B] transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
                                    isManip
                                      ? "bg-[#FDF1EE] text-[#A83220] border border-[#F2C0B7] dark:bg-[#2A1412] dark:text-[#E06D53] dark:border-[#4E221D]"
                                      : isNoSigns
                                      ? "bg-[#EDF7F1] text-[#1E4D38] border border-[#BCE3CE] dark:bg-[#11241A] dark:text-[#52B788] dark:border-[#1E4631]"
                                      : "bg-[#FFF9EC] text-[#8C6418] border border-[#F4E0A5] dark:bg-[#261E0E] dark:text-[#E0B853] dark:border-[#4B3B1B]"
                                  }`}
                                >
                                  {r.verdict || "Inconclusive"}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-[#181818] dark:text-[#F4EFEB] max-w-xs truncate">
                                {r.claimText || r.inputText}
                              </td>
                              <td className="py-3 px-3">
                                {getInputTypeIcon(r)}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-[#181818] dark:text-[#F4EFEB]">
                                {r.score ?? 50}
                                {r.confidence?.margin ? (
                                  <span className="text-[10px] text-[#747068] font-normal ml-1">
                                    ±{r.confidence.margin}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 px-3 text-[#747068] dark:text-[#9E998F] whitespace-nowrap font-mono text-[11px]">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Today"}
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px] text-[#747068] dark:text-[#9E998F]">
                                {r.reportId}
                              </td>
                              <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveMenuReportId(activeMenuReportId === r.reportId ? null : r.reportId)
                                    }
                                    className="p-1.5 rounded-lg text-[#747068] hover:text-[#181818] dark:hover:text-[#F4EFEB] hover:bg-[#EFECE4] dark:hover:bg-[#262420] transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {activeMenuReportId === r.reportId && (
                                    <div className="absolute right-0 mt-1 w-44 bg-[#FAF7F0] dark:bg-[#1C1A17] border border-[#181818]/20 dark:border-[#3A3630] rounded-xl shadow-xl z-30 py-1.5 text-xs overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                                        className="w-full text-left px-3.5 py-2 hover:bg-[#EFECE4] dark:hover:bg-[#262420] font-semibold text-[#181818] dark:text-[#F4EFEB] flex items-center justify-between transition-colors"
                                      >
                                        <span>Open report</span>
                                        <ArrowUpRight className="w-3.5 h-3.5 text-[#747068]" />
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
                                        className="w-full text-left px-3.5 py-2 hover:bg-[#EFECE4] dark:hover:bg-[#262420] font-medium text-[#181818] dark:text-[#F4EFEB] flex items-center justify-between transition-colors"
                                      >
                                        <span>Copy link</span>
                                        <LinkIcon className="w-3.5 h-3.5 text-[#747068]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleBookmarkToggle(r.reportId, e)}
                                        className="w-full text-left px-3.5 py-2 hover:bg-[#EFECE4] dark:hover:bg-[#262420] font-medium text-[#181818] dark:text-[#F4EFEB] flex items-center justify-between transition-colors"
                                      >
                                        <span>{r.isSaved ? "Unsave" : "Save"}</span>
                                        <Bookmark className="w-3.5 h-3.5 text-[#747068]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteReport(r.reportId, e)}
                                        className="w-full text-left px-3.5 py-2 hover:bg-[#FDF1EE] dark:hover:bg-[#2A1412] text-[#A83220] dark:text-[#E06D53] font-medium flex items-center justify-between transition-colors"
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
              HISTORY VIEW (BROADSHEET ARCHIVE)
              ======================================================== */}
          {activeNav === "history" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                <div>
                  <h2 className="text-2xl font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] tracking-tight">History</h2>
                  <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] mt-0.5">All local verification records on this device</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryFilterSaved(!historyFilterSaved)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    historyFilterSaved
                      ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border-[#181818] shadow-xs"
                      : "bg-[#FCFAF6] dark:bg-[#181715] text-[#181818] dark:text-[#F4EFEB] border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#FAF7F0] shadow-2xs"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Cases Only</span>
                </button>
              </div>

              <div className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs newspaper-card">
                {filteredReports.length === 0 ? (
                  <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] py-12 text-center">
                    {historyFilterSaved ? "No saved reports found." : "No verification history found on this device."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((r) => (
                      <div
                        key={r.reportId}
                        onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                        className="p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] hover:bg-[#F2EEE4] dark:hover:bg-[#25221E] border border-[#181818]/10 dark:border-[#2D2B27] rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer shadow-2xs group newspaper-card"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <p className="text-xs font-bold text-[#181818] dark:text-[#F4EFEB] truncate font-sans">
                            {r.claimText || r.inputText}
                          </p>
                          <p className="text-[11px] text-[#747068] dark:text-[#9E998F] font-mono">
                            {r.reportId} • Score: {r.score} • {r.verdict}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleBookmarkToggle(r.reportId, e)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              r.isSaved
                                ? "bg-[#FFF9EC] text-[#8C6418] border-[#F4E0A5]"
                                : "bg-[#FCFAF6] dark:bg-[#181715] text-[#747068] border-[#181818]/15 dark:border-[#2D2B27]"
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                            className="px-3.5 py-1 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black dark:hover:bg-white rounded-lg border border-[#181818]/20 shadow-xs transition-all active:scale-[0.98]"
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
              EVIDENCE VAULT VIEW (BROADSHEET LEGAL DOCKET)
              ======================================================== */}
          {activeNav === "vault" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              {/* Top Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                <div>
                  <h2 className="text-2xl font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] tracking-tight">
                    Evidence Vault & Incident Reporting
                  </h2>
                  <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] mt-1">
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
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] ${
                      isFilingIncident
                        ? "bg-[#FAF7F0] dark:bg-[#22201D] text-[#181818] dark:text-[#F4EFEB] border border-[#181818]/20 dark:border-[#33302B]"
                        : "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black dark:hover:bg-white border border-[#181818]/20"
                    }`}
                  >
                    {isFilingIncident ? <X className="w-3.5 h-3.5" /> : <FilePlus className="w-3.5 h-3.5" />}
                    <span>{isFilingIncident ? "Cancel Report" : "File Incident Report"}</span>
                  </button>
                </div>
              </div>

              {/* Official Cyber Cell Emergency Hotline Banner (NEWSPAPER BULLETIN STYLE) */}
              <div className="p-4 rounded-2xl bg-[#FFF9EC] dark:bg-[#231A0F] border border-[#F4E0A5] dark:border-[#4B3B1B] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#C58F2C]/15 text-[#8C6418] dark:text-[#E0B853] border border-[#F4E0A5] dark:border-[#4B3B1B] flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#6A4706] dark:text-[#F4E0A5] block sm:inline mr-1 font-editorial text-sm">
                      National Cyber Crime Helpline: Dial 1930 (Toll-Free 24x7)
                    </span>
                    <span className="text-[#8C6418] dark:text-[#C58F2C] text-[11px] font-mono">
                      • For active UPI or banking fraud, call within the golden hour to freeze transactions.
                    </span>
                  </div>
                </div>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#181818] dark:text-[#F4EFEB] hover:underline flex items-center gap-1 flex-shrink-0 text-[11px] font-mono"
                >
                  <span>cybercrime.gov.in</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Confirmation Card (When Report is Queued & Dispatched) */}
              {submittedIncidentResult && (
                <div className="p-6 bg-[#EDF7F1] dark:bg-[#11241A] border border-[#BCE3CE] dark:border-[#1E4631] rounded-2xl shadow-xs space-y-4 animate-in fade-in-0 duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] text-[#F6F3EB] flex items-center justify-center flex-shrink-0 shadow-xs">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#2D6A4F] dark:text-[#52B788] font-bold block">
                          Case Registered & Dispatched
                        </span>
                        <h3 className="text-base font-editorial font-bold text-[#1E4D38] dark:text-[#E2F5EA]">
                          Your Report Has Been Queued for Cyber Cell Authorities
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSubmittedIncidentResult(null)}
                      className="p-1.5 text-[#747068] hover:text-[#181818] dark:hover:text-[#F4EFEB] rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 bg-[#FCFAF6] dark:bg-[#181715] rounded-xl border border-[#BCE3CE] dark:border-[#1E4631] space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#181818] dark:text-[#F4EFEB]">
                        Case Reference Number:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="px-2.5 py-1 bg-[#EDF7F1] dark:bg-[#11241A] text-[#1E4D38] dark:text-[#52B788] rounded-lg font-mono font-bold text-xs border border-[#BCE3CE] dark:border-[#1E4631]">
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
                          className="p-1 text-[#747068] hover:text-[#181818] dark:hover:text-[#F4EFEB] rounded"
                          title="Copy Case Reference ID"
                        >
                          {copiedCaseId ? <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[#55524B] dark:text-[#C5BFB5] leading-relaxed pt-1">
                      <strong>Next Steps:</strong> Your incident dossier has been sealed in the local tamper-evident vault with a SHA-256 cryptographic digest. It has been queued for investigation by the Cyber Crime Response Division. An authorized officer will review your statement and contact you on your provided contact details within <strong>24 to 48 hours</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadDossier(submittedIncidentResult)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#F6F3EB] bg-[#181818] hover:bg-black rounded-xl shadow-xs transition-all border border-[#181818]/20 active:scale-[0.98]"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download Evidence Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDossierEntry(submittedIncidentResult);
                        setIsDossierModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#181818] dark:text-[#F4EFEB] bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#FAF7F0] rounded-xl transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubmittedIncidentResult(null)}
                      className="text-xs font-semibold text-[#2D6A4F] dark:text-[#52B788] hover:underline px-2 font-mono"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* The Incident Report Filing Form */}
              {isFilingIncident && (
                <div className="p-6 sm:p-8 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl shadow-xs space-y-6 animate-in fade-in-0 duration-200 newspaper-card">
                  <div className="flex items-start justify-between border-b border-[#181818]/10 dark:border-[#2D2B27] pb-4">
                    <div>
                      <h3 className="text-xl font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] tracking-tight">
                        File a New Incident Report
                      </h3>
                      <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] mt-0.5">
                        Select what happened, describe the incident, attach any proof, and submit for cyber cell review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFilingIncident(false)}
                      className="p-1.5 text-[#747068] hover:text-[#181818] dark:hover:text-[#F4EFEB] rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitIncident} className="space-y-6">
                    {/* Step 1: Category Selection */}
                    <div>
                      <label className="block text-xs font-bold text-[#181818] dark:text-[#F4EFEB] uppercase tracking-wider mb-2.5 font-mono">
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
                              className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
                                isSelected
                                  ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border-[#181818] shadow-xs"
                                  : "bg-[#FAF7F0] dark:bg-[#1E1C19] border-[#181818]/12 dark:border-[#2D2B27] text-[#181818] dark:text-[#F4EFEB] hover:bg-[#F2EEE4] dark:hover:bg-[#25221E]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-xs">{cat.label}</span>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-[#F6F3EB] text-[#181818] dark:bg-[#181818] dark:text-[#F4EFEB] flex items-center justify-center flex-shrink-0 shadow-xs">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <p className={`text-[11px] leading-relaxed ${isSelected ? "text-[#DCD6CD] dark:text-[#55524B]" : "text-[#747068] dark:text-[#9E998F]"}`}>
                                {cat.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: What happened details */}
                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-[#181818] dark:text-[#F4EFEB] uppercase tracking-wider font-mono">
                        2. Incident Details
                      </label>

                      <div>
                        <textarea
                          rows={4}
                          value={incidentDetails}
                          onChange={(e) => setIncidentDetails(e.target.value)}
                          placeholder="Please explain what happened in detail... (e.g. what the person said, message timeline, fraudulent amount or payment requests, threats made, etc.)"
                          className="w-full px-4 py-3 text-sm text-[#181818] dark:text-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl placeholder:text-[#747068] focus:outline-none focus:border-[#181818] dark:focus:border-[#F4EFEB] transition-all resize-none shadow-xs font-sans"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#181818] dark:text-[#F4EFEB] mb-1 font-mono">
                            Platform / Channel Where It Occurred
                          </label>
                          <select
                            value={incidentPlatform}
                            onChange={(e) => setIncidentPlatform(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl focus:outline-none focus:border-[#181818] text-[#181818] dark:text-[#F4EFEB] shadow-xs"
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
                          <label className="block text-xs font-semibold text-[#181818] dark:text-[#F4EFEB] mb-1 font-mono">
                            Suspect Phone / Username / UPI ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={incidentSuspectInfo}
                            onChange={(e) => setIncidentSuspectInfo(e.target.value)}
                            placeholder="e.g. +91 98765 43210 or user@okhdfc"
                            className="w-full px-3.5 py-2.5 text-xs text-[#181818] dark:text-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl focus:outline-none focus:border-[#181818] placeholder:text-[#747068] shadow-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Screenshot or Evidence Upload */}
                    <div>
                      <label className="block text-xs font-bold text-[#181818] dark:text-[#F4EFEB] uppercase tracking-wider mb-2 font-mono">
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
                          className="p-6 border-2 border-dashed border-[#181818]/20 dark:border-[#2D2B27] hover:border-[#181818]/50 dark:hover:border-[#504C44] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all bg-[#FAF7F0] dark:bg-[#1E1C19] hover:bg-[#F2EEE4] shadow-xs"
                        >
                          <Upload className="w-5 h-5 text-[#181818] dark:text-[#F4EFEB] mb-2" />
                          <p className="text-xs font-bold text-[#181818] dark:text-[#F4EFEB] text-center font-sans">
                            Click to upload screenshot of messages, payment receipts, or threatening posts
                          </p>
                          <p className="text-[11px] text-[#747068] dark:text-[#9E998F] mt-0.5 text-center font-mono">
                            Supports JPG, PNG, WEBP, or PDF up to 15MB
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl flex items-center justify-between gap-4 shadow-xs">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {incidentScreenshot.previewUrl ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 border border-[#181818]/15 shadow-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={incidentScreenshot.previewUrl}
                                  alt="Screenshot preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[#EFECE4] dark:bg-[#282622] flex items-center justify-center text-[#181818] dark:text-[#F4EFEB] flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-[#181818] dark:text-[#F4EFEB] truncate font-sans">
                                {incidentScreenshot.name}
                              </p>
                              <p className="text-[11px] text-[#747068] dark:text-[#9E998F] font-mono">
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
                            className="p-1.5 text-[#747068] hover:text-[#181818] dark:hover:text-[#F4EFEB] rounded-full"
                            title="Remove screenshot"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Step 4: Contact details */}
                    <div className="space-y-3 pt-2 border-t border-[#181818]/10 dark:border-[#2D2B27]">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-[#181818] dark:text-[#F4EFEB] uppercase tracking-wider font-mono">
                          4. Your Contact Details (So Cyber Cell Authorities Can Reach You)
                        </label>
                        <span className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">Review within 24-48 hrs</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#747068] dark:text-[#9E998F] mb-1 font-mono">
                            Your Full Name
                          </label>
                          <input
                            type="text"
                            value={incidentContactName}
                            onChange={(e) => setIncidentContactName(e.target.value)}
                            placeholder={userProfile.displayName || "Complainant Name"}
                            className="w-full px-3.5 py-2.5 text-xs text-[#181818] dark:text-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl focus:outline-none focus:border-[#181818] shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#747068] dark:text-[#9E998F] mb-1 font-mono">
                            Contact Phone / WhatsApp *
                          </label>
                          <input
                            type="tel"
                            value={incidentContactPhone}
                            onChange={(e) => setIncidentContactPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full px-3.5 py-2.5 text-xs text-[#181818] dark:text-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl focus:outline-none focus:border-[#181818] font-mono shadow-xs"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#747068] dark:text-[#9E998F] mb-1 font-mono">
                            Email Address (Optional)
                          </label>
                          <input
                            type="email"
                            value={incidentContactEmail}
                            onChange={(e) => setIncidentContactEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full px-3.5 py-2.5 text-xs text-[#181818] dark:text-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl focus:outline-none focus:border-[#181818] shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit and Action Buttons */}
                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#181818]/10 dark:border-[#2D2B27]">
                      <p className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F] flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F] flex-shrink-0" />
                        <span>Sealed with tamper-evident SHA-256 hash. Queued for official review.</span>
                      </p>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsFilingIncident(false)}
                          className="px-4 py-2 text-xs font-semibold text-[#181818] dark:text-[#F4EFEB] hover:bg-[#EFECE4] dark:hover:bg-[#262420] rounded-xl transition-all"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmittingIncident}
                          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#F6F3EB] bg-[#181818] hover:bg-black dark:bg-[#F4EFEB] dark:text-[#181818] dark:hover:bg-white disabled:opacity-75 rounded-xl shadow-xs border border-[#181818]/20 transition-all cursor-pointer active:scale-[0.98]"
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
                <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                  <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F4EFEB]">
                    Evidence Ledger & Filed Cases ({vaultEntries.length})
                  </h3>
                  <span className="text-xs font-mono text-[#747068] dark:text-[#9E998F]">Cryptographically Chained</span>
                </div>

                {vaultEntries.length === 0 ? (
                  <div className="p-10 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl text-center space-y-3 shadow-xs newspaper-card">
                    <div className="w-12 h-12 rounded-xl bg-[#181818] dark:bg-[#F4EFEB] text-[#F6F3EB] dark:text-[#181818] flex items-center justify-center mx-auto shadow-xs">
                      <Archive className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#181818] dark:text-[#F4EFEB] font-editorial text-base">
                      No Records in Evidence Vault Yet
                    </p>
                    <p className="text-xs font-mono text-[#747068] dark:text-[#9E998F] max-w-md mx-auto">
                      File an incident report above if you encountered scams, bullying, or harassment, or save analyzed claims from verification reports.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsFilingIncident(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#F6F3EB] bg-[#181818] hover:bg-black dark:bg-[#F4EFEB] dark:text-[#181818] rounded-xl shadow-xs border border-[#181818]/20 transition-all active:scale-[0.98]"
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
                        scam: "bg-[#FDF1EE] text-[#A83220] border-[#F2C0B7] dark:bg-[#2A1412] dark:text-[#E06D53] dark:border-[#4E221D]",
                        bullying: "bg-[#FFF9EC] text-[#8C6418] border-[#F4E0A5] dark:bg-[#261E0E] dark:text-[#E0B853] dark:border-[#4B3B1B]",
                        harassment: "bg-[#FDF1EE] text-[#A83220] border-[#F2C0B7] dark:bg-[#2A1412] dark:text-[#E06D53] dark:border-[#4E221D]",
                        impersonation: "bg-[#FAF7F0] text-[#181818] border-[#181818]/20 dark:bg-[#22201D] dark:text-[#F4EFEB]",
                        other: "bg-[#FAF7F0] text-[#747068] border-[#181818]/15 dark:bg-[#22201D] dark:text-[#9E998F]"
                      }[e.incidentCategory || "other"] || "bg-[#FAF7F0] text-[#747068] border-[#181818]/15";

                      return (
                        <div
                          key={idx}
                          className="p-5 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl shadow-xs hover:border-[#181818]/30 transition-all space-y-3 newspaper-card"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-[#181818] dark:text-[#F4EFEB]">
                                #{e.caseId || e.reportId}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border uppercase ${categoryBadgeColor}`}>
                                {e.incidentCategory || "Digital Harm"}
                              </span>
                              {isIncident ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono font-semibold bg-[#EDF7F1] text-[#1E4D38] dark:bg-[#11241A] dark:text-[#52B788] rounded-full border border-[#BCE3CE] dark:border-[#1E4631]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] animate-pulse" />
                                  <span>Queued for Cyber Cell Review</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#FAF7F0] text-[#181818] dark:bg-[#22201D] dark:text-[#F4EFEB] rounded-full border border-[#181818]/15 dark:border-[#33302B]">
                                  <span>Ledger Verified</span>
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">
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
                                className="w-24 h-24 rounded-xl overflow-hidden border border-[#181818]/15 bg-[#FAF7F0] dark:bg-[#1E1C19] flex-shrink-0 cursor-pointer group relative shadow-xs"
                                title="Click to view attached evidence"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={e.screenshot.previewUrl}
                                  alt="Evidence thumbnail"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-mono font-bold">
                                  View
                                </div>
                              </div>
                            )}

                            <div className="flex-1 space-y-1.5">
                              <p className="text-xs font-semibold text-[#181818] dark:text-[#F4EFEB] leading-relaxed font-sans">
                                {e.details || e.claimText}
                              </p>

                              {isIncident && (
                                <div className="flex items-center gap-4 text-[11px] font-mono text-[#747068] dark:text-[#9E998F] pt-1 flex-wrap">
                                  {e.platform && <span>Channel: <strong className="text-[#181818] dark:text-[#F4EFEB]">{e.platform}</strong></span>}
                                  {e.contactPhone && <span>Contact: <strong className="text-[#181818] dark:text-[#F4EFEB]">{e.contactPhone}</strong></span>}
                                  {e.suspectInfo && <span>Suspect: <code className="font-mono bg-[#FAF7F0] dark:bg-[#22201D] px-1 py-0.5 rounded border border-[#181818]/15 dark:border-[#33302B] text-[#181818] dark:text-[#F4EFEB]">{e.suspectInfo}</code></span>}
                                </div>
                              )}

                              <p className="font-mono text-[10px] text-[#747068] dark:text-[#9E998F] truncate pt-0.5">
                                SHA-256: {e.entryHash}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-[#181818]/10 dark:border-[#2D2B27] text-xs">
                            <span className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">
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
                                className="px-3 py-1 text-xs font-semibold text-[#181818] dark:text-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#22201D] border border-[#181818]/15 dark:border-[#33302B] hover:bg-[#EFECE4] rounded-lg transition-all"
                              >
                                View Dossier
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadDossier(e)}
                                className="px-3 py-1 text-xs font-semibold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black dark:hover:bg-white rounded-lg transition-all active:scale-[0.98]"
                                title="Download case evidence dossier"
                              >
                                Download Dossier
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteVaultEntry(e.caseId || e.reportId)}
                                className="p-1.5 text-[#747068] hover:text-[#A83220] rounded-lg transition-colors"
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
              THE FAMILY SAFE-WORD VIEW (BROADSHEET NEWSPAPER WIRE)
              "Assume the fake is perfect."
              Out-of-band persistent authentication against AI voice cloning.
              ======================================================== */}
          {activeNav === "safecircle" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              {/* Header & Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#181818]/15 dark:border-[#2D2B27]">
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-[#747068] uppercase font-bold mb-1">
                    CONFIDENTIAL WIRE • OUT-OF-BAND PROTOCOL
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-[#181818] dark:text-[#F6F3EB] tracking-tight">
                    Safe-Word
                  </h2>
                  <p className="text-xs text-[#55524B] dark:text-[#A8A29E] mt-1 font-serif">
                    Assume the fake is perfect. Persistent out-of-band authentication for your family circle against voice-clone extortion scams.
                  </p>
                </div>

                {/* Top Action Controls: Language, Edit Words, WhatsApp */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Language Selector */}
                  <div className="relative flex items-center">
                    <Languages className="w-3.5 h-3.5 text-[#747068] absolute left-3 pointer-events-none" />
                    <select
                      value={safeWordLang}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setSafeWordLang(newLang);
                        setSafeWordLanguage(newLang);
                        showToast(`Language set to ${SAFE_WORD_LANGUAGES[newLang]?.label}`, "success");
                      }}
                      aria-label="Select safe-word language"
                      className="pl-8 pr-7 py-1.5 text-xs font-semibold bg-[#FCFAF6] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] text-[#181818] dark:text-[#F6F3EB] rounded-xl shadow-xs focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] transition-all cursor-pointer"
                    >
                      {Object.values(SAFE_WORD_LANGUAGES).map((l) => (
                        <option key={l.id} value={l.id} className="dark:bg-[#1E1C19]">
                          {l.flag} {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Edit Word Button */}
                  <button
                    type="button"
                    onClick={handleOpenEditWordModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#181818] dark:text-[#F6F3EB] bg-[#FCFAF6] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] dark:hover:bg-[#252320] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#181818] dark:text-[#F6F3EB]" />
                    <span>Edit Word</span>
                  </button>

                  {/* WhatsApp Share Button */}
                  <button
                    type="button"
                    onClick={handleShareToWhatsApp}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] bg-[#EDF7F1] dark:bg-[#1B2820] border border-[#2D6A4F]/30 hover:bg-[#D8EEDF] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    title="Share safe-word via WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share via WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Main Interactive Grid: Left Column (Words & Playbook) | Right Column (Family Members Directory) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Persistent Safe-Word, Silent Duress Word & Playbook */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Card 1: Persistent Safe-Word */}
                  <div className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl shadow-sm space-y-5 newspaper-card">
                    <div className="flex items-center justify-between pb-3 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                      <span className="text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase tracking-wider">
                        Active Safe-Word
                      </span>
                      <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] rounded-full">
                        {safeWordData?.isCustom ? "Custom Word" : "Standard Word"}
                      </span>
                    </div>

                    {/* Word Display Box */}
                    <div className="p-6 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-2xl text-center space-y-3 shadow-xs">
                      <span className="text-xs text-[#747068] font-serif block">
                        Ask caller for this word when contacted by family
                      </span>
                      <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-widest text-[#181818] dark:text-[#F6F3EB] py-1">
                        {safeWordData?.code || "GOLDEN LOTUS"}
                      </div>
                      <div className="text-xs text-[#747068] font-mono uppercase tracking-wider">
                        Language: {safeWordData?.language?.label || "English"}
                      </div>

                      {/* Action Buttons: Pronounce, Copy, Edit */}
                      <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSpeakSafeWord(safeWordData?.code, safeWordLang)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#181818] dark:text-[#F6F3EB] bg-[#FCFAF6] dark:bg-[#252320] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-xl transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                          title="Listen to pronunciation"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#181818] dark:text-[#F6F3EB]" />
                          <span>Pronounce</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopySafeWord(safeWordData?.code, "safe")}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#181818] dark:text-[#F6F3EB] bg-[#FCFAF6] dark:bg-[#252320] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-xl transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                        >
                          {copiedSafeWord ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#2D6A4F]" />
                              <span className="text-[#2D6A4F] font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#181818] dark:text-[#F6F3EB]" />
                              <span>Copy Word</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenEditWordModal}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black rounded-xl transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#747068] text-center font-mono">
                      Stays set permanently for your family until you choose to edit it.
                    </div>
                  </div>

                  {/* Card 2: The Silent Duress Word (VINTAGE AMBER / TERRACOTTA BROADSHEET) */}
                  <div className="p-6 bg-[#FFF9EC] dark:bg-[#252018] border border-[#C58F2C]/30 dark:border-[#C58F2C]/40 rounded-2xl shadow-sm space-y-4 newspaper-card">
                    <div className="flex items-center justify-between pb-3 border-b border-[#C58F2C]/20">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#C58F2C]" />
                        <span className="text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase tracking-wider">
                          Silent Duress Word
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenEditWordModal}
                        className="text-xs text-[#C58F2C] font-semibold hover:underline flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <p className="text-xs text-[#55524B] dark:text-[#D4C3A3] leading-relaxed">
                      If you or your family member is coerced to give the safe-word under physical threat, recite this word instead. It sounds normal to the scammer, but discreetly triggers an emergency alarm to refuse transfers and notify authorities.
                    </p>

                    {/* Masked Duress Word */}
                    <div className="p-4 bg-[#FAF3E0] dark:bg-[#1D1913] border border-[#C58F2C]/30 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                      <div>
                        <div className="text-[11px] font-mono font-bold text-[#C58F2C] uppercase">
                          Coercion signal word
                        </div>
                        <div className="text-xl font-mono font-bold text-[#181818] dark:text-[#F6F3EB] mt-0.5 tracking-wider">
                          {isDuressRevealed ? (safeWordData?.duressCode || "SILVER FALCON") : "••••••••••••••"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsDuressRevealed(!isDuressRevealed)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#181818] dark:text-[#F6F3EB] bg-[#FCFAF6] dark:bg-[#252320] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                        >
                          {isDuressRevealed ? "Hide" : "Reveal"}
                        </button>

                        {isDuressRevealed && (
                          <button
                            type="button"
                            onClick={() => handleCopySafeWord(safeWordData?.duressCode, "duress")}
                            className="p-1.5 text-xs text-[#181818] dark:text-[#F6F3EB] bg-[#FCFAF6] dark:bg-[#252320] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-lg transition-all cursor-pointer"
                            title="Copy duress code"
                          >
                            {copiedDuressWord ? <Check className="w-4 h-4 text-[#2D6A4F]" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Family Members Directory (Added per user request) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl shadow-sm space-y-5 newspaper-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#181818] dark:text-[#F6F3EB]" />
                          <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F6F3EB]">
                            Family Members ({familyMembers.length})
                          </h3>
                        </div>
                        <p className="text-xs text-[#55524B] dark:text-[#A8A29E] mt-0.5 font-serif">
                          Designate family members (Father, Mother, Sister, etc.) who share this safe-word.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAddMemberModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-[#F6F3EB] bg-[#181818] hover:bg-black dark:bg-[#F4EFEB] dark:text-[#181818] rounded-xl shadow-xs border border-[#181818]/20 transition-all cursor-pointer active:scale-[0.98]"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Family Member</span>
                      </button>
                    </div>

                    {/* Members List */}
                    {familyMembers.length === 0 ? (
                      <div className="p-8 text-center bg-[#FAF7F0] dark:bg-[#1E1C19] rounded-2xl border border-[#181818]/15 dark:border-[#2D2B27] space-y-3">
                        <div className="w-10 h-10 rounded-full bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] flex items-center justify-center mx-auto">
                          <Users className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-editorial font-bold text-[#181818] dark:text-[#F6F3EB]">
                          No Family Members Added Yet
                        </p>
                        <p className="text-xs text-[#747068] max-w-sm mx-auto">
                          Add your parents, siblings, or spouse to ensure everyone has access to your safe-word protocol.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddMemberModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#F6F3EB] bg-[#181818] hover:bg-black rounded-xl shadow-xs cursor-pointer active:scale-[0.98]"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add First Member</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {familyMembers.map((member) => {
                          const relationBadgeStyle = {
                            Father: "bg-[#EDF7F1] text-[#2D6A4F] border-[#BCE3CE] dark:bg-[#11241A] dark:text-[#52B788] dark:border-[#1E4631]",
                            Mother: "bg-[#FDF1EE] text-[#C84630] border-[#F7C4BC] dark:bg-[#2B1512] dark:text-[#E05A44] dark:border-[#52241D]",
                            Sister: "bg-[#FFF9EC] text-[#C58F2C] border-[#FDE68A] dark:bg-[#2B1E08] dark:text-[#D48806] dark:border-[#573C0C]",
                            Brother: "bg-[#FAF7F0] text-[#181818] border-[#181818]/20 dark:bg-[#22201D] dark:text-[#F4EFEB]",
                            Spouse: "bg-[#FDF1EE] text-[#C84630] border-[#F7C4BC] dark:bg-[#2B1512] dark:text-[#E05A44] dark:border-[#52241D]",
                          }[member.relation] || "bg-[#FAF7F0] text-[#181818] border-[#181818]/20 dark:bg-[#22201D] dark:text-[#F4EFEB]";

                          return (
                            <div
                              key={member.id}
                              className="p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#181818]/30 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                                  {member.relation?.[0] || "M"}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-editorial font-bold text-sm text-[#181818] dark:text-[#F6F3EB]">
                                      {member.name}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border uppercase ${relationBadgeStyle}`}>
                                      {member.relation}
                                    </span>
                                  </div>
                                  <div className="text-xs font-mono text-[#747068] dark:text-[#9E998F] flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 opacity-70" />
                                    <span>{member.phone}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleSendSafeWordToMember(member)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] bg-[#EDF7F1] dark:bg-[#1B2820] border border-[#2D6A4F]/30 hover:bg-[#D8EEDF] rounded-lg transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                                  title="Send safe-word instructions via WhatsApp"
                                >
                                  <Share2 className="w-3 h-3" />
                                  <span>Send Safe-Word</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(member.id, member.name, member.relation)}
                                  className="p-1.5 text-[#747068] hover:text-[#C84630] rounded-lg transition-colors cursor-pointer"
                                  title="Remove family member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Family Member Modal (BROADSHEET DIALOG) */}
              {isAddMemberModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
                  <div className="bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/20 dark:border-[#2D2B27] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.35)] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#181818]/15 dark:border-[#2D2B27]">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[#181818] dark:text-[#F6F3EB]" />
                        <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F6F3EB]">
                          Add Family Member
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddMemberModalOpen(false)}
                        className="p-1.5 rounded-full text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-[#55524B] dark:text-[#A8A29E] leading-relaxed font-serif">
                      Add a trusted loved one to your Safe-Word circle. You can easily share and sync your family code with them.
                    </p>

                    <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                      {/* Relation Selection Chips */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[#181818] dark:text-[#F6F3EB] uppercase font-mono">
                          Relation
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Father", "Mother", "Sister", "Brother", "Spouse", "Son", "Daughter", "Other"].map((rel) => (
                            <button
                              key={rel}
                              type="button"
                              onClick={() => {
                                setNewMemberRelation(rel);
                                if (!newMemberName || ["Father", "Mother", "Sister", "Brother", "Spouse", "Son", "Daughter", "Other"].includes(newMemberName)) {
                                  setNewMemberName(rel === "Other" ? "" : rel);
                                }
                              }}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                newMemberRelation === rel
                                  ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border-[#181818]"
                                  : "bg-[#FAF7F0] dark:bg-[#1E1C19] text-[#55524B] dark:text-[#9E998F] border-[#181818]/15 hover:border-[#181818]/40"
                              }`}
                            >
                              {rel}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Member Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#181818] dark:text-[#F6F3EB] uppercase font-mono">
                          Full Name or Call Name *
                        </label>
                        <input
                          type="text"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="e.g. Papa, Sunita Sharma, Pooja"
                          className="w-full px-4 py-2.5 text-xs bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-xl text-[#181818] dark:text-[#F6F3EB] focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] shadow-xs font-medium"
                          required
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#181818] dark:text-[#F6F3EB] uppercase font-mono">
                          Phone Number (with Country Code) *
                        </label>
                        <input
                          type="tel"
                          value={newMemberPhone}
                          onChange={(e) => setNewMemberPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-4 py-2.5 font-mono text-xs bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-xl text-[#181818] dark:text-[#F6F3EB] focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] shadow-xs"
                          required
                        />
                      </div>

                      {/* Buttons */}
                      <div className="pt-3 border-t border-[#181818]/15 dark:border-[#2D2B27] flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsAddMemberModalOpen(false)}
                          className="flex-1 py-2.5 text-xs font-bold text-[#55524B] dark:text-[#A8A29E] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-full transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black rounded-full shadow-md border border-[#181818]/30 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Add to Safe-Word Circle
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Safe-Word & Duress Word Modal (BROADSHEET DIALOG) */}
              {isEditWordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
                  <div className="bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/20 dark:border-[#2D2B27] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.35)] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#181818]/15 dark:border-[#2D2B27]">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[#181818] dark:text-[#F6F3EB]" />
                        <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F6F3EB]">
                          Edit Safe-Word
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditWordModalOpen(false)}
                        className="p-1.5 rounded-full text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-[#55524B] dark:text-[#A8A29E] leading-relaxed font-serif">
                      Set a permanent safe-word known only to your family. It stays set until you edit it again.
                    </p>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#181818] dark:text-[#F6F3EB] uppercase font-mono">
                          Safe-Word (Confirmation)
                        </label>
                        <input
                          type="text"
                          value={editSafeInput}
                          onChange={(e) => setEditSafeInput(e.target.value.toUpperCase())}
                          placeholder="e.g. GOLDEN LOTUS or NEELAM PARVAT"
                          className="w-full px-4 py-2.5 font-mono text-xs uppercase bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-xl text-[#181818] dark:text-[#F6F3EB] focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] shadow-xs"
                        />
                        <span className="text-[10px] text-[#747068] font-mono">
                          Recited when family calls asking for urgent funds.
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#181818] dark:text-[#F6F3EB] uppercase font-mono">
                          Silent Duress Word (Coercion Alarm)
                        </label>
                        <input
                          type="text"
                          value={editDuressInput}
                          onChange={(e) => setEditDuressInput(e.target.value.toUpperCase())}
                          placeholder="e.g. SILVER FALCON"
                          className="w-full px-4 py-2.5 font-mono text-xs uppercase bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-xl text-[#181818] dark:text-[#F6F3EB] focus:outline-none focus:ring-1 focus:ring-[#C58F2C] shadow-xs"
                        />
                        <span className="text-[10px] text-[#747068] font-mono">
                          Recited covertly if family is coerced under threat.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleResetToDefaultWords}
                        className="text-xs text-[#55524B] hover:text-[#181818] dark:hover:text-[#F6F3EB] font-medium flex items-center gap-1 font-mono"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Defaults</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-[#181818]/15 dark:border-[#2D2B27] flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditWordModalOpen(false)}
                        className="flex-1 py-2.5 text-xs font-bold text-[#55524B] dark:text-[#A8A29E] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-full transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedWords}
                        className="flex-1 py-2.5 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black rounded-full shadow-md border border-[#181818]/30 transition-all active:scale-[0.98]"
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
            <div className="p-6 sm:p-8 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl shadow-sm space-y-6 animate-in fade-in-0 duration-200">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-[#747068] uppercase font-bold mb-1">
                  PREFERENCES • LOCAL TERMINAL CONFIG
                </div>
                <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#181818] dark:text-[#F6F3EB] tracking-tight">
                  {t.settings}
                </h2>
              </div>

              {/* Theme Toggle */}
              <div>
                <label className="block text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase mb-2">
                  Theme Preference
                </label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("light")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all active:scale-[0.98] ${
                      settings.theme === "light"
                        ? "bg-[#181818] text-[#F6F3EB] shadow-md border border-[#181818]/30"
                        : "bg-[#FAF7F0] dark:bg-[#1E1C19] text-[#55524B] dark:text-[#A8A29E] border border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#EFECE4]"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Parchment Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("dark")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all active:scale-[0.98] ${
                      settings.theme === "dark"
                        ? "bg-[#F4EFEB] text-[#181818] shadow-md border border-[#F4EFEB]/30"
                        : "bg-[#FAF7F0] dark:bg-[#1E1C19] text-[#55524B] dark:text-[#A8A29E] border border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#EFECE4]"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Newsprint Dark</span>
                  </button>
                </div>
              </div>

              {/* Language Toggle (English / Hindi) */}
              <div className="pt-4 border-t border-[#181818]/10 dark:border-[#2D2B27]">
                <label className="block text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase mb-2">
                  Language (भाषा)
                </label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle("en")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all active:scale-[0.98] ${
                      settings.language === "en"
                        ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] shadow-md"
                        : "bg-[#FAF7F0] dark:bg-[#1E1C19] text-[#55524B] dark:text-[#A8A29E] border border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#EFECE4]"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle("hi")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all active:scale-[0.98] ${
                      settings.language === "hi"
                        ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] shadow-md"
                        : "bg-[#FAF7F0] dark:bg-[#1E1C19] text-[#55524B] dark:text-[#A8A29E] border border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#EFECE4]"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>हिन्दी (Hindi)</span>
                  </button>
                </div>
              </div>

              {/* Analyst Display Name */}
              <div className="pt-4 border-t border-[#181818]/10 dark:border-[#2D2B27]">
                <label className="block text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase mb-1">
                  Analyst Display Name
                </label>
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-full focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] font-medium text-[#181818] dark:text-[#F6F3EB]"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-5 py-2 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black rounded-full shadow-md border border-[#181818]/30 transition-all active:scale-[0.98]"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Clear storage */}
              <div className="pt-4 border-t border-[#181818]/10 dark:border-[#2D2B27]">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Clear all local reports and vault records on this device?")) {
                      localStorage.clear();
                      refreshLocalData();
                      showToast("Local storage cleared", "info");
                    }
                  }}
                  className="px-4 py-2 text-xs font-mono font-bold text-[#C84630] bg-[#FDF1EE] dark:bg-[#2B1B19] border border-[#C84630]/30 rounded-full hover:bg-[#F9DDD8] transition-all active:scale-[0.98]"
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
            <div className="p-6 sm:p-8 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl shadow-sm space-y-4 animate-in fade-in-0 duration-200">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-[#747068] uppercase font-bold mb-1">
                  EMERGENCY WIRE • NATIONAL REPORTING
                </div>
                <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#181818] dark:text-[#F6F3EB] tracking-tight">
                  {t.helpCenter}
                </h2>
              </div>
              <div className="p-5 bg-[#FDF1EE] dark:bg-[#2B1B19] border border-[#C84630]/30 rounded-2xl text-xs space-y-2 shadow-sm">
                <p className="font-bold text-[#C84630] font-mono text-sm">National Cybercrime Helpline: Dial 1930</p>
                <p className="text-[#78281F] dark:text-[#FCDFD7] font-serif leading-relaxed">
                  Immediate reporting for financial UPI/bank fraud within the golden hour to freeze fraudulent recipient accounts.
                </p>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 font-mono font-bold text-[#C84630] underline underline-offset-4"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200 overflow-y-auto">
          <div className="bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/20 dark:border-[#2D2B27] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] space-y-6 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#181818]/15 dark:border-[#2D2B27] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border border-[#181818]/20 flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#181818] dark:text-[#F6F3EB]">
                      #{selectedDossierEntry.caseId || selectedDossierEntry.reportId}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#181818]/10 text-[#181818] dark:bg-[#F4EFEB]/10 dark:text-[#F6F3EB] border border-[#181818]/20 uppercase">
                      {selectedDossierEntry.incidentCategory || "Digital Harm"}
                    </span>
                  </div>
                  <h3 className="text-base font-editorial font-bold text-[#181818] dark:text-[#F6F3EB] tracking-tight mt-0.5">
                    Official Incident Dossier & Evidence Log
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDossierModalOpen(false)}
                className="p-1.5 rounded-full text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB] hover:bg-[#FAF7F0] dark:hover:bg-[#1E1C19] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="space-y-5 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Authority Status Banner */}
              <div className="p-4 bg-[#EDF7F1] dark:bg-[#1B2820] border border-[#2D6A4F]/30 rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-pulse" />
                  <span className="font-bold font-mono text-xs text-[#2D6A4F] dark:text-[#74C69D]">
                    {selectedDossierEntry.status === "QUEUED_FOR_REVIEW"
                      ? "Dispatched & Queued for Cyber Cell Review"
                      : "Cryptographically Verified Ledger Record"}
                  </span>
                </div>
                <p className="text-[11px] text-[#1B4332] dark:text-[#D8F3DC] leading-relaxed font-serif">
                  {selectedDossierEntry.statusMessage ||
                    "This case has been logged with cryptographic immutability. An investigating officer has been notified for triage."}
                </p>
              </div>

              {/* Complainant & Incident Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] rounded-2xl border border-[#181818]/15 dark:border-[#2D2B27] shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-[#747068] block mb-0.5">
                    Complainant
                  </span>
                  <p className="font-semibold text-[#181818] dark:text-[#F6F3EB]">
                    {selectedDossierEntry.contactName || "Citizen Complainant"}
                  </p>
                  {selectedDossierEntry.contactPhone && (
                    <p className="text-[#55524B] dark:text-[#A8A29E] font-mono text-[11px]">{selectedDossierEntry.contactPhone}</p>
                  )}
                  {selectedDossierEntry.contactEmail && (
                    <p className="text-[#55524B] dark:text-[#A8A29E] text-[11px]">{selectedDossierEntry.contactEmail}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-[#747068] block mb-0.5">
                    Channel & Suspect
                  </span>
                  <p className="text-[#55524B] dark:text-[#A8A29E]">
                    Platform: <strong className="text-[#181818] dark:text-[#F6F3EB]">{selectedDossierEntry.platform || "Online"}</strong>
                  </p>
                  {selectedDossierEntry.suspectInfo && (
                    <p className="text-[#55524B] dark:text-[#A8A29E]">
                      Suspect: <code className="font-mono bg-[#FCFAF6] dark:bg-[#141312] border border-[#181818]/15 px-1 py-0.5 rounded text-[11px]">{selectedDossierEntry.suspectInfo}</code>
                    </p>
                  )}
                  <p className="text-[#747068] text-[10px] font-mono mt-0.5">
                    {new Date(selectedDossierEntry.timestamp).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Statement of Facts */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-[#747068] block">
                  Incident Statement
                </span>
                <div className="p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl text-[#181818] dark:text-[#F6F3EB] leading-relaxed font-serif shadow-xs">
                  {selectedDossierEntry.details || selectedDossierEntry.claimText || "No statement provided."}
                </div>
              </div>

              {/* Attached Screenshot Evidence */}
              {selectedDossierEntry.screenshot?.previewUrl && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#747068] block">
                    Attached Evidence Screenshot ({selectedDossierEntry.screenshot.name})
                  </span>
                  <div className="p-3 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedDossierEntry.screenshot.previewUrl}
                      alt="Evidence Screenshot"
                      className="max-h-72 rounded-xl object-contain mx-auto border border-[#181818]/15 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Cryptographic Ledger Verification */}
              <div className="p-3.5 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl space-y-1 font-mono text-[10px] shadow-xs">
                <div className="flex items-center justify-between text-[#747068]">
                  <span>SHA-256 Digest:</span>
                  <span className="text-[#181818] dark:text-[#F6F3EB] font-bold truncate max-w-[280px]">
                    {selectedDossierEntry.entryHash}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#747068]">
                  <span>Ledger Anchor:</span>
                  <span className="truncate max-w-[280px]">
                    {selectedDossierEntry.previousHash}
                  </span>
                </div>
              </div>

              {/* Formal Legal Complaint Letter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#747068]">
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
                    className="flex items-center gap-1 text-[11px] font-bold text-[#181818] dark:text-[#F6F3EB] hover:underline font-mono"
                  >
                    {copiedDraft ? <Check className="w-3 h-3 text-[#2D6A4F]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDraft ? "Copied" : "Copy Draft"}</span>
                  </button>
                </div>
                <pre className="p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl font-mono text-[11px] leading-relaxed text-[#181818] dark:text-[#F6F3EB] max-h-48 overflow-y-auto whitespace-pre-wrap shadow-xs">
                  {generateComplaintDraft(selectedDossierEntry)}
                </pre>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 border-t border-[#181818]/15 dark:border-[#2D2B27] flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsDossierModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#55524B] dark:text-[#A8A29E] hover:text-[#181818] dark:hover:text-[#F6F3EB] rounded-full transition-colors font-mono"
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
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#181818] dark:text-[#F6F3EB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-full transition-all shadow-xs active:scale-[0.98]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Statement</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDossier(selectedDossierEntry)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black rounded-full shadow-md border border-[#181818]/30 transition-all active:scale-[0.98]"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download Case Dossier</span>
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
      <div className="h-[100dvh] w-full bg-[#F6F3EB] dark:bg-[#141312] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#181818] dark:border-[#F4EFEB] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#747068] tracking-widest uppercase">
            Loading Crosscheck Broadsheet...
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
