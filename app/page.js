"use client";

import React, { useState, useEffect } from "react";
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
  Share2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
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
import { generateSafeCircleCode, verifySafeCircleSpokenCode } from "../lib/safecircle.js";
import { VerificationModal } from "../components/VerificationModal";

export default function CrosscheckApp() {
  const router = useRouter();

  // Navigation: 'dashboard' | 'history' | 'vault' | 'safecircle' | 'clustering' | 'settings' | 'help'
  const [activeNav, setActiveNav] = useState("dashboard");

  // Client-side storage state
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [userProfile, setUserProfile] = useState({ displayName: "Guest", role: "Forensic Analyst" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("Guest");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilterSaved, setHistoryFilterSaved] = useState(false);

  // Verification Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Evidence Vault state
  const [vaultEntries, setVaultEntries] = useState([]);

  // Safe Circle state
  const [wordlist, setWordlist] = useState([]);
  const [safeCode, setSafeCode] = useState({ code: "LOADING...", secondsRemaining: 60, progressPercent: 100 });
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const familySecret = "CROSSCHECK-CIRCLE-FAMILY-2026";

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
          CLEAN TOP HEADER (BALANCED ALIGNMENT)
          ======================================================== */}
      <header className="h-16 px-6 lg:px-8 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-30">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 text-gray-900 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
            </svg>
          </div>
          <span className="font-extrabold text-lg text-gray-900 tracking-tight">
            Crosscheck
          </span>
        </div>

        {/* Right Search, Action Button & User Profile */}
        <div className="flex items-center gap-3">
          <div className="relative w-64 lg:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verified reports... (⌘K)"
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
            <span>New verification</span>
            <kbd className="hidden lg:inline ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-white/20 rounded">⌘K</kbd>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
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
                className="text-xs font-semibold text-gray-700 hover:text-black cursor-pointer hidden sm:inline"
                title="Click to edit name"
              >
                {userProfile.displayName || "Guest"}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================
          BODY: SIDEBAR + MAIN CONTENT (PERFECT ALIGNMENT)
          ======================================================== */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* ========================================================
            SIDEBAR (CLEAN, NO EXTRA CATEGORIES)
            ======================================================== */}
        <aside className="w-64 p-6 border-r border-gray-200 bg-white flex flex-col justify-between flex-shrink-0">
          <div>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("dashboard")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold transition-all ${
                    activeNav === "dashboard"
                      ? "bg-gray-100 text-gray-900 shadow-2xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 text-gray-900" />
                    <span>Dashboard</span>
                  </div>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("history")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeNav === "history"
                      ? "bg-gray-100 text-gray-900 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4 text-gray-500" />
                    <span>History</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {reports.length}
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveNav("vault")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeNav === "vault"
                      ? "bg-gray-100 text-gray-900 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-4 h-4 text-gray-500" />
                    <span>Evidence Vault</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {vaultEntries.length}
                  </span>
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
                  <Radio className="w-4 h-4 text-gray-500" />
                  <span>Safe Circle</span>
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
                  <Globe2 className="w-4 h-4 text-gray-500" />
                  <span>Source Explorer</span>
                </button>
              </li>
            </ul>
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
              <SettingsIcon className="w-4 h-4 text-gray-500" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveNav("help")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeNav === "help" ? "text-gray-900 font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-gray-500" />
                <span>Help Center (1930)</span>
              </div>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                SOS
              </span>
            </button>
          </div>
        </aside>

        {/* ========================================================
            MAIN CONTENT AREA
            ======================================================== */}
        <main className="flex-1 p-8 lg:p-10 overflow-y-auto space-y-8">
          {/* ========================================================
              DASHBOARD VIEW (REAL DATA & COMPUTATIONS)
              ======================================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-8">
              {/* Dashboard Title & Quick Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Real-time digital forensics, open wire corroboration, and tamper-evident proof ledger.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full shadow-sm transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New verification</span>
                </button>
              </div>

              {/* KPI CARDS (HEADWAY CLEAN LIGHT STYLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">Total Proofs</div>
                  <div className="mt-1 text-3xl font-extrabold font-mono text-gray-900">{stats.totalProofs}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.totalProofs === 0 ? "Empty on-device ledger" : "Cryptographically logged"}
                  </div>
                </div>

                <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">Disputed / Manipulated</div>
                  <div className="mt-1 text-3xl font-extrabold font-mono text-red-600">{stats.disputedPercent}%</div>
                  <div className="text-xs text-gray-500 mt-1">{stats.verdictMix.likelyManipulated} flagged claims</div>
                </div>

                <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">Avg Latency</div>
                  <div className="mt-1 text-3xl font-extrabold font-mono text-blue-600">{stats.avgDurationFormatted}</div>
                  <div className="text-xs text-gray-500 mt-1">Wire & clustering speed</div>
                </div>

                <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold">High Confidence</div>
                  <div className="mt-1 text-3xl font-extrabold font-mono text-emerald-600">{stats.highConfidenceCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Bounded variance checks</div>
                </div>
              </div>

              {/* CHARTS ROW: 30-DAY ACTIVITY & VERDICT MIX */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 30-Day Activity Chart */}
                <div className="lg:col-span-2 p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        30-Day Verification Activity
                      </h3>
                      <p className="text-xs text-gray-500">
                        Daily verification volume computed from local audit records
                      </p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">Past 30 Days</span>
                  </div>

                  {/* Bar Chart Container */}
                  <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-gray-100">
                    {stats.chartDays.map((d, idx) => {
                      const maxCount = Math.max(1, ...stats.chartDays.map((c) => c.count));
                      const barHeight = d.count > 0 ? `${Math.max(15, Math.round((d.count / maxCount) * 100))}%` : "4px";
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        >
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                            <div className="bg-gray-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              {d.label}: {d.count} checks
                            </div>
                          </div>
                          <div
                            style={{ height: barHeight }}
                            className={`w-full rounded-t transition-all ${
                              d.count > 0
                                ? "bg-gray-900 hover:bg-black"
                                : "bg-gray-100 hover:bg-gray-200"
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
                </div>

                {/* Verdict Mix Card */}
                <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">
                      Verdict Distribution
                    </h3>
                    <p className="text-xs text-gray-500 mb-6">
                      Breakdown across all evaluated claims
                    </p>

                    <div className="space-y-4">
                      {/* Likely Manipulated */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            Likely Manipulated
                          </span>
                          <span className="font-mono font-bold text-gray-900">
                            {stats.verdictMix.likelyManipulated}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

                      {/* Inconclusive */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Inconclusive
                          </span>
                          <span className="font-mono font-bold text-gray-900">
                            {stats.verdictMix.inconclusive}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

                      {/* No Signs Found */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            No Signs Found
                          </span>
                          <span className="font-mono font-bold text-gray-900">
                            {stats.verdictMix.noSignsFound}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 font-mono flex items-center justify-between">
                    <span>Active Storage:</span>
                    <span className="text-gray-900 font-bold">On-Device (Encrypted)</span>
                  </div>
                </div>
              </div>

              {/* RECENT VERIFICATIONS TABLE / EMPTY STATE */}
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
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-800 mb-4 shadow-xs">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900">No verifications on this device yet</h4>
                    <p className="mt-1 text-xs text-gray-500 max-w-md">
                      Crosscheck runs real multi-source wire corroboration, Union-Find evidence clustering, and deterministic trust scoring with SHA-256 audit trails.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="mt-6 flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
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
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reports.slice(0, 10).map((r) => {
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
                                {r.confidence?.margin ? (
                                  <span className="text-[10px] text-gray-400 font-normal ml-1">
                                    ±{r.confidence.margin}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 px-3 text-gray-500 font-medium">
                                {r.category || "General"}
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
                  <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">History</h2>
                  <p className="text-xs text-gray-500">All local verification records on this device</p>
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
                  <span>Saved Cases Only</span>
                </button>
              </div>

              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs">
                {filteredReports.length === 0 ? (
                  <p className="text-xs text-gray-500 py-12 text-center">
                    {historyFilterSaved ? "No saved reports found." : "No verification history found on this device."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((r) => (
                      <div
                        key={r.reportId}
                        className="p-4 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-2xl flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <p className="text-xs font-bold text-gray-900 truncate">{r.claimText || r.inputText}</p>
                          <p className="text-[11px] text-gray-500 font-mono">
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
                  <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Evidence Vault</h2>
                  <p className="text-xs text-gray-500">Cryptographically chained ledger (SHA-256)</p>
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
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Safe Circle</h2>
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
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Source Explorer</h2>
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
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Settings</h2>
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
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Help Center & Statutory Helplines</h2>
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
