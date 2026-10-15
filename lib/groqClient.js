/**
 * Groq LLM API Client (Direct REST, Zero External SDK Dependencies)
 * Implements deterministic low-temperature inference with automatic fallback.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

/**
 * Execute a completion request against Groq API
 * @param {Array<Object>} messages
 * @param {Object} [options={}]
 * @returns {Promise<string>}
 */
export async function callGroqChat(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in .env.local. Real verification requires an active Groq API key.");
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
    throw new Error(`Groq LLM error: ${err.message}`);
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
