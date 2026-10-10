# App inventory — Planora v0.3.4

RESEARCH NOTES — NOT LEGAL ADVICE. Generated 2026-10-10 by app-legal-guard from the code; evidence in brackets.

## 1. Distribution
- Website / PWA: https://briefcasejona.github.io/planora/ (GitHub Pages, deployed from `main`) [`.github/workflows/pages.yml`, README]
- Desktop: Windows (installer + portable), Mac (.dmg, not notarised), Linux (AppImage) via GitHub Releases [README, `.github/workflows/release.yml`]
- Android: `Planora.apk` via GitHub Releases (sideload, not on Google Play) [README]
- iPhone/iPad: website added to Home Screen (no App Store) [README]
- Updates: desktop checks `api.github.com/repos/briefcasejona/planora/releases/latest` [`electron/updater.cjs:13`]; Android checks the same URL, can be turned off [`src/integrations/updates.ts:37`, `csp.cjs` comment]

## 2. Audience
- "Planning app for students and teachers" [README, CLAUDE.md]; role choice Student/Teacher [`en.json` role.*]; "school days" [onboarding.timeIntro]; Teams assignments + school Microsoft accounts [`MS_SCOPES.importTeams`, NEXT-STEPS "school IT approval"] → **users likely include minors (secondary school)**.
- UI in English and Dutch [`src/i18n/`]

## 3. Personal data
- Tasks, plans, feedback, own calendar events, settings, learned estimates: **on the device only** (IndexedDB via Dexie) [`src/data/db.ts`, privacy.local]
- Optional encryption with passphrase [`src/data/crypto.ts`, `PrivacyCenter.tsx`]; backups always encrypted, downloaded by the user [`src/data/backup.ts`]
- Activity log: counts only, never content [privacy.logIntro, CLAUDE.md data rules]
- "Delete everything" wipes local data and signs out; **does not delete the OneDrive sync copy or other devices** [`PrivacyCenter.tsx:295`]
- No Planora server, no Planora accounts [privacy.noServer, `bugReport.ts` header]

## 4. Network destinations (CSP `connect-src`) [`csp.cjs`]
| Host | Purpose | Data | When |
|---|---|---|---|
| login.microsoftonline.com (+ login.live.com etc. in app) | Microsoft sign-in | Microsoft account credentials (entered at Microsoft) | User connects Outlook/Teams or sync |
| graph.microsoft.com | Calendar/To Do/Teams/OneDrive API | See §5 | Feature on |
| *.1drv.com, *.microsoftpersonalcontent.com, *.sharepoint.com | OneDrive sync file | End-to-end encrypted sync file | Sync on |
| www.googleapis.com, oauth2.googleapis.com | Google sign-in + freeBusy | Busy times of primary calendar, −7 to +90 days [`google.ts:199-234`] | Google on |
| api.github.com | Update check | IP address, user agent | Android (can be off) + desktop |
| GitHub Pages / Releases | Website + downloads | IP address, user agent (GitHub logs) | Visiting / downloading |
| github.com/…/issues/new | Bug report (user opens + submits) | What the user typed + technical details (version, platform, error codes) | User-initiated |
| planoradevelopment@outlook.com | Bug report by e-mail | Sender's e-mail address + report text | User-initiated |
- No external fonts/scripts (`script-src 'self'`, `font-src 'self' data:`) [`csp.cjs`]

## 5. Login & scopes
- Microsoft (MSAL, tenant `common`, personal + work/school accounts) [`src/integrations/microsoft/auth.ts`]:
  - `Calendars.Read` — read busy times incl. Teams meetings
  - `Calendars.ReadWrite` — write planned sessions to Outlook as private events; only touches events Planora created [`microsoft/sync.ts:100`, `graph.ts:6`]
  - `Tasks.Read` — import Microsoft To Do tasks (id, title, status, due date) [`graph.ts:130-135`]
  - `EduAssignments.ReadBasic` — import Teams assignments (id, name, due date, status) [`graph.ts:152`]
  - `Files.ReadWrite.AppFolder` — sync file in OneDrive Apps/Planora only
  - Tokens: sessionStorage by default, localStorage when kept signed in / sync on [`auth.ts:67-68`]
- Google: `calendar.freebusy` only; token on device, ~1 hour, never synced [`google.ts:12-16`]

## 6. Cookies & storage
- IndexedDB (app data), localStorage (settings, Microsoft account slots `planora-ms-account-*`, MSAL tokens when persistent), sessionStorage (MSAL tokens default), service-worker cache (PWA files). MSAL may set short-lived sign-in cookies [`node_modules/@azure/msal-browser/dist/cache/CookieStorage.mjs` present — verify]. All strictly necessary.

## 7. Tracking / analytics / crash reporting
- None ("No ads, analytics or trackers" [privacy.noTracking]; CSP allows no analytics hosts).

## 8–10. Payments / AI / user-generated content
- None. Sharing via OS share sheet and `.ics` export only (user's own files) [`@capacitor/share`, `src/integrations/ics.ts`].

## 11. Dependencies
- 33 shipped packages: MIT 26, ISC 3, Apache-2.0 1, BSD 1, 0BSD 1, MPL-2.0 1 (`ical.js`) + Electron (MIT) with Chromium notices bundled by electron-builder → `THIRD_PARTY_NOTICES.md`.

## 12. Assets
- Icons generated from `public/icon.svg` by `scripts/icons.mjs` (sharp); origin of the SVG to confirm (Q2). Splash screens in `android/…/splash.png` (Capacitor default or generated — confirm). No fonts or sounds shipped from third parties.

## 13. Identity & contact
- Provider: Jonathan (natural person, Netherlands); `author: "Jonathan"` in package.json. Contact: planoradevelopment@outlook.com [`bugReport.ts:7`]. Repo public, **no LICENSE**.

## 14. Marketing claims
- "Privacy-first", "Your data stays on this device", "No ads, analytics or trackers" — supported by the code.
- "Planora has no server and no account: there is nothing to leak." — absolute; see L7.
- "Free, no account" [README] — true.
