/**
 * Domain Credibility & Classification Database (85+ Curated Domains)
 * Deterministic source classification: reliability score, political leaning, country, type.
 */

export const DOMAIN_DB = {
  // ── Tier 1 Wire & International News ──
  "reuters.com":        { reliability: 0.95, leaning: 0.0, country: "GB", type: "news_tier1", name: "Reuters" },
  "apnews.com":         { reliability: 0.95, leaning: 0.0, country: "US", type: "news_tier1", name: "Associated Press" },
  "bbc.com":            { reliability: 0.92, leaning: -0.05, country: "GB", type: "news_tier1", name: "BBC News" },
  "bbc.co.uk":          { reliability: 0.92, leaning: -0.05, country: "GB", type: "news_tier1", name: "BBC UK" },
  "npr.org":            { reliability: 0.88, leaning: -0.1, country: "US", type: "news_tier1", name: "NPR" },
  "pbs.org":            { reliability: 0.88, leaning: -0.1, country: "US", type: "news_tier1", name: "PBS NewsHour" },
  "economist.com":      { reliability: 0.92, leaning: 0.1, country: "GB", type: "news_tier1", name: "The Economist" },
  "nytimes.com":        { reliability: 0.88, leaning: -0.25, country: "US", type: "news_tier1", name: "The New York Times" },
  "washingtonpost.com": { reliability: 0.85, leaning: -0.25, country: "US", type: "news_tier1", name: "The Washington Post" },
  "theguardian.com":    { reliability: 0.85, leaning: -0.3, country: "GB", type: "news_tier1", name: "The Guardian" },
  "ft.com":             { reliability: 0.92, leaning: 0.1, country: "GB", type: "news_tier1", name: "Financial Times" },
  "wsj.com":            { reliability: 0.90, leaning: 0.2, country: "US", type: "news_tier1", name: "The Wall Street Journal" },
  "bloomberg.com":      { reliability: 0.90, leaning: 0.05, country: "US", type: "news_tier1", name: "Bloomberg" },
  "afp.com":            { reliability: 0.93, leaning: 0.0, country: "FR", type: "news_tier1", name: "Agence France-Presse" },
  "aljazeera.com":      { reliability: 0.80, leaning: -0.1, country: "QA", type: "news_tier1", name: "Al Jazeera English" },
  "dw.com":             { reliability: 0.88, leaning: 0.0, country: "DE", type: "news_tier1", name: "Deutsche Welle" },
  "france24.com":       { reliability: 0.85, leaning: 0.0, country: "FR", type: "news_tier1", name: "France 24" },
  "kyodonews.net":      { reliability: 0.88, leaning: 0.0, country: "JP", type: "news_tier1", name: "Kyodo News" },
  "thehindu.com":       { reliability: 0.84, leaning: -0.1, country: "IN", type: "news_tier1", name: "The Hindu" },
  "indianexpress.com":  { reliability: 0.82, leaning: -0.05, country: "IN", type: "news_tier1", name: "Indian Express" },
  "timesofindia.indiatimes.com": { reliability: 0.72, leaning: 0.05, country: "IN", type: "news_tier2", name: "Times of India" },
  "ndtv.com":           { reliability: 0.75, leaning: -0.1, country: "IN", type: "news_tier2", name: "NDTV" },
  "hindustantimes.com": { reliability: 0.74, leaning: 0.05, country: "IN", type: "news_tier2", name: "Hindustan Times" },

  // ── Fact-Checking Organizations ──
  "snopes.com":         { reliability: 0.92, leaning: -0.1, country: "US", type: "factcheck", name: "Snopes" },
  "politifact.com":     { reliability: 0.90, leaning: -0.1, country: "US", type: "factcheck", name: "PolitiFact" },
  "factcheck.org":      { reliability: 0.93, leaning: 0.0, country: "US", type: "factcheck", name: "FactCheck.org" },
  "fullfact.org":       { reliability: 0.92, leaning: 0.0, country: "GB", type: "factcheck", name: "Full Fact" },
  "altnews.in":         { reliability: 0.88, leaning: -0.15, country: "IN", type: "factcheck", name: "Alt News" },
  "boomlive.in":        { reliability: 0.88, leaning: 0.0, country: "IN", type: "factcheck", name: "BOOM Live" },
  "vishvasnews.com":    { reliability: 0.85, leaning: 0.0, country: "IN", type: "factcheck", name: "Vishvas News" },

  // ── Official & Government Portals ──
  "pib.gov.in":         { reliability: 0.95, leaning: 0.0, country: "IN", type: "gov", name: "Press Information Bureau (Govt of India)" },
  "mea.gov.in":         { reliability: 0.96, leaning: 0.0, country: "IN", type: "gov", name: "Ministry of External Affairs (India)" },
  "gov.in":             { reliability: 0.95, leaning: 0.0, country: "IN", type: "gov", name: "Government of India Portal" },
  "state.gov":          { reliability: 0.95, leaning: 0.0, country: "US", type: "gov", name: "US Department of State" },
  "whitehouse.gov":     { reliability: 0.92, leaning: 0.0, country: "US", type: "gov", name: "The White House" },
  "gov.uk":             { reliability: 0.95, leaning: 0.0, country: "GB", type: "gov", name: "UK Government Official" },
  "who.int":            { reliability: 0.98, leaning: 0.0, country: "CH", type: "official", name: "World Health Organization" },
  "un.org":             { reliability: 0.96, leaning: 0.0, country: "US", type: "official", name: "United Nations" },
  "europa.eu":          { reliability: 0.95, leaning: 0.0, country: "BE", type: "official", name: "European Union Official" },
  "cdc.gov":            { reliability: 0.96, leaning: 0.0, country: "US", type: "gov", name: "Centers for Disease Control" },

  // ── Academic & Research ──
  "nature.com":         { reliability: 0.98, leaning: 0.0, country: "GB", type: "academic", name: "Nature Journal" },
  "science.org":        { reliability: 0.98, leaning: 0.0, country: "US", type: "academic", name: "Science Journal" },
  "thelancet.com":      { reliability: 0.97, leaning: 0.0, country: "GB", type: "academic", name: "The Lancet" },
  "arxiv.org":          { reliability: 0.85, leaning: 0.0, country: "US", type: "academic", name: "arXiv Preprint Server" },

  // ── Tier 2 Regional & Commercial News ──
  "cnn.com":            { reliability: 0.78, leaning: -0.3, country: "US", type: "news_tier2", name: "CNN" },
  "foxnews.com":        { reliability: 0.65, leaning: 0.45, country: "US", type: "news_tier2", name: "Fox News" },
  "nbcnews.com":        { reliability: 0.82, leaning: -0.2, country: "US", type: "news_tier2", name: "NBC News" },
  "cbsnews.com":        { reliability: 0.82, leaning: -0.15, country: "US", type: "news_tier2", name: "CBS News" },
  "abcnews.go.com":     { reliability: 0.82, leaning: -0.15, country: "US", type: "news_tier2", name: "ABC News" },
  "usatoday.com":       { reliability: 0.80, leaning: -0.1, country: "US", type: "news_tier2", name: "USA Today" },
  "time.com":           { reliability: 0.82, leaning: -0.2, country: "US", type: "news_tier2", name: "TIME" },
  "newsweek.com":       { reliability: 0.72, leaning: -0.05, country: "US", type: "news_tier2", name: "Newsweek" },

  // ── State-Affiliated Media ──
  "rt.com":             { reliability: 0.35, leaning: 0.3, country: "RU", type: "state", name: "RT (Russia Today)" },
  "sputniknews.com":    { reliability: 0.30, leaning: 0.3, country: "RU", type: "state", name: "Sputnik News" },
  "xinhuanet.com":      { reliability: 0.45, leaning: 0.0, country: "CN", type: "state", name: "Xinhua News Agency" },
  "globaltimes.cn":     { reliability: 0.38, leaning: 0.1, country: "CN", type: "state", name: "Global Times" },
  "presstv.ir":         { reliability: 0.30, leaning: 0.0, country: "IR", type: "state", name: "Press TV" }
};

