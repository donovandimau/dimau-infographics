# Dimau Infographics

Live: https://dimau-infographics.vercel.app/

The central library of interactive infographic templates for every Dimau app. Each app loads one shared script, picks the template that fits the shape of its information, and supplies its own data and colours. Nothing is copied into app repos, so a fix here reaches every app.

| Template | Shape of information | Best for | Original mechanics |
|---|---|---|---|
| **Lanternfield** | Connections | Many linked topics: systems, ecosystems, product maps | Leashed lantern lens, rim compass, fog of discovery, pins and bridges, guided tours, saved exploration |
| **Tidepool** | Amounts | Budgets, allocations, trade-offs | Communicating vessels with flow through pipes, locks, a plain-language trade-off sentence |
| **Strata** | Levels | Catalogues, curricula, categories, organisations | Core-sample layers sized by value, x-ray strip previews, pull-out drilling, depth gauge |
| **Riverline** | Time | Histories, project timelines, logs | River that widens with activity, magnifying current, lanes, reading strip |

The library site shows every template live with sample data, and each template has a full demo page with its data shape, events and embed code.

## Use a template in an app

```html
<div id="explore" style="min-height:480px"></div>
<script src="https://dimau-infographics.vercel.app/v1/dimau-infographics.js"></script>
<script>
  DimauInfographics.mount('#explore', {
    template: 'tidepool',          // lanternfield | tidepool | strata | riverline
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
v1/<template>.js             the templates; each is self-contained, no dependencies
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
