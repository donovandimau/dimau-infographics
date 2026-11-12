/*! Tools 1.0 · Dimau Infographics
 *  Six everyday helpers:
 *    Worldclock   places side by side on one 24-hour line, with working hours; slide to an hour to see every local time.
 *    Lifegrid     a life as a grid of months, coloured by stage; tap a year for what it holds.
 *    Settleup     shared costs: who paid, who owes, and the fewest payments that settle it.
 *    Unitprice    which pack is the best value, worked out per kilo, litre or item; enter how much you need.
 *    Seatarc      seats in a half circle, grouped by party or side; build a group and see if it is a majority.
 *    Leaderboard  standings round by round, with who moved up or down; slide through the rounds.
 *
 *  new Worldclock(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Worldclock', 'Lifegrid', 'Settleup', 'Unitprice', 'Seatarc', 'Leaderboard'].forEach(function (k) { root[k] = m[k]; }); root.DimauTools = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#c2563a', '#6a7f2a'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const money = (n, p, dec) => (n < 0 ? '−' : '') + (p || '') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: dec == null ? 2 : dec, maximumFractionDigits: dec == null ? 2 : dec });
  const pct = n => Math.round(n * 100) + '%';
  const hm = h => { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  /** Hours ahead of UTC for a time zone at a moment (uses the browser's time zone data). */
  function tzOffset(tz, t) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t)), g = k => +p.find(x => x.type === k).value;
    return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - Math.floor(t / 60000) * 60000) / 3600000;
  }

  const STYLE = `
.dj{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dj) button{font:inherit;color:inherit}
.dj :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dj svg{display:block;width:100%}
.dj svg [data-k]{cursor:pointer}
.dj svg [data-k]:focus{outline:none}
.dj svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dj-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dj-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.dj-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dj-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dj-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dj-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.dj-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700}
.dj-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.dj-field{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;margin:0 0 12px}
.dj-field input{width:110px;height:36px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 10px;font:inherit;font-size:14px;color:inherit}
.su-list{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px}
.su-list label{display:flex;gap:10px;align-items:center;font-size:13.5px;background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);border-radius:9px;padding:7px 10px;cursor:pointer}
.su-list input{width:18px;height:18px;accent-color:var(--di-accent,#0b6fa4)}
.su-list small{margin-left:auto;font-family:var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
.su-pay{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}
.su-pay li{font-size:14.5px;background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);border-left:4px solid var(--di-accent,#0b6fa4);border-radius:9px;padding:8px 12px}
.lb{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.lb button{width:100%;display:grid;grid-template-columns:2.2em 1fr auto 3.2em;gap:8px;align-items:center;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:10px;padding:7px 10px;text-align:left;cursor:pointer;font-size:14px;transition:transform .35s ease}
@media (prefers-reduced-motion:reduce){.lb button{transition:none}}
.lb button[aria-pressed="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.lb .pos{font:800 15px/1 var(--di-mono,ui-monospace,monospace)}
.lb .pts{font:700 13px/1 var(--di-mono,ui-monospace,monospace)}
.lb .mv{font:700 12px/1 var(--di-mono,ui-monospace,monospace);text-align:right}
.lb .up{color:#1f8a5b}.lb .down{color:#c2563a}.lb .same{color:var(--di-muted,#4f6578)}
`;
  function injectStyle() {
    if (document.getElementById('dj-style')) return;
    const s = document.createElement('style'); s.id = 'dj-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dj');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _hot(c, fn) {
      c.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) fn(g.dataset.k); });
      c.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && g.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k); } });
    }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._timer && clearInterval(this._timer); this.el.innerHTML = ''; this.el.classList.remove('dj'); }
  }

  /* ======================================================================================
   * Worldclock: places on one 24-hour line
   * data = { places:[{id,label,tz}], home?: id, work?: [9,17] }  options: { now: ms (fixed time, for screenshots and tests) }
   * ====================================================================================== */
  class Worldclock extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { now: null });
      this.places = data.places.map((p, i) => Object.assign({ i }, p)); this.home = data.home || this.places[0].id; this.work = data.work || [9, 17]; this.at = null;
      el.innerHTML = '<label class="dj-range"><span><output></output></span><input type="range" min="0" max="95" step="1"></label><svg role="group"></svg><div class="dj-legend"></div><p class="dj-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dj-legend'); this.$note = el.querySelector('.dj-note');
      this.$in.addEventListener('input', () => { this.at = +this.$in.value / 4; this.render(); this._emit('time', this._times(this.at)); });
      this._hot(this.$svg, k => { this.home = k; this.at = null; this.render(); this._emit('home', { id: k }); });
      if (this.o.now == null) this._timer = setInterval(() => { if (this.at == null) this.render(); }, 60000);
      this.render();
    }
    _now() { return this.o.now != null ? +this.o.now : Date.now(); }
    _off(p) { return tzOffset(p.tz, this._now()); }
    _times(h) { const home = this.places.find(p => p.id === this.home), ho = this._off(home); return this.places.map(p => ({ id: p.id, label: p.label, time: hm(h - ho + this._off(p)) })); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rowH = 40, pl = narrow ? 92 : 150, pr = 8, pt = 22, H = pt + this.places.length * rowH + 6, home = this.places.find(p => p.id === this.home), ho = this._off(home);
      const now = this._now(), nowH = ((now / 3600000 + ho) % 24 + 24) % 24, at = this.at != null ? this.at : nowH, sx = h => pl + (h / 24) * (W - pl - pr);
      let s = '';
      for (let h = 0; h <= 24; h += narrow ? 6 : 3) s += '<text x="' + f1(clamp(sx(h), pl + 10, W - 14)) + '" y="12" text-anchor="middle" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + String(h % 24).padStart(2, '0') + '</text>';
      const [w0, w1] = this.work, inWork = l => l >= w0 && l < w1;
      this.places.forEach((p, r) => {
        const y = pt + r * rowH, d = this._off(p) - ho, isHome = p.id === this.home, local = ((at + d) % 24 + 24) % 24, dayShift = Math.floor((at + d) / 24);
        let cells = '';
        for (let h = 0; h < 24; h++) { const l = ((h + d) % 24 + 24) % 24, night = l < 6 || l >= 21; cells += '<rect x="' + f1(sx(h) + 0.5) + '" y="' + (y + 6) + '" width="' + f1(sx(h + 1) - sx(h) - 1) + '" height="' + (rowH - 14) + '" rx="2" fill="' + (inWork(l) ? T.accent : night ? T.fg : T.line) + '" opacity="' + (inWork(l) ? 0.75 : night ? 0.22 : 0.6) + '"/>' + (!narrow && (l % 3 === 0) ? '<text x="' + f1((sx(h) + sx(h + 1)) / 2) + '" y="' + (y + rowH / 2 + 3) + '" text-anchor="middle" font-size="9" fill="' + (inWork(l) ? '#fff' : T.fg) + '" pointer-events="none">' + l + '</text>' : ''); }
        s += '<g data-k="' + esc(p.id) + '" tabindex="0" role="button" aria-pressed="' + isHome + '" aria-label="' + esc(p.label + ': ' + hm(local) + (dayShift ? (dayShift > 0 ? ', next day' : ', day before') : '') + (isHome ? ' (the time line follows this place)' : '. Make this the place the time line follows.')) + '"><rect x="2" y="' + (y + 3) + '" width="' + (pl - 8) + '" height="' + (rowH - 8) + '" rx="8" fill="' + (isHome ? T.accent : 'transparent') + '" opacity="' + (isHome ? 0.12 : 1) + '"/>' +
          '<text x="10" y="' + (y + 17) + '" font-size="12.5" font-weight="' + (isHome ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(p.label, pl - 20, 12.5)) + '</text><text x="10" y="' + (y + 31) + '" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + hm(local) + (dayShift > 0 ? ' +1' : dayShift < 0 ? ' −1' : '') + '</text></g>' + cells;
      });
      s += '<line x1="' + f1(sx(at)) + '" y1="' + (pt - 4) + '" x2="' + f1(sx(at)) + '" y2="' + (H - 4) + '" stroke="#c2563a" stroke-width="2"/>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Local times in ' + this.places.length + ' places, lined up on ' + home.label + ' time');
      this._keep(this.$svg, s);
      this.$in.value = Math.round(at * 4) % 96; this.$out.textContent = (this.at == null ? 'Now in ' : '') + home.label + ': ' + hm(at); this.$in.setAttribute('aria-valuetext', home.label + ' ' + hm(at));
      this.$leg.innerHTML = '<span><i style="background:' + T.accent + ';opacity:.75"></i>Working hours (' + hm(w0) + '–' + hm(w1) + ')</span><span><i style="background:' + T.fg + ';opacity:.25"></i>Night</span><span><i style="background:#c2563a"></i>' + (this.at == null ? 'Now' : 'Chosen time') + '</span>';
      // hours (in home time) when everyone is in working hours
      const ok = []; for (let q = 0; q < 96; q++) { const h = q / 4; if (this.places.every(p => inWork((((h + this._off(p) - ho) % 24) + 24) % 24))) ok.push(h); }
      const runs = []; ok.forEach(h => { const r = runs[runs.length - 1]; if (r && Math.abs(r[1] - h) < 1e-9) r[1] = h + 0.25; else runs.push([h, h + 0.25]); });
      const best = runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
      const tl = this._times(at).filter(x => x.id !== this.home).map(x => esc(x.label) + ' ' + x.time).join(', ');
      this.$note.innerHTML = '<b>' + hm(at) + ' in ' + esc(home.label) + '</b> is ' + tl + '. ' + (best ? 'Everyone is in working hours from <b>' + hm(best[0]) + ' to ' + hm(best[1]) + '</b> ' + esc(home.label) + ' time.' : 'There is no hour when everyone is in working hours; the shading shows the nearest fits.') + ' Tap a place to line the times up on it.';
    }
  }

  /* ======================================================================================
   * Lifegrid: a life in months
   * data = { born:'YYYY-MM-DD', years?: 80, stages:[{id,label,from,to,color?}], today?:'YYYY-MM-DD', label? }
   * ====================================================================================== */
  class Lifegrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.years = +data.years || 80; this.stages = (data.stages || []).map((s, i) => Object.assign({ i }, s)); this.sel = null;
      const b = new Date(data.born + 'T00:00:00Z'), t = data.today ? new Date(data.today + 'T00:00:00Z') : new Date();
      this.by = b.getUTCFullYear(); this.lived = (t.getUTCFullYear() - b.getUTCFullYear()) * 12 + (t.getUTCMonth() - b.getUTCMonth()) - (t.getUTCDate() < b.getUTCDate() ? 1 : 0);
      el.innerHTML = '<svg role="group"></svg><div class="dj-legend"></div><p class="dj-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dj-legend'); this.$note = el.querySelector('.dj-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { age: this.sel, year: this.by + this.sel }); });
      this.render();
    }
    _stage(age) { return this.stages.find(s => age >= +s.from && age < +s.to); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, cols = W >= 900 ? 48 : W >= 300 ? 24 : 12, perRow = cols / 12, rows = Math.ceil(this.years / perRow), pl = 30, gap = 2, cell = Math.min(14, (W - pl - 6 - (perRow - 1) * 4) / cols - gap), H = rows * (cell + gap) + 4;
      let s = '';
      for (let r = 0; r < rows; r++) {
        const y = 2 + r * (cell + gap);
        if ((r * perRow) % 10 === 0) s += '<text x="' + (pl - 6) + '" y="' + f1(y + cell - 2) + '" text-anchor="end" font-size="9.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + (r * perRow) + '</text>';
        for (let yy = 0; yy < perRow; yy++) {
          const age = r * perRow + yy; if (age >= this.years) break;
          const st = this._stage(age), c = st ? colorFor(this.el, st, st.i) : T.muted, on = this.sel === age, dim = this.sel != null && !on;
          let boxes = '';
          for (let m = 0; m < 12; m++) { const k = age * 12 + m, x = pl + (yy * 12 + m) * (cell + gap) + yy * 4, past = k < this.lived, nowM = k === this.lived; boxes += '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(cell) + '" height="' + f1(cell) + '" rx="2" fill="' + (past ? c : T.surface) + '" stroke="' + (nowM ? T.fg : c) + '" stroke-width="' + (nowM ? 2 : 1) + '" opacity="' + (dim ? 0.3 : past ? 0.9 : 0.6) + '"/>'; }
          const x0 = pl + yy * 12 * (cell + gap) + yy * 4;
          s += '<g data-k="' + age + '" tabindex="' + (age % 10 === 0 || age === Math.floor(this.lived / 12) ? 0 : -1) + '" role="button" aria-pressed="' + on + '" aria-label="' + esc('Age ' + age + ', ' + (this.by + age) + (st ? ': ' + st.label : '')) + '"><rect x="' + f1(x0 - 1) + '" y="' + f1(y - 1) + '" width="' + f1(12 * (cell + gap)) + '" height="' + f1(cell + 2) + '" fill="transparent"' + (on ? ' stroke="' + T.fg + '" stroke-width="1.5"' : '') + '/>' + boxes + '</g>';
        }
      }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + f1(H)); this.$svg.style.height = f1(H) + 'px';
      this.$svg.setAttribute('aria-label', 'A life of ' + this.years + ' years in months: ' + this.lived + ' filled in so far');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = this.stages.map(st => '<span><i style="background:' + esc(colorFor(this.el, st, st.i)) + '"></i>' + esc(st.label) + ' (' + st.from + '–' + st.to + ')</span>').join('') + '<span><i style="background:' + T.surface + ';border:1px solid ' + T.muted + '"></i>Still to come</span>';
      const tot = this.years * 12, age = Math.floor(this.lived / 12), cur = this._stage(age);
      if (this.sel != null) { const st = this._stage(this.sel), m0 = this.sel * 12, done = clamp(this.lived - m0, 0, 12); this.$note.innerHTML = '<b>Age ' + this.sel + '</b> (' + (this.by + this.sel) + '–' + (this.by + this.sel + 1) + ')' + (st ? ': ' + esc(st.label.toLowerCase()) : '') + '. ' + (done >= 12 ? 'Lived.' : done > 0 ? done + ' of its 12 months lived.' : 'Still to come, in ' + (this.sel - age) + ' year' + (this.sel - age === 1 ? '' : 's') + '.'); }
      else this.$note.innerHTML = (this.data.label ? esc(this.data.label) + ': ' : '') + '<b>' + this.lived.toLocaleString() + '</b> of ' + tot.toLocaleString() + ' months (' + pct(this.lived / tot) + ' of ' + this.years + ' years). Age ' + age + (cur ? ', ' + esc(cur.label.toLowerCase()) : '') + '; <b>' + (tot - this.lived).toLocaleString() + '</b> months to come. Each square is a month; tap a row for that year.';
    }
  }

  /* ======================================================================================
   * Settleup: shared costs and the fewest payments
   * data = { prefix?, people:[{id,label}], expenses:[{id,label,by,amount,for?:[ids]}] }
   * ====================================================================================== */
  function settle(people, exps) {
    const bal = Object.fromEntries(people.map(p => [p.id, { paid: 0, share: 0 }]));
    exps.forEach(e => { const f = e.for && e.for.length ? e.for : people.map(p => p.id), each = +e.amount / f.length; bal[e.by].paid += +e.amount; f.forEach(id => { bal[id].share += each; }); });
    const net = people.map(p => ({ id: p.id, v: Math.round((bal[p.id].paid - bal[p.id].share) * 100) / 100 }));
    const cr = net.filter(x => x.v > 0.004).map(x => Object.assign({}, x)).sort((a, b) => b.v - a.v), db = net.filter(x => x.v < -0.004).map(x => ({ id: x.id, v: -x.v })).sort((a, b) => b.v - a.v), pays = [];
    while (cr.length && db.length) { const c = cr[0], d = db[0], a = Math.min(c.v, d.v); pays.push({ from: d.id, to: c.id, amount: Math.round(a * 100) / 100 }); c.v -= a; d.v -= a; if (c.v < 0.005) cr.shift(); if (d.v < 0.005) db.shift(); cr.sort((a, b) => b.v - a.v); db.sort((a, b) => b.v - a.v); }
    return { bal, net, pays };
  }
  class Settleup extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.people = data.people.map((p, i) => Object.assign({ i }, p)); this.exps = data.expenses.map((e, i) => Object.assign({ i, on: true }, e)); this.sel = null;
      const P = data.prefix || '';
      el.innerHTML = '<ul class="su-list">' + this.exps.map(e => { const who = this.people.find(p => p.id === e.by); return '<li><label><input type="checkbox" checked data-e="' + e.i + '">' + esc(e.label) + ' <span style="color:var(--di-muted)">paid by ' + esc(who ? who.label : e.by) + (e.for && e.for.length < this.people.length ? ', shared by ' + e.for.length : '') + '</span><small>' + esc(money(+e.amount, P)) + '</small></label></li>'; }).join('') + '</ul><svg role="group"></svg><ol class="su-pay"></ol><p class="dj-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$pay = el.querySelector('.su-pay'); this.$note = el.querySelector('.dj-note');
      el.querySelector('.su-list').addEventListener('change', e => { const c = e.target.closest('[data-e]'); if (!c) return; this.exps[+c.dataset.e].on = c.checked; this.render(); this._emit('change', { payments: this._r.pays }); });
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { id: k }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), P = this.data.prefix || '', W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, r = this._r = settle(this.people, this.exps.filter(e => e.on)), rowH = 32, H = this.people.length * rowH + 8, pl = narrow ? 70 : 110, mid = pl + (W - pl - 10) / 2, max = Math.max(1, ...r.net.map(x => Math.abs(x.v))), sc = (W - pl - 10) / 2 - 50;
      const name = id => (this.people.find(p => p.id === id) || {}).label || id;
      let s = '<line x1="' + f1(mid) + '" y1="2" x2="' + f1(mid) + '" y2="' + (H - 2) + '" stroke="' + T.muted + '"/>';
      r.net.forEach((x, k) => {
        const y = 4 + k * rowH, w = (Math.abs(x.v) / max) * sc, pos = x.v >= 0, on = this.sel === x.id, dim = this.sel && !on;
        s += '<g data-k="' + esc(x.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(name(x.id) + (Math.abs(x.v) < 0.005 ? ': even' : pos ? ': is owed ' + money(x.v, P) : ': owes ' + money(-x.v, P))) + '" opacity="' + (dim ? 0.35 : 1) + '"><rect x="' + f1(pos ? mid : mid - w) + '" y="' + (y + 5) + '" width="' + f1(Math.max(2, w)) + '" height="' + (rowH - 10) + '" rx="4" fill="' + (pos ? '#1f8a5b' : '#c2563a') + '" opacity=".8"/><rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          '<text x="' + (pl - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end" font-size="12.5" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(name(x.id), pl - 12, 12.5)) + '</text><text x="' + f1(pos ? mid + w + 6 : mid - w - 6) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="' + (pos ? 'start' : 'end') + '" font-size="11.5" font-weight="700" fill="' + (pos ? '#1f8a5b' : '#c2563a') + '" font-family="' + esc(T.mono) + '">' + (Math.abs(x.v) < 0.005 ? 'even' : (pos ? '+' : '') + esc(money(x.v, P))) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Who is owed (right) and who owes (left)');
      this._keep(this.$svg, s);
      this.$pay.innerHTML = r.pays.map(p => '<li><b>' + esc(name(p.from)) + '</b> pays <b>' + esc(name(p.to)) + '</b> ' + esc(money(p.amount, P)) + '</li>').join('');
      const tot = this.exps.filter(e => e.on).reduce((a, e) => a + +e.amount, 0);
      if (this.sel) { const b = r.bal[this.sel], n = r.net.find(x => x.id === this.sel).v; this.$note.innerHTML = '<b>' + esc(name(this.sel)) + '</b> paid ' + money(b.paid, P) + ' and their share is ' + money(b.share, P) + ', so they ' + (Math.abs(n) < 0.005 ? 'are even.' : n > 0 ? 'are owed <b>' + money(n, P) + '</b>.' : 'owe <b>' + money(-n, P) + '</b>.'); }
      else this.$note.innerHTML = money(tot, P) + ' spent by ' + this.people.length + ' people. ' + (r.pays.length ? '<b>' + r.pays.length + ' payment' + (r.pays.length === 1 ? '' : 's') + '</b> settle everything, listed above.' : 'Everyone is even.') + ' Untick a cost to leave it out, or tap a person.';
    }
  }

  /* ======================================================================================
   * Unitprice: best value per unit
   * data = { prefix?, unit:'kg'|'l'|'item', items:[{id,label,price,size,unit?}], need? }
   * ====================================================================================== */
  const UNITS = { g: ['kg', 0.001], kg: ['kg', 1], ml: ['l', 0.001], l: ['l', 1], item: ['item', 1], items: ['item', 1] };
  class Unitprice extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.unit = data.unit || 'kg'; this.items = data.items.map((it, i) => { const u = UNITS[it.unit || this.unit] || [this.unit, 1]; return Object.assign({ i }, it, { qty: +it.size * u[1] }); }); this.need = data.need != null ? +data.need : null; this.sel = null;
      el.innerHTML = '<label class="dj-field">I need <input type="number" min="0" step="any" inputmode="decimal"> ' + esc(this.unit === 'item' ? 'items' : this.unit) + '</label><svg role="group"></svg><p class="dj-note" aria-live="polite"></p>';
      this.$need = el.querySelector('input'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dj-note');
      if (this.need != null) this.$need.value = this.need;
      this.$need.addEventListener('input', () => { const v = parseFloat(this.$need.value); this.need = isFinite(v) && v > 0 ? v : null; this.render(); this._emit('need', { need: this.need }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items[this.sel].id }); });
      this.render();
    }
    _cost(it) { if (this.need == null) return null; const n = Math.ceil(this.need / it.qty - 1e-9); return { packs: n, cost: n * +it.price, get: n * it.qty }; }
    render() {
      const T = themeOf(this.el), P = this.data.prefix || '', U = this.unit === 'item' ? 'item' : this.unit, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rowH = narrow ? 50 : 40, pl = narrow ? 8 : 170, pr = 80;
      const per = it => +it.price / it.qty, list = this.items.slice().sort(this.need != null ? (a, b) => this._cost(a).cost - this._cost(b).cost || per(a) - per(b) : (a, b) => per(a) - per(b)), best = list[0], max = Math.max(...this.items.map(per)), H = list.length * rowH + 6;
      let s = '';
      list.forEach((it, k) => {
        const y = 3 + k * rowH, top = narrow ? y + 20 : y + 6, w = ((W - pl - pr) * per(it)) / max, on = this.sel === it.i, dim = this.sel != null && !on, isBest = it === best, c = this._cost(it);
        s += '<g data-k="' + it.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(it.label + ': ' + money(+it.price, P) + ' for ' + it.size + ' ' + (it.unit || this.unit) + ', ' + money(per(it), P) + ' per ' + U + (isBest ? ', best value' : '')) + '" opacity="' + (dim ? 0.4 : 1) + '"><rect x="' + pl + '" y="' + top + '" width="' + f1(Math.max(2, w)) + '" height="' + (rowH - (narrow ? 26 : 14)) + '" rx="4" fill="' + (isBest ? '#1f8a5b' : T.accent) + '" opacity="' + (isBest ? 0.9 : 0.6) + '"/><rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          (narrow ? '<text x="' + pl + '" y="' + (y + 14) + '" font-size="12.5" font-weight="' + (isBest || on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(it.label) + (isBest ? ' ★' : '') + '</text>' : '<text x="' + (pl - 10) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end" font-size="12.5" font-weight="' + (isBest || on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(it.label, pl - 30, 12.5)) + (isBest ? ' ★' : '') + '</text>') +
          '<text x="' + f1(pl + w + 6) + '" y="' + f1(top + (rowH - (narrow ? 26 : 14)) / 2 + 4) + '" font-size="11.5" font-weight="700" fill="' + T.fg + '" font-family="' + esc(T.mono) + '">' + esc(money(per(it), P)) + '/' + esc(U) + '</text>' +
          (c ? '<text x="' + (W - 4) + '" y="' + f1(narrow ? y + 14 : y + rowH / 2 + 4) + '" text-anchor="end" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + c.packs + '× = ' + esc(money(c.cost, P)) + '</text>' : '') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.items.length + ' options, cheapest per ' + U + ' first');
      this._keep(this.$svg, s);
      const worst = this.items.reduce((a, b) => (per(b) > per(a) ? b : a));
      if (this.sel != null) { const it = this.items[this.sel], c = this._cost(it); this.$note.innerHTML = '<b>' + esc(it.label) + '</b>: ' + money(+it.price, P) + ' for ' + it.size + ' ' + esc(it.unit || this.unit) + ' = ' + money(per(it), P) + ' per ' + esc(U) + (it === best ? ', the best value.' : ', ' + pct(per(it) / per(best) - 1) + ' more per ' + esc(U) + ' than ' + esc(best.label) + '.') + (c ? ' For ' + this.need + ' ' + esc(this.unit === 'item' ? 'items' : this.unit) + ': ' + c.packs + ' × = ' + money(c.cost, P) + (c.get > this.need + 1e-9 ? ' (you get ' + f1(c.get) + ')' : '') + '.' : ''); }
      else if (this.need != null) { const c = this._cost(best); this.$note.innerHTML = 'For <b>' + this.need + ' ' + esc(this.unit === 'item' ? 'items' : this.unit) + '</b>, the cheapest way is <b>' + c.packs + ' × ' + esc(best.label) + '</b> for ' + money(c.cost, P) + (c.get > this.need + 1e-9 ? ' (you get ' + f1(c.get) + ')' : '') + '. Most expensive: ' + esc(list[list.length - 1].label) + ' (' + money(this._cost(list[list.length - 1]).cost, P) + ').'; }
      else this.$note.innerHTML = 'Best value: <b>' + esc(best.label) + '</b> at ' + money(per(best), P) + ' per ' + esc(U) + '. ' + esc(worst.label) + ' costs ' + pct(per(worst) / per(best) - 1) + ' more per ' + esc(U) + '. Enter how much you need to compare what you would actually pay.';
    }
  }

  /* ======================================================================================
   * Seatarc: seats in a half circle; build a majority
   * data = { parties:[{id,label,seats,color?}], majority?, label? }
   * ====================================================================================== */
  class Seatarc extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.parties = data.parties.map((p, i) => Object.assign({ i }, p, { seats: +p.seats })); this.total = this.parties.reduce((a, p) => a + p.seats, 0); this.need = +data.majority || Math.floor(this.total / 2) + 1; this.group = new Set(); this.sel = null;
      el.innerHTML = '<svg role="group"></svg><div class="dj-bar"></div><p class="dj-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$bar = el.querySelector('.dj-bar'); this.$note = el.querySelector('.dj-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; const id = b.dataset.p; this.group.has(id) ? this.group.delete(id) : this.group.add(id); this.render(); this._emit('group', { parties: [...this.group], seats: this._gs(), majority: this._gs() >= this.need }); });
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); });
      this.render();
    }
    _gs() { return this.parties.filter(p => this.group.has(p.id)).reduce((a, p) => a + p.seats, 0); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, N = this.total, R = Math.min(W / 2 - 16, narrow ? 170 : 260), H = R + 46, cx = W / 2, cy = R + 14;
      // rows of seats: pick the number of rows where the gap along a row best matches the gap between rows
      const r0 = R * 0.38, fit = n => { const rs = Array.from({ length: n }, (_, i) => (n === 1 ? (r0 + R) / 2 : r0 + ((R - r0) * i) / (n - 1))), sum = rs.reduce((a, b) => a + b, 0), per = rs.map(r => Math.max(1, Math.round((N * r) / sum))); per[n - 1] += N - per.reduce((a, b) => a + b, 0); const dr = n > 1 ? (R - r0) / (n - 1) : R - r0, arc = (Math.PI * rs[0]) / Math.max(1, per[0] - 1); return { rs, per, dr, arc, score: Math.abs(Math.log(arc / dr)) }; };
      let f = fit(1); for (let n = 2; n <= Math.min(30, N); n++) { const g = fit(n); if (g.per.every(x => x > 0) && g.score < f.score) f = g; }
      const seats = []; f.rs.forEach((r, i) => { const n = f.per[i]; for (let j = 0; j < n; j++) { const a = Math.PI - (n === 1 ? Math.PI / 2 : (Math.PI * j) / (n - 1)); seats.push({ a, x: cx + Math.cos(a) * r, y: cy - Math.sin(a) * r }); } });
      seats.sort((p, q) => q.a - p.a || Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy));
      const dot = Math.max(2, Math.min(11, Math.min(f.dr, f.arc) * 0.47));
      let s = '', k = 0;
      this.parties.forEach(p => {
        const c = colorFor(this.el, p, p.i), on = this.sel === p.id, inG = this.group.has(p.id), dim = (this.sel && !on) || (this.group.size && !inG && !this.sel);
        let dots = ''; for (let j = 0; j < p.seats; j++) { const st = seats[k++]; if (st) dots += '<circle cx="' + f1(st.x) + '" cy="' + f1(st.y) + '" r="' + f1(dot) + '" fill="' + c + '"/>'; }
        s += '<g data-k="' + esc(p.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(p.label + ': ' + p.seats + ' seats') + '" opacity="' + (dim ? 0.25 : 1) + '">' + dots + '</g>';
      });
      const gs = this._gs();
      s += '<line x1="' + cx + '" y1="' + f1(cy - R - 2) + '" x2="' + cx + '" y2="' + f1(cy - R * 0.3) + '" stroke="' + T.muted + '" stroke-dasharray="3 3"/><text x="' + cx + '" y="' + f1(cy - 8) + '" text-anchor="middle" font-size="' + (narrow ? 22 : 30) + '" font-weight="800" fill="' + T.fg + '">' + (this.group.size ? gs : N) + '</text><text x="' + cx + '" y="' + f1(cy + dot + 18) + '" text-anchor="middle" font-size="11.5" fill="' + T.muted + '">' + (this.group.size ? 'of ' + this.need + ' needed' : 'seats · ' + this.need + ' for a majority') + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (this.data.label || 'Seats') + ': ' + this.parties.map(p => p.label + ' ' + p.seats).join(', '));
      this._keep(this.$svg, s);
      this.$bar.innerHTML = this.parties.map(p => '<button type="button" class="dj-btn" data-p="' + esc(p.id) + '" aria-pressed="' + this.group.has(p.id) + '"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:' + esc(colorFor(this.el, p, p.i)) + '"></i>' + esc(p.label) + ' ' + p.seats + '</button>').join('');
      const big = this.parties.reduce((a, b) => (b.seats > a.seats ? b : a));
      if (this.sel) { const p = this.parties.find(x => x.id === this.sel); this.$note.innerHTML = '<b>' + esc(p.label) + '</b>: ' + p.seats + ' of ' + N + ' seats (' + pct(p.seats / N) + '). ' + (p.seats >= this.need ? 'A majority on its own.' : (this.need - p.seats) + ' short of a majority on its own.'); }
      else if (this.group.size) this.$note.innerHTML = 'Together: <b>' + gs + ' seats</b>. ' + (gs >= this.need ? '<b>That is a majority</b> (' + (gs - this.need) + ' to spare).' : '<b>' + (this.need - gs) + ' short</b> of the ' + this.need + ' needed.') + ' Add or remove a group with the buttons.';
      else this.$note.innerHTML = '<b>' + N + '</b> seats; ' + this.need + ' make a majority. Largest: <b>' + esc(big.label) + '</b> (' + big.seats + ')' + (big.seats >= this.need ? ', a majority on its own.' : ', ' + (this.need - big.seats) + ' short on its own.') + ' Tap the buttons to build a group and see if it reaches a majority.';
    }
  }

  /* ======================================================================================
   * Leaderboard: standings round by round
   * data = { rounds:[labels], entries:[{id,label,scores:[points per round]}], unit? }  options: { round: last }
   * ====================================================================================== */
  class Leaderboard extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { round: null });
      this.entries = data.entries.map((e, i) => Object.assign({ i }, e)); this.R = data.rounds.length; this.r = this.o.round != null ? this.o.round : this.R - 1; this.sel = null;
      el.innerHTML = '<label class="dj-range"><span>After <output></output></span><input type="range" min="0" max="' + (this.R - 1) + '" step="1" value="' + this.r + '"></label><ol class="lb" aria-live="polite"></ol><p class="dj-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$list = el.querySelector('.lb'); this.$note = el.querySelector('.dj-note');
      this.$in.addEventListener('input', () => { this.r = +this.$in.value; this.render(); this._emit('round', { round: this.data.rounds[this.r] }); });
      this.$list.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; this.sel = this.sel === b.dataset.id ? null : b.dataset.id; this.render(); if (this.sel) this._emit('select', { id: this.sel }); const n = this.$list.querySelector('[data-id="' + CSS.escape(b.dataset.id) + '"]'); n && n.focus(); });
      this.render();
    }
    _table(r) {
      const t = this.entries.map(e => ({ e, pts: e.scores.slice(0, r + 1).reduce((a, b) => a + (+b || 0), 0), last: +e.scores[r] || 0 })).sort((a, b) => b.pts - a.pts || b.last - a.last || String(a.e.label).localeCompare(b.e.label));
      t.forEach((x, k) => { x.pos = k && t[k - 1].pts === x.pts && t[k - 1].last === x.last ? t[k - 1].pos : k + 1; }); return t;
    }
    render() {
      const unit = this.data.unit || 'pts', now = this._table(this.r), prev = this.r ? this._table(this.r - 1) : null, posOf = (t, id) => t.find(x => x.e.id === id).pos;
      const old = {}; this.$list.querySelectorAll('[data-id]').forEach(b => { old[b.dataset.id] = b.getBoundingClientRect().top; });
      this.$list.innerHTML = now.map(x => { const mv = prev ? posOf(prev, x.e.id) - x.pos : 0, cls = mv > 0 ? 'up' : mv < 0 ? 'down' : 'same'; return '<li><button type="button" data-id="' + esc(x.e.id) + '" aria-pressed="' + (this.sel === x.e.id) + '" aria-label="' + esc(x.pos + '. ' + x.e.label + ', ' + x.pts + ' ' + unit + (prev ? (mv > 0 ? ', up ' + mv : mv < 0 ? ', down ' + -mv : ', no change') : '')) + '"><span class="pos">' + x.pos + '</span><span>' + esc(x.e.label) + '</span><span class="pts">' + x.pts + '</span><span class="mv ' + cls + '">' + (prev ? (mv > 0 ? '▲' + mv : mv < 0 ? '▼' + -mv : '–') : '') + '</span></button></li>'; }).join('');
      // slide rows from where they were (skipped when motion is reduced)
      if (!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) this.$list.querySelectorAll('[data-id]').forEach(b => { const o = old[b.dataset.id]; if (o == null) return; const d = o - b.getBoundingClientRect().top; if (Math.abs(d) > 1) { b.style.transition = 'none'; b.style.transform = 'translateY(' + d + 'px)'; requestAnimationFrame(() => { b.style.transition = ''; b.style.transform = ''; }); } });
      this.$out.textContent = this.data.rounds[this.r] + ' (' + (this.r + 1) + ' of ' + this.R + ')';
      if (this.sel) { const e = this.entries.find(x => x.id === this.sel), path = this.data.rounds.slice(0, this.r + 1).map((_, k) => posOf(this._table(k), e.id)), best = Math.min(...path), x = now.find(z => z.e.id === e.id); this.$note.innerHTML = '<b>' + esc(e.label) + '</b>: ' + x.pts + ' ' + esc(unit) + ', place ' + x.pos + ' after ' + esc(this.data.rounds[this.r]) + '. Places so far: ' + path.join(' → ') + '. Best: ' + best + '.'; }
      else { let big = null; if (prev) now.forEach(x => { const mv = posOf(prev, x.e.id) - x.pos; if (!big || mv > big.mv) big = { x, mv }; }); this.$note.innerHTML = 'After <b>' + esc(this.data.rounds[this.r]) + '</b>, <b>' + esc(now[0].e.label) + '</b> leads with ' + now[0].pts + ' ' + esc(unit) + (now[1] ? ', ' + (now[0].pts - now[1].pts) + ' ahead of ' + esc(now[1].e.label) : '') + '.' + (big && big.mv > 0 ? ' Biggest climb: ' + esc(big.x.e.label) + ' (up ' + big.mv + ').' : '') + ' Slide through the rounds, or tap a name for its story.'; }
    }
  }

  return { Worldclock, Lifegrid, Settleup, Unitprice, Seatarc, Leaderboard, settle, tzOffset };
});
