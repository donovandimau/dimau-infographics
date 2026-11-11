# TRACKER — dimau-infographics

> **Every AI: read this whole file before you start any work on this project, and update it before you finish — in the same commit as your work.**
> Newest entries go at the TOP of each section. If something is listed under *In progress* or *Done*, do not redo it: carry it on, or check with Donovan.
> Work that applies to **every** project (shared rules, rollouts, new-project checklist) lives on the main board: `donovandimau/Dimau-Ops-Room` → `ALL-PROJECTS.md`.

## Project
- Ops Room card: `platform-dimau-infographics` (created 11 Nov 2026)
- Code: https://github.com/donovandimau/dimau-infographics
- Live: not set until the first build is approved and deployed
- What it is: the one central library of interactive infographic templates. Apps load `/v1/dimau-infographics.js` from the live address and pick a template by name. Related but separate: Dimau Visuals (`platform-dimau-visuals`) is a finished product; this is the shared component library apps build with.

## Current state
- Status: first build (v1) on branch `build-v1`, pull request open for Donovan's review
- Templates: Lanternfield (connections), Tidepool (amounts), Strata (levels), Riverline (time)
- Next action: Donovan reviews the pull request on desktop and phone; after approval, merge and connect the Vercel project so apps can load the files
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
| 2026-11-11 | Claude | First build: library site, loader, four templates, React wrapper | `build-v1` |

## Do not change
- The `--di-*` theme token names and the template ids: apps depend on them.

## Last handover
- none recorded

## Done — newest first
- nothing logged yet

_Seeded 2026-11-11 from the Ops Room. From here on, this file is the record for this project._
