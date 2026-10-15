"use client";

import React, { useEffect, useState } from "react";

/**
 * Normalizes incoming verdict string/object to either "FAKE", "REAL", or null.
 * @param {string | object} verdictInput
 * @returns {"FAKE" | "REAL" | null}
 */
export function normalizeVerdict(verdictInput) {
  if (!verdictInput) return null;

  let text = "";
  let score = null;

  if (typeof verdictInput === "string") {
    text = verdictInput.toLowerCase().trim();
  } else if (typeof verdictInput === "object") {
    text = (
      verdictInput.verdict ||
      verdictInput.verdictText ||
      verdictInput.claimVerdict ||
      verdictInput.status ||
      ""
    ).toLowerCase().trim();

    if (typeof verdictInput.score === "number") {
      score = verdictInput.score;
    } else if (verdictInput.scoringResult && typeof verdictInput.scoringResult.finalScore === "number") {
      score = verdictInput.scoringResult.finalScore;
    } else if (typeof verdictInput.trustScore === "number") {
      score = verdictInput.trustScore;
    }
  }

  // 1. Explicitly check for inconclusive / under review / pending states:
  // Under review claims MUST NEVER show a REAL or FAKE stamp!
  if (
    text.includes("under review") ||
    text.includes("inconclusive") ||
    text.includes("unverified") ||
    text.includes("disputed") ||
    text.includes("pending") ||
    text.includes("analyzing") ||
    text.includes("developing")
  ) {
    return null;
  }

  // 2. Explicit FAKE / MANIPULATED classifications
  if (
    text.includes("fake") ||
    text.includes("manipulated") ||
    text.includes("false") ||
    text.includes("debunked") ||
    text.includes("mislead") ||
    text.includes("hoax") ||
    text.includes("scam") ||
    text.includes("fabricat") ||
    text.includes("deepfake") ||
    text.includes("phishing")
  ) {
    return "FAKE";
  }

  // 3. Explicit REAL / AUTHENTIC classifications
  if (
    text.includes("verified fact") ||
    text.includes("verified authentic") ||
    text.includes("confirmed fact") ||
    text.includes("genuine") ||
    text.includes("authentic") ||
    text.includes("corroborated") ||
    text === "real" ||
    text === "true"
  ) {
    return "REAL";
  }

  // 4. Strict score thresholds ONLY when text classification was ambiguous:
  // High confidence only: >= 75 is REAL, <= 35 is FAKE.
  // Anything between 36 and 74 is ambiguous / inconclusive -> NO STAMP!
  if (score !== null) {
    if (score <= 35) return "FAKE";
    if (score >= 75) return "REAL";
    return null;
  }

  return null;
}

/**
 * 100% Transparent Animated Rubber Stamp Overlay
 * Slams onto the page with impact shake, holds for 2 seconds, and falls down off-screen.
 *
 * @param {Object} props
 * @param {string | Object} props.verdict - Verdict string ("FAKE", "REAL", "Manipulated Media", etc.) or report object
 * @param {() => void} [props.onComplete] - Callback triggered when the stamp animation finishes and unmounts
 */
