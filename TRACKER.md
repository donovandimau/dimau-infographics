# TRACKER — dimau-infographics

> **Every AI: read this whole file before you start any work on this project, and update it before you finish — in the same commit as your work.**
> Newest entries go at the TOP of each section. If something is listed under *In progress* or *Done*, do not redo it: carry it on, or check with Donovan.
> Work that applies to **every** project (shared rules, rollouts, new-project checklist) lives on the main board: `donovandimau/Dimau-Ops-Room` → `ALL-PROJECTS.md`.

## Project
- Ops Room card: `platform-dimau-infographics` (created 11 Nov 2026)
- Code: https://github.com/donovandimau/dimau-infographics
- Live: https://dimau-infographics.vercel.app/ (Vercel project `dimau-infographics`, team donovandimau-3468s-projects; every merge to `main` deploys)
- What it is: **Infographics Fiji** — the template registry, studio and render API (`/vault`, `/studio/[slug]`, `/api/v1/*`) plus the v1 interactive template library (`/v1/`, unchanged, served from `public/`). Apps load `/v1/dimau-infographics.js` from the live address and pick a template by name, or call the render API. Related but separate: Dimau Visuals (`platform-dimau-visuals`) is a finished product; this is the shared library apps build with.

## Current state
- Status: v1 live since 11 Nov 2026 (25 templates); Infographics Fiji v2 (Next.js app + render API) in PR #4
- Templates, v1 interactive (25): Tilemap, Mosaic, Duel, Almanac, Goalmeter and Dayclock (everyday), Rankrace, Peoplegrid, Guessline, Flowbank, Ledger and Storyscroll (charts), Archive Desk (stories), Lanternfield (connections), Tidepool (amounts), Strata (levels), Riverline, Switchback, Swimlane, Roadmap (time), Waypath (steps), and four signal cards
- Templates, v2 render API (4, same slugs as the signal cards): rbf-sandbox-settlement-flow, sota-kece-community-pulse (+ 1200x630 share card), pacific-backhaul-node-map, debt-freedom-trajectory — server-rendered SVG/PNG at `/api/v1/render/<slug>` for img tags, link previews, emails and server code
- Next action: merge PR #4; set env vars from `.env.example`; run `supabase/migrations/001_infographics_fiji.sql` then `supabase/seed.sql`; apps adopt templates and record each in `catalog.json` `usedBy`
- Blocker: none for the render API (works with no database); saving from the studio needs the Supabase env vars

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
- `/api/v1/*` request and response shapes: sister apps call them. Breaking changes go to `/api/v2/`.
- `src/lib/starter-templates.ts` is the one source for `supabase/seed.sql` and the SDK: edit it, then `npm run build:seed && npm run build:sdk`. Never hand-edit `seed.sql`.
- The antv server renderer must stay inside its worker thread (`src/lib/antv-ssr.ts`): run in the main thread it installs a fake `window` that breaks every other Next.js request.
- The `--di-*` theme token names and the template ids: apps depend on them.

## Last handover
- 2026-11-12 — Copilot — Merged main into PR #4, preserving the 25-template v1 library under `public/` alongside the Fiji v2 app.
- 2026-11-11 — Claude — Built Infographics Fiji v2 in this repo: Next.js app (vault, studio, render/templates/sdk/preview/ai APIs), Supabase migration + generated seed, 4 starter templates (RBF sandbox flow, Sota Kece pulse + share card, backhaul node map, debt trajectory), typed SDK generator, sync workflow to SotaKece and mydebtcalculator. Static v1 files moved to `public/` (URLs unchanged; smoke test points there). `npm test` passes (v1 smoke + server render tests). Works with no database: falls back to the starter templates. Outstanding for Donovan: Vercel import + env vars, run the migration and seed, `ECOSYSTEM_PAT` secret for the sync workflow.
- 2026-11-11 — Claude — v1 built on `build-v1` and merged by Donovan as PR #1; `npm test` passes at 1360px and 390px. Ops card, room artifact and Command Room post recorded. Rollout row added via Dimau-Ops-Room PR #429. Vercel project NOT created: the automated setup was refused by a permission check, so after approval someone imports this repo in Vercel (team donovandimau-3468s-projects, no build step) and sets the live address on the card. `dimau-pwa.js` was copied unchanged from fiji-planner (md5 cd3f4845…).

