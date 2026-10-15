/**
 * Google Gemini Forensic AI Client
 * Powered by Gemini 3.1 Flash-Lite & Gemini 3.8 Flash
 * Multimodal: text, links, documents (PDF), and images.
 */

import { isJunkTitle } from "./domainDb.js";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.8-flash";

/**
 * Low-level call to Gemini API with model fallback
 * @param {Array<Object>} contents - Array of content parts
 * @param {Object} [options={}] - generationConfig & model options
 * @returns {Promise<string|null>} Response text
 */
export async function callGemini(contents, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Gemini Client] No GEMINI_API_KEY available.");
    return null;
  }

  const model = options.model || PRIMARY_MODEL;
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxTokens ?? 2048,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {})
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[Gemini Client] ${model} returned HTTP ${res.status}: ${errText.slice(0, 200)}`);

      // Try fallback model if primary hits 404, 503, or 429
      if (model !== FALLBACK_MODEL) {
        console.info(`[Gemini Client] Retrying with fallback model ${FALLBACK_MODEL}...`);
        return callGemini(contents, { ...options, model: FALLBACK_MODEL });
      }
      return null;
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
    return textPart || null;
  } catch (err) {
    console.warn(`[Gemini Client] Network or timeout error: ${err.message}`);
    if (model !== FALLBACK_MODEL) {
      return callGemini(contents, { ...options, model: FALLBACK_MODEL });
    }
    return null;
  }
}

/**
 * Step 1: Extract claim, search keywords, category, and visual assessment from input
 * @param {string} rawContent
 * @param {Object} [media=null] - { mimeType, data (base64) }
 * @returns {Promise<{ claimSentence: string, keywords: string, category: string, mediaAssessment?: string, isMediaManipulated?: boolean }>}
 */
export async function extractClaimAndKeywords(rawContent, media = null) {
  const parts = [];

  // If media attachment provided (image or PDF)
  if (media && media.data && media.mimeType) {
    parts.push({
      inlineData: {
        mimeType: media.mimeType,
        data: media.data
      }
    });
  }

  const promptText = `You are an elite digital forensics and misinformation analyst.
Analyze the following user-submitted content (which may contain circulating claim text, a webpage transcript, a document, or an attached image).

Task:
1. Extract "claimSentence": A concise, standalone, single-sentence factual assertion being claimed or depicted (maximum 28 words). Be specific with names, dates, numbers, or events.
2. Extract "keywords": 3 to 6 targeted search terms best suited for querying journalistic wire feeds (GDELT, Google News RSS, fact-checkers) to corroborate or debunk this claim.
3. Extract "category": Choose exactly one: "Misinformation", "Deepfake / AI Media", "Financial Scam", "Impersonation", "Health & Science", or "General News".
4. If an image or media is attached:
   - "mediaAssessment": Brief analysis of visual authenticity (signs of AI generation, diffusion artifacts, digital tampering, cloned pixels, or genuine screenshot).
   - "isMediaManipulated": true if altered/AI-generated, false if authentic, null if unknown.

Content to analyze:
"""
${rawContent ? rawContent.slice(0, 5000) : "Inspect the attached image/media document."}
"""

