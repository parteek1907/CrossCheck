/**
 * Institutional Verification Engine (13-Step Verification Pipeline)
 * Pure, deterministic, auditable, multi-source fact-checking engine.
 * Emits real-time progress callbacks for streaming SSE updates.
 */

import { extractClaimAndKeywords, evaluateEvidenceMatrix } from "./groqClient.js";
import { fetchGdeltArticles } from "./gdelt.js";
import { fetchWebNews, fetchGovSources } from "./webNews.js";
import { classifyDomain, extractCleanDomain } from "./domainDb.js";
import { clusterEvidenceArticles } from "./clustering.js";
import { calculateDeterministicScore } from "./scoring.js";
import { calculateConfidence } from "./confidence.js";
import { generateAuditRecord } from "./audit.js";

/**
 * Deduplicate and normalize raw article items from GDELT, Google News, and Gov feeds
 * @param {Array<Object>} articles
 * @returns {Array<Object>}
 */
function deduplicateEvidence(articles) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const deduped = [];

  for (const art of articles) {
    if (!art.title || art.title.length < 5) continue;
    
    // Normalize URL
    let cleanUrl = art.url || "";
    try {
      const u = new URL(cleanUrl);
      cleanUrl = `${u.origin}${u.pathname}`;
    } catch {
      cleanUrl = cleanUrl.split("?")[0];
    }

    // Title key for duplicate wire syndications
    const titleKey = art.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 45);

    if (cleanUrl && seenUrls.has(cleanUrl)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;

    if (cleanUrl) seenUrls.add(cleanUrl);
    if (titleKey) seenTitles.add(titleKey);

    const classification = classifyDomain(art.url || art.source);

    deduped.push({
      id: `src-${deduped.length + 1}`,
      title: art.title,
      url: art.url,
      source: art.source || classification.name,
      domain: classification.domain,
      reliability: classification.reliability,
      leaning: classification.leaning,
      country: classification.country,
      type: classification.type,
      publishDate: art.publishDate || "",
      snippet: art.snippet || art.title
    });
  }

  return deduped;
}

/**
 * Executes the complete 13-step Verification Pipeline
 * @param {string} inputContent - Text, statement, or transcribed media
 * @param {Object} [options={}]
 * @param {Function} [options.onProgress] - Callback for streaming events (step, message, pct)
 * @returns {Promise<Object>} Full verified report object
 */
