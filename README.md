# Dimau Infographics

Live: https://dimau-infographics.vercel.app/

The central library of interactive infographic templates for every Dimau app. Each app loads one shared script, picks the template that fits the shape of its information, and supplies its own data and colours. Nothing is copied into app repos, so a fix here reaches every app.

| Template | Shape of information | Best for | Original mechanics |
|---|---|---|---|
| **Lanternfield** | Connections | Many linked topics: systems, ecosystems, product maps | Leashed lantern lens, rim compass, fog of discovery, pins and bridges, guided tours, saved exploration |
| **Tidepool** | Amounts | Budgets, allocations, trade-offs | Communicating vessels with flow through pipes, locks, a plain-language trade-off sentence |
| **Strata** | Levels | Catalogues, curricula, categories, organisations | Core-sample layers sized by value, x-ray strip previews, pull-out drilling, depth gauge |
| **Riverline** | Time | Histories, project timelines, logs | River that widens with activity, magnifying current, lanes, reading strip |
| **Switchback** | Time | Stories and histories read in order | Alternating cards that collapse to one column, spine that fills as you read, year rail, filters, story mode |
| **Swimlane** | Time | Several threads side by side | One lane per theme, points and spans, zoom and pan, navigator strip with a draggable window, detail panel |
| **Roadmap** | Time | Plans with dependencies | Gantt rows, milestones, dependency arrows, progress, today line, drag a task and its dependants follow |
| **Waypath** | Steps | Processes, journeys, learning paths | Road, cycle or staircase; tap a stop to reveal it; play walks the path; works without dates |
| **Rankrace** | Rankings over time | League tables, top products, busiest months | Bars overtake as time plays, scrub to any moment, leader and biggest climber in words |
| **Peoplegrid** | Proportion | Shares shown as countable things | One square per unit, regroups between grid, blocks and bars, highlight a group |
| **Guessline** | Prediction | Surprising trends | The reader draws their guess, the real line is revealed and scored |
| **Flowbank** | Flow | Budgets, funding, supply chains | Bands sized by amount, tap to follow a flow, share in plain words |
| **Ledger** | Table | Directories, price lists, catalogues | Sort, search, bars and heat in cells, sparklines, rows that open |
| **Storyscroll** | Story | Explainers and reports | Sticky chart that re-sorts and highlights as the story scrolls |
| **Tilemap** | Places | Provinces, districts, regions | Every place an equal tile set roughly where it sits, so small places are as easy to tap as big ones; colour by group or value |
| **Mosaic** | Proportion inside proportion | Catalogues, budgets, storage | Treemap blocks sized by amount; tap to zoom into a block, a path (or Escape) to come back out |
| **Duel** | Comparison | This versus that | Pick any two, one measure per row, a star on each row's leader, the score in a sentence |
| **Almanac** | Day by day | Habits, attendance, activity | Calendar heatmap that finds and outlines the longest streak |
| **Goalmeter** | Progress | Fundraising, savings, targets | Bar built from each contribution, milestones, and when the goal will be reached at the pace so far |
| **Dayclock** | A day | Routines, opening hours, shifts | A whole day on a 24-hour clock face; switch between days to compare |
| **Dropoff** | Steps people leave | Sign-ups, applications, pipelines | Funnel with the loss between steps and the biggest drop marked |
| **Quadrant** | Two qualities | Prioritising ideas, cost against value | 2×2 matrix; drag items (or arrow keys) between named boxes, which recount |
| **Slope** | Before and after | Prices then and now, this year against last | One line per item, rises and falls coloured, filter to risers or fallers |
| **Pathfinder** | Decisions | Eligibility checkers, "which plan is right for me" | One question at a time, change any earlier answer, a map of the whole path |
| **Radar** | Profiles | Comparing on five to eight measures | One shape per profile, switch profiles on and off, tap a measure to rank |
| **Pyramid** | Two groups | Population by age, staff by grade | Back-to-back bars, numbers or share of all, tap a row |
| **Signal cards** (4) | Headline numbers | Settlement flow, community pulse, backhaul node map, debt-freedom trajectory | Named value slots with defaults, tap for detail, wide / tall / 1200×630 share card, dark and light, PNG and SVG export |

