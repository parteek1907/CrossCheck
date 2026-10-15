# TrustLens — Digital Media Forensics & Citizen Trust Protocol
> **Hackathon Prototype for Problem Statement: "Real or Rendered?"**  
> *Addressing AI-generated synthetic content, viral misinformation, digital impersonation, and harassment.*

---

## 🔍 Overview

**TrustLens** is an in-browser, zero-backend, zero-build forensic verification prototype designed to help citizens, fact-checkers, and investigators immediately assess whether circulating digital content is authentic or manipulated.

Built strictly with **vanilla HTML5, CSS3, and modern ES Modules**, TrustLens guarantees that **no sensitive user data, private images, or message transcripts ever leave the local device**. All computations — from Error Level Analysis (ELA) and EXIF extraction to deterministic scoring and cryptographic ledger chaining — run locally inside the client browser sandbox.

---

## 🎯 Architecture: What is Real vs. What is Simulated

To deliver an honest, transparent, and 100% offline-resilient hackathon demonstration:

| Feature | Implementation Status | Technical Mechanism |
| :--- | :--- | :--- |
| **Error Level Analysis (ELA)** | 🟢 **100% REAL** | Canvas-based JPEG re-compression (75% quality), absolute RGB pixel difference extraction, $20\times$ amplification, and interactive false-color heatmap rendering. |
| **EXIF Metadata Inspection** | 🟢 **100% REAL** | In-browser binary metadata parsing via `exifr` (detects AI generator signatures like Midjourney/Stable Diffusion, editing software, and camera hardware tags). |
| **Tamper-Evident Evidence Vault** | 🟢 **100% REAL** | Browser `localStorage` ledger where each block contains a SHA-256 digest linked to the previous block's hash (cryptographic hash chain). Full chain audit verification supported. |
| **Rotating Safe Circle Code** | 🟢 **100% REAL** | Web Crypto API `HMAC-SHA256` of current 60-second UNIX epoch window mapped to two memorable spoken words from a wordlist (offline TOTP against voice clone scams). |
| **Deterministic Scoring & Caps** | 🟢 **100% REAL** | Mathematical 100-point model ported from Veralon with strict deterministic caps (0 clusters $\le 50$, dominant contradiction $\le 40$, low image authenticity $\le 60$). |
| **Evidence Clustering** | 🟢 **100% REAL ALGORITHM** | Union-Find disjoint set grouping by publisher domain and title Jaccard word similarity ($\ge 0.55$) exposing syndicated echo chambers. |
| **Repeat-Claim Trigram Index** | 🟢 **100% REAL ALGORITHM** | Character 3-gram index and Jaccard similarity matcher mirroring PostgreSQL `pg_trgm` to catch repeat hoaxes. |
| **One-Click PDF Audit Export** | 🟢 **100% REAL** | Vector-rendered executive PDF audit report generated client-side via jsPDF. |
| **Canvas 1200×630 Context Card** | 🟢 **100% REAL** | Off-screen HTML5 `<canvas>` rendering branded social context cards and direct PNG download. |
| **External Article Retrieval** | 🟡 **SIMULATED OFFLINE** | Bundled static datasets (`data/sample_articles.json`, `data/trending_hoaxes.json`, `data/known_claims.json`) replacing live scraping / GDELT / Google News APIs for reliable offline evaluation. |

---

## 📁 Repository Structure

```text
AiIdeathon/
├── index.html              # Clean semantic single-page UI with accessible tabs & focus rings
├── css/
│   └── style.css           # Calm, trustworthy dark slate design system & responsive layout
├── js/
│   ├── app.js              # Main application controller and event orchestrator
│   ├── scoring.js          # Deterministic 100-pt scoring & safety caps (adapted from Veralon)
│   ├── confidence.js       # Statistical margin-of-error & confidence meter (adapted from Veralon)
│   ├── clustering.js       # Union-Find syndication clustering (adapted from Veralon)
│   ├── audit.js            # Web Crypto SHA-256 hashing & Report IDs (adapted from Veralon)
│   ├── exportPdf.js        # Executive PDF audit report export (adapted from Veralon)
│   ├── similarity.js       # Character trigram pg_trgm repeat-claim matcher (adapted from Veralon)
│   ├── trending.js         # Circulating hoaxes panel & 1200x630 canvas share card (adapted from Veralon)
│   ├── forensics.js        # Real in-browser ELA pixel heatmap & EXIF metadata inspection
│   ├── vault.js            # Cryptographic hash-chained evidence ledger & legal complaint generator
│   ├── safecircle.js       # Offline Web Crypto HMAC-SHA256 60s rotating two-word passcodes
│   └── actionpath.js       # Incident response protocols & emergency helplines (1930 / cybercrime.gov.in)
├── data/
│   ├── known_claims.json   # Known hoax database for trigram repeat-claim detection
│   ├── sample_articles.json# Bundled journalistic articles for syndication clustering
│   ├── trending_hoaxes.json# Circulating hoaxes feed
│   ├── sample_cases.json   # 3 preloaded offline demonstration cases
│   └── wordlist.json       # Phonetic English wordlist for Safe Circle TOTP
├── assets/
│   ├── demo_fake_news.jpg  # Preloaded asset for Case 1 (Disaster / Biometric Chip Hoax)
│   ├── demo_scam_dm.jpg    # Preloaded asset for Case 2 (Emergency WhatsApp Extortion)
│   └── demo_morphed_photo.jpg # Preloaded asset for Case 3 (Composited Photo with ELA Discrepancies)
├── tests/
│   ├── test_modules.js     # Unit test runner for ported modules 1-7
│   └── test_new_features.js# Unit test runner for Vault, Safe Circle, and Action Path
└── README.md               # Architecture documentation, honesty notice, and setup guide
```

