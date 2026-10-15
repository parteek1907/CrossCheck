"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  ImageIcon,
  Link2,
  File,
  Search,
  ShieldCheck,
  Scan,
  CheckCircle2,
  ArrowRight,
  Upload,
  X,
  Loader2,
  AlertCircle,
  BookOpen,
  Sparkles,
  Check,
} from "lucide-react";
import { saveStoredReport } from "../lib/storage.js";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  const [claimInput, setClaimInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Interactive Archival Collage & Newspaper States
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [photoSplit, setPhotoSplit] = useState(52); // Percentage 10 to 90
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [stampPulsed, setStampPulsed] = useState(false);
  const collageRef = useRef(null);
  const photoContainerRef = useRef(null);

  const handleCollageMouseMove = (e) => {
    if (isPaperOpen) return;
    const rect = collageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x, y });
  };

  const handleCollageMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  const handlePhotoMouseMove = (e) => {
    const rect = photoContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = e.clientX - rect.left;
    const pct = Math.max(10, Math.min(90, (offsetX / rect.width) * 100));
    setPhotoSplit(Math.round(pct));
  };

  const handleVerifyPresetStory = (storyText) => {
    setClaimInput(storyText);
    setIsPaperOpen(false);
    textInputRef.current?.focus();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateAndSetFile = (file) => {
    setErrorMessage("");
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage(
        `Unsupported file type "${file.name.split(".").pop()}". Please select a JPG, PNG, WEBP, or PDF.`
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Limit is 15MB.`
      );
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const removeSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  // Direct paste handler for images
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          validateAndSetFile(file);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Drag and drop handler on search container
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isVerifying) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleStartVerification = async (e) => {
    e?.preventDefault();
    if (isVerifying) return;

    const trimmedText = claimInput.trim();
    if (!trimmedText && !selectedFile) {
      setErrorMessage("Please enter a claim statement, web link, or upload an image to verify.");
      textInputRef.current?.focus();
      return;
    }

    setErrorMessage("");
    setIsVerifying(true);
    setProgressMsg("Connecting to verification ledger...");

    let payload = "";
    if (selectedFile) {
      payload = trimmedText
        ? `Claim regarding media [${selectedFile.name}]: ${trimmedText}`
        : `Verification of circulated media file: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`;
    } else {
      payload = trimmedText;
    }

    try {
      setProgressMsg("Evaluating claim across open wires...");
      const res = await fetch("/api/verify?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ content: payload }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `Verification failed with HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const eventMatch = line.match(/^event:\s*(\w+)/m);
          const dataMatch = line.match(/^data:\s*(.*)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);
              if (eventType === "progress") {
                setProgressMsg(data.message || "Analysing forensic signals...");
              } else if (eventType === "complete") {
                saveStoredReport(data);
                setIsVerifying(false);
                router.push(`/report/${encodeURIComponent(data.reportId)}`);
                return;
              } else if (eventType === "error") {
                throw new Error(data.error || "Verification pipeline failed.");
              }
            } catch (parseErr) {
              if (parseErr.message.includes("Verification pipeline")) throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      console.error("[Verification Error]", err);
      // Fallback to standard synchronous request if stream encounters an issue
      try {
        setProgressMsg("Finalising report synthesis...");
        const fallbackRes = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: payload }),
        });
        if (fallbackRes.ok) {
          const report = await fallbackRes.json();
          saveStoredReport(report);
          setIsVerifying(false);
          router.push(`/report/${encodeURIComponent(report.reportId)}`);
          return;
        }
      } catch {
        // Ignored fallback error
      }
      setIsVerifying(false);
      setErrorMessage(err.message || "Failed to complete verification. Please check network and try again.");
    }
  };

  const handleTabClick = (tab) => {
    setErrorMessage("");
    if (tab === "file") {
      fileInputRef.current?.click();
    } else if (tab === "link") {
      if (!claimInput.startsWith("http")) {
        setClaimInput("https://");
      }
      textInputRef.current?.focus();
    } else if (tab === "text") {
      textInputRef.current?.focus();
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-[#F6F3EB] text-[#181818] font-sans selection:bg-[#181818] selection:text-[#F6F3EB] flex flex-col justify-between">
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
      />

      {/* ========================================================
          ARCHIVAL MASTHEAD (EXACT REPLICA OF USER IMAGE)
          ======================================================== */}
      <header className="w-full relative pt-3 pb-0 flex-shrink-0">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-16">
          {/* Main Masthead Banner */}
          <div className="relative flex items-end justify-between pb-0.5">
            {/* Left Column: Stacked Mono Quote */}
            <div className="w-40 hidden sm:block text-left text-[9px] lg:text-[10px] font-mono tracking-[0.25em] text-[#55524B] uppercase leading-[1.6] select-none pb-1">
              TRUTH<br />
              DESERVES<br />
              A SECOND<br />
              LOOK<br />
              <span className="inline-block mt-0.5 tracking-normal text-[#181818]/50">—</span>
            </div>

            {/* Center: Monumental Crosscheck Wordmark with Globe */}
            <div className="relative flex-1 flex flex-col items-center justify-end">
              {/* Wireframe Globe Latitude / Longitude Vector (Upper Hemisphere) */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-[220px] sm:w-[260px] h-[95px] pointer-events-none z-0 overflow-hidden opacity-30">
                <svg viewBox="0 0 260 130" fill="none" stroke="#181818" className="w-full h-full">
                  {/* Outer sphere rim */}
                  <ellipse cx="130" cy="128" rx="110" ry="110" strokeWidth="0.8" />
                  {/* Latitude parallels */}
                  <ellipse cx="130" cy="128" rx="104" ry="75" strokeWidth="0.5" strokeDasharray="3 2" />
                  <ellipse cx="130" cy="128" rx="92" ry="46" strokeWidth="0.5" />
                  <ellipse cx="130" cy="128" rx="70" ry="24" strokeWidth="0.5" />
                  {/* Longitude meridians */}
                  <path d="M 30 128 C 30 50, 230 50, 230 128" strokeWidth="0.5" />
                  <path d="M 60 128 C 60 40, 200 40, 200 128" strokeWidth="0.5" />
                  <path d="M 90 128 C 90 30, 170 30, 170 128" strokeWidth="0.5" />
                  {/* Vertex nodes */}
                  <circle cx="130" cy="18" r="1.5" fill="#181818" />
                  <circle cx="178" cy="38" r="1.2" fill="#181818" />
                  <circle cx="82" cy="38" r="1.2" fill="#181818" />
                  <circle cx="212" cy="74" r="1.2" fill="#181818" />
                </svg>
              </div>

              {/* The Wordmark */}
              <div className="relative z-20 flex items-center justify-center leading-none">
                <span className="font-editorial text-[48px] sm:text-[66px] lg:text-[80px] tracking-[-0.01em] font-bold text-[#181818] select-none inline-flex items-center leading-none">
                  <span>Cross</span>
                  <span className="bg-gradient-to-r from-[#181818] via-[#66635C] to-[#2B2925] bg-clip-text text-transparent">
                    check
                  </span>
                </span>
                {/* 4-Pointed Sparkle Star */}
                <span className="text-[#181818] text-[26px] sm:text-[34px] lg:text-[42px] ml-1 sm:ml-2 -mt-1 font-serif select-none inline-block leading-none">
                  ✦
                </span>
              </div>
            </div>

            {/* Right Column: Stacked Mono Guidelines */}
            <div className="w-40 hidden sm:block text-right text-[9px] lg:text-[10px] font-mono tracking-[0.25em] text-[#55524B] uppercase leading-[1.6] select-none pb-1">
              VERIFY<br />
              UNDERSTAND<br />
              QUESTION<br />
              BE SAFER<br />
              <span className="inline-block mt-0.5 tracking-normal text-[#181818]/50">—</span>
            </div>
          </div>
        </div>

        {/* Ticker Sub-bar with Hairlines & Dividers */}
        <div className="w-full border-y border-[#181818]/15 bg-[#F6F3EB]">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-16 py-2 flex items-center justify-between text-[10px] sm:text-[11px] font-mono tracking-[0.22em] text-[#55524B] uppercase">
            <div className="w-40 text-left font-medium">EST. 2026</div>
            <div className="hidden sm:flex items-center gap-6 font-medium tracking-[0.26em]">
              <span className="text-[#181818]/30">|</span>
              <span>INDEPENDENT DIGITAL VERIFICATION</span>
              <span className="text-[#181818]/30">|</span>
            </div>
            <div className="w-40 text-right font-medium tracking-[0.18em]">
              ALL FACTS. A CLEARER WORLD.
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          HERO WORKSPACE (FITS COMFORTABLY IN REMAINING VIEWPORT)
          ======================================================== */}
      <main className="flex-1 max-w-[1360px] mx-auto w-full px-6 sm:px-10 lg:px-16 py-3 sm:py-5 lg:py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center min-h-0">
        {/* LEFT COLUMN: HERO COPY & SEARCH INPUT */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-4 sm:space-y-5 lg:space-y-6 pr-0 lg:pr-4">
          {/* Overline with thin dash */}
          <div className="space-y-1.5">
            <div className="w-7 h-[1px] bg-[#181818]/50" />
            <div className="text-[10px] font-mono tracking-[0.22em] text-[#55524B] uppercase font-semibold leading-relaxed">
              REAL INFORMATION<br />
              BUILDS A SAFER TOMORROW —
            </div>
          </div>

          {/* Main Editorial Headline */}
          <h1 className="font-editorial text-[44px] sm:text-[56px] lg:text-[64px] xl:text-[70px] leading-[1.01] tracking-[-0.015em] text-[#181818]">
            Before you<br />
            believe it,<br />
            <span className="italic">crosscheck it.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#4A4742] max-w-md font-sans">
            Analyse claims, images, and links. Uncover manipulation,
            misinformation, and online risks — with clear evidence, not opinions.
          </p>

          {/* Search Box / Dropzone Container */}
          <div className="pt-1 max-w-xl">
            <form
              onSubmit={handleStartVerification}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`rounded-2xl border ${
                selectedFile ? "border-[#181818] bg-[#FAF7F0]" : "border-[#181818] bg-[#FCFAF6]"
              } p-2 pl-3.5 flex flex-col gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-[#181818]/15 transition-all`}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="text-[#666] flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-[#444]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <circle cx="10" cy="14" r="2.5" />
                      <line x1="12" y1="16" x2="14" y2="18" />
                    </svg>
                  </div>
                  <input
                    ref={textInputRef}
                    type="text"
                    disabled={isVerifying}
                    value={claimInput}
                    onChange={(e) => setClaimInput(e.target.value)}
                    placeholder={
                      selectedFile
                        ? `Add context or claim regarding ${selectedFile.name}...`
                        : "Paste a claim, link, message or drop an image here..."
                    }
                    className="w-full text-xs sm:text-[13px] bg-transparent placeholder:text-[#88857E] text-[#181818] focus:outline-none font-sans"
                  />
                </div>

                {/* Upload Image Button Right Here in Search Bar */}
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#181818]/20 hover:border-[#181818] bg-[#F2EDE2] hover:bg-[#EAE4D7] text-[#181818] text-xs font-semibold transition-all flex-shrink-0"
                  title="Upload an image or document file"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upload Image</span>
                </button>

                {/* Verify Now Action Button */}
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-[#181818] hover:bg-black text-[#F6F3EB] text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 disabled:opacity-75 shadow-xs"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Uploaded File Chip (if selected) */}
              {selectedFile && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#EFE9DC] border border-[#181818]/15 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {filePreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={filePreviewUrl}
                        alt="Upload preview"
                        className="w-5 h-5 rounded object-cover border border-[#181818]/20 flex-shrink-0"
                      />
                    ) : (
                      <File className="w-4 h-4 text-[#555] flex-shrink-0" />
                    )}
                    <span className="font-semibold text-[#181818] truncate max-w-[240px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-[#666] font-mono">
                      ({formatFileSize(selectedFile.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="p-1 rounded text-[#777] hover:text-[#181818] transition-colors"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </form>

            {/* Error Feedback */}
            {errorMessage && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Verification Progress Message */}
            {isVerifying && (
              <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[#55524B] px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#181818]" />
                <span>{progressMsg}</span>
              </div>
            )}

            {/* Input Type Selectors (Clicking triggers file or input mode directly, NO popup) */}
            <div className="flex items-center gap-4 sm:gap-5 text-xs font-medium text-[#4A4742] pt-2.5 px-2">
              <button
                type="button"
                onClick={() => handleTabClick("text")}
                className="flex items-center gap-1.5 hover:text-[#181818] transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#666]" />
                <span>Text</span>
              </button>
              <span className="text-[#CCC8BF] select-none">|</span>
              <button
                type="button"
                onClick={() => handleTabClick("file")}
                className="flex items-center gap-1.5 hover:text-[#181818] transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#666]" />
                <span>Image</span>
              </button>
              <span className="text-[#CCC8BF] select-none">|</span>
              <button
                type="button"
                onClick={() => handleTabClick("link")}
                className="flex items-center gap-1.5 hover:text-[#181818] transition-colors"
              >
                <Link2 className="w-3.5 h-3.5 text-[#666]" />
                <span>Link</span>
              </button>
              <span className="text-[#CCC8BF] select-none">|</span>
              <button
                type="button"
                onClick={() => handleTabClick("file")}
                className="flex items-center gap-1.5 hover:text-[#181818] transition-colors"
              >
                <File className="w-3.5 h-3.5 text-[#666]" />
                <span>Document</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ARCHIVAL FORENSIC COLLAGE (INTERACTIVE & ALIVE) */}
        <div
          ref={collageRef}
          onMouseMove={handleCollageMouseMove}
          onMouseLeave={handleCollageMouseLeave}
          className="lg:col-span-6 xl:col-span-6 relative flex justify-center items-center py-2 select-none perspective-1000"
        >
          {/* Subtle Technical / Compass Background Graphics */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              className="w-full h-full max-w-[520px] opacity-20 text-[#181818]"
              viewBox="0 0 500 500"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="250" cy="250" r="210" strokeWidth="0.75" strokeDasharray="3 3" />
              <circle cx="250" cy="250" r="160" strokeWidth="0.5" />
              <circle cx="250" cy="250" r="85" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="250" y1="10" x2="250" y2="490" strokeWidth="0.5" />
              <line x1="10" y1="250" x2="490" y2="250" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Plus Registration Marks */}
          <div className="absolute top-1 right-2 text-xs font-mono text-[#181818]/60 pointer-events-none">+</div>
          <div className="absolute bottom-6 right-2 text-xs font-mono text-[#181818]/60 pointer-events-none">+</div>
          <div className="absolute bottom-4 left-16 text-sm font-mono text-[#181818]/80 font-bold pointer-events-none">+</div>

          {/* Top Right Annotation */}
          <div className="absolute top-0 right-2 sm:right-6 text-right font-mono uppercase text-[#44423D] z-30 pointer-events-none">
            <div className="text-[10px] tracking-[0.22em] font-semibold">SAME IMAGE.</div>
            <div className="text-[10px] tracking-[0.22em] font-semibold">DIFFERENT REALITIES.</div>
            <div className="w-8 h-[1px] bg-[#181818]/40 ml-auto mt-1" />
          </div>

          {/* ============================================================
              STATE A: UNFOLDED ARCHIVAL NEWSPAPER BROADSHEET (CLICKED)
              ============================================================ */}
          {isPaperOpen ? (
            <div className="relative w-full max-w-[500px] h-[360px] sm:h-[390px] bg-[#FAF6EE] border-2 border-[#181818] shadow-[0_16px_40px_rgba(0,0,0,0.12)] p-3 sm:p-4 rounded-xs flex flex-col justify-between font-serif z-40 transition-all duration-300">
              {/* Archival Newspaper Masthead */}
              <div className="border-b-2 border-[#181818] pb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-editorial text-sm sm:text-base font-bold text-[#181818] tracking-tight whitespace-nowrap">
                    THE DAILY WIRE
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono uppercase bg-[#181818] text-[#FAF6EE] px-1.5 py-0.5 font-bold rounded-xs shrink-0">
                    #1928-C
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[8px] sm:text-[9px] font-mono text-[#555] uppercase hidden sm:inline">
                    OCTOBER 14, 1928 • WASHINGTON
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPaperOpen(false)}
                    className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase bg-[#ECE6D8] hover:bg-[#181818] hover:text-[#FAF6EE] text-[#181818] px-2 py-0.5 rounded border border-[#181818]/40 transition-all cursor-pointer shadow-xs"
                    title="Fold newspaper back to collage"
                  >
                    <X className="w-3 h-3" />
                    <span>Fold Paper</span>
                  </button>
                </div>
              </div>

              {/* Spine Crease Center Shadow Effect */}
              <div className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 pointer-events-none bg-gradient-to-r from-black/5 via-black/10 to-transparent z-10" />

              {/* Two-Column Broadsheet Spread */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1 py-2 overflow-hidden text-left">
                {/* Left Page: 1928 Fabricated Wire Dispatch */}
                <div className="space-y-1.5 pr-2 border-r border-[#181818]/25 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-10 h-10 border border-[#181818]/40 overflow-hidden shrink-0 bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/images/vintage_capitol.jpg"
                          alt="Wire plate"
                          className="w-full h-full object-cover filter contrast-125 grayscale"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[7.5px] font-mono uppercase text-[#666] tracking-wider mb-0.5">
                          PAGE 1 • WIRE DISPATCH
                        </div>
                        <h3 className="font-editorial text-[11px] sm:text-xs font-bold text-[#181818] leading-tight truncate">
                          MASS ASSEMBLY AT CAPITOL
                        </h3>
                      </div>
                    </div>

                    <p className="text-[8.5px] sm:text-[9.5px] font-serif leading-snug text-[#333] line-clamp-2">
                      Telegraph dispatches circulating this morning report vast multitudes assembling before the Capitol portico...
                    </p>

                    {/* Circled Fabricated Paragraph */}
                    <div className="mt-1.5 p-1.5 bg-[#EFE9DC] border border-dashed border-[#C8372D] rounded-xs relative">
                      <span className="absolute -top-1.5 right-1 px-1 bg-[#C8372D] text-white text-[6.5px] font-mono font-bold uppercase rounded-2xs">
                        Circled By Forensics
                      </span>
                      <p className="text-[8px] sm:text-[9px] font-serif italic text-[#181818] leading-tight pt-0.5">
                        &ldquo;Visual plate received shows plaza packed to east marble steps...&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[7.5px] font-mono text-[#666]">
                    <span>STATUS: UNCONFIRMED</span>
                    <span className="text-[#C8372D] font-bold">CIRCULATION HALTED</span>
                  </div>
                </div>

                {/* Right Page: Crosscheck Digital Forensic Dossier */}
                <div className="pl-1 sm:pl-2 flex flex-col justify-between relative">
                  <div>
                    {/* Header with neat rubber stamp in margin */}
                    <div className="flex items-center justify-between border-b border-[#181818]/15 pb-1 mb-1.5">
                      <span className="text-[7.5px] font-mono uppercase text-[#555] tracking-wider font-semibold">
                        FORENSIC EVIDENCE BREAKDOWN
                      </span>
                      <div className="px-1.5 py-0.5 border border-[#C8372D] text-[#C8372D] font-mono text-[7.5px] font-bold uppercase tracking-widest -rotate-2 bg-[#FAF6EE] shadow-xs shrink-0">
                        FABRICATED
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[8.5px] sm:text-[9px] font-sans">
                      <div className="flex items-start gap-1 text-[#181818]">
                        <span className="font-mono text-[#C8372D] font-bold">01.</span>
                        <span><strong>Crowd Cloning:</strong> 14 repetitive head clusters identified via perceptual hash.</span>
                      </div>
                      <div className="flex items-start gap-1 text-[#181818]">
                        <span className="font-mono text-[#C8372D] font-bold">02.</span>
                        <span><strong>Shadow Vector:</strong> Dome shadows fall at 88° while crowd shadows fall at 34°.</span>
                      </div>
                      <div className="flex items-start gap-1 text-[#181818]">
                        <span className="font-mono text-[#C8372D] font-bold">03.</span>
                        <span><strong>Archival Record:</strong> Library negative confirms empty plaza on Oct 14.</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link: Verify in Search */}
                  <div className="pt-1.5 border-t border-[#181818]/15 flex items-center justify-between gap-1">
                    <span className="text-[7.5px] font-mono text-[#666]">CONFIDENCE: 98.4%</span>
                    <button
                      type="button"
                      onClick={() => handleVerifyPresetStory("Mass assembly at Capitol grounds 1928 crowd photo claim")}
                      className="flex items-center gap-1 text-[8.5px] font-mono font-bold uppercase bg-[#181818] hover:bg-black text-[#FAF6EE] px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      <span>Verify in Search</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Newspaper Footer Bar */}
              <div className="border-t border-[#181818]/20 pt-1 flex items-center justify-between text-[7.5px] font-mono text-[#666]">
                <span>CROSSCHECK FORENSIC ARCHIVE • EXHIBIT 01</span>
                <span className="text-[#181818]">CLICK &ldquo;FOLD PAPER&rdquo; TO RETURN</span>
              </div>
            </div>
          ) : (
            /* ============================================================
               STATE B: LIVING COLLAGE (3D PARALLAX + INTERACTIVE SPLIT)
               ============================================================ */
            <div
              className="relative w-full max-w-[480px] h-[350px] sm:h-[380px] lg:h-[400px] preserve-3d"
              style={{
                transform: `rotateX(${-mouseTilt.y * 6}deg) rotateY(${mouseTilt.x * 6}deg)`,
                transition: mouseTilt.x === 0 && mouseTilt.y === 0 ? "transform 0.4s ease-out" : "none",
              }}
            >
              {/* LAYER 1: Tilted Vintage Newspaper Fragment (Click to Unfold) */}
              <div
                onClick={() => setIsPaperOpen(true)}
                className="absolute top-1 left-2 w-48 sm:w-52 bg-[#ECE7DC] border border-[#181818]/30 hover:border-[#181818] p-3 shadow-md hover:shadow-xl transform -rotate-3 hover:-rotate-1 transition-all duration-200 cursor-pointer group z-20"
                style={{
                  clipPath: "polygon(0% 0%, 98% 2%, 100% 96%, 95% 100%, 3% 98%, 0% 95%)",
                  transform: "translateZ(26px) rotate(-3deg)",
                }}
                title="Click to unfold archival newspaper"
              >
                <div className="border-b border-[#181818]/25 pb-1 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-editorial text-xs font-bold tracking-tight text-[#181818]">
                      The Daily Wire
                    </span>
                    {/* Pulsing Corner Indicator */}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8372D] animate-ping" />
                  </div>
                  <span className="text-[8px] font-mono text-[#666]">OCT 1928</span>
                </div>
                <div className="text-[8px] font-mono leading-tight text-[#333] space-y-1">
                  <div className="font-bold uppercase tracking-wider text-[#181818]">
                    MASS ASSEMBLY HELD AT CAPITOL GROUNDS
                  </div>
                  <p className="line-clamp-2 text-[#555]">
                    Thousands gather on the grand plaza to hear constitutional declaration...
                  </p>
                </div>

                {/* Interactive Unfold Callout Button */}
                <div className="mt-2.5 pt-1.5 border-t border-[#181818]/15 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#181818] group-hover:bg-[#C8372D] text-[#FAF8F3] text-[8px] font-mono font-bold tracking-wider uppercase rounded-xs transition-colors shadow-xs">
                    <BookOpen className="w-2.5 h-2.5" />
                    <span>Click to Unfold</span>
                  </div>
                  <span className="text-[7.5px] font-mono text-[#777] uppercase group-hover:text-[#181818] transition-colors">
                    📖 Read Story ↗
                  </span>
                </div>
              </div>

              {/* LAYER 2: Main Archival Photograph with Interactive Split Slider */}
              <div
                ref={photoContainerRef}
                onMouseMove={handlePhotoMouseMove}
                className="absolute top-6 left-12 sm:left-14 right-8 sm:right-12 bg-[#FDFBF7] p-2 shadow-lg border border-[#181818]/25 z-10 select-none group"
                style={{
                  clipPath: "polygon(0% 1%, 99% 0%, 100% 98%, 98% 100%, 1% 99%, 0% 97%)",
                  transform: "translateZ(14px)",
                }}
              >
                <div className="relative overflow-hidden bg-black/5 aspect-[4/3] cursor-ew-resize">
                  {/* Under Layer: Digital Tampering Forensic Heatmap */}
                  <div className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/vintage_capitol.jpg"
                      alt="Archival Capitol verification forensic plate"
                      className="w-full h-full object-cover filter contrast-125 saturate-150"
                    />
                    {/* False-color Infrared Hue Overlay */}
                    <div className="absolute inset-0 bg-red-950/25 mix-blend-color-burn pointer-events-none" />

                    {/* Bounding Box: Cloned Crowd Clusters */}
                    <div className="absolute bottom-[16%] left-[24%] w-[48%] h-[34%] border-2 border-[#C8372D] bg-[#C8372D]/15 rounded-xs pointer-events-none flex items-start p-1">
                      <span className="bg-[#C8372D] text-white text-[7px] font-mono font-bold uppercase px-1 py-0.2 shadow-xs">
                        CLONED CROWD REGION (96.8%)
                      </span>
                    </div>

                    {/* Forensic Tag Badge */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#C8372D] text-white text-[7.5px] font-mono font-bold uppercase tracking-wider rounded-xs pointer-events-none shadow-xs">
                      FORENSIC REVEAL
                    </div>
                  </div>

                  {/* Over Layer: Original Monochrome Archival Photograph (Clipped by photoSplit %) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      clipPath: `inset(0 calc(100% - ${photoSplit}%) 0 0)`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/vintage_capitol.jpg"
                      alt="Archival Capitol verification forensic plate"
                      className="w-full h-full object-cover filter contrast-110 grayscale"
                    />
                    {/* Archival Tag Badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#181818] text-[#F6F3EB] text-[7.5px] font-mono font-bold uppercase tracking-wider rounded-xs pointer-events-none shadow-xs">
                      AUTHENTIC WIRE (1928)
                    </div>
                  </div>

                  {/* Vertical Dividing Line & Interactive Handle */}
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-[#181818] z-20 pointer-events-none shadow-sm flex items-center justify-center"
                    style={{ left: `${photoSplit}%` }}
                  >
                    <div className="w-5 h-7 rounded bg-[#181818] text-[#FAF8F3] border border-white/40 flex items-center justify-center text-[7.5px] font-mono font-bold shadow-md">
                      <span>◂▸</span>
                    </div>
                  </div>

                  {/* Target Reticle Centered Over Dome */}
                  <div className="absolute top-[22%] left-[44%] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-20">
                    <div className="w-9 h-9 rounded-full border border-[#181818] flex items-center justify-center animate-pulse-reticle">
                      <div className="w-1.5 h-1.5 bg-[#C8372D] rounded-xs shadow-xs" />
                    </div>
                    <div className="absolute w-12 h-[1px] bg-[#181818]" />
                    <div className="absolute h-12 w-[1px] bg-[#181818]" />
                  </div>

                  {/* Hover Instruction Banner */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#181818]/85 text-[#FAF8F3] text-[7.5px] font-mono font-bold uppercase tracking-wider rounded backdrop-blur-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    SLIDE CURSOR ACROSS PHOTO TO REVEAL FORENSICS
                  </div>
                </div>
              </div>

              {/* LAYER 3: Red Stamp Badge: MANIPULATED? */}
              <div
                onClick={() => setStampPulsed(!stampPulsed)}
                className="absolute top-14 right-0 sm:right-1 z-20 cursor-pointer group"
                style={{ transform: "translateZ(34px)" }}
                title="Click stamp for tactile verification mark"
              >
                <div
                  className={`px-2.5 py-0.5 sm:py-1 bg-[#FDF2F1] border border-[#C8372D] shadow-xs flex items-center gap-1.5 transition-transform ${
                    stampPulsed ? "scale-110 -rotate-3" : "group-hover:scale-105"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8372D] animate-ping" />
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#C8372D] uppercase">
                    MANIPULATED?
                  </span>
                </div>
              </div>

              {/* LAYER 4: Inset Glitched Forensic Crop with Animated Scanline */}
              <div
                className="absolute bottom-4 right-1 sm:right-3 w-18 sm:w-22 h-24 sm:h-28 bg-[#FDFBF7] p-1 border border-[#181818]/30 shadow-md z-20 group hover:scale-105 transition-transform"
                style={{
                  clipPath: "polygon(1% 0%, 100% 2%, 98% 100%, 0% 98%)",
                  transform: "translateZ(30px)",
                }}
                title="Pixelation inspection inset"
              >
                <div className="relative w-full h-full overflow-hidden bg-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/vintage_capitol.jpg"
                    alt="Forensic crop pixelation inset"
                    className="w-full h-full object-cover filter contrast-125 grayscale scale-150"
                    style={{ imageRendering: "pixelated" }}
                  />
                  {/* Animated CRT Scanline Beam */}
                  <div className="absolute inset-x-0 h-4 bg-gradient-to-b from-transparent via-[#C8372D]/40 to-transparent pointer-events-none animate-scanline" />
                  {/* Pixel scanline grid overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(#181818_1px,transparent_1px)] [background-size:4px_4px] opacity-45 pointer-events-none" />
                </div>
              </div>

              {/* LAYER 5: Tilted "AI GENERATED?" Paper Scrap (Bottom Center) */}
              <div
                className="absolute bottom-6 left-20 sm:left-28 z-20 transform -rotate-1 hover:rotate-0 transition-transform cursor-pointer"
                style={{ transform: "translateZ(24px) rotate(-1deg)" }}
              >
                <div className="px-3 py-1 bg-[#FAF8F3] border border-[#181818]/25 shadow-xs">
                  <span className="text-[11px] font-mono font-bold tracking-[0.18em] text-[#181818] uppercase">
                    AI GENERATED?
                  </span>
                  {/* Hand-drawn red underline */}
                  <div className="h-[2px] bg-[#C8372D] w-full mt-0.5 rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Far Right Vertical Stack of Keywords */}
          <div className="hidden sm:flex flex-col gap-2 text-right font-mono text-[8.5px] tracking-[0.22em] text-[#66625B] uppercase font-semibold absolute right-0 bottom-4 z-20 pointer-events-none">
            <span>ANALYSE</span>
            <span>QUESTION</span>
            <span>UNDERSTAND</span>
            <span>VERIFY</span>
            <span>STAY SAFE</span>
          </div>
        </div>
      </main>

      {/* ========================================================
          BOTTOM FEATURE STRIP (4 COLUMNS DIVIDED BY HAIRLINES)
          ======================================================== */}
      <footer className="w-full border-t border-[#181818]/15 bg-[#F6F3EB] flex-shrink-0" id="how-it-works">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-16 py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0">
          {/* Column 01: Detect Manipulation */}
          <div className="lg:pr-8 lg:border-r border-[#181818]/15 flex items-start gap-3.5">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">01</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[#181818] flex-shrink-0" />
                <h2 className="text-[12.5px] font-bold text-[#181818] tracking-tight">
                  Detect Manipulation
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-[#55524B]">
                Identify AI-generated or edited content.
              </p>
            </div>
          </div>

          {/* Column 02: Spot Online Risks */}
          <div className="lg:px-8 lg:border-r border-[#181818]/15 flex items-start gap-3.5">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">02</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#181818] flex-shrink-0" />
                <h2 className="text-[12.5px] font-bold text-[#181818] tracking-tight">
                  Spot Online Risks
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-[#55524B]">
                Detect scams, impersonation and harmful content.
              </p>
            </div>
          </div>

          {/* Column 03: Get Clear Evidence */}
          <div className="lg:px-8 lg:border-r border-[#181818]/15 flex items-start gap-3.5">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">03</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Scan className="w-3.5 h-3.5 text-[#181818] flex-shrink-0" />
                <h2 className="text-[12.5px] font-bold text-[#181818] tracking-tight">
                  Get Clear Evidence
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-[#55524B]">
                See why something is flagged with detailed insights.
              </p>
            </div>
          </div>

          {/* Column 04: Take Safer Action */}
          <div className="lg:pl-8 flex items-start gap-3.5">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">04</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#181818] flex-shrink-0" />
                <h2 className="text-[12.5px] font-bold text-[#181818] tracking-tight">
                  Take Safer Action
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-[#55524B]">
                Know what to do next — verify, report or ignore.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
