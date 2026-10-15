# CrossCheck — Institutional AI Misinformation Forensics & Citizen Protection Suite

> **AI Ideathon 2026 Submission**  
> *Defending citizens and families against AI voice-clone extortion, deepfakes, viral falsehoods, and cyber harassment through real-time forensics, multi-source news wire indexing, and authority-ready action dossiers.*

---

## 🛡️ Executive Summary

**CrossCheck** is an institutional digital forensics and citizen trust platform designed to counter the weaponization of generative AI. As deepfakes, voice clones, and automated propaganda become indistinguishable from reality, CrossCheck equips everyday individuals, families, and communities with:

1. **An Institutional 13-Step Verification Pipeline** combining multimodal AI with live global news wire retrieval (GDELT, Google News RSS, Government Bulletins) to analyze claims, detect syndication echo chambers, compute deterministic 100-point trust scores, and verify digital media.
2. **A Multilingual Voice Intake Studio & Universal Transcription Pipeline** powered by Groq Whisper across 12+ Indian and international languages, shared seamlessly between web microphones and WhatsApp voice notes.
3. **A Live Meta WhatsApp Cloud API Channel** enabling citizens to forward viral rumors, voice messages, or screenshots directly over WhatsApp for real-time verification and automated incident drafting.
4. **Authority-Ready Incident Action Packs** transforming cyber scams and deepfake harassment reports into official police filings (formatted for `cybercrime.gov.in` and Helpline `1930`), platform takedown notices (under IT Rule 3(2)(b)), and 1-tap family warning broadcasts.
5. **The Safe-Word Protocol** providing out-of-band secret authentication to neutralize 3-second voice-clone kidnapping and emergency scams.
6. **A BroadSheet Newspaper Aesthetic** engineered with warm editorial tones, Newsreader/Fraunces serif typography, responsive data density, and animated transparent rubber stamp overlays (`REAL` / `FAKE`).

---

## ✨ Core Pillars & Features

### 1. 🔍 13-Step Institutional Verification Pipeline
- **Multimodal Ingestion**: Accepts text claims, questions, web transcripts, images, voice recordings, and PDFs.
- **Entity Recognition & Claim Decomposition**: Isolates the central subject and breaks the assertion into precise, falsifiable atomic claims.
- **Live News Wire Indexing**: Queries the **GDELT Project API**, **Google News RSS**, and **Official Government Feeds** in real time.
- **Syndication Clustering & Echo Chamber Detection**: Groups articles using fuzzy matching to uncover syndication ratios (e.g. 25 articles stemming from just 1 primary wire source).
- **Evidence Stance Matrix**: Classifies corroborating sources as `SUPPORT` (*Confirms Claim*), `CONTRADICT` (*Refutes Claim*), or `RELEVANT` (*Background Coverage*).
- **Deterministic 100-Point Scoring Algorithm**: Computes trust scores based on Source Reliability, Independent Coverage, Contradiction Strength, Image Authenticity, and Specificity.
- **Statistical Confidence Interval**: Emits confidence bounds (e.g. `Score: 88 ± 6`, `High Confidence`) based on sample size and cluster variance.
- **Cryptographic Audit Digest**: Generates a tamper-evident SHA-256 verification hash and persistent audit trail.
- **Curated Evidence Bureau**: Guarantees 5 to 10 authoritative, verified news citations per claim with clickable source URLs and reliability ratings.
- **Transparent Animated Rubber Stamp Overlay**: Features a physics-based stamp animation with fractal turbulence ink distress that slams onto the report screen for conclusive verdicts (`REAL` / `FAKE`).

---

### 2. 🎙️ Multilingual Voice Intake & Shared Transcription Pipeline
- **Universal Transcription Pipeline (`POST /api/transcribe`)**: Powered by **Groq Whisper** (`whisper-large-v3` and `whisper-large-v3-turbo`) with retry backoff and format conversion.
- **Shared Architecture**: A single unified transcription pipeline powers both the web interface microphone and the WhatsApp voice notes webhook.
- **12+ Supported Languages**: English, Hindi, Hinglish, Punjabi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, and Urdu.
- **Audio Capture Studio**: In-browser client recording via `MediaRecorder` with real-time waveform visualizer, language selector chips, and instant file upload.
- **Resilient Audio Processing**: Ingestion support for `webm`, `mp4`, `ogg`, `opus`, `wav`, `flac`, and `m4a`.

