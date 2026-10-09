# Planora

Planora is a planning app for students and teachers. You put tasks in the inbox (name, deadline,
estimated duration) and Planora plans the moments to work on them, before the deadline, in its own
calendar or (optionally) in Outlook. After every task it asks a few questions and learns how much
time **you** really need, so the next prediction is better.

Runs on Windows, Mac, Linux, Android and iPhone. Interface in Dutch and English.

> **Want to use Planora? You don't need to install anything technical.**
> Open **<https://briefcasejona.github.io/planora/download.html>**: it recognises your device and shows the
> right download with step-by-step instructions. Or use it straight in your browser at
> <https://briefcasejona.github.io/planora/>. Free, no account.
>
> What Planora is, in plain words: <https://briefcasejona.github.io/planora/about.html>. Privacy statement:
> <https://briefcasejona.github.io/planora/privacy.html>.
>
> The sections further down about Node.js and `npm` are only for developers who want to change Planora's code.

## Download and share

**<https://briefcasejona.github.io/planora/download.html>** recognises your device and shows the right
download with step-by-step install instructions. Direct links (always the newest release):

| Device | How |
| --- | --- |
| Any browser | <https://briefcasejona.github.io/planora/> |
| iPhone / iPad | Open the website in Safari > Share > **Add to Home Screen** |
| Android | [`Planora.apk`](https://github.com/briefcasejona/planora/releases/latest/download/Planora.apk) and allow "install unknown apps" (or install the website from Chrome) |
| Windows | [`Planora-Setup.exe`](https://github.com/briefcasejona/planora/releases/latest/download/Planora-Setup.exe): one click, no questions, starts Planora. Not code-signed, so SmartScreen asks once: **More info > Run anyway**. Also a [portable .exe](https://github.com/briefcasejona/planora/releases/latest/download/Planora-portable.exe). |
| Mac | [Apple chip](https://github.com/briefcasejona/planora/releases/latest/download/Planora-Mac-AppleSilicon.dmg) or [Intel](https://github.com/briefcasejona/planora/releases/latest/download/Planora-Mac-Intel.dmg): drag to Applications. Not notarised, so the first time: **System Settings > Privacy & Security > Open Anyway**. |
| Linux | [`Planora.AppImage`](https://github.com/briefcasejona/planora/releases/latest/download/Planora.AppImage): make it executable and run it |

Everyone's data stays on their own device. If you use Planora on several devices yourself, you can
optionally sync them through your own OneDrive (see below); nothing is ever shared between people.

## Features

- **Task inbox**: name, deadline, estimate, type (test, assignment, project, task; for teachers also
  grading and lesson prep), subject, difficulty. Projects are split into ordered steps with their own
  estimates.
- **Automatic planning**: work is spread over the days before the deadline, within your available hours,
  around your appointments, with a daily maximum, block lengths and breaks.
  - Tests get spaced study sessions that get denser toward the test, ending with a short review the
    day before.
  - Projects plan steps in order, each with its own internal deadline.
  - If the work does not fit, Planora warns you instead of silently overbooking.
  - Drag a block in the calendar to move it; it is then pinned and everything else is planned around it.
- **Learning estimates**: after a task is completed (or its deadline passes) a short feedback card asks
  for the actual time, whether there was enough time, more/fewer sessions, difficulty and what worked.
  Planora learns a personal correction per subject and task type (with shrinkage, so one outlier does
  not swing it) and shows *why* it suggests a number ("you usually need 35% more for Biology").
- **Replanning**: past blocks you did not check off become a quick check-in; missed work is replanned
  automatically. Tasks that are not finished or must be redone can be reopened with a new estimate
  and deadline.
- **Weekly plan (Sunday 19:00)** and **weekly review (Saturday 15:00)**, both configurable:
  - The plan shows the week per day, deadlines and 2-3 focus points from last week's feedback.
  - The review shows completed and missed work, what went well and less well, estimation accuracy,
    when you miss blocks, and concrete improvements.
  - Every plan and review is saved so you can look back.
- **Own calendar** with one-off and weekly-repeating events (classes, sports, a job).
- **Optional integrations**: Microsoft 365 (Outlook calendar including Teams meetings, Microsoft To Do,
  Teams assignments), Google Calendar (free/busy), and **Apple Calendar via .ics files** (no Apple password):
  import exports from Apple Calendar on a Mac as busy time (several files side by side), and export the
  plan (or one task) to Apple Calendar. Exports use stable event ids, so importing a newer export updates
  events instead of duplicating them; blocks that disappeared are sent as cancelled.

## Report a problem

In Planora: **Settings > Een probleem melden** (or the link in the sidebar). Describe what happened; Planora
fills in technical details you can see and switch off (version, device, error codes; never your tasks or
calendar) and opens a ready-made report on GitHub. You only press **Submit** (a free GitHub account is
needed). Reports are public, so don't include personal information. No GitHub account? E-mail
**planoradevelopment@outlook.com**.

Reports are checked daily: spam is closed, real bugs are fixed, and small fixes are released as an update.

## Updates

You never have to uninstall. From v0.3.3 on:

| Installed as | How it updates |
| --- | --- |
| Website, iPhone home screen, Chrome "Install app" | Automatically; the new version is used the next time you open Planora. |
| Windows (installer) | Checks GitHub at start and every 6 hours, downloads the new installer, checks its sha256 against GitHub's, and installs it on **Restart and update** (or when you quit). |
| Linux (AppImage) | The same: the AppImage file is replaced and Planora restarts. |
| Mac, Windows portable .exe | Shows that a new version is available with a **Download** button (install over the old one; data stays). Replacing itself needs a paid Apple signature. |
| Android (.apk) | Shows **Update**; the new APK downloads and Android's installer asks **Update**. Android only accepts it when it is signed with the same key. |

The update check only asks `api.github.com` for the newest version number; nothing about you is sent.
It can be turned off in **Settings > Planning > Updates**. Versions before 0.3.3 have no updater, so install
0.3.3 by hand once.

## Sync between your own devices (optional)

Off by default; Planora works fully on one device without any account. In **Settings > Sync** you can
turn it on to keep e.g. your phone and laptop the same:

- Sign in with a Microsoft account (a free personal outlook.com account works; no school approval
  needed). This sign-in is separate from the Outlook/Teams connection, so you can sync with a personal
  account and connect a school account for your calendar.
- Planora asks only for `Files.ReadWrite.AppFolder`: its own hidden folder (Apps/Planora) in your
  OneDrive. It can't see your other files.
- All data is encrypted on the device (PBKDF2 + AES-GCM) with a sync passphrase you choose; the same
  passphrase is entered on every device. Microsoft only stores unreadable data. The passphrase is never
  stored; a non-extractable key derived from it stays on the device.
- Synced: tasks, feedback, weekly reports, settings, your own and imported (.ics) events with their
  categories, and study blocks that are done, missed, skipped or moved. Ordinary planned blocks are
  recomputed on each device; Outlook/Google busy time is fetched by each device itself.
- Every record carries a change time; the newest version wins and deletions are remembered, so a
  change or deletion on one device reaches the others. Planora syncs on start, when it comes back into
  view, every 5 minutes and a few seconds after a change.
- With sync on, only one device writes study blocks to Outlook (the last one where you turned it on),
  so they never appear twice.

## Privacy model

Privacy is the main design constraint:

- **No server, no account.** All data lives on the device in IndexedDB. There is no Planora backend,
  so nothing can leak from one. Optional sync uses your own OneDrive, end-to-end encrypted.
- **No third parties.** No analytics, trackers, CDNs or remote fonts. A strict Content-Security-Policy
  only allows connections to the app itself, `login.microsoftonline.com`, `graph.microsoft.com`,
  `www.googleapis.com`, `oauth2.googleapis.com` and OneDrive's download hosts (`*.1drv.com`,
  `*.microsoftpersonalcontent.com`, `*.sharepoint.com`). Those hosts are only contacted after you link an
  account or turn on sync. The installed apps (desktop, Android) also ask `api.github.com` for the newest
  version number (see Updates; can be turned off). The website never does. The end-to-end test asserts that an unlinked session makes no external requests.
- **Integrations talk directly** from the device to Microsoft or Google (OAuth with PKCE / public
  client, no client secret, no proxy).
- **Least privilege, asked only when needed.** Each feature asks for its own permission, the moment
  you switch it on:

  | Feature | Scope | What is read/written |
  | --- | --- | --- |
  | Busy times from Outlook | `Calendars.Read` | Only start, end and availability (via `$select`). Titles only if you enable "show titles". |
  | Put blocks in Outlook | `Calendars.ReadWrite` | Private events, optionally with a neutral title. Planora only changes or deletes events it created. |
  | Import from To Do | `Tasks.Read` | Open task titles and due dates; you choose what to import. |
  | Import Teams assignments | `EduAssignments.ReadBasic` | Assignment names and due dates. |
  | Google Calendar | `calendar.freebusy` | Busy intervals only; Google never returns titles for this scope. |
  | Sync between your devices | `Files.ReadWrite.AppFolder` | One encrypted file in Planora's own OneDrive folder. |

- **Disconnecting** forgets the sign-in, deletes all imported data from the device, can remove
  Planora's Outlook events, and links to the page where you revoke consent at Microsoft.
- **Encryption at rest (optional)**: a passphrase is stretched with PBKDF2 (310,000 rounds, SHA-256)
  into an AES-GCM key that only lives in memory. Titles, subjects, notes, grades and reports are
  encrypted; only ids, dates and status stay readable for sorting.
  **A lost passphrase cannot be recovered.**
- **Backups** are always encrypted with a passphrase you choose. Data imported from Microsoft or Google
  is excluded from backups; it can be synced again.
- **Privacy center** in Settings shows active connections, an activity log of every contact with
  Microsoft or Google (counts only, never content), and a "delete everything" button.

## For developers (building Planora yourself)

Only needed if you want to change Planora's code. **Users don't need any of this**: the website and the
installed apps already contain everything they need.

Requirements: Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + integration tests (Vitest)
npm run e2e        # end-to-end tests in Chrome, desktop and phone size (Playwright)
npm run build      # production build in dist/
npm run preview    # serve the production build on http://localhost:4173
```

### Installing on desktop or phone

Host `dist/` on any static HTTPS host. Open the site and choose **Install app**
(Chrome/Edge) or **Add to Home Screen** (Safari). After that Planora also works offline.
When hosting, also send the Content-Security-Policy from `vite.config.ts` as an HTTP header;
headers support extra protections such as `frame-ancestors 'none'` that a meta tag can't express.

### Desktop app (Electron)

```bash
npm run desktop     # run the desktop app
npm run dist:win    # build release/Planora-Setup-x.y.z.exe and a portable .exe (on Windows)
npm run dist:mac    # build the .dmg files (on a Mac)
npm run dist:linux  # build the AppImage (on Linux)
npm run e2e:desktop # end-to-end test of the desktop app
```

The desktop app serves Planora from a local server on `127.0.0.1:47823` (never reachable from other
computers), with the CSP as an HTTP header, a sandboxed window without Node.js access, close-to-tray so
reminders keep working, optional start with the computer (Windows and Mac), and `.ics` file association.

### Releases

Pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`: it builds the Windows installer and portable
.exe, the Mac .dmg files (Apple chip and Intel), the Linux AppImage and a signed Android APK, and publishes
them as a GitHub Release with stable file names, so `releases/latest/download/<name>` always works. Every push to `main` deploys the website
(`.github/workflows/pages.yml`). The Android signing key is stored in repository secrets; a backup copy
must be kept privately outside the repository.

### Native Android / iOS app

```bash
npm run cap:sync   # build + copy into the native projects
npm run android    # open in Android Studio
npx cap add ios    # once, on a Mac with Xcode; then: npx cap open ios
```

The native app schedules the Sunday and Saturday reminders as local notifications on the device.

## Connecting Microsoft 365 (optional)

Planora needs a free app registration so Microsoft knows which app is asking for permission.
There is no client secret, and you don't need a server.

1. Go to <https://entra.microsoft.com> > **Applications** > **App registrations** > **New registration**.
2. Name: `Planora`. Supported account types: *Accounts in any organizational directory and personal
   Microsoft accounts* (or only your school's directory).
3. Redirect URIs, all of platform **Single-page application (SPA)**:
   - `https://briefcasejona.github.io/planora/auth-redirect.html` (website)
   - `http://localhost:47823/auth-redirect.html` (desktop app)
   - `https://localhost/auth-redirect.html` (Android app, sign-in opens inside the app)
   - `http://localhost:5173/auth-redirect.html` (development)
4. Copy the **Application (client) ID** into `.env` (see `.env.example`) and into the repository
   variable `VITE_MS_CLIENT_ID` (Settings > Secrets and variables > Actions > Variables) so the website
   and release builds include it:

   ```
   VITE_MS_CLIENT_ID=00000000-0000-0000-0000-000000000000
   VITE_MS_TENANT=common
   ```

5. Optional: under **API permissions** add the delegated permissions `Calendars.Read`,
   `Calendars.ReadWrite`, `Tasks.Read` and `EduAssignments.ReadBasic`. Planora requests them at runtime
   anyway, one feature at a time. For Teams assignments a school administrator may have to grant consent.
6. Restart `npm run dev`. In Planora: **Settings > Calendars & connections > Connect with Microsoft**.

## Connecting Google Calendar (optional)

Free for you and for users (no billing account needed). Steps, once:

1. In <https://console.cloud.google.com>, create a project and enable the **Google Calendar API**.
2. Configure the **OAuth consent screen** (External), adding the scope `.../auth/calendar.freebusy`.
3. Keep the app in **Testing** mode and add your friends' Google accounts as **test users** (up to 100).
   Only test users can connect; they see a "Google hasn't verified this app" notice and choose Continue.
   Opening it to everyone needs Google's (free) verification, which takes days to weeks.
4. Under **Credentials**, create an **OAuth client ID** of type *Web application*:
   - Authorized JavaScript origins: `https://briefcasejona.github.io`, `http://localhost:47823`, `http://localhost:5173`
   - Authorized redirect URIs: `https://briefcasejona.github.io/planora/auth-redirect.html`,
     `http://localhost:47823/auth-redirect.html`, `http://localhost:5173/auth-redirect.html`
5. Put the client ID in `.env` and in the repository variable `VITE_GOOGLE_CLIENT_ID`.

How signing in works per platform (Google refuses sign-ins inside app windows):

| Where | How |
| --- | --- |
| Browser | A Google popup. |
| iPhone home-screen app | The app goes to Google and comes back (no popup). |
| Desktop app | Your normal browser opens; Google returns to Planora's own local address, which hands the answer to the app. |
| Android app | A browser tab opens; Google returns through `app.planora://google` into the app. |

Google gives an app without a server a sign-in for one hour. Planora keeps the busy times it fetched
(90 days ahead), never interrupts you when the hour is over, and shows a **Refresh Google** button that
re-signs in with one click (the permission screen is only shown the first time). The token stays on
the device and is never included in backups or sync.

## How the planner works

`src/domain/scheduler.ts` rebuilds the future plan whenever something changes:

1. Sessions that are done, missed, pinned (moved by you) or already started are kept. Everything else
   in the future is replanned.
2. Free time per day = your available hours minus appointments (local, Outlook, Google, .ics) minus kept
   sessions, with breaks around blocks, capped at the daily maximum.
3. Remaining work per task = planned estimate minus finished work minus pinned blocks. The planned
   estimate is your estimate times your learned correction.
4. Work is split into blocks (between the shortest and longest block length). It gets target days:
   spaced and denser toward the end for tests, spread evenly for assignments, and per step with its
   own internal deadline for projects.
5. Blocks are placed earliest-deadline-first, preferring a different day per block of the same task,
   and finishing a configurable number of days before the deadline. Work that can't fit even when
   using the time right up to the deadline is reported.

`src/domain/estimator.ts` learns the correction factor `exp(Σ log(actual/estimate) / (n + 2))` per
subject, falling back to task type and then to all tasks. It also nudges the number of sessions using
the "more/fewer sessions" answers.

## Project structure

```
src/
  domain/        pure, unit-tested planning logic (scheduler, estimator, spacing, replan, insights)
  data/          IndexedDB (Dexie), encryption, backups, app store, weekly moments
  integrations/  Microsoft Graph, Google free/busy, .ics, background sync, import panel
  features/      screens: Today, Inbox, Calendar, Review, Settings, onboarding, dialogs
  notifications/ local notifications (native) and browser notifications
  i18n/          nl.json, en.json
e2e/             Playwright tests
android/         Capacitor Android project
```

## Known limitations

- In a browser, reminders only appear while Planora is open, because pushing them without a server is
  impossible. The plan and review are generated and shown the next time you open the app. The native
  app has real scheduled notifications.
- iPhone: a native iOS app needs a Mac and a paid Apple developer account, so iPhone users use the
  website installed to the home screen. Apple Calendar has no web API; Planora uses .ics files only.
- Recurring Outlook series are read per occurrence for the next 120 days. Blocks are written to
  Outlook for the coming 28 days.
