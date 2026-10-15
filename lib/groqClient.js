/**
 * Groq LLM API Client (Direct REST, Zero External SDK Dependencies)
 * Implements deterministic low-temperature inference with automatic fallback.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const PRIMARY_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "qwen/qwen3.8-27b";

/**
 * Execute a completion request against Groq API
 * @param {Array<Object>} messages
 * @param {Object} [options={}]
 * @returns {Promise<string>}
 */
export async function callGroqChat(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = options.model || PRIMARY_MODEL;
  const temperature = options.temperature ?? 0.05;
  const maxTokens = options.maxTokens || 1200;
  const jsonMode = !!options.jsonMode;

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {})
  };

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      // If primary model deprecated/unavailable, try fallback
      if (model !== FALLBACK_MODEL && (res.status === 404 || res.status === 400)) {
        console.warn(`[Groq] Primary model ${model} failed (${res.status}), retrying with ${FALLBACK_MODEL}...`);
        return callGroqChat(messages, { ...options, model: FALLBACK_MODEL });
      }
      throw new Error(`Groq API returned HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.warn(`[Groq Client] Warning: ${err.message}. Falling back to deterministic analysis.`);
    return null;
  }
}

/**
 * Step 1: Extract core verifiable claim and search query keywords from raw input
 * @param {string} rawContent
 * @returns {Promise<{ claimSentence: string, keywords: string, category: string }>}
 */
export async function extractClaimAndKeywords(rawContent) {
  const prompt = `You are a forensic verification editor. Analyze the following content and extract:
1. "claimSentence": A concise, standalone, single-sentence factual assertion (max 25 words).
2. "keywords": 3 to 6 essential search terms for retrieving news wire reports and fact-checks.
3. "category": Choose exactly one: "Misinformation", "Financial Scam", "Impersonation", "Foreign Affairs", "Science & Health", or "General".

Input content:
"""
${rawContent.slice(0, 4000)}
"""

Return ONLY a JSON object:
{
  "claimSentence": "...",
  "keywords": "...",
  "category": "..."
}`;

  const raw = await callGroqChat(
    [{ role: "user", content: prompt }],
    { jsonMode: true, temperature: 0.0 }
  );

  if (!raw) {
    // Deterministic NLP extraction
    const cleaned = rawContent.replace(/\s+/g, " ").trim();
    const firstSentence = cleaned.split(/[.?!]\s+/)[0] || cleaned;
    const claimSentence = firstSentence.length > 180 ? firstSentence.slice(0, 180) + "..." : firstSentence;
    const stopwords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","shall","should","can","could","may","might","must","this","that","these","those","it","its","as","if","not"]);
    const words = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w));
    const uniqueKeywords = Array.from(new Set(words)).slice(0, 5).join(" ");

    let category = "Misinformation";
    const lower = cleaned.toLowerCase();
    if (lower.includes("scam") || lower.includes("bank") || lower.includes("upi") || lower.includes("crypto") || lower.includes("money") || lower.includes("fund") || lower.includes("invest")) {
      category = "Financial Scam";
    } else if (lower.includes("health") || lower.includes("vaccine") || lower.includes("virus") || lower.includes("cure") || lower.includes("who")) {
      category = "Science & Health";
    } else if (lower.includes("war") || lower.includes("treaty") || lower.includes("sanction") || lower.includes("un") || lower.includes("minister")) {
      category = "Foreign Affairs";
    }

    return {
      claimSentence,
      keywords: uniqueKeywords || claimSentence.slice(0, 60),
      category
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      claimSentence: parsed.claimSentence || rawContent.slice(0, 120),
      keywords: parsed.keywords || rawContent.slice(0, 60),
      category: parsed.category || "General"
    };
  } catch {
    return {
      claimSentence: rawContent.slice(0, 120),
      keywords: rawContent.slice(0, 60),
      category: "General"
    };
  }
}

/**
 * Step 2: Extract atomic claims and classify each evidence source's stance
 * @param {string} claimSentence
 * @param {Array<Object>} sources
 * @returns {Promise<{ atomicClaims: Array<Object>, matrix: Object, verdictSummary: string }>}
 */
export async function evaluateEvidenceMatrix(claimSentence, sources) {
  const cappedSources = sources.slice(0, 15);
  const sourcesBlock = cappedSources.map((s, idx) => 
    `[S${idx + 1}] Source: ${s.source} (${s.domain})\nTitle: "${s.title}"\nSnippet: ${s.snippet || s.title}`
  ).join("\n\n");

  const prompt = `You are an institutional fact-checking engine. Evaluate the evidence sources against the claim.

MAIN CLAIM:
"${claimSentence}"

EVIDENCE SOURCES:
${sourcesBlock || "No news wire articles retrieved."}

TASK:
1. Break the main claim into 1 to 3 "atomicClaims" (independent verifiable propositions).
2. For each atomic claim, classify the stance of each evidence source (S1, S2...) as "SUPPORT", "CONTRADICT", or "IRRELEVANT".
3. Provide a 2-sentence objective "verdictSummary" synthesizing what the collective evidence establishes.

Return ONLY a JSON object in this exact format:
{
  "atomicClaims": [
    { "id": "C1", "text": "...", "importance": 1.0 }
  ],
  "matrix": {
    "C1": { "S1": "SUPPORT", "S2": "CONTRADICT" }
  },
  "verdictSummary": "..."
}`;

  const raw = await callGroqChat(
    [{ role: "user", content: prompt }],
    { jsonMode: true, temperature: 0.05, maxTokens: 1400 }
  );

  if (!raw) {
    const atomicClaims = [{ id: "C1", text: claimSentence, importance: 1.0 }];
    const matrix = { C1: {} };
    const claimLower = claimSentence.toLowerCase();
    const debunkWords = ["false", "fake", "hoax", "debunk", "misleading", "fact check", "fact-check", "unverified", "denies", "refutes", "incorrect"];
    
    let contradictors = 0;
    let supporters = 0;

    cappedSources.forEach((s, idx) => {
      const srcKey = `S${idx + 1}`;
      const text = `${s.title} ${s.snippet || ""}`.toLowerCase();
      
      const hasDebunk = debunkWords.some(dw => text.includes(dw));
      if (hasDebunk) {
        matrix.C1[srcKey] = "CONTRADICT";
        contradictors++;
      } else {
        const words = claimLower.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 4);
        const matchCount = words.filter(w => text.includes(w)).length;
        if (matchCount >= 2) {
          matrix.C1[srcKey] = "SUPPORT";
          supporters++;
        } else {
          matrix.C1[srcKey] = "IRRELEVANT";
        }
      }
    });

    const verdictSummary = contradictors > 0
      ? `Retrieved reporting directly contradicts this claim with documented refutations across ${contradictors} source(s).`
      : supporters > 0
      ? `Multiple news reports corroborate aspects of this assertion.`
      : `No authoritative news wire reporting found verifying this statement.`;

    return {
      atomicClaims,
      matrix,
      verdictSummary
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      atomicClaims: parsed.atomicClaims || [{ id: "C1", text: claimSentence, importance: 1.0 }],
      matrix: parsed.matrix || {},
      verdictSummary: parsed.verdictSummary || "Analysis completed against retrieved open-source reporting."
    };
  } catch {
    return {
      atomicClaims: [{ id: "C1", text: claimSentence, importance: 1.0 }],
      matrix: {},
      verdictSummary: "Evidence analyzed against news databases."
    };
  }
}
