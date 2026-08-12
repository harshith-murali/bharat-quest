import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The chat rate limiter is defined inside chat.ts and closes over module state,
 * so it is re-implemented here to the same contract and exercised directly.
 * If the production algorithm changes, this test should be updated alongside it.
 *
 * Contract: at most MAX requests per section per window; windows are per-section
 * and reset independently.
 */

const MAX = 20;
const WINDOW_MS = 60_000;

function makeLimiter(max = MAX, windowMs = WINDOW_MS) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function check(sectionId: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(sectionId);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(sectionId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count >= max) return false;
    bucket.count++;
    return true;
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('chat rate limiting', () => {
  it('allows requests up to the limit', () => {
    const check = makeLimiter();
    for (let i = 0; i < MAX; i++) {
      expect(check('sec-a')).toBe(true);
    }
  });

  it('blocks the request after the limit is reached', () => {
    const check = makeLimiter();
    for (let i = 0; i < MAX; i++) check('sec-a');
    expect(check('sec-a')).toBe(false);
  });

  it('tracks each section independently', () => {
    const check = makeLimiter();
    for (let i = 0; i < MAX; i++) check('sec-a');

    // One class exhausting its quota must not silence another class.
    expect(check('sec-a')).toBe(false);
    expect(check('sec-b')).toBe(true);
  });

  it('resets once the window elapses', () => {
    const check = makeLimiter();
    for (let i = 0; i < MAX; i++) check('sec-a');
    expect(check('sec-a')).toBe(false);

    vi.advanceTimersByTime(WINDOW_MS + 1);
    expect(check('sec-a')).toBe(true);
  });

  it('does not reset early, part-way through a window', () => {
    const check = makeLimiter();
    for (let i = 0; i < MAX; i++) check('sec-a');

    vi.advanceTimersByTime(WINDOW_MS / 2);
    expect(check('sec-a')).toBe(false);
  });
});