Return ONLY a valid JSON object matching this schema:
{
  "claimSentence": "string",
  "keywords": "string",
  "category": "string",
  "mediaAssessment": "string",
  "isMediaManipulated": boolean
}`;

  parts.push({ text: promptText });

  const rawJson = await callGemini([{ parts }], { jsonMode: true, temperature: 0.1 });

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed.claimSentence) {
        const keywordsVal = Array.isArray(parsed.keywords)
          ? parsed.keywords.join(" ")
          : String(parsed.keywords || "");
        return {
          claimSentence: String(parsed.claimSentence).trim(),
          keywords: keywordsVal.trim(),
          category: parsed.category || "Misinformation",
          mediaAssessment: parsed.mediaAssessment || "",
          isMediaManipulated: parsed.isMediaManipulated ?? null
        };
      }
    } catch (e) {
      console.warn("[Gemini Client] Failed to parse JSON response:", e);
    }
  }

  // Deterministic NLP fallback if Gemini is unreachable
  const cleaned = (rawContent || "Unspecified circulating claim").replace(/\s+/g, " ").trim();
  const firstSentence = cleaned.split(/[.?!]\s+/)[0] || cleaned;
  const claimSentence = firstSentence.length > 180 ? firstSentence.slice(0, 180) + "..." : firstSentence;
  const stopwords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","shall","should","can","could","may","might","must","this","that","these","those","it","its","as","if","not","http","https","com","org","www"]);
  const words = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w));
  const uniqueKeywords = Array.from(new Set(words)).slice(0, 5).join(" ");

  let category = "Misinformation";
  const lower = cleaned.toLowerCase();
  if (lower.includes("rupee") || lower.includes("dollar") || lower.includes("crypto") || lower.includes("otp") || lower.includes("account")) {
    category = "Financial Scam";
  } else if (lower.includes("official") || lower.includes("ministry") || lower.includes("police") || lower.includes("urgent")) {
    category = "Impersonation";
  }

  return {
    claimSentence,
    keywords: uniqueKeywords || "breaking news fact check verification",
    category,
    mediaAssessment: media ? "Visual media submitted for local inspection." : "",
    isMediaManipulated: null
  };
}

/**
 * Step 2: In-depth Evidence Evaluation & Stance Matrix
 * Evaluates the claim against retrieved news sources and original content.
 * @param {string} claimSentence
 * @param {Array<Object>} sources - Retrieved and classified news wire articles
 * @param {string} [originalContent=""]
 * @param {Object} [media=null]
 * @returns {Promise<Object>}
 */
export async function evaluateEvidenceMatrix(claimSentence, sources = [], originalContent = "", media = null) {
  const parts = [];

  if (media && media.data && media.mimeType) {
    parts.push({
      inlineData: {
        mimeType: media.mimeType,
        data: media.data
      }
    });
  }

  // Filter out junk titles and sort sources by reliability so the most credible ones are prioritized
  const cleanSources = (sources || []).filter(s => !isJunkTitle(s.title));
  const sortedSources = [...cleanSources].sort((a, b) => (b.reliability || 0.6) - (a.reliability || 0.6));

  const sourcesList = sortedSources.slice(0, 15).map((s, idx) => {
    return `[S${idx + 1}] Title: "${s.title}" | Source: ${s.source || s.domain} (${s.domain || "web"}) | Reliability: ${Math.round((s.reliability || 0.6) * 100)}% | Date: ${s.publishDate || "Recent"}\nSnippet: ${s.snippet || s.title}`;
  }).join("\n\n");

  const promptText = `You are the Lead Forensics Examiner at an institutional fact-checking bureau.
Conduct a rigorous verification of the following claim using the retrieved evidence sources, your knowledge base, and any submitted media.

Target Claim:
"${claimSentence}"

Original Context:
"${(originalContent || "").slice(0, 1500)}"

Retrieved Multi-Source News Wire & Fact-Check Evidence (${sortedSources.length} sources):
${sourcesList || "No external wire articles found matching keywords."}

Instructions:
1. Deconstruct the claim into 2-3 "atomicClaims" (precise, falsifiable sub-assertions).
2. For each atomic claim (C1, C2...) and each source (S1, S2...), determine the source's stance: "SUPPORT", "CONTRADICT", or "IRRELEVANT":
   CRITICAL STANCE CRITERIA:
   - "CONTRADICT": Any reporting that directly refutes the claim, confirms the subject is alive/safe/active (for death, health, or arrest hoaxes, proof of ongoing rallies, speeches, birthdays, or active public appearances directly refutes a death claim!), or debunks the assertion.
   - "SUPPORT": Any reporting that confirms the claim is true.
   - "IRRELEVANT": Only mark as IRRELEVANT if the article is completely unrelated and provides zero confirmation or refutation.
