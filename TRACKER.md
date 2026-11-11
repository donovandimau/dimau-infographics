# TRACKER — dimau-infographics

> **Every AI: read this whole file before you start any work on this project, and update it before you finish — in the same commit as your work.**
> Newest entries go at the TOP of each section. If something is listed under *In progress* or *Done*, do not redo it: carry it on, or check with Donovan.
> Work that applies to **every** project (shared rules, rollouts, new-project checklist) lives on the main board: `donovandimau/Dimau-Ops-Room` → `ALL-PROJECTS.md`.

## Project
- Ops Room card: `platform-dimau-infographics` (created 11 Nov 2026)
- Code: https://github.com/donovandimau/dimau-infographics
- Live: https://dimau-infographics.vercel.app/ (Vercel project `dimau-infographics`, team donovandimau-3468s-projects; every merge to `main` deploys)
- What it is: the one central library of interactive infographic templates. Apps load `/v1/dimau-infographics.js` from the live address and pick a template by name. Related but separate: Dimau Visuals (`platform-dimau-visuals`) is a finished product; this is the shared component library apps build with.

## Current state
- Status: v1 live since 11 Nov 2026
- Templates (13): Archive Desk (stories), Lanternfield (connections), Tidepool (amounts), Strata (levels), Riverline, Switchback, Swimlane, Roadmap (time), Waypath (steps), and four signal cards from the Infographics Fiji spec
- Next action: apps adopt templates; record each in `catalog.json` `usedBy`
- Blocker: none

## Rules for this library
- `catalog.json` is the one list of templates. The loader (`v1/dimau-infographics.js`) and `tests/smoke.cjs` must agree with it; the test fails if they do not.
- Inside `/v1/` nothing breaks: no renamed templates, removed options or changed event payloads. Breaking changes start `/v2/`.
- When an app adopts a template, add it to that template's `usedBy` in `catalog.json` (`{ "app": "platform-…", "since": "YYYY-MM-DD" }`) so changes can be checked against the apps that use them.
- Sample data must say whether it is real or illustrative. Real data names its source and date.
- New templates: follow `docs/ADDING-A-TEMPLATE.md`.

## In progress — claim a task here BEFORE you start it
| Started | AI | Task | Branch / PR |
|---|---|---|---|
| — | — | nothing claimed | — |

## Do not change
- The `--di-*` theme token names and the template ids: apps depend on them.

## Last handover
- 2026-11-11 — Claude — v1 built on `build-v1` and merged by Donovan as PR #1; `npm test` passes at 1360px and 390px. Ops card, room artifact and Command Room post recorded. Rollout row added via Dimau-Ops-Room PR #429. Vercel project NOT created: the automated setup was refused by a permission check, so after approval someone imports this repo in Vercel (team donovandimau-3468s-projects, no build step) and sets the live address on the card. `dimau-pwa.js` was copied unchanged from fiji-planner (md5 cd3f4845…).

## Done — newest first
- 2026-11-11 — Claude — Switchback 1.1 (Donovan sent Gemini's top-tier review): time-gap markers on the spine ("+131 years") instead of equal spacing across centuries; span events (Kingdom of Fiji, Crown colony, girmit) drawn as era bars beside the spine; the card crossing the reading line is spotlit and the rest dimmed; milestone rings (milestone or weight 3); big tabular dates with category/span pills; connector ticks from spine to card; density bars on the year rail; optional `media` picture and `location` label on a card. All additive inside v1: new options `gapYears`, `spotlight`, `spanBars` default on, no ids, options or events removed. Also fixed cards overflowing the frame by 30px on phones. Data stays in the shared shape (spans kept in events, not moved to a new eras format, so Riverline/Swimlane/Roadmap data still works). Switchback smoke check passes at 1360 and 390; Lanternfield and Roadmap (phone) checks fail the same way on main before this change.
- 2026-11-11 — Claude — Archive Desk template (`archive-desk`, v1/archive-desk.js), from the Fiji History Museum's Archive Desk after Donovan approved and merged it (museum PR #845): a 3D open book with page turns beside a picture stack, synced both ways; Watch Images lightbox with spinning ring, magnifying loupe and self-playing visual story; Read Book with page or scroll view, text size, parchment/sepia and picture cards. No dependencies (the museum version's three.js dust and GSAP dropped; CSS 3D and Web Animations instead). Real sample data: four museum moments. Used by platform-fiji-museum. Also: the smoke test now blocks the service worker, whose first-visit reload was wiping test state; that fixed the Lanternfield check. Roadmap at phone width still fails, as it did before.
- 2026-11-11 — Claude — v1.1: four signal cards from Donovan's Infographics Fiji spec (settlement flow, community pulse, backhaul node map, debt-freedom trajectory; value slots with defaults, wide/tall/share-card, dark/light, PNG/SVG export) and four timeline views sharing one data shape (Switchback, Swimlane, Roadmap, Waypath), built as original templates from the timeline formats in the links Donovan sent (the pages themselves could not be opened from the build session). The loader now downloads a shared file once. Two garbled spec defaults replaced with marked example values (FJD 1.25M, FJD $4,120). npm test covers all 12 at 1360px and 390px.
- 2026-11-11 — Claude — Linked the Vercel project and confirmed production at https://dimau-infographics.vercel.app/ serves the site, catalog.json and /v1/ files with open cross-site access. Ops card set to Live.
- 2026-11-11 — Claude — v1 library merged (PR #1): loader, shared theme, Lanternfield, Tidepool, Strata, Riverline, React wrapper, library site and demo pages, smoke test passing at 1360px and 390px.

_Seeded 2026-11-11 from the Ops Room. From here on, this file is the record for this project._
