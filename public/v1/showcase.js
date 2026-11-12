/*! Showcase 1.0 · Dimau Infographics
 *  Six more everyday infographic formats, each with its own interaction:
 *    Tilemap    places as equal tiles laid out like the map (Fiji's provinces by default): colour by group or value.
 *    Mosaic     a treemap: rectangles sized by value; tap a block to zoom into what it contains.
 *    Duel       "this versus that": pick two things and compare them row by row, with the winner of each row marked.
 *    Almanac    a calendar heatmap: one square per day, streaks found and described.
 *    Goalmeter  progress toward a goal, with milestones and a projection of when it will be reached.
 *    Dayclock   a 24-hour clock face split into activities; switch between days to compare them.
 *
 *  new Tilemap(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-display --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Tilemap', 'Mosaic', 'Duel', 'Almanac', 'Goalmeter', 'Dayclock'].forEach(function (k) { root[k] = m[k]; }); root.DimauShowcase = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#7a6bd1', '#c2563a'];
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : (Math.abs(n) < 10 ? 1 : 0) }) + (o.suffix || '') : '–'; };
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), font: v('--di-font', 'system-ui, sans-serif'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };

  const STYLE = `
.ds{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
.ds button,.ds select{font:inherit;color:inherit}
.ds :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.ds svg{display:block;width:100%}
.ds-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.ds-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.ds-btn[aria-pressed="true"],.ds-btn.on{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.ds-note{font-size:14px;line-height:1.5;margin:10px 0 0;min-height:1.5em}
.ds-note b{font-weight:700}
.ds-hot{cursor:pointer}
.ds-hot:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.ds-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.ds-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.ds-sel{height:36px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 10px;font-size:14px;font-weight:700;max-width:100%}
.ds-crumbs{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:13px;margin-bottom:8px}
.ds-crumbs button{border:0;background:none;padding:2px 4px;font-weight:700;color:var(--di-accent,#0b6fa4);cursor:pointer}
.ds-crumbs span{color:var(--di-muted,#4f6578)}
.mo-tile{transition:opacity .3s}
@keyframes ds-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
.ds-anim .mo-tile{animation:ds-in .4s both;transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:reduce){.ds-anim .mo-tile{animation:none}}
`;
  function injectStyle() {
    if (document.getElementById('ds-style')) return;
    const s = document.createElement('style'); s.id = 'ds-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('ds');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    /** Delegated tap/keyboard handling for elements with class ds-hot and data-k. */
    _hot(container, fn) {
      container.addEventListener('click', e => { const g = e.target.closest('.ds-hot'); if (g) fn(g.dataset.k, g); });
      container.addEventListener('keydown', e => { const g = e.target.closest('.ds-hot'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k, g); } });
      container.addEventListener('focusin', e => { const g = e.target.closest('.ds-hot'); if (g && this._focusHint) this._focusHint(g.dataset.k); });
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('ds'); }
  }

  /* ======================================================================================
   * Tilemap: equal tiles in map positions
   * data = { groups?:[{id,label,color?}], tiles:[{id,label,short?,row,col,group?,value?,note?}], valueLabel?, prefix?, suffix? }
   * ====================================================================================== */
  class Tilemap extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: null });
      this.tiles = data.tiles.map((t, i) => Object.assign({ i }, t));
      this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g));
      this.hasValues = this.tiles.some(t => isFinite(+t.value));
      this.mode = this.o.mode || (this.groups.length ? 'group' : 'value');
      this.sel = null;
      el.innerHTML = (this.groups.length && this.hasValues ? '<div class="ds-bar" role="group" aria-label="Colour by"><button type="button" class="ds-btn" data-m="group">By group</button><button type="button" class="ds-btn" data-m="value">' + esc(data.valueLabel || 'By value') + '</button></div>' : '') +
        '<svg role="img"></svg><div class="ds-legend"></div><p class="ds-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$legend = el.querySelector('.ds-legend'); this.$note = el.querySelector('.ds-note');
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { this.mode = b.dataset.m; this.render(); });
      this._hot(this.$svg, k => this.select(k));
      this._focusHint = k => this.select(k, true);
      this.render();
    }
    select(id, quiet) {
      const t = this.tiles.find(x => x.id === id); if (!t) return;
      this.sel = t;
      const g = this.groups.find(x => x.id === t.group), d = this.data;
      const same = g ? this.tiles.filter(x => x.group === g.id).map(x => x.label) : [];
      this.$note.innerHTML = '<b>' + esc(t.label) + '</b>' + (g ? ' · ' + esc(g.label) : '') + (isFinite(+t.value) ? ' · ' + esc(fmtNum(+t.value, d)) : '') + '.' +
        (t.note ? ' ' + esc(t.note) : '') + (g && same.length > 1 ? ' Also in ' + esc(g.label) + ': ' + esc(same.filter(x => x !== t.label).join(', ')) + '.' : '');
      if (!quiet) this.render();
      this._emit('select', { id: t.id, label: t.label, group: t.group, value: t.value });
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 600);
      const rows = Math.max(...this.tiles.map(t => t.row)) + 1, cols = Math.max(...this.tiles.map(t => t.col)) + 1;
      const gap = 6, size = Math.min(110, (W - gap * (cols - 1)) / cols), H = rows * (size + gap);
      const ox = (W - (cols * (size + gap) - gap)) / 2;
      const vals = this.tiles.map(t => +t.value).filter(isFinite), lo = Math.min(...vals), hi = Math.max(...vals);
      const valCol = v => 'color-mix(in srgb,' + T.accent + ' ' + Math.round(15 + (hi > lo ? (v - lo) / (hi - lo) : 0.5) * 75) + '%,' + T.surface + ')';
      const byGroup = id => { const g = this.groups.find(x => x.id === id); return g ? colorFor(this.el, g, g.i) : T.line; };
      let s = '';
      this.tiles.forEach(t => {
        const x = ox + t.col * (size + gap), y = t.row * (size + gap), sel = this.sel === t;
        const fill = this.mode === 'value' && isFinite(+t.value) ? valCol(+t.value) : byGroup(t.group);
        const dark = this.mode === 'group' || (hi > lo && (+t.value - lo) / (hi - lo) > 0.55);
        const fs = size < 70 ? 10.5 : 12.5, label = size < 70 && t.short ? t.short : fitText(t.label, size - 10, fs);
        s += '<g class="ds-hot" tabindex="0" role="button" data-k="' + esc(t.id) + '" aria-label="' + esc(t.label + (t.group ? ', ' + (this.groups.find(g => g.id === t.group) || {}).label : '') + (isFinite(+t.value) ? ', ' + fmtNum(+t.value, d) : '')) + '">' +
          '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(size) + '" height="' + f1(size) + '" rx="' + f1(size * 0.14) + '" fill="' + fill + '"' + (sel ? ' stroke="' + T.fg + '" stroke-width="3"' : '') + '/>' +
          '<text x="' + f1(x + size / 2) + '" y="' + f1(y + size / 2 + (isFinite(+t.value) && this.mode === 'value' ? -2 : 4)) + '" text-anchor="middle" font-size="' + fs + '" font-weight="700" fill="' + (dark ? '#ffffff' : T.fg) + '">' + esc(label) + '</text>' +
          (isFinite(+t.value) && this.mode === 'value' ? '<text x="' + f1(x + size / 2) + '" y="' + f1(y + size / 2 + 15) + '" text-anchor="middle" font-size="11" font-weight="600" fill="' + (dark ? '#ffffff' : T.muted) + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(+t.value, { prefix: d.prefix, suffix: d.suffix })) + '</text>' : '') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + f1(W) + ' ' + f1(H));
      this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.title || 'Tile map') + ': ' + this.tiles.map(t => t.label).join(', '));
      this.$svg.innerHTML = s;
      this.el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === this.mode)));
      this.$legend.innerHTML = this.mode === 'group'
        ? this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + ' · ' + this.tiles.filter(t => t.group === g.id).length + '</span>').join('')
        : '<span><i style="background:' + valCol(lo) + '"></i>' + esc(fmtNum(lo, d)) + '</span><span><i style="background:' + valCol(hi) + '"></i>' + esc(fmtNum(hi, d)) + '</span>';
      if (!this.sel) this.$note.textContent = 'Tap a tile for detail.';
    }
  }

  /* ======================================================================================
   * Mosaic: zoomable treemap
   * data = { unit?, unitSingular?, root:{label, children:[{id?,label,value?,color?,children?}]} }
   * ====================================================================================== */
  function squarify(items, x, y, w, h) {
    // items: [{value}], sorted desc; returns [{item,x,y,w,h}]
    const out = [], total = items.reduce((s, i) => s + i.value, 0);
    if (!total) return out;
    const scale = (w * h) / total;
    let rest = items.map(i => ({ item: i, a: i.value * scale })), cx = x, cy = y, cw = w, ch = h;
    const worst = (row, side) => { const s = row.reduce((t, r) => t + r.a, 0), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
    while (rest.length) {
      const side = Math.min(cw, ch), row = [rest[0]];
      let i = 1;
      while (i < rest.length && worst(row.concat(rest[i]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      const s = row.reduce((t, r) => t + r.a, 0);
      if (cw >= ch) { const rw = s / ch; let yy = cy; row.forEach(r => { const rh = r.a / rw; out.push({ item: r.item, x: cx, y: yy, w: rw, h: rh }); yy += rh; }); cx += rw; cw -= rw; }
      else { const rh = s / cw; let xx = cx; row.forEach(r => { const rw = r.a / rh; out.push({ item: r.item, x: xx, y: cy, w: rw, h: rh }); xx += rw; }); cy += rh; ch -= rh; }
      rest = rest.slice(i);
    }
    return out;
  }
  class Mosaic extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { height: 440 });
      let seq = 0;
      const prep = (n, parent, top) => {
        n = Object.assign({}, n); n.id = n.id || 'm' + seq++; n.parent = parent; n.top = top || null;
        n.kids = (n.children || []).map(c => prep(c, n, top || (parent ? n : null)));
        n.kids.forEach(k => { if (!parent) k.top = k; });
        n.value = n.value != null ? +n.value : n.kids.reduce((s, k) => s + k.value, 0);
        return n;
      };
      this.root = prep(data.root, null, null);
      const fix = n => { n.kids.forEach(k => { k.top = n === this.root ? k : n.top; fix(k); }); }; fix(this.root);
      this.root.kids.forEach((k, i) => { k.ci = i; });
      this.cur = this.root; this.sel = null;
      el.innerHTML = '<nav class="ds-crumbs" aria-label="Where you are"></nav><svg role="img"></svg><p class="ds-note" aria-live="polite"></p>';
      this.$crumbs = el.querySelector('nav'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.ds-note');
      this._hot(this.$svg, k => this.tap(k));
      el.addEventListener('keydown', e => { if ((e.key === 'Escape' || e.key === 'Backspace') && this.cur.parent) { e.preventDefault(); this.zoom(this.cur.parent); } });
      this.render();
    }
    _find(id, n) { n = n || this.root; if (n.id === id) return n; for (const k of n.kids) { const f = this._find(id, k); if (f) return f; } return null; }
    tap(id) { const n = this._find(id); if (!n) return; if (n.kids.length) this.zoom(n); else { this.sel = n; this._say(n); this.render(); this._emit('select', { id: n.id, label: n.label, value: n.value }); } }
    zoom(n) {
      const had = this.el.contains(document.activeElement) || document.activeElement === document.body;
      this.cur = n; this.sel = null; this._anim = true; this.render(); this._say(null);
      // keep keyboard users inside the chart after the blocks are replaced
      if (had) { const first = this.$svg.querySelector('.mo-tile'); first && first.focus({ preventScroll: true }); }
      this._emit('zoom', { id: n.id, label: n.label });
    }
    _say(n) {
      const d = this.data, u = v => v + ' ' + (v === 1 ? d.unitSingular || d.unit || '' : d.unit || '');
      if (!n) { const big = this.cur.kids.slice().sort((a, b) => b.value - a.value)[0]; this.$note.innerHTML = '<b>' + esc(this.cur.label) + '</b>: ' + esc(u(this.cur.value)) + (big ? '. Largest: <b>' + esc(big.label) + '</b> (' + Math.round((100 * big.value) / this.cur.value) + '%).' : '.') + (this.cur.parent ? ' Press Escape or use the path above to go back.' : ' Tap a block to look inside.'); return; }
      this.$note.innerHTML = '<b>' + esc(n.label) + '</b>: ' + esc(u(n.value)) + ', ' + Math.round((100 * n.value) / this.cur.value) + '% of ' + esc(this.cur.label) + (n.note ? '. ' + esc(n.note) : '.');
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 700), H = W < 500 ? Math.round(W * 1.15) : this.o.height;
      const items = this.cur.kids.slice().sort((a, b) => b.value - a.value);
      const rects = squarify(items, 0, 0, W, H);
      let s = '';
      rects.forEach((r, i) => {
        const n = r.item, top = n.top || n, base = colorFor(this.el, top, top.ci || 0), pad = 2, sel = this.sel === n;
        const shade = this.cur === this.root ? base : 'color-mix(in srgb,' + base + ' ' + (92 - (i % 4) * 12) + '%,' + T.surface + ')';
        const fs = clamp(Math.min(r.w, r.h) / 6, 10.5, 17), lab = fitText(n.label, r.w - 14, fs);
        s += '<g class="ds-hot mo-tile" tabindex="0" role="button" data-k="' + esc(n.id) + '" style="animation-delay:' + (i * 25) + 'ms" aria-label="' + esc(n.label + ', ' + n.value + (n.kids.length ? ', ' + n.kids.length + ' inside' : '')) + '">' +
          '<rect x="' + f1(r.x + pad) + '" y="' + f1(r.y + pad) + '" width="' + f1(Math.max(0, r.w - pad * 2)) + '" height="' + f1(Math.max(0, r.h - pad * 2)) + '" rx="8" fill="' + shade + '"' + (sel ? ' stroke="' + T.fg + '" stroke-width="3"' : '') + '/>' +
          (r.w > 46 && r.h > 30 ? '<text x="' + f1(r.x + 10) + '" y="' + f1(r.y + 10 + fs) + '" font-size="' + f1(fs) + '" font-weight="800" fill="#ffffff">' + esc(lab) + '</text>' : '') +
          (r.w > 46 && r.h > 50 ? '<text x="' + f1(r.x + 10) + '" y="' + f1(r.y + 14 + fs * 2) + '" font-size="12" font-weight="600" fill="#ffffff" opacity=".85" font-family="' + esc(T.mono) + '">' + n.value + (n.kids.length ? ' · ' + n.kids.length + ' inside ›' : '') + '</text>' : '') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.cur.label + ': ' + items.map(n => n.label + ' ' + n.value).join(', '));
      this.$svg.classList.toggle('ds-anim', !!this._anim && !reduced()); this._anim = false;
      this.$svg.innerHTML = s;
      const path = []; for (let n = this.cur; n; n = n.parent) path.unshift(n);
      this.$crumbs.innerHTML = path.map((n, i) => (i ? '<span aria-hidden="true">›</span>' : '') + (n === this.cur ? '<span style="color:inherit;font-weight:700"' + ' aria-current="location">' + esc(n.label) + '</span>' : '<button type="button" data-id="' + esc(n.id) + '">' + esc(n.label) + '</button>')).join('');
      this.$crumbs.querySelectorAll('button').forEach(b => b.onclick = () => this.zoom(this._find(b.dataset.id)));
      if (!this.sel) this._say(null);
    }
  }

  /* ======================================================================================
   * Duel: compare two things row by row
   * data = { items:[{id,label,color?, values:{metricId:number}}], metrics:[{id,label,prefix?,suffix?,better?:'higher'|'lower',decimals?}], a?, b? }
   * ====================================================================================== */
  class Duel extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.items = data.items.map((it, i) => Object.assign({ i }, it));
      this.a = this.items.find(i => i.id === data.a) || this.items[0];
      this.b = this.items.find(i => i.id === data.b) || this.items[1] || this.items[0];
      const opt = sel => this.items.map(i => '<option value="' + esc(i.id) + '"' + (i === sel ? ' selected' : '') + '>' + esc(i.label) + '</option>').join('');
      el.innerHTML = '<div class="ds-bar" style="justify-content:space-between"><label><span class="tl-sr" style="position:absolute;left:-9999px">First</span><select class="ds-sel" data-side="a" aria-label="First">' + opt(this.a) + '</select></label>' +
        '<button type="button" class="ds-btn" data-swap aria-label="Swap sides">⇄</button><label><span style="position:absolute;left:-9999px">Second</span><select class="ds-sel" data-side="b" aria-label="Second">' + opt(this.b) + '</select></label></div>' +
        '<svg role="img"></svg><p class="ds-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.ds-note');
      el.querySelectorAll('select').forEach(s => s.onchange = () => { this[s.dataset.side] = this.items.find(i => i.id === s.value); this.render(); this._emit('change', { a: this.a.id, b: this.b.id }); });
      el.querySelector('[data-swap]').onclick = () => { const t = this.a; this.a = this.b; this.b = t; el.querySelector('[data-side="a"]').value = this.a.id; el.querySelector('[data-side="b"]').value = this.b.id; this.render(); this._emit('change', { a: this.a.id, b: this.b.id }); };
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(300, this.$svg.clientWidth || 700), rowH = 64, mid = W / 2, labH = 18;
      const A = this.a, B = this.b, ca = colorFor(this.el, A, A.i), cb = A === B ? ca : colorFor(this.el, B, B.i === A.i ? A.i + 1 : B.i);
      let s = '', winsA = 0, winsB = 0;
      d.metrics.forEach((m, r) => {
        const va = +A.values[m.id], vb = +B.values[m.id], max = Math.max(...this.items.map(i => +i.values[m.id]).filter(isFinite)) || 1;
        const y = r * rowH + labH + 6, half = mid - 70, wa = (half * (va || 0)) / max, wb = (half * (vb || 0)) / max;
        const better = m.better === 'lower' ? -1 : 1, win = va === vb || !isFinite(va) || !isFinite(vb) ? 0 : (va - vb) * better > 0 ? 1 : -1;
        if (win > 0) winsA++; else if (win < 0) winsB++;
        const f = v => fmtNum(v, m);
        s += '<text x="' + mid + '" y="' + (y - 6) + '" text-anchor="middle" font-size="12" font-weight="700" letter-spacing=".06em" fill="' + T.muted + '">' + esc(m.label.toUpperCase()) + '</text>' +
          '<rect x="' + f1(mid - 6 - wa) + '" y="' + (y + 4) + '" width="' + f1(Math.max(3, wa)) + '" height="26" rx="6" fill="' + ca + '" opacity="' + (win < 0 ? 0.45 : 1) + '"/>' +
          '<rect x="' + f1(mid + 6) + '" y="' + (y + 4) + '" width="' + f1(Math.max(3, wb)) + '" height="26" rx="6" fill="' + cb + '" opacity="' + (win > 0 ? 0.45 : 1) + '"/>' +
          '<text x="' + f1(mid - 12 - wa) + '" y="' + (y + 22) + '" text-anchor="end" font-size="14" font-weight="800" fill="' + T.fg + '" font-family="' + esc(T.mono) + '">' + (win > 0 ? '★ ' : '') + esc(f(va)) + '</text>' +
          '<text x="' + f1(mid + 12 + wb) + '" y="' + (y + 22) + '" font-size="14" font-weight="800" fill="' + T.fg + '" font-family="' + esc(T.mono) + '">' + esc(f(vb)) + (win < 0 ? ' ★' : '') + '</text>';
      });
      const H = d.metrics.length * rowH + labH + 10;
      s += '<line x1="' + mid + '" y1="' + labH + '" x2="' + mid + '" y2="' + H + '" stroke="' + T.line + '" stroke-width="2"/>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', A.label + ' versus ' + B.label + ': ' + d.metrics.map(m => m.label + ' ' + A.values[m.id] + ' to ' + B.values[m.id]).join('; '));
      this.$svg.innerHTML = s;
      this.el.querySelector('[data-side="a"]').style.boxShadow = 'inset 4px 0 0 ' + ca;
      this.el.querySelector('[data-side="b"]').style.boxShadow = 'inset -4px 0 0 ' + cb;
      this.$note.innerHTML = A === B ? 'Pick two different items to compare.' :
        '<b>' + esc(A.label) + '</b> leads on ' + winsA + ' of ' + d.metrics.length + ', <b>' + esc(B.label) + '</b> on ' + winsB + (winsA + winsB < d.metrics.length ? ', and ' + (d.metrics.length - winsA - winsB) + ' are level' : '') + '. ★ marks the leader on each row.';
    }
  }

  /* ======================================================================================
   * Almanac: calendar heatmap with streaks
   * data = { days:{ 'YYYY-MM-DD': number }, label?, unit?, from?, to?, goal? (a day counts toward a streak when value >= goal, default > 0) }
   * ====================================================================================== */
  const DAY = 86400000;
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  class Almanac extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      const keys = Object.keys(data.days).sort();
      this.from = Date.parse((data.from || keys[0]) + 'T00:00:00Z'); this.to = Date.parse((data.to || keys[keys.length - 1]) + 'T00:00:00Z');
      this.goal = data.goal != null ? +data.goal : 1e-9;
      el.innerHTML = '<svg role="img"></svg><div class="ds-legend"></div><p class="ds-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$legend = el.querySelector('.ds-legend'); this.$note = el.querySelector('.ds-note');
      this._hot(this.$svg, k => this.select(k));
      this._focusHint = k => this.select(k);
      this._stats();
      this.render();
    }
    _stats() {
      let best = { len: 0 }, run = { len: 0 }, total = 0, active = 0, n = 0;
      for (let t = this.from; t <= this.to; t += DAY) {
        const v = +this.data.days[iso(t)] || 0; n++; total += v;
        if (v >= this.goal) { active++; run = run.len ? { start: run.start, end: t, len: run.len + 1 } : { start: t, end: t, len: 1 }; if (run.len > best.len) best = Object.assign({}, run); }
        else run = { len: 0 };
      }
      this.st = { best, current: run, total, active, n };
    }
    select(day) {
      const d = this.data, v = +d.days[day] || 0, dt = new Date(day + 'T00:00:00Z');
      this.$note.innerHTML = '<b>' + dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear() + '</b>: ' + esc(fmtNum(v, d)) + ' ' + esc(d.unit || '') + (v >= this.goal ? '' : ' (missed)') + '.';
      this._emit('select', { day, value: v });
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 800);
      const start = this.from - ((new Date(this.from).getUTCDay() + 6) % 7) * DAY; // back to Monday
      const weeks = Math.ceil((this.to - start + DAY) / (7 * DAY)), padL = 30, padT = 20;
      const cell = clamp(Math.floor((W - padL) / weeks) - 2, 6, 18), step = cell + 2, H = padT + 7 * step + 4;
      const vals = Object.values(d.days).map(Number).filter(isFinite), max = Math.max(...vals, 1);
      const colour = v => (v <= 0 ? T.line : 'color-mix(in srgb,' + T.accent + ' ' + Math.round(25 + (v / max) * 75) + '%,' + T.surface + ')');
      let s = '', lastMonth = -1;
      ['Mon', '', 'Wed', '', 'Fri', '', ''].forEach((l, i) => { if (l && cell >= 9) s += '<text x="0" y="' + (padT + i * step + cell - 1) + '" font-size="10" fill="' + T.muted + '">' + l + '</text>'; });
      for (let t = start, i = 0; t <= this.to; t += DAY, i++) {
        const w = Math.floor(i / 7), dow = i % 7, x = padL + w * step, y = padT + dow * step;
        const dt = new Date(t);
        if (dt.getUTCDate() <= 7 && dow === 0 && dt.getUTCMonth() !== lastMonth) { lastMonth = dt.getUTCMonth(); s += '<text x="' + x + '" y="12" font-size="10.5" font-weight="700" fill="' + T.muted + '">' + MON[lastMonth] + '</text>'; }
        if (t < this.from) continue;
        const k = iso(t), v = +d.days[k] || 0, inBest = this.st.best.len && t >= this.st.best.start && t <= this.st.best.end;
        s += '<g class="ds-hot" tabindex="-1" data-k="' + k + '"><rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="' + Math.max(2, cell * 0.2) + '" fill="' + colour(v) + '"' + (inBest ? ' stroke="' + T.fg + '" stroke-width="1.2"' : '') + '><title>' + k + ': ' + v + '</title></rect></g>';
      }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      this.$svg.style.height = H + 'px';
      const st = this.st, bd = st.best.len ? new Date(st.best.start) : null, be = st.best.len ? new Date(st.best.end) : null;
      this.$svg.setAttribute('aria-label', (d.label || 'Calendar') + ': ' + st.active + ' active days out of ' + st.n + '. Longest streak ' + st.best.len + ' days.');
      this.$svg.innerHTML = s;
      this.$legend.innerHTML = '<span>Less</span>' + [0, 0.25, 0.5, 0.75, 1].map(k => '<span><i style="background:' + colour(k * max) + '"></i></span>').join('') + '<span>More</span><span>Outlined: longest streak</span>';
      this.$note.innerHTML = '<b>' + st.active + '</b> of ' + st.n + ' days active (' + Math.round((100 * st.active) / st.n) + '%), ' + esc(fmtNum(st.total, d)) + ' ' + esc(d.unit || '') + ' in all.' +
        (bd ? ' Longest streak: <b>' + st.best.len + ' days</b>, ' + bd.getUTCDate() + ' ' + MON[bd.getUTCMonth()] + ' to ' + be.getUTCDate() + ' ' + MON[be.getUTCMonth()] + '.' : '') +
        (st.current.len > 1 ? ' Current streak: <b>' + st.current.len + ' days</b>.' : '');
    }
  }

  /* ======================================================================================
   * Goalmeter: progress toward a goal with milestones and a projection
   * data = { goal, prefix?, suffix?, label?, milestones?:[{at,label}], entries:[{date:'YYYY-MM-DD', amount, note?}] }
   * ====================================================================================== */
  class Goalmeter extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { today: null });
      this.entries = data.entries.map(e => Object.assign({}, e, { t: Date.parse(e.date + 'T00:00:00Z') })).sort((a, b) => a.t - b.t);
      el.innerHTML = '<svg role="img"></svg><p class="ds-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.ds-note');
      this._hot(this.$svg, k => this.select(k));
      this.render();
    }
    _calc() {
      const d = this.data, total = this.entries.reduce((s, e) => s + +e.amount, 0), goal = +d.goal;
      const first = this.entries[0].t, last = this.entries[this.entries.length - 1].t;
      const days = Math.max(1, (last - first) / DAY), rate = total / days; // per day, over the period so far
      const left = Math.max(0, goal - total), eta = rate > 0 && left > 0 ? last + (left / rate) * DAY : null;
      return { total, goal, pct: goal ? total / goal : 0, rate, left, eta, first, last };
    }
    select(k) {
      const d = this.data, c = this._calc(), m = (d.milestones || [])[+k];
      if (!m) return;
      this.$note.innerHTML = '<b>' + esc(m.label) + '</b> at ' + esc(fmtNum(+m.at, d)) + ': ' + (c.total >= +m.at ? 'reached.' : esc(fmtNum(+m.at - c.total, d)) + ' to go.');
      this._emit('select', { milestone: m });
    }
    render() {
      const T = themeOf(this.el), d = this.data, c = this._calc(), W = Math.max(300, this.$svg.clientWidth || 700), narrow = W < 520;
      const padX = 14, barY = 92, barH = narrow ? 30 : 38, bw = W - padX * 2, H = barY + barH + 64, cid = 'gm' + (++Goalmeter._n || (Goalmeter._n = 1));
      const x = v => padX + clamp(v / c.goal, 0, 1) * bw;
      let s = '<text x="' + padX + '" y="30" font-size="' + (narrow ? 24 : 32) + '" font-weight="800" fill="' + T.fg + '">' + esc(fmtNum(c.total, d)) + '</text>' +
        '<text x="' + (W - padX) + '" y="30" text-anchor="end" font-size="14" font-weight="700" fill="' + T.muted + '">of ' + esc(fmtNum(c.goal, d)) + ' · ' + Math.round(c.pct * 100) + '%</text>' +
        '<text x="' + padX + '" y="52" font-size="13" fill="' + T.muted + '">' + esc(d.label || '') + '</text>' +
        '<defs><clipPath id="' + cid + '"><rect x="' + padX + '" y="' + barY + '" width="' + bw + '" height="' + barH + '" rx="' + barH / 2 + '"/></clipPath></defs>' +
        '<rect x="' + padX + '" y="' + barY + '" width="' + bw + '" height="' + barH + '" rx="' + barH / 2 + '" fill="' + T.line + '"/><g clip-path="url(#' + cid + ')">';
      // contributions as stacked segments
      let acc = 0;
      this.entries.forEach((e, i) => {
        const x0 = x(acc); acc += +e.amount; const x1 = x(acc);
        s += '<rect x="' + f1(x0) + '" y="' + barY + '" width="' + f1(Math.max(0.5, x1 - x0)) + '" height="' + barH + '" fill="' + T.accent + '" opacity="' + (0.65 + 0.35 * ((i % 2) ? 0.6 : 1)) + '"><title>' + esc(e.date + ': ' + fmtNum(+e.amount, d) + (e.note ? ' · ' + e.note : '')) + '</title></rect>';
      });
      s += '</g><rect x="' + padX + '" y="' + barY + '" width="' + bw + '" height="' + barH + '" rx="' + barH / 2 + '" fill="none" stroke="' + T.line + '" stroke-width="2"/>';
      (d.milestones || []).forEach((m, i) => {
        const mx = x(+m.at), hit = c.total >= +m.at, up = i % 2 === 0;
        const ty = up ? barY - 10 : barY + barH + 16;
        s += '<g class="ds-hot" tabindex="0" role="button" data-k="' + i + '" aria-label="' + esc(m.label + ', ' + fmtNum(+m.at, d) + (hit ? ', reached' : '')) + '">' +
          '<line x1="' + f1(mx) + '" y1="' + (barY - 4) + '" x2="' + f1(mx) + '" y2="' + (barY + barH + 4) + '" stroke="' + (hit ? T.surface : T.fg) + '" stroke-width="2" stroke-dasharray="' + (hit ? '0' : '3 3') + '"/>' +
          '<circle cx="' + f1(mx) + '" cy="' + (up ? barY - 4 : barY + barH + 4) + '" r="6" fill="' + (hit ? T.accent : T.surface) + '" stroke="' + T.fg + '" stroke-width="1.5"/>' +
          (narrow && i % 2 ? '' : '<text x="' + f1(clamp(mx, padX + 40, W - padX - 40)) + '" y="' + (up ? ty - 6 : ty + 6) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + T.fg + '">' + esc(fitText(m.label, narrow ? 110 : 160, 12)) + '</text>') + '</g>';
      });
      // projection
      const proj = c.left <= 0 ? 'Goal reached.' : c.eta ? 'At the pace so far (' + fmtNum(c.rate * 7, d) + ' a week), the goal is reached around ' + new Date(c.eta).getUTCDate() + ' ' + MON[new Date(c.eta).getUTCMonth()] + ' ' + new Date(c.eta).getUTCFullYear() + '.' : '';
      s += '<text x="' + padX + '" y="' + (H - 6) + '" font-size="13" fill="' + T.muted + '">' + esc(this.entries.length + ' contributions since ' + new Date(c.first).getUTCDate() + ' ' + MON[new Date(c.first).getUTCMonth()]) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.label || 'Goal') + ': ' + fmtNum(c.total, d) + ' of ' + fmtNum(c.goal, d) + '. ' + proj);
      this.$svg.innerHTML = s;
      this.$note.innerHTML = c.left > 0 ? '<b>' + esc(fmtNum(c.left, d)) + '</b> to go. ' + esc(proj) : '<b>Goal reached.</b>';
    }
  }

  /* ======================================================================================
   * Dayclock: a 24-hour day as a clock face; switch between days
   * data = { activities:[{id,label,color?}], days:[{id,label, blocks:[{activity, from:'HH:MM', to:'HH:MM', note?}]}] }
   * ====================================================================================== */
  const mins = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s)); return m ? (+m[1] % 24) * 60 + +m[2] : 0; };
  const hm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dur = m => (m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm');
  class Dayclock extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.acts = data.activities.map((a, i) => Object.assign({ i }, a));
      this.day = data.days[0]; this.sel = null;
      el.innerHTML = (data.days.length > 1 ? '<div class="ds-bar" role="group" aria-label="Day">' + data.days.map(dd => '<button type="button" class="ds-btn" data-d="' + esc(dd.id) + '">' + esc(dd.label) + '</button>').join('') + '</div>' : '') +
        '<svg role="img"></svg><div class="ds-legend"></div><p class="ds-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$legend = el.querySelector('.ds-legend'); this.$note = el.querySelector('.ds-note');
      el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { this.day = data.days.find(x => x.id === b.dataset.d); this.sel = null; this.render(); this._emit('day', { id: this.day.id }); });
      this._hot(this.$svg, k => { this.sel = +k; this.render(); const bl = this._blocks()[+k]; this._emit('select', { activity: bl.act.id, from: hm(bl.a), to: hm(bl.b) }); });
      this.render();
    }
    _blocks() {
      return this.day.blocks.map(b => { let a = mins(b.from), z = mins(b.to); if (z <= a) z += 1440; return { a, b: z, len: z - a, act: this.acts.find(x => x.id === b.activity) || this.acts[0], note: b.note }; });
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 600), S = Math.min(W, 460), H = S, cx = W / 2, cy = S / 2, R = S * 0.44, r0 = R * 0.56;
      const ang = m => (m / 1440) * TAU - Math.PI / 2;
      const blocks = this._blocks();
      let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(R) + '" fill="' + T.line + '" opacity=".5"/>';
      blocks.forEach((bl, i) => {
        const a0 = ang(bl.a), a1 = ang(bl.b), large = bl.len > 720 ? 1 : 0, c = colorFor(this.el, bl.act, bl.act.i), on = this.sel === i, Ro = on ? R + 8 : R;
        const p = (rad, a) => f1(cx + Math.cos(a) * rad) + ' ' + f1(cy + Math.sin(a) * rad);
        const d = 'M' + p(Ro, a0) + ' A' + Ro + ' ' + Ro + ' 0 ' + large + ' 1 ' + p(Ro, a1) + ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p(r0, a0) + ' Z';
        s += '<g class="ds-hot" tabindex="0" role="button" data-k="' + i + '" aria-label="' + esc(bl.act.label + ', ' + hm(bl.a) + ' to ' + hm(bl.b) + ', ' + dur(bl.len)) + '"><path d="' + d + '" fill="' + c + '" stroke="' + T.surface + '" stroke-width="2"' + (this.sel != null && !on ? ' opacity=".45"' : '') + '/></g>';
        if (bl.len >= 75 && S > 300) { const am = ang(bl.a + bl.len / 2), rr = (R + r0) / 2; s += '<text x="' + f1(cx + Math.cos(am) * rr) + '" y="' + f1(cy + Math.sin(am) * rr + 4) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="#ffffff" pointer-events="none">' + esc(fitText(bl.act.label, 70, 11.5)) + '</text>'; }
      });
      for (let h = 0; h < 24; h += 3) { const a = ang(h * 60); s += '<text x="' + f1(cx + Math.cos(a) * (R + 16)) + '" y="' + f1(cy + Math.sin(a) * (R + 16) + 4) + '" text-anchor="middle" font-size="11" font-weight="600" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + String(h).padStart(2, '0') + '</text>'; }
      const sel = this.sel != null ? blocks[this.sel] : null;
      const totals = {}; blocks.forEach(b => { totals[b.act.id] = (totals[b.act.id] || 0) + b.len; });
      const top = Object.keys(totals).sort((a, b) => totals[b] - totals[a])[0], topAct = this.acts.find(a => a.id === top);
      s += '<text x="' + cx + '" y="' + f1(cy - 6) + '" text-anchor="middle" font-size="' + (S < 340 ? 15 : 19) + '" font-weight="800" fill="' + T.fg + '">' + esc(sel ? sel.act.label : this.day.label) + '</text>' +
        '<text x="' + cx + '" y="' + f1(cy + 16) + '" text-anchor="middle" font-size="12.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(sel ? hm(sel.a) + '–' + hm(sel.b) + ' · ' + dur(sel.len) : 'most time: ' + (topAct ? topAct.label : '')) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.day.label + ': ' + blocks.map(b => b.act.label + ' ' + hm(b.a) + ' to ' + hm(b.b)).join(', '));
      this.$svg.innerHTML = s;
      this.el.querySelectorAll('[data-d]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === this.day.id)));
      this.$legend.innerHTML = this.acts.filter(a => totals[a.id]).map(a => '<span><i style="background:' + esc(colorFor(this.el, a, a.i)) + '"></i>' + esc(a.label) + ' · ' + dur(totals[a.id]) + '</span>').join('');
      this.$note.innerHTML = sel ? '<b>' + esc(sel.act.label) + '</b> from ' + hm(sel.a) + ' to ' + hm(sel.b) + ' (' + dur(sel.len) + ', ' + Math.round((100 * sel.len) / 1440) + '% of the day).' + (sel.note ? ' ' + esc(sel.note) : '') : 'Tap a slice of the day for detail.';
    }
  }

  return { Tilemap, Mosaic, Duel, Almanac, Goalmeter, Dayclock, squarify };
});
