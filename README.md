# Infographics Fiji (dimau-infographics)

Two things live in this repo:

1. **Infographics Fiji** — a template registry, visual studio and render API. Apps ask for a template by its slug, send their own numbers, and get back an SVG or PNG.
2. **The v1 interactive library** — the four explorable templates below, loaded with one script. Unchanged; still served from `/v1/`.

## Render API (v1)

| Call | What it does |
|---|---|
| `GET /api/v1/templates` | Public template catalogue with variable definitions |
| `GET /api/v1/templates/<slug>` | Raw template (antv options, variables, theme tokens) for client-side rendering |
| `GET /api/v1/render/<slug>?<var>=<value>&format=png&theme=dark&variant=card` | Public, cacheable image for `<img src>` and link previews (public templates only) |
| `POST /api/v1/render/<slug>` + header `x-api-key` | `{ "data": {...}, "format": "svg"\|"png", "theme": "dark"\|"light", "variant"?: "main"\|"card" }` — keyed render, works for private templates |
| `GET /api/v1/sdk` | Live typed client file covering every public template |

Variables left out fall back to their defaults. A wrong type returns 422 naming the field.

```ts
import { getInfographicUrl } from '@/lib/infographics-fiji'; // synced into each app by .github/workflows/sync-sdk.yml
const url = getInfographicUrl('debt-freedom-trajectory', { months_shaved: '24 Months Faster' }, { format: 'png' });
```

## Run it

```bash
npm install
cp .env.example .env.local   # all optional: with no database it serves the four starter templates
npm run dev                  # /vault, /studio/<slug>, /api/v1/...
npm test                     # v1 library smoke test + server render tests
```

Database: run `supabase/migrations/001_infographics_fiji.sql`, then `supabase/seed.sql` (generated from `src/lib/starter-templates.ts`; regenerate with `npm run build:seed`).

---

