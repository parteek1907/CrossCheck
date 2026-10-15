// Adapted from Veralon server/scoring/confidenceModel.ts

/**
 * Adapted from Veralon server/scoring/confidenceModel.ts
 * Computes statistical confidence interval and plain-language confidence meter.
 *
 * @param {number} score - The deterministic score (0 - 100)
 * @param {Object} [evidenceStats={}]
 * @param {number} [evidenceStats.sampleSize=3] - Total corroborating articles/evidence signals
 * @param {number} [evidenceStats.independentClusters=1] - Distinct source clusters
 * @param {number} [evidenceStats.variance=0.15] - Disagreement variance between sources (0 - 1)
 * @returns {Object} { margin, minScore, maxScore, formattedRange, level, levelColor, rationale }
 */
export function calculateConfidence(score, evidenceStats = {}) {
  const n = Math.max(1, evidenceStats.sampleSize || 1);
  const clusters = Math.max(0, evidenceStats.independentClusters !== undefined ? evidenceStats.independentClusters : 1);
  const variance = evidenceStats.variance !== undefined ? evidenceStats.variance : 0.15;

  // Normalized proportion p in [0, 1]
  const p = Math.max(0.05, Math.min(0.95, score / 100));

  // Base standard error formula: sqrt(p * (1 - p) / (n + 1))
  // Penalize single sources or lack of independent clusters
  const clusterPenalty = clusters <= 1 ? 1.6 : clusters === 2 ? 1.25 : 1.0;
  const varianceFactor = 1 + variance * 0.5;

  const baseSE = Math.sqrt((p * (1 - p)) / (n + 2));
  const zScore = 1.645; // 90% confidence interval multiplier

  // Compute margin on 0-100 scale, clamped between 4 and 25
  let rawMargin = Math.round(zScore * baseSE * 100 * clusterPenalty * varianceFactor);
  const margin = Math.max(4, Math.min(25, rawMargin));

  const minScore = Math.max(0, score - margin);
  const maxScore = Math.min(100, score + margin);

  // Confidence Level Determination:
  // High: n >= 6 and clusters >= 3 with moderate-low margin
  // Medium: n >= 3 and clusters >= 2
  // Low: n < 3 or clusters <= 1
  let level = "Medium";
  let levelColor = "#d97706"; // Amber
  let rationale = "Moderate evidence volume gathered; results have reasonable stability.";

  if (clusters >= 3 && n >= 6 && margin <= 9) {
    level = "High";
    levelColor = "#059669"; // Emerald
    rationale = "High confidence backed by multi-cluster independent corroboration.";
  } else if (clusters <= 1 || n <= 2 || margin >= 16) {
    level = "Low";
    levelColor = "#dc2626"; // Red
    rationale = "Limited source diversity or sparse corroboration creates higher variance.";
  }

  return {
    score,
    margin,
    minScore,
    maxScore,
    formattedRange: `${score} ± ${margin}`,
    intervalString: `[${minScore} - ${maxScore}]`,
    level,
    levelColor,
    clusterCount: clusters,
    sampleSize: n,
    rationale
  };
}
