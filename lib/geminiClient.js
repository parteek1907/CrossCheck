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
 * Fallback to Groq LLM (e.g. qwen/qwen3.8-27b or openai/gpt-oss-120b) when Gemini key is not configured or errors
 * @param {Array<Object>} contents
 * @param {Object} options
 * @returns {Promise<string|null>}
 */
async function callGroqFallback(contents, options = {}) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    let textPrompt = "";
    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (Array.isArray(item.parts)) {
          for (const p of item.parts) {
            if (p.text) textPrompt += p.text + "\n";
          }
        }
      }
    }

    if (!textPrompt.trim()) return null;

    const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    const userPrompt = options.jsonMode
      ? textPrompt + "\n\nCRITICAL: Respond strictly with a valid JSON object matching the requested schema."
      : textPrompt;

    for (const groqModel of groqModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              {
                role: "system",
                content: "You are an elite digital forensics and institutional misinformation verification AI. You must respond strictly with a valid JSON object."
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            temperature: options.temperature ?? 0.1,
            max_tokens: options.maxTokens ? Math.min(options.maxTokens, 1500) : 1200,
            ...(options.jsonMode ? { response_format: { type: "json_object" } } : {})
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        } else {
          const err = await res.text().catch(() => "");
          console.warn(`[Groq Fallback] ${groqModel} HTTP ${res.status}: ${err.slice(0, 120)}`);
        }
      } catch (subErr) {
        console.warn(`[Groq Fallback] ${groqModel} failed: ${subErr.message}`);
      }
    }
    return null;
  } catch (err) {
    console.warn(`[Groq Fallback] Request failed: ${err.message}`);
    return null;
  }
}

/**
 * Low-level call to Gemini API with Groq fallback
 * @param {Array<Object>} contents - Array of content parts
 * @param {Object} [options={}] - generationConfig & model options
 * @returns {Promise<string|null>} Response text
 */
