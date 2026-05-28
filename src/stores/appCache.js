import { defineStore } from 'pinia';

const TTL = 2 * 60 * 1000; // 2 minutes

export const useAppCache = defineStore('appCache', () => {
  const cache = new Map();

  function peek(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.fetchedAt < TTL) return entry.data;
    return null;
  }

  function set(key, data) {
    cache.set(key, { data, fetchedAt: Date.now() });
  }

  async function getOrFetch(key, fetcher) {
    const cached = peek(key);
    if (cached !== null) return cached;
    const data = await fetcher();
    set(key, data);
    return data;
  }

  function invalidate(...keys) {
    keys.forEach(k => cache.delete(k));
  }

  function invalidatePattern(prefix) {
    for (const k of cache.keys()) {
      if (k.startsWith(prefix)) cache.delete(k);
    }
  }

  return { peek, set, getOrFetch, invalidate, invalidatePattern };
});