---

## 🚀 How to Run

### Option 1: Direct File Open (Zero Dependencies)
Simply double-click or open [index.html](file:///home/parteek1907/Projects/AiIdeathon/index.html) in any modern web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local Static Server (Recommended)
From the project root directory, run any lightweight static file server:

```bash
# Using Python 3:
python3 -m http.server 8080

# Or using Node:
npx serve . -l 8080
```
Then navigate to `http://localhost:8080` in your browser.

---

## 🧪 Automated Test Suite

TrustLens includes automated regression and module verification suites:

```bash
# Test Ported Modules 1–7 (Scoring, Confidence, Clustering, Audit, Similarity):
node tests/test_modules.js

# Test New Features (Evidence Vault Hash Chaining, Safe Circle TOTP, Action Path):
node tests/test_new_features.js
```

---

## 🎬 Hackathon Walkthrough Guide (Under 3 Minutes)

### 1. Verification Engine (Main Triage)
- Click **"📰 Fake News Graphic" (Case 1)**:  
  *Observation:* Instantly displays **LIKELY MANIPULATED (Score: 38/100, High Confidence)**. ELA heatmap highlights uniform TV graphics with high syndication (`12 articles, only 3 independent sources`). Trigram matcher flags repeat claim.
- Click **"🚨 Urgent Scam DM" (Case 2)**:  
  *Observation:* Detects financial coercion cues and zero independent clusters (`Score capped at max 40`). Action Path links directly to Helpline **1930**.
- Click **"📸 Morphed Photo" (Case 3)**:  
  *Observation:* ELA difference heatmap highlights localized high-frequency compression block discrepancies along head and collar borders. Missing camera sensor tags flagged in EXIF box.
- Click **"📄 Download PDF Trust Report"**: Generates a vector PDF audit report with SHA-256 digest and full breakdown.
- Click **"🖼️ Export Context Card (PNG)"**: Renders an off-screen 1200×630 social card for WhatsApp/X context sharing.

### 2. Tamper-Evident Evidence Vault
- Click **"Save to Evidence Vault"** on any analyzed result.
- Navigate to the **"Evidence Vault"** tab.
- Inspect the cryptographic chain linking `Previous Hash -> Block Hash`.
- Click **"Verify Chain"**: Validates the SHA-256 integrity of all blocks.
- Click **"Draft Complaint"**: Pre-fills an official legal complaint letter ready for **cybercrime.gov.in** and Helpline 1930 citing Section 66D of the IT Act 2000.

### 3. Rotating Safe Circle
- Navigate to the **"Safe Circle"** tab.
- Observe the live 60-second rotating two-word passcode (e.g. `SILVER-FALCON`) and real-time countdown bar.
- Test the caller verification input: Type the active code to confirm authentication; type an invalid word to see the imposter warning. Works 100% offline without cellular or server connectivity.

### 4. Action Path & Statutory Helplines
- Access direct one-click quick dials for **1930** (Financial Cyber Fraud), **cybercrime.gov.in**, **181** (Women Cyber Harassment), and **PIB Fact Check WhatsApp**.

---

## ⚖️ Transparency & Limits of This Check

> **Notice:** Error Level Analysis (ELA) and EXIF extraction are mathematical compression indicators, not judicial proof. Automated scoring provides rapid citizen triage against known syndication rings, manipulated compression blocks, and phishing coercion patterns. Users are provided direct statutory referral paths for forensic police reporting.