export async function callGemini(contents, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.GROQ_API_KEY) {
      return callGroqFallback(contents, options);
    }
    console.warn("[Gemini Client] No GEMINI_API_KEY or GROQ_API_KEY available.");
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
      return callGroqFallback(contents, options);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
    return textPart || callGroqFallback(contents, options);
  } catch (err) {
    console.warn(`[Gemini Client] Network or timeout error: ${err.message}`);
    if (model !== FALLBACK_MODEL) {
      return callGemini(contents, { ...options, model: FALLBACK_MODEL });
    }
    return callGroqFallback(contents, options);
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

  const promptText = `You are an elite digital forensics and misinformation analyst specializing in multimodal verification.
Analyze the following user-submitted input (which may contain text, a circulating claim or question, a webpage transcript, or an attached image/document).

CRITICAL INSTRUCTIONS FOR ATTACHED IMAGES / VISUAL MEDIA:
1. "identifiedEntity": If an image or media is attached, examine it thoroughly. If it depicts a person, prominent figure, politician, celebrity, world leader, or known individual:
   - Identify their FULL NAME, title, role, and country (e.g., "Rahul Gandhi (Indian politician, Leader of the Opposition in Lok Sabha, Congress MP)", "Narendra Modi (Prime Minister of India)", "Cristiano Ronaldo (Portuguese footballer)").
   - If not an individual, describe the exact subject, document type, organization, or scene depicted.
2. "visualContext": A clear 1-2 sentence description of what is depicted in the image (setting, clothing, expression, event, or screenshot context).
3. "claimSentence": Formulate a concise, standalone, single-sentence factual assertion being claimed, questioned, or depicted (maximum 28 words):
   - CRITICAL PRONOUN / QUESTION RESOLUTION: If the user provides a question or ambiguous statement referring to the image (e.g., "is this person dead?", "did he die?", "is this real?", "has she been arrested?", "is he dead", "what happened?"):
     YOU MUST REPLACE PRONOUNS WITH THE IDENTIFIED ENTITY'S NAME!
     Example: If the image depicts Rahul Gandhi and the text is "is this person dead", the claimSentence MUST BE: "Rahul Gandhi has died / passed away".
     Example: If the image depicts Narendra Modi and text is "is he sick", the claimSentence MUST BE: "Narendra Modi is critically ill".
   - If user provided an explicit statement (e.g. "Rahul Gandhi died"), standardize to: "Rahul Gandhi has died / passed away".
   - If user provided an image without text, formulate the circulating assertion or visual depiction: e.g. "Photograph portraying Rahul Gandhi".
4. "keywords": 4 to 6 targeted, high-yield search terms for querying journalistic news wires (GDELT, Google News RSS, fact-checking bureaus).
   - MANDATORY: MUST INCLUDE the identified person's / entity's full name and the specific action/claim (e.g., "Rahul Gandhi death rumor fact check alive news").
5. "category": Choose exactly one: "Misinformation", "Deepfake / AI Media", "Financial Scam", "Impersonation", "Health & Science", or "General News".
6. "mediaAssessment": Visual authenticity analysis (evaluating signs of AI synthesis, diffusion artifacts, deepfake warping, digital editing, or genuine photographic press capture).
7. "isMediaManipulated": true if altered/AI-generated, false if authentic photographic record, null if purely text-based.

Content / Query to analyze:
"""
${rawContent ? rawContent.slice(0, 5000) : "Inspect the attached image/media document to identify the subject and verify any circulating claims."}
"""

Return ONLY a valid JSON object matching this schema:
{
  "identifiedEntity": "string",
  "visualContext": "string",
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
      if (parsed.claimSentence || parsed.identifiedEntity) {
        const keywordsVal = Array.isArray(parsed.keywords)
          ? parsed.keywords.join(" ")
          : String(parsed.keywords || "");
        
        // If claimSentence was vague but entity was identified
        let finalClaim = String(parsed.claimSentence || "").trim();
        if (parsed.identifiedEntity && (finalClaim.toLowerCase().includes("this person") || finalClaim.toLowerCase().includes("they are"))) {
          finalClaim = finalClaim.replace(/this person|they/gi, parsed.identifiedEntity.split("(")[0].trim());
        }

        return {
          identifiedEntity: parsed.identifiedEntity ? String(parsed.identifiedEntity).trim() : null,
          visualContext: parsed.visualContext ? String(parsed.visualContext).trim() : null,
          claimSentence: finalClaim || (parsed.identifiedEntity ? `Status of ${parsed.identifiedEntity}` : "Unspecified circulating claim"),
          keywords: keywordsVal.trim() || (parsed.identifiedEntity ? `${parsed.identifiedEntity} news fact check` : "news verification"),
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
    identifiedEntity: null,
    visualContext: null,
    claimSentence,
    keywords: uniqueKeywords || "breaking news fact check verification",
    category,
    mediaAssessment: media ? "Visual media submitted for forensic inspection." : "",
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
 * @param {Object} [metaContext={}] - { identifiedEntity, visualContext }
 * @returns {Promise<Object>}
 */
export async function evaluateEvidenceMatrix(claimSentence, sources = [], originalContent = "", media = null, metaContext = {}) {
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
${metaContext.identifiedEntity ? `Identified Subject / Entity: "${metaContext.identifiedEntity}"` : ""}
${metaContext.visualContext ? `Visual Context: "${metaContext.visualContext}"` : ""}

Original Context / User Query:
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
   - "Manipulated / False" (Claim is debunked, fabricated rumor, death hoax, fabricated quote, or altered visual media)
   - "Misleading Context" (True elements taken out of context, old event recycled as new, or distorted facts)
   - "Deepfake / Synthetic Media" (AI generated or synthetically cloned face/voice/scenery)
   - "Scam / Phishing" (Fraudulent request for money, credentials, fake lottery, or phishing link)
   - "Unverified / Developing" (Insufficient authoritative reporting or unconfirmed rumor)
4. Compute an accurate "trustScore" (integer 0 to 100):
   - CRITICAL: "trustScore" represents the factual truthfulness/authenticity of the TARGET CLAIM (0 = completely false/debunked rumor, 100 = verified fact).
   - For ANY claim that is factually FALSE, fabricated, refuted, or debunked (such as someone falsely claimed to hold a title or office they do not hold, like Rahul Gandhi being PM, or living person reported dead), the trustScore MUST be 0 to 10!
   - 80-100: Proven authentic & corroborated by reliable institutions
   - 55-79: Mostly true with minor ambiguities
   - 35-54: Inconclusive, unverified, or heavy conflicting claims
   - 15-34: Misleading, selective framing, or lacking evidence
   - 0-14: Outright fake, false claim, viral rumor, death hoax, phishing scam, or malicious deepfake
5. Provide a detailed, professional "verdictSummary" (3-5 sentences) summarizing:
   - What the claim alleges
   - What the factual evidence reveals (e.g. subject is alive, active, participating in public events, or fact-checked false)
   - Key discrepancies, debunking details, or verification proofs
6. "credSources": PROVIDE 5 TO 8 AUTHORITATIVE, CREDIBLE NEWS SOURCES (wires and national/international outlets such as Reuters, Press Trust of India (PTI), Associated Press, BBC News, The Hindu, The Indian Express, NDTV, PIB Fact Check, Boom Live, ANI) that report on or debunk this topic/subject. Each must have:
   - "title": Realistic headline
   - "source": Name of organization (e.g. "The Hindu", "Reuters", "BBC News", "PIB Fact Check")
   - "url": Credible URL or official domain
   - "stance": "CONTRADICT" (if refuting the hoax/claim) or "SUPPORT" (if confirming)
   - "snippet": 1-2 sentence evidence statement
   - "reliability": number 0.85 to 0.98
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
  "credSources": [
    {
      "title": "string",
      "source": "string",
      "url": "string",
      "stance": "CONTRADICT",
      "snippet": "string",
      "reliability": 0.92
    }
  ],
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
          credSources: Array.isArray(parsed.credSources) ? parsed.credSources : [],
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
    credSources: [],
    riskFlags: ["Algorithmic Evaluation"]
  };
}
