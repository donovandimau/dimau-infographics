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
- Templates (12): Lanternfield (connections), Tidepool (amounts), Strata (levels), Riverline, Switchback, Swimlane, Roadmap (time), Waypath (steps), and four signal cards from the Infographics Fiji spec
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
- 2026-11-11 — Claude — v1.1: four signal cards from Donovan's Infographics Fiji spec (settlement flow, community pulse, backhaul node map, debt-freedom trajectory; value slots with defaults, wide/tall/share-card, dark/light, PNG/SVG export) and four timeline views sharing one data shape (Switchback, Swimlane, Roadmap, Waypath), built as original templates from the timeline formats in the links Donovan sent (the pages themselves could not be opened from the build session). The loader now downloads a shared file once. Two garbled spec defaults replaced with marked example values (FJD 1.25M, FJD $4,120). npm test covers all 12 at 1360px and 390px.
- 2026-11-11 — Claude — Linked the Vercel project and confirmed production at https://dimau-infographics.vercel.app/ serves the site, catalog.json and /v1/ files with open cross-site access. Ops card set to Live.
- 2026-11-11 — Claude — v1 library merged (PR #1): loader, shared theme, Lanternfield, Tidepool, Strata, Riverline, React wrapper, library site and demo pages, smoke test passing at 1360px and 390px.

_Seeded 2026-11-11 from the Ops Room. From here on, this file is the record for this project._
