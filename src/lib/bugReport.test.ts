import { describe, expect, it } from 'vitest';
import { buildBugReportText, buildBugReportUrl } from './bugReport';

const base = {
  what: 'Google vernieuwen doet niets\nmeer tekst',
  expected: 'Nieuwe bezette tijden',
  steps: '1. Agenda',
  version: '0.3.4',
  platform: 'Windows' as const,
  details: ['Fouten: google-400 timeRangeTooLong'],
};

describe('bug report', () => {
  it('fills the GitHub form fields by their ids', () => {
    const url = new URL(buildBugReportUrl(base));
    expect(url.origin + url.pathname).toBe('https://github.com/briefcasejona/planora/issues/new');
    const p = url.searchParams;
    expect(p.get('template')).toBe('bug_report.yml');
    expect(p.get('title')).toBe('[Bug] Google vernieuwen doet niets');
    expect(p.get('what')).toBe(base.what);
    expect(p.get('platform')).toBe('Windows');
    expect(p.get('version')).toBe('0.3.4');
    expect(p.get('details')).toContain('google-400');
  });

  it('leaves out empty fields and stays short enough for a browser address', () => {
    const url = buildBugReportUrl({ ...base, expected: '', steps: undefined, details: [], what: 'x'.repeat(20000) });
    const p = new URL(url).searchParams;
    expect(p.has('expected')).toBe(false);
    expect(p.has('details')).toBe(false);
    expect(url.length).toBeLessThanOrEqual(6000);
  });

  it('has a plain-text version for e-mail', () => {
    const text = buildBugReportText(base);
    expect(text).toContain('Planora 0.3.4 · Windows');
    expect(text).toContain('google-400');
  });
});
