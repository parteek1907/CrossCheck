/**
 * GDELT DOC 2.0 Real-Time Article Retrieval
 * Uses official public API: https://api.gdeltproject.org/api/v2/doc/doc
 * Free, non-commercial, no API key required.
 */

import { apiCache } from "./apiCache.js";

const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

/**
 * Fetch articles from GDELT DOC 2.0 API matching query
 * @param {string} query
 * @param {number} [maxResults=20]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchGdeltArticles(query, maxResults = 20) {
  if (!query || query.trim().length < 3) return [];

  const cacheKey = apiCache.constructor.key("gdelt", query, maxResults);
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log(`[GDELT Cache Hit] ${query}`);
    return cached;
  }

  try {
    const params = new URLSearchParams({
      query: query,
      mode: "artlist",
      maxrecords: String(maxResults),
      format: "json",
      timespan: "4weeks"
    });

    const url = `${GDELT_BASE}?${params.toString()}`;
    console.log(`[GDELT API] Querying: ${query}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Crosscheck-VerificationDesk/1.0" }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[GDELT API] Status ${res.status}`);
      return [];
    }

    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.articles)) {
      apiCache.set(cacheKey, [], 10 * 60 * 1000);
      return [];
    }

    const results = data.articles.slice(0, maxResults).map(a => ({
      title: a.title || "Untitled Wire Report",
      url: a.url || "",
      source: a.domain || a.sourcecountry || "Wire Service",
      publishDate: a.seendate ? `${a.seendate.substring(0, 4)}-${a.seendate.substring(4, 6)}-${a.seendate.substring(6, 8)}` : "",
      snippet: a.title || ""
    }));

    apiCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.warn(`[GDELT Warning] ${err.name === 'AbortError' ? 'Timeout' : err.message}`);
    return [];
  }
}
