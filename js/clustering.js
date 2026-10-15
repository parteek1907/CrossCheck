// Adapted from Veralon server/scoring/evidenceClustering.ts

/**
 * Union-Find (Disjoint-Set) data structure with path compression and rank optimization.
 */
class UnionFind {
  constructor(size) {
    this.parent = new Array(size).fill(0).map((_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return false;

    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    return true;
  }
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "by", "for", "in", "on", "at",
  "to", "from", "with", "as", "is", "was", "are", "were", "of", "it", "that", "this"
]);

/**
 * Tokenizes text and filters basic stop words.
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenizeWords(text) {
  if (!text) return new Set();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(tokens);
}

/**
 * Adapted from Veralon server/scoring/evidenceClustering.ts
 * Computes Jaccard word similarity between two titles.
 *
 * @param {string} titleA
 * @param {string} titleB
 * @returns {number} 0 to 1
 */
export function computeTitleJaccard(titleA, titleB) {
  const wordsA = tokenizeWords(titleA);
  const wordsB = tokenizeWords(titleB);

  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Adapted from Veralon server/scoring/evidenceClustering.ts
 * Groups articles into independent clusters using domain matching and Jaccard title similarity >= 0.55.
 *
 * @param {Array<Object>} articles - Array of article objects
 * @param {number} [threshold=0.55] - Jaccard title similarity threshold
 * @returns {Object} { totalArticles, independentSourceCount, syndicationRatio, summaryCardText, clusters }
 */
export function clusterEvidenceArticles(articles, threshold = 0.55) {
  if (!articles || articles.length === 0) {
    return {
      totalArticles: 0,
      independentSourceCount: 0,
      syndicationRatio: "1.0x",
      summaryCardText: "0 articles evaluated",
      clusters: []
    };
  }

  const n = articles.length;
  const uf = new UnionFind(n);

  // Compare every pair
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const artA = articles[i];
      const artB = articles[j];

      // Condition 1: Identical domain -> same publisher cluster
      const sameDomain = artA.domain && artB.domain && (
        artA.domain.toLowerCase() === artB.domain.toLowerCase()
      );

      // Condition 2: Title Jaccard similarity >= 0.55 -> syndicated wire reprint
      const similarity = computeTitleJaccard(artA.title, artB.title);
      const isSyndicated = similarity >= threshold;

      if (sameDomain || isSyndicated) {
        uf.union(i, j);
      }
    }
  }

  // Aggregate into cluster buckets
  const clusterMap = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!clusterMap.has(root)) {
      clusterMap.set(root, []);
    }
    clusterMap.get(root).push(articles[i]);
  }

  // Build cluster objects
  const clusters = Array.from(clusterMap.values()).map((clusterArticles, idx) => {
    const domains = Array.from(new Set(clusterArticles.map(a => a.domain).filter(Boolean)));
    const avgReliability = Math.round(
      (clusterArticles.reduce((acc, a) => acc + (a.reliability || 0.5), 0) / clusterArticles.length) * 100
    );
    const stances = { supports: 0, refutes: 0, neutral: 0 };
    clusterArticles.forEach(a => {
      const s = a.stance || "neutral";
      if (stances[s] !== undefined) stances[s]++;
      else stances.neutral++;
    });

    const isEchoChamber = clusterArticles.length > 2 && domains.length <= 2;

    return {
      clusterId: `cluster-${idx + 1}`,
      articleCount: clusterArticles.length,
      domains,
      primaryHeadline: clusterArticles[0].title,
      leadArticle: clusterArticles[0],
      articles: clusterArticles,
      averageReliability: avgReliability,
      stances,
      isEchoChamber,
      badge: isEchoChamber ? "Syndicated Echo Chamber" : "Independent Cluster"
    };
  });

  // Sort clusters by size descending
  clusters.sort((a, b) => b.articleCount - a.articleCount);

  const independentSourceCount = clusters.length;
  const syndicationRatio = (articles.length / Math.max(1, independentSourceCount)).toFixed(1) + "x";
  const summaryCardText = `${articles.length} articles, only ${independentSourceCount} independent ${independentSourceCount === 1 ? "source" : "sources"}`;

  return {
    totalArticles: articles.length,
    independentSourceCount,
    syndicationRatio,
    summaryCardText,
    clusters
  };
}
