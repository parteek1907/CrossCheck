// Adapted from Veralon server/scoring/deterministicScoring.ts

/**
 * Weights for the deterministic 100-point credibility score
 */
export const SCORING_WEIGHTS = {
  sourceReliability: 0.25,
  independentCoverage: 0.25,
  contradictionStrength: 0.20, // Inverted: low contradiction = high score
  imageAuthenticity: 0.15,
  claimSpecificity: 0.15,
};

/**
 * Adapted from Veralon server/scoring/deterministicScoring.ts
 * Computes deterministic component breakdown, applies safety caps, and assigns verdict.
 *
 * @param {Object} components
 * @param {number} components.sourceReliability - 0 to 100
 * @param {number} components.independentCoverage - 0 to 100
 * @param {number} components.contradictionStrength - 0 to 100 (higher means more refuted)
 * @param {number} components.imageAuthenticity - 0 to 100
 * @param {number} components.claimSpecificity - 0 to 100
 * @param {Object} [metadata={}]
 * @param {number} [metadata.clusterCount=1] - Number of independent clusters
 * @param {boolean} [metadata.hasDominantContradiction=false]
 * @returns {Object} { finalScore, rawScore, verdict, breakdown, capsApplied }
 */
export function calculateDeterministicScore(components, metadata = {}) {
  const {
    sourceReliability = 50,
    independentCoverage = 50,
    contradictionStrength = 50,
    imageAuthenticity = 50,
    claimSpecificity = 50,
  } = components;

  const clusterCount = metadata.clusterCount !== undefined ? metadata.clusterCount : 1;
  const hasDominantContradiction = metadata.hasDominantContradiction !== undefined
    ? metadata.hasDominantContradiction
    : contradictionStrength >= 65;

  // Consistency component is inverse of contradiction strength
  const consistencyScore = Math.max(0, Math.min(100, 100 - contradictionStrength));

  // Component contributions based on weights
  const breakdown = {
    sourceReliability: {
      label: "Source Reliability",
      raw: sourceReliability,
      weight: SCORING_WEIGHTS.sourceReliability,
      points: Math.round(sourceReliability * SCORING_WEIGHTS.sourceReliability * 10) / 10,
      description: "Reputation and track record of publishing domains"
    },
    independentCoverage: {
      label: "Independent Coverage",
      raw: independentCoverage,
      weight: SCORING_WEIGHTS.independentCoverage,
      points: Math.round(independentCoverage * SCORING_WEIGHTS.independentCoverage * 10) / 10,
      description: "Unique corroborating journalistic reporting clusters"
    },
    contradictionStrength: {
      label: "Contradiction Strength",
      raw: contradictionStrength,
      consistencyScore: consistencyScore,
      weight: SCORING_WEIGHTS.contradictionStrength,
      points: Math.round(consistencyScore * SCORING_WEIGHTS.contradictionStrength * 10) / 10,
      description: "Absence of direct refutations from recognized fact-checkers"
    },
    imageAuthenticity: {
      label: "Image Authenticity",
      raw: imageAuthenticity,
      weight: SCORING_WEIGHTS.imageAuthenticity,
      points: Math.round(imageAuthenticity * SCORING_WEIGHTS.imageAuthenticity * 10) / 10,
      description: "Compression consistency and EXIF sensor markers"
    },
    claimSpecificity: {
      label: "Claim Specificity",
      raw: claimSpecificity,
      weight: SCORING_WEIGHTS.claimSpecificity,
      points: Math.round(claimSpecificity * SCORING_WEIGHTS.claimSpecificity * 10) / 10,
      description: "Verifiability of concrete names, dates, and locations"
    }
  };

  const rawScore = Math.round(
    breakdown.sourceReliability.points +
    breakdown.independentCoverage.points +
    breakdown.contradictionStrength.points +
    breakdown.imageAuthenticity.points +
    breakdown.claimSpecificity.points
  );

  let finalScore = Math.max(0, Math.min(100, rawScore));
  const capsApplied = [];

  // Veralon Score Caps:
  // 1. Zero independent clusters: capped at max 50
  if (clusterCount === 0) {
    if (finalScore > 50) {
      finalScore = 50;
      capsApplied.push({
        cap: 50,
        reason: "Zero independent clusters detected (isolated uncorroborated claim)"
      });
    }
  }

  // 2. Contradictions dominating: capped at max 40
  if (hasDominantContradiction || contradictionStrength > 65) {
    if (finalScore > 40) {
      finalScore = 40;
      capsApplied.push({
        cap: 40,
        reason: "Contradictions dominating (authoritative debunks present)"
      });
    }
  }

  // 3. Low image authenticity: capped at max 60
  if (imageAuthenticity < 40) {
    if (finalScore > 60) {
      finalScore = 60;
      capsApplied.push({
        cap: 60,
        reason: "Low image authenticity (<40% signal reliability)"
      });
    }
  }

  // Map final score to 3 verdicts
  let verdict = "Inconclusive";
  let verdictColor = "#d97706"; // Amber
  let verdictSummary = "Evidence is conflicting or insufficient for a conclusive determination.";

  if (finalScore < 45) {
    verdict = "Likely manipulated";
    verdictColor = "#dc2626"; // Red
    verdictSummary = "Multiple critical integrity indicators failed or authoritative refutations exist.";
  } else if (finalScore > 70) {
    verdict = "No signs found";
    verdictColor = "#059669"; // Emerald
    verdictSummary = "Consistent multi-source corroboration and high visual integrity observed.";
  }

  return {
    finalScore,
    rawScore,
    verdict,
    verdictColor,
    verdictSummary,
    breakdown,
    capsApplied,
    calculatedAt: new Date().toISOString()
  };
}
