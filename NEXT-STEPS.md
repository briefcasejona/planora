# Where we are (9 October 2026)

## Done
- Website: <https://briefcasejona.github.io/planora/>, deployed automatically from `main` (GitHub Actions).
- Microsoft sign-in works with personal accounts (client ID in repo variable `VITE_MS_CLIENT_ID`).
- On branch `claude/zealous-hamilton-n7xpkp` (ready for v0.3.0):
  - Event categories (lesson, test, excursion, ...), test suggestions, break after lessons.
  - Safe for a later school Microsoft approval (no duplicates, Teams items can be linked).
  - Installers for Windows (one click), Mac (.dmg) and Linux (AppImage); download page for every device.
  - Optional sync between your own devices through your OneDrive (end-to-end encrypted).

## What needs you
1. **Merge the branch** into `main` (pull request), or ask Claude to.
2. **Release v0.3.0**: ask Claude to push the tag `v0.3.0` (or `git tag v0.3.0 && git push origin v0.3.0`).
   GitHub then builds all installers and the APK (about 15 minutes).
3. **Test sync yourself**: Settings > Sync on the laptop (choose a passphrase), then on the phone
   (same Microsoft account and passphrase). Add a task on the phone; it should appear on the laptop
   within a minute. Report any error text to Claude.
4. Optional: school IT approval for Outlook/Teams (request text is in the chat history), Google OAuth client.

## Keep safe
- `C:\Users\haasn\planora-android-key\` holds the Android signing key (also stored as GitHub Secrets).
  Do not delete it and never put it in the repository; without it, app updates can't be installed
  over older versions.
- Your sync passphrase: without it the synced data can't be read (data on your devices stays readable).
