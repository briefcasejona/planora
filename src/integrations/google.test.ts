import { describe, expect, it } from 'vitest';
import { parseGoogleResponse } from './google';
import { createGoogleWaiter } from '../../electron/oauth.cjs';

describe('Google sign-in answer', () => {
  it('accepts a token for our own request', () => {
    const t = parseGoogleResponse('#access_token=abc&expires_in=3600&state=google-1', 'google-1', 1000);
    expect(t).toEqual({ token: 'abc', expires: 1000 + 3600 * 1000 });
  });

  it('rejects an answer for another request, and passes on Google errors', () => {
    expect(() => parseGoogleResponse('#access_token=abc&state=google-2', 'google-1')).toThrow('google-state-mismatch');
    expect(() => parseGoogleResponse('#error=access_denied&state=google-1', 'google-1')).toThrow('access_denied');
    expect(() => parseGoogleResponse('#access_token=abc', '')).toThrow('google-state-mismatch');
  });
});

describe('desktop app: Google answer through the local server', () => {
  it('passes on the answer for the sign-in that is waiting', async () => {
    const w = createGoogleWaiter();
    const answer = w.wait('google-desktop-1');
    expect(w.receive('#access_token=abc&state=google-desktop-1')).toBe(204);
    await expect(answer).resolves.toBe('#access_token=abc&state=google-desktop-1');
  });

  it('refuses answers nobody is waiting for, wrong ones, and late ones', async () => {
    let now = 0;
    const w = createGoogleWaiter(() => now);
    expect(w.receive('#access_token=x&state=google-desktop-1')).toBe(400);
    const answer = w.wait('google-desktop-1');
    expect(w.receive('#access_token=x&state=google-desktop-other')).toBe(400);
    now = 6 * 60 * 1000;
    expect(w.receive('#access_token=x&state=google-desktop-1')).toBe(410);
    await expect(answer).rejects.toThrow('google-auth-timeout');
    expect(w.receive('#access_token=x&state=google-desktop-1')).toBe(400); // used up
  });
});
