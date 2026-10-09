// A bug report for GitHub Issues, built on this device. It holds only what the
// user typed plus technical facts (version, device, error codes): never tasks,
// calendar data, names, e-mail addresses or tokens. The user sees it and sends
// it themselves; Planora has no server.

export const ISSUE_URL = 'https://github.com/briefcasejona/planora/issues/new';
export const REPORT_EMAIL = 'planoradevelopment@outlook.com';
/** Browsers and GitHub handle long addresses, but keep well clear of their limits. */
const MAX_URL = 6000;

export type ReportPlatform = 'Website' | 'Windows' | 'Mac' | 'Linux' | 'Android' | 'iPhone / iPad';

export interface BugReportInput {
  what: string;
  expected?: string;
  steps?: string;
  version: string;
  platform: ReportPlatform;
  /** Technical lines (only shown and sent when the user leaves "attach technical details" on). */
  details?: string[];
}

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/** The pre-filled "new issue" address; field names match .github/ISSUE_TEMPLATE/bug_report.yml. */
export function buildBugReportUrl(input: BugReportInput): string {
  const what = input.what.trim();
  const fields = (limit: number) => {
    const p = new URLSearchParams({
      template: 'bug_report.yml',
      title: '[Bug] ' + clip(what.split('\n')[0] || 'Planora', 80),
      what: clip(what, limit),
      expected: clip(input.expected?.trim() ?? '', limit),
      steps: clip(input.steps?.trim() ?? '', limit),
      version: input.version,
      platform: input.platform,
      details: clip((input.details ?? []).join('\n'), limit),
    });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return ISSUE_URL + '?' + p.toString();
  };
  // Shorten the free-text fields until the address fits.
  for (let limit = 2000; limit >= 100; limit = Math.floor(limit * 0.7)) {
    const url = fields(limit);
    if (url.length <= MAX_URL) return url;
  }
  return fields(100);
}

/** The same report as plain text, for people without a GitHub account (e-mail). */
export function buildBugReportText(input: BugReportInput): string {
  return [
    'Wat gebeurde er? / What happened?',
    input.what.trim(),
    '',
    'Wat verwachtte je? / What did you expect?',
    input.expected?.trim() || '-',
    '',
    'Stappen / Steps',
    input.steps?.trim() || '-',
    '',
    `Planora ${input.version} · ${input.platform}`,
    ...(input.details?.length ? ['', ...input.details] : []),
  ].join('\n');
}
