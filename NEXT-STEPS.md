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
- New page `…/planora/about.html` (Dutch + English; since 12 October 2026 aimed at students only, the teacher card is gone while Staff mode is hidden): what Planora is, how it works, who it's for, why, common
  questions, and a big "Open Planora" button. Linked from Settings (sharing card) and from the footer of
  the download page. The footer links to the official privacy policy, terms and contact pages.
- The download page now says school-managed phones often block the .apk (use the website instead).

## Overview page empty on iPhone (merged in pull request #22, 12 October 2026)
- Cause: the iPhone home-screen app stays open across releases. After a new version is published, the old
  file for the Overview page is gone, so opening it failed and the whole screen went blank.
- Fix: the app now reloads once to get the new version; if that doesn't help (e.g. offline), it shows a
  message with a "Reload" button and the menu stays. Same for Calendar and Settings.
- Updates stay silent (your choice, 12 October 2026). To check on the iPhone: open Overview after the
  next update is live; it should show the page, not an empty screen.

## Week view on phones (merged in pull request #23, 12 October 2026)
- The calendar on a phone now offers Day, Week and Month (Week was hidden on small screens). Short day
  headers ("ma 12") so the whole week fits. Phones still open on Day.

## University roadmap, all 4 steps (pull requests #24 to #26, released in v0.4.0, 12 October 2026)
- A council review and four specs, approved by you: <https://claude.ai/artifact/WsPPrFmuMCqvSaFJrfTMK5>.
  Planora stays server-free (your decision).
- Step 1 is in pull request #24: new event kinds lecture, tutorial (werkcollege), lab (practicum) and
  office hours (spreekuur); the break after lessons also applies after lectures, tutorials and labs; a new
  install starts in the device's language (Dutch device: Dutch, otherwise English); the welcome screens say
  what happens if you lose your device.
- Staff mode ("Teacher", now called "Staff (basic)") is hidden, as you asked; the code stays. To bring it
  back, set `SHOW_STAFF_ROLE` to `true` in `src/lib/features.ts`. Anyone already using it can still switch back in Settings.