# Dimau Infographics v1 library

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
| **Factwall** | Headline numbers | Impact reports, “at a glance” panels | Numbers count up when seen, shares as ten dots, detail and source on tap |
| **Swarm** | Spread | Scores, prices, waiting times | One dot per item on one scale, split by group, medians and a marker line |
| **Scatter** | Links | Distance against price, hours against results | Dots sized by a third measure, trend line and strength of the link in words |
| **Heatgrid** | Patterns in a table | Use by day and hour, sales by month | Cells coloured by size, row totals, sort, arrow keys between cells |
| **Bridge** | Start to finish | Budgets, profit, stock over a year | Waterfall with running totals; step through one bar at a time |
| **Overlap** | Groups | Survey answers, customers of several services | Venn diagram of two or three groups; tap any region |
| **Flashdeck** | Learn by recall | Vocabulary, key terms | Flip cards, mark known, practise only the rest, progress saved |
| **Quizline** | Check knowledge | Lesson checks, training | One question at a time, explanation after every answer, score with what to review |
| **Hotspot** | Parts of a whole | How a system or machine works | Numbered points on any drawing, tour from part to part |
| **Checklist** | Steps to do | Setup guides, applications | Real checkboxes, next step highlighted, time left, progress saved |
| **Scaleup** | Sizes | Budgets, areas, catalogues | Circles with area to scale; pick two to see how many times bigger |
| **Sorter** | Classify | Sorting exercises | Tap-then-tap or drag into groups, check answers, why each wrong one is wrong |
| **Loanpath** | Loans | Personal loans, hire purchase, fees on credit | Sliders, monthly payment, total interest, what paying extra saves |
| **Savegrow** | Savings | Savings goals, funds, savings groups | Deposits and interest shown apart, when a goal is reached |
| **Countdown** | Time left | Exams, launches, deadlines | Days and weeks left, how far through, milestones; updates every minute |
| **Pollbar** | A poll | Community choices, feedback | Vote, change or take back; the app saves the vote from the `vote` event |
| **Rankit** | Priorities | “What matters most”, workshops | Drag or arrow buttons to order, then compare with the group |
| **Opinion** | Agree or disagree | Surveys, consultations, course reviews | Bars centred on neutral, sort by net agreement, full split on tap |
| **Dial** | A reading | Tank levels, stock, budgets used | Gauge with coloured zones and advice, target mark, history; `setValue()` for live readings |
| **Statusboard** | Is it working? | Service status, water or power supply | Working, slow or down per day, uptime, notes on bad days, arrow keys |
| **Sparkgrid** | Many trends | Prices, sales by product, attendance | Small lines with change in words, sort by rise or fall, same scale on request |
| **Treeline** | A big list in branches | Site maps, catalogues, org charts | Open and close, counts, search with highlights, full ARIA tree keys |
| **Monthview** | Events | Community events, timetables | Month grid, events coloured by kind, tap a day, dots on phones |
| **Slotgrid** | Bookings | Appointments, rooms, seats | Free, booked and closed in words and pattern; pick and book |
| **Stackbar** | Composition | Budgets by category, courses by length | 100% bars or numbers, sort by any part, tap a piece |
| **Featuregrid** | Feature comparison | Plans, products, services | Yes/no/partly in words, show only the differences, pick an option |
| **Ringflow** | Flows between groups | Migration, trade, transfers | Chord diagram; tap a group to follow its flows |
| **Bumpline** | Rankings over time | League tables, bestsellers | Crossing lines, ranks worked out from values, follow one line |
| **Spiral** | Seasons | Rainfall, sales, visitors | One turn a year; compare one month across the years |
| **Streamgraph** | Layers over time | Topics, product lines, how a collection grew | Stream or stacked, follow one layer |
| **Weighscore** | Decisions | Choosing a plan, supplier, school or site | A slider per criterion, live re-ranking, scores made of coloured parts |
| **Routeline** | A route | Bus and ferry runs, delivery rounds | Stops and times, where it is now, minutes to each stop |
| **Levelup** | Levels | Learning apps, loyalty, training paths | You are here, progress to the next level, what each unlocks |
| **Orgchart** | Teams | Committees, organisations, clubs | Boxes and connectors, open and close teams, outline when space is short |
| **Numberline** | Magnitudes | Prices, budgets, populations | Even steps per ×10 or true to scale, how many times bigger |
| **Glossary** | Terms | Course glossaries, policy and app help | Search with highlights, A–Z jump, see-also links |
| **Beforeafter** | Before and after | Then-and-now photos, old and new designs | Drag, tap or arrow keys between two pictures; a real slider for screen readers |
| **Slidestory** | A story in steps | Onboarding, how it works, key points | One card at a time, swipe or arrow keys, play and pause |
| **Verdict** | True or false | Myth-busting, training | Guess true, false or partly, then the answer and why, with a score |
| **Annotline** | A chart with notes | Reports, project histories | Numbered notes on a line chart; step through or tap |
| **Liveticker** | A rate made real | Births, rainfall, spending, distance | Counters running from page open, with rates and sources |
| **Flowchart** | A process with decisions | Applications, approvals, procedures | Steps and diamonds, ways in and out of each box, walk the main path |
| **Daylight** | Sunrise and sunset | Farming and fishing calendars, event planning | Daylight band across a year worked out from the sun, tap or arrow keys for any day, longest and shortest day |
| **Moonmonth** | Moon phases | Fishing and planting calendars, night events | Month calendar with a drawn moon each day (north or south of the equator), new and full moon times, % lit |
| **Windrose** | Wind directions | Weather pages, sailing, farm and building plans | Petals by direction split by speed, tap for the breakdown |
| **Reachrings** | What is near | Services near a village, delivery areas | Distance rings and compass, within-reach slider, counts by group, labels that never overlap |
| **Profileline** | A route's ups and downs | Walks, cycle routes, road plans | Drag or arrow keys along the route for height, climb so far and distance left |
| **Floorplan** | Finding a room | Clinics, schools, venues | Search or tap, colour by room type, which way from "you are here" |
| **Histobins** | How values spread | Ages, prices, scores, waiting times | Slider for the ranges, tap a bar for what is in it, median and average marked |
| **Boxplot** | Groups side by side | Scores by school, prices by town | Box, whiskers and median, unusual values named, show every point, sort by median |
| **Dumbbell** | Two values per row | Before and after, this year and last | Ups and downs coloured, sort four ways, better can be up or down |
| **Bulletbar** | Against a target | Monthly reports, service standards | Result, target and poor-to-good bands in one line, percent of target |
| **Ridgeline** | Shapes compared | Waiting times by day, temperatures by month | Smoothed shape per group, read every group at one value |
| **Marimekko** | Shares two ways | Market shares by region, transport by district | Width and height both mean something, three shares for any block, highlight one part |
| **Sunburst** | Rings to zoom into | Budgets, catalogues, course structures | Up to three rings, zoom in and back up, breadcrumbs, shares of the part and the whole |
| **Circlepack** | Circles inside circles | Sizes within groups: spending, files, populations | Circles packed by size, zoom in and back up, breadcrumbs |
| **Icicle** | Blocks left to right | Course outlines, budgets, site sections | Three levels at a time, names and amounts on blocks, zoom and breadcrumbs |
| **Arcflow** | Links as arcs | Routes, trade, who works with whom | Arc thickness by amount, one item's links, sort four ways |
| **Linkmatrix** | Who links to whom | Messages between teams, trade between places | Shaded grid, one way or both ways, arrow keys across cells, sort |
| **Lifespans** | Who overlapped | History, terms of office, project periods | Year slider with ages, overlaps for any bar, show or hide groups |
| **Bubbletrail** | Bubbles through the years | Development indicators, products, regions over time | Play and pause, bubbles glide between years, trail for any bubble, optional ×10 scale |
| **Fanchart** | A forecast with its ranges | Savings, budgets, visitor and demand forecasts | Even-chance and 9-in-10 ranges, when a goal is most likely reached, drag or arrow keys |
| **Rangebars** | Low to high | Temperatures, prices through the day, waiting times | Floating bars with averages, widest and narrowest spread in words |
| **Pareto** | The few that matter most | Complaints by cause, sales by product, costs | Sorted bars with a running total, share slider, the few named |
| **Parallelaxes** | Many measures at once | Choosing plans, products, sites or suppliers | Better always at the top, keep the better half on any measure, ranks |
| **Radialbars** | Bars around a circle | Many categories in a small space | Sort by size or name, total in the middle, share and rank |
| **Wordbars** | The words used most | Survey comments, feedback, reports | Hide common words, search, examples of a word in use |
| **Tagcloud** | A word cloud | Open answers, topics, tags | Size by count, packed without overlaps, count and rank on tap |
| **Wordtree** | What follows a word | Open answers, interviews, policies | Branches three words deep, follow a phrase, back, any start word |
| **Textdiff** | What changed | Policy updates, draft and final notices | Phrase-level changes, marked or side by side, step through |
| **Readscore** | How easy to read | Notices, letters, help pages, lessons | Reading ease as you type, words per sentence, longest sentences |
| **Keyline** | Every use of a word | Checking how a term is used | Lined up on the word, sort by the word before or after, full line on tap |
| **Worldclock** | Time zones | Calling family overseas, meetings across countries | Live local times on one 24-hour line, shared working hours in words, line up on any place |
| **Lifegrid** | A life in months | Pensions, health and education talks, long plans | One square per month, stages coloured, filled to today |
| **Settleup** | Who owes whom | Group trips, shared houses, clubs | Fewest payments to settle, costs shared by some, tick costs on and off |
| **Unitprice** | Best value | Shopping guides, budgeting lessons | Price per kilo, litre or item, units converted, cost for the amount you need |
| **Seatarc** | Seats and majorities | Councils, boards, election results | Seats in a half circle, build a group, majority or seats short |
| **Leaderboard** | Standings | Quizzes, competitions, fundraising | Round slider, rows slide to new places, ups and downs, places so far |
| **Cohortgrid** | Who stays | Members, learners, repeat customers | Shade by share still active, percent or people, compared with the average, arrow keys |
| **Burndown** | Work left | Projects, sprints, deadlines | Plan line, finish date at the recent pace, ahead or behind on any day |
| **Controlchart** | Normal or unusual | Waiting times, defects, daily sales | Usual range from the data, three common rules, reasons in words |
| **Cumflow** | Work in each stage | Help desks, approvals, orders | Stacked stages, work in progress, time to finish on any day |
| **Kpitiles** | Headline numbers | Dashboards, reports, app home screens | Change in amount and percent, good or bad by direction, targets, trend |
| **Abtest** | Which version works better | Messages, posters, prices, page designs | Rates with 95% ranges, chance one is better, visitors still needed |
| **Donut** | Parts of a whole | Budgets, survey answers, income sources | Shares on the ring, hide parts, total or share in the middle, table view |
| **Barchart** | Bars | Amounts across groups, places, years | Side by side or stacked, largest first, sideways for long labels, table view |
| **Linechart** | Lines over time | Prices, temperatures, visitors | Names at line ends, read every line at one point, gaps allowed, table view |
| **Areachart** | Piled-up amounts | Spending by category, students by level | Totals or shares of 100%, read any point, table view |
| **Combochart** | Bars and a line | Rain and temperature, sales and margin | Two scales coloured to match, whether they move together, table view |
| **Waffle** | 100 squares | Survey results, pass rates, budget shares | Fair rounding to 100, "1 in N" in words, table view |
| **Matchup** | Match the pairs | Words and meanings, places and capitals | Tap one on each side, right matches lock in, misses counted |
| **Sequence** | Put in order | History, process steps, life cycles | Up and down buttons, check any time, dates after checking, show the answer |
| **Fillgap** | Fill the gaps | Reading, key terms, safety and money lessons | Choices per gap, hints after checking, plain dropdowns |
| **Estimator** | Guess a number | Distances, populations, prices | Slider guess, guess and answer side by side, points for closeness, sources |
| **Masterygrid** | Who needs help | Teachers and trainers planning groups | Learners by skills, who else needs the same help, filter and sort, arrow keys |
| **Leitner** | Flash cards in boxes | Vocabulary, facts, road signs | Flip, knew it or not, hard cards come round sooner |
| **Paysplit** | Where pay goes | Payslip explainers, budgeting lessons | Per week, fortnight, month or year; amounts or percentages; shortfall warning |
| **Budgetplan** | Needs, wants, savings | Budgeting lessons, family money talks | Editable amounts, shares against the plan, over or short in words |
| **Debtplan** | Clearing debts | Debt advice, credit unions | Smallest-first and highest-interest-first worked out month by month, extra payment slider |
| **Sendmoney** | Sending money home | Remittance comparisons, family apps | Amount arriving per provider, fee and rate losses split out, any amount |
| **Cashcalendar** | The month ahead | Planning around paydays and bills | Day-by-day balance, lowest point, below-zero warning, bills on and off |
| **Pricerise** | Rising prices | Savings talks, school economics | What money buys, what is needed to keep up, doubling time |
| **Tidecurve** | Tides | Fishing, reef walks, boat landings | Height at any time, next high, times below a chosen height, arrow keys |
| **Warmstripes** | Each year against the average | Climate pages, school science, covers | Stripes or bars, any base period, warmest and coolest, each year ranked |
| **Stormtrack** | Storm paths | Cyclone season pages, after-storm reports | Category colours, forecast dashed, play and slider, closest pass to each place |
| **Uvday** | Sunburn risk | Health, school and outdoor pages | Clear-sky UV index from the sun's height, any place and day, when it is 3 or more |
| **Feelslike** | Heat and humidity | Heat warnings, outdoor work and sport | Heat index on a grid of risk levels, sliders and saved readings |
| **Forecastrow** | The days ahead | Town pages, events, farming | Low to high on one scale, chance of rain, warmest, wettest and driest |
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
v1/insight.js                Factwall, Swarm, Scatter, Heatgrid, Bridge, Overlap (insight)
v1/learn.js                  Flashdeck, Quizline, Hotspot, Checklist, Scaleup, Sorter (learn)
v1/plan.js                   Loanpath, Savegrow, Countdown, Pollbar, Rankit, Opinion (plan and ask)
v1/track.js                  Dial, Statusboard, Sparkgrid, Treeline, Monthview, Slotgrid (track)
v1/chartbook.js              Stackbar, Featuregrid, Ringflow, Bumpline, Spiral, Streamgraph (chartbook)
v1/guides.js                 Weighscore, Routeline, Levelup, Orgchart, Numberline, Glossary (guides)
v1/stories.js                Beforeafter, Slidestory, Verdict, Annotline, Liveticker, Flowchart (stories, with Archive Desk)
v1/places.js                 Daylight, Moonmonth, Windrose, Reachrings, Profileline, Floorplan (places)
v1/stats.js                  Histobins, Boxplot, Dumbbell, Bulletbar, Ridgeline, Marimekko (stats)
v1/structure.js              Sunburst, Circlepack, Icicle, Arcflow, Linkmatrix, Lifespans (structure)
v1/analyse.js                Bubbletrail, Fanchart, Rangebars, Pareto, Parallelaxes, Radialbars (analyse)
v1/words.js                  Wordbars, Tagcloud, Wordtree, Textdiff, Readscore, Keyline (words)
v1/tools.js                  Worldclock, Lifegrid, Settleup, Unitprice, Seatarc, Leaderboard (tools)
v1/metrics.js                Cohortgrid, Burndown, Controlchart, Cumflow, Kpitiles, Abtest (metrics)
v1/basics.js                 Donut, Barchart, Linechart, Areachart, Combochart, Waffle (basics)
v1/practice.js               Matchup, Sequence, Fillgap, Estimator, Masterygrid, Leitner (practice)
v1/money.js                  Paysplit, Budgetplan, Debtplan, Sendmoney, Cashcalendar, Pricerise (money)
v1/weather.js                Tidecurve, Warmstripes, Stormtrack, Uvday, Feelslike, Forecastrow (weather)
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
