// Adapted from Veralon pg_trgm similarity concept

/**
 * Normalizes text for n-gram generation: lowercase, remove excess punctuation.
 * @param {string} str
 * @returns {string}
 */
function normalizeForTrigrams(str) {
  if (!str) return "  ";
  return `  ${str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()} `;
}

/**
 * Extracts character trigrams from a string (mirrors PostgreSQL pg_trgm logic).
 * @param {string} text
 * @returns {Set<string>}
 */
export function extractTrigrams(text) {
  const normalized = normalizeForTrigrams(text);
  const trigrams = new Set();
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Adapted from Veralon pg_trgm similarity concept
 * Computes pg_trgm style character trigram Jaccard similarity.
 *
 * @param {string} strA
 * @param {string} strB
 * @returns {number} 0.0 to 1.0
 */
export function calculateTrigramSimilarity(strA, strB) {
  if (!strA || !strB) return 0;
  const triA = extractTrigrams(strA);
  const triB = extractTrigrams(strB);

  if (triA.size === 0 && triB.size === 0) return 1.0;
  if (triA.size === 0 || triB.size === 0) return 0.0;

  let intersection = 0;
  for (const tri of triA) {
    if (triB.has(tri)) intersection++;
  }

  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Adapted from Veralon pg_trgm similarity concept
 * Checks an input text against the known claims database to flag previously debunked hoaxes.
 *
 * @param {string} inputClaim - User's query text or headline
 * @param {Array<Object>} knownClaims - Array of known claim objects
 * @param {number} [threshold=0.45] - Matching threshold (0.45+ indicates high semantic overlap)
 * @returns {Object} { isRepeat, bestMatch, similarityScore, bannerMessage }
 */
export function detectRepeatClaim(inputClaim, knownClaims = [], threshold = 0.45) {
  if (!inputClaim || !knownClaims || knownClaims.length === 0) {
    return {
      isRepeat: false,
      bestMatch: null,
      similarityScore: 0,
      bannerMessage: null
    };
  }

  let highestScore = 0;
  let bestMatch = null;

  for (const claimObj of knownClaims) {
    const score = calculateTrigramSimilarity(inputClaim, claimObj.claim);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = claimObj;
    }
  }

  const isRepeat = highestScore >= threshold;
  let bannerMessage = null;

  if (isRepeat && bestMatch) {
    const formattedScore = Math.round(highestScore * 100);
    bannerMessage = `This claim was already checked on ${bestMatch.firstSeen} (${formattedScore}% match). Verified status: ${bestMatch.verdict.toUpperCase()}`;
  }

  return {
    isRepeat,
    bestMatch,
    similarityScore: highestScore,
    percentage: Math.round(highestScore * 100),
    bannerMessage
  };
}