export function VerdictStampOverlay({ verdict, onComplete }) {
  const [isRendered, setIsRendered] = useState(true);
  const stampType = normalizeVerdict(verdict);

  // If no recognizable FAKE/REAL verdict, do not render
  if (!stampType || !isRendered) return null;

  const isFake = stampType === "FAKE";
  const stampText = isFake ? "FAKE" : "REAL";
  const inkColor = isFake ? "#DF1B1B" : "#16803C";

  return (
    <>
      {/* Scoped keyframes and typography for the rubber stamp animation */}
      <style>{`
        @keyframes verdictStampSequence {
          0% {
            transform: scale(3.2) rotate(-22deg);
            opacity: 0;
            animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
          }
          7.8% {
            /* ~0.22s impact slam hit */
            transform: scale(1) rotate(-22deg) translate(2px, -2px);
            opacity: 0.96;
            animation-timing-function: ease-out;
          }
          11.4% {
            /* ~0.32s micro-shake settle */
            transform: scale(1) rotate(-22deg) translate(0, 0);
            opacity: 0.95;
            animation-timing-function: linear;
          }
          78.6% {
            /* ~2.20s hold locked in center for 2 full seconds */
            transform: scale(1) rotate(-22deg) translate(0, 0);
            opacity: 0.95;
            animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
          }
          100% {
            /* ~2.75s gravity drop straight down off the bottom of the screen */
            transform: translateY(115vh) rotate(10deg);
            opacity: 0;
          }
        }

        .verdict-stamp-anim-wrapper {
          background: transparent !important;
          animation: verdictStampSequence 2.8s forwards;
          will-change: transform, opacity;
          pointer-events: none;
        }
      `}</style>

      {/* Fixed full-screen pass-through transparent wrapper */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center overflow-hidden"
        style={{
          background: "transparent",
          backgroundColor: "transparent",
        }}
        aria-hidden="true"
        onAnimationEnd={() => {
          setIsRendered(false);
          if (typeof onComplete === "function") {
            onComplete();
          }
        }}
      >
        <div className="verdict-stamp-anim-wrapper">
          <svg
            className="w-[320px] sm:w-[460px] md:w-[520px] h-auto drop-shadow-sm"
            viewBox="0 0 500 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              background: "transparent",
              backgroundColor: "transparent",
              display: "block",
            }}
          >
            <defs>
              {/* Fractal noise turbulence filter creating authentic rubber-stamp distressed edges */}
              <filter id="stamp-distress-turbulence" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.07"
                  numOctaves="4"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="3.5"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>

              {/* 
                Distressed Grunge Mask:
                Uses userSpaceOnUse to align 1:1 with SVG coordinates.
                - White rect = 100% visible ink
                - Black strokes & cutouts = 100% transparent cutouts directly through the stamp
              */}
              <mask
                id="rubber-stamp-distress-mask"
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="500"
                height="240"
              >
                {/* White base = fully visible ink */}
                <rect x="0" y="0" width="500" height="240" fill="#FFFFFF" />

                {/* Diagonal heavy scratch cutouts across frame & letters (matching reference image) */}
                <path
                  d="M 25 195 L 185 25 M 60 215 L 220 35 M 115 225 L 275 45 M 175 220 L 335 40"
                  stroke="#000000"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 225 215 L 385 45 M 270 225 L 430 55 M 325 220 L 475 70 M 375 210 L 485 100"
                  stroke="#000000"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />

                {/* Subtle cross-hatch weathering cuts */}
                <path
                  d="M 75 40 L 125 90 M 195 130 L 255 190 M 355 80 L 415 140 M 135 30 L 160 70 M 305 170 L 330 210 M 405 30 L 435 85"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Weathered erosion notches along outer and inner border strokes */}
                <circle cx="85" cy="18" r="3.5" fill="#000000" />
                <circle cx="160" cy="17" r="3" fill="#000000" />
                <circle cx="270" cy="18" r="4" fill="#000000" />
                <circle cx="380" cy="17" r="3.5" fill="#000000" />
                <circle cx="110" cy="222" r="3.5" fill="#000000" />
                <circle cx="230" cy="223" r="4.2" fill="#000000" />
                <circle cx="340" cy="222" r="3.5" fill="#000000" />
                <circle cx="420" cy="223" r="3" fill="#000000" />
                <circle cx="18" cy="70" r="3.5" fill="#000000" />
                <circle cx="17" cy="140" r="3.2" fill="#000000" />
                <circle cx="482" cy="90" r="3.5" fill="#000000" />
                <circle cx="483" cy="160" r="3.2" fill="#000000" />

                {/* Inner border weathering gouges */}
                <ellipse cx="210" cy="28" rx="4" ry="2.2" fill="#000000" />
                <ellipse cx="320" cy="27" rx="5" ry="2.5" fill="#000000" />
                <ellipse cx="170" cy="212" rx="4.5" ry="2.2" fill="#000000" />
                <ellipse cx="290" cy="213" rx="5" ry="2.5" fill="#000000" />

                {/* Stencil text internal speckles & ink voids */}
                <circle cx="115" cy="115" r="3.2" fill="#000000" />
                <circle cx="145" cy="140" r="2.8" fill="#000000" />
                <circle cx="210" cy="100" r="3.8" fill="#000000" />
                <circle cx="245" cy="130" r="3" fill="#000000" />
                <circle cx="310" cy="95" r="3.5" fill="#000000" />
                <circle cx="345" cy="145" r="3.4" fill="#000000" />
                <circle cx="395" cy="120" r="2.8" fill="#000000" />
                <circle cx="425" cy="95" r="3.2" fill="#000000" />
                <circle cx="95" cy="50" r="2" fill="#000000" />
                <circle cx="130" cy="180" r="2.2" fill="#000000" />
                <circle cx="260" cy="60" r="2" fill="#000000" />
                <circle cx="380" cy="185" r="2.4" fill="#000000" />
                <circle cx="460" cy="65" r="2.1" fill="#000000" />

                {/* Micro ink splatter flecks */}
                <rect x="70" y="80" width="4.5" height="2.5" fill="#000000" />
                <rect x="180" y="150" width="3.5" height="3.5" fill="#000000" />
                <rect x="290" y="70" width="5.5" height="2.5" fill="#000000" />
                <rect x="370" y="160" width="4.5" height="3.5" fill="#000000" />
                <rect x="440" y="110" width="3.5" height="2.5" fill="#000000" />
              </mask>
            </defs>

            {/* 
              Colored Rubber Stamp Ink Layer (Zero background, 100% transparent through mask cuts)
            */}
            <g
              mask="url(#rubber-stamp-distress-mask)"
              filter="url(#stamp-distress-turbulence)"
              fill={inkColor}
              stroke={inkColor}
              style={{
                background: "transparent",
              }}
            >
              {/* Outer Thick Rounded Border (8px stroke, rx="18") */}
              <rect
                x="18"
                y="18"
                width="464"
                height="204"
                rx="18"
                fill="none"
                stroke={inkColor}
                strokeWidth="8"
              />

              {/* Inner Thinner Rounded Border (2.5px stroke, rx="12", separated by 5px transparent gap) */}
              <rect
                x="30"
                y="30"
                width="440"
                height="180"
                rx="12"
                fill="none"
                stroke={inkColor}
                strokeWidth="2.5"
              />

              {/* Centered Stencil Typography */}
              <text
                x="250"
                y="126"
                textAnchor="middle"
                dominantBaseline="central"
                alignmentBaseline="middle"
                fill={inkColor}
                stroke="none"
                style={{
                  fontFamily: "'Black Ops One', 'Stardos Stencil', Impact, -apple-system, sans-serif",
                  fontWeight: 900,
                  fontSize: isFake ? "114px" : "118px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {stampText}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}

export default VerdictStampOverlay;
