import { defineConfig } from '@playwright/test';

// Tests the Electron desktop app (run `npm run build` first).
export default defineConfig({ testDir: 'e2e', testMatch: 'desktop.spec.ts', timeout: 90_000 });
