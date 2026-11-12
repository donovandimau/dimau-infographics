/*! Stats 1.0 · Dimau Infographics
 *  Six formats for how numbers spread out and measure up:
 *    Histobins   a histogram: how many values fall in each range; change the ranges, tap a bar to see what is in it.
 *    Boxplot     the middle half, the typical value and the unusual ones for each group; show every point or sort.
 *    Dumbbell    two values per row joined by a line (before and after, two groups); sort by either or by the change.
 *    Bulletbar   a measure against its target, over bands from poor to good; switch to percent of target.
 *    Ridgeline   the shape of each group's values, stacked; drag across to read every group at one value.
 *    Marimekko   shares in two directions at once: column width is each column's size, heights are the split inside it.
 *
 *  new Histobins(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Histobins', 'Boxplot', 'Dumbbell', 'Bulletbar', 'Ridgeline', 'Marimekko'].forEach(function (k) { root[k] = m[k]; }); root.DimauStats = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmt = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 1 }) + (o.suffix || '') : '–'; };
  const pct = n => Math.round(n * 100) + '%';
  const between = (a, b, o) => fmt(a, { prefix: o.prefix, decimals: o.decimals }) + ' and ' + fmt(b, o);
  const span = (a, b, o) => fmt(a, { prefix: o.prefix, decimals: o.decimals }) + ' to ' + fmt(b, o);
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
  /** Round step for an axis covering `span` in about `n` steps. */
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }
  /** Quantile with linear interpolation on sorted numbers. */
  function q(s, p) { if (!s.length) return NaN; const i = (s.length - 1) * p, a = Math.floor(i), b = Math.ceil(i); return s[a] + (s[b] - s[a]) * (i - a); }
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const numsOf = vs => vs.map(v => (typeof v === 'object' ? { label: v.label, value: +v.value } : { label: null, value: +v })).filter(v => isFinite(v.value));
  function summary(vals) {
    const s = vals.map(v => v.value).sort((a, b) => a - b), q1 = q(s, 0.25), q3 = q(s, 0.75), iqr = q3 - q1, lf = q1 - 1.5 * iqr, uf = q3 + 1.5 * iqr;
    const inside = s.filter(v => v >= lf && v <= uf);
    return { n: s.length, min: s[0], max: s[s.length - 1], q1, med: q(s, 0.5), q3, mean: mean(s), lo: inside[0], hi: inside[inside.length - 1], out: vals.filter(v => v.value < lf || v.value > uf) };
  }

  const STYLE = `
.dw{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dw) button{font:inherit;color:inherit}
.dw :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dw svg{display:block;width:100%}
.dw svg [data-k]{cursor:pointer}
.dw svg [data-k]:focus{outline:none}
.dw svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dw-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dw-bar .dw-lab{font-size:13px;font-weight:700;color:var(--di-muted,#4f6578);margin-right:2px}
.dw-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.dw-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dw-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dw-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dw-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.dw-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700}
.dw-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.dw-list{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--di-muted,#4f6578);columns:2 200px}
`;
  function injectStyle() {
    if (document.getElementById('dw-style')) return;
    const s = document.createElement('style'); s.id = 'dw-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dw');
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
    _seg(name, opts, cur) { return '<div class="dw-bar" role="group" aria-label="' + esc(name) + '"><span class="dw-lab">' + esc(name) + '</span>' + opts.map(([v, l]) => '<button type="button" class="dw-btn" data-' + name.toLowerCase().replace(/\W+/g, '') + '="' + esc(v) + '" aria-pressed="' + (v === cur) + '">' + esc(l) + '</button>').join('') + '</div>'; }
    get _fmt() { const d = this.data; return { prefix: d.prefix, suffix: d.suffix != null ? d.suffix : d.unit ? ' ' + d.unit : '', decimals: d.decimals }; }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('dw'); }
  }
  const axisX = (T, lo, hi, sx, y, f, n, W) => ticks(lo, hi, n).map(v => '<line x1="' + f1(sx(v)) + '" y1="' + y + '" x2="' + f1(sx(v)) + '" y2="' + (y + 4) + '" stroke="' + T.muted + '"/><text x="' + f1(clamp(sx(v), 14, W - 14)) + '" y="' + (y + 16) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(f(v)) + '</text>').join('');

  /* ======================================================================================
   * Histobins: a histogram with adjustable ranges
   * data = { label?, unit?, prefix?, values:[number | {label,value}] }  options: { bins: 8 }
   * ====================================================================================== */
  class Histobins extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { bins: 8 });
      this.vals = numsOf(data.values); this.bins = this.o.bins; this.sel = null;
      const lo = Math.min(...this.vals.map(v => v.value)), hi = Math.max(...this.vals.map(v => v.value));
      el.innerHTML = '<label class="dw-range"><span>Ranges: <output></output></span><input type="range" min="3" max="' + clamp(Math.ceil(this.vals.length / 2), 4, 30) + '" step="1" value="' + this.bins + '"></label><svg role="group"></svg><p class="dw-note" aria-live="polite"></p><ul class="dw-list" hidden></ul>';
      this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dw-note'); this.$list = el.querySelector('.dw-list');
      this.$in.addEventListener('input', () => { this.bins = +this.$in.value; this.sel = null; this.render(); this._emit('bins', { bins: this.bins }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const b = this._b[this.sel]; this._emit('select', { from: b.a, to: b.b, count: b.items.length }); } });
      this._lo = lo; this._hi = hi; this.render();
    }
    _binsOf() {
      const st = niceStep(this._hi - this._lo, this.bins), a0 = Math.floor(this._lo / st) * st, out = [];
      for (let a = a0; a <= this._hi + 1e-9; a += st) out.push({ a: +a.toFixed(10), b: +(a + st).toFixed(10), items: [] });
      this.vals.forEach(v => { const i = Math.min(out.length - 1, Math.floor((v.value - a0) / st + 1e-9)); out[i].items.push(v); });
      return out;
    }
    render() {
      const T = themeOf(this.el), d = this.data, F = this._fmt, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 230 : 280, pl = 36, pr = 10, pt = 16, pb = 30;
      const B = this._b = this._binsOf(); if (this.sel != null && this.sel >= B.length) this.sel = null;
      const lo = B[0].a, hi = B[B.length - 1].b, maxC = Math.max(...B.map(b => b.items.length)), sx = v => pl + ((v - lo) / (hi - lo)) * (W - pl - pr), sy = c => H - pb - (c / maxC) * (H - pt - pb);
      const s0 = summary(this.vals);
      let s = ticks(0, maxC, 4).filter(v => v % 1 === 0).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + v + '</text>').join('');
      B.forEach((b, i) => {
        const x0 = sx(b.a) + 1, x1 = sx(b.b) - 1, on = this.sel === i, dim = this.sel != null && !on, y = sy(b.items.length);
        s += '<g data-k="' + i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(span(b.a, b.b, F) + ': ' + b.items.length) + '"><rect x="' + f1(x0) + '" y="' + f1(Math.min(y, H - pb - 2)) + '" width="' + f1(Math.max(1, x1 - x0)) + '" height="' + f1(Math.max(2, H - pb - y)) + '" rx="2" fill="' + T.accent + '" opacity="' + (dim ? 0.3 : on ? 1 : 0.8) + '"/><rect x="' + f1(x0) + '" y="' + pt + '" width="' + f1(Math.max(1, x1 - x0)) + '" height="' + (H - pt - pb) + '" fill="transparent"/>' +
          (b.items.length && (x1 - x0) > 14 ? '<text x="' + f1((x0 + x1) / 2) + '" y="' + f1(y - 4) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + T.fg + '" pointer-events="none">' + b.items.length + '</text>' : '') + '</g>';
      });
      [['median', s0.med, '4 3'], ['average', s0.mean, '1 3']].forEach(([n, v, da], k) => { const x = sx(v); s += '<line x1="' + f1(x) + '" y1="' + (pt - 4) + '" x2="' + f1(x) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '" stroke-width="1.5" stroke-dasharray="' + da + '" pointer-events="none"/><text x="' + f1(clamp(x + (k ? -4 : 4), 40, W - 40)) + '" y="' + (pt + 2 + k * 12) + '" text-anchor="' + (k ? 'end' : 'start') + '" font-size="10.5" font-weight="700" fill="' + T.fg + '" pointer-events="none">' + n + '</text>'; });
      s += axisX(T, lo, hi, sx, H - pb, v => fmt(v, { prefix: F.prefix, decimals: F.decimals }), narrow ? 4 : 7, W);
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.label || 'Histogram') + ': ' + this.vals.length + ' values in ' + B.length + ' ranges');
      this._keep(this.$svg, s);
      this.$out.textContent = B.length + ' of ' + fmt(B[0].b - B[0].a, F) + ' each'; this.$in.setAttribute('aria-valuetext', B.length + ' ranges');
      if (this.sel != null) {
        const b = B[this.sel], n = b.items.length; this.$note.innerHTML = '<b>' + span(b.a, b.b, F) + '</b>: ' + n + ' of ' + this.vals.length + ' (' + pct(n / this.vals.length) + ').';
        const named = b.items.filter(v => v.label); this.$list.hidden = !named.length; this.$list.innerHTML = named.map(v => '<li>' + esc(v.label) + ' · ' + esc(fmt(v.value, F)) + '</li>').join('');
      } else {
        const top = B.reduce((a, b) => (b.items.length > a.items.length ? b : a)), mid = this.vals.filter(v => v.value >= s0.q1 && v.value <= s0.q3).length;
        this.$note.innerHTML = '<b>' + this.vals.length + '</b> values. Most fall between <b>' + between(top.a, top.b, F) + '</b> (' + top.items.length + '). Median ' + fmt(s0.med, F) + ', average ' + fmt(s0.mean, F) + '; the middle half (' + mid + ') lie between ' + between(s0.q1, s0.q3, F) + '. Tap a bar to see what is in it.';
        this.$list.hidden = true; this.$list.innerHTML = '';
      }
    }
  }

  /* ======================================================================================
   * Boxplot: five-number summaries side by side
   * data = { unit?, prefix?, groups:[{id,label,values:[number | {label,value}]}] }  options: { points: false, sort: 'data' }
   * ====================================================================================== */
  class Boxplot extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { points: false, sort: 'data' });
      this.groups = data.groups.map((g, i) => Object.assign({ i }, g, { vals: numsOf(g.values) })).map(g => Object.assign(g, { s: summary(g.vals) }));
      this.points = !!this.o.points; this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="dw-bar"><button type="button" class="dw-btn" data-points aria-pressed="false">Show every point</button><button type="button" class="dw-btn" data-sort aria-pressed="false">Sort by median</button></div><svg role="group"></svg><p class="dw-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dw-note'); this.$p = el.querySelector('[data-points]'); this.$s = el.querySelector('[data-sort]');
      this.$p.onclick = () => { this.points = !this.points; this.render(); };
      this.$s.onclick = () => { this.sort = this.sort === 'median' ? 'data' : 'median'; this.render(); this._emit('sort', { sort: this.sort }); };
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const g = this.groups[this.sel], s = g.s; this._emit('select', { id: g.id, median: s.med, q1: s.q1, q3: s.q3 }); } });
      this.render();
    }
    render() {
      const T = themeOf(this.el), F = this._fmt, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rowH = 46, pl = narrow ? 86 : 130, pr = 14, pt = 6, pb = 28;
      const G = this.sort === 'median' ? this.groups.slice().sort((a, b) => b.s.med - a.s.med) : this.groups, H = pt + G.length * rowH + pb;
      const all = this.groups.flatMap(g => g.vals.map(v => v.value)), lo0 = Math.min(...all), hi0 = Math.max(...all), pad = (hi0 - lo0) * 0.04 || 1, lo = lo0 - pad, hi = hi0 + pad, sx = v => pl + ((v - lo) / (hi - lo)) * (W - pl - pr);
      let s = ticks(lo, hi, narrow ? 4 : 7).map(v => '<line x1="' + f1(sx(v)) + '" y1="' + pt + '" x2="' + f1(sx(v)) + '" y2="' + (H - pb) + '" stroke="' + T.line + '"/>').join('');
      G.forEach((g, r) => {
        const st = g.s, y = pt + r * rowH + rowH / 2, c = colorFor(this.el, g, g.i), on = this.sel === g.i, dim = this.sel != null && !on, bh = 18;
        let pts = '';
        if (this.points) g.vals.forEach((v, k) => { const j = (((k * 7919) % 13) / 12 - 0.5) * (bh + 6); pts += '<circle cx="' + f1(sx(v.value)) + '" cy="' + f1(y + j) + '" r="3" fill="' + c + '" opacity=".55"/>'; });
        else st.out.forEach(v => { pts += '<circle cx="' + f1(sx(v.value)) + '" cy="' + y + '" r="3.5" fill="none" stroke="' + c + '" stroke-width="1.8"/>'; });
        s += '<g data-k="' + g.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(g.label + ': median ' + fmt(st.med, F) + ', middle half ' + fmt(st.q1, F) + ' to ' + fmt(st.q3, F)) + '" opacity="' + (dim ? 0.35 : 1) + '">' +
          '<rect x="' + f1(sx(st.q1)) + '" y="' + (y - bh / 2) + '" width="' + f1(Math.max(2, sx(st.q3) - sx(st.q1))) + '" height="' + bh + '" rx="3" fill="' + c + '" fill-opacity="' + (this.points ? 0.15 : 0.3) + '" stroke="' + c + '" stroke-width="' + (on ? 2.5 : 1.5) + '"/>' +
          '<rect x="0" y="' + (y - rowH / 2) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          '<line x1="' + f1(sx(st.lo)) + '" y1="' + y + '" x2="' + f1(sx(st.q1)) + '" y2="' + y + '" stroke="' + c + '" stroke-width="1.5"/><line x1="' + f1(sx(st.q3)) + '" y1="' + y + '" x2="' + f1(sx(st.hi)) + '" y2="' + y + '" stroke="' + c + '" stroke-width="1.5"/>' +
          '<line x1="' + f1(sx(st.lo)) + '" y1="' + (y - 6) + '" x2="' + f1(sx(st.lo)) + '" y2="' + (y + 6) + '" stroke="' + c + '" stroke-width="1.5"/><line x1="' + f1(sx(st.hi)) + '" y1="' + (y - 6) + '" x2="' + f1(sx(st.hi)) + '" y2="' + (y + 6) + '" stroke="' + c + '" stroke-width="1.5"/>' + pts +
          '<line x1="' + f1(sx(st.med)) + '" y1="' + (y - bh / 2 - 2) + '" x2="' + f1(sx(st.med)) + '" y2="' + (y + bh / 2 + 2) + '" stroke="' + T.fg + '" stroke-width="3"/>' +
          '<text x="' + (pl - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="12" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(g.label, pl - 12, 12)) + '</text></g>';
      });
      s += axisX(T, lo, hi, sx, H - pb, v => fmt(v, { prefix: F.prefix, decimals: F.decimals }), narrow ? 4 : 7, W);
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Box plot of ' + G.length + ' groups');
      this._keep(this.$svg, s);
      this.$p.setAttribute('aria-pressed', String(this.points)); this.$s.setAttribute('aria-pressed', String(this.sort === 'median'));
      if (this.sel != null) { const g = this.groups[this.sel], st = g.s; this.$note.innerHTML = '<b>' + esc(g.label) + '</b> (' + st.n + ' values): typical value <b>' + fmt(st.med, F) + '</b>; the middle half lie between ' + between(st.q1, st.q3, F) + '; lowest ' + fmt(st.min, F) + ', highest ' + fmt(st.max, F) + '.' + (st.out.length ? ' Unusual: ' + st.out.map(v => esc((v.label ? v.label + ' ' : '') + fmt(v.value, F))).join(', ') + '.' : ''); }
      else { const hi1 = this.groups.reduce((a, b) => (b.s.med > a.s.med ? b : a)), lo1 = this.groups.reduce((a, b) => (b.s.med < a.s.med ? b : a)), wide = this.groups.reduce((a, b) => (b.s.q3 - b.s.q1 > a.s.q3 - a.s.q1 ? b : a)); this.$note.innerHTML = 'Highest typical value: <b>' + esc(hi1.label) + '</b> (' + fmt(hi1.s.med, F) + '). Lowest: <b>' + esc(lo1.label) + '</b> (' + fmt(lo1.s.med, F) + '). Most spread out: ' + esc(wide.label) + '. Each box holds the middle half of a group; the thick line is its typical value (median). Tap a group.'; }
    }
  }

  /* ======================================================================================
   * Dumbbell: two values per row
   * data = { a:{label}, b:{label}, unit?, prefix?, better?:'up'|'down', zero?: true (start the scale at 0), rows:[{id,label,a,b}] }  options: { sort: 'data' }
   * ====================================================================================== */
  class Dumbbell extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'data' });
      this.rows = data.rows.map((r, i) => Object.assign({ i }, r, { a: +r.a, b: +r.b })); this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="dw-sortwrap"></div><svg role="group"></svg><div class="dw-legend"></div><p class="dw-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.dw-sortwrap'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dw-legend'); this.$note = el.querySelector('.dw-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; this.sort = b.dataset.sort; this.render(); this._emit('sort', { sort: this.sort }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const r = this.rows[this.sel]; this._emit('select', { id: r.id, change: r.b - r.a }); } });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, F = this._fmt, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rowH = 34, pl = narrow ? 90 : 140, pr = 16, pt = 8, pb = 28;
      const key = { data: r => r.i, a: r => -r.a, b: r => -r.b, change: r => -(r.b - r.a) }[this.sort] || (r => r.i), R = this.rows.slice().sort((x, y) => key(x) - key(y)), H = pt + R.length * rowH + pb;
      const all = this.rows.flatMap(r => [r.a, r.b]), mn = Math.min(...all), hi0 = Math.max(...all), st0 = niceStep(hi0 - mn || 1, 5), lo = d.zero ? Math.min(0, mn) : Math.floor((mn - st0 * 0.3) / st0) * st0, hi = hi0 + (hi0 - lo) * 0.06, sx = v => pl + ((v - lo) / (hi - lo)) * (W - pl - pr);
      const cA = T.muted, up = d.better === 'down' ? '#c2563a' : '#1f8a5b', down = d.better === 'down' ? '#1f8a5b' : '#c2563a';
      let s = ticks(lo, hi, narrow ? 4 : 6).map(v => '<line x1="' + f1(sx(v)) + '" y1="' + pt + '" x2="' + f1(sx(v)) + '" y2="' + (H - pb) + '" stroke="' + T.line + '"/>').join('');
      R.forEach((r, k) => {
        const y = pt + k * rowH + rowH / 2, on = this.sel === r.i, dim = this.sel != null && !on, cB = r.b >= r.a ? up : down, ch = r.b - r.a;
        s += '<g data-k="' + r.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(r.label + ': ' + d.a.label + ' ' + fmt(r.a, F) + ', ' + d.b.label + ' ' + fmt(r.b, F)) + '" opacity="' + (dim ? 0.35 : 1) + '">' +
          '<line x1="' + f1(sx(r.a)) + '" y1="' + y + '" x2="' + f1(sx(r.b)) + '" y2="' + y + '" stroke="' + cB + '" stroke-width="' + (on ? 5 : 3.5) + '" stroke-linecap="round" opacity=".55"/>' +
          '<rect x="0" y="' + (y - rowH / 2) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          '<circle cx="' + f1(sx(r.a)) + '" cy="' + y + '" r="6" fill="' + T.surface + '" stroke="' + cA + '" stroke-width="2.5"/><circle cx="' + f1(sx(r.b)) + '" cy="' + y + '" r="6.5" fill="' + cB + '"/>' +
          '<text x="' + (pl - 10) + '" y="' + (y + 4) + '" text-anchor="end" font-size="12" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(r.label, pl - 14, 12)) + '</text>' +
          (narrow && !on ? '' : '<text x="' + f1(Math.min(W - 4, Math.max(sx(r.a), sx(r.b)) + 12)) + '" y="' + (y + 4) + '" text-anchor="' + (Math.max(sx(r.a), sx(r.b)) + 60 > W ? 'end' : 'start') + '" font-size="11" font-weight="700" fill="' + cB + '" font-family="' + esc(T.mono) + '" pointer-events="none">' + (ch >= 0 ? '+' : '−') + esc(fmt(Math.abs(ch), { decimals: F.decimals })) + '</text>') + '</g>';
      });
      s += axisX(T, lo, hi, sx, H - pb, v => fmt(v, { prefix: F.prefix, decimals: F.decimals }), narrow ? 4 : 6, W);
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', d.a.label + ' and ' + d.b.label + ' for ' + R.length + ' rows');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = this._seg('Sort', [['data', 'As listed'], ['a', d.a.label], ['b', d.b.label], ['change', 'Change']], this.sort);
      this.$leg.innerHTML = '<span><i style="background:' + T.surface + ';border:2px solid ' + cA + ';border-radius:50%"></i>' + esc(d.a.label) + '</span><span><i style="background:' + up + ';border-radius:50%"></i>' + esc(d.b.label) + ', ' + (d.better === 'down' ? 'higher (worse)' : 'higher') + '</span><span><i style="background:' + down + ';border-radius:50%"></i>' + esc(d.b.label) + ', ' + (d.better === 'down' ? 'lower (better)' : 'lower') + '</span>';
      const ups = this.rows.filter(r => r.b > r.a).length, avg = mean(this.rows.map(r => r.b - r.a));
      if (this.sel != null) { const r = this.rows[this.sel], ch = r.b - r.a; this.$note.innerHTML = '<b>' + esc(r.label) + '</b>: ' + esc(d.a.label) + ' ' + fmt(r.a, F) + ', ' + esc(d.b.label) + ' ' + fmt(r.b, F) + ' — ' + (ch === 0 ? 'no change' : (ch > 0 ? 'up ' : 'down ') + fmt(Math.abs(ch), F) + (r.a ? ' (' + (ch > 0 ? '+' : '−') + pct(Math.abs(ch / r.a)) + ')' : '')) + '.'; }
      else { const big = this.rows.reduce((a, b) => (Math.abs(b.b - b.a) > Math.abs(a.b - a.a) ? b : a)); this.$note.innerHTML = '<b>' + ups + ' of ' + this.rows.length + '</b> went up from ' + esc(d.a.label.toLowerCase()) + ' to ' + esc(d.b.label.toLowerCase()) + '; the average change is ' + (avg >= 0 ? '+' : '−') + fmt(Math.abs(avg), F) + '. Biggest change: <b>' + esc(big.label) + '</b> (' + (big.b >= big.a ? '+' : '−') + fmt(Math.abs(big.b - big.a), F) + '). Tap a row.'; }
    }
  }

  /* ======================================================================================
   * Bulletbar: measures against targets over bands
   * data = { bandLabels?:['Poor','OK','Good'], rows:[{id,label,value,target,bands:[n,n,max],prefix?,suffix?,better?}] }  options: { mode: 'value' }
   * ====================================================================================== */
  class Bulletbar extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: 'value' });
      this.rows = data.rows.map((r, i) => Object.assign({ i }, r, { value: +r.value, target: +r.target })); this.mode = this.o.mode; this.sel = null;
      el.innerHTML = '<div class="dw-modewrap"></div><svg role="group"></svg><div class="dw-legend"></div><p class="dw-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.dw-modewrap'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dw-legend'); this.$note = el.querySelector('.dw-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-show]'); if (!b) return; this.mode = b.dataset.show; this.render(); this._emit('mode', { mode: this.mode }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const r = this.rows[this.sel]; this._emit('select', { id: r.id, value: r.value, target: r.target }); } });
      this.render();
    }
    _band(r) { const b = r.bands || [], lab = this.data.bandLabels || ['Poor', 'OK', 'Good'], down = r.better === 'down'; let k = b.findIndex(x => r.value <= +x); if (k < 0) k = b.length - 1; return lab[down ? lab.length - 1 - k : k] || ''; }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, pct0 = this.mode === 'percent', rowH = narrow ? 58 : 46, pl = narrow ? 8 : 150, pr = 12, H = this.rows.length * rowH + 6;
      const shades = ['#c9d6e0', '#dde7ee', '#eef3f7'];
      let s = '';
      this.rows.forEach((r, k) => {
        const F = { prefix: r.prefix, suffix: r.suffix }, max = pct0 ? Math.max(1.5, ...this.rows.map(x => x.value / x.target)) * 1.0 : +r.bands[r.bands.length - 1], sc = v => (pct0 ? v / r.target : v), x0 = pl, w = W - pl - pr, sx = v => x0 + clamp(sc(v) / max, 0, 1) * w;
        const top = narrow ? k * rowH + 20 : k * rowH + 8, bh = 26, on = this.sel === r.i, dim = this.sel != null && !on, hit = r.better === 'down' ? r.value <= r.target : r.value >= r.target;
        let bands = '', prev = 0; r.bands.forEach((b, j) => { const xa = sx(prev), xb = sx(+b); bands += '<rect x="' + f1(xa) + '" y="' + top + '" width="' + f1(Math.max(0, xb - xa)) + '" height="' + bh + '" fill="' + (r.better === 'down' ? shades[j] : shades[shades.length - 1 - j]) + '"/>'; prev = +b; });
        s += '<g data-k="' + r.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(r.label + ': ' + fmt(r.value, F) + ' against a target of ' + fmt(r.target, F)) + '" opacity="' + (dim ? 0.4 : 1) + '">' + bands +
          '<rect x="' + f1(x0) + '" y="' + (top + 9) + '" width="' + f1(Math.max(2, sx(r.value) - x0)) + '" height="8" fill="' + (hit ? T.fg : '#c2563a') + '"' + (on ? ' stroke="' + T.accent + '" stroke-width="2"' : '') + '/>' +
          '<line x1="' + f1(sx(r.target)) + '" y1="' + (top + 3) + '" x2="' + f1(sx(r.target)) + '" y2="' + (top + bh - 3) + '" stroke="' + T.fg + '" stroke-width="3"/>' +
          '<rect x="0" y="' + (top - (narrow ? 20 : 4)) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          (narrow ? '<text x="' + pl + '" y="' + (top - 6) + '" font-size="12" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(r.label) + ' <tspan font-weight="500" fill="' + T.muted + '">' + esc(pct0 ? pct(r.value / r.target) + ' of target' : fmt(r.value, F)) + '</tspan></text>'
            : '<text x="' + (pl - 10) + '" y="' + (top + 11) + '" text-anchor="end" font-size="12.5" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(r.label, pl - 14, 12.5)) + '</text><text x="' + (pl - 10) + '" y="' + (top + 25) + '" text-anchor="end" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(pct0 ? pct(r.value / r.target) + ' of target' : fmt(r.value, F)) + '</text>') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.rows.length + ' measures against their targets');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = this._seg('Show', [['value', 'Values'], ['percent', '% of target']], this.mode);
      const lab = d.bandLabels || ['Poor', 'OK', 'Good'];
      this.$leg.innerHTML = lab.map((l, j) => '<span><i style="background:' + shades[shades.length - 1 - j] + ';border:1px solid ' + T.line + '"></i>' + esc(l) + '</span>').join('') + '<span><i style="background:' + T.fg + ';width:3px;border-radius:0"></i>Target</span><span><i style="background:#c2563a"></i>Short of target</span>';
      const met = this.rows.filter(r => (r.better === 'down' ? r.value <= r.target : r.value >= r.target));
      if (this.sel != null) { const r = this.rows[this.sel], F = { prefix: r.prefix, suffix: r.suffix }, gap = r.value - r.target, hit = r.better === 'down' ? gap <= 0 : gap >= 0; this.$note.innerHTML = '<b>' + esc(r.label) + '</b>: ' + fmt(r.value, F) + ' against a target of ' + fmt(r.target, F) + ' (' + pct(r.value / r.target) + '). ' + (hit ? 'Target met' + (gap ? ' by ' + fmt(Math.abs(gap), F) : '') : fmt(Math.abs(gap), F) + ' to go') + '. Rated <b>' + esc(this._band(r).toLowerCase()) + '</b>.'; }
      else this.$note.innerHTML = '<b>' + met.length + ' of ' + this.rows.length + '</b> targets met' + (met.length < this.rows.length ? '; short: ' + this.rows.filter(r => !met.includes(r)).map(r => esc(r.label)).join(', ') : '') + '. The dark bar is the result, the upright line the target, the shading poor to good. Tap a row.';
    }
  }

  /* ======================================================================================
   * Ridgeline: smoothed shapes of each group's values
   * data = { unit?, prefix?, groups:[{id,label,values:[numbers]}] }  options: { overlap: 1.6 }
   * ====================================================================================== */
  class Ridgeline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { overlap: 1.6 });
      this.groups = data.groups.map((g, i) => { const v = numsOf(g.values).map(x => x.value).sort((a, b) => a - b); return Object.assign({ i }, g, { v, s: summary(v.map(x => ({ value: x }))) }); });
      this.overlap = this.o.overlap; this.sel = null; this.at = null;
      const all = this.groups.flatMap(g => g.v); this._lo = Math.min(...all); this._hi = Math.max(...all); const pad = (this._hi - this._lo) * 0.08, pos = this._lo >= 0; this._lo -= pad; this._hi += pad; if (pos) this._lo = Math.max(0, this._lo);
      this.groups.forEach(g => { const sd = Math.sqrt(mean(g.v.map(x => (x - g.s.mean) ** 2))) || 1, bw = 1.06 * sd * Math.pow(g.v.length, -0.2), n = 120; g.d = []; for (let k = 0; k <= n; k++) { const x = this._lo + (k / n) * (this._hi - this._lo); g.d.push([x, g.v.reduce((a, v) => a + Math.exp(-0.5 * ((x - v) / bw) ** 2), 0) / (g.v.length * bw * Math.sqrt(2 * Math.PI))]); } g.peak = Math.max(...g.d.map(p => p[1])); g.mode = g.d.reduce((a, b) => (b[1] > a[1] ? b : a))[0]; });
      el.innerHTML = '<svg role="group"></svg><p class="dw-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dw-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.groups[this.sel].id }); });
      const at = e => { const r = this.$svg.getBoundingClientRect(), x = (e.clientX - r.left) * (this._W / r.width); if (x < this._pl) return; this.at = this._lo + ((x - this._pl) / (this._W - this._pl - 10)) * (this._hi - this._lo); this.render(); this._emit('move', { value: Math.round(this.at * 10) / 10 }); };
      this.$svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) at(e); });
      this.$svg.addEventListener('pointerdown', at);
      this.$svg.setAttribute('tabindex', '0');
      this.$svg.addEventListener('keydown', e => { if (e.target !== this.$svg) return; const dd = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (!dd) return; e.preventDefault(); const st = (this._hi - this._lo) / 40; this.at = clamp((this.at == null ? (this._lo + this._hi) / 2 : this.at) + dd * st, this._lo, this._hi); this.render(); this._emit('move', { value: Math.round(this.at * 10) / 10 }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), F = this._fmt, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, step = narrow ? 34 : 40, pl = narrow ? 74 : 110, pt = step * this.overlap, pb = 28, n = this.groups.length, H = pt + (n - 1) * step + 10 + pb;
      this._W = W; this._pl = pl; const sx = v => pl + ((v - this._lo) / (this._hi - this._lo)) * (W - pl - 10), gmax = Math.max(...this.groups.map(g => g.peak)), amp = step * this.overlap;
      let s = ticks(this._lo, this._hi, narrow ? 4 : 7).map(v => '<line x1="' + f1(sx(v)) + '" y1="4" x2="' + f1(sx(v)) + '" y2="' + (H - pb) + '" stroke="' + T.line + '"/>').join('');
      const order = this.groups.slice(); if (this.sel != null) { order.splice(order.findIndex(g => g.i === this.sel), 1); order.push(this.groups[this.sel]); }
      order.forEach(g => {
        const base = pt + g.i * step, c = colorFor(this.el, g, g.i), on = this.sel === g.i, dim = this.sel != null && !on, line = g.d.map((p, k) => (k ? 'L' : 'M') + f1(sx(p[0])) + ' ' + f1(base - (p[1] / gmax) * amp)).join(' ');
        s += '<g data-k="' + g.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(g.label + ': most common around ' + fmt(g.mode, F) + ', median ' + fmt(g.s.med, F)) + '" opacity="' + (dim ? 0.35 : 1) + '"><path d="' + line + ' L' + f1(sx(this._hi)) + ' ' + base + ' L' + f1(sx(this._lo)) + ' ' + base + 'Z" fill="' + c + '" fill-opacity="' + (on ? 0.75 : 0.5) + '" stroke="' + T.surface + '" stroke-width="1.5"/><path d="' + line + '" fill="none" stroke="' + c + '" stroke-width="' + (on ? 2.5 : 1.5) + '"/>' +
          '<line x1="' + f1(sx(g.s.med)) + '" y1="' + base + '" x2="' + f1(sx(g.s.med)) + '" y2="' + f1(base - (g.d[Math.round(((g.s.med - this._lo) / (this._hi - this._lo)) * 120)][1] / gmax) * amp) + '" stroke="' + T.fg + '" stroke-width="1.5" stroke-dasharray="3 2"/>' +
          '<text x="' + (pl - 8) + '" y="' + (base - 3) + '" text-anchor="end" font-size="12" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(g.label, pl - 10, 12)) + '</text></g>';
      });
      if (this.at != null) s += '<line x1="' + f1(sx(this.at)) + '" y1="4" x2="' + f1(sx(this.at)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '" stroke-width="1.5" pointer-events="none"/>';
      s += axisX(T, this._lo, this._hi, sx, H - pb, v => fmt(v, { prefix: F.prefix, decimals: F.decimals }), narrow ? 4 : 7, W);
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Shapes of ' + n + ' groups. Use the left and right arrow keys to read every group at one value.');
      this._keep(this.$svg, s);
      if (this.at != null) { const share = g => g.v.filter(v => v <= this.at).length / g.v.length; this.$note.innerHTML = 'At or below <b>' + fmt(this.at, F) + '</b>: ' + this.groups.map(g => esc(g.label) + ' ' + pct(share(g))).join(', ') + '.'; }
      else if (this.sel != null) { const g = this.groups[this.sel]; this.$note.innerHTML = '<b>' + esc(g.label) + '</b> (' + g.v.length + ' values): most common around ' + fmt(g.mode, F) + '; median ' + fmt(g.s.med, F) + '; middle half ' + span(g.s.q1, g.s.q3, F) + '.'; }
      else { const hi1 = this.groups.reduce((a, b) => (b.s.med > a.s.med ? b : a)), lo1 = this.groups.reduce((a, b) => (b.s.med < a.s.med ? b : a)); this.$note.innerHTML = 'Highest median: <b>' + esc(hi1.label) + '</b> (' + fmt(hi1.s.med, F) + '); lowest: <b>' + esc(lo1.label) + '</b> (' + fmt(lo1.s.med, F) + '). Taller means more values there; the dashed line is the median. Drag across to compare at one value, or tap a group.'; }
    }
  }

  /* ======================================================================================
   * Marimekko: shares in two directions
   * data = { cols:[{id,label}], rows:[{id,label,color?}], values:[[row values] per column], unit?, prefix? }
   * ====================================================================================== */
  class Marimekko extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.cols = data.cols.map((c, i) => Object.assign({ i }, c)); this.rows = data.rows.map((r, i) => Object.assign({ i }, r)); this.v = data.values.map(r => r.map(Number)); this.sel = null; this.hl = null;
      el.innerHTML = '<svg role="group"></svg><div class="dw-legend"></div><p class="dw-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dw-legend'); this.$note = el.querySelector('.dw-note');
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.hl = null; this.render(); if (this.sel) { const [c, r] = k.split(':').map(Number); this._emit('select', { col: this.cols[c].id, row: this.rows[r].id, value: this.v[c][r] }); } });
      this.$leg.addEventListener('click', e => { const b = e.target.closest('[data-row]'); if (!b) return; this.hl = this.hl === +b.dataset.row ? null : +b.dataset.row; this.sel = null; this.render(); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, F = this._fmt, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 300 : 360, pt = 26, pb = 6, pl = 34, pr = 4;
      const ct = this.v.map(r => r.reduce((a, b) => a + b, 0)), tot = ct.reduce((a, b) => a + b, 0), rt = this.rows.map((_, r) => this.v.reduce((a, c) => a + c[r], 0));
      let s = [0, 0.25, 0.5, 0.75, 1].map(p => '<text x="' + (pl - 5) + '" y="' + f1(pt + (1 - p) * (H - pt - pb) + 4) + '" text-anchor="end" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + pct(p) + '</text>').join('');
      let x = pl; const cw = W - pl - pr;
      this.cols.forEach((c, ci) => {
        const w = (ct[ci] / tot) * cw; let y = H - pb;
        const lx = clamp(x + w / 2, pl + 18, W - 22); s += '<text x="' + f1(lx) + '" y="' + (pt - 14) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + T.fg + '">' + esc(fitText(c.label, Math.max(w - 4, 40), 11.5)) + '</text><text x="' + f1(lx) + '" y="' + (pt - 3) + '" text-anchor="middle" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + (w > 34 ? pct(ct[ci] / tot) : '') + '</text>';
        this.rows.forEach((r, ri) => {
          const val = this.v[ci][ri], h = ct[ci] ? (val / ct[ci]) * (H - pt - pb) : 0, k = ci + ':' + ri, on = this.sel === k, dim = (this.sel && !on) || (this.hl != null && this.hl !== ri), col = colorFor(this.el, r, r.i);
          y -= h;
          s += '<g data-k="' + k + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(c.label + ', ' + r.label + ': ' + fmt(val, F) + ', ' + pct(val / (ct[ci] || 1)) + ' of ' + c.label) + '" opacity="' + (dim ? 0.3 : 1) + '"><rect x="' + f1(x + 1) + '" y="' + f1(y + 1) + '" width="' + f1(Math.max(0, w - 2)) + '" height="' + f1(Math.max(0, h - 2)) + '" fill="' + col + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="3"' : '') + '/>' +
            (w > 40 && h > 18 ? '<text x="' + f1(x + w / 2) + '" y="' + f1(y + h / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" pointer-events="none">' + pct(val / (ct[ci] || 1)) + '</text>' : '') + '</g>';
        });
        x += w;
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Shares by ' + this.cols.length + ' columns and ' + this.rows.length + ' parts. Column widths show each column\'s share of the total.');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = this.rows.map(r => '<button type="button" class="dw-btn" data-row="' + r.i + '" aria-pressed="' + (this.hl === r.i) + '" style="padding:4px 10px;font-size:12.5px"><i style="background:' + esc(colorFor(this.el, r, r.i)) + '"></i>' + esc(r.label) + ' ' + pct(rt[r.i] / tot) + '</button>').join('');
      if (this.sel) { const [ci, ri] = this.sel.split(':').map(Number), val = this.v[ci][ri], c = this.cols[ci], r = this.rows[ri]; this.$note.innerHTML = '<b>' + esc(c.label) + ' · ' + esc(r.label) + '</b>: ' + fmt(val, F) + '. That is <b>' + pct(val / (ct[ci] || 1)) + '</b> of ' + esc(c.label) + ', ' + pct(val / (rt[ri] || 1)) + ' of all ' + esc(r.label.toLowerCase()) + ', and ' + pct(val / tot) + ' of the total.'; }
      else if (this.hl != null) { const r = this.rows[this.hl], sh = this.cols.map((c, ci) => [c, this.v[ci][this.hl] / (ct[ci] || 1)]).sort((a, b) => b[1] - a[1]); this.$note.innerHTML = '<b>' + esc(r.label) + '</b>: ' + pct(rt[this.hl] / tot) + ' overall. Biggest share in <b>' + esc(sh[0][0].label) + '</b> (' + pct(sh[0][1]) + '), smallest in ' + esc(sh[sh.length - 1][0].label) + ' (' + pct(sh[sh.length - 1][1]) + ').'; }
      else { const big = this.cols.reduce((a, c) => (ct[c.i] > ct[a.i] ? c : a)), topR = this.rows.reduce((a, r) => (rt[r.i] > rt[a.i] ? r : a)); this.$note.innerHTML = 'Widest column: <b>' + esc(big.label) + '</b> (' + pct(ct[big.i] / tot) + ' of the total ' + fmt(tot, F) + '). Largest part overall: <b>' + esc(topR.label) + '</b> (' + pct(rt[topR.i] / tot) + '). Width shows a column\'s size, height the split inside it. Tap a block or a key.'; }
    }
  }

  return { Histobins, Boxplot, Dumbbell, Bulletbar, Ridgeline, Marimekko, summary };
});
