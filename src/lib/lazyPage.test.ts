import { describe, expect, it } from 'vitest';
import { shouldReload } from './lazyPage';

describe('shouldReload', () => {
  const now = 1_800_000_000_000;

  it('reloads when it has not tried before', () => {
    expect(shouldReload(null, now)).toBe(true);
  });

  it('does not reload again right after a reload that did not help', () => {
    expect(shouldReload(String(now - 5_000), now)).toBe(false);
  });

  it('tries again for a later failure, e.g. the next update', () => {
    expect(shouldReload(String(now - 60_000), now)).toBe(true);
  });

  it('ignores a stored value it cannot read', () => {
    expect(shouldReload('garbage', now)).toBe(true);
  });
});
