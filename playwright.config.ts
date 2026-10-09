import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testIgnore: 'desktop.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4174/planora/', channel: 'chrome', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // Test the GitHub Pages build, which lives under /planora/.
  webServer: {
    command: 'npm run build && npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174/planora/',
    // A placeholder Google client id, so the Google button exists; tests answer for Google themselves.
    env: { VITE_BASE: '/planora/', VITE_GOOGLE_CLIENT_ID: 'e2e-test.apps.googleusercontent.com' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
