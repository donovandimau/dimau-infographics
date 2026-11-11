/* Smoke test for the whole library. Run: npm test   (optional: node tests/smoke.cjs <screenshot-dir>)
 * Serves the repo on a local port, opens every page at desktop and phone width, uses each template,
 * and fails on page errors, sideways page scroll, or a catalog/loader mismatch. */
const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.argv[2] || null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.jsx': 'text/javascript' };
const failures = [];
const fail = m => { failures.push(m); console.log('  ✗ ' + m); };
const pass = m => console.log('  ✓ ' + m);

// 1. catalog.json and the loader must list the same templates, and every file must exist
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
const loader = fs.readFileSync(path.join(ROOT, 'v1/dimau-infographics.js'), 'utf8');
const react = fs.readFileSync(path.join(ROOT, 'v1/react/DimauInfographic.jsx'), 'utf8');
const loaderIds = [...loader.matchAll(/^\s{4}'?([\w-]+)'?: \{ file: '([^']+)', global: '(\w+)' \}/gm)].map(m => ({ id: m[1], file: m[2], global: m[3] }));
console.log('Catalogue');
for (const t of catalog.templates) {
  const l = loaderIds.find(x => x.id === t.id);
  if (!l) fail(t.id + ' is in catalog.json but not in the loader');
  else if (l.file !== t.file || l.global !== t.global) fail(t.id + ': loader file/global differ from catalog.json');
  if (!fs.existsSync(path.join(ROOT, 'v1', t.file))) fail(t.id + ': v1/' + t.file + ' missing');
  if (!fs.existsSync(path.join(ROOT, 'templates', t.id, 'index.html'))) fail(t.id + ': demo page missing');
  if (!react.includes("'" + t.id + "'") && !new RegExp('\\b' + t.id + ': \\(\\) => import').test(react)) fail(t.id + ': missing from the React wrapper');
}
for (const l of loaderIds) if (!catalog.templates.find(t => t.id === l.id)) fail(l.id + ' is in the loader but not in catalog.json');
if (!failures.length) pass(catalog.templates.length + ' templates agree across catalog.json, loader and React wrapper');

// 2. pages
const PAGES = [
  { url: '/', name: 'library', check: async p => {
      await p.waitForFunction(() => document.querySelectorAll('[data-di-template]').length === 11, null, { timeout: 8000 });
      return '11 live templates mounted';
  } },
  { url: '/templates/tilemap/', name: 'tilemap', check: async p => {
      if (await p.locator('.ds-hot').count() !== 15) throw new Error('expected 15 tiles');
      await p.click('.ds-hot[data-k="rewa"]');
      const n = await p.textContent('.ds-note');
      if (!/Rewa.*Central Division/.test(n) || !/Naitasiri/.test(n)) throw new Error('tile detail wrong: ' + n);
      return '15 tiles, Rewa in Central with its neighbours';
  } },
  { url: '/templates/mosaic/', name: 'mosaic', check: async p => {
      if (await p.locator('.mo-tile').count() !== 9) throw new Error('expected 9 subject blocks');
      await p.click('.mo-tile[data-k] >> nth=0');
      const n = await p.locator('.mo-tile').count();
      if (n !== 12) throw new Error('zoomed into ' + n + ' blocks, expected 12 maths courses');
      await p.keyboard.press('Escape');
      if (await p.locator('.mo-tile').count() !== 9) throw new Error('Escape did not zoom out');
      return 'zoom into Maths & Money (12 courses) and back';
  } },
  { url: '/templates/duel/', name: 'duel', check: async p => {
      const n = await p.textContent('.ds-note');
      if (!/Maths & Money<\/b>|Maths & Money/.test(n) || !/leads on/.test(n)) throw new Error('no score sentence: ' + n);
      await p.selectOption('select[data-side="b"]', 'vosa');
      if (!/Vosa Vakaviti/.test(await p.textContent('.ds-note'))) throw new Error('second side did not change');
      await p.click('[data-swap]');
      return 'score, change a side, swap';
  } },
  { url: '/templates/almanac/', name: 'almanac', check: async p => {
      const n = await p.textContent('.ds-note');
      if (!/Longest streak: \d+ days/.test(n)) throw new Error('no streak sentence: ' + n);
      await p.click('.ds-hot[data-k="2026-08-10"]');
      if (!/10 Aug 2026/.test(await p.textContent('.ds-note'))) throw new Error('day detail missing');
      return 'streak found, tap a day';
  } },
  { url: '/templates/goalmeter/', name: 'goalmeter', check: async p => {
      const n = await p.textContent('.ds-note');
      if (!/to go\./.test(n) || !/reached around/.test(n)) throw new Error('no projection: ' + n);
      await p.focus('.ds-hot[data-k="1"]'); await p.keyboard.press('Enter');
      if (!/Tank base poured.*reached/.test(await p.textContent('.ds-note'))) throw new Error('milestone status wrong');
      return 'projection, milestone reached';
  } },
  { url: '/templates/dayclock/', name: 'dayclock', check: async p => {
      await p.click('[data-d="market"]');
      await p.click('.ds-hot >> nth=3');
      const n = await p.textContent('.ds-note');
      if (!/Market.*06:00 to 14:00.*8h/.test(n)) throw new Error('slice detail wrong: ' + n);
      return 'switch day, tap a slice';
  } },
  { url: '/templates/lanternfield/', name: 'lanternfield', check: async p => {
      await p.evaluate(() => { localStorage.clear(); window.lanternfield.open('pumping'); });
      await p.waitForTimeout(900);
      const t = await p.textContent('#detail h2');
      if (t !== 'Pumping stations') throw new Error('detail panel shows ' + t);
      await p.evaluate(() => window.lanternfield.tourStart(window.CITY_DATA.tours[0]));
      await p.waitForTimeout(400);
      if (await p.isHidden('#tourcard')) throw new Error('tour card did not open');
      await p.evaluate(() => window.lanternfield.tourStop());
      return 'open topic, start tour';
  } },
  { url: '/templates/tidepool/', name: 'tidepool', check: async p => {
      const glass = p.locator('.tp-glass[aria-label="Savings"]');
      await glass.focus();
      for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowUp');
      const r = await p.evaluate(() => ({ total: window.tidepool.total(), savings: window.tidepool.items.find(i => i.id === 'savings').value, rent: window.tidepool.items.find(i => i.id === 'rent').value }));
      if (r.savings !== 80) throw new Error('savings ' + r.savings + ', expected 80');
      if (r.total !== 1110) throw new Error('total changed to ' + r.total);
      if (r.rent !== 420) throw new Error('locked rent moved to ' + r.rent);
      const story = await p.textContent('.tp-story');
      if (!/took/.test(story)) throw new Error('no trade-off sentence: ' + story);
      return 'savings +20, total kept, locked rent untouched';
  } },
  { url: '/templates/strata/', name: 'strata', check: async p => {
      await p.click('.st-band >> nth=0');
      await p.waitForTimeout(500);
      const d = await p.textContent('.st-depth');
      if (!/Level 2/.test(d)) throw new Error('depth reads ' + d);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);
      if (!/Level 1/.test(await p.textContent('.st-depth'))) throw new Error('could not climb back up');
      return 'drill down and back up';
  } },
  { url: '/templates/riverline/', name: 'riverline', check: async p => {
      await p.focus('.rl-stage canvas');
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(200);
      const on = await p.locator('.rl-card.on').count();
      if (on !== 1) throw new Error('no selected event card');
      return 'step to an event';
  } },
  { url: '/templates/archive-desk/', name: 'archive-desk', check: async p => {
      const before = await p.textContent('.ad-folio');
      await p.click('.ad-next');
      await p.waitForTimeout(1200);
      const after = await p.textContent('.ad-folio');
      if (before === after) throw new Error('page did not turn');
      await p.click('.ad-hud button[data-mode="watch"]');
      await p.waitForTimeout(400);
      if (await p.isHidden('.ad-frame')) throw new Error('lightbox did not open');
      await p.click('.ad-hud button[data-mode="read"]');
      await p.click('.ad-badge >> nth=0');
      if (await p.isHidden('.ad-card')) throw new Error('picture card did not open');
      return 'turn a page, lightbox, picture card';
  } },
  { url: '/templates/switchback/', name: 'switchback', check: async p => {
      const n = await p.locator('.sb-item').count();
      if (n < 20) throw new Error('only ' + n + ' events');
      await p.click('.tl-chip >> nth=0');
      const m = await p.locator('.sb-item').count();
      if (m >= n) throw new Error('filter did not hide anything');
      await p.click('.sb-play');
      await p.waitForTimeout(300);
      if (await p.locator('.sb-item.on').count() !== 1) throw new Error('story mode did not open an event');
      await p.click('.sb-play');
      return n + ' events, filter, story mode';
  } },
  { url: '/templates/swimlane/', name: 'swimlane', check: async p => {
      await p.click('.sl-stage .ev >> nth=0');
      if (await p.isHidden('.sl-detail')) throw new Error('detail panel did not open');
      const before = await p.evaluate(() => window.timeline.view.slice());
      await p.click('[data-z="in"]');
      const after = await p.evaluate(() => window.timeline.view.slice());
      if (!(after[1] - after[0] < before[1] - before[0])) throw new Error('zoom did not narrow the view');
      await p.click('.sl-detail [data-n="1"]');
      return 'open detail, zoom, next';
  } },
  { url: '/templates/roadmap/', name: 'roadmap', check: async p => {
      const before = await p.evaluate(() => window.timeline._finish());
      // three weeks is more than the plan's slack, so the finish must move
      await p.focus('.rm-bar[data-id="data"]');
      for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight');
      const after = await p.evaluate(() => window.timeline._finish());
      if (!(after > before)) throw new Error('finish did not move after slipping a task on the critical path');
      const msg = await p.textContent('.rm-msg');
      if (!/moves the finish/.test(msg)) throw new Error('no plain-language result: ' + msg);
      return 'slip a task, dependants and finish move';
  } },
  { url: '/templates/waypath/', name: 'waypath', check: async p => {
      await p.click('.wp-stop >> nth=2');
      if (!/Stop 3 of 6/.test(await p.textContent('.wp-card'))) throw new Error('stop 3 did not open');
      for (const s of ['cycle', 'steps', 'road']) { await p.click('[data-s="' + s + '"]'); if (await p.locator('.wp-stop').count() !== 6) throw new Error(s + ' lost stops'); }
      return 'reveal a stop, three shapes';
  } },
  { url: '/templates/rankrace/', name: 'rankrace', check: async p => {
      await p.evaluate(() => window.timeline.seek(7));
      const note = await p.textContent('.rr-note');
      if (!/leads in Week 8/.test(note)) throw new Error('no leader sentence: ' + note);
      const first = await p.evaluate(() => [...document.querySelectorAll('.rr-row')].find(r => r.style.transform === 'translateY(0px)').textContent);
      if (!/Yaqona/.test(first)) throw new Error('wrong leader at the end: ' + first);
      await p.click('.rr-play'); await p.waitForTimeout(300); await p.click('.rr-play');
      return 'scrub to the end, leader correct, play/pause';
  } },
  { url: '/templates/peoplegrid/', name: 'peoplegrid', check: async p => {
      const n = await p.locator('.pg-u').count();
      if (n !== 109) throw new Error(n + ' squares, expected 109');
      const before = await p.evaluate(() => document.querySelectorAll('.pg-u')[108].style.transform);
      await p.click('[data-v="bars"]');
      const after = await p.evaluate(() => document.querySelectorAll('.pg-u')[108].style.transform);
      if (before === after) throw new Error('squares did not move');
      await p.click('.pg-key[data-g="maths"]');
      if (!/36 chapters/.test(await p.textContent('.pg-note'))) throw new Error('maths share sentence missing');
      return '109 squares regroup, highlight a group';
  } },
  { url: '/templates/guessline/', name: 'guessline', check: async p => {
      const b = await p.locator('.gl-svg').boundingBox();
      await p.mouse.move(b.x + b.width * 0.4, b.y + b.height * 0.6);
      await p.mouse.down();
      for (let k = 1; k <= 12; k++) await p.mouse.move(b.x + b.width * (0.4 + 0.6 * k / 12), b.y + b.height * (0.6 - 0.35 * k / 12));
      await p.mouse.up();
      if (await p.isDisabled('.gl-show')) throw new Error('drawing did not complete the guess');
      await p.click('.gl-show');
      await p.waitForFunction(() => /Score/.test(document.querySelector('.gl-note').textContent), null, { timeout: 4000 });
      return 'draw a guess, reveal, score';
  } },
  { url: '/templates/flowbank/', name: 'flowbank', check: async p => {
      const n = await p.locator('.fb-link').count();
      if (n !== 9) throw new Error(n + ' flows, expected 9');
      await p.focus('.fb-node[data-i="0"]'); await p.keyboard.press('Enter');
      if (!/Biggest share goes to/.test(await p.textContent('.fb-note'))) throw new Error('node sentence missing');
      return '9 flows, follow a node';
  } },
  { url: '/templates/ledger/', name: 'ledger', check: async p => {
      if (await p.locator('tr.lg-row').count() !== 40) throw new Error('expected 40 courses');
      await p.fill('.lg-tools input', 'money');
      const m = await p.locator('tr.lg-row').count();
      if (m < 2 || m >= 40) throw new Error('search returned ' + m);
      await p.click('tr.lg-row >> nth=0');
      if (await p.locator('tr.lg-detail').count() !== 1) throw new Error('row did not open');
      await p.click('th button[data-c="course"]');
      return 'search, open a row, sort';
  } },
  { url: '/templates/storyscroll/', name: 'storyscroll', check: async p => {
      await p.locator('.ss-step[data-i="1"]').scrollIntoViewIfNeeded();
      await p.evaluate(() => document.querySelector('.ss-step[data-i="1"]').scrollIntoView({ block: 'center' }));
      await p.waitForFunction(() => document.querySelector('.ss-step.on') && +document.querySelector('.ss-step.on').dataset.i === 1, null, { timeout: 4000 });
      const first = await p.evaluate(() => document.querySelector('.ss-graphic svg text').childNodes[0].nodeValue);
      if (first !== 'Maths & Money') throw new Error('chart not re-sorted for step 2: ' + first);
      return 'scroll to step 2, chart re-sorts';
  } },
  ...['rbf-sandbox-settlement-flow', 'sota-kece-community-pulse', 'pacific-backhaul-node-map', 'debt-freedom-trajectory'].map(id => ({
    url: '/templates/' + id + '/', name: id, check: async p => {
      await p.waitForSelector('#stage svg');
      const first = (await p.$$('#fields input'))[0];
      await first.fill('Test value 4321');
      await p.waitForFunction(() => document.querySelector('#stage svg').textContent.includes('4321'), null, { timeout: 4000 });
      await p.click('#theme [data-v="light"]');
      const bg = await p.evaluate(() => document.querySelector('#stage svg rect').getAttribute('fill'));
      if (bg !== '#F8FAFC') throw new Error('light theme not applied: ' + bg);
      await p.click('#variant [data-v="card"]');
      const vb = await p.evaluate(() => document.querySelector('#stage svg').getAttribute('viewBox'));
      if (vb !== '0 0 1200 630') throw new Error('share card viewBox ' + vb);
      const size = await p.evaluate(() => window.card.toPNG({ scale: 1 }).then(b => b.size));
      if (size < 5000) throw new Error('PNG export too small: ' + size);
      return 'edit value, light theme, share card, PNG ' + Math.round(size / 1024) + ' KB';
    }
  }))
];

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  for (const vp of [{ name: 'desktop', width: 1360, height: 860 }, { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true }]) {
    console.log('\n' + vp.name);
    for (const pg of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(m.text()); });
      // outside services (fonts, shared Dimau footer, Workbox) are not needed for these checks
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      try {
        await p.goto(base + pg.url, { waitUntil: 'load' });
        await p.waitForTimeout(700);
        const what = await pg.check(p);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 1) throw new Error('page scrolls sideways by ' + over + 'px');
        if (errs.length) throw new Error('page errors: ' + errs.join(' | '));
        pass(pg.name + ': ' + what);
        if (SHOTS) await p.screenshot({ path: path.join(SHOTS, vp.name + '-' + pg.name + '.png'), fullPage: vp.name === 'phone' });
      } catch (e) {
        fail(pg.name + ' (' + vp.name + '): ' + e.message);
      }
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
  console.log(failures.length ? '\n' + failures.length + ' check(s) failed' : '\nAll checks passed');
  process.exit(failures.length ? 1 : 0);
})();