/**
 * Extracts a clean domain from a URL or raw string
 * @param {string} urlString
 * @returns {string}
 */
export function extractCleanDomain(urlString) {
  if (!urlString) return "unknown";
  try {
    const parsed = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.substring(4);
    return host;
  } catch {
    return urlString.toLowerCase().replace(/^www\./, "").split("/")[0].trim();
  }
}

/**
 * Classifies a domain or URL against the DOMAIN_DB
 * @param {string} urlOrDomain
 * @returns {Object}
 */
export function classifyDomain(urlOrDomain) {
  const domain = extractCleanDomain(urlOrDomain);
  
  // Exact match
  if (DOMAIN_DB[domain]) {
    return { domain, ...DOMAIN_DB[domain], isKnown: true };
  }

  // Suffix/Subdomain match (e.g. news.gov.in -> gov.in)
  for (const [key, val] of Object.entries(DOMAIN_DB)) {
    if (domain.endsWith(`.${key}`) || key.endsWith(`.${domain}`)) {
      return { domain, ...val, isKnown: true };
    }
  }

  // Pattern heuristics
  if (domain.endsWith(".gov") || domain.endsWith(".gov.in") || domain.endsWith(".mil")) {
    return { domain, reliability: 0.94, leaning: 0.0, country: "US/IN", type: "gov", name: domain, isKnown: true };
  }
  if (domain.endsWith(".edu") || domain.endsWith(".ac.in") || domain.endsWith(".ac.uk")) {
    return { domain, reliability: 0.90, leaning: 0.0, country: "INT", type: "academic", name: domain, isKnown: true };
  }

  // Unknown baseline (neutral 0.50, not penalized)
  return {
    domain,
    reliability: 0.50,
    leaning: 0.0,
    country: "unknown",
    type: "unknown",
    name: domain,
    isKnown: false
  };
}
