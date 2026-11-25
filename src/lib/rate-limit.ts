/**
 * Fixed-window counter per key.
 * shortcut: memory is per server instance, so the real limit is `limit` × instances; move to Vercel Firewall rate limiting or a shared store when traffic grows.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function allow(key: string, now = Date.now()) {
    if (hits.size > 10_000)
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
