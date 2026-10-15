// Crosscheck Client-Side Storage & Dynamic Analytics Engine
// Backed by localStorage with zero mock data.

export const STORAGE_KEY_REPORTS = "crosscheck_reports_v1";
export const STORAGE_KEY_PROFILE = "crosscheck_profile_v1";
export const STORAGE_KEY_SETTINGS = "crosscheck_settings_v1";

// In-memory cache for fast session access & preserving large image previews
const memoryReportsMap = new Map();

export function getStoredReports() {
  if (typeof window === "undefined") return Array.from(memoryReportsMap.values());
  try {
    const raw = window.localStorage ? localStorage.getItem(STORAGE_KEY_REPORTS) : null;
    const diskReports = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(diskReports)) return Array.from(memoryReportsMap.values());

    // Merge in-memory reports so data URLs from current session are preserved
    for (const mem of memoryReportsMap.values()) {
      const idx = diskReports.findIndex(d => d.reportId === mem.reportId);
      if (idx >= 0) {
        diskReports[idx] = { ...diskReports[idx], ...mem };
      } else {
        diskReports.unshift(mem);
      }
    }
    return diskReports;
  } catch (e) {
    console.error("[Storage] Failed to read reports:", e);
    return Array.from(memoryReportsMap.values());
  }
}

export function saveStoredReport(report) {
  if (!report || !report.reportId) return report;
  memoryReportsMap.set(report.reportId, report);

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      sessionStorage.setItem(`crosscheck_active_${report.reportId}`, JSON.stringify(report));
    } catch {}
  }

  if (typeof window === "undefined" || !window.localStorage) return report;
  try {
    const reports = getStoredReports();
    const existingIdx = reports.findIndex((r) => r.reportId === report.reportId);
    let updated;
    if (existingIdx >= 0) {
      updated = [...reports];
      updated[existingIdx] = { ...updated[existingIdx], ...report };
    } else {
      updated = [report, ...reports];
    }

    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated.slice(0, 30)));
    } catch (quotaErr) {
      console.warn("[Storage] QuotaExceededError in localStorage, trimming older media...", quotaErr);
      // Keep previews for the 3 most recent reports, strip only older ones
      const slimmed = updated.slice(0, 15).map((r, i) => {
        if (i < 3) return r;
        if (r.submittedMedia?.previewUrl && r.submittedMedia.previewUrl.length > 500) {
          return {
            ...r,
            submittedMedia: { ...r.submittedMedia, previewUrl: null }
          };
        }
        return r;
      });
      try {
        localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(slimmed));
      } catch {
        // Fallback to storing just current report in sessionStorage
        if (window.sessionStorage) {
          try {
            sessionStorage.setItem(`crosscheck_active_${report.reportId}`, JSON.stringify(report));
          } catch {}
        }
      }
    }

    window.dispatchEvent(new Event("crosscheck_reports_updated"));
    return report;
  } catch (e) {
    console.error("[Storage] Failed to save report:", e);
    return report;
  }
}

export function getReportById(reportId) {
  if (!reportId) return null;
  if (memoryReportsMap.has(reportId)) {
    const mem = memoryReportsMap.get(reportId);
    if (mem?.submittedMedia?.previewUrl) return mem;
  }
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const sess = sessionStorage.getItem(`crosscheck_active_${reportId}`);
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed?.submittedMedia?.previewUrl) return parsed;
      }
    } catch {}
  }
  const reports = getStoredReports();
  const found = reports.find((r) => r.reportId === reportId || r.id === reportId) || null;
  if (found) return found;
  if (memoryReportsMap.has(reportId)) return memoryReportsMap.get(reportId);
  return null;
}

export function deleteReportById(reportId) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const reports = getStoredReports();
    const filtered = reports.filter((r) => r.reportId !== reportId && r.id !== reportId);
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(filtered));
    window.dispatchEvent(new Event("crosscheck_reports_updated"));
    return true;
  } catch (e) {
    console.error("[Storage] Failed to delete report:", e);
    return false;
  }
}

