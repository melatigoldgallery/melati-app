// composables/useCache.js
// Cache-first helper untuk Firestore — mencegah re-fetch tidak perlu
// TTL: 0 = permanent, n = milliseconds

export function useCache(namespace) {
  const PREFIX = `melati_cache_${namespace}_`;

  function get(key) {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    try {
      const { data, expiresAt } = JSON.parse(raw);
      if (expiresAt && Date.now() > expiresAt) {
        sessionStorage.removeItem(PREFIX + key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function set(key, data, ttl = 0) {
    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify({ data, expiresAt }));
    } catch {
      // Ignore quota exceeded — graceful degrade
    }
  }

  function invalidate(key) {
    sessionStorage.removeItem(PREFIX + key);
  }

  function invalidateAll() {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  }

  return { get, set, invalidate, invalidateAll };
}

// ─── TTL constants ────────────────────────────────────────────────────────────
export const TTL = {
  FIVE_MIN: 5 * 60 * 1000,
  ONE_HOUR: 1 * 60 * 60 * 1000,
  TWO_HOUR: 2 * 60 * 60 * 1000,
  PERMANENT: 0,
};
