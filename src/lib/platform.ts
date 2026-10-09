import { Capacitor } from '@capacitor/core';

/** Bridge exposed by electron/preload.cjs in the desktop app (absent elsewhere). */
export interface DesktopBridge {
  saveFile(name: string, content: string): Promise<boolean>;
  onOpenFile(cb: (name: string, content: string) => void): void;
  getSettings(): Promise<{ closeToTray: boolean; openAtLogin: boolean; platform?: string }>;
  setSettings(s: { closeToTray?: boolean; openAtLogin?: boolean }): Promise<void>;
}

declare global {
  interface Window {
    planoraDesktop?: DesktopBridge;
  }
}

export type Platform = 'desktop' | 'android' | 'ios' | 'web';

export function platform(): Platform {
  if (typeof window !== 'undefined' && window.planoraDesktop) return 'desktop';
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : 'web';
}

export const isNativeApp = () => Capacitor.isNativePlatform();

/** iPhone/iPad (also iPads that report themselves as a Mac). */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** Planora opened from the iPhone home screen (popups don't work well there). */
export function isIosStandalone(): boolean {
  return isIos() && (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Base path the app is served from ("/" locally, "/planora/" on GitHub Pages). */
export const BASE = import.meta.env.BASE_URL;

/** Path inside the app, respecting the base path (e.g. asset('icon.svg')). */
export const asset = (path: string) => BASE + path.replace(/^\//, '');

/** Absolute URL inside the app, e.g. for OAuth redirect URIs. */
export const appUrl = (path: string) => window.location.origin + asset(path);
