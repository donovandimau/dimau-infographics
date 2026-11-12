/* Smoke test for the whole library. Run: npm test   (optional: node tests/smoke.cjs <screenshot-dir>)
 * Serves the repo on a local port, opens every page at desktop and phone width, uses each template,
 * and fails on page errors, sideways page scroll, or a catalog/loader mismatch. */
const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '../public');
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
      await p.waitForFunction(() => document.querySelectorAll('[data-di-template]').length === 29, null, { timeout: 8000 });
      return '29 live templates mounted';
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
  { url: '/templates/dropoff/', name: 'dropoff', check: async p => {
      const n = await p.textContent('.dk-note');
      if (!/13% made it/.test(n) || !/between “Took a first lesson” and “Came back the next week”: 48% left/.test(n)) throw new Error('summary wrong: ' + n);
      await p.click('.dk-hot[data-k="2"]');
      if (!/Confirmed their phone number: 4,100, which is 41%.*2,100 \(34%\) dropped off/.test(await p.textContent('.dk-note'))) throw new Error('step detail wrong');
      return 'biggest drop found, tap a step';
  } },
  { url: '/templates/quadrant/', name: 'quadrant', check: async p => {
      if (await p.locator('.dk-hot').count() !== 10) throw new Error('expected 10 ideas');
      if (!/Quick wins: 4/.test(await p.textContent('.dk-legend'))) throw new Error('quick wins count wrong');
      await p.focus('.dk-hot[data-k="0"]');
      for (let i = 0; i < 7; i++) await p.keyboard.press('ArrowRight');
      if (!/Gutters on the hall is in Big projects/.test(await p.textContent('.dk-note'))) throw new Error('arrow keys did not move it');
      const dot = await p.locator('.dk-hot[data-k="7"] circle >> nth=0').boundingBox(), box = await p.locator('.dk svg').boundingBox();
      await p.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2); await p.mouse.down();
      await p.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.2, { steps: 6 }); await p.mouse.up();
      if (!/Kava drying racks is in Quick wins/.test(await p.textContent('.dk-note'))) throw new Error('drag did not move it: ' + await p.textContent('.dk-note'));
      const st = await p.evaluate(() => window.timeline.getState().items.find(i => i.id === 'racks'));
      if (!(st.y > 5)) throw new Error('state not updated');
      return 'counts, arrow keys, drag, state';
  } },
  { url: '/templates/slope/', name: 'slope', check: async p => {
      const n = await p.textContent('.dk-note');
      if (!/4 of 8 went up, 3 went down/.test(n) || !/Biggest rise: Breadfruit/.test(n) || !/Biggest fall: Tomatoes/.test(n)) throw new Error('summary wrong: ' + n);
      await p.click('[data-f="down"]');
      await p.focus('.dk-hot[data-k="2"]'); await p.keyboard.press('Enter');
      if (!/Tomatoes went from \$6 to \$3: down \$3 \(−50%\)/.test(await p.textContent('.dk-note'))) throw new Error('line detail wrong: ' + await p.textContent('.dk-note'));
      return 'summary, filter, line detail';
  } },
  { url: '/templates/pathfinder/', name: 'pathfinder', check: async p => {
      await p.click('[data-opt="5"]'); await p.click('[data-opt="1"]'); await p.click('[data-opt="1"]');
      if ((await p.textContent('.pf-result')) !== 'Radar') throw new Error('expected Radar, got ' + await p.textContent('.pf-result'));
      if (await p.locator('.pf-trail button').count() !== 3) throw new Error('trail should list 3 answers');
      await p.click('[data-back="1"]');
      if (!/How are you comparing\?/.test(await p.textContent('.pf-q'))) throw new Error('going back failed');
      await p.click('[data-restart]');
      if (!/mainly about/.test(await p.textContent('.pf-q'))) throw new Error('start again failed');
      await p.click('[data-help]');
      if (await p.isHidden('.pf-pop')) throw new Error('help pop-up did not open');
      return 'three answers to Radar, change an answer, start again, help pop-up';
  } },
  { url: '/templates/radar/', name: 'radar', check: async p => {
      if (await p.locator('[data-s]').count() !== 5) throw new Error('expected 5 subjects');
      if (!/strongest on/.test(await p.textContent('.dk-note'))) throw new Error('no summary');
      await p.click('[data-s="english"]');
      if ((await p.getAttribute('[data-s="english"]', 'aria-pressed')) !== 'true') throw new Error('toggle failed');
      await p.focus('.dk-hot[data-k="0"]'); await p.keyboard.press('Enter');
      if (!/Courses: Maths & Money 12, Coding & AI 7, English 4/.test(await p.textContent('.dk-note'))) throw new Error('axis ranking wrong: ' + await p.textContent('.dk-note'));
      return 'switch a profile on, rank on a measure';
  } },
  { url: '/templates/pyramid/', name: 'pyramid', check: async p => {
      if (await p.locator('.dk-hot').count() !== 16) throw new Error('expected 16 age groups');
      if (!/Women 31,050/.test(await p.textContent('.dk-note'))) throw new Error('totals wrong: ' + await p.textContent('.dk-note'));
      await p.click('[data-m="share"]');
      await p.focus('.dk-hot[data-k="15"]'); await p.keyboard.press('Enter');
      if (!/Age 0–4: Women 4\.\d%, Men 4\.\d%/.test(await p.textContent('.dk-note'))) throw new Error('row detail wrong: ' + await p.textContent('.dk-note'));
      return 'totals, share mode, row detail';
  } },
  { url: '/templates/factwall/', name: 'factwall', check: async p => {
      if (await p.locator('.fw-card').count() !== 6) throw new Error('expected 6 facts');
      for (const id of ['courses', 'per', 'maths']) { await p.locator('.fw-card[data-id="' + id + '"]').scrollIntoViewIfNeeded(); await p.waitForTimeout(150); }
      await p.waitForTimeout(1200);
      const v = await p.evaluate(() => ['courses', 'per', 'maths'].map(id => document.querySelector('.fw-card[data-id="' + id + '"] .fw-num').textContent));
      if (v.join('|') !== '40|2.7|30%') throw new Error('numbers did not finish counting: ' + v.join('|'));
      await p.click('.fw-card[data-id="chapters"]');
      if ((await p.getAttribute('.fw-card[data-id="chapters"]', 'aria-expanded')) !== 'true' || !/Source: FijiLearn/.test(await p.textContent('.fw-card[data-id="chapters"] .fw-more'))) throw new Error('detail did not open');
      return 'count up to the real figures, open a source';
  } },
  { url: '/templates/swarm/', name: 'swarm', check: async p => {
      if (await p.locator('.dn-hot').count() !== 84) throw new Error('expected 84 dots');
      if (!/71 of 84 are at or above the pass mark/.test(await p.textContent('.dn-note'))) throw new Error('marker count wrong: ' + await p.textContent('.dn-note'));
      await p.click('[data-l="all"]');
      await p.focus('.dn-hot[data-k="0"]'); await p.keyboard.press('Enter');
      if (!/Student A1 \(Class 9A\): \d+\. Number \d+ of 84/.test(await p.textContent('.dn-note'))) throw new Error('dot detail wrong: ' + await p.textContent('.dn-note'));
      return 'pass-mark count, all together, dot rank';
  } },
  { url: '/templates/scatter/', name: 'scatter', check: async p => {
      if (!/a strong link: as distance to town goes up, weekly income tends to go down \(r = −0\.87\)/.test(await p.textContent('.dn-note'))) throw new Error('link sentence wrong: ' + await p.textContent('.dn-note'));
      await p.click('[data-g="boat"]');
      if (await p.locator('.dn-hot').count() !== 16) throw new Error('hiding boat villages failed');
      await p.click('[data-t]');
      await p.focus('.dn-hot >> nth=0'); await p.keyboard.press('Enter');
      if (!/Village [A-X]: Distance to town \d+ km, Weekly income \$\d+/.test(await p.textContent('.dn-note'))) throw new Error('dot detail wrong');
      return 'strength in words, hide a group, dot detail';
  } },
  { url: '/templates/heatgrid/', name: 'heatgrid', check: async p => {
      if (await p.locator('.dn-hot').count() !== 126) throw new Error('expected 126 cells');
      await p.focus('.dn-hot[tabindex="0"]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');
      if (!/Tue, 06:00: 20, /.test(await p.textContent('.dn-note'))) throw new Error('arrow keys did not move: ' + await p.textContent('.dn-note'));
      await p.click('[data-s="total"]');
      if ((await p.getAttribute('[data-s="total"]', 'aria-pressed')) !== 'true') throw new Error('sort failed');
      return 'arrow keys between cells, sort rows';
  } },
  { url: '/templates/bridge/', name: 'bridge', check: async p => {
      const n = await p.textContent('.dn-note');
      if (!/From \$640 to \$1,039: \+\$399 overall/.test(n) || !/Biggest addition: Wages/.test(n) || !/Biggest cost: Food/.test(n)) throw new Error('summary wrong: ' + n);
      await p.click('[data-play]'); await p.click('[data-play]');
      if (!/Wages: \+\$1,480, taking the running total from \$640 to \$2,120/.test(await p.textContent('.dn-note'))) throw new Error('step through wrong: ' + await p.textContent('.dn-note'));
      return 'summary, step through';
  } },
  { url: '/templates/overlap/', name: 'overlap', check: async p => {
      if (await p.locator('[data-r]').count() !== 8) throw new Error('expected 8 regions');
      if (!/28 \(7%\) are in all three/.test(await p.textContent('.dn-note'))) throw new Error('summary wrong');
      await p.click('[data-r="wallet&card"]');
      if (!/Mobile wallet and Bank card only: 66 people, 17% of 400/.test(await p.textContent('.dn-note'))) throw new Error('chip wrong: ' + await p.textContent('.dn-note'));
      const b = await p.locator('.dn svg').boundingBox();
      await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2 + 6);
      if (!/Mobile wallet, Bank card and Savings group: 28/.test(await p.textContent('.dn-note'))) throw new Error('tap on the middle wrong: ' + await p.textContent('.dn-note'));
      return 'regions, chip, tap the middle';
  } },
  { url: '/templates/flashdeck/', name: 'flashdeck', check: async p => {
      if (!/Card 1 of 14 · you know 0 of 14/.test(await p.textContent('[data-count]'))) throw new Error('count wrong');
      await p.click('.fd-card');
      if (!(await p.getAttribute('.fd-card', 'class')).includes('flip')) throw new Error('card did not turn over');
      await p.click('[data-know]');
      if (!/Card 2 of 14 · you know 1 of 14/.test(await p.textContent('[data-count]'))) throw new Error('marking known failed');
      await p.click('[data-only]');
      if (!/of 13 · you know 1 of 14/.test(await p.textContent('[data-count]'))) throw new Error('practise-only failed: ' + await p.textContent('[data-count]'));
      await p.focus('.fd-card'); await p.keyboard.press('ArrowRight');
      return 'turn over, mark known, practise the rest';
  } },
  { url: '/templates/quizline/', name: 'quizline', check: async p => {
      await p.click('[data-o="1"]');
      if (!/^Correct\./.test(await p.textContent('.qz-why'))) throw new Error('right answer not marked');
      await p.click('[data-next]'); await p.click('[data-o="0"]');
      if (!/Not quite\. The answer is Nothing about cause/.test(await p.textContent('.qz-why'))) throw new Error('wrong answer not explained');
      for (const o of [1, 1, 0, 0]) { await p.click('[data-next]'); await p.click('[data-o="' + o + '"]'); }
      await p.click('[data-next]');
      if (!/You scored 5 out of 6\./.test(await p.textContent('.qz-q'))) throw new Error('score wrong: ' + await p.textContent('.qz-q'));
      await p.click('[data-again]');
      return 'right and wrong explained, score 5 of 6, try again';
  } },
  { url: '/templates/hotspot/', name: 'hotspot', check: async p => {
      if (await p.locator('.hs-list button').count() !== 7) throw new Error('expected 7 parts');
      await p.click('svg .hs-pin[data-k="3"]');
      if ((await p.textContent('.hs-panel h4')) !== 'First-flush pipe') throw new Error('pin did not open');
      await p.click('[data-step="1"]');
      if ((await p.textContent('.hs-panel h4')) !== 'Tank') throw new Error('tour did not move on');
      return 'tap a part, tour to the next';
  } },
  { url: '/templates/checklist/', name: 'checklist', check: async p => {
      if (await p.locator('.ck-item input').count() !== 6) throw new Error('expected 6 steps');
      if (!/0 of 6 done · about 50 minutes left/.test(await p.textContent('[data-sum]'))) throw new Error('summary wrong');
      await p.check('#ck-shape');
      if (!/1 of 6 done · about 45 minutes left/.test(await p.textContent('[data-sum]'))) throw new Error('tick did not count');
      if (!(await p.getAttribute('.ck-item >> nth=1', 'class')).includes('next')) throw new Error('next step not highlighted');
      await p.click('[data-more="data"]');
      if ((await p.getAttribute('[data-more="data"]', 'aria-expanded')) !== 'true') throw new Error('how-to did not open');
      return 'tick a step, time left, next step, show how';
  } },
  { url: '/templates/scaleup/', name: 'scaleup', check: async p => {
      if (await p.locator('[data-row] .hs-pin').count() !== 9) throw new Error('expected 9 circles');
      if (!/Maths & Money is the biggest at 36 chapters/.test(await p.textContent('.dl-note'))) throw new Error('summary wrong');
      await p.focus('[data-row] [data-k="0"]'); await p.keyboard.press('Enter');
      await p.focus('[data-row] [data-k="1"]'); await p.keyboard.press('Enter');
      if (!/Maths & Money \(36 chapters\) is 2 times the size of Coding & AI \(18 chapters\)/.test(await p.textContent('.dl-note'))) throw new Error('comparison wrong: ' + await p.textContent('.dl-note'));
      if (await p.isHidden('[data-cmp]')) throw new Error('comparison drawing hidden');
      return 'pick two, how many times bigger';
  } },
  { url: '/templates/sorter/', name: 'sorter', check: async p => {
      if (await p.locator('.so-tray .so-chip').count() !== 10) throw new Error('expected 10 words');
      await p.click('.so-chip[data-id="bula"]'); await p.click('.so-bin[data-bin="greet"]');
      await p.click('.so-chip[data-id="kana"]'); await p.click('.so-bin[data-bin="home"]');
      await p.focus('.so-chip[data-id="wai"]'); await p.keyboard.press('Enter'); await p.focus('.so-bin[data-bin="food"]'); await p.keyboard.press('Enter');
      await p.click('[data-check]');
      if (!/2 of 10 right\. 7 still to sort\./.test(await p.textContent('.dl-note'))) throw new Error('check wrong: ' + await p.textContent('.dl-note'));
      if (!(await p.getAttribute('.so-chip[data-id="kana"]', 'class')).includes('no')) throw new Error('wrong answer not marked');
      await p.click('.so-chip[data-id="kana"]');
      if (!/Kana: Kana means to eat\./.test(await p.textContent('.dl-note'))) throw new Error('why not shown');
      return 'tap and keyboard sorting, check, why it is wrong';
  } },
  { url: '/templates/loanpath/', name: 'loanpath', check: async p => {
      const k = await p.textContent('.dq-kpis');
      if (!/\$471each month/.test(k) || !/\$1,298total interest/.test(k) || !/\$138saved by paying \$50 extra/.test(k)) throw new Error('figures wrong: ' + k);
      if (!/finishes 2 months sooner/.test(await p.textContent('.dq-note'))) throw new Error('extra-payment sentence wrong');
      await p.focus('input[data-k="years"]'); await p.keyboard.press('ArrowRight');
      if (!/\$332each month/.test(await p.textContent('.dq-kpis'))) throw new Error('slider did not recalculate: ' + await p.textContent('.dq-kpis'));
      return 'payment, interest, extra saved, slider by keyboard';
  } },
  { url: '/templates/savegrow/', name: 'savegrow', check: async p => {
      const k = await p.textContent('.dq-kpis');
      if (!/\$15,052after 10 years/.test(k) || !/\$12,500you put in/.test(k) || !/\$2,552interest earned/.test(k) || !/10 yearsto reach \$15,000/.test(k)) throw new Error('figures wrong: ' + k);
      await p.evaluate(() => window.timeline.set('monthly', 50));
      if (!/out of reach|You reach/.test(await p.textContent('.dq-note'))) throw new Error('goal sentence missing');
      return 'balance, deposits, interest, goal date, change a slider';
  } },
  { url: '/templates/countdown/', name: 'countdown', check: async p => {
      if (!/days until the end of \d{4}/.test(await p.textContent('.dq-note'))) throw new Error('countdown sentence missing: ' + await p.textContent('.dq-note'));
      if (await p.locator('svg [data-k]').count() !== 4) throw new Error('expected 4 milestones');
      await p.focus('svg [data-k="3"]'); await p.keyboard.press('Enter');
      if (!/Christmas Day: 25 Dec \d{4}, (in \d+ days|\d+ days ago)/.test(await p.textContent('.dq-note'))) throw new Error('milestone detail wrong');
      return 'days left, milestones, tap one';
  } },
  { url: '/templates/pollbar/', name: 'pollbar', check: async p => {
      if (!/438 votes\. Staying safe from phone scams leads with 32%, 13 ahead of Budgeting for a family/.test(await p.textContent('.dq-note'))) throw new Error('summary wrong: ' + await p.textContent('.dq-note'));
      await p.click('[data-v="garden"]');
      if (!/439 votes/.test(await p.textContent('.dq-note')) || !/your vote/.test(await p.textContent('.pb-row.mine'))) throw new Error('vote not counted');
      await p.click('[data-v="budget"]'); await p.click('[data-v="budget"]');
      if (!/438 votes/.test(await p.textContent('.dq-note')) || await p.locator('.pb-row.mine').count()) throw new Error('change or take back failed');
      return 'vote, change, take back';
  } },
  { url: '/templates/rankit/', name: 'rankit', check: async p => {
      await p.click('[data-id="price"] [data-mv="1"]');
      await p.focus('[data-id="coverage"] [data-mv="-1"]'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
      const order = await p.evaluate(() => window.timeline.getState().order.join(','));
      if (order !== 'coverage,data,price,speed,service,contract') throw new Error('order wrong: ' + order);
      await p.click('[data-done]');
      if (!/You put 2 of 6 in the same place/.test(await p.textContent('.dq-note'))) throw new Error('comparison wrong: ' + await p.textContent('.dq-note'));
      return 'move by click and keyboard, compare with the group';
  } },
  { url: '/templates/opinion/', name: 'opinion', check: async p => {
      const n = await p.textContent('.dq-note');
      if (!/Most agreed: I have used something I learned \(77% agree\)/.test(n) || !/The app uses too much data \(42% disagree\)/.test(n)) throw new Error('summary wrong: ' + n);
      await p.click('[data-s="net"]');
      await p.focus('svg [data-k="0"]'); await p.keyboard.press('Enter');
      if (!/The lessons are easy to follow.*In all, 77% agree and 9% disagree \(220 answers\)/.test(await p.textContent('.dq-note'))) throw new Error('detail wrong: ' + await p.textContent('.dq-note'));
      return 'most and least agreed, sort, full split';
  } },
  { url: '/templates/dial/', name: 'dial', check: async p => {
      if (!/Water tank level: 38%, which is getting low\. Cut back on washing and garden water\. Down from 41% last time\. Target: 60%\./.test(await p.textContent('.dt-note'))) throw new Error('summary wrong: ' + await p.textContent('.dt-note'));
      await p.focus('[data-dial] [data-k="0"]'); await p.keyboard.press('Enter');
      if (!/Low: 0% to 20%\. Keep the water for drinking and cooking\./.test(await p.textContent('.dt-note'))) throw new Error('zone detail wrong');
      await p.keyboard.press('Enter');
      await p.evaluate(() => window.timeline.setValue(15));
      if (!/15%, which is low/.test(await p.textContent('.dt-note'))) throw new Error('setValue failed');
      return 'zone in words, zone range, live value';
  } },
  { url: '/templates/statusboard/', name: 'statusboard', check: async p => {
      if (await p.locator('svg [data-k]').count() !== 120) throw new Error('expected 4 services x 30 days');
      const n = await p.textContent('.dt-note');
      if (!/Today: Text messages is slow\./.test(n) || !/Lowest over 30 days: Payments \(96\.7% up\)/.test(n)) throw new Error('summary wrong: ' + n);
      await p.focus('svg [tabindex="0"]'); await p.keyboard.press('ArrowDown');
      if (!/Payments, \w{3} 11 Nov 2026: Working\./.test(await p.textContent('.dt-note'))) throw new Error('arrow down wrong: ' + await p.textContent('.dt-note'));
      for (let i = 0; i < 9; i++) await p.keyboard.press('ArrowLeft');
      if (!/Payments, \w{3} 2 Nov 2026: Down\. The payment provider was down/.test(await p.textContent('.dt-note'))) throw new Error('note not shown: ' + await p.textContent('.dt-note'));
      return 'today in words, uptime, arrow keys, day notes';
  } },
  { url: '/templates/sparkgrid/', name: 'sparkgrid', check: async p => {
      if (await p.locator('.sg-card').count() !== 8) throw new Error('expected 8 cards');
      if (!/Biggest rise: Dalo; biggest fall: Bele and greens/.test(await p.textContent('.dt-note'))) throw new Error('summary wrong: ' + await p.textContent('.dt-note'));
      await p.click('[data-s="up"]');
      if ((await p.textContent('.sg-card >> nth=0 >> b')) !== 'Dalo') throw new Error('sort by rise failed');
      await p.click('[data-same]');
      if ((await p.getAttribute('[data-same]', 'aria-pressed')) !== 'true') throw new Error('same scale toggle failed');
      await p.click('.sg-card >> nth=1');
      if (!/in Week 1, .* in Week 12/.test(await p.textContent('.dt-note'))) throw new Error('card detail wrong');
      return 'rise and fall, sort, same scale, card detail';
  } },
  { url: '/templates/treeline/', name: 'treeline', check: async p => {
      if (await p.locator('.tl-row').count() !== 24) throw new Error('expected root and 23 families: ' + await p.locator('.tl-row').count());
      await p.fill('.tl-tools input', 'loan');
      if (!/1 match for “loan”/.test(await p.textContent('.dt-note')) || !(await p.isVisible('text=Loanpath'))) throw new Error('search failed');
      await p.fill('.tl-tools input', '');
      await p.focus('.tl-row[tabindex="0"]'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowRight');
      if ((await p.getAttribute('.tl-row[tabindex="0"]', 'aria-expanded')) !== 'true') throw new Error('arrow right did not open');
      await p.keyboard.press('ArrowRight');
      if (!/Explore: the first four › Lanternfield/.test(await p.textContent('.dt-note'))) throw new Error('arrow into branch failed: ' + await p.textContent('.dt-note'));
      return 'families, search, arrow keys open and enter';
  } },
  { url: '/templates/monthview/', name: 'monthview', check: async p => {
      if ((await p.textContent('.mv-head h4')) !== 'November 2026') throw new Error('wrong month');
      if (!/10 events in November/.test(await p.textContent('[data-day]'))) throw new Error('count wrong');
      await p.click('[data-k="2026-11-14"]');
      if (await p.locator('.mv-list li').count() !== 2) throw new Error('day list wrong');
      await p.click('[data-next]');
      if ((await p.textContent('.mv-head h4')) !== 'December 2026') throw new Error('next month failed');
      return 'month, tap a day, next month';
  } },
  { url: '/templates/slotgrid/', name: 'slotgrid', check: async p => {
      if (!/12 free slots\. The first is Mon 16 at 15:00/.test(await p.textContent('.dt-note'))) throw new Error('summary wrong: ' + await p.textContent('.dt-note'));
      await p.click('[data-k="mon|7"]');
      if (!/You picked Mon 16 at 15:00/.test(await p.textContent('.dt-note'))) throw new Error('pick failed');
      await p.click('[data-book]');
      if (!/Booked: Mon 16 at 15:00/.test(await p.textContent('.dt-note')) || !(await p.isDisabled('[data-k="mon|7"]'))) throw new Error('book failed');
      return 'free count, pick, book';
  } },
  { url: '/templates/stackbar/', name: 'stackbar', check: async p => {
      await p.click('[data-p="c4"]');
      if (!/Sorted by 4 chapters\. The biggest share is in Other subjects \(40%\)/.test(await p.textContent('.dv-note'))) throw new Error('focus sort wrong: ' + await p.textContent('.dv-note'));
      await p.click('[data-p="c4"]');
      await p.focus('svg [data-k="maths|c3"]'); await p.keyboard.press('Enter');
      if (!/Maths & Money: 3 chapters is 8 of 12 \(67%\)/.test(await p.textContent('.dv-note'))) throw new Error('piece detail wrong: ' + await p.textContent('.dv-note'));
      await p.click('[data-m="count"]');
      return 'focus and sort by a part, piece detail, numbers mode';
  } },
  { url: '/templates/featuregrid/', name: 'featuregrid', check: async p => {
      if (!/9 of 10 features differ/.test(await p.textContent('.dv-note'))) throw new Error('summary wrong: ' + await p.textContent('.dv-note'));
      await p.click('[data-diff]');
      if (await p.locator('tbody tr:not(.grp)').count() !== 9) throw new Error('differences filter wrong');
      await p.click('[data-o="render"]');
      if (!/Render API has 5 of 10, and 1 partly\. It does not have: interactive in the page, tells the app what the reader did, saves the reader’s progress, downloads only the template you use\./.test(await p.textContent('.dv-note'))) throw new Error('pick wrong: ' + await p.textContent('.dv-note'));
      return 'only differences, pick an option';
  } },
  { url: '/templates/ringflow/', name: 'ringflow', check: async p => {
      if (!/The biggest: Outer islands → Suva \(140 people\)/.test(await p.textContent('.dv-note'))) throw new Error('summary wrong');
      await p.click('.dv-legend [data-g="suva"]');
      if (!/Suva: 175 people out, most to Overseas \(51%\); 285 people in, most from Outer islands \(49%\)/.test(await p.textContent('.dv-note'))) throw new Error('group wrong: ' + await p.textContent('.dv-note'));
      return 'biggest flow, follow a group';
  } },
  { url: '/templates/bumpline/', name: 'bumpline', check: async p => {
      if (!/Top in Aug: Dalo\. Biggest climber: Crafts \(up 5\); biggest drop: Kava \(down 3\)/.test(await p.textContent('.dv-note'))) throw new Error('summary wrong: ' + await p.textContent('.dv-note'));
      await p.focus('svg [data-k="3"]'); await p.keyboard.press('Enter');
      if (!/Crafts went from 7th in Jan to 2nd in Aug \(up 5 places\)/.test(await p.textContent('.dv-note'))) throw new Error('line detail wrong: ' + await p.textContent('.dv-note'));
      return 'ranks from values, follow a line';
  } },
  { url: '/templates/spiral/', name: 'spiral', check: async p => {
      if (await p.locator('svg [data-k]').count() !== 48) throw new Error('expected 48 months');
      await p.click('[data-m="0"]');
      if (!/Jan each year: 2022 [\d,]+ mm, 2023 [\d,]+ mm, 2024 [\d,]+ mm, 2025 [\d,]+ mm\./.test(await p.textContent('.dv-note'))) throw new Error('month compare wrong: ' + await p.textContent('.dv-note'));
      await p.focus('svg [data-k="6"]'); await p.keyboard.press('Enter');
      if (!/Jul 2022: [\d,]+ mm\. The average Jul is/.test(await p.textContent('.dv-note'))) throw new Error('segment detail wrong');
      return 'one month across years, one segment';
  } },
  { url: '/templates/streamgraph/', name: 'streamgraph', check: async p => {
      if (!/From 4 templates in v1\.0 to 133 templates in v1\.22\. Biggest layer now: Stories/.test(await p.textContent('.dv-note'))) throw new Error('summary wrong: ' + await p.textContent('.dv-note'));
      await p.click('.dv-legend [data-s="learn"]');
      if (!/Learn: 6 templates in v1\.22 \(5% of the total\), first appearing in v1\.7/.test(await p.textContent('.dv-note'))) throw new Error('layer wrong: ' + await p.textContent('.dv-note'));
      await p.click('[data-m="stack"]');
      return 'growth in words, follow a layer, stacked mode';
  } },
  { url: '/templates/weighscore/', name: 'weighscore', check: async p => {
      if (!/Plan D comes first, 4 points ahead of Plan B\. Most of its score comes from village coverage/.test(await p.textContent('.dg-note'))) throw new Error('ranking wrong: ' + await p.textContent('.dg-note'));
      await p.focus('input[data-c="coverage"]'); for (let i = 0; i < 5; i++) await p.keyboard.press('ArrowLeft');
      if (!/Plan C comes first, 8 points ahead of Plan A/.test(await p.textContent('.dg-note'))) throw new Error('re-rank wrong: ' + await p.textContent('.dg-note'));
      if (await p.evaluate(() => window.timeline.getState().weights.coverage) !== 0) throw new Error('state wrong');
      return 'ranking, re-rank by slider, state';
  } },
  { url: '/templates/routeline/', name: 'routeline', check: async p => {
      await p.evaluate(() => { window.timeline.o.now = '06:52'; window.timeline.render(); });
      if (!/Now between School and Health centre\. Next stop: Health centre at 07:00, in 8 minutes/.test(await p.textContent('.dg-note'))) throw new Error('position wrong: ' + await p.textContent('.dg-note'));
      await p.focus('svg [data-k="3"]'); await p.keyboard.press('Enter');
      if (!/Market at 07:20: in 28 minutes/.test(await p.textContent('.dg-note'))) throw new Error('stop wrong');
      return 'where it is now, minutes to a stop';
  } },
  { url: '/templates/levelup/', name: 'levelup', check: async p => {
      if (!/420 points, level Builder\. 180 more to reach Navigator/.test(await p.textContent('.dg-note'))) throw new Error('summary wrong: ' + await p.textContent('.dg-note'));
      await p.click('[data-k="4"]');
      if (!/Mentor: 1,000 points, 580 to go\. Unlocks: Help other learners/.test(await p.textContent('.dg-note'))) throw new Error('level detail wrong');
      const ev = await p.evaluate(() => { let got = null; window.timeline.on('levelup', e => { got = e.label; }); window.timeline.setValue(650); return got; });
      if (ev !== 'Navigator') throw new Error('levelup event missing: ' + ev);
      return 'where you are, what a level unlocks, levelup event';
  } },
  { url: '/templates/orgchart/', name: 'orgchart', check: async p => {
      if (!/14 in all/.test(await p.textContent('.dg-note'))) throw new Error('count wrong');
      await p.click('[data-k="o4"]');
      if (!/Learning \(Head teacher\), part of School committee\. 3 directly below, 3 in all\./.test(await p.textContent('.dg-note'))) throw new Error('detail wrong: ' + await p.textContent('.dg-note'));
      if (!(await p.locator('[data-k="o6"]').count())) throw new Error('team did not open');
      await p.click('[data-all]');
      if (await p.locator('[data-k]').count() !== 14) throw new Error('open all failed');
      return 'open a team, detail, open all';
  } },
  { url: '/templates/numberline/', name: 'numberline', check: async p => {
      if (!/From A cup of tea \(\$2\) to A new school building \(\$2,000,000\): 1,000,000 times bigger/.test(await p.textContent('.dg-note'))) throw new Error('summary wrong: ' + await p.textContent('.dg-note'));
      await p.focus('svg [data-k="5"]'); await p.keyboard.press('Enter');
      if (!/A second-hand car: \$15,000\. That is 37\.5 times a month’s rent for a room\. It would take 7,500 × a cup of tea/.test(await p.textContent('.dg-note'))) throw new Error('compare wrong: ' + await p.textContent('.dg-note'));
      await p.click('[data-s="linear"]');
      return 'span in words, compare with the one below, true to scale';
  } },
  { url: '/templates/glossary/', name: 'glossary', check: async p => {
      if (!/20 terms/.test(await p.textContent('.dg-note'))) throw new Error('count wrong');
      await p.fill('.gl-tools input', 'causes');
      if (!/1 of 20 terms match/.test(await p.textContent('.dg-note')) || (await p.locator('.gl-term').count()) !== 1) throw new Error('search wrong');
      await p.fill('.gl-tools input', '');
      await p.click('[data-id="median"] [data-see="average"]');
      if (!(await p.getAttribute('[data-id="average"]', 'class')).includes('hl')) throw new Error('see-also did not highlight');
      return 'search, see-also jump';
  } },
  { url: '/templates/beforeafter/', name: 'beforeafter', check: async p => {
      if (!/Light theme on the left, Dark theme on the right/.test(await p.textContent('.dy-note'))) throw new Error('summary wrong');
      await p.waitForFunction(() => [...document.querySelectorAll('.ba-frame img')].every(i => i.complete && i.naturalWidth > 0));
      await p.focus('.ba-handle'); await p.keyboard.press('End');
      if (!/Showing all of Light theme/.test(await p.textContent('.dy-note')) || (await p.getAttribute('.ba-handle', 'aria-valuenow')) !== '100') throw new Error('keyboard failed');
      await p.click('[data-go="0"]');
      if (!/Showing all of Dark theme/.test(await p.textContent('.dy-note'))) throw new Error('jump failed');
      return 'pictures load, keyboard slider, jump to a side';
  } },
  { url: '/templates/slidestory/', name: 'slidestory', check: async p => {
      if (!/1 \/ 7/.test(await p.textContent('.ss-card'))) throw new Error('first slide wrong');
      await p.click('[data-d="1"]');
      await p.focus('.ss-card'); await p.keyboard.press('ArrowRight');
      if (!/3 \/ 7/.test(await p.textContent('.ss-card'))) throw new Error('next/arrow failed: ' + await p.textContent('.ss-num'));
      await p.click('.ss-dots [data-i="6"]');
      if (!/7 \/ 7/.test(await p.textContent('.ss-card')) || !(await p.isDisabled('[data-d="1"]'))) throw new Error('last slide wrong');
      return 'next, arrow key, jump to the end';
  } },
  { url: '/templates/verdict/', name: 'verdict', check: async p => {
      await p.click('[data-id="avg"] [data-v="true"]');
      if (!/You got it\./.test(await p.textContent('[data-id="avg"] .vd-res'))) throw new Error('right guess not confirmed');
      await p.click('[data-id="zero"] [data-v="false"]');
      if (!/Not quite\./.test(await p.textContent('[data-id="zero"] .vd-res')) || !/PARTLY TRUE/.test(await p.textContent('[data-id="zero"] .vd-res'))) throw new Error('wrong guess not explained');
      if (!/1 of 2 right so far/.test(await p.textContent('.dy-note'))) throw new Error('score wrong');
      await p.click('[data-reveal]');
      if (await p.locator('.vd-stamp').count() !== 6) throw new Error('reveal failed');
      return 'right and wrong guesses explained, score, reveal';
  } },
  { url: '/templates/annotline/', name: 'annotline', check: async p => {
      if (!/From 4 in v1\.0 to 133 in v1\.22/.test(await p.textContent('.dy-note'))) throw new Error('summary wrong: ' + await p.textContent('.dy-note'));
      await p.click('[data-d="1"]');
      if (!/Note 1 of 16 · v1\.0 · 4.*Four to start\./.test(await p.textContent('.dy-note'))) throw new Error('first note wrong');
      await p.focus('svg [data-k="3"]'); await p.keyboard.press('Enter');
      if (!/Infographics Fiji v2 lands/.test(await p.textContent('.dy-note'))) throw new Error('tap note wrong');
      return 'whole story, step, tap a note';
  } },
  { url: '/templates/liveticker/', name: 'liveticker', check: async p => {
      await p.waitForTimeout(1200);
      if (!/Since you opened this page \d+ seconds? ago/.test(await p.textContent('[data-head]'))) throw new Error('heading wrong');
      const v = await p.evaluate(() => window.timeline.value('light'));
      if (!(v > 100000)) throw new Error('light counter not running: ' + v);
      await p.click('[data-pause]'); const a = await p.textContent('[data-v="light"]'); await p.waitForTimeout(400);
      if (a !== await p.textContent('[data-v="light"]')) throw new Error('pause failed');
      return 'counters run from real rates, pause';
  } },
  { url: '/templates/flowchart/', name: 'flowchart', check: async p => {
      if (!/10 boxes, 2 of them decisions \(diamonds\)\. The main path has 8 stops/.test(await p.textContent('.dy-note'))) throw new Error('summary wrong: ' + await p.textContent('.dy-note'));
      for (let i = 0; i < 3; i++) await p.click('[data-walk]');
      if (!/Run the tests\. Comes from: Build it on a branch; Find the cause and fix it; Make the changes asked for\. Leads to: All checks pass\?/.test(await p.textContent('.dy-note'))) throw new Error('walk wrong: ' + await p.textContent('.dy-note'));
      await p.focus('svg [data-k="pass"]'); await p.keyboard.press('Enter');
      if (!/Leads to: Yes: Open a pull request; No: Find the cause and fix it/.test(await p.textContent('.dy-note'))) throw new Error('decision wrong');
      return 'walk the main path, ways in and out of a decision';
  } },
  { url: '/templates/daylight/', name: 'daylight', check: async p => {
      await p.focus('.dz svg'); await p.keyboard.press('Home');
      const n = await p.textContent('.dz-note');
      if (!/1 Jan 2026 in Suva: sunrise 0[56]:\d\d, sunset 1[89]:\d\d/.test(n)) throw new Error('first day wrong: ' + n);
      if (!/Longest day 2[12] Dec \(13 h 1\d min\), shortest 2[012] Jun \(11 h 0\d min\)/.test(n)) throw new Error('extremes wrong: ' + n);
      await p.keyboard.press('End');
      if (!/31 Dec 2026/.test(await p.textContent('.dz-note'))) throw new Error('end key failed');
      return 'real sun times for Suva, keyboard, longest and shortest day';
  } },
  { url: '/templates/moonmonth/', name: 'moonmonth', check: async p => {
      const n = await p.textContent('.dz-note');
      if (!/New moon on 9 November at about 19:\d\d; Full moon on 25 November at about 0[23]:\d\d/.test(n)) throw new Error('key days wrong: ' + n);
      await p.click('[data-k="2026-11-17"]');
      if (!/first quarter, \d\d% lit/.test(await p.textContent('.dz-note'))) throw new Error('day detail wrong: ' + await p.textContent('.dz-note'));
      await p.click('[data-n]');
      if ((await p.textContent('.mm-head h4')) !== 'December 2026') throw new Error('next month failed');
      return 'new and full moon from the sky, day detail, next month';
  } },
  { url: '/templates/windrose/', name: 'windrose', check: async p => {
      if (!/Most often from the south-east \(17% of the time\)/.test(await p.textContent('.dz-note'))) throw new Error('summary wrong: ' + await p.textContent('.dz-note'));
      await p.focus('svg [data-k="4"]'); await p.keyboard.press('Enter');
      if (!/From the east: 9% of the time \(Light/.test(await p.textContent('.dz-note'))) throw new Error('petal wrong: ' + await p.textContent('.dz-note'));
      return 'most common direction, petal breakdown';
  } },
  { url: '/templates/reachrings/', name: 'reachrings', check: async p => {
      if (!/13 of 13 places within 20 km of Village\. Nearest: Village store \(0\.3 km\)/.test(await p.textContent('.dz-note'))) throw new Error('summary wrong');
      await p.$eval('.dz-range input', i => { i.value = 5; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/5 of 13 places within 5 km/.test(await p.textContent('.dz-note'))) throw new Error('slider wrong: ' + await p.textContent('.dz-note'));
      const k = await p.evaluate(() => [...document.querySelectorAll('svg [data-k]')].findIndex(g => /^Hospital/.test(g.getAttribute('aria-label'))));
      await p.focus('svg [data-k="' + k + '"]'); await p.keyboard.press('Enter');
      if (!/Hospital \(health\): 14 km to the west of Village/.test(await p.textContent('.dz-note'))) throw new Error('place wrong: ' + await p.textContent('.dz-note'));
      return 'within-reach slider, distance and direction';
  } },
  { url: '/templates/profileline/', name: 'profileline', check: async p => {
      if (!/12 km with \d+ m of climbing/.test(await p.textContent('.dz-note'))) throw new Error('summary wrong');
      await p.focus('.dz svg'); await p.keyboard.press('End');
      if (!/At 12 km: \d+ m up, \d+ m climbed so far, 0 km to go/.test(await p.textContent('.dz-note'))) throw new Error('end wrong: ' + await p.textContent('.dz-note'));
      await p.keyboard.press('Home'); for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowRight');
      if (!/At 4\.8 km/.test(await p.textContent('.dz-note'))) throw new Error('arrow wrong: ' + await p.textContent('.dz-note'));
      return 'totals, keyboard along the route';
  } },
  { url: '/templates/floorplan/', name: 'floorplan', check: async p => {
      await p.fill('.fp-tools input', 'blood');
      if (!/Blood tests \(care\)\. Go in the morning.*it is ahead and to the left\./.test(await p.textContent('.dz-note'))) throw new Error('search wrong: ' + await p.textContent('.dz-note'));
      await p.fill('.fp-tools input', 'room');
      if (!/4 rooms match/.test(await p.textContent('.dz-note'))) throw new Error('multi match wrong: ' + await p.textContent('.dz-note'));
      await p.fill('.fp-tools input', '');
      return 'search, which way from you are here';
  } },
  { url: '/templates/histobins/', name: 'histobins', check: async p => {
      if (!/40 values\. Most fall between 70 and 75 characters \(12\)/.test(await p.textContent('.dw-note'))) throw new Error('summary wrong: ' + await p.textContent('.dw-note'));
      const k = await p.evaluate(() => [...document.querySelectorAll('svg [data-k]')].findIndex(g => /^70 to 75/.test(g.getAttribute('aria-label'))));
      await p.focus('svg [data-k="' + k + '"]'); await p.keyboard.press('Enter');
      if (!/70 to 75 characters: 12 of 40 \(30%\)/.test(await p.textContent('.dw-note')) || (await p.locator('.dw-list li').count()) !== 12) throw new Error('bar detail wrong: ' + await p.textContent('.dw-note'));
      await p.$eval('.dw-range input', i => { i.value = 4; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if ((await p.locator('svg [data-k]').count()) > 6 || !/^40 values/.test(await p.textContent('.dw-note'))) throw new Error('fewer ranges failed');
      return 'summary, what is in a bar, change the ranges';
  } },
  { url: '/templates/boxplot/', name: 'boxplot', check: async p => {
      if (!/Highest typical value: Business \(71\.5 characters\)\. Lowest: Maths \(59\.5 characters\)/.test(await p.textContent('.dw-note'))) throw new Error('summary wrong: ' + await p.textContent('.dw-note'));
      await p.click('[data-sort]');
      if (!/^Business/.test(await p.getAttribute('svg [data-k]:first-of-type', 'aria-label'))) throw new Error('sort failed');
      await p.focus('svg [data-k="4"]'); await p.keyboard.press('Enter');
      if (!/Science \(4 values\).*Unusual: .*96 characters/.test(await p.textContent('.dw-note'))) throw new Error('group wrong: ' + await p.textContent('.dw-note'));
      await p.click('[data-points]');
      if ((await p.locator('svg circle').count()) !== 35) throw new Error('points wrong: ' + await p.locator('svg circle').count());
      return 'medians in words, sort, unusual values, every point';
  } },
  { url: '/templates/dumbbell/', name: 'dumbbell', check: async p => {
      if (!/6 of 8 went up.*Biggest change: School E \(\+19\)/.test(await p.textContent('.dw-note'))) throw new Error('summary wrong: ' + await p.textContent('.dw-note'));
      await p.click('[data-sort="change"]');
      if (!/^School E/.test(await p.getAttribute('svg [data-k]:first-of-type', 'aria-label'))) throw new Error('sort by change failed');
      await p.focus('svg [data-k="3"]'); await p.keyboard.press('Enter');
      if (!/School D.*down 2 \(−3%\)/.test(await p.textContent('.dw-note'))) throw new Error('row wrong: ' + await p.textContent('.dw-note'));
      return 'summary, sort by change, row detail';
  } },
  { url: '/templates/bulletbar/', name: 'bulletbar', check: async p => {
      if (!/3 of 5 targets met; short: Sales, Average wait/.test(await p.textContent('.dw-note'))) throw new Error('summary wrong: ' + await p.textContent('.dw-note'));
      await p.focus('svg [data-k="3"]'); await p.keyboard.press('Enter');
      if (!/Average wait.*12 min against a target of 10 min \(120%\)\. 2 min to go\. Rated ok/.test(await p.textContent('.dw-note'))) throw new Error('row wrong: ' + await p.textContent('.dw-note'));
      await p.click('[data-show="percent"]');
      if (!/92% of target/.test(await p.textContent('svg'))) throw new Error('percent mode failed');
      return 'targets met, lower is better, percent of target';
  } },
  { url: '/templates/ridgeline/', name: 'ridgeline', check: async p => {
      if (!/Highest median: Friday \(\d+ min\); lowest: Saturday \(\d+ min\)/.test(await p.textContent('.dw-note'))) throw new Error('summary wrong: ' + await p.textContent('.dw-note'));
      await p.focus('svg [data-k="0"]'); await p.keyboard.press('Enter');
      if (!/Monday \(60 values\): most common around/.test(await p.textContent('.dw-note'))) throw new Error('group wrong: ' + await p.textContent('.dw-note'));
      await p.focus('.dw svg'); await p.keyboard.press('ArrowRight');
      if (!/At or below .*Monday \d+%, Tuesday \d+%/.test(await p.textContent('.dw-note'))) throw new Error('read across failed: ' + await p.textContent('.dw-note'));
      return 'medians in words, a group, read across at one value';
  } },
  { url: '/templates/marimekko/', name: 'marimekko', check: async p => {
      if (!/Widest column: South \(48% of the total 20,200 people\)\. Largest part overall: Bus \(42%\)/.test(await p.textContent('.dw-note'))) throw new Error('summary wrong: ' + await p.textContent('.dw-note'));
      await p.focus('svg [data-k="2:1"]'); await p.keyboard.press('Enter');
      if (!/South · Bus.*4,300 people\. That is 44% of South/.test(await p.textContent('.dw-note'))) throw new Error('block wrong: ' + await p.textContent('.dw-note'));
      await p.click('[data-row="3"]');
      if (!/Boat: 8% overall\. Biggest share in West/.test(await p.textContent('.dw-note'))) throw new Error('key wrong: ' + await p.textContent('.dw-note'));
      return 'two-way shares, block detail, highlight a part';
  } },
  { url: '/templates/sunburst/', name: 'sunburst', check: async p => {
      if (!/Dimau Infographics: 133 templates in 23 parts\. Biggest: Stories \(5%\)/.test(await p.textContent('.dx-note'))) throw new Error('summary wrong: ' + await p.textContent('.dx-note'));
      const k = await p.evaluate(() => [...document.querySelectorAll('svg [data-k]')].find(g => /^Charts:/.test(g.getAttribute('aria-label'))).dataset.k);
      await p.focus('svg [data-k="' + k + '"]'); await p.keyboard.press('Enter');
      if (!/Charts: 6 templates \(5% of everything\) in 6 parts, all the same size/.test(await p.textContent('.dx-note')) || !/DimauInfographics›Charts/.test((await p.textContent('.dx-crumbs')).replace(/\s/g, ''))) throw new Error('zoom wrong: ' + await p.textContent('.dx-note'));
      await p.keyboard.press('Escape');
      if (!/^Dimau Infographics: 133/.test(await p.textContent('.dx-note'))) throw new Error('back up failed');
      return 'summary, zoom into a family, Escape back up';
  } },
  { url: '/templates/circlepack/', name: 'circlepack', check: async p => {
      if (!/Library files \(v1\): [\d,.]+ KB in 3 parts\. Biggest: Template families/.test(await p.textContent('.dx-note'))) throw new Error('summary wrong: ' + await p.textContent('.dx-note'));
      await p.focus('svg [data-k="0.0"]'); await p.keyboard.press('Enter');
      if (!/Template families/.test(await p.textContent('.dx-crumbs b'))) throw new Error('zoom failed');
      await p.focus('svg [data-k="0.0.0"]'); await p.keyboard.press('Enter');
      if (!/Template families › Timelines \(timelines\.js\)<?\/?b?>?: [\d.]+ KB, \d+% of Template families/.test(await p.textContent('.dx-note')) && !/Template families › Timelines \(timelines\.js\): [\d.]+ KB, \d+% of Template families/.test(await p.textContent('.dx-note'))) throw new Error('leaf wrong: ' + await p.textContent('.dx-note'));
      return 'summary, zoom in, a file in words';
  } },
  { url: '/templates/icicle/', name: 'icicle', check: async p => {
      if (!/FijiLearn: 109 chapters in 9 parts\. Biggest: Maths \(33%\)/.test(await p.textContent('.dx-note'))) throw new Error('summary wrong: ' + await p.textContent('.dx-note'));
      const k = await p.evaluate(() => [...document.querySelectorAll('svg [data-k]')].find(g => /^Maths:/.test(g.getAttribute('aria-label'))).dataset.k);
      await p.click('svg [data-k="' + k + '"] rect');
      if (!/Maths: 36 chapters \(33% of everything\) in 12 parts/.test(await p.textContent('.dx-note'))) throw new Error('zoom wrong: ' + await p.textContent('.dx-note'));
      await p.click('.dx-crumbs [data-go="0"]');
      if (!/^FijiLearn: 109/.test(await p.textContent('.dx-note'))) throw new Error('crumb back failed');
      return 'summary, zoom into a subject, breadcrumb back';
  } },
  { url: '/templates/arcflow/', name: 'arcflow', check: async p => {
      if (!/Busiest link: Island D – Island E \(42 trips\)\. Most linked: Island D/.test(await p.textContent('.dx-note'))) throw new Error('summary wrong: ' + await p.textContent('.dx-note'));
      await p.focus('svg [data-k="4"]'); await p.keyboard.press('Enter');
      if (!/Island E: 74 trips with 4 others — most with Island D \(42 trips\)/.test(await p.textContent('.dx-note'))) throw new Error('item wrong: ' + await p.textContent('.dx-note'));
      await p.click('[data-sort="total"]');
      if (!/^Island D/.test(await p.getAttribute('svg g[data-k]:first-of-type', 'aria-label'))) throw new Error('sort failed: ' + await p.getAttribute('svg g[data-k]:first-of-type', 'aria-label'));
      return 'busiest link, one item’s links, sort by total';
  } },
  { url: '/templates/linkmatrix/', name: 'linkmatrix', check: async p => {
      if (!/Strongest: Operations → Support \(52 messages\)\. Least linked: People/.test(await p.textContent('.dx-note'))) throw new Error('summary wrong: ' + await p.textContent('.dx-note'));
      await p.focus('svg [data-k="0:0"]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
      if ((await p.evaluate(() => document.activeElement.dataset.k)) !== '2:1') throw new Error('arrow keys failed');
      await p.focus('svg [data-k="2:0"]'); await p.keyboard.press('Enter');
      if (!/Support → Operations: 48 messages; the other way, 52 messages/.test(await p.textContent('.dx-note'))) throw new Error('cell wrong: ' + await p.textContent('.dx-note'));
      return 'strongest pair, arrow keys, both directions';
  } },
  { url: '/templates/lifespans/', name: 'lifespans', check: async p => {
      if (!/16 spans from 1564 to 1958\. Longest: Florence Nightingale \(90 years\)\. Most at once: 7, first in 1834/.test(await p.textContent('.dx-note'))) throw new Error('summary wrong: ' + await p.textContent('.dx-note'));
      await p.$eval('.dx-range input', i => { i.value = 1850; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/In 1850: 7 at once — .*Ada Lovelace \(35\)/.test(await p.textContent('.dx-note'))) throw new Error('year wrong: ' + await p.textContent('.dx-note'));
      const k = await p.evaluate(() => [...document.querySelectorAll('svg [data-k]')].find(g => /^Alan Turing/.test(g.getAttribute('aria-label'))).dataset.k);
      await p.focus('svg [data-k="' + k + '"]'); await p.keyboard.press('Enter');
      if (!/Alan Turing.*Overlapped with 3: Marie Curie, Albert Einstein, Rosalind Franklin/.test(await p.textContent('.dx-note'))) throw new Error('overlap wrong: ' + await p.textContent('.dx-note'));
      await p.focus('svg [data-k="' + k + '"]'); await p.keyboard.press('Enter');
      await p.click('[data-g="life"]');
      if ((await p.locator('svg [data-k]').count()) !== 12) throw new Error('hiding a group failed');
      return 'summary, who was alive in a year, overlaps, hide a group';
  } },
  { url: '/templates/bubbletrail/', name: 'bubbletrail', check: async p => {
      if (!/In 2026, highest finishing secondary school: District G \([\d.]+%\)\. Biggest rise since 2016: District E/.test(await p.textContent('.du-note'))) throw new Error('summary wrong: ' + await p.textContent('.du-note'));
      await p.focus('svg [data-k="4"]'); await p.keyboard.press('Enter');
      if (!/District E in 2026: .*Since 2016: average household income up \$[\d,]+, finishing secondary school up [\d.]+%/.test(await p.textContent('.du-note'))) throw new Error('trail wrong: ' + await p.textContent('.du-note'));
      await p.$eval('.du-range input', i => { i.value = 0; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/District E in 2016/.test(await p.textContent('.du-note'))) throw new Error('slider wrong: ' + await p.textContent('.du-note'));
      await p.click('[data-play]');
      if ((await p.textContent('[data-play]')) !== 'Pause') throw new Error('play failed');
      await p.click('[data-play]');
      return 'summary, follow one bubble, change year, play and pause';
  } },
  { url: '/templates/fanchart/', name: 'fanchart', check: async p => {
      if (!/By Oct 27: most likely \$[\d,]+; an even chance it is between \$[\d,]+ and \$[\d,]+, and a 9-in-10 chance .* most likely reached in/.test(await p.textContent('.du-note'))) throw new Error('summary wrong: ' + await p.textContent('.du-note'));
      await p.focus('.du svg'); await p.keyboard.press('Home');
      if (!/^Nov 25: \$[\d,]+ \(actual\)/.test(await p.textContent('.du-note'))) throw new Error('home wrong: ' + await p.textContent('.du-note'));
      await p.keyboard.press('End');
      if (!/^Oct 27 \(forecast\)/.test(await p.textContent('.du-note'))) throw new Error('end wrong: ' + await p.textContent('.du-note'));
      await p.click('[data-wide]');
      if ((await p.getAttribute('[data-wide]', 'aria-pressed')) !== 'false') throw new Error('range toggle failed');
      return 'forecast in words, goal date, keyboard, hide the wide range';
  } },
  { url: '/templates/rangebars/', name: 'rangebars', check: async p => {
      if (!/Highest: Dec \(13\.2\d hours\)\. Lowest: Jun \(11\.0\d hours\)/.test(await p.textContent('.du-note'))) throw new Error('summary wrong: ' + await p.textContent('.du-note'));
      await p.focus('svg [data-k="5"]'); await p.keyboard.press('Enter');
      if (!/Jun: shortest day 11\.0\d hours, longest day 11\.1\d hours, average 11\.\d+ hours/.test(await p.textContent('.du-note'))) throw new Error('bar wrong: ' + await p.textContent('.du-note'));
      return 'real daylight by month, a month in words';
  } },
  { url: '/templates/pareto/', name: 'pareto', check: async p => {
      if (!/5 of 9 \(56% of the items\) make up 85% of the total 109 chapters/.test(await p.textContent('.du-note'))) throw new Error('summary wrong: ' + await p.textContent('.du-note'));
      await p.$eval('.du-range input', i => { i.value = 50; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/3 of 9 .* make up 65%.*Maths, Coding, Business\./.test(await p.textContent('.du-note'))) throw new Error('share wrong: ' + await p.textContent('.du-note'));
      const k = await p.evaluate(() => [...document.querySelectorAll('svg [data-k]')].find(g => /^Maths/.test(g.getAttribute('aria-label'))).dataset.k);
      await p.focus('svg [data-k="' + k + '"]'); await p.keyboard.press('Enter');
      if (!/Maths: 36 chapters \(33% of the total\), number 1 of 9/.test(await p.textContent('.du-note'))) throw new Error('bar wrong: ' + await p.textContent('.du-note'));
      return 'the few in words, share slider, rank and share';
  } },
  { url: '/templates/parallelaxes/', name: 'parallelaxes', check: async p => {
      await p.focus('svg [data-k="acost"]'); await p.keyboard.press('Enter');
      if (!/4 of 8 are in the better half on cost a month: Plan A, Plan B, Plan D, Plan F/.test(await p.textContent('.du-note'))) throw new Error('filter wrong: ' + await p.textContent('.du-note'));
      await p.focus('svg [data-k="adata"]'); await p.keyboard.press('Enter');
      if (!/0 of 8 are in the better half on cost a month and data/.test(await p.textContent('.du-note'))) throw new Error('two filters wrong: ' + await p.textContent('.du-note'));
      await p.focus('svg [data-k="acost"]'); await p.keyboard.press('Enter'); await p.focus('svg [data-k="adata"]'); await p.keyboard.press('Enter');
      await p.focus('svg [data-k="6"]'); await p.keyboard.press('Enter');
      if (!/Plan G: cost a month \$55, .*Best at data \(number 1 of 8\)/.test(await p.textContent('.du-note'))) throw new Error('line wrong: ' + await p.textContent('.du-note'));
      return 'better-half filters, ranks for one item';
  } },
  { url: '/templates/radialbars/', name: 'radialbars', check: async p => {
      if (!/Largest: Stories \(7 templates\)\..*Total 133 templates/.test(await p.textContent('.du-note'))) throw new Error('summary wrong: ' + await p.textContent('.du-note'));
      await p.click('[data-sort="size"]');
      if (!/^Stories/.test(await p.getAttribute('svg g[data-k]:first-of-type', 'aria-label'))) throw new Error('sort failed');
      await p.focus('svg g[data-k]:first-of-type'); await p.keyboard.press('Enter');
      if (!/Stories: 7 templates \(5% of the total\), number 1 of 23/.test(await p.textContent('.du-note'))) throw new Error('bar wrong: ' + await p.textContent('.du-note'));
      return 'largest and total, sort by size, share and rank';
  } },
  { url: '/templates/wordbars/', name: 'wordbars', check: async p => {
      if (!/^[\d,]+ words in \d+ texts, [\d,]+ different \(leaving out common words/.test(await p.textContent('.dr-note'))) throw new Error('summary wrong: ' + await p.textContent('.dr-note'));
      await p.click('[data-hide]');
      if (!/^the$|^and$|^a$/.test(await p.evaluate(() => document.querySelector('svg [data-k]').dataset.k))) throw new Error('common words not shown');
      await p.click('[data-hide]');
      await p.fill('.dr-bar input', 'budget');
      await p.focus('svg [data-k="budgets"]'); await p.keyboard.press('Enter');
      if (!/budgets: used \d+ times, in \d+ of \d+ texts/.test(await p.textContent('.dr-note')) || (await p.locator('.dr-quotes li mark').count()) < 1) throw new Error('word detail wrong: ' + await p.textContent('.dr-note'));
      return 'counts, common words on and off, search, examples in use';
  } },
  { url: '/templates/tagcloud/', name: 'tagcloud', check: async p => {
      if (!/\d+ words; the bigger the word, the more it is used\. Biggest: money, build, fiji/.test(await p.textContent('.dr-note'))) throw new Error('summary wrong: ' + await p.textContent('.dr-note'));
      await p.focus('svg [data-k="money"]'); await p.keyboard.press('Enter');
      if (!/money: \d+ times?, number 1 of/.test(await p.textContent('.dr-note'))) throw new Error('word wrong: ' + await p.textContent('.dr-note'));
      const ov = await p.evaluate(() => { const r = [...document.querySelectorAll('svg [data-k] text')].map(t => t.getBBox()); let n = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.x < b.x + b.width - 3 && b.x < a.x + a.width - 3 && a.y < b.y + b.height - 3 && b.y < a.y + a.height - 3) n++; } return n; });
      if (ov) throw new Error(ov + ' words overlap');
      return 'real chapter titles, count and rank, no overlaps';
  } },
  { url: '/templates/wordtree/', name: 'wordtree', check: async p => {
      if (!/“a” appears 38 times; most often followed by “small” \(2\)/.test(await p.textContent('.dr-note'))) throw new Error('summary wrong: ' + await p.textContent('.dr-note'));
      await p.focus('svg [data-k="small"]'); await p.keyboard.press('Enter');
      if (!/“a small” appears 2 times/.test(await p.textContent('.dr-note')) || (await p.inputValue('.dr-bar input')) !== 'a small') throw new Error('follow failed: ' + await p.textContent('.dr-note'));
      await p.click('[data-back]');
      await p.fill('.dr-bar input', 'not'); await p.press('.dr-bar input', 'Enter');
      if (!/“not” appears \d+ times/.test(await p.textContent('.dr-note'))) throw new Error('new start word failed');
      return 'branches, follow a phrase, back, new start word';
  } },
  { url: '/templates/textdiff/', name: 'textdiff', check: async p => {
      if (!/9 changes: 19 words added, 16 removed, 19 kept/.test(await p.textContent('.dr-note'))) throw new Error('summary wrong: ' + await p.textContent('.dr-note'));
      await p.click('[data-step="1"]'); await p.click('[data-step="1"]');
      if (!/Change 2 of 9: “16 November” was added/.test(await p.textContent('.dr-note')) || (await p.locator('.td-text .on').count()) !== 1) throw new Error('step wrong: ' + await p.textContent('.dr-note'));
      await p.click('[data-step="1"]');
      if (!/Change 3 of 9: “Patients who” became “If you”/.test(await p.textContent('.dr-note'))) throw new Error('replace wrong: ' + await p.textContent('.dr-note'));
      await p.click('[data-view="side"]');
      if ((await p.locator('.td-cols .td-text').count()) !== 2) throw new Error('side by side failed');
      return 'summary, step through, phrase replaced, side by side';
  } },
  { url: '/templates/readscore/', name: 'readscore', check: async p => {
      if (!/Reading ease \d+ out of 100/.test(await p.textContent('.dr-note'))) throw new Error('summary wrong: ' + await p.textContent('.dr-note'));
      await p.fill('.rs-box', 'Notwithstanding the aforementioned considerations, the organisational infrastructure necessitates comprehensive reconsideration of administrative responsibilities, institutional accountability mechanisms and interdepartmental communication procedures before implementation.');
      await p.waitForTimeout(300);
      if (!/very hard|hard/.test(await p.textContent('.dr-note')) || (await p.locator('.rs-long li').count()) !== 1) throw new Error('hard text not caught: ' + await p.textContent('.dr-note'));
      await p.fill('.rs-box', 'The shop is open. Come in. We have fish and bread.');
      await p.waitForTimeout(300);
      if (!/very easy|easy/.test(await p.textContent('.dr-note'))) throw new Error('easy text not caught: ' + await p.textContent('.dr-note'));
      return 'score as you type, hard and easy text, long sentences listed';
  } },
  { url: '/templates/keyline/', name: 'keyline', check: async p => {
      if (!/“time” is used \d+ times, in \d+ of \d+ texts\. Often after “waiting”/.test(await p.textContent('.dr-note'))) throw new Error('summary wrong: ' + await p.textContent('.dr-note'));
      await p.click('[data-sort="before"]');
      const firsts = await p.$$eval('.kl .l', ls => ls.map(l => l.textContent.trim().split(' ').pop().toLowerCase()));
      if (firsts.join('|') !== firsts.slice().sort((a, b) => a.localeCompare(b)).join('|')) throw new Error('sort by word before failed: ' + firsts.join('|'));
      await p.click('.kl button:first-child');
      if ((await p.locator('.dr-quotes li mark').count()) !== 1) throw new Error('full line not shown');
      await p.fill('.dr-bar input', 'zzzz');
      if (!/No text uses “zzzz”/.test(await p.textContent('.dr-note'))) throw new Error('no-match wrong');
      return 'uses counted, sort by word before, full line, no match';
  } },
  { url: '/templates/worldclock/', name: 'worldclock', check: async p => {
      if (!/^\d\d:\d\d in Suva is Auckland \d\d:\d\d, Sydney \d\d:\d\d, Brisbane \d\d:\d\d, Los Angeles/.test(await p.textContent('.dj-note'))) throw new Error('summary wrong: ' + await p.textContent('.dj-note'));
      await p.$eval('.dj-range input', i => { i.value = 36; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/^09:00 in Suva is Auckland 1\d:00/.test(await p.textContent('.dj-note')) || !/^Suva: 09:00/.test(await p.textContent('.dj-range output'))) throw new Error('slider wrong: ' + await p.textContent('.dj-note'));
      await p.focus('svg [data-k="london"]'); await p.keyboard.press('Enter');
      if (!/in London is Suva/.test(await p.textContent('.dj-note'))) throw new Error('home change failed: ' + await p.textContent('.dj-note'));
      return 'live local times, slide to 9:00, line up on London';
  } },
  { url: '/templates/lifegrid/', name: 'lifegrid', check: async p => {
      if (!/Someone born in March 1990: [\d,]+ of 960 months \(\d+% of 80 years\)\. Age \d+, /.test(await p.textContent('.dj-note'))) throw new Error('summary wrong: ' + await p.textContent('.dj-note'));
      if ((await p.locator('svg rect[rx="2"]').count()) !== 960) throw new Error('expected 960 months');
      await p.focus('svg [data-k="30"]'); await p.keyboard.press('Enter');
      if (!/Age 30 \(2020–2021\): working life\. Lived\./.test(await p.textContent('.dj-note'))) throw new Error('year wrong: ' + await p.textContent('.dj-note'));
      return 'months lived to today, 960 squares, a year in words';
  } },
  { url: '/templates/settleup/', name: 'settleup', check: async p => {
      if (!/\$441\.00 spent by 4 people\. 3 payments settle everything/.test(await p.textContent('.dj-note'))) throw new Error('summary wrong: ' + await p.textContent('.dj-note'));
      if (!/Friend D pays Friend A \$69\.00/.test(await p.textContent('.su-pay'))) throw new Error('payments wrong: ' + await p.textContent('.su-pay'));
      await p.focus('svg [data-k="a"]'); await p.keyboard.press('Enter');
      if (!/Friend A paid \$240\.00 and their share is \$114\.00, so they are owed \$126\.00/.test(await p.textContent('.dj-note'))) throw new Error('person wrong: ' + await p.textContent('.dj-note'));
      await p.uncheck('[data-e="3"]');
      if (!/Friend D pays Friend A \$99\.00/.test(await p.textContent('.su-pay'))) throw new Error('untick failed: ' + await p.textContent('.su-pay'));
      return 'fewest payments, a person in words, leave a cost out';
  } },
  { url: '/templates/unitprice/', name: 'unitprice', check: async p => {
      if (!/For 12 kg, the cheapest way is 6 × Rice 2 kg for \$35\.40\. Most expensive: Rice 10 kg \(\$56\.00\)/.test(await p.textContent('.dj-note'))) throw new Error('need wrong: ' + await p.textContent('.dj-note'));
      await p.fill('.dj-field input', '');
      if (!/Best value: Rice 5 kg at \$2\.70 per kg\. Rice 500 g costs 30% more per kg/.test(await p.textContent('.dj-note'))) throw new Error('best wrong: ' + await p.textContent('.dj-note'));
      await p.focus('svg [data-k="4"]'); await p.keyboard.press('Enter');
      if (!/Rice 10 kg: \$28\.00 for 10 kg = \$2\.80 per kg, 4% more per kg than Rice 5 kg/.test(await p.textContent('.dj-note'))) throw new Error('item wrong: ' + await p.textContent('.dj-note'));
      return 'cheapest for 12 kg, best per kilo, grams converted, bigger is not always cheaper';
  } },
  { url: '/templates/seatarc/', name: 'seatarc', check: async p => {
      if ((await p.locator('svg circle').count()) !== 31) throw new Error('expected 31 seats, got ' + await p.locator('svg circle').count());
      if (!/31 seats; 16 make a majority\. Largest: Party A \(12\), 4 short on its own/.test(await p.textContent('.dj-note'))) throw new Error('summary wrong');
      await p.click('[data-p="a"]'); await p.click('[data-p="b"]');
      if (!/Together: 21 seats\. That is a majority \(5 to spare\)/.test(await p.textContent('.dj-note'))) throw new Error('majority wrong: ' + await p.textContent('.dj-note'));
      await p.click('[data-p="b"]'); await p.click('[data-p="d"]');
      if (!/Together: 15 seats\. 1 short of the 16 needed/.test(await p.textContent('.dj-note'))) throw new Error('short wrong: ' + await p.textContent('.dj-note'));
      return '31 seats drawn, build a majority, seats short';
  } },
  { url: '/templates/leaderboard/', name: 'leaderboard', check: async p => {
      if (!/After Round 6, Team A leads with 58 points, 5 ahead of Team E\. Biggest climb: Team D \(up 1\)/.test(await p.textContent('.dj-note'))) throw new Error('summary wrong: ' + await p.textContent('.dj-note'));
      await p.$eval('.dj-range input', i => { i.value = 0; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/After Round 1, Team E leads with 11 points, 3 ahead of Team A/.test(await p.textContent('.dj-note')) || !/^Team E/.test(await p.textContent('.lb li:first-child button span:nth-child(2)'))) throw new Error('round 1 wrong: ' + await p.textContent('.dj-note'));
      await p.$eval('.dj-range input', i => { i.value = 5; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await p.click('[data-id="a"]');
      if (!/Team A: 58 points, place 1 after Round 6\. Places so far: 2 → /.test(await p.textContent('.dj-note'))) throw new Error('story wrong: ' + await p.textContent('.dj-note'));
      return 'leader and climber, slide rounds, places so far';
  } },
  { url: '/templates/cohortgrid/', name: 'cohortgrid', check: async p => {
      if (!/On average 64% are still active in month 1 and 27% by month 6\. Best start: May 2026 \(61% in month 2\)/.test(await p.textContent('.dm-note'))) throw new Error('summary wrong: ' + await p.textContent('.dm-note'));
      await p.focus('svg [data-k="0:0"]'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowRight');
      if ((await p.evaluate(() => document.activeElement.dataset.k)) !== '1:1') throw new Error('arrow keys failed');
      await p.focus('svg [data-k="0:0"]'); await p.keyboard.press('Enter');
      if (!/Of the 410 who started in Jan 2026, 254 \(62%\) were still active in month 1/.test(await p.textContent('.dm-note'))) throw new Error('cell wrong: ' + await p.textContent('.dm-note'));
      await p.click('[data-show="count"]');
      if ((await p.textContent('svg [data-k="0:0"] text')) !== '254') throw new Error('people view failed');
      return 'averages in words, arrow keys, a cell in words, people view';
  } },
  { url: '/templates/burndown/', name: 'burndown', check: async p => {
      if (!/33 tasks left with 8 days to the due date \(20 Nov\)\. At the recent pace of 3\.2 a day, it finishes on 23 Nov — 3 days late/.test(await p.textContent('.dm-note'))) throw new Error('summary wrong: ' + await p.textContent('.dm-note'));
      await p.focus('.dm svg'); await p.keyboard.press('Home');
      if (!/^2 Nov: 60 tasks left; the plan said 60 — right on plan/.test(await p.textContent('.dm-note'))) throw new Error('first day wrong: ' + await p.textContent('.dm-note'));
      await p.keyboard.press('End');
      if (!/^12 Nov: 33 tasks left; the plan said 27 — 6 behind/.test(await p.textContent('.dm-note'))) throw new Error('last day wrong: ' + await p.textContent('.dm-note'));
      return 'finish date at the pace, ahead or behind on any day';
  } },
  { url: '/templates/controlchart/', name: 'controlchart', check: async p => {
      if (!/Average 23\.2 min; readings normally fall between [\d.]+ min and [\d.]+ min\. 4 unusual: 23 Oct, 8 Nov, 9 Nov, 10 Nov/.test(await p.textContent('.dm-note'))) throw new Error('summary wrong: ' + await p.textContent('.dm-note'));
      await p.focus('svg [data-k="11"]'); await p.keyboard.press('Enter');
      if (!/23 Oct: 34 min\. Unusual: above the usual range\. .*Two nurses were off sick/.test(await p.textContent('.dm-note'))) throw new Error('point wrong: ' + await p.textContent('.dm-note'));
      await p.focus('svg [data-k="27"]'); await p.keyboard.press('Enter');
      if (!/8 in a row on one side of the average/.test(await p.textContent('.dm-note'))) throw new Error('run rule wrong');
      return 'usual range, unusual points with reasons, the run rule';
  } },
  { url: '/templates/cumflow/', name: 'cumflow', check: async p => {
      if (!/59 requests done; 36 in progress \(up from 1 at the start\)/.test(await p.textContent('.dm-note'))) throw new Error('summary wrong: ' + await p.textContent('.dm-note'));
      await p.focus('.dm svg'); await p.keyboard.press('Home');
      if (!/^13 Oct: waiting 7, doing 1, checking 0, done 2\. Work in progress: 1\./.test(await p.textContent('.dm-note'))) throw new Error('first day wrong: ' + await p.textContent('.dm-note'));
      return 'done and in progress, any day in words';
  } },
  { url: '/templates/kpitiles/', name: 'kpitiles', check: async p => {
      if (!/3 of 4 moved the right way on the last release/.test(await p.textContent('.dm-note'))) throw new Error('summary wrong: ' + await p.textContent('.dm-note'));
      await p.click('.kt [data-id="templates"]');
      if ((await p.getAttribute('.kt [data-id="templates"]', 'aria-expanded')) !== 'true' || !/Templates: 133, up on the last release \(good\)/.test(await p.textContent('.dm-note'))) throw new Error('tile wrong: ' + await p.textContent('.dm-note'));
      return 'right way in words, tile opens';
  } },
  { url: '/templates/abtest/', name: 'abtest', check: async p => {
      if ((await p.textContent('.ab-verdict')) !== 'Version B is very likely better.' || !/Chance it is really better: 98%/.test(await p.textContent('.dm-note'))) throw new Error('verdict wrong: ' + await p.textContent('.dm-note'));
      await p.fill('[data-f="b.conversions"]', '175');
      if ((await p.textContent('.ab-verdict')) !== 'Not enough evidence yet to pick one.' || !/more visitors each would usually settle it/.test(await p.textContent('.dm-note'))) throw new Error('weak result wrong: ' + await p.textContent('.ab-verdict'));
      return 'clear winner, weak result, visitors still needed';
  } },
  { url: '/templates/donut/', name: 'donut', check: async p => {
      if (!/Total 40 courses\. Largest: Maths \(30%\), then Business \(20%\)/.test(await p.textContent('.db-note'))) throw new Error('summary wrong: ' + await p.textContent('.db-note'));
      await p.focus('svg [data-k="coding"]'); await p.keyboard.press('Enter');
      if (!/Coding: 7 courses, 18% of the total — number 3 of 9/.test(await p.textContent('.db-note'))) throw new Error('slice wrong: ' + await p.textContent('.db-note'));
      await p.focus('svg [data-k="coding"]'); await p.keyboard.press('Enter');
      await p.click('[data-key="maths"]');
      if (!/Total 28 courses \(with 1 hidden\)\. Largest: Business \(29%\)/.test(await p.textContent('.db-note'))) throw new Error('hide wrong: ' + await p.textContent('.db-note'));
      await p.click('[data-table]');
      if ((await p.locator('.db-table tbody tr').count()) !== 8) throw new Error('table wrong');
      return 'shares, a slice in words, hide a part, table view';
  } },
  { url: '/templates/barchart/', name: 'barchart', check: async p => {
      if (!/Highest: Maths \(48 in all\)\. Lowest: Vosa \(language\) \(4\)\. Courses totals 40; Chapters totals 109/.test(await p.textContent('.db-note'))) throw new Error('summary wrong: ' + await p.textContent('.db-note'));
      await p.focus('svg [data-k="0:1"]'); await p.keyboard.press('Enter');
      if (!/Maths, Chapters: 36 \(75% of Maths’s total 48\)/.test(await p.textContent('.db-note'))) throw new Error('bar wrong: ' + await p.textContent('.db-note'));
      await p.click('[data-mode="stacked"]');
      if ((await p.getAttribute('[data-mode="stacked"]', 'aria-pressed')) !== 'true') throw new Error('stacked failed');
      await p.click('[data-table]');
      if (!/Total/.test(await p.textContent('.db-table thead')) || (await p.locator('.db-table tbody tr').count()) !== 9) throw new Error('table wrong');
      return 'totals in words, a bar in words, stacked, table view';
  } },
  { url: '/templates/linechart/', name: 'linechart', check: async p => {
      if (!/Suva: 11 h \(18 Jun\) to 13\.2 h \(24 Dec\); Auckland: .*London: 7\.8 h/.test(await p.textContent('.db-note'))) throw new Error('summary wrong: ' + await p.textContent('.db-note'));
      await p.focus('.db-view svg'); await p.keyboard.press('Home');
      if (!/^1 Jan: Suva 13\.\d h, Auckland 1\d\.\d h, London \d\.\d h/.test(await p.textContent('.db-note'))) throw new Error('first point wrong: ' + await p.textContent('.db-note'));
      await p.click('[data-key="london"]');
      if (/London/.test(await p.textContent('.db-note'))) throw new Error('hide failed');
      return 'ranges in words, read every line at a point, hide a line';
  } },
  { url: '/templates/areachart/', name: 'areachart', check: async p => {
      if (!/^Total \$[\d,]+ at Jan, \$[\d,]+ at Dec\. Biggest gain in share: /.test(await p.textContent('.db-note'))) throw new Error('summary wrong: ' + await p.textContent('.db-note'));
      await p.click('[data-mode="share"]');
      await p.focus('.db-view svg'); await p.keyboard.press('End');
      if (!/^Dec: Food \d+%, Rent \d+%/.test(await p.textContent('.db-note'))) throw new Error('share wrong: ' + await p.textContent('.db-note'));
      return 'totals in words, shares of 100%, read a point';
  } },
  { url: '/templates/combochart/', name: 'combochart', check: async p => {
      if (!/Most rainfall in Mar \(360 mm\); highest average temperature in Feb \(27\.4 °C\)\. The two tend to rise and fall together/.test(await p.textContent('.db-note'))) throw new Error('summary wrong: ' + await p.textContent('.db-note'));
      await p.focus('.db-view svg'); await p.keyboard.press('End');
      if (!/^Dec: rainfall 290 mm, average temperature 26\.6 °C/.test(await p.textContent('.db-note'))) throw new Error('point wrong: ' + await p.textContent('.db-note'));
      return 'peaks and link in words, read a period';
  } },
  { url: '/templates/waffle/', name: 'waffle', check: async p => {
      if ((await p.locator('.db-view svg rect').count()) !== 100) throw new Error('expected 100 squares');
      if (!/Each square is 1% of 133 templates\. Marked example figures \d+, Real data \d+, Worked out from real formulas \d+ squares/.test(await p.textContent('.db-note'))) throw new Error('summary wrong: ' + await p.textContent('.db-note'));
      await p.focus('svg [data-k="real"]'); await p.keyboard.press('Enter');
      if (!/Real data: \d+ templates — \d+ in every 100/.test(await p.textContent('.db-note'))) throw new Error('part wrong: ' + await p.textContent('.db-note'));
      return '100 squares rounded fairly, a part in words';
  } },
  { url: '/templates/matchup/', name: 'matchup', check: async p => {
      await p.click('[data-side="a"][data-id="fj"]'); await p.click('[data-side="b"][data-id="fj"]');
      if (!/Right: Fiji goes with Suva\. 1 of 8 matched/.test(await p.textContent('.de-note'))) throw new Error('right match wrong: ' + await p.textContent('.de-note'));
      await p.click('[data-side="a"][data-id="ws"]'); await p.click('[data-side="b"][data-id="to"]');
      if (!/Not quite: Samoa does not go with Nukuʻalofa\. 1 of 8 matched, 1 miss/.test(await p.textContent('.de-note'))) throw new Error('miss wrong: ' + await p.textContent('.de-note'));
      for (const id of ['ws', 'to', 'vu', 'sb', 'pg', 'tv', 'ki']) { await p.click('[data-side="a"][data-id="' + id + '"]'); await p.click('[data-side="b"][data-id="' + id + '"]'); }
      if (!/All 8 matched with 1 miss/.test(await p.textContent('.de-note'))) throw new Error('finish wrong: ' + await p.textContent('.de-note'));
      return 'right match, a miss, all matched';
  } },
  { url: '/templates/sequence/', name: 'sequence', check: async p => {
      const first = await p.textContent('.sq li:first-child .t');
      await p.click('.sq li:first-child [aria-label^="Move"][aria-label$="down"]');
      if ((await p.textContent('.sq li:first-child .t')) === first) throw new Error('move failed');
      await p.click('[data-check]');
      if (!/\d of 7 in the right place|All 7 in the right place/.test(await p.textContent('.de-note'))) throw new Error('check wrong: ' + await p.textContent('.de-note'));
      await p.click('[data-show]');
      if (!/^Lapita voyagers/.test(await p.textContent('.sq li:first-child .t')) || !/about 1000 BCE/.test(await p.textContent('.sq li:first-child .t')) || (await p.locator('.sq li.ok').count()) !== 7) throw new Error('answer wrong');
      return 'move with buttons, check, show the answer with dates';
  } },
  { url: '/templates/fillgap/', name: 'fillgap', check: async p => {
      const right = ['savings', 'interest', 'cost of the loan', 'budget', 'kilo'];
      for (let i = 0; i < 5; i++) await p.selectOption('select[data-g="' + i + '.0"]', right[i]);
      await p.click('[data-check]');
      if (!/All 5 right\./.test(await p.textContent('.de-note'))) throw new Error('all right wrong: ' + await p.textContent('.de-note'));
      await p.selectOption('select[data-g="0.0"]', 'interest'); await p.click('[data-check]');
      if (!/4 of 5 right\./.test(await p.textContent('.de-note')) || await p.isHidden('[data-why="0"]')) throw new Error('hint wrong: ' + await p.textContent('.de-note'));
      return 'all right, one wrong with a hint';
  } },
  { url: '/templates/estimator/', name: 'estimator', check: async p => {
      await p.$eval('.es input[type=range]', i => { i.value = 13.2; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await p.click('[data-lock]');
      if (!/The answer is 13\.2 hours; you said 13\.2 hours — spot on\. 100 points\./.test(await p.textContent('.de-note'))) throw new Error('first answer wrong: ' + await p.textContent('.de-note'));
      await p.click('[data-next]');
      await p.$eval('.es input[type=range]', i => { i.value = 1000; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await p.click('[data-lock]');
      if (!/The answer is 2,110 km; you said 1,000 km — 1,110 km too low/.test(await p.textContent('.de-note'))) throw new Error('second answer wrong: ' + await p.textContent('.de-note'));
      for (let i = 0; i < 3; i++) { await p.click('[data-next]'); await p.click('[data-lock]'); }
      await p.click('[data-next]');
      if (!/Your score: \d+ out of 100/.test(await p.textContent('.es'))) throw new Error('score page wrong');
      return 'spot on, too low, final score';
  } },
  { url: '/templates/masterygrid/', name: 'masterygrid', check: async p => {
      if (!/27% of skills are “got it”\. Most help needed with fractions \(4 of 8\), then measuring \(3\)/.test(await p.textContent('.de-note'))) throw new Error('summary wrong: ' + await p.textContent('.de-note'));
      await p.click('[data-cell="1:5"]');
      if (!/Learner B, money: not started\. 2 others also need help with this: Learner C, Learner E/.test(await p.textContent('.de-note'))) throw new Error('cell wrong: ' + await p.textContent('.de-note'));
      await p.click('[data-help]');
      if ((await p.locator('.mg tbody tr').count()) !== 7) throw new Error('help filter wrong: ' + await p.locator('.mg tbody tr').count());
      return 'summary, who else needs the same help, only who needs help';
  } },
  { url: '/templates/leitner/', name: 'leitner', check: async p => {
      await p.click('.lt-card');
      if (!/Suva/.test(await p.textContent('.lt-card'))) throw new Error('flip failed');
      await p.click('[data-knew="0"]');
      if ((await p.textContent('.lt-box:first-child b')) !== '8') throw new Error('did not stay in box 1');
      for (let i = 0; i < 16; i++) { await p.click('.lt-card'); await p.click('[data-knew="1"]'); }
      if (!/All 8 cards are in the last box/.test(await p.textContent('.de'))) throw new Error('finish wrong: ' + await p.textContent('.de-note'));
      return 'flip, back to box 1, all cards known';
  } },
  { url: '/templates/paysplit/', name: 'paysplit', check: async p => {
      if (!/Of \$2,400 a month: 18% is taken off, 38% goes on bills and 8% is saved, leaving \$848 to spend/.test(await p.textContent('.df-note'))) throw new Error('summary wrong: ' + await p.textContent('.df-note'));
      await p.click('[data-per="week"]');
      if (!/Of \$554 a week/.test(await p.textContent('.df-note'))) throw new Error('per week wrong: ' + await p.textContent('.df-note'));
      await p.click('[data-per="month"]');
      await p.focus('svg [data-k="rent"]'); await p.keyboard.press('Enter');
      if (!/Rent: \$650 a month \(27% of pay\)/.test(await p.textContent('.df-note'))) throw new Error('part wrong: ' + await p.textContent('.df-note'));
      return 'shares in words, per week, a part in words';
  } },
  { url: '/templates/budgetplan/', name: 'budgetplan', check: async p => {
      if (!/needs are \$170 over the plan; savings are \$160 short of the plan\. \$130 of income is not yet given a job/.test(await p.textContent('.df-note'))) throw new Error('summary wrong: ' + await p.textContent('.df-note'));
      await p.fill('[data-i="5"]', '360');
      if (/savings are/.test(await p.textContent('.df-note')) || !/\$30 more is planned than comes in/.test(await p.textContent('.df-note'))) throw new Error('edit wrong: ' + await p.textContent('.df-note'));
      return 'over and short in words, live editing';
  } },
  { url: '/templates/debtplan/', name: 'debtplan', check: async p => {
      if (!/Paying \$290 a month on \$6,300 of debt\. Highest interest first saves \$65 in interest; smallest first clears the first debt sooner \(month 5\)/.test(await p.textContent('.df-note'))) throw new Error('summary wrong: ' + await p.textContent('.df-note'));
      if ((await p.locator('.df-card').count()) !== 2 || !/2 yr 2 mo/.test(await p.textContent('.df-cards'))) throw new Error('cards wrong: ' + await p.textContent('.df-cards'));
      await p.$eval('.df-range input', i => { i.value = 300; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/Paying \$490 a month/.test(await p.textContent('.df-note'))) throw new Error('extra wrong');
      return 'both methods compared, extra payment';
  } },
  { url: '/templates/sendmoney/', name: 'sendmoney', check: async p => {
      if (!/most arrives with Provider A — 383\.50 FJD\. Lost: 6\.65 FJD to the fee and 8\.85 FJD to the exchange rate \(3\.9% in all\)/.test(await p.textContent('.df-note'))) throw new Error('summary wrong: ' + await p.textContent('.df-note'));
      await p.fill('.df-field input', '50');
      if (!/most arrives with Provider B — 63\.50 FJD/.test(await p.textContent('.df-note'))) throw new Error('small amount wrong: ' + await p.textContent('.df-note'));
      return 'best provider, losses split, fixed fees on small sends';
  } },
  { url: '/templates/cashcalendar/', name: 'cashcalendar', check: async p => {
      if (!/Starts at \$180, ends at \$470\. Lowest: −\$420 on 1 Dec — the account goes below zero/.test(await p.textContent('.df-note'))) throw new Error('summary wrong: ' + await p.textContent('.df-note'));
      await p.uncheck('[data-e="1"]');
      if (!/Lowest: \$180 on 1 Dec\./.test(await p.textContent('.df-note'))) throw new Error('untick wrong: ' + await p.textContent('.df-note'));
      await p.focus('.df svg'); await p.keyboard.press('End');
      if (!/^31 Dec: balance \$1,070/.test(await p.textContent('.df-note'))) throw new Error('day wrong: ' + await p.textContent('.df-note'));
      return 'below zero warning, bill off, any day';
  } },
  { url: '/templates/pricerise/', name: 'pricerise', check: async p => {
      if (!/If prices rise 4% a year, \$100 kept as cash buys only what \$68 buys today after 10 years/.test(await p.textContent('.df-note'))) throw new Error('summary wrong: ' + await p.textContent('.df-note'));
      if (!/\$148/.test(await p.textContent('.df-cards')) || !/18 years/.test(await p.textContent('.df-cards'))) throw new Error('cards wrong: ' + await p.textContent('.df-cards'));
      await p.$eval('[data-r]', i => { i.value = 0; i.dispatchEvent(new Event('input', { bubbles: true })); });
      if (!/never/.test(await p.textContent('.df-cards'))) throw new Error('zero rate wrong');
      return 'what money buys, needed to keep up, doubling time';
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
