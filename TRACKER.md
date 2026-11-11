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
- Status: v1 live since 11 Nov 2026; Infographics Fiji v2 (Next.js app + render API) on branch `claude/infographics-fiji-studio-api`
- Templates: v1 Lanternfield (connections), Tidepool (amounts), Strata (levels), Riverline (time); v2 starters rbf-sandbox-settlement-flow, sota-kece-community-pulse, pacific-backhaul-node-map, debt-freedom-trajectory
- Next action: merge the v2 PR — the Vercel project must use the Next.js framework preset (it was a no-build static site); set env vars from `.env.example`; run `supabase/migrations/001_infographics_fiji.sql` then `supabase/seed.sql`
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
- 2026-11-11 — Claude — Built Infographics Fiji v2 in this repo: Next.js app (vault, studio, render/templates/sdk/preview/ai APIs), Supabase migration + generated seed, 4 starter templates (RBF sandbox flow, Sota Kece pulse + share card, backhaul node map, debt trajectory), typed SDK generator, sync workflow to SotaKece and mydebtcalculator. Static v1 files moved to `public/` (URLs unchanged; smoke test points there). `npm test` passes (v1 smoke + server render tests). Works with no database: falls back to the starter templates. Outstanding for Donovan: Vercel import + env vars, run the migration and seed, `ECOSYSTEM_PAT` secret for the sync workflow.
- 2026-11-11 — Claude — v1 built on `build-v1` and merged by Donovan as PR #1; `npm test` passes at 1360px and 390px. Ops card, room artifact and Command Room post recorded. Rollout row added via Dimau-Ops-Room PR #429. Vercel project NOT created: the automated setup was refused by a permission check, so after approval someone imports this repo in Vercel (team donovandimau-3468s-projects, no build step) and sets the live address on the card. `dimau-pwa.js` was copied unchanged from fiji-planner (md5 cd3f4845…).

## Done — newest first
- 2026-11-11 — Claude — Linked the Vercel project and confirmed production at https://dimau-infographics.vercel.app/ serves the site, catalog.json and /v1/ files with open cross-site access. Ops card set to Live.
- 2026-11-11 — Claude — v1 library merged (PR #1): loader, shared theme, Lanternfield, Tidepool, Strata, Riverline, React wrapper, library site and demo pages, smoke test passing at 1360px and 390px.

_Seeded 2026-11-11 from the Ops Room. From here on, this file is the record for this project._
