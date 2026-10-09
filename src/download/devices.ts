export type Device = 'windows' | 'mac' | 'linux' | 'android' | 'ios';

const LATEST = 'https://github.com/briefcasejona/planora/releases/latest/download/';

/** Files per device, in the order of the buttons (the first one is the main download). */
export const DOWNLOADS: Record<Device, { href: string }[]> = {
  windows: [{ href: LATEST + 'Planora-Setup.exe' }, { href: LATEST + 'Planora-portable.exe' }],
  mac: [{ href: LATEST + 'Planora-Mac-AppleSilicon.dmg' }, { href: LATEST + 'Planora-Mac-Intel.dmg' }],
  linux: [{ href: LATEST + 'Planora.AppImage' }],
  android: [{ href: LATEST + 'Planora.apk' }, { href: './' }],
  ios: [{ href: './' }],
};

/** Best guess of the visitor's device from the browser's user agent. */
export function detectDevice(ua: string, maxTouchPoints = 0): Device {
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  if (/Linux|X11|CrOS/.test(ua)) return 'linux';
  return 'windows';
}