---

### 3. 💬 Live Meta WhatsApp Cloud API Channel
- **Direct Two-Way Intake**: Citizens can interact with CrossCheck directly on WhatsApp by sending text messages, links, forwarded voice notes, or photos.
- **Cryptographic Security**: Every incoming webhook payload is verified using HMAC SHA-256 signatures (`X-Hub-Signature-256`) against `WHATSAPP_APP_SECRET`.
- **Automated Voice Note Fact-Checking**: Automatically downloads WhatsApp `.ogg`/`.opus` media, runs transcription via the shared Groq Whisper engine, executes the verification pipeline, and replies with a formatted factual dossier.
- **Automated Incident Draft Creation**: When a citizen reports blackmail, impersonation, or financial extortion, CrossCheck auto-generates a structured draft report and sends back a secure tokenized review link (`/report-incident/draft/[token]`).

---

### 4. ⚖️ Citizen Incident Review & Authority Action Packs
Accessed via `/report-incident/draft/[token]`, this portal provides SSR pre-rendered Action Packs with instant tab switching (zero hydration lag):

#### Pack A: Formal Authority Filing (Cybercrime & Legal)
- Pre-structured legal complaint letter formatted specifically for submission to the National Cyber Crime Reporting Portal (**cybercrime.gov.in**) and Indian Cyber Helpline **1930**.
- Automatically cites relevant legal sections:
  - **IT Act Section 66D**: Cheating by personation using computer resource.
  - **IT Act Section 66E**: Violation of privacy and voyeurism.
  - **IT Act Section 67 / 67A**: Publishing or transmitting obscene/sexually explicit material in electronic form.
  - **BNS Section 308 / IPC Section 384**: Criminal extortion and blackmail.
- Includes unique Case Tracking IDs, victim details, chronological incident timelines, perpetrator handles/phone numbers, and one-click printable formal filings.

#### Pack B: Platform Takedown Guides
- Direct step-by-step reporting protocols and takedown links for **WhatsApp**, **Instagram/Facebook**, **Telegram**, **X (Twitter)**, **YouTube**, and **LinkedIn**.
- Includes a grievance officer legal complaint template invoking **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rule 3(2)(b)** requiring intermediary takedowns within 24–36 hours for non-consensual imagery and impersonation.

#### Pack C: Family & Peer Safety Broadcast
- Instant 1-tap pre-composed WhatsApp warning message to broadcast across family groups and social circles (*"Urgent Alert: My voice/photo is being misused in a scam..."*).
- Prevents relatives from falling victim to secondary extortion or transferring emergency funds.

---

### 5. 🗣️ The Family Safe-Word Protocol (Anti Voice-Clone Extortion)
- **Problem Addressed**: Cybercriminals use 3-second audio clips scraped from reels or calls to clone a loved one's voice, staging fabricated emergency calls (*"Papa, accident ho gaya hai, turant paise transfer karo"*).
- **Out-of-Band Authentication**: Families configure a private safe-word known only to verified members, along with a covert **Silent Duress Code** (used if a victim is speaking under physical duress).
- **Live Caller Listening & Forensic Call Analysis**:
  - Hold the phone near the incoming caller's speaker or speak their words.
  - CrossCheck transcribes caller speech in real time.
  - On stopping the call, the AI analyzes the transcript for high-pressure extortion signals, emergency urgency scripts, money transfer demands, and safe-word presence.
- **Simulation Suite**: Includes 1-click test chips for Safe-word Match, Voice-Clone Scam, and Coercion Duress for instant testing.
- **Family Directory**: Manage family members, roles, and emergency contact numbers.

---

