// Crosscheck Client-Side Storage & Dynamic Analytics Engine
// Backed by localStorage with zero mock data.

export const STORAGE_KEY_REPORTS = "crosscheck_reports_v1";
export const STORAGE_KEY_PROFILE = "crosscheck_profile_v1";
export const STORAGE_KEY_SETTINGS = "crosscheck_settings_v1";

export function getStoredReports() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("[Storage] Failed to read reports:", e);
    return [];
  }
}

export function saveStoredReport(report) {
  if (typeof window === "undefined" || !window.localStorage) return report;
  try {
    const reports = getStoredReports();
    // Prepend or replace existing report
    const existingIdx = reports.findIndex((r) => r.reportId === report.reportId);
    let updated;
    if (existingIdx >= 0) {
      updated = [...reports];
      updated[existingIdx] = { ...updated[existingIdx], ...report };
    } else {
      updated = [report, ...reports];
    }
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated));
    // Dispatch custom event for real-time reactive sync across components
    window.dispatchEvent(new Event("crosscheck_reports_updated"));
    return report;
  } catch (e) {
    console.error("[Storage] Failed to save report:", e);
    return report;
  }
}

export function getReportById(reportId) {
  const reports = getStoredReports();
  return reports.find((r) => r.reportId === reportId || r.id === reportId) || null;
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
