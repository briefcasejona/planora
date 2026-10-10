# Privacy policy — Planora

*Last updated: 10 October 2026 · Version 0.3.4*

Planora is a planning app for students and teachers, made by Jonathan, the Netherlands ("I", "me"). It runs as a website, a desktop app (Windows, Mac, Linux), an Android app and a home-screen app on iPhone/iPad. Questions or requests: **planoradevelopment@outlook.com**.

## The short version

- Your tasks, plans, feedback and settings are stored **only on your device**. Planora has no server and no Planora accounts. I can't see your data.
- No ads, no analytics, no trackers.
- Connecting Microsoft (Outlook, To Do, Teams, OneDrive) or Google Calendar is **optional**. If you do, your device talks **directly** to Microsoft or Google; the data doesn't pass through me.
- A few things do involve other parties: the website and downloads are hosted by GitHub, the apps check GitHub for updates, and if you report a bug, I receive what you send.

## What happens to your data

| Data | Where it's stored | Why | Legal basis (GDPR) |
|---|---|---|---|
| Tasks, planned sessions, feedback, your own calendar events, settings, learned time estimates | On your device only (browser storage / app storage). Optionally encrypted with your passphrase. | To plan your work — the core of the app. | You process this data yourself on your own device; I don't receive it. |
| Backups | A file you download and keep; always encrypted with a passphrase you choose. | So you can restore your data. | As above. |
| Activity log | On your device; counts only (e.g. "3 events imported"), never content. | To show you when Planora contacted Microsoft or Google. | As above. |
| Microsoft / Google sign-in tokens | On your device (for the browser session, or longer if you stay signed in or use sync). | To use the connections you turned on. | As above. |
| Bug reports you send by e-mail | My mailbox (Outlook.com, Microsoft). | To fix the problem and reply to you. | Legitimate interest in fixing the app and answering you (Art. 6(1)(f)). |
| Website and download visits, update checks | GitHub's servers (logs with IP address and browser/app info). | To deliver the website, downloads and update information. | Legitimate interest in offering the app securely (Art. 6(1)(f)). |

## Optional connections

You choose per feature what Planora may do. Planora asks Microsoft or Google only for the permission that feature needs.

### Microsoft (Outlook, Teams, To Do, OneDrive)
You sign in at Microsoft with your personal or school/work account. Depending on what you turn on:

| Feature | Permission | What Planora does |
|---|---|---|
| Busy times from Outlook (incl. Teams meetings) | Calendars.Read | Reads your calendar so it can plan around your appointments. |
| Put planned sessions in Outlook | Calendars.ReadWrite | Creates, moves and deletes **only events Planora created**, marked private. |
| Import Microsoft To Do | Tasks.Read | Reads task title, status and due date. |
| Import Teams assignments | EduAssignments.ReadBasic | Reads assignment name, status and due date. |
| Sync between your own devices | Files.ReadWrite.AppFolder | Stores one **end-to-end encrypted** file in Planora's own folder in your OneDrive (Apps/Planora). Only your passphrase can unlock it — not me, not Microsoft. Planora can't see your other files. |

This data goes directly between your device and Microsoft. Microsoft's own privacy statement applies to your Microsoft account: https://privacy.microsoft.com. With a school account, your school manages that account.

### Google Calendar (free/busy)
Planora asks for the narrowest Google permission there is: **free/busy only** (`calendar.freebusy`). It sees only *when* you're busy in your primary calendar (from 7 days ago to 90 days ahead) — never the titles or details of events. The access token stays on your device for about an hour and is never synced.

Planora's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

### Apple Calendar (.ics files)
Importing and exporting `.ics` files happens entirely on your device.

## Updates, website and downloads
- The website and the downloads are hosted on **GitHub** (GitHub Pages and GitHub Releases). GitHub receives your IP address and browser information when you visit or download. See GitHub's privacy statement: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement
- The **desktop app** and the **Android app** ask GitHub "what is the newest version?" (api.github.com). GitHub sees your IP address and app version. In the Android app you can turn this off in Settings.

## Bug reports
- **Via GitHub:** Planora prepares a report with what you typed plus technical details you can see and switch off (version, device type, error codes — never your tasks or calendar). You submit it yourself with your GitHub account. **Reports on GitHub are public** — don't include personal information.
- **By e-mail:** I receive your e-mail address and what you write. I keep these e-mails for up to 12 months after the issue is resolved, then delete them.

## International transfers
GitHub, Microsoft and Google are US companies (Microsoft and Google also have EU data centres). They rely on the EU-US Data Privacy Framework and/or the European Commission's Standard Contractual Clauses for transfers outside the EU. For your own Microsoft or Google account, your agreement with them applies.

## How long data is kept
- Data on your device: until you delete it (Settings → Privacy → Delete everything), uninstall the app, or clear the browser's site data.
- **Note:** "Delete everything" removes Planora's data **on that device** and signs you out. If you used sync, the encrypted file in your OneDrive (Apps/Planora) and the data on your other devices stay — delete the folder in OneDrive and use "Delete everything" on each device.
- Bug-report e-mails: up to 12 months after the issue is resolved.
- GitHub logs: according to GitHub's privacy statement.

## Storage on your device (cookies)
Planora stores information on your device only to make the app work: your data (IndexedDB), your settings and, if you connect Microsoft, sign-in information (localStorage / sessionStorage; Microsoft's sign-in library may briefly use a cookie during sign-in). The website caches its own files so it works offline. There are **no tracking, advertising or analytics cookies**, so there's no cookie banner.

## Your rights
You have the right to access, correct, delete, restrict, object to, and receive a copy of your personal data, and to withdraw consent. Because your Planora data is on your own device, you can do most of this yourself: export a backup, edit, or delete everything in Settings → Privacy. For bug-report e-mails or anything else, e-mail **planoradevelopment@outlook.com** — I'll respond within one month.

You can also complain to the Dutch data protection authority, the **Autoriteit Persoonsgegevens** (https://autoriteitpersoonsgegevens.nl), or the authority in your own EU country.

## Children and school use
Planora is made for students, including school pupils. You can use Planora without connecting any account. If you're **under 16**, ask a parent or guardian before connecting a personal Microsoft or Google account. School accounts are managed by your school, which decides which apps may connect to them.

## Security
Your data stays on your device; you can encrypt it with a passphrase and lock the app. Backups and the sync file are always encrypted. The app only talks to the services listed above (enforced by a Content Security Policy), and asks for the narrowest permissions possible. If you lose your passphrase, nobody — including me — can recover encrypted data.

## Changes
When Planora changes how it handles data, I'll update this page and the date at the top.
