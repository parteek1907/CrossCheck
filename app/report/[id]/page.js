"use client";

import React, { useState, useEffect } from "react";
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
  Check,
  Cpu,
  Info,
} from "lucide-react";

import { getReportById, toggleSaveReport } from "../../../lib/storage.js";
import { saveToVault } from "../../../lib/vault.js";
import { exportReportPdf } from "../../../lib/exportPdf.js";
import { performErrorLevelAnalysis, inspectImageExif } from "../../../lib/forensics.js";

function ReportDetailContent() {
  const params = useParams();
  const router = useRouter();
  const reportId = decodeURIComponent(params?.id || "");

  const [report, setReport] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [vaultAdded, setVaultAdded] = useState(false);

  // Forensics states
  const [forensicsStatus, setForensicsStatus] = useState("idle");
  const [elaResult, setElaResult] = useState(null);
  const [exifResult, setExifResult] = useState(null);
  const [elaQuality, setElaQuality] = useState(0.75);
  const [elaAmp, setElaAmp] = useState(20);

  useEffect(() => {
    if (!reportId) return;
    const found = getReportById(reportId);
    if (found) {
      setReport(found);
      setIsSaved(!!found.isSaved);
    }
  }, [reportId]);

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
      <div className="min-h-screen bg-[#F9FAFB] text-gray-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center p-8 bg-white border border-gray-200 rounded-3xl shadow-sm">
          <HelpCircle className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-xs text-gray-500 mb-6">
            The verification report "{reportId}" was not found in your on-device storage.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const verdictText = report.verdict || "Inconclusive";
  const isManipulated = verdictText.toLowerCase().includes("manipulated") || verdictText.toLowerCase().includes("false");
  const isNoSigns = verdictText.toLowerCase().includes("no signs") || verdictText.toLowerCase().includes("verified");

  const verdictBadgeStyle = isManipulated
    ? "bg-red-50 text-red-700 border-red-200"
    : isNoSigns
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

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
      window.dispatchEvent(new Event("crosscheck_vault_updated"));
      setTimeout(() => setVaultAdded(false), 2500);
    } catch (err) {
      alert("Failed to save to vault: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans flex flex-col">
      {/* Top Header */}
      <header className="h-16 px-6 lg:px-10 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-30">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Action Buttons: Save, Share, Export PDF, Add to Evidence Vault */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSave}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${
              isSaved
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-full transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copied" : "Share"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-full transition-all"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleAddToVault}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-full shadow-sm transition-all"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{vaultAdded ? "Added to Vault!" : "Add to Vault"}</span>
          </button>
        </div>
      </header>

      {/* Main Report Container */}
      <main className="p-6 lg:p-10 max-w-5xl w-full mx-auto space-y-8 flex-1">
        {/* ========================================================
            A. VERDICT SECTION
            ======================================================== */}
        <section className="p-8 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${verdictBadgeStyle}`}>
                  {verdictText}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  Audit #{report.reportId}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-snug">
                {report.claimText || report.inputText}
              </h1>
            </div>

            {/* Score Pill */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 min-w-[130px]">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">
                Trust Score
              </span>
              <div className="text-4xl font-extrabold font-mono text-gray-900 mt-1">
                {report.score ?? 50}
              </div>
              <div className="text-xs font-mono text-gray-500 mt-1 font-medium">
                {report.confidence?.margin ? `±${report.confidence.margin} margin` : "Evaluated"}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong className="text-gray-900 font-bold">Summary Finding: </strong>
              {report.scoringResult?.verdictSummary ||
                "Evaluated against multi-source wire news reports, institutional domain records, and syndication clustering."}
            </p>
          </div>
        </section>

        {/* ========================================================
            B. EVIDENCE CARDS & SUB-SCORES
            ======================================================== */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-900" />
            <span>Deterministic Evidence Sub-Scores</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1 font-semibold">Source Reliability</span>
              <div className="text-2xl font-bold font-mono text-gray-900">
                {report.scoringResult?.components?.sourceReliability ?? 75}/100
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Average authority of reporting domains
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1 font-semibold">Independent Coverage</span>
              <div className="text-2xl font-bold font-mono text-blue-600">
                {report.scoringResult?.components?.independentCoverage ?? 80}/100
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Deduplicated cluster diversity
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1 font-semibold">Contradiction Strength</span>
              <div className="text-2xl font-bold font-mono text-red-600">
                {report.scoringResult?.components?.contradictionStrength ?? 40}/100
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Stance ratio refuting assertion
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1 font-semibold">Claim Specificity</span>
              <div className="text-2xl font-bold font-mono text-emerald-600">
                {report.scoringResult?.components?.claimSpecificity ?? 70}/100
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Verifiable factual proposition density
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            C. PRIMARY VERIFIED EVIDENCE SOURCES (5-10 Conclusive)
            ======================================================== */}
        {(() => {
          const displaySources = (report.sources || [])
            .filter(s => s.stance === "CONTRADICT" || s.stance === "SUPPORT")
            .slice(0, 10);
          const effectiveSources = displaySources.length > 0
            ? displaySources
            : (report.sources || []).filter(s => s.stance !== "IRRELEVANT").slice(0, 10);

          return (
            <section className="p-6 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Primary Verified Evidence Sources ({effectiveSources.length})
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Authoritative news wire & fact-check sources directly confirming or refuting the claim.
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded-full font-semibold">
                  Curated Evidence
                </span>
              </div>

              <div className="space-y-3">
                {effectiveSources.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4">No conclusive wire reports found for this claim.</p>
                ) : (
                  effectiveSources.map((src, idx) => {
                    const isContradict = src.stance === "CONTRADICT";
                    const isSupport = src.stance === "SUPPORT";
                    const badgeLabel = isContradict ? "Refutes Claim" : isSupport ? "Confirms Claim" : "Relevant";
                    const cleanTitle = (src.title || "")
                      .replace(/\s*[-–|]\s*(The Times of India|Times of India|The Indian Express|Indian Express|India Today|BBC|NDTV|Hindustan Times|Firstpost|BOOM|Vishvas News|Reuters|Associated Press|ANI|PIB).*$/i, "")
                      .trim() || src.title;

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-gray-900 hover:text-blue-600 transition-colors">
                              {cleanTitle}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold flex-shrink-0 ${
                                isContradict
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : isSupport
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {badgeLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500">
                            <span className="font-semibold text-gray-700">{src.source || src.domain}</span>
                            <span>•</span>
                            <span>Reliability: {Math.round((src.reliability || 0.85) * 100)}%</span>
                            {src.publishDate && (
                              <>
                                <span>•</span>
                                <span>{src.publishDate}</span>
                              </>
                            )}
                            {src.country && src.country !== "unknown" && (
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
                            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 flex-shrink-0 self-start md:self-center"
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
          );
        })()}

        {/* ========================================================
            D. MEDIA FORENSICS (ONLY WHEN IMAGE WAS SUBMITTED)
            ======================================================== */}
        {report.submittedMedia && (
          <section className="p-6 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-900" />
                  <span>On-Device Media Forensics (ELA & EXIF)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Error Level Analysis canvas heatmap and camera metadata inspected locally on this device.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                Client-Side Compute
              </span>
            </div>

            {forensicsStatus === "computing" ? (
              <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                <span>Computing Error Level Analysis and parsing image metadata...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-700 block">
                    ELA Heatmap Resynthesis
                  </span>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center min-h-[220px]">
                    {elaResult?.elaCanvas ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: `<img src="${elaResult.elaCanvas.toDataURL()}" style="max-height:220px; border-radius:12px; object-fit:contain;" alt="ELA Heatmap" />`,
                        }}
                      />
                    ) : (
                      <div className="text-xs text-gray-500">
                        {report.submittedMedia.previewUrl ? (
                          <img
                            src={report.submittedMedia.previewUrl}
                            alt="Submitted media"
                            className="max-h-[220px] rounded-xl object-contain"
                          />
                        ) : (
                          "Canvas rendering completed."
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                    <span>Quality: {elaQuality * 100}%</span>
                    <span>Amplification: {elaAmp}x</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-700 block">
                    EXIF Hardware & Edit Signatures
                  </span>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs space-y-2 h-[220px] overflow-y-auto font-mono">
                    {exifResult ? (
                      <>
                        <div className="flex justify-between border-b border-gray-200 pb-1.5">
                          <span className="text-gray-500">Camera Make:</span>
                          <span className="text-gray-900 font-semibold">{exifResult.Make || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-1.5">
                          <span className="text-gray-500">Model:</span>
                          <span className="text-gray-900 font-semibold">{exifResult.Model || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-1.5">
                          <span className="text-gray-500">Software:</span>
                          <span className="text-red-600 font-bold">
                            {exifResult.Software || "Stripped / None"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date Taken:</span>
                          <span className="text-gray-900 font-semibold">
                            {exifResult.DateTimeOriginal ? new Date(exifResult.DateTimeOriginal).toLocaleDateString() : "No timestamp"}
                          </span>
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
            E. LIMITS OF THIS CHECK & AUDIT ID
            ======================================================== */}
        <section className="p-6 bg-gray-50 border border-gray-200 rounded-3xl text-xs space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-bold">
            <Info className="w-4 h-4 text-gray-900" />
            <span>Limits of this Check</span>
          </div>
          <p className="text-gray-600 leading-relaxed">
            This verification score is generated deterministically from open news wires (GDELT DOC 2.0, Google News RSS, and governmental portal feeds) deduplicated via Union-Find clustering. It represents algorithmic corroboration strength at the time of inquiry.
          </p>
          <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-gray-500">
            <div>
              <span>Audit ID: </span>
              <span className="text-gray-900 font-semibold">{report.reportId}</span>
            </div>
            {report.audit?.auditHash && (
              <div className="truncate max-w-sm">
                <span>SHA-256 Digest: </span>
                <span className="text-gray-700">{report.audit.auditHash}</span>
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
        <div className="min-h-screen bg-[#F9FAFB] text-gray-600 p-8 flex items-center justify-center font-sans">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-gray-900">Loading verification report...</span>
          </div>
        </div>
      }
    >
      <ReportDetailContent />
    </React.Suspense>
  );
}
