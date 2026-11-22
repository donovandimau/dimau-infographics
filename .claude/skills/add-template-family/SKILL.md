---
name: add-template-family
description: Add a new family of v1 interactive templates (usually six) to the Dimau Infographics library. Use when asked to "add more templates", "add a <topic> family", or to add one template to an existing family file. Covers choosing what to build, the family file contract, honest sample data, wiring with scripts/new-family.py, the home section, Pathfinder, README, smoke tests, screenshots at phone and desktop width, and TRACKER.
---

# Add a template family

How this library grew from 134 to 158 templates (v1.24 Weather, v1.25 Sport, v1.26 Food, v1.27 Energy), one family of six per pull request. Read `TRACKER.md` first — the rules there win over this file.

## 0. Before you start
- `git fetch origin main` and branch from it (`<family>-v1`). If an earlier family PR is still open, branch from **that** branch instead and say "Builds on PR #N; merge it first" in the PR. The `keep-prs-mergeable` workflow keeps stacked PRs mergeable and `TRACKER.md` merges with `merge=union`.
- If `git fetch` fails on a stale ref, check `git config --get-all remote.origin.fetch` and remove the dead entry.
- Claim the work in TRACKER's *In progress* table if the change will take more than one session.

## 1. Choose what to build
- List what exists first: `python3 -c "import json;[print(t['id'],t.get('family'),t['bestFor'][:80]) for t in json.load(open('public/catalog.json'))['templates']]"`. Do not repeat a chart type that already exists under another name (for example Almanac is already a year-of-days heatmap, Dayclock is hour-of-day, Bridge is a waterfall, Mosaic is a treemap).
- Pick a theme useful to Dimau's apps (Fiji and the Pacific: money, weather and sea, sport, food and growing, energy, learning). Six templates that each do one job, with at least one that can use real, citable or worked-out data.
- Original work only: no recreations of existing products, no cartoon imagery. Plain geometric icons are fine.

## 2. Pick a class prefix
Each family file has its own two-letter CSS prefix. Check it is free before writing a line:
```bash
grep -rlE "['\". ]xx-" public/v1 | head      # replace xx with the candidate
```
Never `dp-` (used by `dimau-pwa.js`); `dc-` is taken by `charts.js`. Add the new prefix to the list in TRACKER's rules.

## 3. Write `public/v1/<family>.js`
Copy the structure of a recent family file (`energy.js`, `food.js`, `sport.js`, `weather.js`) — it is the contract:
- UMD wrapper exporting each class on `root` and a `Dimau<Family>` object.
- **All CSS in one `const STYLE = \`…\`` string**, injected once by `injectStyle()` as `<style id="<prefix>-style">`, guarded by `if (document.getElementById('<prefix>-style')) return;`. Interpolating plain `const` strings into STYLE is fine; `scripts/build-css.cjs` resolves them.
- A `Base` class with: `ResizeObserver` re-render on width change; `MutationObserver` on `data-theme`/`class` of `<html>` for dark mode; `on/off/_emit`; `_keep(container, html)` to keep keyboard focus across re-renders; `_hot(container, fn)` for tap/Enter/Space on `[data-k]`; `destroy()`.
- Colours only from `--di-*` tokens (via `themeOf(el)`) or a fixed palette; `--di-c-<id>` overrides per item.
- Every template ends in a `<p class="<prefix>-note" aria-live="polite">` that says the main finding in plain words, and updates when the reader taps or keys something. The smoke tests read this text.
- Keyboard: focusable `[data-k]` items with `role="button"` and an `aria-label`, or a focusable SVG with arrow keys for scrubbing. Help text goes in tap/hover pop-ups only, never in permanent instructions.
- Narrow layouts below about 520px. Nothing may scroll sideways at 390px.
- Times from data are wall-clock strings parsed with `Date.UTC` and read with `getUTC*`, so the viewer's time zone never shifts them.

