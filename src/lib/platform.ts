import { Capacitor } from '@capacitor/core';

/** Bridge exposed by electron/preload.cjs in the desktop app (absent elsewhere). */
export interface DesktopBridge {
  saveFile(name: string, content: string): Promise<boolean>;
  onOpenFile(cb: (name: string, content: string) => void): void;
  getSettings(): Promise<{ closeToTray: boolean; openAtLogin: boolean; autoUpdate?: boolean; platform?: string }>;
  setSettings(s: { closeToTray?: boolean; openAtLogin?: boolean; autoUpdate?: boolean }): Promise<void>;
  /** Updates (desktop app 0.3.3 and later). */
  onUpdateStatus?(cb: (status: DesktopUpdateStatus) => void): void;
  getUpdateStatus?(): Promise<DesktopUpdateStatus>;
  checkForUpdate?(): Promise<DesktopUpdateStatus>;
  installUpdate?(): Promise<boolean>;
  /** Google sign-in in the system browser (Google refuses app windows); resolves with Google's answer (#…). */
  googleSignIn?(url: string, state: string): Promise<string>;
}

export interface DesktopUpdateStatus {
  state: 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error';
  /** 'install': this copy can replace itself; 'notify': only a download button (Mac, portable .exe). */
  kind: 'install' | 'notify';
  current: string;
  version?: string;
  lastCheck?: string;
  error?: string;
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

declare const __APP_VERSION__: string;
/** Planora's version, from package.json at build time. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
