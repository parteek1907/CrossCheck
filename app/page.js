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
} from "../lib/storage.js";
import { getVaultEntries, verifyVaultIntegrity } from "../lib/vault.js";
import { generateSafeCircleCode, verifySafeCircleSpokenCode } from "../lib/safecircle.js";
import { VerificationModal } from "../components/VerificationModal";
import { CommandPalette } from "../components/CommandPalette";
import { ToastProvider, useToast } from "../components/Toast";

// Bilingual labels (English / Hindi)
const I18N = {
  en: {
    dashboard: "Dashboard",
    history: "History",
    vault: "Evidence Vault",
    safeCircle: "Safe Circle",
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
    safeCircle: "सुरक्षा घेरा",
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

  // Safe circle state
  const [wordlist, setWordlist] = useState([]);
  const [safeCode, setSafeCode] = useState({ code: "LOADING...", secondsRemaining: 60, progressPercent: 100 });
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const familySecret = "CROSSCHECK-CIRCLE-FAMILY-2026";

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

    fetchDomainProfile("reuters.com");

    return () => {
      window.removeEventListener("crosscheck_reports_updated", refreshLocalData);
      window.removeEventListener("crosscheck_profile_updated", refreshLocalData);
      window.removeEventListener("crosscheck_settings_updated", refreshLocalData);
    };
  }, [refreshLocalData]);

  // Set document title per active page
  useEffect(() => {
    const navTitles = {
      dashboard: "Dashboard",
      history: "History",
      vault: "Evidence Vault",
      safecircle: "Safe Circle",
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

  // Safe Circle countdown
  useEffect(() => {
    if (wordlist.length === 0) return;
    const interval = setInterval(async () => {
      try {
        const res = await generateSafeCircleCode(wordlist, familySecret);
        setSafeCode(res);
      } catch (e) {
        console.warn(e);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [wordlist, familySecret]);

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
            className="w-full h-10 px-3.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-gray-900"
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
                { id: "safecircle", label: t.safeCircle, icon: Radio },
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
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                                <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                  {d.label}: {d.count} checks
                                </div>
                              </div>
                              <div
                                style={{ height: barHeight }}
                                className={`w-full rounded-t transition-all ${
                                  d.count > 0
                                    ? "bg-gray-900 dark:bg-white hover:bg-black"
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
                      className="mt-5 flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-full shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-gray-900"
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
                      ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
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
                              r.isSaved ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-white dark:bg-black text-gray-400 border-gray-200 dark:border-gray-800"
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                            className="px-3 py-1 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 rounded-full border border-gray-300 dark:border-gray-700 transition-all"
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Evidence Vault</h2>
                  <p className="text-xs text-gray-400">Cryptographically chained ledger (SHA-256)</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await verifyVaultIntegrity();
                    if (res.isValid) {
                      showToast(`Hash chain verified! All ${res.totalEntries} blocks intact.`, "success");
                    } else {
                      showToast(`Ledger alert: ${res.errorReason}`, "error");
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-full hover:bg-emerald-100 transition-colors"
                >
                  Verify Hash Chain
                </button>
              </div>

              <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs">
                {vaultEntries.length === 0 ? (
                  <p className="text-xs text-gray-400 py-12 text-center">
                    No items in Evidence Vault yet. Open any report and click "Add to Vault".
                  </p>
                ) : (
                  <div className="space-y-3">
                    {vaultEntries.map((e, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-[#1A1C22] border border-gray-200 dark:border-[#292C36] rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-900 dark:text-white">Block #{e.index}</span>
                          <span className="font-mono text-gray-400 text-[10px]">{e.reportId}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{e.claimText}</p>
                        <p className="font-mono text-[10px] text-gray-400 truncate">Hash: {e.entryHash}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              SAFE CIRCLE VIEW
              ======================================================== */}
          {activeNav === "safecircle" && (
            <div className="space-y-6 animate-in fade-in-0 duration-200">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Safe Circle</h2>
                <p className="text-xs text-gray-400">Rotating verbal authentication against AI voice cloning scams</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs text-center space-y-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Verbal Code</div>
                  <div className="text-3xl font-mono font-extrabold tracking-widest text-gray-900 dark:text-white py-4 bg-gray-50 dark:bg-[#111215] rounded-xl border border-gray-200 dark:border-[#292C36]">
                    {safeCode.code}
                  </div>
                  <div className="text-xs font-mono text-gray-400 flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rotates in {safeCode.secondsRemaining}s</span>
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-2xs space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Test Code Authenticity</h3>
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Enter spoken word heard on call..."
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 dark:bg-[#111215] border border-gray-200 dark:border-[#292C36] rounded-full focus:outline-none focus:border-gray-900 dark:focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await verifySafeCircleSpokenCode(verifyInput, wordlist, familySecret);
                      setVerifyResult(res);
                      if (res.isValid) {
                        showToast("Authentication code valid!", "success");
                      } else {
                        showToast("Invalid authentication code", "error");
                      }
                    }}
                    className="w-full py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-full transition-all"
                  >
                    Authenticate
                  </button>
                  {verifyResult && (
                    <p className={`text-xs font-bold text-center ${verifyResult.isValid ? "text-emerald-600" : "text-red-600"}`}>
                      {verifyResult.isValid ? "✅ Code Authentic!" : "❌ Invalid Code"}
                    </p>
                  )}
                </div>
              </div>
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
                    className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 rounded-full"
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
                        ? "bg-gray-900 text-white border-gray-900 shadow-sm"
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
                        ? "bg-white text-gray-900 border-white shadow-sm"
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
                        ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 shadow-sm"
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
                        ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 shadow-sm"
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
                    className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full"
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
