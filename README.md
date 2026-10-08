# Planora

Planora is a planning app for students and teachers. You put tasks in the inbox (name, deadline,
estimated duration) and Planora plans the moments to work on them, before the deadline, in its own
calendar or (optionally) in Outlook. After every task it asks a few questions and learns how much
time **you** really need, so the next prediction is better.

Runs on desktop and phone as an installable web app (PWA), and as an Android/iOS app via Capacitor.
Interface in Dutch and English.

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
  Teams assignments), Google Calendar (free/busy), and .ics import/export for any calendar app.

## Privacy model

Privacy is the main design constraint:

- **No server, no account.** All data lives on the device in IndexedDB. There is no Planora backend,
  so nothing can leak from one.
- **No third parties.** No analytics, trackers, CDNs or remote fonts. A strict Content-Security-Policy
  only allows connections to the app itself, `login.microsoftonline.com`, `graph.microsoft.com`,
  `www.googleapis.com` and `oauth2.googleapis.com`. Those hosts are only contacted after you link an
  account. The end-to-end test asserts that an unlinked session makes no external requests.
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

## Getting started

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
3. Redirect URI: platform **Single-page application (SPA)**, with
   `http://localhost:5173/auth-redirect.html`. Later, add `http://localhost:4173/auth-redirect.html`
   and your production URL (`https://your-domain/auth-redirect.html`) under **Authentication**.
4. Copy the **Application (client) ID** into `.env` (see `.env.example`):

   ```
   VITE_MS_CLIENT_ID=00000000-0000-0000-0000-000000000000
   VITE_MS_TENANT=common
   ```

5. Optional: under **API permissions** add the delegated permissions `Calendars.Read`,
   `Calendars.ReadWrite`, `Tasks.Read` and `EduAssignments.ReadBasic`. Planora requests them at runtime
   anyway, one feature at a time. For Teams assignments a school administrator may have to grant consent.
6. Restart `npm run dev`. In Planora: **Settings > Calendars & connections > Connect with Microsoft**.

## Connecting Google Calendar (optional)

1. In <https://console.cloud.google.com>, create a project and enable the **Google Calendar API**.
2. Configure the **OAuth consent screen**, adding the scope `.../auth/calendar.freebusy`.
3. Under **Credentials**, create an **OAuth client ID** of type *Web application*:
   - Authorized JavaScript origin: `http://localhost:5173`
   - Authorized redirect URI: `http://localhost:5173/auth-redirect.html`
   - Add your production URLs too.
4. Put the client ID in `.env` as `VITE_GOOGLE_CLIENT_ID`.

Google tokens stay in the browser tab session and expire after about an hour; Planora asks again when needed.

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
- Microsoft and Google sign-in use popup windows. They work in the browser and the installed PWA.
  Inside the native Android/iOS shell, popups are restricted; use the PWA on your phone for the
  Microsoft integration, or add a native auth flow (e.g. MSAL for Android) later.
- Recurring Outlook series are read per occurrence for the next 120 days. Blocks are written to
  Outlook for the coming 28 days.
