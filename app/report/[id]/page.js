"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Bookmark,
  Share2,
  FileDown,
  Archive,
  ExternalLink,
  Layers,
  Copy,
  Check,
  Cpu,
  Info,
  Calendar,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";

import { getReportById, toggleSaveReport, saveStoredReport } from "../../../lib/storage.js";
import { saveToVault } from "../../../lib/vault.js";
import { exportReportPdf } from "../../../lib/exportPdf.js";
import { performErrorLevelAnalysis, inspectImageExif } from "../../../lib/forensics.js";
import { EMERGENCY_HELPLINES, getActionProtocol } from "../../../lib/actionpath.js";

function ReportDetailContent() {
  const params = useParams();
  const router = useRouter();
  const reportId = decodeURIComponent(params?.id || "");

  const [report, setReport] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [vaultAdded, setVaultAdded] = useState(false);

  // Forensics states (for image submissions)
  const [forensicsStatus, setForensicsStatus] = useState("idle"); // 'idle' | 'computing' | 'done' | 'error'
  const [elaResult, setElaResult] = useState(null);
  const [exifResult, setExifResult] = useState(null);
  const [elaQuality, setElaQuality] = useState(0.75);
  const [elaAmp, setElaAmp] = useState(20);

  // Action path step toggles
  const [checkedSteps, setCheckedSteps] = useState({});

  useEffect(() => {
    if (!reportId) return;
    const found = getReportById(reportId);
    if (found) {
      setReport(found);
      setIsSaved(!!found.isSaved);
    }
  }, [reportId]);

  // Run real in-browser forensics if image is present
  useEffect(() => {
    if (!report?.submittedMedia?.previewUrl) return;

    let isMounted = true;
    setForensicsStatus("computing");

    const timer = setTimeout(async () => {
      try {
        const imgUrl = report.submittedMedia.previewUrl;
        const [ela, exif] = await Promise.all([
          performErrorLevelAnalysis(imgUrl, elaQuality, elaAmp).catch((e) => {
            console.warn("ELA error:", e);
            return null;
          }),
          inspectImageExif(imgUrl).catch((e) => {
            console.warn("EXIF error:", e);
            return null;
          }),
        ]);

        if (isMounted) {
          setElaResult(ela);
          setExifResult(exif);
          setForensicsStatus("done");
        }
      } catch (err) {
        if (isMounted) {
          console.error("Forensics failed:", err);
          setForensicsStatus("error");
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [report, elaQuality, elaAmp]);

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0D0E11] text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center p-8 bg-[#141519] border border-[#24262E] rounded-2xl">
          <HelpCircle className="w-10 h-10 text-gray-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Report Not Found</h2>
          <p className="text-xs text-gray-400 mb-6">
            The verification report "{reportId}" was not found in your on-device storage.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Verdict style mapping
  const verdictText = report.verdict || "Inconclusive";
  const isManipulated = verdictText.toLowerCase().includes("manipulated") || verdictText.toLowerCase().includes("false");
  const isNoSigns = verdictText.toLowerCase().includes("no signs") || verdictText.toLowerCase().includes("verified");

  const verdictBadgeStyle = isManipulated
    ? "bg-red-950/60 text-red-300 border-red-800/60"
    : isNoSigns
    ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
    : "bg-amber-950/60 text-amber-300 border-amber-800/60";

  const handleToggleSave = () => {
    const updated = toggleSaveReport(report.reportId);
    setIsSaved(updated);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportPdf = () => {
    exportReportPdf(report);
  };

  const handleAddToVault = async () => {
    try {
      await saveToVault(report, "Archived from report view", report.category || "Misinformation");
      setVaultAdded(true);
      setTimeout(() => setVaultAdded(false), 2500);
    } catch (err) {
      alert("Failed to save to vault: " + err.message);
    }
  };

  // Action protocol for this report category
  const protocol = getActionProtocol(report.category || "misinformation", report.score || 50);

  return (
    <div className="min-h-screen bg-[#0D0E11] text-gray-100 flex flex-col">
      {/* Top Header */}
      <header className="h-16 px-6 lg:px-12 border-b border-[#202227] bg-[#121316]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Action Buttons: Save, Share, Export PDF, Add to Evidence Vault */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
              isSaved
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-[#181A20] text-gray-300 border-[#2A2D36] hover:text-white hover:bg-[#22242D]"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#181A20] border border-[#2A2D36] hover:text-white hover:bg-[#22242D] rounded-xl transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copied" : "Share"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#181A20] border border-[#2A2D36] hover:text-white hover:bg-[#22242D] rounded-xl transition-all"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleAddToVault}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] rounded-xl shadow-md transition-all"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{vaultAdded ? "Added to Vault!" : "Add to Vault"}</span>
          </button>
        </div>
      </header>

      {/* Main Report Container */}
      <main className="p-6 lg:p-12 max-w-5xl w-full mx-auto space-y-8 flex-1">
        {/* ========================================================
            A. VERDICT SECTION
            ======================================================== */}
        <section className="p-8 bg-[#141519] border border-[#24262E] rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#22242B]">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${verdictBadgeStyle}`}>
                  {verdictText}
                </span>
                <span className="text-xs font-mono text-gray-500">
                  Audit #{report.reportId}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
                {report.claimText || report.inputText}
              </h1>
            </div>

            {/* Score Pill */}
            <div className="p-5 bg-[#191B21] border border-[#2B2E37] rounded-2xl flex flex-col items-center justify-center flex-shrink-0 min-w-[130px]">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                Trust Score
              </span>
              <div className="text-4xl font-bold font-mono text-white mt-1">
                {report.score ?? 50}
              </div>
              <div className="text-xs font-mono text-gray-400 mt-1">
                {report.confidence?.margin ? `±${report.confidence.margin} margin` : "Evaluated"}
              </div>
            </div>
          </div>

          {/* One-Line Reason */}
          <div className="pt-6">
            <p className="text-sm text-gray-300 leading-relaxed">
              <strong className="text-white">Summary Finding: </strong>
              {report.scoringResult?.verdictSummary ||
                "Evaluated against multi-source wire news reports, institutional domain records, and syndication clustering."}
            </p>
          </div>
        </section>

        {/* ========================================================
            B. EVIDENCE CARDS & SUB-SCORES
            ======================================================== */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#D95D39]" />
            <span>Deterministic Evidence Sub-Scores</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl">
              <span className="text-xs text-gray-400 block mb-1">Source Reliability</span>
              <div className="text-2xl font-bold font-mono text-white">
                {report.scoringResult?.components?.sourceReliability ?? 75}/100
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Average authority of reporting domains
              </p>
            </div>

            <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl">
              <span className="text-xs text-gray-400 block mb-1">Independent Coverage</span>
              <div className="text-2xl font-bold font-mono text-sky-400">
                {report.scoringResult?.components?.independentCoverage ?? 80}/100
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Deduplicated cluster diversity
              </p>
            </div>

            <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl">
              <span className="text-xs text-gray-400 block mb-1">Contradiction Strength</span>
              <div className="text-2xl font-bold font-mono text-[#D95D39]">
                {report.scoringResult?.components?.contradictionStrength ?? 40}/100
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Stance ratio refuting assertion
              </p>
            </div>

            <div className="p-5 bg-[#141519] border border-[#24262E] rounded-2xl">
              <span className="text-xs text-gray-400 block mb-1">Claim Specificity</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {report.scoringResult?.components?.claimSpecificity ?? 70}/100
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Verifiable factual proposition density
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            C. SOURCES GROUPED BY INDEPENDENCE
            ======================================================== */}
        <section className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#22242B]">
            <div>
              <h2 className="text-base font-bold text-white">
                Sources Grouped by Independence
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {report.sources?.length || 0} news articles evaluated across{" "}
                {report.clusteringResult?.independentSourceCount || 1} independent source cluster(s).
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono bg-[#1E2028] text-gray-300 rounded-lg border border-[#2D303C]">
              Union-Find Isolated
            </span>
          </div>

          {/* Sources List */}
          <div className="space-y-3">
            {(!report.sources || report.sources.length === 0) ? (
              <p className="text-xs text-gray-500 py-4">No wire reports retrieved for this query.</p>
            ) : (
              report.sources.map((src, idx) => {
                const isContradict = src.stance === "CONTRADICT";
                const isSupport = src.stance === "SUPPORT";
                return (
                  <div
                    key={idx}
                    className="p-4 bg-[#17191F] border border-[#262831] hover:border-[#383C48] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white hover:underline cursor-pointer">
                          {src.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isContradict
                              ? "bg-red-950/60 text-red-400 border-red-800/40"
                              : isSupport
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                              : "bg-[#20222A] text-gray-400 border-[#2D303B]"
                          }`}
                        >
                          {src.stance || "IRRELEVANT"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="font-medium text-gray-300">{src.source || src.domain}</span>
                        <span>•</span>
                        <span>Reliability: {Math.round((src.reliability || 0.75) * 100)}%</span>
                        {src.country && (
                          <>
                            <span>•</span>
                            <span>{src.country}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#D95D39] hover:underline flex items-center gap-1 flex-shrink-0"
                      >
                        <span>Source Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================
            D. MEDIA FORENSICS (ONLY WHEN IMAGE WAS SUBMITTED)
            ======================================================== */}
        {report.submittedMedia && (
          <section className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#22242B]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#D95D39]" />
                  <span>On-Device Media Forensics (ELA & EXIF)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Error Level Analysis canvas heatmap and camera metadata inspected locally on this device.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                Client-Side Compute
              </span>
            </div>

            {forensicsStatus === "computing" ? (
              <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-[#D95D39] border-t-transparent rounded-full animate-spin" />
                <span>Computing Error Level Analysis and parsing image metadata...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ELA Heatmap Canvas */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-gray-300 block">
                    ELA Heatmap Resynthesis
                  </span>
                  <div className="p-3 bg-[#111216] border border-[#262831] rounded-xl flex items-center justify-center min-h-[220px]">
                    {elaResult?.elaCanvas ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: `<img src="${elaResult.elaCanvas.toDataURL()}" style="max-height:220px; border-radius:8px; object-fit:contain;" alt="ELA Heatmap" />`,
                        }}
                      />
                    ) : (
                      <div className="text-xs text-gray-500">
                        {report.submittedMedia.previewUrl ? (
                          <img
                            src={report.submittedMedia.previewUrl}
                            alt="Submitted media"
                            className="max-h-[220px] rounded-lg object-contain"
                          />
                        ) : (
                          "Canvas rendering completed."
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>Quality: {elaQuality * 100}%</span>
                    <span>Amplification: {elaAmp}x</span>
                  </div>
                </div>

                {/* EXIF Metadata Card */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-gray-300 block">
                    EXIF Hardware & Edit Signatures
                  </span>
                  <div className="p-4 bg-[#111216] border border-[#262831] rounded-xl text-xs space-y-2 h-[220px] overflow-y-auto font-mono">
                    {exifResult ? (
                      <>
                        <div className="flex justify-between border-b border-[#202228] pb-1.5">
                          <span className="text-gray-500">Camera Make:</span>
                          <span className="text-white">{exifResult.Make || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#202228] pb-1.5">
                          <span className="text-gray-500">Model:</span>
                          <span className="text-white">{exifResult.Model || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#202228] pb-1.5">
                          <span className="text-gray-500">Software:</span>
                          <span className="text-[#D95D39] font-bold">
                            {exifResult.Software || "Stripped / None"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-[#202228] pb-1.5">
                          <span className="text-gray-500">Date Taken:</span>
                          <span className="text-white">
                            {exifResult.DateTimeOriginal ? new Date(exifResult.DateTimeOriginal).toLocaleDateString() : "No timestamp"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Compression:</span>
                          <span className="text-white">{exifResult.Compression || "Standard"}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 py-6 text-center">
                        No standard EXIF headers found. Headers may have been stripped by messaging apps.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================
            E. ACTION PATH & STATUTORY HELPLINES
            ======================================================== */}
        <section className="p-6 bg-[#141519] border border-[#24262E] rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#22242B]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Recommended Action Path</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Statutory escalation procedures, evidence preservation steps, and emergency hotlines.
              </p>
            </div>

            {/* Helpline Buttons */}
            <div className="flex items-center gap-2">
              <a
                href="tel:1930"
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 shadow"
              >
                <span>Call 1930</span>
              </a>
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold text-gray-200 bg-[#1E2028] hover:bg-[#272A34] border border-[#2E313D] rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span>cybercrime.gov.in</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="space-y-3">
            {protocol?.steps?.map((step, idx) => (
              <div
                key={idx}
                onClick={() => setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                className="p-3.5 bg-[#17191F] border border-[#242730] hover:border-[#333742] rounded-xl flex items-start gap-3 cursor-pointer transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-all ${
                    checkedSteps[idx]
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "border-gray-500 bg-[#1C1E26]"
                  }`}
                >
                  {checkedSteps[idx] && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${checkedSteps[idx] ? "line-through text-gray-500" : "text-white"}`}>
                    {step.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            F. LIMITS OF THIS CHECK & AUDIT ID
            ======================================================== */}
        <section className="p-6 bg-[#111215] border border-[#202227] rounded-2xl text-xs space-y-4">
          <div className="flex items-center gap-2 text-gray-400 font-semibold">
            <Info className="w-4 h-4 text-[#D95D39]" />
            <span>Limits of this Check</span>
          </div>
          <p className="text-gray-400 leading-relaxed">
            This verification score is generated deterministically from open news wires (GDELT DOC 2.0, Google News RSS, and governmental portal feeds) deduplicated via Union-Find clustering. It represents algorithmic corroboration strength at the time of inquiry. In situations of ongoing breaking news or coordinated syndication, independent evidence counts may evolve.
          </p>
          <div className="pt-3 border-t border-[#1C1E24] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-gray-500">
            <div>
              <span>Audit ID: </span>
              <span className="text-gray-300">{report.reportId}</span>
            </div>
            {report.audit?.auditHash && (
              <div className="truncate max-w-sm">
                <span>SHA-256 Digest: </span>
                <span className="text-gray-400">{report.audit.auditHash}</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0E11] text-gray-400 p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#D95D39] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading verification report...</span>
          </div>
        </div>
      }
    >
      <ReportDetailContent />
    </React.Suspense>
  );
}