### 6. 🗄️ Evidence Vault & Forensic Tools
- **Error Level Analysis (ELA)**: Client-side HTML5 Canvas pixel difference amplification identifying digital manipulation, composite splicing, and AI artifact hotspots.
- **EXIF Metadata Inspector**: Extracts hardware tags, camera models, compression signatures, and software fingerprints.
- **Immutable Evidence Docket**: Stores verified cases with cryptographic SHA-256 hashes, confidence scores, and case status tags.
- **Export & Share**: Generate printable PDFs or share public permanent links to forensic reports.

---

### 7. 🤖 Dual-Engine Intelligent LLM Architecture
CrossCheck features resilient AI routing with automated failover:
- **Primary Engine**: **Google Gemini 3.1 Flash-Lite** & **Gemini 3.8 Flash** (`@google/genai` & REST API).
- **Ultra-Fast Fallback**: **Groq Cloud AI** (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, and `qwen/qwen3.8-27b`) ensuring continuous operations even under missing keys or API rate limits.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework & Server** | Next.js 16.4.1 (Turbopack, App Router, SSR) |
| **Language & Runtime** | JavaScript / Node.js 20+ (ES Modules) |
| **UI & Design System** | Tailwind CSS, Lucide Icons, Radix UI Primitives, Broadsheet Editorial Typography |
| **AI & LLM Engines** | Google Gemini (3.1 Flash-Lite, 3.8 Flash) & Groq Cloud (GPT-OSS 120B, Qwen 3.8 27B) |
| **Voice & Speech** | Groq Whisper API (`whisper-large-v3`, `whisper-large-v3-turbo`) & Web Speech API |
| **Messaging Channel** | Meta WhatsApp Cloud API (Graph API v21.0), Webhooks with HMAC SHA-256 |
| **News Wire Retrieval** | GDELT Project API v2, Google News RSS, National Press Archives |
| **Client Forensics** | HTML5 Canvas Error Level Analysis (ELA), EXIF metadata inspection |
| **Persistence & Audit** | In-memory singleton with synchronous JSON persistence, Node `crypto` SHA-256 digests |

---

## 📁 Repository Structure

