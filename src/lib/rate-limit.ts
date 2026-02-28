const store = new Map<string, number[]>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, timestamps] of store) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) {
      store.delete(key);
    } else {
      store.set(key, filtered);
    }
  }
}

export function rateLimit(opts: { windowMs: number; max: number }) {
  return function check(key: string): boolean {
    const now = Date.now();
    cleanup(opts.windowMs);

    const cutoff = now - opts.windowMs;
    const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);
    timestamps.push(now);
    store.set(key, timestamps);

    return timestamps.length <= opts.max;
  };
}

export const trackClickLimiter = rateLimit({ windowMs: 60_000, max: 60 });
export const trackLeadLimiter = rateLimit({ windowMs: 60_000, max: 10 });
export const trackSignupLimiter = rateLimit({ windowMs: 60_000, max: 10 });
export const authCallbackLimiter = rateLimit({ windowMs: 60_000, max: 10 });
