interface RateLimitEntry {
  timestamps: number[];
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 25;

declare global {
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = globalThis.__rateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__rateLimitStore) {
  globalThis.__rateLimitStore = store;
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const entry = store.get(key) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((ts) => ts >= cutoff);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    store.set(key, entry);

    return false;
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return true;
}
