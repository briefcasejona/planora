# DPIA screen — Planora v0.3.4

RESEARCH NOTES — NOT LEGAL ADVICE. Generated 2026-10-10 by app-legal-guard.

| Question | Answer | Evidence |
|---|---|---|
| Children as a (possible) target group? | **Yes** — school pupils are likely users. | README, role choice, Teams assignments |
| Special-category data (health, religion, biometrics…)? | No (users could type anything into task notes, but it stays on their device). | `src/data/` |
| Location tracking or large-scale monitoring? | No. | CSP, no location APIs |
| Profiling / automated decisions with real effects? | Personal time-estimate correction, on device only, no legal or similarly significant effect. | `src/domain/estimator.ts` |
| New technology (AI) applied to personal data? | No. | — |
| Data combined from multiple sources? | Yes, but only on the user's device (own calendar + Outlook/Google busy times + To Do/Teams). | `src/integrations/` |
| Large scale? | No (small user base; and no central processing). | — |
| Data leaves the device to Jonathan or third parties? | Not to Jonathan (except bug-report e-mails). To Microsoft/Google only via the user's own accounts, at the user's request. GitHub sees IP addresses (hosting, updates). | `csp.cjs`, `bugReport.ts` |

**Result:** No full DPIA needed **for Jonathan as provider** right now: Planora has no central processing of users' data, so most GDPR duties sit lightly on the provider. The "children" answer is the reason to stay careful.

**Re-screen when:** a school wants to deploy Planora for its pupils (the school then becomes the controller and will ask for processing information — see the lawyer brief), a server/account system/analytics is added, or AI features are added.

**Mitigations already in place:** local-only storage, optional encryption, encrypted backups and sync, least-privilege scopes, CSP, no trackers, delete-everything function, public-report warning.
**Residual risk:** low.
