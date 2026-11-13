# Adding a template

A template earns a place here when it handles a shape of information the library doesn't cover yet, or covers an existing shape in a clearly different way. Each one should have at least one interaction that isn't a stock chart.

## The contract every template follows

- **One file** at `v1/<id>.js`, no dependencies, UMD style: it defines `window.<Global>` in a browser and `module.exports` under CommonJS.
- **Constructor:** `new Global(element, data, options)`. It renders into `element` and never touches the rest of the page.
- **Events:** `on(type, fn)` and `off(type, fn)`. Payloads are plain objects. Document every event in `catalog.json`.
- **Cleanup:** `destroy()` removes listeners, observers and markup.
- **Optional:** `getState()` / `setState(state)` with `{ v: 1, … }` if the reader's progress is worth keeping. The React wrapper's `persistKey` uses them.
- **Theme:** read colours and fonts from the shared `--di-*` tokens (`--di-bg`, `--di-surface`, `--di-fg`, `--di-muted`, `--di-line`, `--di-accent`, `--di-font`, `--di-display`, `--di-mono`, `--di-c-<categoryId>`), with sensible fallbacks. Inject your own CSS once, under a prefix unique to the template.
- **Access:** works with a keyboard, has visible focus, respects `prefers-reduced-motion`, and works at phone width (about 390px) without making the page scroll sideways.
- **Plain language:** messages say what happened in everyday words.

## Steps

1. Build `v1/<id>.js` to the contract above.
2. Add sample data at `templates/<id>/sample-data.js`. Say in the first line whether it is real (with source and date) or illustrative.
3. Add a demo page at `templates/<id>/index.html`. Copy an existing one; the "Use it in an app" panel fills itself from `catalog.json`.
4. Add the template to `catalog.json`, the `TEMPLATES` map in `v1/dimau-infographics.js`, the `LOADERS` map in `v1/react/DimauInfographic.jsx`, the site navigation, and a card on `index.html`.
5. Keep the CSS in one `const STYLE = `...`` string added once as `<style id="<prefix>-style">`, then run `node scripts/build-css.cjs` to write `v1/<file>.css` and add the file and its id to `STYLE_IDS` in the loader. This is what lets apps with a strict style policy use it (see README, "Strict style policies").
6. Add it to `PAGES` in `tests/smoke.cjs` with one interaction, then run `npm test`.
7. Update `TRACKER.md` and open a pull request.
