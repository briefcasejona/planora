import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4174', channel: 'chrome', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run build && npx vite preview --port 4174 --strictPort', port: 4174, reuseExistingServer: false, timeout: 180_000 },
});
