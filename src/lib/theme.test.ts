import { describe, expect, it } from 'vitest';
import { asTheme, isDark } from './theme';

describe('theme', () => {
  it('falls back to following the device for missing or unknown values', () => {
    expect(asTheme(undefined)).toBe('system');
    expect(asTheme(null)).toBe('system');
    expect(asTheme('sepia')).toBe('system');
    expect(asTheme('light')).toBe('light');
    expect(asTheme('dark')).toBe('dark');
  });

  it('is dark when chosen, or when following a dark device', () => {
    expect(isDark('dark', false)).toBe(true);
    expect(isDark('light', true)).toBe(false);
    expect(isDark('system', true)).toBe(true);
    expect(isDark('system', false)).toBe(false);
  });
});