- Also in #24: the Google test that failed around the 25 October clock change is fixed.
- Good to know: a device still on v0.3.5 shows a synced lecture as "category.lecture" until it updates itself.
- Step 2 is also in #24: courses and repeating tasks. Settings > Planning lists your courses (taken from
  the "Course or subject" field of your tasks); each can get a term end and an exam period, and the exam
  period shows as a light red band in the calendar. A task can repeat every week until a date (default: the
  course's term end); Planora makes one normal task per week. Editing or deleting one asks "only this one"
  or "this and later ones".
- How it is stored: course dates live inside the settings record and each weekly task carries a series
  number. Older app versions keep both when they sync (automatic test), so no database upgrade was needed.
- Good to know: if you change a course's dates on two devices at the same moment, the last one to sync wins.
- Step 3 is also in #24: reminders 10 minutes before each study block and at 18:00 the day before a
  deadline, for the next 7 days. On Android they are set on the phone and come with Planora closed; in the
  desktop app and the browser only while Planora is open (Settings says so). Moving, finishing or deleting a
  block replaces its reminder. One switch in Settings > Planning, on by default. Reminders say "Planora
  focus" on the lock screen unless you turn on "Show task names in reminders" (your choice, 12 October 2026).
- **Needs you (step 3):** try it on your Android phone, since I can't test a real phone from here. Check out
  the branch, run `npm ci`, `npm run cap:sync` and `npm run android`, then press Run in Android Studio with
  the phone connected. It installs as a separate app, "Planora Test", next to your real Planora (your
  choice, 12 October 2026; only test builds get the id `app.planora.test`, releases are unchanged). Plan a
  block 15 minutes ahead, close the app and check the reminder comes about 10 minutes before. If Settings
  shows "Allow exact times", tap it first (Android 12 and later). With both apps installed, Google sign-in
  may ask which app to return to.
- Step 4 is also in #24: "Set up my semester" at the top of the Inbox. Choose your timetable file (.ics);
  Planora lists the deadlines in it (words like deadline, due, hand in, inleveren, or all-day entries that
  aren't holidays) and you add each one as a task with one tap, with the course guessed from your classes.
  Importing a newer export adds only deadlines you haven't added or hidden. A deadline entry no longer
  blocks study time on its day.
- Your TimeEdit export (12 October 2026) has no deadlines in it: TimeEdit only holds classes, tests and
  excursions. Deadlines live in your learning platform, so the semester setup needs that platform's
  calendar export. A follow-up pull request uses the TimeEdit file better: it reads whether a class is a
  practicum, hoorcollege or werkcollege, takes "Wereldwijs" as the course from "AA1445. Wereldwijs, GIS
  analyse 2", leaves out the "S1-wk6" week labels, and no longer treats "Herfstvakantie" as a class.
- After that: a 5 to 10 student semester test, as the council suggested.

## Page for college IT (merged in pull request #28, 12 October 2026)
- New page `…/planora/for-it.html` (Dutch + English), linked in the website footer as "For IT" / "Voor IT".
  It lists every Microsoft permission Planora asks for and why, explains that data stays on the device,
  and has a button that opens Microsoft's "approve for the whole organisation" screen, plus the same route
  in the Entra admin center and how IT can limit Planora to certain groups.
- When IT comes back from approving, the sign-in page now says "Planora is approved for your organisation"
  (or that it wasn't approved) instead of showing nothing.
- Not testable here: the approval button needs a real college Microsoft 365 organisation. If Microsoft
  shows an error about the reply address, IT can use the Entra admin center route on the same page.

## Download page: Play Protect (12 October 2026)
- A friend's phone blocked Planora.apk ("Google Play Protect doesn't recognise this app"). The Android steps on
  the download page now say: tap "More details" > "Install anyway". The warning only disappears for good
  once Planora is in the Play Store (your call: a Google Play developer account, one-time fee).

## Phone button bar covered buttons (merged in pull request #30, released in v0.4.1, 12 October 2026)
- On Android the phone's own Back/Home/Recent buttons covered the buttons at the bottom of dialogs (edit task etc.),
  and the + button sat on top of "Save and replan" in Settings. Dialogs, the Save button and the page bottom now
  keep clear of the phone's button bar, and Settings no longer shows the + button.
- Installed apps get it with v0.4.1 (Android: tap Update in the banner). v0.4.2 makes it sturdier: it also uses the
  button-bar size the Android app reports itself, in case the phone's browser engine reports 0.

## Light and dark mode (pull request #33, released in v0.4.3, 12 October 2026)
- Settings > Planning > General > Appearance: Follow device (default), Light or Dark. It applies at once and
  syncs to your other devices like the other settings. Older app versions keep the choice when they sync.
- On the desktop app the title bar follows it too; on Android the status bar icons switch light/dark.
- Released in v0.4.3: installed apps update themselves (Android: tap Update in the banner).

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
   Later ideas (not built): checksums for downloads, Microsoft publisher verification.
2. **v0.3.5** is released (legal pages + Legal card in Settings). Installed apps update themselves.
3. **Test sync yourself**: Settings > Sync on the laptop (choose a passphrase), then on the phone
   (same Microsoft account and passphrase). Add a task on the phone; it should appear on the laptop
   within a minute. Report any error text to Claude.
4. **Google Calendar (v0.3.1)**: create the Google OAuth client (README, "Connecting Google Calendar"), add
   repo variable `VITE_GOOGLE_CLIENT_ID`, then ask Claude to release v0.3.1.
5. School IT approval for Outlook/Teams: send IT the link <https://briefcasejona.github.io/planora/for-it.html>
   together with the request (the draft email is in the chat history).

## Keep safe
- `C:\Users\haasn\planora-android-key\` holds the Android signing key (also stored as GitHub Secrets).
  Do not delete it and never put it in the repository; without it, app updates can't be installed
  over older versions.
- Your sync passphrase: without it the synced data can't be read (data on your devices stays readable).
