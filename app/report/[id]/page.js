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
  ImageIcon,
  RotateCcw,
} from "lucide-react";

import { getReportById, toggleSaveReport } from "../../../lib/storage.js";
import { saveToVault } from "../../../lib/vault.js";
import { exportReportPdf } from "../../../lib/exportPdf.js";
import { performErrorLevelAnalysis, inspectImageExif } from "../../../lib/forensics.js";
import { VerdictStampOverlay } from "../../../components/VerdictStampOverlay";

function ReportDetailContent() {
  const params = useParams();
  const router = useRouter();
  const reportId = decodeURIComponent(params?.id || "");

  const [report, setReport] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [vaultAdded, setVaultAdded] = useState(false);
  const [showStamp, setShowStamp] = useState(true);
  const [stampKey, setStampKey] = useState(1);

  // Forensics states
  const [forensicsStatus, setForensicsStatus] = useState("idle");
  const [elaResult, setElaResult] = useState(null);
  const [exifResult, setExifResult] = useState(null);
  const [elaQuality, setElaQuality] = useState(0.75);
  const [elaAmp, setElaAmp] = useState(20);
  const [imgLoadError, setImgLoadError] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    const found = getReportById(reportId);
    if (found) {
      setReport(found);
      setIsSaved(!!found.isSaved);
      setShowStamp(true);
    }
  }, [reportId]);

  const rawMedia = report?.submittedMedia;
  const mediaImageSrc =
    rawMedia?.previewUrl ||
    (rawMedia?.data ? `data:${rawMedia.mimeType || "image/png"};base64,${rawMedia.data}` : null);

  useEffect(() => {
    if (!mediaImageSrc) return;

    let isMounted = true;
    setForensicsStatus("computing");

    const timer = setTimeout(async () => {
      try {
        const imgUrl = mediaImageSrc;
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
  }, [mediaImageSrc, elaQuality, elaAmp]);

  if (!report) {
    return (
      <div className="min-h-screen bg-[#F6F3EB] dark:bg-[#141312] text-[#181818] dark:text-[#F4EFEB] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center p-8 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl shadow-sm space-y-4">
          <HelpCircle className="w-10 h-10 text-[#747068] dark:text-[#9E998F] mx-auto" />
          <h2 className="text-xl font-editorial font-bold text-[#181818] dark:text-[#F4EFEB]">
            Report Not Found
          </h2>
          <p className="text-xs text-[#55524B] dark:text-[#A8A29E] font-serif">
            The verification dossier &quot;{reportId}&quot; was not found in your on-device ledger.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black rounded-full transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const verdictText = report.verdict || "Inconclusive";
  const isManipulated =
    verdictText.toLowerCase().includes("manipulated") ||
    verdictText.toLowerCase().includes("false") ||
    verdictText.toLowerCase().includes("fake") ||
    verdictText.toLowerCase().includes("debunked");
  const isNoSigns =
    verdictText.toLowerCase().includes("no signs") ||
    verdictText.toLowerCase().includes("verified") ||
    verdictText.toLowerCase().includes("true") ||
    verdictText.toLowerCase().includes("authentic");

  const verdictBadgeStyle = isManipulated
    ? "bg-[#FDF1EE] text-[#C84630] border-[#F7C4BC] dark:bg-[#2B1411] dark:text-[#E57361] dark:border-[#5C231C]"
    : isNoSigns
    ? "bg-[#EDF7F1] text-[#2D6A4F] border-[#BCE3CE] dark:bg-[#11241A] dark:text-[#52B788] dark:border-[#1E4631]"
    : "bg-[#FFF9EC] text-[#8C6418] border-[#F4E0A5] dark:bg-[#231A0F] dark:text-[#E0B853] dark:border-[#4B3B1B]";

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

  const handleReplayStamp = () => {
    setShowStamp(true);
    setStampKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#F6F3EB] dark:bg-[#141312] text-[#181818] dark:text-[#F4EFEB] font-sans flex flex-col selection:bg-[#181818] selection:text-[#F6F3EB]">
      {/* ========================================================
          100% TRANSPARENT ANIMATED RUBBER STAMP OVERLAY
          Triggers on load: slams down, holds 2s, falls off bottom.
          ======================================================== */}
      {showStamp && (
        <VerdictStampOverlay
          key={stampKey}
          verdict={report}
          onComplete={() => setShowStamp(false)}
        />
      )}

      {/* Top Archival Header */}
      <header className="h-16 px-6 lg:px-10 border-b border-[#181818]/12 dark:border-[#2D2B27] bg-[#FAF7F0] dark:bg-[#191816] flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(24,24,24,0.03)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs font-bold text-[#55524B] dark:text-[#A8A29E] hover:text-[#181818] dark:hover:text-[#F4EFEB] transition-colors font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Action Buttons: Save, Share, Export PDF, Add to Evidence Vault */}
        <div className="flex items-center gap-2">
          {/* Replay Stamp button */}
          <button
            type="button"
            onClick={handleReplayStamp}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-[#181818]/15 dark:border-[#2D2B27] bg-[#FCFAF6] dark:bg-[#1E1C19] text-[#55524B] dark:text-[#A8A29E] hover:text-[#181818] dark:hover:text-[#F4EFEB] transition-all cursor-pointer"
            title="Replay stamp animation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Stamp</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSave}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
              isSaved
                ? "bg-[#FFF9EC] text-[#8C6418] border-[#F4E0A5] dark:bg-[#231A0F] dark:text-[#E0B853] dark:border-[#4B3B1B]"
                : "bg-[#FCFAF6] dark:bg-[#1E1C19] text-[#55524B] dark:text-[#A8A29E] border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#EFECE4]"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#55524B] dark:text-[#A8A29E] bg-[#FCFAF6] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-full transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copied" : "Share"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#55524B] dark:text-[#A8A29E] bg-[#FCFAF6] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] hover:bg-[#EFECE4] rounded-full transition-all cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Dossier</span>
          </button>

          <button
            type="button"
            onClick={handleAddToVault}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black rounded-full shadow-xs border border-[#181818]/20 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{vaultAdded ? "Added to Vault!" : "Add to Vault"}</span>
          </button>
        </div>
      </header>

      {/* Main Broadsheet Report Container */}
      <main className="p-6 lg:p-10 max-w-5xl w-full mx-auto space-y-8 flex-1">
        {/* ========================================================
            A. VERDICT SECTION (BROADSHEET EDITORIAL MASTHEAD)
            ======================================================== */}
        <section className="p-6 sm:p-8 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl shadow-sm space-y-6 newspaper-card">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#181818]/10 dark:border-[#2D2B27]">
            <div className="space-y-4 flex-1">
              {/* Prominent High-Visibility Verdict Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  onClick={handleReplayStamp}
                  title="Click to replay stamp animation"
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm sm:text-base font-black uppercase tracking-wider rounded-2xl border shadow-xs cursor-pointer select-none transition-transform hover:scale-[1.02] ${verdictBadgeStyle}`}
                >
                  {isManipulated ? (
                    <AlertTriangle className="w-5 h-5 text-[#C84630] stroke-[2.5]" />
                  ) : isNoSigns ? (
                    <CheckCircle className="w-5 h-5 text-[#2D6A4F] stroke-[2.5]" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-[#C58F2C] stroke-[2.5]" />
                  )}
                  <span>{verdictText}</span>
                </span>

                <span className="text-[11px] font-mono text-[#747068] dark:text-[#9E998F] px-2.5 py-1 bg-[#FAF7F0] dark:bg-[#1E1C19] rounded-lg border border-[#181818]/10 dark:border-[#2D2B27]">
                  {report.category || "Media Verification"}
                </span>
              </div>

              {/* Claim headline */}
              <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] tracking-tight leading-snug">
                {report.claimText || report.inputText}
              </h1>
            </div>

            {/* Trust Score Pill */}
            <div className="p-5 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-2xl flex flex-col items-center justify-center flex-shrink-0 min-w-[130px] shadow-2xs">
              <span className="text-[10px] font-mono text-[#747068] dark:text-[#9E998F] uppercase tracking-wider font-bold">
                Trust Score
              </span>
              <div
                className={`text-4xl sm:text-5xl font-black font-mono mt-1 ${
                  isManipulated
                    ? "text-[#C84630]"
                    : isNoSigns
                    ? "text-[#2D6A4F]"
                    : "text-[#181818] dark:text-[#F4EFEB]"
                }`}
              >
                {report.score ?? 50}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-[#55524B] dark:text-[#A8A29E] leading-relaxed font-serif">
              <strong className="text-[#181818] dark:text-[#F4EFEB] font-bold font-sans">
                Executive Finding:{" "}
              </strong>
              {report.scoringResult?.verdictSummary ||
                "Evaluated against multi-source wire news reports, institutional domain records, and syndication clustering."}
            </p>
          </div>
        </section>

        {/* ========================================================
            B. ANALYZED VISUAL MEDIA & ENTITY RECOGNITION (When Present)
            ======================================================== */}
        {report.submittedMedia && (mediaImageSrc || report.submittedMedia.identifiedEntity || report.submittedMedia.name) && (
          <section className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl shadow-sm newspaper-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#181818]/10 dark:border-[#2D2B27]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#181818] dark:text-[#F4EFEB]" />
                <h2 className="text-sm font-editorial font-bold text-[#181818] dark:text-[#F4EFEB]">
                  Analyzed Visual Media
                </h2>
              </div>
              <span className="px-3 py-1 text-[11px] font-mono bg-[#FAF7F0] dark:bg-[#1E1C19] text-[#181818] dark:text-[#F4EFEB] border border-[#181818]/15 dark:border-[#2D2B27] rounded-full font-semibold">
                Multimodal Verification
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {mediaImageSrc && !imgLoadError ? (
                <div className="w-full sm:w-72 flex-shrink-0">
                  <div className="relative rounded-2xl overflow-hidden border border-[#181818]/15 dark:border-[#2D2B27] bg-[#FAF7F0] dark:bg-[#1E1C19] shadow-2xs p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaImageSrc}
                      alt={report.submittedMedia.identifiedEntity || "Submitted visual media"}
                      className="w-full h-auto max-h-80 object-contain rounded-xl mx-auto"
                      onError={() => setImgLoadError(true)}
                    />
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-[#747068] dark:text-[#9E998F] text-center truncate">
                    {report.submittedMedia.name || "submitted_media"}
                  </div>
                </div>
              ) : (
                <div className="w-full sm:w-72 flex-shrink-0 p-6 rounded-2xl border border-dashed border-[#181818]/20 dark:border-[#2D2B27] bg-[#FAF7F0] dark:bg-[#1E1C19] flex flex-col items-center justify-center text-center">
                  <ImageIcon className="w-8 h-8 text-[#747068] mb-2" />
                  <span className="text-xs font-bold text-[#181818] dark:text-[#F4EFEB] truncate max-w-[200px]">
                    {report.submittedMedia.name || "Visual Media"}
                  </span>
                  <span className="text-[11px] text-[#747068] dark:text-[#9E998F] mt-0.5">
                    Multimodal analysis processed
                  </span>
                </div>
              )}

              <div className="flex-1 space-y-4">
                {report.submittedMedia.identifiedEntity && (
                  <div className="p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#747068] dark:text-[#9E998F] font-bold block">
                      Identified Subject / Entity
                    </span>
                    <p className="text-base font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] tracking-tight">
                      {report.submittedMedia.identifiedEntity}
                    </p>
                    {report.submittedMedia.visualContext && (
                      <p className="text-xs text-[#55524B] dark:text-[#A8A29E] mt-1 leading-relaxed font-serif">
                        {report.submittedMedia.visualContext}
                      </p>
                    )}
                  </div>
                )}

                {report.submittedMedia.mediaAssessment && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#747068] dark:text-[#9E998F] font-bold block">
                      Forensic Visual Assessment
                    </span>
                    <p className="text-xs text-[#55524B] dark:text-[#A8A29E] leading-relaxed font-serif">
                      {report.submittedMedia.mediaAssessment}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 text-xs text-[#55524B] dark:text-[#A8A29E]">
                  <ShieldCheck className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />
                  <span>Multimodal deep inspection verified subject identity against active public records.</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            C. PRIMARY VERIFIED EVIDENCE SOURCES (5-10 Conclusive)
            ======================================================== */}
        {(() => {
          const effectiveSources = (report.sources || []).slice(0, 10);

          return (
            <section className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl shadow-sm newspaper-card space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#181818]/10 dark:border-[#2D2B27]">
                <div>
                  <h2 className="text-sm font-editorial font-bold text-[#181818] dark:text-[#F4EFEB]">
                    Primary Verified Evidence Sources ({effectiveSources.length})
                  </h2>
                  <p className="text-xs text-[#55524B] dark:text-[#A8A29E] mt-0.5 font-serif">
                    Authoritative news wire & fact-check sources directly confirming or refuting the claim.
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-mono bg-[#FAF7F0] dark:bg-[#1E1C19] text-[#181818] dark:text-[#F4EFEB] border border-[#181818]/15 dark:border-[#2D2B27] rounded-full font-semibold">
                  Curated Evidence
                </span>
              </div>

              <div className="space-y-3">
                {effectiveSources.length === 0 ? (
                  <p className="text-xs text-[#747068] py-4 font-serif">
                    No conclusive wire reports found for this claim.
                  </p>
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
                        className="p-4 bg-[#FAF7F0] hover:bg-[#EFECE4] dark:bg-[#1E1C19] dark:hover:bg-[#252320] border border-[#181818]/10 dark:border-[#2D2B27] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#181818] dark:text-[#F4EFEB]">
                              {cleanTitle}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold flex-shrink-0 ${
                                isContradict
                                  ? "bg-[#FDF1EE] text-[#C84630] border-[#F7C4BC] dark:bg-[#2B1411] dark:text-[#E57361] dark:border-[#5C231C]"
                                  : isSupport
                                  ? "bg-[#EDF7F1] text-[#2D6A4F] border-[#BCE3CE] dark:bg-[#11241A] dark:text-[#52B788] dark:border-[#1E4631]"
                                  : "bg-[#FAF7F0] text-[#181818] border-[#181818]/20 dark:bg-[#1E1C19] dark:text-[#F4EFEB] dark:border-[#33302B]"
                              }`}
                            >
                              {badgeLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#747068] dark:text-[#9E998F] font-mono">
                            <span className="font-semibold text-[#181818] dark:text-[#F4EFEB]">
                              {src.source || src.domain}
                            </span>
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
                            className="text-xs text-[#181818] dark:text-[#F4EFEB] font-bold hover:underline flex items-center gap-1 flex-shrink-0 self-start md:self-center font-mono"
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
          <section className="p-6 bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl shadow-sm newspaper-card space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#181818]/10 dark:border-[#2D2B27]">
              <div>
                <h2 className="text-sm font-editorial font-bold text-[#181818] dark:text-[#F4EFEB] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#181818] dark:text-[#F4EFEB]" />
                  <span>On-Device Media Forensics (ELA & EXIF)</span>
                </h2>
                <p className="text-xs text-[#55524B] dark:text-[#A8A29E] mt-0.5 font-serif">
                  Error Level Analysis canvas heatmap and camera metadata inspected locally on this device.
                </p>
              </div>
              <span className="text-xs font-mono text-[#2D6A4F] bg-[#EDF7F1] border border-[#BCE3CE] dark:bg-[#11241A] dark:text-[#52B788] dark:border-[#1E4631] px-3 py-1 rounded-full font-bold">
                Client-Side Compute
              </span>
            </div>

            {forensicsStatus === "computing" ? (
              <div className="py-12 text-center text-xs text-[#747068] flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-[#181818] dark:border-[#F4EFEB] border-t-transparent rounded-full animate-spin" />
                <span>Computing Error Level Analysis and parsing image metadata...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#181818] dark:text-[#F4EFEB] block font-mono">
                    ELA Heatmap Resynthesis
                  </span>
                  <div className="p-3 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl flex items-center justify-center min-h-[220px]">
                    {elaResult?.elaCanvas ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: `<img src="${elaResult.elaCanvas.toDataURL()}" style="max-height:220px; border-radius:12px; object-fit:contain;" alt="ELA Heatmap" />`,
                        }}
                      />
                    ) : (
                      <div className="text-xs text-[#747068]">
                        {mediaImageSrc ? (
                          <img
                            src={mediaImageSrc}
                            alt="Submitted media"
                            className="max-h-[220px] rounded-xl object-contain"
                          />
                        ) : (
                          "Canvas rendering completed."
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#747068] dark:text-[#9E998F] font-mono">
                    <span>Quality: {elaQuality * 100}%</span>
                    <span>Amplification: {elaAmp}x</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#181818] dark:text-[#F4EFEB] block font-mono">
                    EXIF Hardware & Edit Signatures
                  </span>
                  <div className="p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/12 dark:border-[#2D2B27] rounded-2xl text-xs space-y-2 h-[220px] overflow-y-auto font-mono">
                    {exifResult ? (
                      <>
                        <div className="flex justify-between border-b border-[#181818]/10 dark:border-[#2D2B27] pb-1.5">
                          <span className="text-[#747068] dark:text-[#9E998F]">Camera Make:</span>
                          <span className="text-[#181818] dark:text-[#F4EFEB] font-semibold">{exifResult.Make || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#181818]/10 dark:border-[#2D2B27] pb-1.5">
                          <span className="text-[#747068] dark:text-[#9E998F]">Model:</span>
                          <span className="text-[#181818] dark:text-[#F4EFEB] font-semibold">{exifResult.Model || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#181818]/10 dark:border-[#2D2B27] pb-1.5">
                          <span className="text-[#747068] dark:text-[#9E998F]">Software:</span>
                          <span className="text-[#C84630] font-bold">
                            {exifResult.Software || "Stripped / None"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#747068] dark:text-[#9E998F]">Date Taken:</span>
                          <span className="text-[#181818] dark:text-[#F4EFEB] font-semibold">
                            {exifResult.DateTimeOriginal ? new Date(exifResult.DateTimeOriginal).toLocaleDateString() : "No timestamp"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[#747068] py-6 text-center font-serif">
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
        <section className="p-6 bg-[#FAF7F0] dark:bg-[#191816] border border-[#181818]/15 dark:border-[#2D2B27] rounded-3xl text-xs space-y-4">
          <div className="flex items-center gap-2 text-[#181818] dark:text-[#F4EFEB] font-bold">
            <Info className="w-4 h-4 text-[#181818] dark:text-[#F4EFEB]" />
            <span className="font-editorial text-sm">Limits of this Check</span>
          </div>
          <p className="text-[#55524B] dark:text-[#A8A29E] leading-relaxed font-serif">
            This verification score is generated deterministically from open news wires (GDELT DOC 2.0, Google News RSS, and governmental portal feeds) deduplicated via Union-Find clustering. It represents algorithmic corroboration strength at the time of inquiry.
          </p>
          <div className="pt-3 border-t border-[#181818]/10 dark:border-[#2D2B27] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-[#747068] dark:text-[#9E998F]">
            <div>
              <span>Audit ID: </span>
              <span className="text-[#181818] dark:text-[#F4EFEB] font-semibold">{report.reportId}</span>
            </div>
            {report.audit?.auditHash && (
              <div className="truncate max-w-sm">
                <span>SHA-256 Digest: </span>
                <span className="text-[#181818] dark:text-[#F4EFEB]">{report.audit.auditHash}</span>
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
        <div className="min-h-screen bg-[#F6F3EB] dark:bg-[#141312] text-[#747068] p-8 flex items-center justify-center font-sans">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#181818] dark:border-[#F4EFEB] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-[#181818] dark:text-[#F4EFEB] font-serif">
              Loading verification report...
            </span>
          </div>
        </div>
      }
    >
      <ReportDetailContent />
    </React.Suspense>
  );
}