## 4. Sample data — honest by default
`public/templates/<id>/sample-data.js` starts with a comment saying what it is:
- **Example:** `/* Example figures, made up to show the template: … */`. Use lettered or unnamed people, places and teams. Say "not a forecast", "not for navigation", "not financial advice" etc. where a reader could act on it.
- **Real:** name the source and date. "Worked out" data is fine when the method is stated (e.g. Uvday: sun position for Suva on 21 Dec 2026, Madronich's approximation; Labelcard: the real UK front-of-pack thresholds with an imaginary product).
- Never present invented figures under real names (real crops with invented seasons, real suppliers with invented tariffs). Letter them instead.
Keep the script that produced the data in the PR description or scratchpad, so the numbers can be reproduced.

## 5. Wire it up: `scripts/new-family.py`
Write a spec JSON (format in the script's docstring: file, family, nav label, the nav label to insert after, new version, and per template id/name/global/eyebrow/lede/best/data/flag/events/shape/sample/mechanics/dataShape). Then:
```bash
python3 scripts/new-family.py /path/to/spec.json
```
It adds the nav link on every page, writes the demo pages from `scripts/demo-page.tpl`, adds catalog entries and version, the loader `TEMPLATES` lines, the `STYLE_IDS` entry and `VERSION`, the React `LOADERS` lines and any new event names, and runs `scripts/build-css.cjs`. Re-running it is safe.

Bump the minor version for a new family (1.27.0 → 1.28.0); patch for fixes.

## 6. The parts that need judgement
- **Home page** (`public/index.html`): a `<section class="panel family" id="<family>">` before the `#cards` section, with eyebrow, one-line lede, a live preview `<div class="stage-mini di-theme" id="pv-<id>">` of the template with the best sample (real data if any), and a six-item `family-list`. Add its `sample-data.js` script and a `D.mount('#pv-<id>', …)` line next to the others. The home check in `tests/smoke.cjs` counts mounted templates — raise it by one.
- **Pathfinder** (`public/templates/pathfinder/sample-data.js`): the first question has 7 groups and must stay at 8 or fewer. Put the family's answer inside the closest group node (`g_numbers`, `g_unfold`, `g_choose`, `g_explain`, `g_daily`, `g_money`, `g_world`), add a family node with one option per template and an `r_<id>` result node for each. Update the version and count in the file's first-line comment. Check every result is reachable.
- **README**: one table row per template after the previous family's rows, and a `v1/<file>` line in the repository layout block.
- **docs/ADDING-A-TEMPLATE.md** only if the contract changed.

## 7. Check it
1. Screenshots at both widths, then look at every one:
   ```bash
   node scripts/shots.cjs "$SCRATCH/shots" id1 id2 id3 id4 id5 id6
   ```
   Typical faults found this way: labels clipped at the right edge on phones (anchor the last axis label `end`), labels sitting on top of markers (draw labels last, add a `paint-order="stroke"` halo), crowded names (spread positions, smaller text on narrow), a value axis whose top tick is below the data, stray shapes from full-circle SVG arcs (use a stroked `<circle>` instead).
2. Read each template's note text in a headless page and check the numbers by hand (or with a quick independent calculation) before writing tests from it.
3. Add one `PAGES` entry per template in `tests/smoke.cjs` with a real interaction and an exact-text check of the note, e.g. summary → tap or key one item → filter or slider → summary changes. Run just yours while iterating:
   ```bash
   SMOKE_ONLY='^(library|pathfinder|id1|id2)$' node tests/smoke.cjs
   ```
   Then the full suite (`npm test`, about 15 minutes); every check must pass at 1360px and 390px, including the strict-style-policy and `.css`-copy checks.

## 8. Record and ship
- TRACKER in the same commit: status line (family on branch X, in review, not live), the template list and count, the prefix list, and a **Done** entry at the top describing each template, the sample data (real or example, sources), what Pathfinder got, anything not updated, and the test count.
- Then follow the `ship-dimau-infographics` skill: commit, draft PR, watch checks, wait for Donovan to merge, verify production, close out TRACKER and the Ops card.

## Known leftovers
- Self-describing samples (Factwall, Kpitiles, Estimator, Treeline, Sunburst, Radialbars, Streamgraph, Annotline, Waffle, Wordbars, Keyline, Circlepack) still state the v1.22 count. Either update them all from `catalog.json` in one change or leave them, but say which in TRACKER.
