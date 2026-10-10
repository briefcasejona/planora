# Legal status — Planora

RESEARCH NOTES — NOT LEGAL ADVICE — REVIEW WITH A LICENSED LAWYER BEFORE RELYING ON IT

**App version:** 0.3.5
**Last checked:** 2026-10-10
**Mode:** release v0.3.5 — legal pages live (PR #16)

Planora has no server, no accounts, no tracking, no payments and no AI — that keeps the legal risk low. What was missing is mostly **paperwork that platforms and the law expect anyway**: a published privacy policy, terms, license notices, and a license for the public repo. Drafts are written; they count as fixed only once they're published and linked.

## Findings

| ID | Severity | Area | Finding | Fix | Status |
|---|---|---|---|---|---|
| L1 | 🔴 | Privacy / platforms | No privacy policy anywhere, while the app requests Microsoft scopes (Calendars.Read, Calendars.ReadWrite, Tasks.Read, EduAssignments.ReadBasic, Files.ReadWrite.AppFolder) and Google `calendar.freebusy`, runs a website on GitHub Pages, checks GitHub for updates and accepts bug reports by e-mail. GDPR Art. 13, Google OAuth verification and the Microsoft app registration all expect one. | Published and linked: https://briefcasejona.github.io/planora/legal/privacy.html (+ privacy.nl.html), live since 2026-10-10 (PR #16). Portal URLs: L6. | fixed |
| L2 | 🟠 | Consumer / liability | No terms of use: no "as is" / beta statement, no limitation of liability, no governing law. | Published and linked: https://briefcasejona.github.io/planora/legal/terms.html (+ terms.nl.html), live since 2026-10-10 (PR #16). | fixed |
| L3 | 🟠 | IP | Public repo without a LICENSE file (and no `license` in package.json): legally "all rights reserved" by default, but unclear to others; affects whether people may fork/reuse. | `LICENSE` ("All rights reserved", Jonathan) + `"license": "UNLICENSED"` in package.json (on branch). | fixed |
| L4 | 🟠 | IP / open source | The shipped apps don't include the license notices of their 33 open-source components (MIT/ISC/BSD/Apache require the notice to travel with copies; `ical.js` is MPL-2.0). | `public/legal/licenses.html` ships inside every build (web, desktop, APK) and is linked from Settings → Privacy → Legal (on branch). | fixed |
| L5 | 🟠 | Children / schools | Audience is "students and teachers" on "school days", with Teams assignments and school Microsoft accounts → users will include minors, and schools may want to deploy it. Planora itself receives none of their data, which keeps this manageable, but school deployment and age wording need a lawyer's view. | Age wording in privacy policy + terms; `lawyer-brief-schools-and-minors.md`. Before promoting Planora to schools: talk to a lawyer. | open — lawyer |
| L6 | 🟡 | Platforms | Microsoft app registration lacks privacy/terms URLs and publisher verification; Google OAuth client is (planned) in Testing mode — going public needs verification with a privacy-policy URL on a verified domain. | After L1/L2 are published: fill in URLs in Azure portal (Branding) and Google Cloud console (P6). | open |
| L7 | 🟡 | Marketing claims | In-app text "Planora has no server and no account: there is nothing to leak." is absolute — data on the device and the (encrypted) OneDrive sync copy can still be exposed (lost phone, malware). Misleading-claims risk is low but real. | `privacy.noServer` changed in en.json + nl.json (on branch). | fixed |
| L8 | 🟡 | Privacy | "Delete everything" leaves the encrypted sync file in OneDrive (Apps/Planora) and data on other devices (code comment in `PrivacyCenter.tsx`), but the UI text says it "erases all Planora data". | Delete text now says the OneDrive copy and other devices are not deleted (en + nl, on branch). | fixed |
| L9 | 🟡 | IP | App name "Planora" not cleared — other apps/companies use similar names. Low risk while free and small; matters before store listings or monetizing. | Run `/ip-legal:clearance Planora` before a store launch or paid version. | open |
| L10 | 🟡 | Transparency | The app and website don't say who provides Planora or how to reach them (only inside the bug-report card). | Contact pages (provider: Jonathan) linked from Settings and the download page (on branch). | fixed |
| L11 | 🟢 | Cookies / storage | Only strictly necessary storage (IndexedDB app data, settings, sign-in tokens, PWA cache); no analytics or trackers → no cookie banner needed. | Explained in privacy policy § "Storage on your device". | fixed |
| L12 | 🟢 | Open source | All 33 shipped components are permissive (MIT, ISC, BSD, Apache-2.0, 0BSD) except `ical.js` (MPL-2.0, used unmodified → only keep its notice). No GPL/AGPL. | Covered by L4. | fixed |
| L13 | 🟢 | Bug reports | In-app warning that GitHub reports are public is already present (`report.public`). | — | fixed |
| L14 | 🟢 | AI / payments / ads | None present. | Re-check when added (hook watches for it). | fixed |

## Documents

| Document | Path | Status | Published at |
|---|---|---|---|
| Privacy policy (EN / NL) | `legal/privacy-policy.md`, `legal/privacy-policy.nl.md` | Published | https://briefcasejona.github.io/planora/legal/privacy.html |
| Terms of use (EN / NL) | `legal/terms-of-use.md`, `legal/terms-of-use.nl.md` | Published | https://briefcasejona.github.io/planora/legal/terms.html |
| Contact (EN / NL) | `legal/contact.md`, `legal/contact.nl.md` | Published | https://briefcasejona.github.io/planora/legal/contact.html |
| Third-party notices | `legal/THIRD_PARTY_NOTICES.md` | Published | https://briefcasejona.github.io/planora/legal/licenses.html |
| App inventory | `legal/app-inventory.md` | Current | internal |
| DPIA screen | `legal/dpia-screen.md` | Current | internal |
| License choice | `legal/license-choice.md` | Decided: all rights reserved | internal |
| Lawyer brief | `legal/lawyer-brief-schools-and-minors.md` | Ready | internal |

## Code changes

Applied with Jonathan's OK on 2026-10-10 ("apply P1–P7, use Jonathan, all rights reserved"), on branch `legal/privacy-terms-licenses`:

- **P1** `scripts/legal-pages.mjs` (`npm run legal`) turns `legal/*.md` into `public/legal/*.html` → `…/planora/legal/privacy.html` etc. **Re-run `npm run legal` after editing a document**; `src/lib/links.test.ts` fails if a linked page is missing.
- **P2** Settings → Privacy → **Legal** card (`LegalCard.tsx`), privacy-policy link in onboarding, footer links on the download page.
- **P3** `licenses.html` is part of every build and linked from the Legal card.
- **P4** `LICENSE` + `"license": "UNLICENSED"`.
- **P5** New `privacy.noServer` text (en + nl).
- **P6** **Still to do by Jonathan** in the Azure and Google Cloud portals once the pages are live (see L6).
- **P7** Delete text mentions the OneDrive copy and other devices (en + nl).

## Open questions for Jonathan

- ~~Q1~~ Decided: provider name "Jonathan".
- **Q2** Is `public/icon.svg` your own design (or made with an AI tool)? If it came from an icon set, which one and under what license?
- **Q3** How long do you keep bug-report e-mails? The drafts say "up to 12 months" — change if you prefer.
- **Q4** Can the desktop app's update check be turned off like the Android one? The drafts say only Android's can be — correct them if not.
