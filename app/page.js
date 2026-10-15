"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Image as ImageIcon,
  Edit3,
  Settings,
  HelpCircle,
  Search,
  Plus,
  Bookmark,
  Share2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Globe2,
  RefreshCw,
  MoreHorizontal,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
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
} from "../lib/storage.js";
import { getVaultEntries, verifyVaultIntegrity } from "../lib/vault.js";
import { generateSafeCircleCode, verifySafeCircleSpokenCode, getSafeCircleSecret } from "../lib/safecircle.js";
import { VerificationModal } from "../components/VerificationModal";

export default function HeadwayProofDeskApp() {
  const router = useRouter();

  // Navigation: 'dashboard' | 'history' | 'vault' | 'safecircle' | 'clustering' | 'settings' | 'help'
  const [activeNav, setActiveNav] = useState("dashboard");

  // Top header tabs: 'stories' | 'trending' | 'topics'
  const [activeTab, setActiveTab] = useState("stories");

  // Client-side storage state
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [userProfile, setUserProfile] = useState({ displayName: "Guest", role: "Forensic Analyst" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("Guest");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilterSaved, setHistoryFilterSaved] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("All");

  // Verification Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Evidence Vault state
  const [vaultEntries, setVaultEntries] = useState([]);

  // Safe Circle state
  const [wordlist, setWordlist] = useState([]);
  const [safeCode, setSafeCode] = useState({ code: "LOADING...", secondsRemaining: 60, progressPercent: 100 });
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [familySecret, setFamilySecret] = useState("CROSSCHECK-CIRCLE-FAMILY-2026");

  // Domain search state for Source Explorer
  const [domainQuery, setDomainQuery] = useState("reuters.com");
  const [domainProfile, setDomainProfile] = useState(null);

  const refreshLocalData = () => {
    const stored = getStoredReports();
    setReports(stored);
    setStats(computeDashboardStats(stored));
    setVaultEntries(getVaultEntries());
    const prof = getUserProfile();
    setUserProfile(prof);
    setTempName(prof.displayName || "Guest");
  };

  useEffect(() => {
    refreshLocalData();

    fetch("/data/wordlist.json")
      .then((r) => r.json())
      .then((words) => setWordlist(words))
      .catch(() => setWordlist([]));

    window.addEventListener("crosscheck_reports_updated", refreshLocalData);
    window.addEventListener("crosscheck_profile_updated", refreshLocalData);

    fetchDomainProfile("reuters.com");

    return () => {
      window.removeEventListener("crosscheck_reports_updated", refreshLocalData);
      window.removeEventListener("crosscheck_profile_updated", refreshLocalData);
    };
  }, []);

  // Cmd/Ctrl + K opens modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Safe Circle 1-second countdown
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
  };

  const handleVerificationComplete = (report) => {
    saveStoredReport(report);
    refreshLocalData();
    router.push(`/report/${encodeURIComponent(report.reportId)}`);
  };

  const filteredReports = reports.filter((r) => {
    if (historyFilterSaved && !r.isSaved) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.claimText && r.claimText.toLowerCase().includes(q)) ||
      (r.reportId && r.reportId.toLowerCase().includes(q)) ||
      (r.verdict && r.verdict.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans flex flex-col">
      {/* ========================================================
          TOP BROWSER BAR / HEADER (EXACT HEADWAY MATCH)
          ======================================================== */}
      <header className="h-16 px-6 lg:px-8 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-30">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 w-56 flex-shrink-0">
          {/* Geometric Asterisk Logo like Headway */}
          <div className="w-6 h-6 text-gray-900 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
            </svg>
          </div>
          <span className="font-extrabold text-lg text-gray-900 tracking-tight">
            Crosscheck
          </span>
        </div>

        {/* Center Horizontal Tabs */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          <button
            type="button"
            onClick={() => {
              setActiveTab("stories");
              setActiveNav("dashboard");
            }}
            className={`h-full flex items-center text-sm font-semibold transition-all border-b-2 pt-1 ${
              activeTab === "stories" && activeNav === "dashboard"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Stories for You
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("trending");
              setActiveNav("dashboard");
            }}
            className={`h-full flex items-center text-sm font-semibold transition-all border-b-2 pt-1 ${
              activeTab === "trending"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Trending
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("topics");
              setActiveNav("dashboard");
            }}
            className={`h-full flex items-center text-sm font-semibold transition-all border-b-2 pt-1 ${
              activeTab === "topics"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Your Topics
          </button>
        </nav>

        {/* Right Search & Action Pill */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block w-56 lg:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news.."
              className="w-full pl-9 pr-4 py-2 text-xs text-gray-900 bg-gray-100 hover:bg-gray-100/80 border border-transparent focus:border-gray-300 focus:bg-white rounded-full placeholder:text-gray-400 focus:outline-none transition-all"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* "+ New verification" button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Verify</span>
            <kbd className="hidden lg:inline ml-1 px-1 py-0.2 text-[9px] font-mono bg-white/20 rounded">⌘K</kbd>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {userProfile.displayName ? userProfile.displayName.slice(0, 1).toUpperCase() : "G"}
            </div>
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
                  className="w-20 px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-[10px] text-blue-600 font-bold">
                  Save
                </button>
              </div>
            ) : (
              <span
                onClick={() => setIsEditingName(true)}
                className="text-xs font-semibold text-gray-700 hover:text-black cursor-pointer hidden xl:inline"
                title="Click to edit name"
              >
                {userProfile.displayName || "Guest"}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================
          3-COLUMN EDITORIAL CONTAINER
          ======================================================== */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* ========================================================
            COLUMN 1: SIDEBAR (EXACT MATCH TO HEADWAY)
            ======================================================== */}
        <aside className="w-56 p-6 border-r border-gray-200 bg-white flex flex-col justify-between flex-shrink-0 hidden md:flex">
          <div>
            {/* Primary Nav Menu */}
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("dashboard")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-bold transition-all ${
                    activeNav === "dashboard"
                      ? "bg-gray-100 text-gray-900 shadow-2xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-900" />
                  <span>Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("history")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeNav === "history"
                      ? "bg-gray-100 text-gray-900 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span>Articles</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("vault")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeNav === "vault"
                      ? "bg-gray-100 text-gray-900 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>Journalists</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("safecircle")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeNav === "safecircle"
                      ? "bg-gray-100 text-gray-900 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  <span>Media</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("clustering")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeNav === "clustering"
                      ? "bg-gray-100 text-gray-900 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Edit3 className="w-4 h-4 text-gray-500" />
                  <span>Editorial Notes</span>
                </button>
              </li>
            </ul>

            {/* Divider */}
            <hr className="my-6 border-gray-200" />

            {/* Topics / Category Filter */}
            <div className="space-y-3 px-2">
              {["National", "Politics", "Business", "Technology", "Sports", "Lifestyle", "Travel"].map(
                (topic) => (
                  <div
                    key={topic}
                    onClick={() => {
                      setSelectedTopic(topic === selectedTopic ? "All" : topic);
                      setActiveNav("dashboard");
                    }}
                    className={`text-xs font-medium cursor-pointer transition-colors ${
                      selectedTopic === topic
                        ? "text-gray-900 font-bold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {topic}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Bottom Settings & Support */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <button
              type="button"
              onClick={() => setActiveNav("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeNav === "settings" ? "text-gray-900 font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Settings className="w-4 h-4 text-gray-500" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveNav("help")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeNav === "help" ? "text-gray-900 font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-gray-500" />
              <span>Support (1930)</span>
            </button>
          </div>
        </aside>

        {/* ========================================================
            COLUMN 2: CENTER EDITORIAL FEED
            ======================================================== */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-8">
          {/* ========================================================
              DASHBOARD VIEW (HEADWAY EDITORIAL CARDS + REAL STATS)
              ======================================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-8">
              {/* HERO FEATURED CARD (MATCHING HEADWAY) */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="relative rounded-3xl overflow-hidden shadow-sm group cursor-pointer border border-gray-200/80 bg-gray-900"
                style={{ height: "360px" }}
              >
                {/* Background Image with Dark Scrim */}
                <img
                  src="https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&auto=format&fit=crop&q=80"
                  alt="Presidential Debate"
                  className="w-full h-full object-cover opacity-60 group-hover:scale-102 group-hover:opacity-70 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white space-y-2.5">
                  <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-white leading-snug">
                    Presidential Candidates Clash in First Debate
                  </h2>

                  {/* Author / Source Meta Pill */}
                  <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                      alt="Rina Wulandari"
                      className="w-5 h-5 rounded-full object-cover border border-white/40"
                    />
                    <span className="text-white font-semibold">Rina Wulandari</span>
                    <span>•</span>
                    <span className="text-gray-300">Politics</span>
                  </div>

                  <p className="text-xs text-gray-300 line-clamp-2 max-w-2xl leading-relaxed">
                    National fact-checking desks cross-examined live assertions, economic statistics, and campaign policy claims against statutory ministry archives.
                  </p>

                  <div className="pt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-900 shadow-sm hover:bg-gray-100 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Verification Check</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-COLUMN EDITORIAL BENTO CARDS (ROW 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Card 1: Tech */}
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-40 rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80"
                        alt="iPhone leak"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                      New iPhone 17 Leaks Reveal Foldable Design
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500 font-medium">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                      alt="Ratna Sastro"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-gray-900 font-semibold">Ratna Sastro</span>
                    <span>•</span>
                    <span>Technology</span>
                  </div>
                </div>

                {/* Card 2: Summit */}
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-40 rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80"
                        alt="Climate Summit"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                      Indonesia to Host ASEAN Climate Summit 2025
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500 font-medium">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                      alt="Ahmad Maulana"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-gray-900 font-semibold">Ahmad Maulana</span>
                    <span>•</span>
                    <span>Politics</span>
                  </div>
                </div>

                {/* Card 3: Food Inflation */}
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-40 rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&auto=format&fit=crop&q=80"
                        alt="Food Prices"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                      Rising Food Prices Push Inflation to 5.2% in Q2
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500 font-medium">
                    <img
                      src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80"
                      alt="Edy Rahman"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-gray-900 font-semibold">Edy Rahman</span>
                    <span>•</span>
                    <span>Economy</span>
                  </div>
                </div>
              </div>

              {/* 3-COLUMN EDITORIAL BENTO CARDS (ROW 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Card 4: Travel */}
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-40 rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80"
                        alt="East Java"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                      5 New Destinations You Can Explore in East Java
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500 font-medium">
                    <img
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                      alt="Ilham Akbar"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-gray-900 font-semibold">Ilham Akbar</span>
                    <span>•</span>
                    <span>Travel</span>
                  </div>
                </div>

                {/* Card 5: Lifestyle Charity */}
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-40 rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?w=600&auto=format&fit=crop&q=80"
                        alt="Charity"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                      TikTok Influencer Raises IDR 2 Billion for Charity
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500 font-medium">
                    <img
                      src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80"
                      alt="Joseph Ilham"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-gray-900 font-semibold">Joseph Ilham</span>
                    <span>•</span>
                    <span>Lifestyle</span>
                  </div>
                </div>

                {/* Card 6: Cannes Film */}
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-40 rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80"
                        alt="Film festival"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                      Indonesian Film Wins Best Short at Cannes Festival
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500 font-medium">
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80"
                      alt="Mila Asti"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-gray-900 font-semibold">Mila Asti</span>
                    <span>•</span>
                    <span>Entertainment</span>
                  </div>
                </div>
              </div>

              {/* REAL-TIME VERIFICATION KPI & 30-DAY METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-500 font-semibold">Total Proofs</div>
                  <div className="mt-1 text-2xl font-bold font-mono text-gray-900">{stats.totalProofs}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {stats.totalProofs === 0 ? "Empty on-device ledger" : "Cryptographically logged"}
                  </div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-500 font-semibold">Disputed %</div>
                  <div className="mt-1 text-2xl font-bold font-mono text-red-600">{stats.disputedPercent}%</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{stats.verdictMix.likelyManipulated} flagged hoaxes</div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-500 font-semibold">Avg Latency</div>
                  <div className="mt-1 text-2xl font-bold font-mono text-blue-600">{stats.avgDurationFormatted}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Wire clustering speed</div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-500 font-semibold">High Confidence</div>
                  <div className="mt-1 text-2xl font-bold font-mono text-emerald-600">{stats.highConfidenceCount}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Bounded variance checks</div>
                </div>
              </div>

              {/* RECENT VERIFICATIONS TABLE (EMPTY OR POPULATED) */}
              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Recent Verifications</h3>
                    <p className="text-xs text-gray-500">Live cryptographic proof records stored on this device</p>
                  </div>
                  {reports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveNav("history")}
                      className="text-xs text-gray-900 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>View history</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {reports.length === 0 ? (
                  <div className="py-12 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-800 mb-3">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">No verifications on this device yet</h4>
                    <p className="mt-1 text-xs text-gray-500 max-w-sm">
                      Submit any viral headline, WhatsApp message, or photo to run multi-source news wire verification.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="mt-4 flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Run your first check</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Claim</th>
                          <th className="py-3 px-3">Verdict</th>
                          <th className="py-3 px-3">Score</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reports.slice(0, 5).map((r) => {
                          const isManip = (r.verdict || "").toLowerCase().includes("manipulated");
                          const isNoSigns = (r.verdict || "").toLowerCase().includes("no signs");
                          return (
                            <tr key={r.reportId} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Today"}
                              </td>
                              <td className="py-3 px-3 font-semibold text-gray-900 max-w-xs truncate">
                                {r.claimText || r.inputText}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isManip
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : isNoSigns
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {r.verdict || "Inconclusive"}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-gray-900">
                                {r.score ?? 50}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                                  className="px-3 py-1 text-xs font-bold text-gray-900 hover:text-white hover:bg-gray-900 rounded-full border border-gray-300 transition-all"
                                >
                                  Inspect
                                </button>
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Articles & History</h2>
                  <p className="text-xs text-gray-500">All local verification records</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryFilterSaved(!historyFilterSaved)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    historyFilterSaved
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Only</span>
                </button>
              </div>

              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                {filteredReports.length === 0 ? (
                  <p className="text-xs text-gray-500 py-12 text-center">No reports match your filter.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((r) => (
                      <div
                        key={r.reportId}
                        className="p-4 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-2xl flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <p className="text-xs font-bold text-gray-900 truncate">{r.claimText || r.inputText}</p>
                          <p className="text-[11px] text-gray-500">
                            {r.reportId} • Score: {r.score} • {r.verdict}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              toggleSaveReport(r.reportId);
                              refreshLocalData();
                            }}
                            className={`p-1.5 rounded-full border ${
                              r.isSaved ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-white text-gray-400 border-gray-200"
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                            className="px-3 py-1 text-xs font-bold text-gray-900 hover:bg-gray-900 hover:text-white rounded-full border border-gray-300 transition-all"
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Journalists & Evidence Vault</h2>
                  <p className="text-xs text-gray-500">Cryptographically chained blocks (SHA-256)</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await verifyVaultIntegrity();
                    alert(res.isValid ? "✅ Hash chain verified intact!" : "❌ Error: " + res.errorReason);
                  }}
                  className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-full hover:bg-emerald-100 transition-colors"
                >
                  Verify Hash Chain
                </button>
              </div>

              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                {vaultEntries.length === 0 ? (
                  <p className="text-xs text-gray-500 py-12 text-center">
                    No items in Evidence Vault yet. Open any report and click "Add to Vault".
                  </p>
                ) : (
                  <div className="space-y-3">
                    {vaultEntries.map((e, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-900">Block #{e.index}</span>
                          <span className="font-mono text-gray-400 text-[10px]">{e.reportId}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 truncate">{e.claimText}</p>
                        <p className="font-mono text-[10px] text-gray-500 truncate">Hash: {e.entryHash}</p>
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
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Media & Safe Circle</h2>
                <p className="text-xs text-gray-500">Rotating verbal authentication against AI voice scams</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs text-center space-y-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Verbal Code</div>
                  <div className="text-3xl font-mono font-extrabold tracking-widest text-gray-900 py-4 bg-gray-50 rounded-2xl border border-gray-200">
                    {safeCode.code}
                  </div>
                  <div className="text-xs font-mono text-gray-500 flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rotates in {safeCode.secondsRemaining}s</span>
                  </div>
                </div>

                <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">Test Code Authenticity</h3>
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Enter spoken word heard..."
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-gray-900"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await verifySafeCircleSpokenCode(verifyInput, wordlist, familySecret);
                      setVerifyResult(res);
                    }}
                    className="w-full py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full transition-all"
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
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Editorial Notes & Source Explorer</h2>
                <p className="text-xs text-gray-500">Domain authority & syndication network inspection</p>
              </div>

              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domainQuery}
                    onChange={(e) => setDomainQuery(e.target.value)}
                    placeholder="Enter domain (e.g. reuters.com, bbc.com)..."
                    className="flex-1 px-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => fetchDomainProfile(domainQuery)}
                    className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full"
                  >
                    Lookup
                  </button>
                </div>

                {domainProfile && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{domainProfile.domain}</span>
                      <span className="text-emerald-700">Reliability: {domainProfile.reliability}/1.0</span>
                    </div>
                    <div className="text-gray-600">
                      Org: {domainProfile.name} • Leaning: {domainProfile.leaning} • Country: {domainProfile.country}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              SETTINGS VIEW
              ======================================================== */}
          {activeNav === "settings" && (
            <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h2>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Analyst Display Name</label>
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-full"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Clear local storage records?")) {
                      localStorage.clear();
                      refreshLocalData();
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
            <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Support & Helplines</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-2">
                <p className="font-bold text-red-900">National Cybercrime Helpline: Dial 1930</p>
                <p className="text-red-700">Immediate reporting for financial UPI/bank fraud within the golden hour.</p>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 font-bold text-red-900 underline"
                >
                  cybercrime.gov.in
                </a>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================
            COLUMN 3: RIGHT RAIL (LATEST NEWS & TRENDING HASHTAGS)
            ======================================================== */}
        <aside className="w-80 p-6 border-l border-gray-200 bg-white hidden xl:block flex-shrink-0 space-y-8">
          {/* LATEST NEWS */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Latest News</h3>

            <div className="space-y-4">
              {/* Item 1 */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <img
                  src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&auto=format&fit=crop&q=80"
                  alt="Coding"
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    Government Launches Free Coding Program for Youth
                  </h4>
                  <p className="text-[11px] text-gray-400 font-medium">Education</p>
                </div>
              </div>

              {/* Item 2 */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
                  alt="Gen Z"
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    How Gen Z is Redefining Work-Life Balance
                  </h4>
                  <p className="text-[11px] text-gray-400 font-medium">Culture</p>
                </div>
              </div>

              {/* Item 3 */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <img
                  src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80"
                  alt="Sports"
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    National Team Qualifies for Asian Cup Final
                  </h4>
                  <p className="text-[11px] text-gray-400 font-medium">Sports</p>
                </div>
              </div>

              {/* Item 4 */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <img
                  src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=300&auto=format&fit=crop&q=80"
                  alt="Motorcycle"
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    Electric Motorcycle Subsidy Boosts Local Industry
                  </h4>
                  <p className="text-[11px] text-gray-400 font-medium">Business</p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* TRENDING HASHTAGS */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Trending Hashtags</h3>

            <div className="space-y-4">
              {/* Hashtag 1 */}
              <div className="flex items-start justify-between cursor-pointer group">
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Politics • Trending</span>
                  <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors mt-0.5">
                    #DebatCapres2025
                  </p>
                  <span className="text-[11px] text-gray-400">28,500 Engagement</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>

              {/* Hashtag 2 */}
              <div className="flex items-start justify-between cursor-pointer group">
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Jakarta • Trending</span>
                  <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors mt-0.5">
                    #JakartaHujan
                  </p>
                  <span className="text-[11px] text-gray-400">21,300 Engagement</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>

              {/* Hashtag 3 */}
              <div className="flex items-start justify-between cursor-pointer group">
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Technology • Trending</span>
                  <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors mt-0.5">
                    #iOS19
                  </p>
                  <span className="text-[11px] text-gray-400">18,700 Engagement</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>

              {/* Hashtag 4 */}
              <div className="flex items-start justify-between cursor-pointer group">
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Shopping • Trending</span>
                  <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors mt-0.5">
                    #TikTokShopID
                  </p>
                  <span className="text-[11px] text-gray-400">14,050 Engagement</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ========================================================
          MODAL
          ======================================================== */}
      <VerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleVerificationComplete}
      />
    </div>
  );
}
