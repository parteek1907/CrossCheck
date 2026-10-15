"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History as HistoryIcon,
  Archive,
  Radio,
  Globe2,
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
    sourceExplorer: "Source Explorer",
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
    sourceExplorer: "स्रोत एक्सप्लोरर",
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

function CrosscheckAppContent() {
  const router = useRouter();
  const { showToast } = useToast();

  // Navigation: 'dashboard' | 'history' | 'vault' | 'safecircle' | 'clustering' | 'settings' | 'help'
  const [activeNav, setActiveNav] = useState("dashboard");

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

  // Legacy safeCode & wordlist for tests / 60s demo mode
  const [wordlist, setWordlist] = useState([]);
  const [safeCode, setSafeCode] = useState({ code: "LOADING...", secondsRemaining: 60, progressPercent: 100 });

  // Source Explorer state
  const [domainQuery, setDomainQuery] = useState("reuters.com");
  const [domainProfile, setDomainProfile] = useState(null);

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

    fetchDomainProfile("reuters.com");

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
      clustering: "Source Explorer",
      settings: "Settings",
      help: "Help Center",
    };
    const title = navTitles[activeNav] || "Dashboard";
    document.title = `${title} | Crosscheck`;
  }, [activeNav]);

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
        setLiveTranscript("");
        setCallAnalysisResult(null);
        showToast("Microphone listening... Hold phone near speaker or speak caller words.", "info");
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const combined = (final || interim).trim();
        if (combined) {
          setLiveTranscript(combined);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error !== "no-speech") {
          showToast(`Microphone notice: ${event.error}`, "warning");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    if (autoAnalyze && liveTranscript.trim()) {
      handleAnalyzeCallerSpeech(liveTranscript.trim());
    }
  };

  const handleAnalyzeCallerSpeech = async (speechText) => {
    const textToAnalyze = (speechText || liveTranscript || manualInputText).trim();
    if (!textToAnalyze) {
      showToast("No spoken or written words detected to analyze.", "warning");
      return;
    }

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

  const fetchDomainProfile = async (domain) => {
    if (!domain) return;
    try {
      const res = await fetch(`/api/domain-profile/${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setDomainProfile(data);
      }
    } catch {
      setDomainProfile(null);
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
    <div className="h-[100dvh] w-screen overflow-hidden bg-[#F9FAFB] dark:bg-[#0B0C0E] text-gray-900 dark:text-gray-100 font-sans flex antialiased">
      {/* ========================================================
          MOBILE FLOATING HAMBURGER (MD:HIDDEN)
          ======================================================== */}
      <button
        type="button"
        onClick={() => setIsMobileDrawerOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden p-2.5 rounded-full bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] text-gray-700 dark:text-gray-200 shadow-md"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ========================================================
          MOBILE DRAWER BACKDROP
          ======================================================== */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ========================================================
          FIXED SIDEBAR (260PX WIDE, 100VH, FIXED LEFT)
          COLLAPSES BELOW 1100PX TO 80PX ICON RAIL
          ======================================================== */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 h-[100dvh] bg-white dark:bg-[#111215] border-r border-gray-200 dark:border-[#202228] flex flex-col justify-between transition-all duration-200 ease-in-out ${
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
              <div className="w-7 h-7 text-gray-900 dark:text-white flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
                </svg>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-gray-900 dark:text-white hidden min-[1100px]:inline">
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

          {/* Primary "+ New verification" button (THE ONLY GLOBAL NEW BUTTON) */}
          <button
            type="button"
            title={t.newVerification}
            onClick={() => {
              setModalPrefill(null);
              setIsModalOpen(true);
              setIsMobileDrawerOpen(false);
            }}
            className="w-full h-10 px-3.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden min-[1100px]:inline">{t.newVerification}</span>
          </button>

          {/* Search field (⌘K hint for search palette) */}
          <div
            onClick={() => setIsCommandPaletteOpen(true)}
            title={`${t.searchPlaceholder} (⌘K)`}
            className="h-10 px-3 rounded-lg border border-gray-200 dark:border-[#252830] bg-gray-50 dark:bg-[#16181E] hover:bg-gray-100 dark:hover:bg-[#1E2028] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="hidden min-[1100px]:inline truncate">{t.searchPlaceholder}</span>
            </div>
            <kbd className="hidden min-[1100px]:inline px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white dark:bg-white/10 rounded border border-gray-200 dark:border-gray-800">
              ⌘K
            </kbd>
          </div>

          {/* Middle Navigation (20px icons, 40px height, 8px radius, aria-current on active) */}
          <nav aria-label="Main Navigation" className="pt-2">
            <ul className="space-y-1">
              {[
                { id: "dashboard", label: t.dashboard, icon: LayoutDashboard },
                { id: "history", label: t.history, icon: HistoryIcon, badge: reports.length },
                { id: "vault", label: t.vault, icon: Archive, badge: vaultEntries.length },
                { id: "safecircle", label: t.safeCircle, icon: KeyRound },
                { id: "clustering", label: t.sourceExplorer, icon: Globe2 },
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
                      className={`w-full h-10 px-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-gray-900 ${
                        isActive
                          ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border-l-2 border-gray-900 dark:border-white pl-2.5"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="hidden min-[1100px]:inline">{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="hidden min-[1100px]:inline text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/15 text-gray-700 dark:text-gray-200">
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
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-[#202228] space-y-2">
          <button
            type="button"
            title={t.settings}
            onClick={() => {
              setActiveNav("settings");
              setIsMobileDrawerOpen(false);
            }}
            aria-current={activeNav === "settings" ? "page" : undefined}
            className={`w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-gray-900 ${
              activeNav === "settings"
                ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <SettingsIcon className="w-5 h-5 flex-shrink-0" />
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
            className={`w-full h-10 px-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-gray-900 ${
              activeNav === "help"
                ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              <span className="hidden min-[1100px]:inline">{t.helpCenter}</span>
            </div>
            <span className="hidden min-[1100px]:inline text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1.5 py-0.2 rounded-full">
              SOS
            </span>
          </button>

          {/* User Chip */}
          <div className="pt-2">
            <div
              title={`${userProfile.displayName || "Guest"} — Stored on this device`}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#16181E] border border-gray-200 dark:border-[#252830] flex items-center gap-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
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

              {/* QUICK-CHECK DROPZONE CARD (STEP 5) */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropzoneDrop}
                onClick={() => {
                  setModalPrefill(null);
                  setIsModalOpen(true);
                }}
                className="p-5 border-2 border-dashed border-gray-200 dark:border-[#2A2E38] hover:border-gray-900 dark:hover:border-white bg-white dark:bg-[#15171C] rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-4 group shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 dark:text-white">
                      {t.quickDropzone}
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {t.quickDropzoneHint}
                    </p>
                  </div>
                </div>
                <kbd className="hidden sm:inline px-2 py-1 text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 rounded-md border border-gray-200 dark:border-gray-800">
                  Press N
                </kbd>
              </div>

              {/* KPI ROW (4 EQUAL HEIGHT CARDS, DESKTOP 4, TABLET 2, MOBILE 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Proofs */}
                <div className="p-5 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs flex flex-col justify-between">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    {t.totalProofs}
                  </div>
                  <div className="my-2 text-3xl font-extrabold font-mono text-gray-900 dark:text-white">
                    {isLoading ? "—" : stats.totalProofs > 0 ? stats.totalProofs : "—"}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.totalProofsCaption}
                  </div>
                </div>

                {/* 2. Flagged Claims */}
                <div className="p-5 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs flex flex-col justify-between">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    {t.flaggedClaims}
                  </div>
                  <div className={`my-2 text-3xl font-extrabold font-mono ${stats.totalProofs > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : `${stats.disputedPercent}%`}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.flaggedClaimsCaption}
                  </div>
                </div>

                {/* 3. Average time to verdict */}
                <div className="p-5 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs flex flex-col justify-between">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    {t.avgDuration}
                  </div>
                  <div className={`my-2 text-3xl font-extrabold font-mono ${stats.totalProofs > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : stats.avgDurationFormatted}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.avgDurationCaption}
                  </div>
                </div>

                {/* 4. High-confidence results */}
                <div className="p-5 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs flex flex-col justify-between">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    {t.highConfidence}
                  </div>
                  <div className={`my-2 text-3xl font-extrabold font-mono ${stats.totalProofs > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                    {isLoading || stats.totalProofs === 0 ? "—" : stats.highConfidenceCount}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {t.highConfidenceCaption}
                  </div>
                </div>
              </div>

              {/* CHARTS ROW: 30-DAY ACTIVITY & VERDICT MIX */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 30-Day Activity Chart */}
                <div className="lg:col-span-2 p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        30-Day Verification Activity
                      </h3>
                      <p className="text-xs text-gray-400">
                        Daily verification volume computed from local audit records
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">Past 30 Days</span>
                  </div>

                  {stats.totalProofs === 0 ? (
                    <div className="h-44 flex items-center justify-center text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl my-2">
                      No activity yet. Run a check to see your trend.
                    </div>
                  ) : (
                    <>
                      <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                        {stats.chartDays.map((d, idx) => {
                          const maxCount = Math.max(1, ...stats.chartDays.map((c) => c.count));
                          const barHeight = d.count > 0 ? `${Math.max(15, Math.round((d.count / maxCount) * 100))}%` : "4px";
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center group relative h-full justify-end"
                            >
                              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                <div className="bg-slate-800 dark:bg-white text-white dark:text-gray-900 text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                  {d.label}: {d.count} checks
                                </div>
                              </div>
                              <div
                                style={{ height: barHeight }}
                                className={`w-full rounded-t transition-all ${
                                  d.count > 0
                                    ? "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700"
                                    : "bg-gray-100 dark:bg-white/10 hover:bg-gray-200"
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
                <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      Verdict Distribution
                    </h3>
                    <p className="text-xs text-gray-400 mb-6">
                      Breakdown across all evaluated claims
                    </p>

                    {stats.totalProofs === 0 ? (
                      <div className="h-32 flex items-center justify-center text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                        No verdicts recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-red-600" />
                              Likely Manipulated
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {stats.verdictMix.likelyManipulated}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-600 rounded-full"
                              style={{
                                width: stats.totalProofs > 0
                                  ? `${(stats.verdictMix.likelyManipulated / stats.totalProofs) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Inconclusive
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {stats.verdictMix.inconclusive}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{
                                width: stats.totalProofs > 0
                                  ? `${(stats.verdictMix.inconclusive / stats.totalProofs) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-600" />
                              No Signs Found
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {stats.verdictMix.noSignsFound}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
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

                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 font-mono flex items-center justify-between">
                    <span>Active Storage:</span>
                    <span className="text-gray-900 dark:text-white font-bold">Stored on this device</span>
                  </div>
                </div>
              </div>

              {/* RECENT VERIFICATIONS TABLE */}
              <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.recentVerifications}</h3>
                    <p className="text-xs text-gray-400">Live cryptographic proof records stored on this device</p>
                  </div>
                  {reports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveNav("history")}
                      className="text-xs text-gray-900 dark:text-white font-bold hover:underline flex items-center gap-1"
                    >
                      <span>View all</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {reports.length === 0 ? (
                  /* Calm empty state with "Run your first check" button */
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#111215]/50">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-800 dark:text-white mb-3">
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
                      className="mt-5 flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-full shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
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
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold">
                          <th className="py-3 px-3">Verdict</th>
                          <th className="py-3 px-3">Claim</th>
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Score</th>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Audit ID</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {reports.slice(0, 8).map((r) => {
                          const isManip = (r.verdict || "").toLowerCase().includes("manipulated");
                          const isNoSigns = (r.verdict || "").toLowerCase().includes("no signs");
                          return (
                            <tr
                              key={r.reportId}
                              onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                              className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isManip
                                      ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900"
                                      : isNoSigns
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                                      : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
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
                                    className="p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {activeMenuReportId === r.reportId && (
                                    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#1C1E24] border border-gray-200 dark:border-[#2B2E37] rounded-xl shadow-xl z-30 py-1 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5 font-semibold text-gray-900 dark:text-white flex items-center justify-between"
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
                                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5 font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between"
                                      >
                                        <span>Copy link</span>
                                        <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleBookmarkToggle(r.reportId, e)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5 font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between"
                                      >
                                        <span>{r.isSaved ? "Unsave" : "Save"}</span>
                                        <Bookmark className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteReport(r.reportId, e)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium flex items-center justify-between"
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
              HISTORY VIEW
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    historyFilterSaved
                      ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white"
                      : "bg-white dark:bg-[#15171C] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#252830] hover:bg-gray-50"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Cases Only</span>
                </button>
              </div>

              <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs">
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
                        className="p-4 bg-gray-50 dark:bg-[#1A1C22] hover:bg-gray-100/70 dark:hover:bg-[#20222A] border border-gray-200 dark:border-[#292C36] rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer"
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
                            className={`p-1.5 rounded-full border ${
                              r.isSaved ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-white dark:bg-[#1A1C22] text-gray-400 border-gray-200 dark:border-gray-800"
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                            className="px-3 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-blue-600 rounded-full border border-gray-300 dark:border-gray-700 transition-all"
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
              EVIDENCE VAULT VIEW
              ======================================================== */}
          {activeNav === "vault" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              {/* Top Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60 dark:border-gray-800/60">
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
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
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
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl shadow-2xs transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verify Chain</span>
                  </button>
                </div>
              </div>

              {/* Official Cyber Cell Emergency Hotline Banner */}
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex-shrink-0">
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

              {/* Confirmation Card (When Report is Queued & Dispatched) */}
              {submittedIncidentResult && (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-3xl shadow-xs space-y-4 animate-in fade-in-0 duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
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

                  <div className="p-4 bg-white/80 dark:bg-[#121316] rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-gray-600 dark:text-gray-400">
                        Case Reference Number:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 rounded-lg font-mono font-bold text-xs">
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
                          className="p-1 text-gray-500 hover:text-gray-900 rounded"
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
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-xs transition-all"
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
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 rounded-xl transition-all"
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

              {/* The Incident Report Filing Form */}
              {isFilingIncident && (
                <div className="p-6 sm:p-8 bg-white dark:bg-[#15171C] border border-gray-200/90 dark:border-[#252830] rounded-3xl shadow-xs space-y-6 animate-in fade-in-0 duration-200">
                  <div className="flex items-start justify-between border-b border-gray-100 dark:border-[#202228] pb-4">
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
                              className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                                isSelected
                                  ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-200 shadow-2xs"
                                  : "bg-gray-50/60 dark:bg-[#1A1C22] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-xs">{cat.label}</span>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
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
                          className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 rounded-2xl placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-[#111215] focus:border-gray-900 dark:focus:border-gray-400 transition-all resize-none"
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
                            className="w-full px-3.5 py-2.5 text-xs font-medium bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-900 text-gray-900 dark:text-white"
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
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-900 placeholder:text-gray-400"
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
                          className="p-5 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-900 dark:hover:border-gray-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all bg-gray-50/50 dark:bg-[#1A1C22]/50 hover:bg-gray-50"
                        >
                          <Upload className="w-5 h-5 text-gray-500 mb-2" />
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 text-center">
                            Click to upload screenshot of messages, payment receipts, or threatening posts
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 text-center">
                            Supports JPG, PNG, WEBP, or PDF up to 15MB
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {incidentScreenshot.previewUrl ? (
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 border border-gray-300 dark:border-gray-600">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={incidentScreenshot.previewUrl}
                                  alt="Screenshot preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 flex-shrink-0">
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
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-[#202228]">
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
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-900"
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
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-900 font-mono"
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
                            className="w-full px-3.5 py-2.5 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit and Action Buttons */}
                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-[#202228]">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Sealed with tamper-evident SHA-256 hash. Queued for official review.</span>
                      </p>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsFilingIncident(false)}
                          className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmittingIncident}
                          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-75 rounded-xl shadow-xs transition-all"
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
                  <div className="p-10 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-3xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-xs transition-all"
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
                        scam: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60",
                        bullying: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60",
                        harassment: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
                        impersonation: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60",
                        other: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                      }[e.incidentCategory || "other"] || "bg-gray-100 text-gray-700 border-gray-200";

                      return (
                        <div
                          key={idx}
                          className="p-5 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs hover:shadow-xs transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-gray-100 dark:border-[#202228]">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                                #{e.caseId || e.reportId}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border uppercase ${categoryBadgeColor}`}>
                                {e.incidentCategory || "Digital Harm"}
                              </span>
                              {isIncident ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-900">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  <span>Queued for Cyber Cell Review</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full">
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
                                className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 flex-shrink-0 cursor-pointer group relative"
                                title="Click to view attached evidence"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={e.screenshot.previewUrl}
                                  alt="Evidence thumbnail"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
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
                                  {e.suspectInfo && <span>Suspect: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{e.suspectInfo}</code></span>}
                                </div>
                              )}

                              <p className="font-mono text-[10px] text-gray-400 truncate pt-0.5">
                                SHA-256: {e.entryHash}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-[#202228] text-xs">
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
                                className="px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                              >
                                View Dossier
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadDossier(e)}
                                className="px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 hover:bg-blue-100/70 rounded-lg transition-all"
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
              THE FAMILY SAFE-WORD VIEW
              "Assume the fake is perfect."
              Out-of-band persistent authentication against AI voice cloning.
              ======================================================== */}
          {activeNav === "safecircle" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              {/* Header & Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60 dark:border-gray-800/60">
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
                      className="pl-8 pr-7 py-1.5 text-xs font-semibold bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] text-gray-800 dark:text-gray-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg shadow-2xs transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit Word</span>
                  </button>

                  {/* WhatsApp Share Button */}
                  <button
                    type="button"
                    onClick={handleShareToWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100/70 rounded-lg transition-all"
                    title="Share safe-word via WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share via WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Editorial Statement: The Hook & Counter-Intuitive Twist */}
              <div className="p-6 bg-white dark:bg-[#15171C] rounded-2xl border border-gray-200/80 dark:border-[#252830] shadow-xs space-y-3">
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
                  <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#202228]">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Family Safe-Word
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-md border border-blue-200/60 dark:border-blue-900/40">
                        {safeWordData?.isCustom ? "Custom Word" : "Standard Word"}
                      </span>
                    </div>

                    {/* Word Display Box */}
                    <div className="p-6 bg-gray-50/70 dark:bg-[#111215] border border-gray-200/70 dark:border-[#292C36] rounded-xl text-center space-y-3">
                      <span className="text-xs text-gray-500 block">
                        Ask caller for this word when contacted by family
                      </span>
                      <div className="text-3xl sm:text-4xl font-extrabold tracking-wide text-gray-900 dark:text-white py-1">
                        {safeWordData?.code || "GOLDEN LOTUS"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {safeWordData?.language?.label || "English"}
                      </div>

                      {/* Action Buttons: Pronounce, Copy, Edit */}
                      <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSpeakSafeWord(safeWordData?.code, safeWordLang)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1C22] border border-gray-200 dark:border-[#252830] hover:bg-gray-50 dark:hover:bg-white/10 rounded-lg transition-all active:scale-95 shadow-2xs"
                          title="Listen to pronunciation"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Pronounce</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopySafeWord(safeWordData?.code, "safe")}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1C22] border border-gray-200 dark:border-[#252830] hover:bg-gray-50 dark:hover:bg-white/10 rounded-lg transition-all active:scale-95 shadow-2xs"
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
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100/70 rounded-lg transition-all active:scale-95 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-500 text-center">
                      Stays set permanently for your family until you choose to edit it.
                    </div>
                  </div>

                  {/* Card 2: The Silent Duress Word */}
                  <div className="p-6 bg-white dark:bg-[#15171C] border border-amber-200/70 dark:border-amber-900/40 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-amber-100 dark:border-amber-900/30">
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
                    <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl flex items-center justify-between gap-3">
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
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1C22] border border-gray-200 dark:border-[#252830] hover:bg-gray-50 rounded-lg transition-all"
                        >
                          {isDuressRevealed ? "Hide" : "Reveal"}
                        </button>

                        {isDuressRevealed && (
                          <button
                            type="button"
                            onClick={() => handleCopySafeWord(safeWordData?.duressCode, "duress")}
                            className="p-1.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1C22] border border-gray-200 dark:border-[#252830] hover:bg-gray-50 rounded-lg transition-all"
                            title="Copy duress code"
                          >
                            {copiedDuressWord ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Indian Family Protection Playbook */}
                  <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-xs space-y-3">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Family Protocol</span>
                    </h4>
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="p-2.5 bg-gray-50/70 dark:bg-[#111215] rounded-lg border border-gray-100 dark:border-gray-800 flex gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white font-mono">1.</span>
                        <span><strong>The Shared Rule:</strong> Agree that no urgent money will ever be sent from an unknown caller without reciting the safe-word.</span>
                      </div>
                      <div className="p-2.5 bg-gray-50/70 dark:bg-[#111215] rounded-lg border border-gray-100 dark:border-gray-800 flex gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white font-mono">2.</span>
                        <span><strong>The Question:</strong> When a crying voice says <em>"Papa, accident ho gaya hai, turant paise bhejo"</em>, calmly ask: <strong>"Beta, safe-word kya hai?"</strong></span>
                      </div>
                      <div className="p-2.5 bg-gray-50/70 dark:bg-[#111215] rounded-lg border border-gray-100 dark:border-gray-800 flex gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white font-mono">3.</span>
                        <span><strong>Zero AI Trust:</strong> Voice and face can be synthesized by deepfakes in seconds, but an offline secret cannot be guessed.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Microphone Listening & Live Phone Call Verifier */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-xs space-y-5">
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
                          className="w-full p-6 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer active:scale-98"
                        >
                          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
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
                        <div className="w-full p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border-2 border-red-500/80 shadow-md flex flex-col items-center justify-center gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center relative z-10 shadow-lg">
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
                            className="mt-2 px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-full shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                          >
                            <MicOff className="w-3.5 h-3.5" />
                            <span>Stop & Analyze Call</span>
                          </button>
                        </div>
                      )}

                      {isAnalyzingCall && (
                        <div className="w-full p-7 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 shadow-sm flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                          <div className="text-center space-y-1">
                            <div className="text-sm font-bold text-blue-900 dark:text-blue-200">
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
                        <div className="p-3.5 bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#292C36] rounded-xl space-y-1.5 animate-in fade-in-0">
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
                            setLiveTranscript(text);
                            handleAnalyzeCallerSpeech(text);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Simulate: Safe-word Match</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const text = "Papa! I had a terrible accident, police are arresting me, please urgently send ₹50,000 on this UPI right now!";
                            setLiveTranscript(text);
                            handleAnalyzeCallerSpeech(text);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100/80 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 transition-colors flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Simulate: Voice-Clone Scam</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const text = `I am in urgent trouble, transfer the funds immediately, code is ${safeWordData?.duressCode || "SILVER FALCON"}.`;
                            setLiveTranscript(text);
                            handleAnalyzeCallerSpeech(text);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors flex items-center gap-1.5"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Simulate: Duress Coercion</span>
                        </button>
                      </div>
                    </div>

                    {/* Manual Input Toggle for Noisy Environments or Accessibility */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
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
                            className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#292C36] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleAnalyzeCallerSpeech(manualInputText)}
                            className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
                          >
                            Authenticate Typed Speech
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Forensic Call Analysis Verdict Card */}
                    {callAnalysisResult && (
                      <div
                        className={`p-5 rounded-2xl border transition-all animate-in fade-in-0 duration-200 space-y-3.5 ${
                          callAnalysisResult.verdict === "VERIFIED_FAMILY"
                            ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
                            : callAnalysisResult.verdict === "DURESS_ALERT"
                            ? "bg-red-50 dark:bg-red-950/50 border-red-400 dark:border-red-700 text-red-950 dark:text-red-100"
                            : "bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-950 dark:text-red-100"
                        }`}
                      >
                        {/* Verdict Header Badge */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {callAnalysisResult.verdict === "VERIFIED_FAMILY" ? (
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            ) : callAnalysisResult.verdict === "DURESS_ALERT" ? (
                              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="text-xs uppercase font-mono font-bold tracking-wider opacity-75">
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

                          <div className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white/70 dark:bg-black/30 border border-current/20">
                            {callAnalysisResult.confidence}% {callAnalysisResult.verdict === "VERIFIED_FAMILY" ? "Confidence" : "Scam Risk"}
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="text-xs leading-relaxed opacity-95">
                          {callAnalysisResult.summary}
                        </p>

                        {/* Red Flags / Threat Signals */}
                        {callAnalysisResult.threatSignals?.length > 0 && (
                          <div className="p-3 bg-white/70 dark:bg-black/30 rounded-xl space-y-1.5 text-xs">
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
                          <div className="pt-2 border-t border-red-200/80 dark:border-red-900/60 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] text-red-800 dark:text-red-300">
                              Helpline: <strong>1930</strong> (National Cybercrime Reporting)
                            </span>
                            <button
                              type="button"
                              onClick={handleAddCallToEvidenceVault}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
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

              {/* Edit Safe-Word & Duress Word Modal */}
              {isEditWordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200">
                  <div className="bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#202228]">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          Edit Family Safe-Word
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditWordModalOpen(false)}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Set a permanent safe-word known only to your family. It stays set until you edit it again.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase font-mono">
                          Family Safe-Word (Confirmation)
                        </label>
                        <input
                          type="text"
                          value={editSafeInput}
                          onChange={(e) => setEditSafeInput(e.target.value.toUpperCase())}
                          placeholder="e.g. GOLDEN LOTUS or NEELAM PARVAT"
                          className="w-full px-4 py-2.5 font-mono text-xs uppercase bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#292C36] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                          className="w-full px-4 py-2.5 font-mono text-xs uppercase bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#292C36] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
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

                    <div className="pt-3 border-t border-gray-100 dark:border-[#202228] flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditWordModalOpen(false)}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1A1C22] hover:bg-gray-200 rounded-full transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedWords}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all"
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
              SOURCE EXPLORER VIEW
              ======================================================== */}
          {activeNav === "clustering" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Source Explorer</h2>
                <p className="text-xs text-gray-400">Domain authority & syndication network inspection</p>
              </div>

              <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domainQuery}
                    onChange={(e) => setDomainQuery(e.target.value)}
                    placeholder="Enter domain (e.g. reuters.com, bbc.com, pib.gov.in)..."
                    className="flex-1 px-4 py-2 text-xs bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#292C36] rounded-full focus:outline-none focus:border-gray-900 dark:focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={() => fetchDomainProfile(domainQuery)}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-full transition-all"
                  >
                    Lookup
                  </button>
                </div>

                {domainProfile && (
                  <div className="p-4 bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#292C36] rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-900 dark:text-white font-mono">{domainProfile.domain}</span>
                      <span className="text-emerald-700 dark:text-emerald-400">Reliability: {domainProfile.reliability}/1.0</span>
                    </div>
                    <div className="text-gray-500">
                      Org: {domainProfile.name} • Leaning: {domainProfile.leaning} • Country: {domainProfile.country}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              SETTINGS VIEW (LIGHT/DARK + ENGLISH/HINDI TOGGLE)
              ======================================================== */}
          {activeNav === "settings" && (
            <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs space-y-6 animate-in fade-in-0 duration-200">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t.settings}</h2>

              {/* Theme Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Theme Preference</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("light")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full border transition-all ${
                      settings.theme === "light"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-[#111215] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("dark")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full border transition-all ${
                      settings.theme === "dark"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-[#111215] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>

              {/* Language Toggle (English / Hindi) */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Language (भाषा)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle("en")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full border transition-all ${
                      settings.language === "en"
                        ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white shadow-sm"
                        : "bg-white dark:bg-[#111215] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle("hi")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full border transition-all ${
                      settings.language === "hi"
                        ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white shadow-sm"
                        : "bg-white dark:bg-[#111215] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>हिन्दी (Hindi)</span>
                  </button>
                </div>
              </div>

              {/* Analyst Display Name */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Analyst Display Name</label>
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#252830] rounded-full focus:outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-full transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Clear storage */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Clear all local reports and vault records on this device?")) {
                      localStorage.clear();
                      refreshLocalData();
                      showToast("Local storage cleared", "info");
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100"
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
            <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs space-y-4 animate-in fade-in-0 duration-200">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t.helpCenter}</h2>
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs space-y-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#202228] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                      #{selectedDossierEntry.caseId || selectedDossierEntry.reportId}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900 uppercase">
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
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="space-y-5 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Authority Status Banner */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-[#121316] rounded-2xl border border-gray-100 dark:border-gray-800">
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
                      Suspect: <code className="font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded text-[11px]">{selectedDossierEntry.suspectInfo}</code>
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
                <div className="p-4 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-800 dark:text-gray-200 leading-relaxed font-sans">
                  {selectedDossierEntry.details || selectedDossierEntry.claimText || "No statement provided."}
                </div>
              </div>

              {/* Attached Screenshot Evidence */}
              {selectedDossierEntry.screenshot?.previewUrl && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block">
                    Attached Evidence Screenshot ({selectedDossierEntry.screenshot.name})
                  </span>
                  <div className="p-3 bg-gray-50 dark:bg-[#121316] border border-gray-200 dark:border-gray-800 rounded-2xl">
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
              <div className="p-3.5 bg-gray-50 dark:bg-[#121316] border border-gray-200 dark:border-gray-800 rounded-2xl space-y-1 font-mono text-[10px]">
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
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    {copiedDraft ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDraft ? "Copied" : "Copy Draft"}</span>
                  </button>
                </div>
                <pre className="p-4 bg-gray-50 dark:bg-[#121316] border border-gray-200 dark:border-gray-800 rounded-2xl font-mono text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {generateComplaintDraft(selectedDossierEntry)}
                </pre>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 border-t border-gray-100 dark:border-[#202228] flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsDossierModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 rounded-xl"
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
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1C22] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 rounded-xl transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Statement</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDossier(selectedDossierEntry)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
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
  return (
    <ToastProvider>
      <CrosscheckAppContent />
    </ToastProvider>
  );
}