3. Determine the "verdict":
   - "Verified Fact" (Claim is corroborated by multiple reputable sources, authoritative bodies, or factual record)
   - "Manipulated / False" (Claim is debunked, fabricated, fabricated quote, or altered visual media)
   - "Misleading Context" (True elements taken out of context, old event recycled as new, or distorted facts)
   - "Deepfake / Synthetic Media" (AI generated or synthetically cloned face/voice/scenery)
   - "Scam / Phishing" (Fraudulent request for money, credentials, fake lottery, or phishing link)
   - "Unverified / Developing" (Insufficient authoritative reporting or unconfirmed rumor)
4. Compute an accurate "trustScore" (integer 0 to 100):
   - 80-100: Proven authentic & corroborated by reliable institutions
   - 55-79: Mostly true with minor ambiguities
   - 35-54: Inconclusive, unverified, or heavy conflicting claims
   - 15-34: Misleading, selective framing, or lacking evidence
   - 0-14: Outright fake, viral hoax, phishing scam, or malicious deepfake
5. Provide a detailed, professional "verdictSummary" (3-5 sentences) summarizing:
   - What the claim alleges
   - What the factual evidence reveals (citing specific sources or lack thereof)
   - Key discrepancies, debunking details, or verification proofs
6. Provide calibrated "subScores" (integers 0 to 100):
   - "sourceReliability": average credibility of sources reporting on this
   - "independentCoverage": breadth of distinct coverage
   - "contradictionStrength": strength of refutations (0 = zero refutation, 100 = total refutation)
   - "imageAuthenticity": authenticity rating of media (50 if text-only, 0-30 if fake/AI, 85-100 if genuine photo)
   - "claimSpecificity": clarity and testability of assertion
7. Provide 2-4 "riskFlags" (short warning tags, e.g. "Viral WhatsApp Forward", "Debunked by Fact-Checkers", "No Official Confirmation").

Return ONLY a valid JSON object matching this schema:
{
  "verdict": "string",
  "trustScore": number,
  "verdictSummary": "string",
  "atomicClaims": ["string", "string"],
  "matrix": {
    "C1": { "S1": "SUPPORT", "S2": "CONTRADICT" }
  },
  "subScores": {
    "sourceReliability": number,
    "independentCoverage": number,
    "contradictionStrength": number,
    "imageAuthenticity": number,
    "claimSpecificity": number
  },
  "riskFlags": ["string"]
}`;

  parts.push({ text: promptText });

  const rawJson = await callGemini([{ parts }], { jsonMode: true, temperature: 0.1 });

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed.verdict && typeof parsed.trustScore === "number") {
        return {
          verdict: parsed.verdict,
          trustScore: Math.max(0, Math.min(100, Math.round(parsed.trustScore))),
          verdictSummary: parsed.verdictSummary || "",
          atomicClaims: Array.isArray(parsed.atomicClaims) && parsed.atomicClaims.length > 0
            ? parsed.atomicClaims
            : [`Claim: ${claimSentence}`],
          matrix: parsed.matrix || {},
          subScores: parsed.subScores || {
            sourceReliability: 70,
            independentCoverage: 60,
            contradictionStrength: 20,
            imageAuthenticity: 50,
            claimSpecificity: 75
          },
          riskFlags: parsed.riskFlags || []
        };
      }
    } catch (e) {
      console.warn("[Gemini Client] Failed to parse evidence matrix JSON:", e);
    }
  }

  // Fallback heuristic scoring
  return {
    verdict: sources.length > 0 ? "Under Review" : "Unverified Claim",
    trustScore: sources.length > 3 ? 55 : 35,
    verdictSummary: `Algorithmic analysis completed for: "${claimSentence}". Open news wire indexing retrieved ${sources.length} matching coverage items. Additional forensic confirmation recommended.`,
    atomicClaims: [`Core assertion: ${claimSentence}`],
    matrix: {},
    subScores: {
      sourceReliability: 60,
      independentCoverage: Math.min(90, sources.length * 15),
      contradictionStrength: 30,
      imageAuthenticity: 50,
      claimSpecificity: 70
    },
    riskFlags: ["Algorithmic Evaluation"]
  };
}
