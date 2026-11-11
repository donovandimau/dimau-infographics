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
- Templates (30): Dropoff, Quadrant, Slope, Pathfinder, Radar and Pyramid (compare), Tilemap, Mosaic, Duel, Almanac, Goalmeter and Dayclock (everyday), Rankrace, Peoplegrid, Guessline, Flowbank, Ledger and Storyscroll (charts), plus Lanternfield (connections), Tidepool (amounts), Strata (levels), Riverline, Switchback, Swimlane, Roadmap (time), Waypath (steps), and four signal cards from the Infographics Fiji spec
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
- 2026-11-11 — Claude — v1.4: six compare-and-decide templates in `v1/compare.js`: Dropoff (funnel), Quadrant (draggable 2×2 matrix), Slope (before and after), Pathfinder (question path with answer trail and path map), Radar (profiles on several measures) and Pyramid (two groups back to back). Real data for Pathfinder ("which template fits?", built from this library and shown live on the home page) and Radar (FijiLearn subjects); the other four use marked example figures. New "Compare" section and nav item. Builds on PR #8 (which builds on PR #6). npm test covers all 30 at 1360px and 390px.
- 2026-11-11 — Claude — v1.3: six everyday templates in `v1/showcase.js`: Tilemap (equal-tile map; real data, Fiji's 14 provinces and Rotuma by division, optional short codes on small screens), Mosaic (zooming treemap) and Duel (pick-two comparison) on real FijiLearn catalogue data, and Almanac (calendar heatmap with streaks), Goalmeter (progress with milestones and a projected finish) and Dayclock (24-hour day) on marked example figures. New "Everyday" section on the library site. Builds on PR #6. npm test covers all 24 at 1360px and 390px.
- 2026-11-11 — Claude — v1.2: six chart templates built on the formats the leading data sites are known for (Datawrapper's tables and line charts, Flourish's bar chart races and scrollytelling, The Pudding's unit charts, the NYT's draw-your-guess, Visual Capitalist's flow diagrams). Real FijiLearn data for Peoplegrid, Ledger and Storyscroll; Guessline uses calculated savings; Rankrace and Flowbank use marked example figures. Fixed Roadmap and Swimlane losing keyboard focus when they redraw (it made a Roadmap test intermittent). npm test covers all 18 at 1360px and 390px.
- 2026-11-11 — Claude — v1.1: four signal cards from Donovan's Infographics Fiji spec (settlement flow, community pulse, backhaul node map, debt-freedom trajectory; value slots with defaults, wide/tall/share-card, dark/light, PNG/SVG export) and four timeline views sharing one data shape (Switchback, Swimlane, Roadmap, Waypath), built as original templates from the timeline formats in the links Donovan sent (the pages themselves could not be opened from the build session). The loader now downloads a shared file once. Two garbled spec defaults replaced with marked example values (FJD 1.25M, FJD $4,120). npm test covers all 12 at 1360px and 390px.
- 2026-11-11 — Claude — Linked the Vercel project and confirmed production at https://dimau-infographics.vercel.app/ serves the site, catalog.json and /v1/ files with open cross-site access. Ops card set to Live.
- 2026-11-11 — Claude — v1 library merged (PR #1): loader, shared theme, Lanternfield, Tidepool, Strata, Riverline, React wrapper, library site and demo pages, smoke test passing at 1360px and 390px.

_Seeded 2026-11-11 from the Ops Room. From here on, this file is the record for this project._
