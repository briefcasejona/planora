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

## What needs you
1. **Release v0.3.0**: ask Claude to push the tag `v0.3.0` (or `git tag v0.3.0 && git push origin v0.3.0`).
   GitHub then builds all installers and the APK (about 15 minutes).
2. **Test sync yourself**: Settings > Sync on the laptop (choose a passphrase), then on the phone
   (same Microsoft account and passphrase). Add a task on the phone; it should appear on the laptop
   within a minute. Report any error text to Claude.
3. **Google Calendar (v0.3.1)**: create the Google OAuth client (README, "Connecting Google Calendar"), add
   repo variable `VITE_GOOGLE_CLIENT_ID`, then ask Claude to release v0.3.1.
4. Optional: school IT approval for Outlook/Teams (request text is in the chat history).

## Keep safe
- `C:\Users\haasn\planora-android-key\` holds the Android signing key (also stored as GitHub Secrets).
  Do not delete it and never put it in the repository; without it, app updates can't be installed
  over older versions.
- Your sync passphrase: without it the synced data can't be read (data on your devices stays readable).
