import { describe, expect, it } from 'vitest';
import { MS_SCOPES } from '../integrations/microsoft/auth';
import { ALL_SCOPES, adminConsentUrl } from './consent';

describe('admin consent link', () => {
  it('asks for exactly the permissions Planora uses, for the admin’s own organisation', () => {
    const url = new URL(adminConsentUrl('abc-123', 'https://example.org/planora/auth-redirect.html'));
    expect(url.origin + url.pathname).toBe('https://login.microsoftonline.com/organizations/v2.0/adminconsent');
    expect(url.searchParams.get('client_id')).toBe('abc-123');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.org/planora/auth-redirect.html');
    expect(url.searchParams.get('scope')?.split(' ')).toEqual(
      ALL_SCOPES.map((s) => 'https://graph.microsoft.com/' + s),
    );
    // The page must list exactly what the app asks for.
    expect([...ALL_SCOPES].sort()).toEqual(Object.values(MS_SCOPES).flat().sort());
  });
});
