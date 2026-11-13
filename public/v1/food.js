/*! Food 1.0 · Dimau Infographics
 *  Six food and growing templates for kitchens, schools, gardens and markets. They work things out; they are not dietary or farming advice.
 *    Recipescale  a recipe for any number of people, with spoons and cups turned into grams and millilitres if wanted.
 *    Seasonwheel  what is in season month by month on a wheel, with the best months darker.
 *    Platesplit   a meal's plate against a plate guide (half vegetables and fruit, a quarter starch, a quarter protein, or any guide).
 *    Labelcard    a nutrition label per 100 g, per serving or any amount, coloured high / medium / low, with the share of a day's reference intake.
 *    Harvestplan  from a sowing date, when each crop is ready and for how long it can be picked.
 *    Servetime    working back from the time food is served: when to start each part, and when the cook's hands are busy.
 *
 *  new Recipescale(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Recipescale', 'Seasonwheel', 'Platesplit', 'Labelcard', 'Harvestplan', 'Servetime'].forEach(function (k) { root[k] = m[k]; }); root.DimauFood = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const DAY = 86400000, RAD = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const pt = s => { const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3]) : NaN; };
  const dateL = ms => { const d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
  const isoD = ms => new Date(ms).toISOString().slice(0, 10);
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };

  const STYLE = `
.fo{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.fo) button{font:inherit;color:inherit}
.fo :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.fo svg{display:block;width:100%}
.fo svg [data-k]{cursor:pointer}
.fo svg [data-k]:focus{outline:none}
.fo svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.fo-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.fo-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer;min-height:36px}
.fo-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.fo-btn.sm{padding:5px 9px;min-width:40px;min-height:34px}
.fo-btn i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.fo-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.fo-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.fo-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.fo-field{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700}
.fo-field input{height:36px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 10px;font:inherit;font-size:14px;color:inherit}
.fo-field input[type=number]{width:76px}
.fo-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700;flex:1 1 220px}
.fo-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.fo-ing{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.fo-ing li{display:grid;grid-template-columns:minmax(5.5em,auto) 1fr;gap:12px;align-items:baseline;border-bottom:1px solid var(--di-line,#c9dce8);padding:7px 2px;font-size:15px}
.fo-ing b{font-variant-numeric:tabular-nums;text-align:right}
.fo-ing small{color:var(--di-muted,#4f6578)}
.fo-label{border:2px solid var(--di-fg,#13263a);border-radius:12px;padding:10px 12px;background:var(--di-surface,#fff);max-width:520px}
.fo-label table{width:100%;border-collapse:collapse;font-size:14px}
.fo-label th,.fo-label td{padding:6px 4px;border-bottom:1px solid var(--di-line,#c9dce8);text-align:right}
.fo-label th:first-child,.fo-label td:first-child{text-align:left}
.fo-lights{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px;margin:0 0 10px}
.fo-light{border-radius:10px;padding:8px;text-align:center;font-size:12.5px;font-weight:700;border:1px solid rgba(0,0,0,.12)}
.fo-light b{display:block;font-size:17px}
.fo-warn{color:#c2563a;font-weight:800}
`;
  function injectStyle() {
    if (document.getElementById('fo-style')) return;
    const s = document.createElement('style'); s.id = 'fo-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('fo');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    _hot(c, fn) {
      c.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g && c.contains(g)) fn(g.dataset.k, g); });
      c.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && g.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k, g); } });
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('fo'); }
  }

  /* ======================================================================================
   * Recipescale: a recipe for any number of people
   * data = { title?, serves, items:[{qty?, unit?, name, note?}] }
   * opts = { metric?: false }   events: change {serves, factor, metric}
   * Units understood: cup, tbsp, tsp, ml, l, g, kg, oz, lb (anything else is scaled and kept as written).
   * Cup = 250 ml (metric cup), tbsp = 15 ml, tsp = 5 ml; spoons and cups are converted to millilitres, not grams.
   * ====================================================================================== */
  const ML = { cup: 250, cups: 250, tbsp: 15, tsp: 5, ml: 1, l: 1000 }, GR = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
  const FR = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
  function nice(q, unit) {
    if (q == null) return '';
    const u = String(unit || '').toLowerCase();
    if (ML[u] && u !== 'ml' && u !== 'l' || !u) {
      const w = Math.floor(q), r = q - w; let best = FR[0]; FR.forEach(f => { if (Math.abs(r - f[0]) < Math.abs(r - best[0])) best = f; });
      const whole = best[0] === 1 ? w + 1 : w; return (whole ? whole : '') + best[1] || (q < 0.1 ? 'a pinch' : String(f1(q)));
    }
    if (u === 'g' || u === 'ml') return String(q >= 100 ? Math.round(q / 5) * 5 : Math.round(q));
    return String(Math.round(q * 100) / 100);
  }
  class Recipescale extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { metric: false });
      this.base = +data.serves || 1; this.serves = this.base; this.metric = !!this.o.metric;
      el.innerHTML = '<div class="fo-bar"><span class="fo-field">Serves <button type="button" class="fo-btn sm" data-d="-1" aria-label="Fewer people">−</button><input type="number" min="1" max="200" step="1" aria-label="Number of people"><button type="button" class="fo-btn sm" data-d="1" aria-label="More people">+</button></span><button type="button" class="fo-btn" data-metric aria-pressed="false">Grams and millilitres</button></div><ul class="fo-ing"></ul><p class="fo-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$ul = el.querySelector('.fo-ing'); this.$note = el.querySelector('.fo-note'); this.$m = el.querySelector('[data-metric]');
      this.$in.value = this.serves;
      el.addEventListener('click', e => { const d = e.target.closest('[data-d]'); if (d) { this._set(this.serves + +d.dataset.d); return; } if (e.target.closest('[data-metric]')) { this.metric = !this.metric; this.render(); this._fire(); } });
      this.$in.addEventListener('input', () => { const v = Math.round(+this.$in.value); if (v >= 1) this._set(v, true); });
      this.render();
    }
    _set(v, typing) { v = clamp(v, 1, 200); if (v === this.serves && !typing) return; this.serves = v; if (!typing) this.$in.value = v; this.render(); this._fire(); }
    _fire() { this._emit('change', { serves: this.serves, factor: this.serves / this.base, metric: this.metric }); }
    line(it) {
      const k = this.serves / this.base; if (it.qty == null) return { q: '', u: '' };
      let q = +it.qty * k, u = it.unit || ''; const lu = u.toLowerCase();
      if (this.metric && ML[lu] && lu !== 'ml' && lu !== 'l') { q *= ML[lu]; u = 'ml'; }
      else if (this.metric && (lu === 'oz' || lu === 'lb')) { q *= GR[lu]; u = 'g'; }
      if (u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; } else if (u === 'ml' && q >= 1000) { q /= 1000; u = 'l'; }
      const un = (u === 'cup' || u === 'cups') ? (q > 1 ? 'cups' : 'cup') : u;
      return { q: nice(q, u), u: un };
    }
    render() {
      this.$m.setAttribute('aria-pressed', String(this.metric));
      this.$ul.innerHTML = this.data.items.map(it => { const l = this.line(it); return '<li><b>' + esc((l.q + ' ' + l.u).trim()) + '</b><span>' + esc(it.name) + (it.note ? ' <small>' + esc(it.note) + '</small>' : '') + '</span></li>'; }).join('');
      const k = this.serves / this.base;
      this.$note.innerHTML = (this.data.title ? '<b>' + esc(this.data.title) + '</b> for ' + plural(this.serves, 'person', 'people') + ': ' : 'For ' + plural(this.serves, 'person', 'people') + ': ') + (k === 1 ? 'the amounts as written.' : 'everything × ' + (Math.round(k * 100) / 100) + ' (written for ' + this.base + ').') + (this.metric ? ' Spoons and cups are shown in millilitres (1 cup = 250 ml).' : '') + (k > 3 ? ' Cooking times may need to be longer for bigger amounts.' : '');
    }
  }

  /* ======================================================================================
   * Seasonwheel: what is in season, month by month
   * data = { items:[{id,label,months:[1–12], best?:[1–12]}], now?: 1–12, place? }
   * events: month {month, items}
   * ====================================================================================== */
  class Seasonwheel extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.I = data.items; this.m = clamp(+(this.o.month || data.now || 1), 1, 12); this.sel = null;
      el.innerHTML = '<div class="fo-bar" role="group" aria-label="Month"></div><svg role="group"></svg><div class="fo-legend"></div><p class="fo-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.fo-bar'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.fo-legend'); this.$note = el.querySelector('.fo-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) this._month(+b.dataset.m); });
      this._hot(this.$svg, k => { if (k[0] === 'm') { this._month(+k.slice(1)); return; } this.sel = this.sel === k ? null : k; this.render(); });
      this._hot(this.$leg, k => { this.sel = this.sel === k ? null : k; this.render(); });
      this.render();
    }
    _month(m) { this.m = m; this.sel = null; this.render(); this._emit('month', { month: m, items: this.I.filter(i => i.months.includes(m)).map(i => i.id) }); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), D = Math.min(W, 520), H = D, cx = W / 2, cy = H / 2, R = D / 2 - 26, r0 = R * 0.3, n = this.I.length, bw = (R - r0) / n;
      const arc = (a0, a1, ri, ro) => { const p = (a, r) => f1(cx + Math.sin(a) * r) + ',' + f1(cy - Math.cos(a) * r), lg = a1 - a0 > Math.PI ? 1 : 0; return 'M' + p(a0, ro) + 'A' + f1(ro) + ',' + f1(ro) + ' 0 ' + lg + ' 1 ' + p(a1, ro) + 'L' + p(a1, ri) + 'A' + f1(ri) + ',' + f1(ri) + ' 0 ' + lg + ' 0 ' + p(a0, ri) + 'Z'; };
      const step = 2 * Math.PI / 12; let s = '';
      for (let mo = 1; mo <= 12; mo++) { const a0 = (mo - 1) * step, on = mo === this.m; s += '<g data-k="m' + mo + '" tabindex="-1"><path d="' + arc(a0, a0 + step, r0 - 2, R + 22) + '" fill="' + (on ? T.accent : 'transparent') + '" opacity="' + (on ? 0.12 : 1) + '" stroke="' + T.line + '" stroke-width="1"/></g>'; const am = a0 + step / 2; s += '<text x="' + f1(cx + Math.sin(am) * (R + 12)) + '" y="' + f1(cy - Math.cos(am) * (R + 12) + 4) + '" font-size="11.5" font-weight="' + (on ? 800 : 600) + '" text-anchor="middle" fill="' + (on ? T.fg : T.muted) + '" pointer-events="none">' + MON[mo - 1] + '</text>'; }
      this.I.forEach((it, i) => {
        const ri = r0 + i * bw + 1, ro = ri + bw - 2, c = colorFor(this.el, it, i), dim = this.sel && this.sel !== it.id;
        s += '<g data-k="' + esc(it.id) + '" role="button" tabindex="-1" aria-label="' + esc(this._line(it)) + '"' + (dim ? ' opacity=".2"' : '') + '><circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1((ri + ro) / 2) + '" fill="none" stroke="' + T.bg + '" stroke-width="' + f1(ro - ri) + '"/>';
        it.months.forEach(mo => { const a0 = (mo - 1) * step + 0.01; s += '<path d="' + arc(a0, a0 + step - 0.02, ri, ro) + '" fill="' + c + '" opacity="' + ((it.best || []).includes(mo) ? 1 : 0.45) + '"/>'; });
        s += '</g>';
      });
      const am = (this.m - 0.5) * step; s += '<line x1="' + f1(cx + Math.sin(am) * r0 * 0.9) + '" y1="' + f1(cy - Math.cos(am) * r0 * 0.9) + '" x2="' + f1(cx + Math.sin(am) * (R + 2)) + '" y2="' + f1(cy - Math.cos(am) * (R + 2)) + '" stroke="' + T.fg + '" stroke-width="2"/>';
      s += '<text x="' + f1(cx) + '" y="' + f1(cy + 5) + '" font-size="' + (D < 360 ? 13 : 15) + '" font-weight="800" text-anchor="middle" fill="' + T.fg + '">' + MON[this.m - 1] + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Season wheel: one ring per item, coloured in the months it is in season, darker in its best months. Use the month buttons above to change month.');
      this.$svg.innerHTML = s;
      this.$bar.innerHTML = MON.map((l, i) => '<button type="button" class="fo-btn sm" data-m="' + (i + 1) + '" aria-pressed="' + (this.m === i + 1) + '" aria-label="' + MONTH[i] + '">' + l + '</button>').join('');
      this._keep(this.$leg, this.I.map((it, i) => '<span data-k="' + esc(it.id) + '" role="button" tabindex="0" aria-pressed="' + (this.sel === it.id) + '" style="cursor:pointer"><i style="background:' + colorFor(this.el, it, i) + '"></i>' + esc(it.label) + '</span>').join('') + '<span>Rings from the centre out, in this order. Darker: best months.</span>');
      if (this.sel) { const it = this.I.find(z => z.id === this.sel); this.$note.innerHTML = '<b>' + esc(this._line(it)) + '</b>'; return; }
      const now = this.I.filter(i => i.months.includes(this.m)), best = now.filter(i => (i.best || []).includes(this.m));
      this.$note.innerHTML = 'In <b>' + MONTH[this.m - 1] + '</b>' + (this.data.place ? ' (' + esc(this.data.place) + ')' : '') + ': ' + (now.length ? list(now.map(i => esc(i.label))) + '.' + (best.length ? ' Best now: ' + list(best.map(i => esc(i.label))) + '.' : '') : 'nothing on this list is in season.') + ' Tap a name below to see its months.';
    }
    _line(it) {
      const runs = [], ms = it.months.slice().sort((a, b) => a - b); let a = null, p = null;
      const all = new Set(ms); if (all.size === 12) return it.label + ': all year' + ((it.best || []).length ? ', best in ' + list(it.best.map(m => MONTH[m - 1])) : '') + '.';
      let start = ms.find(m => !all.has(((m + 10) % 12) + 1)); const seq = []; for (let k = 0, m = start; k < 12; k++, m = m % 12 + 1) seq.push(m);
      seq.forEach(m => { if (all.has(m)) { if (a == null) a = m; p = m; } else if (a != null) { runs.push([a, p]); a = null; } }); if (a != null) runs.push([a, p]);
      return it.label + ': ' + list(runs.map(([x, y]) => x === y ? MONTH[x - 1] : MONTH[x - 1] + ' to ' + MONTH[y - 1])) + ((it.best || []).length ? '; best in ' + list(it.best.map(m => MONTH[m - 1])) : '') + '.';
    }
  }

  /* ======================================================================================
   * Platesplit: a meal against a plate guide
   * data = { guide:[{id,label,share}], meals:[{id,label,parts:{<guide id>: share}}] }
   * events: select {meal}
   * ====================================================================================== */
  class Platesplit extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.G = data.guide; this.M = data.meals; this.sel = (this.M[0] || {}).id;
      el.innerHTML = '<div class="fo-bar" role="group" aria-label="Meal"></div><svg role="img"></svg><div class="fo-legend"></div><p class="fo-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.fo-bar'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.fo-legend'); this.$note = el.querySelector('.fo-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { this.sel = b.dataset.m; this.render(); this._emit('select', { meal: this.sel }); } });
      this.render();
    }
    shares(parts) { const tot = this.G.reduce((a, g) => a + (+parts[g.id] || 0), 0) || 1; return this.G.map(g => (+parts[g.id] || 0) / tot); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, gt = this.G.reduce((a, g) => a + +g.share, 0), gs = this.G.map(g => g.share / gt), meal = this.M.find(m => m.id === this.sel), ms = this.shares(meal.parts);
      const r = narrow ? Math.min(W / 4 - 12, 74) : 100, H = 2 * r + 46, c1 = W / 4, c2 = 3 * W / 4, cy = r + 14;
      const pie = (cx, sh) => { let a = 0, s = '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + (r + 8) + '" fill="' + T.surface + '" stroke="' + T.line + '" stroke-width="2"/>'; sh.forEach((v, i) => { if (v <= 0) return; const a1 = a + v * 2 * Math.PI, p = q => f1(cx + Math.sin(q) * r) + ',' + f1(cy - Math.cos(q) * r), c = colorFor(this.el, this.G[i], i); s += v >= 0.9999 ? '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + r + '" fill="' + c + '"/>' : '<path d="M' + f1(cx) + ',' + f1(cy) + 'L' + p(a) + 'A' + r + ',' + r + ' 0 ' + (a1 - a > Math.PI ? 1 : 0) + ' 1 ' + p(a1) + 'Z" fill="' + c + '" stroke="' + T.surface + '" stroke-width="1.5"/>'; if (v > 0.07) { const am = (a + a1) / 2; s += '<text x="' + f1(cx + Math.sin(am) * r * 0.6) + '" y="' + f1(cy - Math.cos(am) * r * 0.6 + 4) + '" font-size="12" font-weight="800" text-anchor="middle" fill="#fff">' + Math.round(v * 100) + '%</text>'; } a = a1; }); return s; };
      let s = pie(c1, gs) + pie(c2, ms);
      s += '<text x="' + f1(c1) + '" y="' + (H - 6) + '" font-size="12.5" font-weight="800" text-anchor="middle" fill="' + T.fg + '">' + esc(this.data.guideLabel || 'The guide') + '</text><text x="' + f1(c2) + '" y="' + (H - 6) + '" font-size="12.5" font-weight="800" text-anchor="middle" fill="' + T.fg + '">' + esc(fitText(meal.label, W / 2 - 10, 12.5)) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Two plates: the guide and ' + meal.label + '. ' + this.G.map((g, i) => g.label + ' ' + Math.round(gs[i] * 100) + '% against ' + Math.round(ms[i] * 100) + '%').join('; ') + '.');
      this.$svg.innerHTML = s;
      this.$bar.innerHTML = this.M.map(m => '<button type="button" class="fo-btn" data-m="' + esc(m.id) + '" aria-pressed="' + (m.id === this.sel) + '">' + esc(m.label) + '</button>').join('');
      this.$leg.innerHTML = this.G.map((g, i) => '<span><i style="background:' + colorFor(this.el, g, i) + '"></i>' + esc(g.label) + '</span>').join('');
      const diffs = this.G.map((g, i) => ({ g, d: Math.round((ms[i] - gs[i]) * 100) })).filter(x => Math.abs(x.d) >= 5).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
      this.$note.innerHTML = '<b>' + esc(meal.label) + '</b>: ' + (diffs.length ? diffs.map(x => esc(x.g.label.toLowerCase()) + ' ' + Math.round(ms[this.G.indexOf(x.g)] * 100) + '% (guide ' + Math.round(gs[this.G.indexOf(x.g)] * 100) + '%, ' + Math.abs(x.d) + ' points ' + (x.d > 0 ? 'more' : 'less') + ')').join('; ') + '.' : 'close to the guide, within 5 points on every part.') + ' Shares are of the plate, not weights.';
    }
  }

  /* ======================================================================================
   * Labelcard: a nutrition label with high / medium / low colours
   * data = { name, serving (g), per100:{energy (kJ), fat, saturates, sugars, salt}, unit?:'g'|'ml' }
   * opts = { show?:'100'|'serving'|'amount' }   events: change {show, grams}
   * Colours use per-100 g thresholds (UK front-of-pack scheme for foods): fat 3 / 17.5, saturates 1.5 / 5, sugars 5 / 22.5, salt 0.3 / 1.5.
   * Reference intakes for an adult: energy 8400 kJ, fat 70 g, saturates 20 g, sugars 90 g, salt 6 g.
   * ====================================================================================== */
  const NUT = [['energy', 'Energy', 'kJ', 8400, null], ['fat', 'Fat', 'g', 70, [3, 17.5]], ['saturates', 'Saturates', 'g', 20, [1.5, 5]], ['sugars', 'Sugars', 'g', 90, [5, 22.5]], ['salt', 'Salt', 'g', 6, [0.3, 1.5]]];
  const LIGHT = { low: ['#5cb85c', 'Low'], medium: ['#f0b429', 'Medium'], high: ['#e0592a', 'High'] };
  class Labelcard extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { show: 'serving' });
      this.show = this.o.show; this.amt = +data.serving || 100;
      el.innerHTML = '<div class="fo-bar" role="group" aria-label="Show"></div><div class="fo-lights"></div><div class="fo-label"></div><p class="fo-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.fo-bar'); this.$lights = el.querySelector('.fo-lights'); this.$lab = el.querySelector('.fo-label'); this.$note = el.querySelector('.fo-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-show]'); if (b) { this.show = b.dataset.show; this.render(); this._fire(); } });
      this.$bar.addEventListener('input', e => { if (e.target.dataset.amt != null) { this.amt = clamp(Math.round(+e.target.value || 0), 1, 2000); this.show = 'amount'; this._paint(); this._fire(); } });
      this.render();
    }
    grams() { return this.show === '100' ? 100 : this.show === 'serving' ? +this.data.serving : this.amt; }
    _fire() { this._emit('change', { show: this.show, grams: this.grams() }); }
    level(k, v100) { const n = NUT.find(z => z[0] === k); if (!n[4]) return null; return v100 <= n[4][0] ? 'low' : v100 > n[4][1] ? 'high' : 'medium'; }
    render() {
      const U = this.data.unit || 'g';
      this.$bar.innerHTML = [['100', 'Per 100 ' + U], ['serving', 'Per serving (' + this.data.serving + ' ' + U + ')']].map(([k, l]) => '<button type="button" class="fo-btn" data-show="' + k + '" aria-pressed="' + (this.show === k) + '">' + esc(l) + '</button>').join('') + '<label class="fo-field">Any amount <input type="number" min="1" max="2000" step="5" data-amt value="' + this.amt + '" aria-label="Amount in ' + U + '"> ' + U + '</label>';
      this._paint();
    }
    _paint() {
      const U = this.data.unit || 'g', g = this.grams(), p = this.data.per100, k = g / 100;
      this.$bar.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.show === this.show)));
      this.$lights.innerHTML = NUT.map(([key, label, u, ri]) => { const v = p[key] * k, lv = this.level(key, p[key]), c = lv ? LIGHT[lv][0] : '#ffffff'; return '<div class="fo-light" style="background:' + c + ';color:#13263a"><span>' + label + '</span><b>' + (key === 'energy' ? Math.round(v) + ' kJ' : (Math.round(v * 10) / 10) + ' g') + '</b><span>' + (lv ? LIGHT[lv][1] + ' · ' : '') + Math.round(v / ri * 100) + '% RI</span></div>'; }).join('');
      this.$lab.innerHTML = '<table><caption style="text-align:left;font-weight:800;padding-bottom:6px">' + esc(this.data.name || 'Nutrition') + '</caption><thead><tr><th scope="col"></th><th scope="col">Per 100 ' + U + '</th><th scope="col">Per ' + g + ' ' + U + '</th><th scope="col">% RI</th></tr></thead><tbody>' + NUT.map(([key, label, u, ri]) => '<tr><th scope="row">' + label + '</th><td>' + (key === 'energy' ? p[key] + ' kJ (' + Math.round(p[key] / 4.184) + ' kcal)' : p[key] + ' g') + '</td><td>' + (key === 'energy' ? Math.round(p[key] * k) + ' kJ' : Math.round(p[key] * k * 10) / 10 + ' g') + '</td><td>' + Math.round(p[key] * k / ri * 100) + '%</td></tr>').join('') + '</tbody></table>';
      const hi = NUT.filter(([key]) => this.level(key, p[key]) === 'high').map(n => n[1].toLowerCase()), lo = NUT.filter(([key]) => this.level(key, p[key]) === 'low').map(n => n[1].toLowerCase());
      this.$note.innerHTML = '<b>' + esc(this.data.name || 'This food') + '</b>, ' + g + ' ' + U + ': ' + Math.round(p.energy * k) + ' kJ (' + Math.round(p.energy * k / 4.184) + ' kcal), ' + Math.round(p.energy * k / 8400 * 100) + '% of an adult\'s day. ' + (hi.length ? 'High in ' + list(hi) + '. ' : '') + (lo.length ? 'Low in ' + list(lo) + '. ' : '') + 'Colours come from the amounts per 100 ' + U + ', so they stay the same whatever amount is shown.';
    }
  }

  /* ======================================================================================
   * Harvestplan: from sowing to harvest
   * data = { sow:'YYYY-MM-DD', today?, crops:[{id,label,days, pick?: days it can be harvested for}] }
   * events: change {sow}, select {id, ready}
   * ====================================================================================== */
  class Harvestplan extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.sow = pt(data.sow); this.today = data.today ? pt(data.today) : null; this.C = data.crops; this.sel = null;
      el.innerHTML = '<div class="fo-bar"><label class="fo-field">Sowing date <input type="date" data-sow></label></div><svg role="group"></svg><div class="fo-legend"></div><p class="fo-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.fo-legend'); this.$note = el.querySelector('.fo-note'); this.$in = el.querySelector('[data-sow]');
      this.$in.value = isoD(this.sow);
      this.$in.addEventListener('change', () => { const v = pt(this.$in.value); if (!isNaN(v)) { this.sow = v; this.render(); this._emit('change', { sow: isoD(v) }); } });
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) { const c = this.C.find(z => z.id === k); this._emit('select', { id: k, ready: isoD(this.sow + c.days * DAY) }); } });
      this.render();
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rh = 30, top = 22, lw = narrow ? 92 : 140, pr = 8, n = this.C.length, H = top + n * rh + 8;
      const end = Math.max(...this.C.map(c => c.days + (+c.pick || 0))) + 5, x = d => lw + d / end * (W - lw - pr), grow = '#9cc9a5', pick = '#2f8f4e';
      let s = '';
      for (let mo = 0; mo < 24; mo++) { const d0 = new Date(this.sow); const m = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + mo, 1), dd = (m - this.sow) / DAY; if (dd < 0 || dd > end) continue; s += '<line x1="' + f1(x(dd)) + '" x2="' + f1(x(dd)) + '" y1="' + (top - 4) + '" y2="' + (H - 6) + '" stroke="' + T.line + '"/>' + ((narrow ? mo % 2 === 0 : true) ? '<text x="' + f1(x(dd) + 3) + '" y="13" font-size="10.5" fill="' + T.muted + '">' + MON[new Date(m).getUTCMonth()] + '</text>' : ''); }
      this.C.forEach((c, i) => {
        const y = top + i * rh, on = this.sel === c.id, pk = +c.pick || 0;
        s += '<g data-k="' + esc(c.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(this._line(c)) + '"' + (this.sel && !on ? ' opacity=".45"' : '') + '><rect x="0" y="' + y + '" width="' + W + '" height="' + (rh - 3) + '" rx="6" fill="' + (on ? T.accent : 'transparent') + '" opacity="' + (on ? 0.12 : 1) + '"/><text x="4" y="' + (y + 18) + '" font-size="12.5" font-weight="700" fill="' + T.fg + '">' + esc(fitText(c.label, lw - 8, 12.5)) + '</text>' +
          '<rect x="' + f1(x(0)) + '" y="' + (y + 7) + '" width="' + f1(x(c.days) - x(0)) + '" height="' + (rh - 17) + '" rx="4" fill="' + grow + '"/>' + (pk ? '<rect x="' + f1(x(c.days)) + '" y="' + (y + 4) + '" width="' + f1(Math.max(3, x(c.days + pk) - x(c.days))) + '" height="' + (rh - 11) + '" rx="4" fill="' + pick + '"/>' : '<circle cx="' + f1(x(c.days)) + '" cy="' + (y + 13) + '" r="5" fill="' + pick + '"/>') + '</g>';
      });
      if (this.today != null) { const dd = (this.today - this.sow) / DAY; if (dd >= 0 && dd <= end) s += '<line x1="' + f1(x(dd)) + '" x2="' + f1(x(dd)) + '" y1="' + (top - 6) + '" y2="' + (H - 4) + '" stroke="' + T.fg + '" stroke-width="1.5" stroke-dasharray="3 3"/><text x="' + f1(x(dd)) + '" y="' + (H - 0) + '" font-size="10" text-anchor="middle" fill="' + T.fg + '"></text>'; }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Growing time for ' + plural(n, 'crop') + ' sown on ' + dateL(this.sow) + '. Tab to each crop.');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = '<span><i style="background:' + grow + '"></i>Growing</span><span><i style="background:' + pick + '"></i>Ready to pick</span>' + (this.today != null ? '<span>Dashed line: today</span>' : '');
      if (this.sel) { this.$note.innerHTML = '<b>' + esc(this._line(this.C.find(c => c.id === this.sel))) + '</b>'; return; }
      const by = this.C.slice().sort((a, b) => a.days - b.days), first = by[0], last = by[by.length - 1], t = this.today, readyNow = t != null ? this.C.filter(c => t >= this.sow + c.days * DAY && t <= this.sow + (c.days + (+c.pick || 0)) * DAY) : [];
      this.$note.innerHTML = 'Sown on <b>' + dateL(this.sow) + '</b>: ' + esc(first.label) + ' is ready first, from ' + dateL(this.sow + first.days * DAY) + '; ' + esc(last.label) + ' last, from ' + dateL(this.sow + last.days * DAY) + '.' + (t != null ? ' On ' + dateL(t) + ': ' + (readyNow.length ? list(readyNow.map(c => esc(c.label))) + ' ready to pick.' : 'nothing ready yet.') : '') + ' Change the sowing date to plan another planting.';
    }
    _line(c) { const r = this.sow + c.days * DAY, pk = +c.pick || 0; return c.label + ': about ' + c.days + ' days, ready from ' + dateL(r) + (pk ? ' and can be picked until ' + dateL(r + pk * DAY) : '') + '.'; }
  }

  /* ======================================================================================
   * Servetime: working back from serving time
   * data = { serve:'HH:MM', tasks:[{id,label,mins, before?: minutes before serving it must be done, hands?: true if the cook is busy for all of it}] }
   * events: change {serve, start}
   * ====================================================================================== */
  const hm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), x = m % 60; return ((h + 11) % 12 + 1) + ':' + String(x).padStart(2, '0') + ' ' + (h < 12 ? 'am' : 'pm'); };
  class Servetime extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      const m = String(data.serve || '18:00').match(/(\d+):(\d+)/); this.serve = +m[1] * 60 + +m[2]; this.T = data.tasks;
      el.innerHTML = '<div class="fo-bar"><label class="fo-field">Serving at <input type="time" step="300" data-serve></label></div><svg role="img"></svg><div class="fo-legend"></div><p class="fo-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.fo-legend'); this.$note = el.querySelector('.fo-note'); this.$in = el.querySelector('[data-serve]');
      this.$in.value = String(Math.floor(this.serve / 60)).padStart(2, '0') + ':' + String(this.serve % 60).padStart(2, '0');
      this.$in.addEventListener('change', () => { const v = String(this.$in.value).match(/(\d+):(\d+)/); if (v) { this.serve = +v[1] * 60 + +v[2]; this.render(); this._emit('change', { serve: this.$in.value, start: hm(this.plan()[0].a) }); } });
      this.render();
    }
    plan() { return this.T.map((t, i) => { const b = this.serve - (+t.before || 0), a = b - +t.mins; return Object.assign({ i }, t, { a, b }); }).sort((x, y) => x.a - y.a || x.i - y.i); }
    clashes(P) { const out = []; const hands = P.filter(t => t.hands); for (let i = 0; i < hands.length; i++) for (let j = i + 1; j < hands.length; j++) { const a = Math.max(hands[i].a, hands[j].a), b = Math.min(hands[i].b, hands[j].b); if (b - a > 0) out.push([hands[i], hands[j], a, b]); } return out; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, P = this.plan(), rh = 30, top = 22, lw = narrow ? 100 : 170, pr = 10, H = top + P.length * rh + 22;
      const t0 = Math.floor(Math.min(...P.map(p => p.a)) / 15) * 15, t1 = this.serve + 5, x = m => lw + (m - t0) / (t1 - t0) * (W - lw - pr), busy = '#d9822b', idle = '#9fc3dd';
      let s = '';
      const step = (t1 - t0) > 180 ? 60 : 30;
      for (let m = Math.ceil(t0 / step) * step; m <= t1; m += step) s += '<line x1="' + f1(x(m)) + '" x2="' + f1(x(m)) + '" y1="' + (top - 4) + '" y2="' + (H - 18) + '" stroke="' + T.line + '"/><text x="' + f1(x(m)) + '" y="13" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + hm(m) + '</text>';
      P.forEach((p, i) => { const y = top + i * rh; s += '<text x="4" y="' + (y + 18) + '" font-size="12.5" font-weight="700" fill="' + T.fg + '">' + esc(fitText(p.label, lw - 8, 12.5)) + '</text><rect x="' + f1(x(p.a)) + '" y="' + (y + 5) + '" width="' + f1(Math.max(3, x(p.b) - x(p.a))) + '" height="' + (rh - 12) + '" rx="4" fill="' + (p.hands ? busy : idle) + '"/>' + (x(p.b) - x(p.a) > 70 ? '<text x="' + f1(x(p.a) + 6) + '" y="' + (y + 18) + '" font-size="11" font-weight="700" fill="#13263a">' + hm(p.a) + '</text>' : ''); });
      this.clashes(P).forEach(([, , a, b]) => { s += '<rect x="' + f1(x(a)) + '" y="' + (top - 6) + '" width="' + f1(x(b) - x(a)) + '" height="' + (P.length * rh + 4) + '" fill="#c2563a" opacity=".1"/>'; });
      s += '<line x1="' + f1(x(this.serve)) + '" x2="' + f1(x(this.serve)) + '" y1="' + (top - 6) + '" y2="' + (H - 16) + '" stroke="' + T.fg + '" stroke-width="2"/><text x="' + f1(Math.min(x(this.serve), W - 40)) + '" y="' + (H - 4) + '" font-size="11" font-weight="800" text-anchor="middle" fill="' + T.fg + '">Serve ' + hm(this.serve) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Cooking plan working back from ' + hm(this.serve) + ': ' + P.map(p => p.label + ' ' + hm(p.a) + ' to ' + hm(p.b)).join('; ') + '.');
      this.$svg.innerHTML = s;
      this.$leg.innerHTML = '<span><i style="background:' + busy + '"></i>Hands busy</span><span><i style="background:' + idle + '"></i>Can be left</span><span><i style="background:#c2563a;opacity:.4"></i>Two busy jobs at once</span>';
      const cl = this.clashes(P);
      this.$note.innerHTML = 'To serve at <b>' + hm(this.serve) + '</b>, start with <b>' + esc(P[0].label.toLowerCase()) + ' at ' + hm(P[0].a) + '</b>. Order: ' + P.map(p => esc(p.label.toLowerCase()) + ' ' + hm(p.a)).join(', ') + '. ' + (cl.length ? '<span class="fo-warn">Busy twice at once:</span> ' + cl.map(([a, b, x1, x2]) => esc(a.label.toLowerCase()) + ' and ' + esc(b.label.toLowerCase()) + ' from ' + hm(x1) + ' to ' + hm(x2)).join('; ') + ' — get help, or start one earlier.' : 'No two hands-on jobs overlap.');
    }
  }

  return { Recipescale, Seasonwheel, Platesplit, Labelcard, Harvestplan, Servetime };
});
