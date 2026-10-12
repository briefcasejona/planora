import type { Theme } from '../domain/types';
import { platform } from './platform';

// The choice is also kept in localStorage so the right colours show before the (locked) data loads.
const KEY = 'planora-theme';
let current: Theme = 'system';

/** A valid theme, or 'system' for anything else (missing, unknown, from a newer app). */
export function asTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function isDark(theme: Theme, deviceDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && deviceDark);
}

function deviceDark(): boolean {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Colour the page, and on the apps the status bar and title bar, for this choice. */
export function applyTheme(value: unknown): void {
  current = asTheme(value);
  const root = document.documentElement;
  // Without data-theme the stylesheet follows the device (see the dark variant in index.css).
  if (current === 'system') delete root.dataset.theme;
  else root.dataset.theme = current;
  try {
    localStorage.setItem(KEY, current);
  } catch {
    // Private mode or storage off: the theme still applies once the settings load.
  }
  syncSystemBars();
}

function syncSystemBars(): void {
  const p = platform();
  if (p === 'desktop') void window.planoraDesktop?.setTheme?.(current)?.catch(() => undefined);
  if (p === 'android') {
    const dark = isDark(current, deviceDark());
    void import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }))
      .catch(() => undefined);
  }
}

/** Apply the last known choice right away and keep following the device while it's 'system'. */
export function startTheme(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    // See applyTheme.
  }
  applyTheme(stored);
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (current === 'system') syncSystemBars();
  });
}
