/*! Insight 1.0 · Dimau Infographics
 *  Six formats for reading numbers and spotting patterns:
 *    Factwall  headline facts as big numbers that count up, with shares shown as dots and the source on tap.
 *    Swarm     every item as a dot along one scale (a beeswarm), split by group, with medians and a marker line.
 *    Scatter   two measures against each other, with a trend line and how strong the link is in words.
 *    Heatgrid  a table coloured by size (day by hour, place by month), with row totals and arrow-key reading.
 *    Bridge    a waterfall from a starting amount to an ending amount through each rise and fall; step through it.
 *    Overlap   a Venn diagram of two or three groups; tap any region for how many are in it.
 *
 *  new Factwall(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Factwall', 'Swarm', 'Scatter', 'Heatgrid', 'Bridge', 'Overlap'].forEach(function (k) { root[k] = m[k]; }); root.DimauInsight = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#7a6bd1', '#c2563a'];
  const DOWN = '#d9822b';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { minimumFractionDigits: o.fixed || 0, maximumFractionDigits: o.decimals != null ? o.decimals : (Math.abs(n) < 10 ? 1 : 0) }) + (o.suffix || '') : '–'; };
  const signed = (n, o) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtNum(Math.abs(n), o);
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
  /** Round tick values for an axis from lo to hi. */
  function ticks(lo, hi, n) {
    const span = hi - lo || 1, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= raw) || raw;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };

  const STYLE = `
.dn{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dn) button{font:inherit;color:inherit}
.dn :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dn svg{display:block;width:100%}
.dn-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.dn-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.dn-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dn-btn i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:-1px}
.dn-btn[aria-pressed="false"] i{opacity:.35}
.dn-note{font-size:14px;line-height:1.5;margin:10px 0 0;min-height:1.5em}
.dn-hot{cursor:pointer}
.dn-hot:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dn-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dn-legend[hidden]{display:none}
.dn-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}
.fw-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.fw-card{display:grid;gap:6px;align-content:start;text-align:left;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:14px;padding:16px;cursor:pointer}
.fw-card:hover{border-color:var(--di-accent,#0b6fa4)}
.fw-card[aria-expanded="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.fw-num{font-size:40px;line-height:1.05;font-weight:800;color:var(--di-accent,#0b6fa4);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.fw-label{font-size:14.5px;font-weight:700;line-height:1.35}
.fw-cmp{font:600 12px/1.3 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
.fw-dots{display:flex;gap:4px;margin-top:2px}
.fw-dots span{width:13px;height:13px;border-radius:50%;background:var(--di-line,#c9dce8)}
.fw-dots span.on{background:var(--di-accent,#0b6fa4)}
.fw-more{font-size:13px;line-height:1.5;color:var(--di-fg,#13263a);border-top:1px dashed var(--di-line,#c9dce8);padding-top:8px;margin-top:4px}
.fw-more small{display:block;color:var(--di-muted,#4f6578);margin-top:4px}
.fw-more[hidden]{display:none}
.ov-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.ov-chips button{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:999px;padding:5px 11px;font-size:12.5px;cursor:pointer}
.ov-chips button[aria-pressed="true"]{border-color:var(--di-accent,#0b6fa4);background:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
`;
  function injectStyle() {
    if (document.getElementById('dn-style')) return;
    const s = document.createElement('style'); s.id = 'dn-style'; s.textContent = STYLE; document.head.appendChild(s);
  }
  let uid = 0;

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {}; this._id = 'dn' + (++uid);
      el.classList.add('dn');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _hot(container, fn) {
      container.addEventListener('click', e => { const g = e.target.closest('.dn-hot'); if (g) fn(g.dataset.k, g); });
      container.addEventListener('keydown', e => { const g = e.target.closest('.dn-hot'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k, g); } });
    }
    _paint(svg, html) {
      const a = document.activeElement, keep = a && svg.contains(a) && a.dataset ? a.dataset.k : null;
      svg.innerHTML = html;
      if (keep != null) { const g = svg.querySelector('.dn-hot[data-k="' + CSS.escape(keep) + '"]'); g && g.focus({ preventScroll: true }); }
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dn'); }
  }

  /* ======================================================================================
   * Factwall: headline numbers that count up; tap for detail and source
   * data = { facts:[{id, value, label, prefix?, suffix?, decimals?, share?:0..1, compare?:{value,label}, detail?, source?}] }
   * options: { countUp: true }
   * ====================================================================================== */
  class Factwall extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { countUp: true });
      this.facts = data.facts.map((f, i) => Object.assign({ i }, f, { value: +f.value }));
      this.open = null;
      el.innerHTML = '<div class="fw-grid">' + this.facts.map(f => this._card(f)).join('') + '</div>';
      this.$grid = el.querySelector('.fw-grid');
      this.$grid.addEventListener('click', e => { const c = e.target.closest('.fw-card'); if (c) this.toggle(c.dataset.id); });
      this._count();
    }
    _fmt(f, v) { return fmtNum(v, { prefix: f.prefix, suffix: f.suffix, decimals: f.decimals != null ? f.decimals : (Number.isInteger(f.value) ? 0 : 1), fixed: f.decimals || 0 }); }
    _card(f) {
      const on = f.share != null ? Math.round(clamp(+f.share, 0, 1) * 10) : 0;
      return '<button type="button" class="fw-card" data-id="' + esc(f.id) + '" aria-expanded="false" aria-label="' + esc(this._fmt(f, f.value) + ' ' + f.label) + '">' +
        '<span class="fw-num" data-v>' + esc(this._fmt(f, this.o.countUp && !reduced() ? 0 : f.value)) + '</span>' +
        '<span class="fw-label">' + esc(f.label) + '</span>' +
        (f.share != null ? '<span class="fw-dots" aria-hidden="true">' + Array.from({ length: 10 }, (_, k) => '<span' + (k < on ? ' class="on"' : '') + '></span>').join('') + '</span>' : '') +
        (f.compare ? '<span class="fw-cmp">' + esc(f.compare.label + ': ' + this._fmt(f, +f.compare.value) + ' (' + signed(f.value - f.compare.value, { decimals: f.decimals }) + ')') + '</span>' : '') +
        (f.detail || f.source ? '<span class="fw-more" hidden>' + esc(f.detail || '') + (f.source ? '<small>Source: ' + esc(f.source) + '</small>' : '') + '</span>' : '') + '</button>';
    }
    _count() {
      const cards = [...this.$grid.querySelectorAll('.fw-card')];
      const run = c => {
        if (c._done) return; c._done = true;
        const f = this.facts.find(x => x.id === c.dataset.id), n = c.querySelector('[data-v]');
        if (!this.o.countUp || reduced()) { n.textContent = this._fmt(f, f.value); return; }
        const t0 = performance.now(), go = t => { const k = clamp((t - t0) / 900, 0, 1), e = 1 - Math.pow(1 - k, 3); n.textContent = this._fmt(f, k < 1 ? f.value * e : f.value); if (k < 1) requestAnimationFrame(go); };
        requestAnimationFrame(go);
      };
      if (typeof IntersectionObserver === 'function') { this._io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) run(e.target); }), { threshold: 0.3 }); cards.forEach(c => this._io.observe(c)); }
      else cards.forEach(run);
      this._teardown = () => this._io && this._io.disconnect();
    }
    toggle(id) {
      this.$grid.querySelectorAll('.fw-card').forEach(c => { const on = c.dataset.id === id && c.getAttribute('aria-expanded') !== 'true'; c.setAttribute('aria-expanded', String(on)); const m = c.querySelector('.fw-more'); if (m) m.hidden = !on; });
      this.open = this.$grid.querySelector('.fw-card[aria-expanded="true"]') ? id : null;
      if (this.open) { const f = this.facts.find(x => x.id === id); this._emit('select', { id: f.id, value: f.value }); }
    }
    render() { /* cards size themselves with CSS */ }
  }

  /* ======================================================================================
   * Swarm: one dot per item along a scale, optionally split by group
   * data = { x:{label,prefix?,suffix?,min?,max?}, groups:[{id,label,color?}], items:[{id,label,value,group,note?}], marker?:{value,label} }
   * options: { split: true }
   * ====================================================================================== */
  class Swarm extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { split: true });
      this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g));
      this.items = data.items.map((t, i) => Object.assign({ i }, t, { value: +t.value }));
      this.split = this.o.split; this.sel = null;
      el.innerHTML = (this.groups.length > 1 ? '<div class="dn-bar" role="group" aria-label="Layout"><button type="button" class="dn-btn" data-l="split">By group</button><button type="button" class="dn-btn" data-l="all">All together</button></div>' : '') + '<svg role="img"></svg><div class="dn-legend"></div><p class="dn-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$legend = el.querySelector('.dn-legend'); this.$note = el.querySelector('.dn-note');
      el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { this.split = b.dataset.l === 'split'; this.render(); this._emit('layout', { split: this.split }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const t = this.items[this.sel]; this._emit('select', { id: t.id, value: t.value }); } });
      this.render();
    }
    _place(list, sx, r) {
      const placed = [], d = r * 2 + 1;
      list.slice().sort((a, b) => a.value - b.value).forEach(t => {
        const x = sx(t.value); let off = 0;
        for (let k = 0; k < 400; k++) {
          off = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (r * 1.05);
          if (!placed.some(p => Math.abs(p.x - x) < d && Math.abs(p.off - off) < d)) break;
        }
        placed.push({ t, x, off });
      });
      return placed;
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, X = d.x || {};
      const vals = this.items.map(t => t.value), lo = X.min != null ? +X.min : Math.min(...vals), hi = X.max != null ? +X.max : Math.max(...vals);
      const padL = 8, padR = 8, labH = 18, r = narrow ? 4.5 : 5.5, sx = v => padL + ((v - lo) / (hi - lo || 1)) * (W - padL - padR);
      const rows = this.split && this.groups.length > 1 ? this.groups.map(g => ({ g, list: this.items.filter(t => t.group === g.id) })) : [{ g: null, list: this.items }];
      let y = 6, s = '';
      const layout = rows.map(row => { const p = this._place(row.list, sx, r), ext = Math.max(r, ...p.map(q => Math.abs(q.off) + r)); const top = y + (row.g ? labH : 0), mid = top + ext + 2; y = mid + ext + 14; return { row, p, top, mid, ext }; });
      const H = y + 36, axisY = y;
      const tk = ticks(lo, hi, narrow ? 4 : 7);
      tk.forEach(v => { s += '<line x1="' + f1(sx(v)) + '" y1="4" x2="' + f1(sx(v)) + '" y2="' + axisY + '" stroke="' + T.line + '" stroke-width="1" opacity=".6"/><text x="' + f1(clamp(sx(v), 14, W - 14)) + '" y="' + (axisY + 15) + '" text-anchor="middle" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(v, X)) + '</text>'; });
      if (d.marker) { const mx = sx(+d.marker.value); s += '<line x1="' + f1(mx) + '" y1="2" x2="' + f1(mx) + '" y2="' + axisY + '" stroke="' + DOWN + '" stroke-width="2" stroke-dasharray="5 4"/><text x="' + f1(clamp(mx + 5, 0, W - 80)) + '" y="' + (axisY - 4) + '" font-size="11.5" font-weight="700" fill="' + DOWN + '">' + esc(d.marker.label) + '</text>'; }
      layout.forEach(L => {
        if (L.row.g) s += '<text x="0" y="' + (L.top - 4) + '" font-size="12.5" font-weight="800" fill="' + colorFor(this.el, L.row.g, L.row.g.i) + '">' + esc(L.row.g.label) + '</text>';
        const med = median(L.row.list.map(t => t.value));
        if (isFinite(med)) s += '<line x1="' + f1(sx(med)) + '" y1="' + f1(L.mid - L.ext - 2) + '" x2="' + f1(sx(med)) + '" y2="' + f1(L.mid + L.ext + 2) + '" stroke="' + T.fg + '" stroke-width="2"/>';
        L.p.forEach(q => {
          const g = this.groups.find(x => x.id === q.t.group), c = g ? colorFor(this.el, g, g.i) : T.accent, on = this.sel === q.t.i;
          s += '<g class="dn-hot" tabindex="0" role="button" data-k="' + q.t.i + '" aria-pressed="' + on + '" aria-label="' + esc(q.t.label + ': ' + fmtNum(q.t.value, X) + (g ? ', ' + g.label : '')) + '"><circle cx="' + f1(q.x) + '" cy="' + f1(L.mid + q.off) + '" r="' + (on ? r + 3 : r) + '" fill="' + c + '" stroke="' + (on ? T.fg : T.surface) + '" stroke-width="' + (on ? 2 : 1) + '"' + (this.sel != null && !on ? ' opacity=".55"' : '') + '/></g>';
        });
      });
      s += '<text x="' + W + '" y="' + (H - 2) + '" text-anchor="end" font-size="11.5" font-weight="700" fill="' + T.fg + '">' + esc((X.label || '') + ' →') + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (X.label || 'Values') + ': ' + rows.map(R => (R.g ? R.g.label + ' ' : '') + R.list.length + ' items, median ' + fmtNum(median(R.list.map(t => t.value)), X)).join('; '));
      this._paint(this.$svg, s);
      this.el.querySelectorAll('[data-l]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.l === 'split') === this.split)));
      this.$legend.innerHTML = (this.split ? '' : this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</span>').join('')) + '<span>Black line: the middle value (median)</span>';
      const t = this.sel != null ? this.items[this.sel] : null;
      if (t) {
        const sorted = this.items.slice().sort((a, b) => b.value - a.value), rank = sorted.findIndex(x => x.i === t.i) + 1, below = this.items.filter(x => x.value < t.value).length, g = this.groups.find(x => x.id === t.group);
        this.$note.innerHTML = '<b>' + esc(t.label) + '</b>' + (g ? ' (' + esc(g.label) + ')' : '') + ': ' + esc(fmtNum(t.value, X)) + '. Number ' + rank + ' of ' + this.items.length + ', higher than ' + pct(below, this.items.length) + '% of all.' + (d.marker ? ' ' + (t.value >= +d.marker.value ? 'At or above' : 'Below') + ' the ' + esc(d.marker.label.toLowerCase()) + '.' : '') + (t.note ? ' ' + esc(t.note) : '');
      } else {
        const meds = rows.filter(R => R.g).map(R => ({ g: R.g, m: median(R.list.map(x => x.value)) })).sort((a, b) => b.m - a.m);
        this.$note.innerHTML = (meds.length ? 'Middle values: ' + meds.map(m => '<b>' + esc(m.g.label) + '</b> ' + esc(fmtNum(m.m, X))).join(', ') + '.' : 'Middle value: <b>' + esc(fmtNum(median(vals), X)) + '</b>.') +
          (d.marker ? ' ' + this.items.filter(x => x.value >= +d.marker.value).length + ' of ' + this.items.length + ' are at or above the ' + esc(d.marker.label.toLowerCase()) + '.' : '') + ' Tap a dot for detail.';
      }
    }
  }

  /* ======================================================================================
   * Scatter: two measures, with a trend line and how strong the link is
   * data = { x:{label,prefix?,suffix?}, y:{label,prefix?,suffix?}, size?:{label}, groups?:[{id,label,color?}],
   *          items:[{id,label,x,y,size?,group?,note?,show?}] }
   * options: { trend: true }
   * ====================================================================================== */
  class Scatter extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { trend: true });
      this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g));
      this.items = data.items.map((t, i) => Object.assign({ i }, t, { x: +t.x, y: +t.y }));
      this.hidden = new Set(); this.trend = this.o.trend; this.sel = null;
      el.innerHTML = '<div class="dn-bar" role="group" aria-label="Show"></div><svg role="img"></svg><p class="dn-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.dn-bar'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dn-note');
      this.$bar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.t != null) { this.trend = !this.trend; this.render(); return; }
        const id = b.dataset.g; if (this.hidden.has(id)) this.hidden.delete(id); else if (this.groups.length - this.hidden.size > 1) this.hidden.add(id);
        this.sel = null; this.render(); this._emit('filter', { visible: this.groups.filter(g => !this.hidden.has(g.id)).map(g => g.id) });
      });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const t = this.items[this.sel]; this._emit('select', { id: t.id, x: t.x, y: t.y }); } });
      this.render();
    }
    _vis() { return this.items.filter(t => !t.group || !this.hidden.has(t.group)); }
    fit(list) {
      const n = list.length; if (n < 3) return null;
      const mx = list.reduce((s, t) => s + t.x, 0) / n, my = list.reduce((s, t) => s + t.y, 0) / n;
      let sxy = 0, sxx = 0, syy = 0; list.forEach(t => { sxy += (t.x - mx) * (t.y - my); sxx += (t.x - mx) ** 2; syy += (t.y - my) ** 2; });
      if (!sxx || !syy) return null;
      const b = sxy / sxx; return { b, a: my - b * mx, r: sxy / Math.sqrt(sxx * syy) };
    }
    render() {
      const T = themeOf(this.el), d = this.data, X = d.x || {}, Y = d.y || {}, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520;
      const H = narrow ? Math.round(W * 0.9) : Math.min(500, Math.round(W * 0.55)), pl = narrow ? 40 : 52, pb = 40, pt = 30, pr = 14;
      const xs = this.items.map(t => t.x), ys = this.items.map(t => t.y), tx = ticks(Math.min(...xs), Math.max(...xs), narrow ? 4 : 6), ty = ticks(Math.min(...ys), Math.max(...ys), 5);
      const px = (Math.max(...xs) - Math.min(...xs)) * 0.04 || 1, py = (Math.max(...ys) - Math.min(...ys)) * 0.06 || 1;
      const x0 = Math.min(tx[0], Math.min(...xs) - px), x1 = Math.max(tx[tx.length - 1], Math.max(...xs) + px), y0 = Math.min(ty[0], Math.min(...ys) - py), y1 = Math.max(ty[ty.length - 1], Math.max(...ys) + py);
      const sx = v => pl + ((v - x0) / (x1 - x0 || 1)) * (W - pl - pr), sy = v => pt + (1 - (v - y0) / (y1 - y0 || 1)) * (H - pt - pb);
      const sizes = this.items.map(t => +t.size).filter(isFinite), smax = sizes.length ? Math.max(...sizes) : 0, rad = t => smax && isFinite(+t.size) ? 4 + (narrow ? 8 : 12) * Math.sqrt(+t.size / smax) : (narrow ? 5.5 : 6.5);
      let s = '';
      tx.forEach(v => { s += '<line x1="' + f1(sx(v)) + '" y1="' + pt + '" x2="' + f1(sx(v)) + '" y2="' + (H - pb) + '" stroke="' + T.line + '" opacity=".6"/><text x="' + f1(sx(v)) + '" y="' + (H - pb + 15) + '" text-anchor="middle" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(v, X)) + '</text>'; });
      ty.forEach(v => { s += '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '" opacity=".6"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(v, Y)) + '</text>'; });
      s += '<text x="' + (W - pr) + '" y="' + (H - 4) + '" text-anchor="end" font-size="12" font-weight="700" fill="' + T.fg + '">' + esc((X.label || 'x') + ' →') + '</text>' +
        '<text x="' + (pl - 6) + '" y="14" font-size="12" font-weight="700" fill="' + T.fg + '">' + esc('↑ ' + (Y.label || 'y')) + '</text>';
      const vis = this._vis(), fit = this.fit(vis);
      if (this.trend && fit) { const a = x0, b = x1; s += '<line x1="' + f1(sx(a)) + '" y1="' + f1(sy(fit.a + fit.b * a)) + '" x2="' + f1(sx(b)) + '" y2="' + f1(sy(fit.a + fit.b * b)) + '" stroke="' + T.fg + '" stroke-width="2" stroke-dasharray="7 5" opacity=".7"/>'; }
      const ord = vis.slice().sort((a, b) => (a.i === this.sel) - (b.i === this.sel) || (+b.size || 0) - (+a.size || 0));
      ord.forEach(t => {
        const g = this.groups.find(x => x.id === t.group), c = g ? colorFor(this.el, g, g.i) : T.accent, on = this.sel === t.i, cx = sx(t.x), cy = sy(t.y), rr = rad(t);
        const lab = on || t.show, left = cx > W * 0.7;
        s += '<g class="dn-hot" tabindex="0" role="button" data-k="' + t.i + '" aria-pressed="' + on + '" aria-label="' + esc(t.label + ': ' + (X.label || 'x') + ' ' + fmtNum(t.x, X) + ', ' + (Y.label || 'y') + ' ' + fmtNum(t.y, Y)) + '">' +
          '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(on ? rr + 2 : rr) + '" fill="' + c + '" fill-opacity="' + (this.sel != null && !on ? 0.35 : 0.8) + '" stroke="' + (on ? T.fg : T.surface) + '" stroke-width="' + (on ? 2 : 1) + '"/>' +
          (lab ? '<text x="' + f1(left ? cx - rr - 4 : cx + rr + 4) + '" y="' + f1(cy + 4) + '" text-anchor="' + (left ? 'end' : 'start') + '" font-size="12" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3" stroke-linejoin="round">' + esc(fitText(t.label, 140, 12)) + '</text>' : '') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (X.label || 'x') + ' against ' + (Y.label || 'y') + ' for ' + vis.length + ' items. ' + this._link(fit));
      this._paint(this.$svg, s);
      this.$bar.innerHTML = this.groups.map(g => '<button type="button" class="dn-btn" data-g="' + esc(g.id) + '" aria-pressed="' + !this.hidden.has(g.id) + '"><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</button>').join('') +
        '<button type="button" class="dn-btn" data-t aria-pressed="' + this.trend + '">Trend line</button>';
      const t = this.sel != null ? this.items[this.sel] : null;
      if (t) {
        const exp = fit ? fit.a + fit.b * t.x : null;
        this.$note.innerHTML = '<b>' + esc(t.label) + '</b>: ' + esc((X.label || 'x') + ' ' + fmtNum(t.x, X) + ', ' + (Y.label || 'y') + ' ' + fmtNum(t.y, Y)) + (d.size && isFinite(+t.size) ? ', ' + esc(d.size.label + ' ' + fmtNum(+t.size)) : '') + '.' +
          (exp != null && Math.abs(fit.r) >= 0.2 ? ' That is ' + (t.y >= exp ? 'above' : 'below') + ' the trend by ' + esc(fmtNum(Math.abs(t.y - exp), Y)) + '.' : '') + (t.note ? ' ' + esc(t.note) : '');
      } else this.$note.innerHTML = esc(this._link(fit)) + ' Tap a dot for detail.';
    }
    _link(fit) {
      const X = this.data.x || {}, Y = this.data.y || {}, n = this._vis().length;
      if (!fit) return 'Not enough points to judge a link.';
      const a = Math.abs(fit.r), w = a < 0.2 ? 'hardly any' : a < 0.4 ? 'a weak' : a < 0.7 ? 'a moderate' : 'a strong';
      return 'Across the ' + n + ' shown there is ' + w + ' link' + (a < 0.2 ? '' : ': as ' + (X.label || 'x').toLowerCase() + ' goes up, ' + (Y.label || 'y').toLowerCase() + ' tends to go ' + (fit.r > 0 ? 'up' : 'down')) + ' (r = ' + (fit.r < 0 ? '−' : '') + Math.abs(fit.r).toFixed(2) + '). A link is not proof that one causes the other.';
    }
  }

  /* ======================================================================================
   * Heatgrid: a table coloured by size, with row totals; arrow keys move between cells
   * data = { rows:[{id,label}], cols:[{id,label}], values:[[number]], prefix?, suffix?, label? }
   * ====================================================================================== */
  class Heatgrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'given' });
      this.rows = data.rows.map((r, i) => Object.assign({ i, total: (data.values[i] || []).reduce((s, v) => s + (+v || 0), 0) }, r));
      this.sort = this.o.sort; this.cur = [0, 0]; this.sel = null;
      el.innerHTML = '<div class="dn-bar" role="group" aria-label="Order rows"><button type="button" class="dn-btn" data-s="given">As given</button><button type="button" class="dn-btn" data-s="total">Biggest first</button></div><svg role="grid"></svg><p class="dn-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dn-note');
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { this.sort = b.dataset.s; this.render(); this._emit('sort', { by: this.sort }); });
      this._hot(this.$svg, k => { const [r, c] = k.split(':').map(Number); this.pick(r, c); });
      this.$svg.addEventListener('keydown', e => {
        const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!mv) return;
        e.preventDefault(); const order = this._order(), pos = order.findIndex(r => r.i === this.cur[0]);
        const nr = order[clamp(pos + mv[0], 0, order.length - 1)].i, nc = clamp(this.cur[1] + mv[1], 0, this.data.cols.length - 1);
        this.pick(nr, nc, true);
      });
      this.render();
    }
    _order() { const r = this.rows.slice(); return this.sort === 'total' ? r.sort((a, b) => b.total - a.total) : r; }
    pick(r, c, keyboard) {
      this.cur = [r, c]; this.sel = [r, c]; this.render();
      const g = this.$svg.querySelector('[data-k="' + r + ':' + c + '"]'); if (g && (keyboard || this.el.contains(document.activeElement))) g.focus({ preventScroll: true });
      this._emit('select', { row: this.data.rows[r].id, col: this.data.cols[c].id, value: +this.data.values[r][c] });
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, nc = d.cols.length;
      const lab = narrow ? 38 : 88, tot = narrow ? 34 : 70, top = 20, ch = narrow ? 20 : 26, cw = (W - lab - tot - 6) / nc, order = this._order();
      const all = d.values.flat().map(Number).filter(isFinite), max = Math.max(...all) || 1, mean = all.reduce((s, v) => s + v, 0) / (all.length || 1), tmax = Math.max(...this.rows.map(r => r.total)) || 1;
      const every = Math.ceil(30 / cw);
      let s = '';
      d.cols.forEach((c, j) => { if (j % every === 0) s += '<text x="' + f1(lab + j * cw + cw / 2) + '" y="13" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(c.label) + '</text>'; });
      s += '<text x="' + (W - 2) + '" y="13" text-anchor="end" font-size="10.5" font-weight="700" fill="' + T.muted + '">Total</text>';
      order.forEach((r, k) => {
        const y = top + k * ch;
        s += '<text x="' + (lab - 6) + '" y="' + f1(y + ch / 2 + 4) + '" text-anchor="end" font-size="' + (narrow ? 11 : 12) + '" font-weight="700" fill="' + T.fg + '">' + esc(fitText(r.label, lab - 6, 12)) + '</text>';
        d.cols.forEach((c, j) => {
          const v = +d.values[r.i][j], a = isFinite(v) ? v / max : 0, on = this.sel && this.sel[0] === r.i && this.sel[1] === j, cur = this.cur[0] === r.i && this.cur[1] === j;
          s += '<g class="dn-hot" role="gridcell" tabindex="' + (cur ? 0 : -1) + '" data-k="' + r.i + ':' + j + '" aria-label="' + esc(r.label + ', ' + c.label + ': ' + fmtNum(v, d)) + '"><rect x="' + f1(lab + j * cw + 1) + '" y="' + (y + 1) + '" width="' + f1(cw - 2) + '" height="' + (ch - 2) + '" rx="3" fill="' + T.accent + '" fill-opacity="' + Math.round((0.06 + 0.94 * a) * 100) / 100 + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/>' +
            (cw >= 34 ? '<text x="' + f1(lab + j * cw + cw / 2) + '" y="' + f1(y + ch / 2 + 4) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="' + (a > 0.55 ? '#ffffff' : T.fg) + '" pointer-events="none">' + esc(fmtNum(v)) + '</text>' : '') + '</g>';
        });
        const bw = (r.total / tmax) * (tot - 8);
        s += '<rect x="' + f1(W - tot + 4) + '" y="' + (y + 4) + '" width="' + f1(Math.max(1, bw)) + '" height="' + (ch - 8) + '" rx="2" fill="' + T.muted + '" opacity=".45"><title>' + esc(r.label + ' total: ' + fmtNum(r.total, d)) + '</title></rect>';
      });
      const H = top + order.length * ch + 4;
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.label || 'Table') + '. Use the arrow keys to move between cells.');
      this._paint(this.$svg, s);
      this.el.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === this.sort)));
      if (this.sel) {
        const [ri, ci] = this.sel, v = +d.values[ri][ci], ct = d.values.reduce((s2, row) => s2 + (+row[ci] || 0), 0);
        this.$note.innerHTML = '<b>' + esc(d.rows[ri].label + ', ' + d.cols[ci].label) + '</b>: ' + esc(fmtNum(v, d)) + ', ' + (mean ? f1(v / mean) + '× the average cell' : '') + '. Row total ' + esc(fmtNum(this.rows[ri].total, d)) + ', column total ' + esc(fmtNum(ct, d)) + '.';
      } else {
        let best = [0, 0]; d.values.forEach((row, i) => row.forEach((v, j) => { if (+v > +d.values[best[0]][best[1]]) best = [i, j]; }));
        const top1 = this.rows.slice().sort((a, b) => b.total - a.total)[0];
        this.$note.innerHTML = 'Busiest cell: <b>' + esc(d.rows[best[0]].label + ', ' + d.cols[best[1]].label) + '</b> (' + esc(fmtNum(+d.values[best[0]][best[1]], d)) + '). Biggest row: <b>' + esc(top1.label) + '</b>. Tap a cell, or use the arrow keys.';
      }
    }
  }

  /* ======================================================================================
   * Bridge: a waterfall from a start to an end through each rise and fall
   * data = { start:{label,value}, end?:{label}, prefix?, suffix?, steps:[{id,label,value,note?}] }
   * ====================================================================================== */
  class Bridge extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.steps = data.steps.map((s, i) => Object.assign({ i }, s, { value: +s.value }));
      this.shown = this.steps.length; this.sel = null;
      el.innerHTML = '<div class="dn-bar"><button type="button" class="dn-btn" data-play>Step through</button><button type="button" class="dn-btn" data-all>Show all</button></div><svg role="img"></svg><p class="dn-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dn-note');
      el.querySelector('[data-play]').onclick = () => this.next();
      el.querySelector('[data-all]').onclick = () => { this.shown = this.steps.length; this.sel = null; this.render(); };
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const st = this.steps[this.sel]; this._emit('select', { id: st.id, value: st.value }); } });
      this.render();
    }
    next() {
      if (this.shown >= this.steps.length) this.shown = 0; else this.shown++;
      this.sel = this.shown ? this.shown - 1 : null; this.render(); this._emit('step', { shown: this.shown });
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), st = this.steps, start = +d.start.value;
      let run = start; const pts = st.map(s => { const a = run; run += s.value; return { s, a, b: run }; }), end = start + st.reduce((t, s) => t + s.value, 0);
      const vals = [0, start, end].concat(pts.map(p => p.b)), lo = Math.min(...vals), hi = Math.max(...vals), sx = v => 4 + ((v - lo) / (hi - lo || 1)) * (W - 8);
      const lab = 18, bh = 22, gap = 10, rowH = lab + bh + gap;
      const rows = [{ k: 'start', label: d.start.label, a: 0, b: start, total: true }].concat(pts.map((p, i) => ({ k: i, label: p.s.label, a: p.a, b: p.b, v: p.s.value, hid: i >= this.shown })), [{ k: 'end', label: (d.end && d.end.label) || 'End', a: 0, b: this.shown >= st.length ? end : pts[this.shown - 1] ? pts[this.shown - 1].b : start, total: true, partial: this.shown < st.length }]);
      let s = '', prevX = null;
      rows.forEach((r, i) => {
        const y = i * rowH + lab, x0 = sx(Math.min(r.a, r.b)), x1 = sx(Math.max(r.a, r.b)), on = this.sel === r.k;
        const c = r.total ? T.fg : r.v >= 0 ? T.accent : DOWN, op = r.hid ? 0.12 : this.sel != null && !on && !r.total ? 0.45 : 1;
        if (prevX != null && !r.hid) s += '<line x1="' + f1(prevX) + '" y1="' + (y - lab - gap) + '" x2="' + f1(prevX) + '" y2="' + (y + bh) + '" stroke="' + T.muted + '" stroke-dasharray="3 3" opacity=".7"/>';
        const valTxt = r.total ? fmtNum(r.b, d) + (r.partial ? ' so far' : '') : signed(r.v, d), right = x1 + 6 + valTxt.length * 7 < W;
        const body = '<rect x="' + f1(x0) + '" y="' + y + '" width="' + f1(Math.max(2, x1 - x0)) + '" height="' + bh + '" rx="4" fill="' + c + '" opacity="' + op + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/>' +
          '<text x="0" y="' + (y - 5) + '" font-size="12.5" font-weight="' + (r.total ? 800 : 700) + '" fill="' + T.fg + '" opacity="' + (r.hid ? 0.35 : 1) + '">' + esc(fitText(r.label, W * 0.7, 12.5)) + '</text>' +
          (r.hid ? '' : '<text x="' + f1(right ? x1 + 6 : x0 - 6) + '" y="' + (y + bh / 2 + 4) + '" text-anchor="' + (right ? 'start' : 'end') + '" font-size="12" font-weight="700" fill="' + (r.total ? T.fg : c) + '" font-family="' + esc(T.mono) + '">' + esc(valTxt) + '</text>');
        s += r.total || r.hid ? '<g>' + body + '</g>' : '<g class="dn-hot" tabindex="0" role="button" data-k="' + r.k + '" aria-pressed="' + on + '" aria-label="' + esc(r.label + ': ' + valTxt + ', running total ' + fmtNum(r.b, d)) + '">' + body + '</g>';
        if (!r.hid) prevX = sx(r.b);
      });
      const H = rows.length * rowH - gap + 4;
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', d.start.label + ' ' + fmtNum(start, d) + ', ' + st.map(x => x.label + ' ' + signed(x.value, d)).join(', ') + ', ' + ((d.end && d.end.label) || 'end') + ' ' + fmtNum(end, d));
      this._paint(this.$svg, s);
      const playBtn = this.el.querySelector('[data-play]'); playBtn.textContent = this.shown >= st.length ? 'Step through' : this.shown === 0 ? 'First step' : 'Next step (' + (this.shown + 1) + ' of ' + st.length + ')';
      if (this.sel != null && pts[this.sel]) {
        const p = pts[this.sel];
        this.$note.innerHTML = '<b>' + esc(p.s.label) + '</b>: ' + esc(signed(p.s.value, d)) + ', taking the running total from ' + esc(fmtNum(p.a, d)) + ' to ' + esc(fmtNum(p.b, d)) + '.' + (p.s.note ? ' ' + esc(p.s.note) : '');
      } else {
        const ins = st.filter(x => x.value > 0), outs = st.filter(x => x.value < 0), bi = ins.slice().sort((a, b) => b.value - a.value)[0], bo = outs.slice().sort((a, b) => a.value - b.value)[0];
        this.$note.innerHTML = 'From <b>' + esc(fmtNum(start, d)) + '</b> to <b>' + esc(fmtNum(end, d)) + '</b>: ' + esc(signed(end - start, d)) + ' overall.' + (bi ? ' Biggest addition: <b>' + esc(bi.label) + '</b> (' + esc(signed(bi.value, d)) + ').' : '') + (bo ? ' Biggest cost: <b>' + esc(bo.label) + '</b> (' + esc(signed(bo.value, d)) + ').' : '') + ' Tap a bar, or step through.';
      }
    }
  }

  /* ======================================================================================
   * Overlap: a Venn diagram of two or three groups (circles are not to scale)
   * data = { sets:[{id,label,color?}] (2 or 3), regions:{ 'a':n, 'a&b':n, …, '':n (in none) }, unit?, label? }
   * ====================================================================================== */
  class Overlap extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.sets = data.sets.slice(0, 3).map((s, i) => Object.assign({ i }, s));
      this.keys = this._keys(); this.sel = null;
      el.innerHTML = '<svg role="img"></svg><div class="dn-legend" hidden></div><div class="ov-chips" role="group" aria-label="Regions"></div><p class="dn-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$legend = el.querySelector('.dn-legend'); this.$chips = el.querySelector('.ov-chips'); this.$note = el.querySelector('.dn-note');
      this.$chips.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) this.select(b.dataset.r); });
      this.$svg.addEventListener('click', e => { const r = this.$svg.getBoundingClientRect(), k = this._geo.W / r.width, p = [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; const key = this._hit(p); if (key != null && key in this._counts()) this.select(key); });
      this.render();
    }
    _keys() { const ids = this.sets.map(s => s.id), out = []; for (let m = 1; m < 1 << ids.length; m++) out.push(ids.filter((_, i) => m & (1 << i)).join('&')); return out.sort((a, b) => a.split('&').length - b.split('&').length); }
    _counts() { const r = this.data.regions || {}, c = {}; this.keys.forEach(k => { c[k] = +r[k] || 0; }); if (r[''] != null) c[''] = +r['']; return c; }
    _label(key) {
      if (key === '') return 'None of these';
      const ins = key.split('&'), names = ins.map(id => this.sets.find(s => s.id === id).label);
      return (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]) + (ins.length < this.sets.length ? ' only' : '');
    }
    _hit(p) { if (!this._geo) return null; const ins = this._geo.c.filter(c => Math.hypot(p[0] - c.x, p[1] - c.y) <= c.r).map(c => c.id); return ins.length ? this.sets.map(s => s.id).filter(id => ins.includes(id)).join('&') : ''; }
    select(key) { this.sel = this.sel === key ? null : key; this.render(); if (this.sel != null) this._emit('select', { region: key, sets: key ? key.split('&') : [], value: this._counts()[key] }); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 600), n = this.sets.length, S = Math.min(W, 520), narrow = W < 520, H = Math.round(S * (n === 3 ? (narrow ? 0.8 : 0.86) : (narrow ? 0.52 : 0.62)));
      const R = S * (n === 3 ? (narrow ? 0.27 : 0.25) : 0.27), cx = W / 2, cy = H / 2 + (n === 3 ? S * (narrow ? 0.04 : 0.03) : (narrow ? 0 : S * 0.03)), dd = n === 3 ? R * 0.62 : R * 0.58;
      const dirs = n === 3 ? [-90, 30, 150].map(a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]) : [[-1, 0], [1, 0]];
      const C = this.sets.map((st, i) => ({ id: st.id, x: cx + dirs[i][0] * dd, y: cy + dirs[i][1] * dd, r: R, col: colorFor(this.el, st, st.i) }));
      this._geo = { W, c: C };
      const counts = this._counts(), total = d.total != null ? +d.total : Object.values(counts).reduce((s, v) => s + v, 0), id = this._id;
      const pos = key => {
        const ins = key.split('&'), idx = ins.map(k => this.sets.findIndex(s => s.id === k));
        if (idx.length === n) return [cx, cy + (n === 3 ? 0 : 0)];
        if (idx.length === 1) { const di = dirs[idx[0]]; return [cx + di[0] * (dd + R * 0.5), cy + di[1] * (dd + R * 0.5)]; }
        if (n === 3) { const out = [0, 1, 2].find(k => !idx.includes(k)), di = dirs[out]; return [cx - di[0] * dd * 1.05, cy - di[1] * dd * 1.05]; }
        return [cx, cy];
      };
      let s = '<defs>' + C.map(c => '<clipPath id="' + id + c.id + '"><circle cx="' + f1(c.x) + '" cy="' + f1(c.y) + '" r="' + f1(c.r) + '"/></clipPath>').join('') + '</defs>';
      C.forEach(c => { s += '<circle cx="' + f1(c.x) + '" cy="' + f1(c.y) + '" r="' + f1(c.r) + '" fill="' + c.col + '" fill-opacity=".22" stroke="' + c.col + '" stroke-width="2.5"/>'; });
      if (this.sel) {
        const ins = this.sel.split('&'), outs = C.filter(c => !ins.includes(c.id));
        let shape = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + T.fg + '" fill-opacity=".35"' + (outs.length ? ' mask="url(#' + id + 'm)"' : '') + '/>';
        ins.forEach(k => { shape = '<g clip-path="url(#' + id + k + ')">' + shape + '</g>'; });
        s += (outs.length ? '<mask id="' + id + 'm"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>' + outs.map(c => '<circle cx="' + f1(c.x) + '" cy="' + f1(c.y) + '" r="' + f1(c.r) + '" fill="#000"/>').join('') + '</mask>' : '') + shape;
      }
      const totals = this.sets.map(st => this.keys.filter(k => k.split('&').includes(st.id)).reduce((t, k) => t + counts[k], 0));
      this.$legend.hidden = !narrow;
      this.$legend.innerHTML = this.sets.map((st, i) => '<span><i style="background:' + esc(C[i].col) + '"></i>' + esc(st.label) + ' · ' + esc(fmtNum(totals[i])) + '</span>').join('');
      if (!narrow) C.forEach((c, i) => {
        const di = dirs[i], lx = c.x + di[0] * (R + 14), ly = c.y + di[1] * (R + 14) + (n === 2 ? -R - 2 : di[1] < 0 ? -2 : 12), st = this.sets[i];
        const tot = this.keys.filter(k => k.split('&').includes(st.id)).reduce((t, k) => t + counts[k], 0);
        s += '<text x="' + f1(n === 2 ? c.x : lx) + '" y="' + f1(n === 2 ? c.y - R - 10 : ly) + '" text-anchor="' + (n === 2 || Math.abs(di[0]) < 0.3 ? 'middle' : di[0] > 0 ? 'start' : 'end') + '" font-size="12.5" font-weight="800" fill="' + c.col + '">' + esc(fitText(st.label + ' · ' + fmtNum(tot), n === 2 ? R * 2 : W / 2 - R, 12.5)) + '</text>';
      });
      this.keys.forEach(k => { const [x, y] = pos(k), on = this.sel === k; s += '<text x="' + f1(x) + '" y="' + f1(y + 5) + '" text-anchor="middle" font-size="' + (on ? 17 : 15) + '" font-weight="800" fill="' + T.fg + '" pointer-events="none">' + esc(fmtNum(counts[k])) + '</text>'; });
      if (counts[''] != null) s += '<text x="' + (W - 4) + '" y="' + (H - 6) + '" text-anchor="end" font-size="12" font-weight="700" fill="' + T.muted + '" pointer-events="none">' + esc('In none: ' + fmtNum(counts[''])) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px'; this.$svg.style.cursor = 'pointer';
      this.$svg.setAttribute('aria-label', (d.label ? d.label + ': ' : '') + Object.keys(counts).map(k => this._label(k) + ' ' + counts[k]).join(', ') + '. Circles are not to scale.');
      this.$svg.innerHTML = s;
      const a = document.activeElement, keep = a && this.$chips.contains(a) ? a.dataset.r : null;
      this.$chips.innerHTML = Object.keys(counts).map(k => '<button type="button" data-r="' + esc(k) + '" aria-pressed="' + (this.sel === k) + '">' + esc(this._label(k)) + ': <b>' + esc(fmtNum(counts[k])) + '</b></button>').join('');
      if (keep != null) { const b = this.$chips.querySelector('[data-r="' + CSS.escape(keep) + '"]'); b && b.focus({ preventScroll: true }); }
      const u = d.unit || '';
      if (this.sel != null) {
        const v = counts[this.sel];
        this.$note.innerHTML = '<b>' + esc(this._label(this.sel)) + '</b>: ' + esc(fmtNum(v) + (u ? ' ' + u : '')) + ', ' + pct(v, total) + '% of ' + esc(fmtNum(total)) + '.';
      } else {
        const all = this.keys[this.keys.length - 1], big = this.keys.slice().sort((p, q) => counts[q] - counts[p])[0];
        this.$note.innerHTML = '<b>' + esc(fmtNum(counts[all])) + '</b> (' + pct(counts[all], total) + '%) are in all ' + (n === 3 ? 'three' : 'both') + '. The biggest single region is <b>' + esc(this._label(big)) + '</b> (' + esc(fmtNum(counts[big])) + '). Tap a region. Circles are not to scale.';
      }
    }
  }

  return { Factwall, Swarm, Scatter, Heatgrid, Bridge, Overlap, ticks };
});
