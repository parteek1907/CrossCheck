# Crosscheck — AI Misinformation Forensics & Citizen Protection Suite

> **AI Ideathon 2026 Prototype**  
> *Combating AI-generated synthetic media, voice-clone extortion scams, viral misinformation, and cyber harassment.*

---

## 🛡️ Executive Summary

**Crosscheck** is a digital forensics and citizen trust platform built to protect individuals, families, and communities from the perils of weaponized generative AI. As deepfakes, AI voice clones, and viral falsehoods become indistinguishable from reality, Crosscheck provides real-time verification tools, out-of-band family protection protocols, and formal incident reporting.

Powered by **Next.js 16 (Turbopack)**, **Google Gemini Multimodal AI**, **Web Speech API**, and in-browser forensic canvas algorithms, Crosscheck delivers instant verification while keeping citizen privacy at the core.

---

## ✨ Core Pillars & Features

### 1. 🔍 Multimodal Claim Verification Engine
- **Text & Viral Claim Analysis**: Paste any news headline, WhatsApp forward, rumor, or question (e.g., *"Is this person deceased?"*).
- **Multimodal Image Forensics**:
  - Image recognition & OCR powered by Gemini Vision.
  - **Error Level Analysis (ELA)**: Recompression delta analysis identifying digital manipulation and composite spliced areas.
  - **EXIF Metadata Inspection**: Extracts hardware tags, editing software fingerprints, and AI generator signatures.
- **Always-Sourced Evidence**: Every verification guarantees credible journalistic and authoritative citations with clickable links.
- **High-Clarity Verdicts**: Clear forensic outcomes (*Authentic*, *Manipulated*, *False*, *Misleading*, or *Unverified*) with actionable risk scores.

### 2. 🗣️ The Family Safe-Word Protocol (Anti Voice-Clone Extortion)
- **Problem Solved**: Criminals use 3-second audio clips to clone children's and relatives' voices, calling parents with fabricated crises (*"Papa, accident ho gaya hai, turant paise bhejo"*).
- **Out-of-Band Secret Authentication**: Families establish a private, user-editable safe-word and a covert **Silent Duress Code**.
- **Live Microphone Audio Analysis**:
  - Hold your phone near the incoming caller speaker or speak their words.
  - Crosscheck uses browser speech recognition to capture caller speech in real-time.
  - Click **"Stop & Analyze Call"** to invoke Gemini forensic call analysis, evaluating the transcript for high-pressure extortion signals, fake emergency scripts, and safe-word presence.
- **Multilingual Support**: Supports English, Hindi, Hinglish, Tamil, Bengali, Telugu, and Marathi.
- **One-Click Instant Simulation**: Built-in test chips for Safe-word Match, Voice-Clone Scam, and Coercion Duress to demonstrate the protocol immediately.

### 3. 🗄️ Evidence Vault & Incident Reporting
- **Citizen Intake Portal**: Report incidents of cyber extortion, harassment, online bullying, financial scams, or deepfake impersonation.
- **Evidence Documentation**: Attach screenshots, identify perpetrator handles/phone numbers, and specify affected communication channels.
- **Authority-Ready Dossiers**:
  - Automatically structures formal incident complaints formatted for submission to the National Cyber Crime Reporting Portal (**cybercrime.gov.in**) and Indian Cyber Helpline **1930**.
  - Provides unique Case Tracking IDs, status queues, and one-click printable formal complaint letters.

### 4. 🌐 Source Explorer & Syndication Clustering
- Evaluates publisher domains, credibility history, and tracking syndication rings to expose synthetic echo chambers and coordinated disinformation campaigns.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.4.1 (Turbopack, App Router) |
| **Runtime & UI** | React 19, Tailwind CSS, Lucide Icons, Radix UI Primitives |
| **AI & LLM** | Google Gemini Multimodal API (`@google/genai` / REST) |
| **Speech & Audio** | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) |
| **Client Forensics** | HTML5 Canvas (Error Level Analysis - ELA) |
| **Storage & Persistence** | Browser `localStorage` with real-time cross-tab custom events & URL query synchronization |

---

## 📁 Repository Structure

```text
AIdeathon/
├── app/
│   ├── api/
│   │   ├── analyze-call/      # Gemini AI incoming phone call audio & transcript analyzer
│   │   ├── domain-profile/    # Source credibility & publisher profile API
│   │   └── verify/            # Multimodal Gemini claim & image verification API
│   ├── dashboard/             # Comprehensive citizen workspace & Evidence Vault
│   ├── demo/                  # Interactive presentation demo flow
│   ├── report/[id]/           # Standalone public forensic dossier report view
│   ├── layout.js              # Global app shell & metadata
│   └── page.js                # Landing page & quick verification portal
├── components/
│   ├── VerificationModal.jsx  # Main verification submission dialog with image dropzone
│   ├── ELAViewer.jsx          # Interactive Error Level Analysis canvas viewer
│   ├── SourceCard.jsx         # Sourced citation cards
│   └── Toast.jsx              # Accessible user notification system
├── lib/
│   ├── geminiClient.js        # Gemini API client with multi-key fallback & JSON modes
│   ├── safecircle.js          # The Family Safe-Word engine & multilingual configurations
│   ├── storage.js             # Reports, evidence vault, and user profile persistence
│   └── ela.js                 # Canvas pixel difference amplification & analysis
├── public/                    # Static assets & test fixtures
├── README.md                  # Project documentation & architecture overview
└── package.json               # Project manifest & dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ or Node.js 20+
- Google Gemini API Key ([Get one at Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/parteek1907/AI-Ideathon.git
   cd AI-Ideathon
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🧪 Demonstration Guide

1. **Verify a Viral Image / Rumor**:
   - On the homepage or Dashboard, click **"New Verification"**.
   - Attach an image and write your claim question (e.g., *"Is this real or morphed?"*).
   - View the detailed report with the uploaded image, ELA heatmap, and guaranteed source citations.

2. **Test The Family Safe-Word**:
   - Go to Dashboard $\rightarrow$ **"The Family Safe-Word"**.
   - Edit your family safe-word or language.
   - Click **"Tap to Listen to Caller Speech"**, speak into your mic, then click **"Stop & Analyze Call"**.
   - Or click **"Simulate: Voice-Clone Scam"** to instantly witness the imposter warning and threat signals.

3. **File an Incident in the Evidence Vault**:
   - Go to Dashboard $\rightarrow$ **"Evidence Vault"**.
   - Click **"File Incident Report"**, choose an incident type (Scam, Harassment, etc.), add details/screenshots, and submit.
   - View your case in the docket and click **"Official Formal Complaint"** to generate a pre-formatted legal filing for cybercrime authorities.

---

## ⚖️ License & Ethical Commitment

This project is created for **AI Ideathon 2026**. Designed to empower citizens, uphold digital dignity, and protect vulnerable populations against predatory synthetic media and extortion.
