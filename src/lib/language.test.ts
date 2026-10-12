import { describe, expect, it } from 'vitest';
import { deviceLanguage } from './language';

describe('starting language', () => {
  it('is Dutch on a Dutch device, in the Netherlands or Belgium', () => {
    expect(deviceLanguage(['nl-NL', 'en-US'])).toBe('nl');
    expect(deviceLanguage(['nl-BE'])).toBe('nl');
    expect(deviceLanguage(['NL'])).toBe('nl');
  });

  it('is English on any other device, or when the device says nothing', () => {
    expect(deviceLanguage(['en-GB', 'nl-NL'])).toBe('en');
    expect(deviceLanguage(['de-DE'])).toBe('en');
    expect(deviceLanguage([])).toBe('en');
  });
});
