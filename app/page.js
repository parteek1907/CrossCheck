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
    <div className="min-h-screen bg-[#F6F3EB] text-[#181818] font-sans selection:bg-[#181818] selection:text-[#F6F3EB] overflow-x-hidden flex flex-col justify-between">
      {/* ========================================================
          TOP NAVIGATION BAR
          ======================================================== */}
      <header className="w-full">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-start group">
            <span className="font-editorial text-2xl lg:text-[28px] font-bold tracking-tight text-[#181818]">
              Crosscheck
            </span>
            <span className="text-sm font-bold text-[#181818] ml-0.5 -mt-0.5 font-mono">⁺</span>
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-9 lg:gap-11 text-[13px] font-medium text-[#48453F]">
            <Link
              href="/"
              className="text-[#181818] font-semibold border-b-2 border-[#181818] pb-0.5"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-[#181818] transition-colors"
            >
              Investigations
            </Link>
            <a
              href="#how-it-works"
              className="hover:text-[#181818] transition-colors"
            >
              How it Works
            </a>
            <Link
              href="/dashboard"
              className="hover:text-[#181818] transition-colors"
            >
              Tools
            </Link>
            <a
              href="#about"
              className="hover:text-[#181818] transition-colors"
            >
              About
            </a>
          </nav>

          {/* Right Action Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#181818] text-[#F6F3EB] text-xs font-semibold hover:bg-black transition-all hover:gap-2.5 shadow-xs"
          >
            <span>Start Verifying</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ========================================================
          SUBHEADER TICKER BAR (RULED ARCHIVAL BORDER)
          ======================================================== */}
      <div className="w-full border-y border-[#181818]/15 bg-[#F6F3EB]">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-16 py-2 flex items-center justify-between text-[10px] sm:text-[11px] font-mono tracking-[0.25em] text-[#55524B] uppercase">
          <div className="font-medium">EST. 2026</div>
          <div className="hidden sm:block text-center font-medium tracking-[0.28em]">
            INDEPENDENT DIGITAL VERIFICATION
          </div>
          <div className="font-medium text-right">
            TRUTH DESERVES A SECOND LOOK
          </div>
        </div>
      </div>

      {/* ========================================================
          MAIN HERO SECTION (2 COLUMNS)
          ======================================================== */}
      <main className="flex-1 max-w-[1360px] mx-auto w-full px-6 sm:px-10 lg:px-16 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* LEFT COLUMN: HERO COPY & SEARCH INPUT */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-7 lg:space-y-8 pr-0 lg:pr-6">
          {/* Overline with thin dash */}
          <div className="space-y-2">
            <div className="w-7 h-[1px] bg-[#181818]/50" />
            <div className="text-[10px] sm:text-[11px] font-mono tracking-[0.22em] text-[#55524B] uppercase font-semibold leading-relaxed">
              REAL INFORMATION<br />
              BUILDS A SAFER TOMORROW —
            </div>
          </div>

          {/* Main Editorial Headline */}
          <h1 className="font-editorial text-[56px] sm:text-[70px] lg:text-[78px] xl:text-[84px] leading-[1.01] tracking-[-0.015em] text-[#181818]">
            Before you<br />
            believe it,<br />
            <span className="italic">crosscheck it.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#4A4742] max-w-md font-sans">
            Analyse claims, images, and links. Uncover manipulation,
            misinformation, and online risks — with clear evidence, not opinions.
          </p>

          {/* Search Box / Dropzone Container */}
          <div className="pt-1 max-w-xl">
            <form
              onSubmit={handleStartVerification}
              className="rounded-2xl border border-[#181818] bg-[#FCFAF6] p-2 pl-4 flex items-center justify-between gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-[#181818]/15 transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-[#666] flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-[#444]"
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
                className="px-5 py-2.5 rounded-xl bg-[#181818] hover:bg-black text-[#F6F3EB] text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0"
              >
                <span>Verify Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Input Type Selectors */}
            <div className="flex items-center gap-4 sm:gap-5 text-xs font-medium text-[#4A4742] pt-3.5 px-2">
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
        <div className="lg:col-span-6 xl:col-span-6 relative flex justify-center items-center py-4 select-none">
          {/* Subtle Technical / Compass Background Graphics */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              className="w-full h-full max-w-[560px] opacity-20 text-[#181818]"
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
          <div className="relative w-full max-w-[500px] h-[410px] sm:h-[450px]">
            {/* Extended Vertical Technical Ruler Line */}
            <div className="absolute top-[-20px] bottom-[-20px] left-[55%] w-[1px] bg-[#181818]/70 z-20 pointer-events-none" />

            {/* LAYER 1: Tilted Vintage Newspaper Fragment (Top Left) */}
            <div
              className="absolute top-2 left-2 w-48 sm:w-52 bg-[#ECE7DC] border border-[#181818]/20 p-3.5 shadow-sm transform -rotate-3 z-0"
              style={{
                clipPath: "polygon(0% 0%, 98% 2%, 100% 96%, 95% 100%, 3% 98%, 0% 95%)",
              }}
            >
              <div className="border-b border-[#181818]/25 pb-1 mb-2">
                <span className="font-editorial text-xs font-bold tracking-tight text-[#181818]">
                  The Daily Wire
                </span>
                <span className="text-[8px] font-mono text-[#666] ml-2">OCT 1928</span>
              </div>
              <div className="text-[8px] font-mono leading-tight text-[#333] space-y-1">
                <div className="font-bold uppercase tracking-wider text-[#181818]">
                  MASS ASSEMBLY HELD AT CAPITOL GROUNDS
                </div>
                <p className="line-clamp-3 text-[#555]">
                  Thousands gather on the grand plaza to hear constitutional declaration as reporters observe the proceedings...
                </p>
              </div>
              {/* Fact Check Stamp */}
              <div className="mt-2.5 inline-block px-1.5 py-0.5 bg-[#FAF8F3] border border-[#181818] text-[8px] font-mono font-bold tracking-wider uppercase text-[#181818]">
                FACT CHECK
              </div>
            </div>

            {/* LAYER 2: Main Archival Photograph of Capitol Building */}
            <div
              className="absolute top-8 left-14 sm:left-16 right-10 sm:right-14 bg-[#FDFBF7] p-2 sm:p-2.5 shadow-lg border border-[#181818]/25 z-10"
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
                  <div className="w-10 h-10 rounded-full border border-[#181818] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#C8372D] rounded-xs shadow-xs" />
                  </div>
                  <div className="absolute w-14 h-[1px] bg-[#181818]" />
                  <div className="absolute h-14 w-[1px] bg-[#181818]" />
                </div>
              </div>
            </div>

            {/* LAYER 3: Red Stamp Badge: MANIPULATED? (Overlapping Top Right) */}
            <div className="absolute top-16 right-1 sm:right-2 z-20">
              <div className="px-3 py-1 bg-[#FDF2F1] border border-[#C8372D] shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8372D]" />
                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.2em] text-[#C8372D] uppercase">
                  MANIPULATED?
                </span>
              </div>
            </div>

            {/* LAYER 4: Inset Glitched Forensic Crop (Bottom Right) */}
            <div
              className="absolute bottom-5 right-2 sm:right-4 w-20 sm:w-24 h-28 sm:h-32 bg-[#FDFBF7] p-1.5 border border-[#181818]/30 shadow-md z-20"
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
            <div className="absolute bottom-8 left-24 sm:left-32 z-20 transform -rotate-1">
              <div className="px-3.5 py-1.5 bg-[#FAF8F3] border border-[#181818]/25 shadow-xs">
                <span className="text-xs font-mono font-bold tracking-[0.18em] text-[#181818] uppercase">
                  AI GENERATED?
                </span>
                {/* Hand-drawn red underline */}
                <div className="h-[2px] bg-[#C8372D] w-full mt-0.5 rounded-full" />
              </div>
            </div>
          </div>

          {/* Far Right Vertical Stack of Keywords */}
          <div className="hidden sm:flex flex-col gap-2.5 text-right font-mono text-[9px] tracking-[0.22em] text-[#66625B] uppercase font-semibold absolute right-0 bottom-4 z-20">
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
      <footer className="w-full border-t border-[#181818]/15 bg-[#F6F3EB]" id="how-it-works">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-16 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
          {/* Column 01: Detect Manipulation */}
          <div className="lg:pr-8 lg:border-r border-[#181818]/15 flex items-start gap-4">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">01</span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#181818] flex-shrink-0" />
                <h2 className="text-[13px] font-bold text-[#181818] tracking-tight">
                  Detect Manipulation
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-[#55524B]">
                Identify AI-generated or edited content.
              </p>
            </div>
          </div>

          {/* Column 02: Spot Online Risks */}
          <div className="lg:px-8 lg:border-r border-[#181818]/15 flex items-start gap-4">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">02</span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#181818] flex-shrink-0" />
                <h2 className="text-[13px] font-bold text-[#181818] tracking-tight">
                  Spot Online Risks
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-[#55524B]">
                Detect scams, impersonation and harmful content.
              </p>
            </div>
          </div>

          {/* Column 03: Get Clear Evidence */}
          <div className="lg:px-8 lg:border-r border-[#181818]/15 flex items-start gap-4">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">03</span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-[#181818] flex-shrink-0" />
                <h2 className="text-[13px] font-bold text-[#181818] tracking-tight">
                  Get Clear Evidence
                </h2>
              </div>
              <p className="text-[11px] leading-relaxed text-[#55524B]">
                See why something is flagged with detailed insights.
              </p>
            </div>
          </div>

          {/* Column 04: Take Safer Action */}
          <div className="lg:pl-8 flex items-start gap-4">
            <span className="text-xs font-mono font-semibold text-[#55524B] pt-0.5">04</span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#181818] flex-shrink-0" />
                <h2 className="text-[13px] font-bold text-[#181818] tracking-tight">
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
