import type { Language } from '../domain/types';

/** The language Planora starts in: Dutch on a Dutch device, English everywhere else. */
export function deviceLanguage(languages: readonly string[] = globalThis.navigator?.languages ?? []): Language {
  return languages[0]?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}
