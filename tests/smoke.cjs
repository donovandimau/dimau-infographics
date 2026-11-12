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
      await p.waitForFunction(() => document.querySelectorAll('[data-di-template]').length === 18, null, { timeout: 8000 });
      return '18 live templates mounted';
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
      if (await p.locator('.tl-row').count() !== 14) throw new Error('expected root and 13 families: ' + await p.locator('.tl-row').count());
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
      if (!/From 4 templates in v1\.0 to 67 templates in v1\.11\. Biggest layer now: Charts/.test(await p.textContent('.dv-note'))) throw new Error('summary wrong: ' + await p.textContent('.dv-note'));
      await p.click('.dv-legend [data-s="learn"]');
      if (!/Learn: 6 templates in v1\.11 \(9% of the total\), first appearing in v1\.7/.test(await p.textContent('.dv-note'))) throw new Error('layer wrong: ' + await p.textContent('.dv-note'));
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