## Done — newest first
- 2026-11-11 — Claude — v1.4: six everyday templates in `v1/showcase.js`: Tilemap (equal-tile map; real data, Fiji's 14 provinces and Rotuma by division, optional short codes on small screens), Mosaic (zooming treemap) and Duel (pick-two comparison) on real FijiLearn catalogue data, and Almanac (calendar heatmap with streaks), Goalmeter (progress with milestones and a projected finish) and Dayclock (24-hour day) on marked example figures. New "Everyday" section on the library site. Builds on PR #6. npm test covers all 25 at 1360px and 390px.
- 2026-11-11 — Claude — v1.3: six chart templates built on the formats the leading data sites are known for (Datawrapper's tables and line charts, Flourish's bar chart races and scrollytelling, The Pudding's unit charts, the NYT's draw-your-guess, Visual Capitalist's flow diagrams). Real FijiLearn data for Peoplegrid, Ledger and Storyscroll; Guessline uses calculated savings; Rankrace and Flowbank use marked example figures. Fixed Roadmap and Swimlane losing keyboard focus when they redraw (it made a Roadmap test intermittent). npm test covers all 19 at 1360px and 390px.
- 2026-11-11 — Claude — Switchback 1.1 (Donovan sent Gemini's top-tier review): time-gap markers on the spine ("+131 years") instead of equal spacing across centuries; span events (Kingdom of Fiji, Crown colony, girmit) drawn as era bars beside the spine; the card crossing the reading line is spotlit and the rest dimmed; milestone rings (milestone or weight 3); big tabular dates with category/span pills; connector ticks from spine to card; density bars on the year rail; optional `media` picture and `location` label on a card. All additive inside v1: new options `gapYears`, `spotlight`, `spanBars` default on, no ids, options or events removed. Also fixed cards overflowing the frame by 30px on phones. Data stays in the shared shape (spans kept in events, not moved to a new eras format, so Riverline/Swimlane/Roadmap data still works). Switchback smoke check passes at 1360 and 390; Lanternfield and Roadmap (phone) checks fail the same way on main before this change.
- 2026-11-11 — Claude — Archive Desk template (`archive-desk`, v1/archive-desk.js), from the Fiji History Museum's Archive Desk after Donovan approved and merged it (museum PR #845): a 3D open book with page turns beside a picture stack, synced both ways; Watch Images lightbox with spinning ring, magnifying loupe and self-playing visual story; Read Book with page or scroll view, text size, parchment/sepia and picture cards. No dependencies (the museum version's three.js dust and GSAP dropped; CSS 3D and Web Animations instead). Real sample data: four museum moments. Used by platform-fiji-museum. Also: the smoke test now blocks the service worker, whose first-visit reload was wiping test state; that fixed the Lanternfield check. Roadmap at phone width still fails, as it did before.
- 2026-11-11 — Claude — v1.1: four signal cards from Donovan's Infographics Fiji spec (settlement flow, community pulse, backhaul node map, debt-freedom trajectory; value slots with defaults, wide/tall/share-card, dark/light, PNG/SVG export) and four timeline views sharing one data shape (Switchback, Swimlane, Roadmap, Waypath), built as original templates from the timeline formats in the links Donovan sent (the pages themselves could not be opened from the build session). The loader now downloads a shared file once. Two garbled spec defaults replaced with marked example values (FJD 1.25M, FJD $4,120). npm test covers all 12 at 1360px and 390px.
- 2026-11-11 — Claude — Linked the Vercel project and confirmed production at https://dimau-infographics.vercel.app/ serves the site, catalog.json and /v1/ files with open cross-site access. Ops card set to Live.
- 2026-11-11 — Claude — v1 library merged (PR #1): loader, shared theme, Lanternfield, Tidepool, Strata, Riverline, React wrapper, library site and demo pages, smoke test passing at 1360px and 390px.

_Seeded 2026-11-11 from the Ops Room. From here on, this file is the record for this project._
