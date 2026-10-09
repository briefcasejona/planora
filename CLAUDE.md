# Working on Planora

Privacy-first planning app: Vite + React + TypeScript, Electron (desktop), Capacitor (Android), PWA (web and iPhone).

## Before building a new feature
Run the `spec-sharpener` skill on the idea first. Show the owner the resulting spec (what's in, what's cut, the riskiest unknown) and build only after they agree.

## Before merging any change
This includes changes the daily bug-report routine merges itself.
1. These must pass: `npm test`, `npm run typecheck`, `npm run build`, and the e2e tests (`npx playwright test`).
2. Run the `ship-inspector` skill on the diff.
   - Fix the bugs and security issues it reports, then run the checks again.
   - Don't act on its "one decision worth discussing". Report it to the owner.
3. If a skill isn't available in the session, continue without it and say so in your summary.

## Never without the owner's OK
Changes to privacy, security, OAuth scopes, the CSP (`csp.cjs`), encryption, the sync file format or data model, the updater (`electron/updater.cjs`), or `.github/workflows`.