export function toggleSaveReport(reportId) {
  const reports = getStoredReports();
  const report = reports.find((r) => r.reportId === reportId || r.id === reportId);
  if (!report) return null;
  report.isSaved = !report.isSaved;
  saveStoredReport(report);
  return report.isSaved;
}

export const INITIAL_STATS = {
  totalProofs: 0,
  disputedPercent: 0,
  avgDurationMs: 0,
  avgDurationFormatted: "0.0s",
  highConfidenceCount: 0,
  verdictMix: {
    likelyManipulated: 0,
    inconclusive: 0,
    noSignsFound: 0,
  },
  chartDays: [],
  categoryMix: {},
};

/**
 * Computes deterministic real-time statistics from an array of reports.
 * Returns zeros and clean empty states if no reports exist.
 */
export function computeDashboardStats(reports = []) {
  const total = reports.length;
  if (total === 0) {
    // Generate 30 days of 0-counts
    const chartDays = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      chartDays.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: 0,
      });
    }

    return {
      totalProofs: 0,
      disputedPercent: 0,
      avgDurationMs: 0,
      avgDurationFormatted: "0.0s",
      highConfidenceCount: 0,
      verdictMix: {
        likelyManipulated: 0,
        inconclusive: 0,
        noSignsFound: 0,
      },
      chartDays,
      categoryMix: {},
    };
  }

  let manipulatedCount = 0;
  let inconclusiveCount = 0;
  let noSignsCount = 0;
  let totalDuration = 0;
  let highConfidenceCount = 0;
  const categoryMix = {};

  // Build day map for past 30 days
  const dayMap = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = {
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: 0,
    };
  }

  for (const r of reports) {
    // Verdict counting
    const verdict = (r.verdict || "").toLowerCase();
    if (verdict.includes("manipulated") || verdict.includes("false") || verdict.includes("unsupported")) {
      manipulatedCount++;
    } else if (verdict.includes("no signs") || verdict.includes("verified") || verdict.includes("true")) {
      noSignsCount++;
    } else {
      inconclusiveCount++;
    }

    // Duration
    if (typeof r.durationMs === "number" && r.durationMs > 0) {
      totalDuration += r.durationMs;
    }

    // High confidence
    if (r.confidence?.level === "High" || (r.score > 75 || r.score < 25)) {
      highConfidenceCount++;
    }

    // Category
    const cat = r.category || "General Claim";
    categoryMix[cat] = (categoryMix[cat] || 0) + 1;

    // Date bucket
    if (r.createdAt) {
      const dateKey = r.createdAt.slice(0, 10);
      if (dayMap[dateKey]) {
        dayMap[dateKey].count++;
      }
    }
  }

  const avgMs = Math.round(totalDuration / total);
  const avgSec = (avgMs / 1000).toFixed(1);

  return {
    totalProofs: total,
    disputedPercent: Math.round((manipulatedCount / total) * 100),
    avgDurationMs: avgMs,
    avgDurationFormatted: `${avgSec}s`,
    highConfidenceCount,
    verdictMix: {
      likelyManipulated: manipulatedCount,
      inconclusive: inconclusiveCount,
      noSignsFound: noSignsCount,
    },
    chartDays: Object.values(dayMap),
    categoryMix,
  };
}

export function getUserProfile() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { displayName: "Guest", role: "Forensic Analyst" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!raw) return { displayName: "Guest", role: "Forensic Analyst" };
    return JSON.parse(raw);
  } catch {
    return { displayName: "Guest", role: "Forensic Analyst" };
  }
}

export function saveUserProfile(profile) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    window.dispatchEvent(new Event("crosscheck_profile_updated"));
  } catch (e) {
    console.error("[Storage] Failed to save profile:", e);
  }
}

export function getSettings() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { theme: "light", language: "en" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return { theme: "light", language: "en" };
    return JSON.parse(raw);
  } catch {
    return { theme: "light", language: "en" };
  }
}

export function saveSettings(settings) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("crosscheck_settings_updated"));
  } catch (e) {
    console.error("[Storage] Failed to save settings:", e);
  }
}

