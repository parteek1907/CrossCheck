"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Search,
  Plus,
  BarChart3,
  History,
  Archive,
  Radio,
  Globe2,
  Settings,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Bookmark,
  Share2,
  FileDown,
  Trash2,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  HelpCircle as QuestionIcon,
  User,
  Edit2,
  Bell,
  RefreshCw,
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
import { getVaultEntries, saveToVault, verifyVaultIntegrity, clearVault } from "../lib/vault.js";
import { generateSafeCircleCode, verifySafeCircleSpokenCode, getSafeCircleSecret, setSafeCircleSecret } from "../lib/safecircle.js";
import { EMERGENCY_HELPLINES, getActionProtocol } from "../lib/actionpath.js";
import { VerificationModal } from "../components/VerificationModal";

export default function ProofDeskApp() {
  const router = useRouter();

  // Navigation: 'dashboard' | 'history' | 'vault' | 'safecircle' | 'clustering' | 'settings' | 'help'
  const [activeNav, setActiveNav] = useState("dashboard");

  // Client-side state
  const [isMounted, setIsMounted] = useState(false);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [userProfile, setUserProfile] = useState({ displayName: "Guest", role: "Forensic Analyst" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("Guest");

  // Global search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilterSaved, setHistoryFilterSaved] = useState(false);

  // Verification Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Evidence Vault state
  const [vaultEntries, setVaultEntries] = useState([]);
  const [vaultStatus, setVaultStatus] = useState("Ledger Verified");

  // Safe Circle state
  const [wordlist, setWordlist] = useState([]);
  const [safeCode, setSafeCode] = useState({ code: "LOADING...", secondsRemaining: 60, progressPercent: 100 });
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [familySecret, setFamilySecret] = useState("CROSSCHECK-CIRCLE-FAMILY-2026");

  // Domain search state for Source Explorer
  const [domainQuery, setDomainQuery] = useState("reuters.com");
  const [domainProfile, setDomainProfile] = useState(null);
  const [isFetchingDomain, setIsFetchingDomain] = useState(false);

  // Load stored state on mount
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
    setIsMounted(true);
    refreshLocalData();

    // Fetch wordlist for Safe Circle
    fetch("/data/wordlist.json")
      .then((r) => r.json())
      .then((words) => setWordlist(words))
      .catch(() => setWordlist([]));

    // Listen for storage updates across tabs / events
    window.addEventListener("crosscheck_reports_updated", refreshLocalData);
    window.addEventListener("crosscheck_profile_updated", refreshLocalData);

    // Initial domain query
    fetchDomainProfile("reuters.com");

    return () => {
      window.removeEventListener("crosscheck_reports_updated", refreshLocalData);
      window.removeEventListener("crosscheck_profile_updated", refreshLocalData);
    };
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K opens modal
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

  // Fetch domain profile from real API
  const fetchDomainProfile = async (domain) => {
    if (!domain) return;
    setIsFetchingDomain(true);
    try {
      const res = await fetch(`/api/domain-profile/${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setDomainProfile(data);
      } else {
        setDomainProfile(null);
      }
    } catch {
      setDomainProfile(null);
    } finally {
      setIsFetchingDomain(false);
    }
  };

  // Profile name saving
  const handleSaveName = () => {
    const clean = tempName.trim() || "Guest";
    const updated = { ...userProfile, displayName: clean };
    saveUserProfile(updated);
    setUserProfile(updated);
    setIsEditingName(false);
  };

  // Handle completed verification from modal
  const handleVerificationComplete = (report) => {
    saveStoredReport(report);
    refreshLocalData();
    // Navigate to full report page
    router.push(`/report/${encodeURIComponent(report.reportId)}`);
  };

  // Filtered reports for History & Search
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
    <div className="desk-layout min-h-screen bg-[#0D0E11] text-gray-100 flex">
      {/* ========================================================
          LEFT SIDEBAR (CROSSCHECK)
          ======================================================== */}
      <aside className="desk-sidebar w-64 bg-[#121316] border-r border-[#22242A] flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          {/* Brand */}
          <div className="brand-section mb-6 pb-4 border-b border-[#202227]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D95D39] flex items-center justify-center text-white shadow-md font-bold text-sm">
                C
              </div>
              <div>
                <h1 className="brand-name text-lg font-bold text-white tracking-tight leading-none">
                  Crosscheck
                </h1>
                <div className="brand-sub text-[10px] font-mono uppercase tracking-widest text-gray-400 mt-1">
                  Institutional Proof Desk
                </div>
              </div>
            </div>
          </div>

          {/* "+ New Verification" Primary Action */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 mb-6 text-sm font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl shadow-md transition-all group"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>New verification</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-black/25 text-white/80 rounded border border-white/10">
              ⌘K
            </kbd>
          </button>

          {/* Navigation Links */}
          <div className="nav-category">
            <div className="nav-category-title text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              Workspace
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("dashboard")}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                    activeNav === "dashboard"
                      ? "bg-[#1E2026] text-white font-medium border border-[#2F323B]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#16171B]"
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-[#D95D39]" />
                  <span>Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("history")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
                    activeNav === "history"
                      ? "bg-[#1E2026] text-white font-medium border border-[#2F323B]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#16171B]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-sky-400" />
                    <span>History</span>
                  </div>
                  <span className="text-xs font-mono text-gray-500">{reports.length}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("vault")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
                    activeNav === "vault"
                      ? "bg-[#1E2026] text-white font-medium border border-[#2F323B]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#16171B]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-4 h-4 text-emerald-400" />
                    <span>Evidence Vault</span>
                  </div>
                  <span className="text-xs font-mono text-gray-500">{vaultEntries.length}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("safecircle")}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                    activeNav === "safecircle"
                      ? "bg-[#1E2026] text-white font-medium border border-[#2F323B]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#16171B]"
                  }`}
                >
                  <Radio className="w-4 h-4 text-violet-400" />
                  <span>Safe Circle</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("clustering")}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                    activeNav === "clustering"
                      ? "bg-[#1E2026] text-white font-medium border border-[#2F323B]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#16171B]"
                  }`}
                >
                  <Globe2 className="w-4 h-4 text-amber-400" />
                  <span>Source Explorer</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#202227] space-y-1">
          <button
            type="button"
            onClick={() => setActiveNav("help")}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all ${
              activeNav === "help"
                ? "bg-[#1E2026] text-white font-medium"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#16171B]"
            }`}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Help Center (1930)</span>
            </div>
            <span className="text-[10px] font-mono text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40">
              SOS
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveNav("settings")}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all ${
              activeNav === "settings"
                ? "bg-[#1E2026] text-white font-medium"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#16171B]"
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-gray-400" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          MAIN APP CONTENT AREA
          ======================================================== */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 px-8 border-b border-[#202227] bg-[#121316]/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search verified reports or claims... (⌘K)"
                className="w-full pl-9 pr-12 py-2 text-xs text-gray-200 bg-[#17181D] border border-[#272931] rounded-xl placeholder:text-gray-500 focus:outline-none focus:border-[#D95D39] transition-all"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-[#22242B] text-gray-400 rounded border border-[#2E313A]"
              >
                ⌘K
              </button>
            </div>
          </div>

          {/* Right Header: Status, Notification, and User Pill */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#181A1F] border border-[#282B33] rounded-lg text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine Active</span>
            </div>

            {/* Notification Bell (Badge hidden when 0) */}
            <div className="relative p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-[#1A1C21] transition-colors cursor-pointer">
              <Bell className="w-4 h-4" />
            </div>

            {/* User Profile Pill ("Guest" with inline editing) */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#24272E]">
              <div className="w-7 h-7 rounded-full bg-[#D95D39]/20 border border-[#D95D39]/40 flex items-center justify-center text-[#D95D39] text-xs font-bold">
                {userProfile.displayName ? userProfile.displayName.slice(0, 1).toUpperCase() : "G"}
              </div>
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                    className="w-24 px-1.5 py-0.5 text-xs bg-[#1E2026] text-white border border-[#D95D39] rounded"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-1 cursor-pointer group"
                  title="Click to edit display name"
                >
                  <span className="text-xs font-medium text-gray-200 group-hover:text-white">
                    {userProfile.displayName || "Guest"}
                  </span>
                  <Edit2 className="w-3 h-3 text-gray-500 group-hover:text-gray-300 opacity-60" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {/* ========================================================
              VIEW 1: DASHBOARD (HOME)
              ======================================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-8">
              {/* Header Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Verification Dashboard
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Real-time digital forensics, open wire corroboration, and tamper-evident proof ledger.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New verification</span>
                  </button>
                </div>
              </div>

              {/* KPI ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl shadow-sm">
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-400">
                    Total Proofs
                  </div>
                  <div className="mt-2 text-3xl font-bold font-mono text-white">
                    {stats.totalProofs}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {stats.totalProofs === 0 ? "No records on this device" : "Cryptographically logged"}
                  </div>
                </div>

                <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl shadow-sm">
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-400">
                    Disputed / Manipulated
                  </div>
                  <div className="mt-2 text-3xl font-bold font-mono text-[#D95D39]">
                    {stats.disputedPercent}%
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {stats.verdictMix.likelyManipulated} flagged claims
                  </div>
                </div>

                <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl shadow-sm">
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-400">
                    Average Duration
                  </div>
                  <div className="mt-2 text-3xl font-bold font-mono text-sky-400">
                    {stats.avgDurationFormatted}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Open wire & clustering latency
                  </div>
                </div>

                <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl shadow-sm">
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-400">
                    High Confidence
                  </div>
                  <div className="mt-2 text-3xl font-bold font-mono text-emerald-400">
                    {stats.highConfidenceCount}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Statistical bounds ± margin
                  </div>
                </div>
              </div>

              {/* CHARTS ROW: 30-Day Activity & Verdict Mix */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 30-Day Activity Chart */}
                <div className="lg:col-span-2 p-6 bg-[#141519] border border-[#24262E] rounded-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        30-Day Verification Activity
                      </h3>
                      <p className="text-xs text-gray-400">
                        Daily verification volume computed from local audit records
                      </p>
                    </div>
                    <span className="text-xs font-mono text-gray-500">Past 30 Days</span>
                  </div>

                  {/* Bar Chart Container */}
                  <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-[#22242C]">
                    {stats.chartDays.map((d, idx) => {
                      const maxCount = Math.max(1, ...stats.chartDays.map((c) => c.count));
                      const barHeight = d.count > 0 ? `${Math.max(15, Math.round((d.count / maxCount) * 100))}%` : "3px";
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                            <div className="bg-[#1F2128] border border-[#343742] text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              {d.label}: {d.count} checks
                            </div>
                          </div>
                          {/* Bar */}
                          <div
                            style={{ height: barHeight }}
                            className={`w-full rounded-t transition-all ${
                              d.count > 0
                                ? "bg-[#D95D39] hover:bg-[#e46944]"
                                : "bg-[#22252C] hover:bg-[#2A2E37]"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-500">
                    <span>30 days ago</span>
                    <span>15 days ago</span>
                    <span>Today</span>
                  </div>
                </div>

                {/* Verdict Mix Card */}
                <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      Verdict Distribution
                    </h3>
                    <p className="text-xs text-gray-400 mb-6">
                      Breakdown across all evaluated claims
                    </p>

                    <div className="space-y-4">
                      {/* Likely Manipulated */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#D95D39]" />
                            Likely Manipulated
                          </span>
                          <span className="font-mono text-white">
                            {stats.verdictMix.likelyManipulated}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1F2127] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#D95D39] rounded-full"
                            style={{
                              width: stats.totalProofs > 0
                                ? `${(stats.verdictMix.likelyManipulated / stats.totalProofs) * 100}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>

                      {/* Inconclusive */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Inconclusive
                          </span>
                          <span className="font-mono text-white">
                            {stats.verdictMix.inconclusive}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1F2127] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{
                              width: stats.totalProofs > 0
                                ? `${(stats.verdictMix.inconclusive / stats.totalProofs) * 100}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>

                      {/* No Signs Found */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            No Signs Found
                          </span>
                          <span className="font-mono text-white">
                            {stats.verdictMix.noSignsFound}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1F2127] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{
                              width: stats.totalProofs > 0
                                ? `${(stats.verdictMix.noSignsFound / stats.totalProofs) * 100}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#22242B] text-xs text-gray-500 font-mono flex items-center justify-between">
                    <span>Active Storage:</span>
                    <span className="text-gray-300">On-Device (Encrypted)</span>
                  </div>
                </div>
              </div>

              {/* RECENT VERIFICATIONS TABLE / EMPTY STATE */}
              <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Recent Verifications
                    </h3>
                    <p className="text-xs text-gray-400">
                      Audit history cryptographically chained on this device
                    </p>
                  </div>
                  {reports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveNav("history")}
                      className="text-xs text-[#D95D39] hover:underline flex items-center gap-1"
                    >
                      <span>View all</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* EMPTY STATE */}
                {reports.length === 0 ? (
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-[#22242B] rounded-xl bg-[#111215]/50">
                    <div className="w-14 h-14 rounded-2xl bg-[#D95D39]/15 border border-[#D95D39]/30 flex items-center justify-center text-[#D95D39] mb-4 shadow-inner">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-semibold text-white">
                      No verifications on this device yet
                    </h4>
                    <p className="mt-1 text-xs text-gray-400 max-w-md">
                      Crosscheck runs real multi-source wire corroboration, Union-Find evidence clustering, and deterministic trust scoring with SHA-256 audit trails.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="mt-6 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Run your first check</span>
                    </button>
                  </div>
                ) : (
                  /* POPULATED TABLE */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#22242C] text-gray-500 font-mono uppercase tracking-wider">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Claim / Target</th>
                          <th className="py-3 px-3">Verdict</th>
                          <th className="py-3 px-3">Score</th>
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D1F25]">
                        {reports.slice(0, 10).map((r) => {
                          const isManip = (r.verdict || "").toLowerCase().includes("manipulated");
                          const isNoSigns = (r.verdict || "").toLowerCase().includes("no signs");
                          return (
                            <tr key={r.reportId} className="hover:bg-[#181A20] transition-colors">
                              <td className="py-3 px-3 font-mono text-gray-400 whitespace-nowrap">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Today"}
                              </td>
                              <td className="py-3 px-3 font-medium text-gray-200 max-w-xs truncate">
                                {r.claimText || r.inputText || "Verification target"}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    isManip
                                      ? "bg-red-950/50 text-red-400 border border-red-800/40"
                                      : isNoSigns
                                      ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/40"
                                      : "bg-amber-950/50 text-amber-400 border border-amber-800/40"
                                  }`}
                                >
                                  {r.verdict || "Inconclusive"}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-gray-100">
                                {r.score ?? 50}
                                {r.confidence?.margin ? (
                                  <span className="text-[10px] text-gray-500 font-normal ml-1">
                                    ±{r.confidence.margin}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 px-3 font-mono text-gray-400">
                                {r.category || "General"}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                                  className="px-2.5 py-1 text-xs text-[#D95D39] hover:text-white hover:bg-[#D95D39] rounded-lg border border-[#D95D39]/40 transition-all font-medium"
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
              VIEW 2: HISTORY (WITH SAVED FILTER)
              ======================================================== */}
          {activeNav === "history" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Verification History
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Audit reports stored in your on-device cryptographic ledger.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setHistoryFilterSaved(!historyFilterSaved)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      historyFilterSaved
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                        : "bg-[#18191E] border-[#2B2D36] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Saved Cases Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl shadow-md transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New check</span>
                  </button>
                </div>
              </div>

              {/* History Table */}
              <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl">
                {filteredReports.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500">
                    {historyFilterSaved ? "No saved reports found." : "No verification history found."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#22242C] text-gray-500 font-mono uppercase tracking-wider">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Claim</th>
                          <th className="py-3 px-3">Verdict</th>
                          <th className="py-3 px-3">Score</th>
                          <th className="py-3 px-3">Audit ID</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D1F25]">
                        {filteredReports.map((r) => (
                          <tr key={r.reportId} className="hover:bg-[#181A20] transition-colors">
                            <td className="py-3 px-3 font-mono text-gray-400 whitespace-nowrap">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Today"}
                            </td>
                            <td className="py-3 px-3 font-medium text-gray-200 max-w-sm truncate">
                              {r.claimText || r.inputText}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#1C1E24] border border-[#2D303A] text-gray-300">
                                {r.verdict || "Inconclusive"}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-gray-100">
                              {r.score ?? 50}
                            </td>
                            <td className="py-3 px-3 font-mono text-[10px] text-gray-500">
                              {r.reportId}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleSaveReport(r.reportId);
                                    refreshLocalData();
                                  }}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    r.isSaved
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                      : "text-gray-400 hover:text-white border-transparent hover:bg-[#252830]"
                                  }`}
                                  title={r.isSaved ? "Saved" : "Save case"}
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => router.push(`/report/${encodeURIComponent(r.reportId)}`)}
                                  className="px-2.5 py-1 text-xs text-[#D95D39] hover:bg-[#D95D39] hover:text-white rounded-lg border border-[#D95D39]/40 transition-all font-medium"
                                >
                                  Inspect
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 3: EVIDENCE VAULT
              ======================================================== */}
          {activeNav === "vault" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Evidence Vault
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Cryptographically chained ledger (SHA-256) stored on this device.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await verifyVaultIntegrity();
                      if (res.isValid) {
                        alert(`✅ Cryptographic Ledger Verified! All ${res.totalEntries} entries intact.`);
                      } else {
                        alert(`❌ Ledger Alteration Alert: ${res.errorReason}`);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-xl hover:bg-emerald-950/50 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Ledger Hash Chain</span>
                  </button>
                </div>
              </div>

              <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl">
                {vaultEntries.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500">
                    No evidence blocks added to the cryptographic vault yet. Open any report and click "Add to Evidence Vault".
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vaultEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-[#181A20] border border-[#292C35] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[#D95D39] font-bold">
                              Block #{entry.index}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs font-medium text-white">{entry.claimText}</span>
                          </div>
                          <div className="font-mono text-[10px] text-gray-500 truncate max-w-md">
                            Hash: {entry.entryHash}
                          </div>
                          <div className="font-mono text-[10px] text-gray-500 truncate max-w-md">
                            Prev: {entry.previousHash}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#21232B] text-gray-300">
                            Score: {entry.score}
                          </span>
                          <button
                            type="button"
                            onClick={() => router.push(`/report/${encodeURIComponent(entry.reportId)}`)}
                            className="px-2.5 py-1 text-xs text-[#D95D39] hover:underline"
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
              VIEW 4: SAFE CIRCLE
              ======================================================== */}
          {activeNav === "safecircle" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Safe Circle</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Rotating HMAC authentication code to defend against AI voice cloning and impersonation scams.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono uppercase text-gray-400 mb-2">
                      Current Rotating Authentication Word
                    </div>
                    <div className="p-6 bg-[#101114] border border-[#292C36] rounded-xl text-center">
                      <div className="text-3xl font-mono font-bold tracking-widest text-[#D95D39]">
                        {safeCode.code}
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-mono text-gray-400">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Rotates in {safeCode.secondsRemaining}s</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-xs text-gray-500">
                    Share this secret pre-shared key with family members or team. If an urgent call arrives requesting money or data, ask for this code.
                  </div>
                </div>

                {/* Code Verifier */}
                <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl space-y-4">
                  <h3 className="text-sm font-semibold text-white">Test Spoken Word Authenticity</h3>
                  <p className="text-xs text-gray-400">
                    Verify whether a word spoken over the phone matches the cryptographic window.
                  </p>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={verifyInput}
                      onChange={(e) => setVerifyInput(e.target.value)}
                      placeholder="Enter word heard on call..."
                      className="w-full px-4 py-2.5 text-sm bg-[#16181D] border border-[#2A2D35] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D95D39]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await verifySafeCircleSpokenCode(verifyInput, wordlist, familySecret);
                        setVerifyResult(res);
                      }}
                      className="w-full py-2 text-xs font-semibold text-white bg-[#22252C] hover:bg-[#2C3039] rounded-xl border border-[#343844] transition-colors"
                    >
                      Authenticate Code
                    </button>
                  </div>

                  {verifyResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-medium ${
                        verifyResult.isValid
                          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                          : "bg-red-950/40 border-red-800/60 text-red-300"
                      }`}
                    >
                      {verifyResult.isValid
                        ? "✅ Verified Authentic! Word matches the current time window."
                        : `❌ Invalid Word! ${verifyResult.errorReason || "Code does not match."}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 5: SOURCE EXPLORER
              ======================================================== */}
          {activeNav === "clustering" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Source Explorer
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Inspect domain authority, institutional reliability ratings, and open news syndication.
                </p>
              </div>

              <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={domainQuery}
                    onChange={(e) => setDomainQuery(e.target.value)}
                    placeholder="Enter domain (e.g. reuters.com, bbc.com, pib.gov.in)..."
                    className="flex-1 px-4 py-2.5 text-sm bg-[#16181D] border border-[#2A2D35] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D95D39]"
                  />
                  <button
                    type="button"
                    onClick={() => fetchDomainProfile(domainQuery)}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl transition-all"
                  >
                    Lookup Domain
                  </button>
                </div>

                {domainProfile && (
                  <div className="p-5 bg-[#171920] border border-[#292C36] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-white font-mono">
                        {domainProfile.domain}
                      </span>
                      <span className="px-2.5 py-0.5 text-xs font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 rounded-full">
                        Reliability: {domainProfile.reliability}/1.0
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
                      <div>
                        <span className="text-gray-500 block">Organization</span>
                        <span className="text-gray-200 font-medium">{domainProfile.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Type</span>
                        <span className="text-gray-200 font-medium">{domainProfile.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Leaning</span>
                        <span className="text-gray-200 font-medium">{domainProfile.leaning}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Jurisdiction</span>
                        <span className="text-gray-200 font-medium">{domainProfile.country}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 6: SETTINGS
              ======================================================== */}
          {activeNav === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Configure local device preferences and cryptographic ledger storage.
                </p>
              </div>

              <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Analyst Display Name
                  </label>
                  <div className="flex gap-3 max-w-md">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="flex-1 px-4 py-2 text-sm bg-[#16181D] border border-[#2A2D35] rounded-xl text-white focus:outline-none focus:border-[#D95D39]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl transition-all"
                    >
                      Save Name
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#22242B]">
                  <h4 className="text-sm font-semibold text-white mb-1">Local Storage Controls</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Clear all locally saved verification reports and evidence vault entries on this device.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to clear all locally saved reports and vault records?")) {
                        localStorage.removeItem("crosscheck_reports_v1");
                        localStorage.removeItem("trustlens_evidence_vault_v1");
                        refreshLocalData();
                        alert("Storage cleared.");
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/40 border border-red-900/40 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Local Storage</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 7: HELP CENTER (1930 / STATUTORY PROTOCOL)
              ======================================================== */}
          {activeNav === "help" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Help Center & Statutory Helplines</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Emergency incident escalation, 1930 National Cyber Crime Reporting Portal & statutory legal protocols.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-[#1A1414] border border-red-900/40 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>National Cybercrime Helpline: 1930</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    If you are facing financial fraud, immediate UPI freezing, or extortion, dial 1930 immediately within the golden hour to freeze fraudulent recipient accounts.
                  </p>
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-800 hover:bg-red-700 rounded-xl transition-colors"
                  >
                    <span>Visit cybercrime.gov.in</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl space-y-3">
                  <h4 className="text-sm font-semibold text-white">Evidence Preservation Tips</h4>
                  <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
                    <li>Export your verified PDF report and lock the record in the Evidence Vault.</li>
                    <li>Preserve original uncompressed screenshots, transaction IDs, and URL parameters.</li>
                    <li>Do not delete chat logs or message timestamps before lodging the official complaint.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
          VERIFICATION MODAL (ACCESSIBLE, TABS: TEXT | LINK | FILE)
          ======================================================== */}
      <VerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleVerificationComplete}
      />
    </div>
  );
}