export async function runVerificationPipeline(inputContent, options = {}) {
  const startTime = Date.now();
  const emit = (stage, message, pct) => {
    if (typeof options.onProgress === "function") {
      options.onProgress({ stage, message, pct });
    }
  };

  emit("extract_claim", "Analyzing content and extracting verifiable factual assertion...", 10);

  // 1. LLM Call #1: Extract single-sentence claim, search keywords, and category
  const { claimSentence, keywords, category } = await extractClaimAndKeywords(inputContent);

  emit("search_evidence", `Retrieving live news wire reporting for: "${keywords}"...`, 25);

  // 2. Multi-source evidence retrieval in parallel (GDELT + Google News RSS + Gov)
  const baseQuery = keywords || claimSentence;
  const [gdeltArticles, webArticles, govArticles] = await Promise.all([
    fetchGdeltArticles(baseQuery, 20),
    fetchWebNews(baseQuery, 20),
    fetchGovSources(claimSentence, baseQuery)
  ]);

  emit("deduplicate_classify", "Deduplicating open sources and classifying domain authority...", 45);

  // 3. Deduplicate and classify domains against DOMAIN_DB
  const allRawArticles = [...govArticles, ...gdeltArticles, ...webArticles];
  const classifiedSources = deduplicateEvidence(allRawArticles);

  emit("cluster_evidence", "Performing Union-Find clustering to isolate syndicated echo chambers...", 60);

  // 4. Evidence Clustering (Union-Find, domain & Jaccard title similarity >= 0.55)
  const clusteringResult = clusterEvidenceArticles(classifiedSources, 0.55);

  emit("evaluate_matrix", "Decomposing into atomic claims and classifying per-source stances...", 75);

  // 5. LLM Call #2: Atomic claim decomposition & stance matrix
  const { atomicClaims, matrix, verdictSummary } = await evaluateEvidenceMatrix(claimSentence, classifiedSources);

  // Attach stances to classified sources
  let supportCount = 0;
  let contradictCount = 0;
  let neutralCount = 0;

  for (const src of classifiedSources) {
    // Check stances across atomic claims
    let isSupporter = false;
    let isContradictor = false;

    for (const [claimKey, stanceMap] of Object.entries(matrix)) {
      const srcKey = `S${classifiedSources.indexOf(src) + 1}`;
      const stance = stanceMap?.[srcKey];
      if (stance === "SUPPORT") isSupporter = true;
      if (stance === "CONTRADICT") isContradictor = true;
    }

    if (isContradictor) {
      src.stance = "CONTRADICT";
      contradictCount++;
    } else if (isSupporter) {
      src.stance = "SUPPORT";
      supportCount++;
    } else {
      src.stance = "IRRELEVANT";
      neutralCount++;
    }
  }

  emit("deterministic_score", "Computing deterministic 100-point score and statistical error bounds...", 90);

  // 6. Compute deterministic components
  const totalEvaluated = classifiedSources.length;
  const avgSourceReliability = totalEvaluated > 0
    ? Math.round((classifiedSources.reduce((acc, s) => acc + s.reliability, 0) / totalEvaluated) * 100)
    : 50;

  // Independent coverage score based on cluster count
  const clusterCount = Math.max(1, clusteringResult.independentSourceCount || 1);
  const independentCoverageScore = Math.min(100, clusterCount * 25);

  // Contradiction strength: percentage of active contradictors
  const activeStanceCount = supportCount + contradictCount;
  const contradictionStrength = activeStanceCount > 0
    ? Math.round((contradictCount / activeStanceCount) * 100)
    : 30;

  // Specificity based on atomic claims & keywords clarity
  const claimSpecificity = Math.min(95, Math.max(45, atomicClaims.length * 30 + (keywords.split(" ").length * 5)));

  const components = {
    sourceReliability: avgSourceReliability,
    independentCoverage: independentCoverageScore,
    contradictionStrength: contradictionStrength,
    imageAuthenticity: 50, // Neutral text baseline (modified if forensics runs)
    claimSpecificity: claimSpecificity
  };

  const metadata = {
    clusterCount: clusterCount,
    hasDominantContradiction: contradictionStrength >= 55
  };

  const scoringResult = calculateDeterministicScore(components, metadata);

  // 7. Statistical Confidence Model (Score ± Margin)
  const confidence = calculateConfidence(scoringResult.finalScore, {
    sampleSize: Math.max(1, totalEvaluated),
    independentClusters: clusterCount,
    variance: contradictionStrength > 40 ? 0.25 : 0.08
  });

  emit("cryptographic_audit", "Generating SHA-256 audit record...", 95);

  // 8. Cryptographic SHA-256 Audit Record
  const audit = await generateAuditRecord({
    claimText: claimSentence,
    score: scoringResult.finalScore,
    verdict: scoringResult.verdict,
    confidence: confidence.level,
    breakdown: scoringResult.breakdown
  });

  const durationMs = Date.now() - startTime;

  emit("complete", "Verification complete.", 100);

  // 9. Assembled Report Object
  return {
    reportId: audit.reportId,
    claimText: claimSentence,
    inputText: inputContent,
    category: category,
    verdict: scoringResult.verdict,
    score: scoringResult.finalScore,
    confidence: {
      margin: confidence.margin,
      lower: confidence.lower,
      upper: confidence.upper,
      level: confidence.level,
      formattedRange: confidence.formattedRange,
      sampleSize: confidence.sampleSize
    },
    scoringResult: {
      ...scoringResult,
      verdictSummary
    },
    clusteringResult: {
      ...clusteringResult,
      totalArticles: totalEvaluated
    },
    sources: classifiedSources,
    atomicClaims,
    matrix,
    audit: {
      reportId: audit.reportId,
      auditHash: audit.auditHash,
      timestamp: audit.timestamp,
      verificationChainDigest: audit.verificationChainDigest
    },
    durationMs: durationMs,
    createdAt: new Date().toISOString(),
    isSaved: false
  };
}
