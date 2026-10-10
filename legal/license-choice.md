# Choosing a license for Planora

RESEARCH NOTES — NOT LEGAL ADVICE. Generated 2026-10-10 by app-legal-guard.

The repository `briefcasejona/planora` is **public** and has **no LICENSE** file (and no `license` field in package.json). Without a license the code is "all rights reserved": people can view it on GitHub (and fork it on GitHub under GitHub's terms) but may not legally reuse, modify or redistribute it. That's legally safe for you, but it's unclear to visitors and contributors.

| Option | Lets others… | Fits Planora if… | Note |
|---|---|---|---|
| **Proprietary — "All rights reserved"** | View only | You might sell Planora or a pro version later and want full control | Add a short LICENSE stating it explicitly. You can still open it later. |
| **MIT** | Do almost anything, incl. commercial copies, if they keep the notice | You want others to reuse and contribute freely, and don't mind clones | Can't be taken back for versions already released under MIT. |
| **Apache-2.0** | Same as MIT + explicit patent grant | Same as MIT | |
| **GPL-3.0 / AGPL-3.0** | Reuse only if they publish their changes under the same license | You want every fork to stay open | App stores and GPL can clash |
| **PolyForm Noncommercial / source-available** | Use and modify non-commercially only | You want openness for students/schools but no commercial clones | Not "open source" by the OSI definition. |

**Dependency check:** all shipped dependencies are permissive; `ical.js` is MPL-2.0 (file-level — fine with any choice above, keep its notice). Nothing forces a particular license.

**Recommendation:** since you may want to monetize later and the app's value is partly its code, start with **"All rights reserved"** (proprietary) now — it keeps every option open, and you can switch to MIT or another open license later. If you'd rather invite contributions, MIT is the simple open choice. `[review]`

**Decision (Jonathan, 2026-10-10):** All rights reserved — `LICENSE` added.
