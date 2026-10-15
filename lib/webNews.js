/**
 * Web News & Institutional Government Source Retrieval
 * Queries Google News RSS and targeted official government sites.
 */

import { apiCache } from "./apiCache.js";

const GOV_DOMAINS_BY_TOPIC = {
  india:      ["mea.gov.in", "pib.gov.in", "commerce.gov.in"],
  us:         ["state.gov", "whitehouse.gov", "commerce.gov"],
  usa:        ["state.gov", "whitehouse.gov"],
  america:    ["state.gov", "whitehouse.gov"],
  uk:         ["gov.uk", "trade.gov.uk"],
  who:        ["who.int"],
  un:         ["un.org"],
  health:     ["who.int", "cdc.gov", "mohfw.gov.in"],
  finance:    ["rbi.org.in", "sec.gov", "federalreserve.gov"]
};

function decodeHtmlEntities(text) {
  return (text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? (match[1] || match[2] || "").trim() : "";
}

/**
 * Fetch articles from Google News RSS feed
 * @param {string} query
 * @param {number} [maxResults=20]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchWebNews(query, maxResults = 20) {
  if (!query || query.trim().length < 3) return [];

  const cacheKey = apiCache.constructor.key("webnews", query, maxResults);
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Crosscheck-VerificationDesk/1.0" }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const xml = await res.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < maxResults) {
      const block = match[1];
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      const pubDate = extractTag(block, "pubDate");
      const sourceName = extractTag(block, "source");

      if (title && link) {
        items.push({
          title: decodeHtmlEntities(title),
          url: link,
          source: sourceName || "Web News",
          publishDate: pubDate ? new Date(pubDate).toISOString().split("T")[0] : "",
          snippet: decodeHtmlEntities(title)
        });
      }
    }

    apiCache.set(cacheKey, items);
    return items;
  } catch (err) {
    console.warn(`[WebNews Warning] ${err.message}`);
    return [];
  }
}

/**
 * Query official government / multilateral portals for primary documentation
 * @param {string} claimText
 * @param {string} baseQuery
 * @returns {Promise<Array<Object>>}
 */
export async function fetchGovSources(claimText, baseQuery) {
  const lower = (claimText || "").toLowerCase();
  const relevantDomains = [];

  for (const [topic, domains] of Object.entries(GOV_DOMAINS_BY_TOPIC)) {
    if (lower.includes(topic)) {
      relevantDomains.push(...domains);
    }
  }

  const unique = [...new Set(relevantDomains)].slice(0, 3);
  if (unique.length === 0) return [];

  const queries = unique.map(dom => `${baseQuery} site:${dom}`);
  const results = await Promise.all(queries.map(q => fetchWebNews(q, 5)));
  return results.flat();
}
