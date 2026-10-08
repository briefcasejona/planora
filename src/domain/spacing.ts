/**
 * Spaced-practice distribution for tests: returns `n` day offsets in
 * [0, windowDays - 1] that get denser toward the end of the window
 * (e.g. 14 days, 7 sessions -> 0, 4, 7, 9, 11, 12, 13).
 *
 * `density` > 1 bunches sessions toward the deadline; 1 spreads evenly.
 */
export function spacedDayOffsets(windowDays: number, n: number, density = 1.6): number[] {
  if (windowDays <= 0 || n <= 0) return [];
  if (n >= windowDays) return Array.from({ length: windowDays }, (_, i) => i);
  if (n === 1) return [windowDays - 1];
  const last = windowDays - 1;
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0..1
    // 1 - (1 - t)^density: steep at the start, flat near the end => denser near deadline.
    raw.push(Math.round(last * (1 - Math.pow(1 - t, density))));
  }
  // Make strictly increasing while staying within bounds.
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const prev = i === 0 ? -1 : out[i - 1];
    out.push(Math.max(raw[i], prev + 1));
  }
  for (let i = out.length - 1; i >= 0; i--) {
    const cap = i === out.length - 1 ? last : out[i + 1] - 1;
    out[i] = Math.min(out[i], cap);
  }
  return out;
}

/** Evenly spread offsets (for assignments/tasks), biased slightly early. */
export function evenDayOffsets(windowDays: number, n: number): number[] {
  if (windowDays <= 0 || n <= 0) return [];
  if (n >= windowDays) return Array.from({ length: n }, (_, i) => Math.min(i, windowDays - 1));
  const step = windowDays / n;
  return Array.from({ length: n }, (_, i) => Math.floor(i * step));
}

/**
 * Split total minutes into n blocks clamped to [minBlock, maxBlock], rounded
 * to 5 minutes. For tests the last block is a lighter review block.
 */
export function splitMinutes(totalMin: number, n: number, minBlock: number, maxBlock: number, lightLast = false): number[] {
  if (totalMin <= 0 || n <= 0) return [];
  const weights = Array.from({ length: n }, (_, i) => (lightLast && n > 2 && i === n - 1 ? 0.6 : 1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const blocks = weights.map((w) => Math.max(minBlock, Math.min(maxBlock, Math.round((totalMin * w) / wsum / 5) * 5)));
  // Fix rounding drift on the largest block (keeps the sum equal to total when possible).
  let diff = totalMin - blocks.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0 && i < blocks.length * 4; i++) {
    const idx = i % blocks.length;
    const step = diff > 0 ? Math.min(5, diff) : Math.max(-5, diff);
    const next = blocks[idx] + step;
    if (next >= minBlock && next <= maxBlock) {
      blocks[idx] = next;
      diff -= step;
    }
  }
  // Anything still left (exceeds n * maxBlock) becomes extra blocks.
  while (diff >= minBlock) {
    const b = Math.min(maxBlock, diff);
    blocks.push(b);
    diff -= b;
  }
  return blocks;
}