```text
AIdeathon/
├── app/
│   ├── api/
│   │   ├── analyze-call/             # Gemini/Groq caller speech extortion analyzer
│   │   ├── auth/                     # Citizen registration, login, session, and report migration
│   │   ├── incident/
│   │   │   ├── draft/                # Incident draft retrieval and update endpoints
│   │   │   └── extract/              # AI incident entity & narrative extraction
│   │   ├── report-incident/          # Web incident reporting submission
│   │   ├── reports/                  # Case retrieval and persistence
│   │   ├── transcribe/               # Shared Groq Whisper multilingual audio transcription
│   │   ├── verify/                   # 13-step verification pipeline API
│   │   └── whatsapp/
│   │       ├── demo/                 # WhatsApp simulated test triggers
│   │       ├── link/                 # WhatsApp phone-to-user account linking
│   │       └── webhook/              # Meta WhatsApp Cloud API two-way webhook handler
│   ├── dashboard/                    # Citizen command center & Safe-Word protocol
│   ├── login/                        # Authentication portal
│   ├── privacy/                      # Citizen privacy & data protection policy
│   ├── register/                     # Account creation
│   ├── report/[id]/                  # Standalone forensic dossier with rubber stamp overlay
│   ├── report-incident/              # Web citizen incident intake
│   │   └── draft/[token]/            # Tokenized incident review & Action Packs (SSR)
│   ├── layout.js                     # Root layout with broadsheet theme & dark mode
│   └── page.js                       # Public landing page & quick claim verification portal
├── components/
│   ├── AudioRecorder.jsx             # Multilingual microphone studio with waveform visualizer
│   ├── BroadsheetNav.jsx             # Archival newspaper header & navigation
│   ├── ELAViewer.jsx                 # Interactive Canvas Error Level Analysis viewer
│   ├── Footer.jsx                    # Editorial footer with helpline numbers
│   ├── Toast.jsx                     # Accessible alert notifications
│   ├── VerdictStampOverlay.jsx       # Animated 100% transparent rubber stamp overlay (REAL/FAKE)
│   └── VerificationModal.jsx         # Verification dialog with multimodal dropzone
├── lib/
│   ├── actionPackEngine.js           # Legal complaint, takedown guide, and broadcast generators
│   ├── audioTranscriber.js           # Groq Whisper integration with fallback & conversion
│   ├── audit.js                      # SHA-256 cryptographic audit record generator
│   ├── clustering.js                 # Fuzzy news clustering and syndication ratio detection
│   ├── confidence.js                 # Statistical confidence interval calculator
│   ├── domainDb.js                   # 200+ news & institutional domain reliability database
│   ├── dummyStore.js                 # Fast in-memory state engine with disk persistence
│   ├── gdelt.js                      # GDELT Project API news wire integration
│   ├── geminiClient.js               # Dual-engine Gemini & Groq LLM client
│   ├── groqClient.js                 # Groq Whisper and chat completion client
│   ├── incidentExtractor.js          # NLP extractor for cybercrime categories & evidence
│   ├── languageConfig.js             # 12+ language configs, ISO codes, and native names
│   ├── safecircle.js                 # Family Safe-Word engine & extortion pattern matcher
│   ├── scoring.js                    # Deterministic 100-point trust scoring matrix
│   ├── session.js                    # Secure cookie session handling
│   ├── verificationPipeline.js       # Core 13-step institutional verification orchestrator
│   ├── webNews.js                    # Google News RSS wire and government press retrieval
│   └── whatsappService.js            # Meta WhatsApp Cloud API messaging & media downloader
├── data/
│   ├── sample_articles.json          # Curated reference evidence articles
│   └── wordlist.json                 # BIP39-style dictionary for memorable safe-words
├── public/                           # Static assets, logos, and icons
├── README.md                         # Project documentation
└── package.json                      # Project dependencies & build scripts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.0.0` or higher (tested on Node v20 & v24)
- **Package Manager**: `npm`
- **Groq API Key**: ([console.groq.com](https://console.groq.com)) for Whisper transcription & LLM fallback.
- **Google Gemini API Key**: *(Optional)* ([aistudio.google.com](https://aistudio.google.com)) for primary multimodal vision analysis.
- **Meta WhatsApp Cloud API**: *(Optional for live WhatsApp bot)* Phone Number ID & System User Access Token from the [Meta for Developers Portal](https://developers.facebook.com).

---

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
   # Core AI Inference & Transcription (Required)
   GROQ_API_KEY=gsk_your_groq_api_key_here
   
   # Google Gemini Multimodal AI (Recommended)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Live Meta WhatsApp Cloud API Integration (Optional)
   WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_meta_system_user_access_token
   WHATSAPP_APP_SECRET=your_meta_app_secret
   WHATSAPP_VERIFY_TOKEN=crosscheck_verify_token

   # Public Base URL (Used for generating tokenized review links)
   APP_BASE_URL=http://localhost:3000
   ```

4. **Run the Development Server:**
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

## 📲 WhatsApp Webhook Setup (Optional for Live Messaging)

To connect the live WhatsApp channel:

1. **Expose your local server** using Cloudflare Tunnel or ngrok:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
2. In `.env.local`, set:
   ```env
   APP_BASE_URL=https://your-tunnel-subdomain.trycloudflare.com
   ```
3. In the **Meta for Developers Dashboard** $\rightarrow$ **WhatsApp** $\rightarrow$ **Configuration**:
   - **Callback URL**: `https://your-tunnel-subdomain.trycloudflare.com/api/whatsapp/webhook`
   - **Verify Token**: `crosscheck_verify_token` (matches your `WHATSAPP_VERIFY_TOKEN`)
   - **Webhook Fields**: Subscribe to `messages`.

Citizens can now send text messages, forward voice notes, or submit screenshots directly to your WhatsApp Business number.

---

## 🧪 Demonstration Walkthrough

### Scenario 1: Debunking a Viral News Claim / Deepfake
1. On the homepage or Dashboard, paste a circulating rumor (e.g. *"Rahul Gandhi is the Prime Minister of India"* or *"Punjab minister died in an accident"*).
2. Watch the live 4-phase progress bar as it extracts atomic claims, indexes GDELT/Google News, calculates syndication ratios, and computes the trust score.
3. Observe the conclusive verdict:
   - False claims receive a **0–10 Trust Score** and a red **`FAKE`** rubber stamp.
   - Authoritative sources (PIB Fact Check, Reuters, The Hindu) are displayed with **`Refutes Claim`** badges.
   - Unverified/developing assertions are marked **`UNDER REVIEW`** with neutral badges and no rubber stamp.

### Scenario 2: Multilingual Voice Intake
1. Click the **Microphone** icon in the claim input bar.
2. Select your language (e.g., *Hindi*, *Punjabi*, *Bengali*, or *English*).
3. Speak your query aloud into the browser.
4. Click **"Transcribe Audio"** — Groq Whisper transcribes the speech with high accuracy and feeds it into the verification pipeline.

### Scenario 3: Family Safe-Word & Voice-Clone Defense
1. Go to **Dashboard** $\rightarrow$ **Safe-Word Protocol**.
2. Note or customize your secret family safe-word (e.g., `SILVER PHOENIX`) and Silent Duress Code (`ORANGE SKY`).
3. Click **"Simulate: Voice-Clone Scam"**:
   - Watch CrossCheck analyze the audio transcript (*"Papa, please send money immediately, I was arrested"*).
   - The AI identifies high-pressure urgency signals, detects the **absence** of the safe-word, and triggers an immediate **Imposter Warning** with emergency guidance.

### Scenario 4: Authority Incident Action Pack Generation
1. In the Dashboard or via WhatsApp, file an incident report (e.g. extortion, deepfake harassment, or fake loan scam).
2. Open the generated review link (`/report-incident/draft/[token]`).
3. Seamlessly switch between the **Authority Filing** (formal police complaint letter citing IT Act & BNS provisions), **Platform Takedown** (grievance officer templates for Meta, Telegram, X), and **Family Broadcast** (1-tap WhatsApp alert) tabs.

---

## 📡 Core API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/verify` | `POST` | Executes the 13-step verification pipeline on text claims or uploaded media. |
| `/api/transcribe` | `POST` | Universal Groq Whisper audio transcriber (supports webm, mp4, ogg, wav, flac). |
| `/api/analyze-call` | `POST` | Evaluates incoming phone call transcripts against the Family Safe-Word protocol. |
| `/api/whatsapp/webhook` | `GET` | Meta Webhook verification handshake (`hub.challenge`). |
| `/api/whatsapp/webhook` | `POST` | Receives incoming WhatsApp text, media, and voice notes with HMAC verification. |
| `/api/incident/draft` | `GET` / `POST` | Retrieves or updates tokenized citizen incident drafts and Action Packs. |
| `/api/incident/extract` | `POST` | Analyzes unstructured incident narratives to extract entities, dates, and loss amounts. |
| `/api/auth/register` | `POST` | Registers a new citizen account with salted SHA-256 password hashing. |
| `/api/auth/login` | `POST` | Authenticates citizen sessions with secure HTTP-only cookies. |

---

## ⚖️ Ethical Framework & Public Service Commitment

CrossCheck is engineered under an open, citizen-first design philosophy:
- **Zero Hallucination Tolerance**: Neutral/under-review claims are never falsely branded as "Real" or "Fake".
- **Evidence Traceability**: Every conclusion is accompanied by verifiable, transparent news wire links and reliability metrics.
- **Privacy by Design**: Voice recordings and phone call transcripts are processed transiently for forensic evaluation and are never retained for AI training.
- **Victim Dignity First**: Action packs provide immediate, empowering legal and psychological clarity during traumatic cyber harassment incidents.

---

*Developed for the **AI Ideathon 2026**.*
