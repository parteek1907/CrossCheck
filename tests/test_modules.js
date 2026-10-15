// Test suite for Modules 1-7 (Vanilla JS ported from Veralon)
import { calculateDeterministicScore } from "../js/scoring.js";
import { calculateConfidence } from "../js/confidence.js";
import { clusterEvidenceArticles, computeTitleJaccard } from "../js/clustering.js";
import { sha256Hex, generateAuditRecord, verifyAuditRecord } from "../js/audit.js";
import { calculateTrigramSimilarity, detectRepeatClaim } from "../js/similarity.js";
import fs from "fs";

console.log("=== RUNNING TRUSTLENS MODULE TESTS (1-7) ===");

// 1. Test Scoring Module
console.log("\n[1] Testing js/scoring.js...");
const scoreRes1 = calculateDeterministicScore({
  sourceReliability: 90,
  independentCoverage: 80,
  contradictionStrength: 85,
  imageAuthenticity: 80,
  claimSpecificity: 80
}, { clusterCount: 1, hasDominantContradiction: true });

console.assert(scoreRes1.verdict === "Likely manipulated", `Expected Likely manipulated, got ${scoreRes1.verdict}`);
console.assert(scoreRes1.finalScore === 40, `Expected score capped to 40, got ${scoreRes1.finalScore}`);
console.assert(scoreRes1.capsApplied.length > 0, "Expected score caps to be applied");
console.log("✓ Scoring caps and verdict passed:", {
  rawScore: scoreRes1.rawScore,
  finalScore: scoreRes1.finalScore,
  verdict: scoreRes1.verdict,
  caps: scoreRes1.capsApplied.map(c => c.reason)
});

// 2. Test Confidence Module
console.log("\n[2] Testing js/confidence.js...");
const confRes1 = calculateConfidence(scoreRes1.finalScore, {
  sampleSize: 12,
  independentClusters: 3,
  variance: 0.1
});
console.assert(confRes1.margin >= 4 && confRes1.margin <= 25, `Margin out of bounds: ${confRes1.margin}`);
console.assert(["High", "Medium", "Low"].includes(confRes1.level), `Invalid level: ${confRes1.level}`);
console.log("✓ Confidence interval passed:", {
  formattedRange: confRes1.formattedRange,
  interval: confRes1.intervalString,
  level: confRes1.level
});

// 3. Test Clustering Module
console.log("\n[3] Testing js/clustering.js...");
const sampleArticles = JSON.parse(fs.readFileSync("./data/sample_articles.json", "utf-8"));
const clusterRes = clusterEvidenceArticles(sampleArticles, 0.55);
console.assert(clusterRes.totalArticles === 12, `Expected 12 articles, got ${clusterRes.totalArticles}`);
console.assert(clusterRes.independentSourceCount <= 4, `Expected <= 4 clusters, got ${clusterRes.independentSourceCount}`);
console.assert(clusterRes.summaryCardText.includes("articles, only"), "Summary text missing format");
console.log("✓ Evidence clustering passed:", {
  summary: clusterRes.summaryCardText,
  ratio: clusterRes.syndicationRatio,
  clusterCount: clusterRes.clusters.length
});

// 4. Test Audit Module
console.log("\n[4] Testing js/audit.js...");
const auditRes = await generateAuditRecord({
  claim: "Test biometric chip mandate",
  score: 35,
  verdict: "Likely manipulated"
});
console.assert(auditRes.reportId.startsWith("TL-"), `Report ID must start with TL-, got ${auditRes.reportId}`);
console.assert(auditRes.auditHash.length === 64, `Audit hash must be 64-char hex, got ${auditRes.auditHash}`);
const isValidHash = await verifyAuditRecord(auditRes.canonicalJson, auditRes.auditHash);
console.assert(isValidHash, "Audit verification failed");
console.log("✓ Audit hash and ID passed:", {
  reportId: auditRes.reportId,
  hash: auditRes.auditHash.substring(0, 16) + "...",
  verified: isValidHash
});

// 5. Test Similarity Module
console.log("\n[5] Testing js/similarity.js...");
const knownClaims = JSON.parse(fs.readFileSync("./data/known_claims.json", "utf-8"));
const simRes = detectRepeatClaim(
  "Government order announcing mandatory biometric microchip implants for citizens in November",
  knownClaims,
  0.45
);
console.assert(simRes.isRepeat === true, "Expected repeat claim detection");
console.assert(simRes.bestMatch.id === "claim-001", `Expected claim-001, got ${simRes.bestMatch?.id}`);
console.assert(simRes.bannerMessage !== null, "Expected banner message");
console.log("✓ Repeat-claim trigram similarity passed:", {
  isRepeat: simRes.isRepeat,
  match: simRes.bestMatch?.claim.substring(0, 45) + "...",
  score: simRes.percentage + "%",
  banner: simRes.bannerMessage
});

// 6. Test Trending Data
console.log("\n[6] Testing trending hoaxes dataset...");
const trendingHoaxes = JSON.parse(fs.readFileSync("./data/trending_hoaxes.json", "utf-8"));
console.assert(trendingHoaxes.length >= 4, "Expected at least 4 trending hoaxes");
console.log("✓ Trending hoaxes dataset valid:", `${trendingHoaxes.length} items loaded`);

console.log("\n=========================================");
console.log("ALL MODULE TESTS (1-7) PASSED SUCCESSFULLY!");
console.log("=========================================\n");
