"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { VerificationModal } from "../components/VerificationModal";
import { saveStoredReport } from "../lib/storage.js";

export default function LandingPage() {
  const router = useRouter();
  const [claimInput, setClaimInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPrefill, setModalPrefill] = useState(null);

  const handleStartVerification = (e) => {
    e?.preventDefault();
    if (claimInput.trim()) {
      if (claimInput.startsWith("http://") || claimInput.startsWith("https://")) {
        setModalPrefill({ tab: "link", link: claimInput.trim() });
      } else {
        setModalPrefill({ tab: "text", text: claimInput.trim() });
      }
    } else {
      setModalPrefill(null);
    }
    setIsModalOpen(true);
  };

  const handleTabClick = (tab) => {
    setModalPrefill({ tab });
    setIsModalOpen(true);
  };

  const handleVerificationComplete = (report) => {
    saveStoredReport(report);
    router.push(`/report/${encodeURIComponent(report.reportId)}`);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-[#F6F3EB] text-[#181818] font-sans selection:bg-[#181818] selection:text-[#F6F3EB] flex flex-col justify-between">
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
              className="rounded-2xl border border-[#181818] bg-[#FCFAF6] p-1.5 pl-3.5 flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-[#181818]/15 transition-all"
            >
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
                  type="text"
                  value={claimInput}
                  onChange={(e) => setClaimInput(e.target.value)}
                  placeholder="Paste a claim, link, message or drop an image here..."
                  className="w-full text-xs sm:text-[13px] bg-transparent placeholder:text-[#88857E] text-[#181818] focus:outline-none font-sans"
                />
              </div>
              <button
                type="submit"
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#181818] hover:bg-black text-[#F6F3EB] text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0"
              >
                <span>Verify Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Input Type Selectors */}
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

        {/* RIGHT COLUMN: ARCHIVAL FORENSIC COLLAGE */}
        <div className="lg:col-span-6 xl:col-span-6 relative flex justify-center items-center py-2 select-none">
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
          <div className="absolute top-1 right-2 text-xs font-mono text-[#181818]/60">+</div>
          <div className="absolute bottom-6 right-2 text-xs font-mono text-[#181818]/60">+</div>
          <div className="absolute bottom-4 left-16 text-sm font-mono text-[#181818]/80 font-bold">+</div>

          {/* Top Right Annotation */}
          <div className="absolute top-0 right-2 sm:right-6 text-right font-mono uppercase text-[#44423D] z-30">
            <div className="text-[10px] tracking-[0.22em] font-semibold">SAME IMAGE.</div>
            <div className="text-[10px] tracking-[0.22em] font-semibold">DIFFERENT REALITIES.</div>
            <div className="w-8 h-[1px] bg-[#181818]/40 ml-auto mt-1" />
          </div>

          {/* Composite Collage Canvas */}
          <div className="relative w-full max-w-[480px] h-[350px] sm:h-[380px] lg:h-[400px]">
            {/* Extended Vertical Technical Ruler Line */}
            <div className="absolute top-[-16px] bottom-[-16px] left-[55%] w-[1px] bg-[#181818]/70 z-20 pointer-events-none" />

            {/* LAYER 1: Tilted Vintage Newspaper Fragment (Top Left) */}
            <div
              className="absolute top-1 left-2 w-44 sm:w-48 bg-[#ECE7DC] border border-[#181818]/20 p-3 shadow-sm transform -rotate-3 z-0"
              style={{
                clipPath: "polygon(0% 0%, 98% 2%, 100% 96%, 95% 100%, 3% 98%, 0% 95%)",
              }}
            >
              <div className="border-b border-[#181818]/25 pb-1 mb-1.5 flex items-center justify-between">
                <span className="font-editorial text-xs font-bold tracking-tight text-[#181818]">
                  The Daily Wire
                </span>
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
              {/* Fact Check Stamp */}
              <div className="mt-2 inline-block px-1.5 py-0.5 bg-[#FAF8F3] border border-[#181818] text-[8px] font-mono font-bold tracking-wider uppercase text-[#181818]">
                FACT CHECK
              </div>
            </div>

            {/* LAYER 2: Main Archival Photograph of Capitol Building */}
            <div
              className="absolute top-6 left-12 sm:left-14 right-8 sm:right-12 bg-[#FDFBF7] p-2 shadow-lg border border-[#181818]/25 z-10"
              style={{
                clipPath: "polygon(0% 1%, 99% 0%, 100% 98%, 98% 100%, 1% 99%, 0% 97%)",
              }}
            >
              <div className="relative overflow-hidden bg-black/5 aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/vintage_capitol.jpg"
                  alt="Archival Capitol verification forensic plate"
                  className="w-full h-full object-cover filter contrast-110 grayscale"
                />

                {/* Target Reticle Centered Over Dome */}
                <div className="absolute top-[22%] left-[44%] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-20">
                  <div className="w-9 h-9 rounded-full border border-[#181818] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#C8372D] rounded-xs shadow-xs" />
                  </div>
                  <div className="absolute w-12 h-[1px] bg-[#181818]" />
                  <div className="absolute h-12 w-[1px] bg-[#181818]" />
                </div>
              </div>
            </div>

            {/* LAYER 3: Red Stamp Badge: MANIPULATED? (Overlapping Top Right) */}
            <div className="absolute top-14 right-0 sm:right-1 z-20">
              <div className="px-2.5 py-0.5 sm:py-1 bg-[#FDF2F1] border border-[#C8372D] shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8372D]" />
                <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#C8372D] uppercase">
                  MANIPULATED?
                </span>
              </div>
            </div>

            {/* LAYER 4: Inset Glitched Forensic Crop (Bottom Right) */}
            <div
              className="absolute bottom-4 right-1 sm:right-3 w-18 sm:w-22 h-24 sm:h-28 bg-[#FDFBF7] p-1 border border-[#181818]/30 shadow-md z-20"
              style={{
                clipPath: "polygon(1% 0%, 100% 2%, 98% 100%, 0% 98%)",
              }}
            >
              <div className="relative w-full h-full overflow-hidden bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/vintage_capitol.jpg"
                  alt="Forensic crop pixelation inset"
                  className="w-full h-full object-cover filter contrast-125 grayscale scale-150"
                  style={{ imageRendering: "pixelated" }}
                />
                {/* Pixel scanline grid overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#181818_1px,transparent_1px)] [background-size:4px_4px] opacity-45 pointer-events-none" />
              </div>
            </div>

            {/* LAYER 5: Tilted "AI GENERATED?" Paper Scrap (Bottom Center) */}
            <div className="absolute bottom-6 left-20 sm:left-28 z-20 transform -rotate-1">
              <div className="px-3 py-1 bg-[#FAF8F3] border border-[#181818]/25 shadow-xs">
                <span className="text-[11px] font-mono font-bold tracking-[0.18em] text-[#181818] uppercase">
                  AI GENERATED?
                </span>
                {/* Hand-drawn red underline */}
                <div className="h-[2px] bg-[#C8372D] w-full mt-0.5 rounded-full" />
              </div>
            </div>
          </div>

          {/* Far Right Vertical Stack of Keywords */}
          <div className="hidden sm:flex flex-col gap-2 text-right font-mono text-[8.5px] tracking-[0.22em] text-[#66625B] uppercase font-semibold absolute right-0 bottom-4 z-20">
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

      {/* ========================================================
          VERIFICATION MODAL (OPENS DIRECTLY ON LANDING PAGE)
          ======================================================== */}
      <VerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleVerificationComplete}
        initialData={modalPrefill}
      />
    </div>
  );
}
