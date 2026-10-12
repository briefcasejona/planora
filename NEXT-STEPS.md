# Where we are (9 October 2026)

## Done
- Website: <https://briefcasejona.github.io/planora/>, deployed automatically from `main` (GitHub Actions).
- Microsoft sign-in works with personal accounts (client ID in repo variable `VITE_MS_CLIENT_ID`).
- Merged into `main` (pull request #14, ready for v0.3.0):
  - Event categories (lesson, test, excursion, ...), test suggestions, break after lessons.
  - Safe for a later school Microsoft approval (no duplicates, Teams items can be linked).
  - Installers for Windows (one click), Mac (.dmg) and Linux (AppImage); download page for every device.
  - Optional sync between your own devices through your OneDrive (end-to-end encrypted).
- Merged pull request #15 (Claude Code setup + automatic code formatting) into `main`, with your OK:
  all tests pass, including the desktop app test. The "new review" dot in the menu is now read out
  by screen readers on phones too, not only on computers.

## Legal (10 October 2026, merged in pull request #16, released in v0.3.5)
- A legal check of Planora is in `legal/LEGAL-STATUS.md` (research notes, not legal advice).
- Written: privacy policy, terms of use and contact page (Dutch + English), open-source license list,
  `LICENSE` ("All rights reserved"). They become web pages under `…/planora/legal/` and are linked from
  Settings → Privacy → Legal, the welcome screens and the download page.
- After editing anything in `legal/*.md`, run `npm run legal` to update the web pages.
- All checks pass except one Google test that also fails on `main` (it is off by one hour around the
  25 October clock change: `src/integrations/google.test.ts`).

## Website: About page (merged in pull request #21, 10 October 2026)
- New page `…/planora/about.html` (Dutch + English): what Planora is, how it works, who it's for, why, common
  questions, and a big "Open Planora" button. Linked from Settings (sharing card) and from the footer of
  the download page. The footer links to the official privacy policy, terms and contact pages.
- The download page now says school-managed phones often block the .apk (use the website instead).

## Week view on phones (pull request #23, draft, 12 October 2026)
- The calendar on a phone now offers Day, Week and Month (Week was hidden on small screens). Short day
  headers ("ma 12") so the whole week fits. Phones still open on Day.
- All checks pass. **Needs you**: look at it and merge when happy.

## University roadmap, step 1 of 4 (pull request #24, 12 October 2026)
- A council review and four specs, approved by you: <https://claude.ai/artifact/WsPPrFmuMCqvSaFJrfTMK5>.
  Planora stays server-free (your decision).
- Step 1 is in pull request #24: new event kinds lecture, tutorial (werkcollege), lab (practicum) and
  office hours (spreekuur); the break after lessons also applies after lectures, tutorials and labs; a new
  install starts in the device's language (Dutch device: Dutch, otherwise English); the welcome screens say
  what happens if you lose your device; "Teacher" is now "Staff (basic)".
- Also in #24: the Google test that failed around the 25 October clock change is fixed.
- Good to know: a device still on v0.3.5 shows a synced lecture as "category.lecture" until it updates itself.
- Next: step 2 (courses and repeating tasks), then reminders, then semester setup from a timetable file.

## What needs you
0. **Legal**:
   - Done: legal pages live and entered in the Azure and Google portals (10 October 2026).
   - Before promoting Planora to schools, talk to a lawyer: `legal/lawyer-brief-schools-and-minors.md`.
   - **The name "Planora"**: a company in Berlin owns an EU trademark "Planora", but only for the
     architecture and construction industry. Keeping the name looks fine for now. **Before a college or
     school deal, an app-store launch or a paid version**: book a one-hour check with a Benelux trademark
     attorney (bmm.nl or the NOvA advocatenzoeker). Bring the memo
     `~/.claude/plugins/config/claude-for-legal/ip-legal/outputs/clearance-planora-2026-10-10.md`
     (details: finding L9 in `legal/LEGAL-STATUS.md`).
1. **About page** is live at <https://briefcasejona.github.io/planora/about.html> a few minutes after the merge.
   Optional: use that address as the homepage in the Google and Azure portals.
   Later ideas (not built): a page for schools/IT, checksums for downloads, Microsoft publisher verification.
2. **v0.3.5** is released (legal pages + Legal card in Settings). Installed apps update themselves.
3. **Test sync yourself**: Settings > Sync on the laptop (choose a passphrase), then on the phone
   (same Microsoft account and passphrase). Add a task on the phone; it should appear on the laptop
   within a minute. Report any error text to Claude.
4. **Google Calendar (v0.3.1)**: create the Google OAuth client (README, "Connecting Google Calendar"), add
   repo variable `VITE_GOOGLE_CLIENT_ID`, then ask Claude to release v0.3.1.
5. Optional: school IT approval for Outlook/Teams (request text is in the chat history).

## Keep safe
- `C:\Users\haasn\planora-android-key\` holds the Android signing key (also stored as GitHub Secrets).
  Do not delete it and never put it in the repository; without it, app updates can't be installed
  over older versions.
- Your sync passphrase: without it the synced data can't be read (data on your devices stays readable).
