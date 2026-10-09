# Where we left off (9 October 2026)

## Done and online
- Website: <https://briefcasejona.github.io/planora/> (also installable on iPhone and Android)
- Windows downloads: <https://github.com/briefcasejona/planora/releases/tag/v0.2.0>
- Code on GitHub (`main`, public). Website published from the `gh-pages` branch.
- Apple Calendar via .ics import/export, desktop app, Android release config, all tests green.

## What needs you (in this order)

1. **Merge the build workflows.** `.github/workflows/pages.yml` and `release.yml` are on branch
   `claude/zealous-hamilton-n7xpkp` (recreated; the old local `ci-workflows` branch is no longer needed).
   Merge it into `main`, then set **Settings > Pages > Source** to **GitHub Actions**. From then on the
   website deploys on every push to `main`, and a tag `v0.2.1` builds `Planora.apk` and the `.exe` files.
   The release uses secrets `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`.

2. **Microsoft app registration** (step-by-step in README.md, "Connecting Microsoft 365").
   Give Claude the Application (client) ID; it goes into `.env` and repo variable `VITE_MS_CLIENT_ID`.

3. **Google Cloud OAuth client** (README.md, "Connecting Google Calendar"), with your friends added as
   test users. Give Claude the client ID (repo variable `VITE_GOOGLE_CLIENT_ID`).

4. Then: release `v0.2.1` with sign-in enabled + `Planora.apk`, and test signing in yourself.

## Keep safe
- `C:\Users\haasn\planora-android-key\` holds the Android signing key (also stored as GitHub Secrets).
  Do not delete it and never put it in the repository; without it, app updates can't be installed
  over older versions.
