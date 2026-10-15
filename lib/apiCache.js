/**
 * In-Memory 30-Minute API Response Cache
 * Prevents redundant external calls to GDELT and News feeds within the TTL window.
 */

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 500;

class ApiCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key, data, ttlMs = DEFAULT_TTL_MS) {
    if (this.store.size >= MAX_ENTRIES) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  async getOrFetch(key, fetcher, ttlMs = DEFAULT_TTL_MS) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  static key(...parts) {
    return parts.map(p => String(p).trim().toLowerCase().replace(/\s+/g, "_")).join("::");
  }

  clear() {
    this.store.clear();
  }
}

export const apiCache = new ApiCache();