The four timeline views (Switchback, Swimlane, Roadmap, Waypath) read one shared data shape, and Riverline's data works in all of them, so an app can switch view without reshaping anything. The four signal cards come from the Infographics Fiji spec; their template ids are the spec slugs (`rbf-sandbox-settlement-flow`, `sota-kece-community-pulse`, `pacific-backhaul-node-map`, `debt-freedom-trajectory`).

Not sure which template fits? Answer the questions in Pathfinder on the library home page. The library site shows every template live with sample data, and each template has a full demo page with its data shape, events and embed code.

## Use a template in an app

```html
<div id="explore" style="min-height:480px"></div>
<script src="https://dimau-infographics.vercel.app/v1/dimau-infographics.js"></script>
<script>
  DimauInfographics.mount('#explore', {
    template: 'tidepool',          // any id in catalog.json, e.g. strata, swimlane, debt-freedom-trajectory
    data: myData,                  // shape: see catalog.json or the template's page
    options: {},                   // optional, per template
    on: { change: e => console.log(e) }
  }).then(instance => { /* call instance methods */ });
</script>
```

- Only the chosen template's file is downloaded.
- The loader adds the shared theme (`v1/dimau-infographics.css`). Override any `--di-*` token on the element or an ancestor to match the app: `--di-accent`, `--di-surface`, `--di-fg`, `--di-font`, `--di-c-<categoryId>`, and so on. Pass `theme: false` to skip the shared theme entirely.
- Each template file also works on its own (`<script src=".../v1/strata.js">` then `new Strata(el, data)`), and as a CommonJS module.

### React

```jsx
import DimauInfographic from './vendor/dimau-infographics/v1/react/DimauInfographic.jsx';

<DimauInfographic template="strata" data={catalogue} onDrill={e => setLevel(e.node)} persistKey="catalogue" style={{ minHeight: 480 }} />
```

The wrapper code-splits each template and forwards events as `on<Event>` props. `persistKey` saves the reader's progress in their browser for templates that support `getState`/`setState`.

## Picking a template

1. Decide the shape of your information: connections, amounts, levels or time.
2. Open that template's page on the library site and try it with the sample data.
3. Shape your data as shown on that page.
4. Mount it as above, and add your app to that template's `usedBy` list in `catalog.json` in the same pull request as any library change. The library home page lists which apps use which template.

## Repository layout

```
catalog.json                 the one list of templates (loader and tests check against it)
v1/dimau-infographics.js     loader: DimauInfographics.mount / load
v1/dimau-infographics.css    shared --di-* theme tokens (light sky-blue brand + dark)
v1/<template>.js             the templates; each file is self-contained, no dependencies
v1/timelines.js              Switchback, Swimlane, Roadmap, Waypath (one shared timeline data shape)
v1/signal-cards.js           the four signal cards
v1/charts.js                 Rankrace, Peoplegrid, Guessline, Flowbank, Ledger, Storyscroll
v1/showcase.js               Tilemap, Mosaic, Duel, Almanac, Goalmeter, Dayclock (everyday formats)
v1/compare.js                Dropoff, Quadrant, Slope, Pathfinder, Radar, Pyramid (compare and decide)
v1/lanternfield.d.ts         TypeScript types for Lanternfield
v1/react/DimauInfographic.jsx React wrapper for every template
templates/<id>/              demo page + sample data for each template
index.html, site.css         the library site
tests/smoke.cjs              headless browser checks for every page and template
docs/ADDING-A-TEMPLATE.md    how to add a template
```

## Versioning

Everything under `/v1/` stays backward compatible: no renamed templates, removed options or changed event payloads. Breaking changes start a `/v2/` folder, and apps move over when they are ready.

## Checks

```bash
npm test
```

The test serves the repo locally, opens the library home page and every demo in a headless browser at desktop and phone width, uses each template, and fails on any page error, horizontal page scroll, or a mismatch between `catalog.json` and the loader.

## Project record

Ops Room card `platform-dimau-infographics`. Read `TRACKER.md` before working here.
