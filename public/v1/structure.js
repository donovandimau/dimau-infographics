/*! Structure 1.0 · Dimau Infographics
 *  Six formats for how things are nested and linked:
 *    Sunburst    a nested list as rings; tap a slice to zoom into it, tap the centre to go back up.
 *    Circlepack  a nested list as circles inside circles, sized by amount; tap to zoom in and out.
 *    Icicle      a nested list as stacked blocks, left to right; tap a block to zoom into it.
 *    Arcflow     links between things drawn as arcs down one line; tap one to see only its links, sort the line.
 *    Linkmatrix  who links to whom as a grid of shaded cells; tap a cell, sort by name or by total.
 *    Lifespans   lives, eras or projects as bars on a time line; slide to a year to see who overlapped.
 *
 *  new Sunburst(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Sunburst', 'Circlepack', 'Icicle', 'Arcflow', 'Linkmatrix', 'Lifespans'].forEach(function (k) { root[k] = m[k]; }); root.DimauStructure = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#c2563a', '#6a7f2a', '#a04f9a', '#2a6f97', '#b05a2c'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmt = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 1 }) + (o.suffix || '') : '–'; };
  const pct = n => (n < 0.01 && n > 0 ? '<1' : Math.round(n * 100)) + '%';
  const TAU = Math.PI * 2;
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  /** Mix a colour toward white by k (0..1). */
  function tint(hex, k) { const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex; const n = parseInt(m[1], 16), ch = s => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * k); return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; }

  /** Turn { label, value?, children? } into nodes with ids, totals, depth and a top-level colour index. */
  function tree(root) {
    const all = [];
    (function walk(n, parent, depth, path) {
      const node = { label: n.label, note: n.note, id: path, parent, depth, own: +n.value || 0, kids: [] };
      all.push(node);
      (n.children || []).forEach((c, i) => node.kids.push(walk(c, node, depth + 1, path + '.' + i)));
      node.value = node.kids.length ? node.kids.reduce((a, k) => a + k.value, 0) + node.own : node.own;
      return node;
    })(root, null, 0, '0');
    all.forEach(n => { let t = n; while (t.parent && t.parent.parent) t = t.parent; n.top = n.parent ? n.parent.kids.indexOf(n) : 0; n.branch = n.depth === 0 ? -1 : t.parent ? t.parent.kids.indexOf(t) : 0; });
    return { root: all[0], byId: Object.fromEntries(all.map(n => [n.id, n])), all };
  }
  const trail = n => { const t = []; for (let x = n; x; x = x.parent) t.unshift(x); return t; };
  const countLeaves = n => (n.kids.length ? n.kids.reduce((a, k) => a + countLeaves(k), 0) : 1);

  const STYLE = `
.dx{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dx) button{font:inherit;color:inherit}
.dx :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dx svg{display:block;width:100%}
.dx svg [data-k]{cursor:pointer}
.dx svg [data-k]:focus{outline:none}
.dx svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:3}
.dx-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dx-bar .dx-lab{font-size:13px;font-weight:700;color:var(--di-muted,#4f6578);margin-right:2px}
.dx-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.dx-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dx-btn:disabled{opacity:.45;cursor:default}
.dx-crumbs{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:0 0 10px;font-size:13px}
.dx-crumbs button{border:0;background:none;padding:4px 6px;border-radius:6px;font-weight:700;color:var(--di-accent,#0b6fa4);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.dx-crumbs b{padding:4px 6px}
.dx-crumbs span{color:var(--di-muted,#4f6578)}
.dx-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dx-legend{display:flex;flex-wrap:wrap;gap:6px 8px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dx-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.dx-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700}
.dx-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
`;
  function injectStyle() {
    if (document.getElementById('dx-style')) return;
    const s = document.createElement('style'); s.id = 'dx-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dx');
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
    _seg(name, attr, opts, cur) { return '<div class="dx-bar" role="group" aria-label="' + esc(name) + '"><span class="dx-lab">' + esc(name) + '</span>' + opts.map(([v, l]) => '<button type="button" class="dx-btn" data-' + attr + '="' + esc(v) + '" aria-pressed="' + (v === cur) + '">' + esc(l) + '</button>').join('') + '</div>'; }
    get _fmt() { const d = this.data; return { prefix: d.prefix, suffix: d.suffix != null ? d.suffix : d.unit ? ' ' + d.unit : '', decimals: d.decimals }; }
    _v(v) { const d = this.data, o = this._fmt; if (v === 1 && d.suffix == null && d.unit && /s$/.test(d.unit)) o.suffix = ' ' + d.unit.slice(0, -1); return fmt(v, o); }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('dx'); }
  }

  /* Shared by the three nested-list views: breadcrumbs, zoom, note. */
  class Nested extends Base {
    constructor(el, data, opts, defaults) {
      super(el, data, opts, defaults);
      this.t = tree(data.root); this.focus = this.t.root; this.sel = null;
      el.innerHTML = '<nav class="dx-crumbs" aria-label="Where you are"></nav><svg role="group"></svg><p class="dx-note" aria-live="polite"></p>';
      this.$crumbs = el.querySelector('.dx-crumbs'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dx-note');
      this.$crumbs.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) this.zoom(this.t.byId[b.dataset.go]); });
      this._hot(this.$svg, k => { const n = this.t.byId[k]; if (!n) return; if (n === this.focus) { if (n.parent) this.zoom(n.parent); return; } if (n.kids.length) this.zoom(n); else { this.sel = this.sel === n ? null : n; this.render(); if (this.sel) this._emit('select', this._info(n)); } });
      this.$svg.addEventListener('keydown', e => { if (e.key === 'Escape' && this.focus.parent) { e.preventDefault(); this.zoom(this.focus.parent); } });
    }
    _info(n) { return { id: n.id, path: trail(n).map(x => x.label), value: n.value }; }
    zoom(n) { if (!n) return; this.focus = n; this.sel = null; this.render(); this._emit('zoom', this._info(n)); const g = this.$svg.querySelector('[data-k="' + CSS.escape(n.id) + '"]'); g && g.focus({ preventScroll: true }); }
    _col(n) { if (n.depth === 0) return themeOf(this.el).accent; const top = trail(n)[1], base = colorFor(this.el, { id: this.data.root.children[top.top].id || '' }, top.top); return n.depth === 1 ? base : tint(base, Math.min(0.55, (n.depth - 1) * 0.22 + (n.top % 2) * 0.08)); }
    _crumbs() { const tr = trail(this.focus); this.$crumbs.innerHTML = tr.map((n, i) => (i < tr.length - 1 ? '<button type="button" data-go="' + esc(n.id) + '">' + esc(n.label) + '</button><span aria-hidden="true">›</span>' : '<b aria-current="location">' + esc(n.label) + '</b>')).join(''); }
    _note() {
      const F = this._fmt, f = this.focus, n = this.sel;
      if (n) { const p = n.parent; this.$note.innerHTML = '<b>' + esc(trail(n).slice(1).map(x => x.label).join(' › ')) + '</b>: ' + this._v(n.value) + ', ' + pct(n.value / (p ? p.value : n.value)) + ' of ' + esc(p ? p.label : 'the whole') + (this.t.root !== p ? ' and ' + pct(n.value / this.t.root.value) + ' of everything' : '') + '.' + (n.note ? ' ' + esc(n.note) : ''); return; }
      const ks = f.kids.slice().sort((a, b) => b.value - a.value);
      this.$note.innerHTML = '<b>' + esc(f.label) + '</b>: ' + this._v(f.value) + (f.parent ? ' (' + pct(f.value / this.t.root.value) + ' of everything)' : '') + ' in ' + f.kids.length + ' parts' + (ks.length > 1 && ks[0].value === ks[ks.length - 1].value ? ', all the same size' : ks.length ? '. Biggest: <b>' + esc(ks[0].label) + '</b> (' + pct(ks[0].value / f.value) + ')' : '') + '. Tap a part to look inside' + (f.parent ? '; tap the centre or press Escape to go back up' : '') + '.';
    }
  }

  /* ======================================================================================
   * Sunburst: rings; zoom into a slice
   * data = { unit?, prefix?, root:{label, children:[{id?,label,value?,children?,note?}]} }  options: { rings: 3 }
   * ====================================================================================== */
  class Sunburst extends Nested {
    constructor(el, data, opts) { super(el, data, opts, { rings: 3 }); this.render(); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 600), S = Math.min(W, 520), cx = W / 2, cy = S / 2, R = S / 2 - 6, f = this.focus, rings = this.o.rings, r0 = R * 0.28, rw = (R - r0) / rings;
      let s = '<g data-k="' + esc(f.id) + '" tabindex="0" role="button" aria-label="' + esc(f.label + (f.parent ? ', go back up to ' + f.parent.label : '')) + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + f1(r0 - 2) + '" fill="' + T.surface + '" stroke="' + T.line + '"/><text x="' + cx + '" y="' + f1(cy - (f.parent ? 2 : -4)) + '" text-anchor="middle" font-size="12.5" font-weight="800" fill="' + T.fg + '">' + esc(fitText(f.label, r0 * 1.8, 12.5)) + '</text>' + (f.parent ? '<text x="' + cx + '" y="' + f1(cy + 14) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '">↑ back</text>' : '') + '</g>';
      const arc = (a0, a1, ri, ro) => { const big = a1 - a0 > Math.PI ? 1 : 0, p = (a, r) => f1(cx + Math.sin(a) * r) + ' ' + f1(cy - Math.cos(a) * r); if (a1 - a0 >= TAU - 1e-6) a1 = a0 + TAU - 1e-4; return 'M' + p(a0, ro) + ' A' + f1(ro) + ' ' + f1(ro) + ' 0 ' + big + ' 1 ' + p(a1, ro) + ' L' + p(a1, ri) + ' A' + f1(ri) + ' ' + f1(ri) + ' 0 ' + big + ' 0 ' + p(a0, ri) + 'Z'; };
      const draw = (n, a0, a1, lvl) => {
        if (lvl > rings || !n.value) return;
        let a = a0; n.kids.forEach(k => {
          const da = ((a1 - a0) * k.value) / n.value, ri = r0 + (lvl - 1) * rw, ro = ri + rw - 1.5, on = this.sel === k, mid = a + da / 2, rm = (ri + ro) / 2, arcLen = da * rm;
          if (da > 0.002) {
            const tx = cx + Math.sin(mid) * rm, ty = cy - Math.cos(mid) * rm, lab = arcLen > 30 && rw > 26 ? fitText(k.label, Math.min(arcLen, rw * 1.6) - 4, 10.5) : '';
            s += '<g data-k="' + esc(k.id) + '" tabindex="0" role="button" aria-label="' + esc(k.label + ': ' + this._v(k.value) + ', ' + pct(k.value / n.value) + (k.kids.length ? ', ' + k.kids.length + ' parts inside' : '')) + '"' + (this.sel && !on ? ' opacity=".45"' : '') + '><path d="' + arc(a + 0.004, a + da - 0.004, ri, ro) + '" fill="' + this._col(k) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2.5"' : '') + '/>' +
              (lab ? '<text x="' + f1(tx) + '" y="' + f1(ty + 3.5) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + (k.depth - f.depth === 1 ? '#fff' : T.fg) + '" pointer-events="none">' + esc(lab) + '</text>' : '') + '</g>';
            draw(k, a, a + da, lvl + 1);
          }
          a += da;
        });
      };
      draw(f, 0, TAU, 1);
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + S); this.$svg.style.height = S + 'px';
      this.$svg.setAttribute('aria-label', 'Rings of ' + f.label + '. Tap a slice to zoom in, the centre to go back up.');
      this._keep(this.$svg, s); this._crumbs(); this._note();
    }
  }

  /* ======================================================================================
   * Icicle: stacked blocks left to right; zoom into a block
   * data = same as Sunburst  options: { levels: 3 }
   * ====================================================================================== */
  class Icicle extends Nested {
    constructor(el, data, opts) { super(el, data, opts, { levels: 3 }); this.render(); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, f = this.focus, lv = this.o.levels, H = narrow ? 380 : 440, c0 = narrow ? 64 : 120, cw = (W - c0) / lv, F = this._fmt;
      let s = '';
      const block = (n, x, y, w, h, isFocus) => {
        const on = this.sel === n, lab = h >= 16 ? fitText(n.label, w - 10, 11.5) : '', sub = h >= 32 && w > 70 ? this._v(n.value) : '';
        s += '<g data-k="' + esc(n.id) + '" tabindex="0" role="button" aria-label="' + esc(n.label + ': ' + this._v(n.value) + (isFocus && n.parent ? ', go back up to ' + n.parent.label : n.kids.length ? ', ' + n.kids.length + ' parts inside' : '')) + '"' + (this.sel && !on && !isFocus ? ' opacity=".45"' : '') + '><rect x="' + f1(x + 1) + '" y="' + f1(y + 1) + '" width="' + f1(Math.max(0, w - 2)) + '" height="' + f1(Math.max(0, h - 2)) + '" rx="3" fill="' + (isFocus ? T.surface : this._col(n)) + '" stroke="' + (on ? T.fg : isFocus ? T.line : 'none') + '" stroke-width="' + (on ? 2.5 : 1) + '"/>' +
          (lab ? '<text x="' + f1(x + 7) + '" y="' + f1(y + Math.min(h / 2, 16) + 4) + '" font-size="11.5" font-weight="700" fill="' + (isFocus || n.depth - f.depth > 1 ? T.fg : '#fff') + '" pointer-events="none">' + esc(lab) + '</text>' : '') +
          (sub ? '<text x="' + f1(x + 7) + '" y="' + f1(y + Math.min(h / 2, 16) + 18) + '" font-size="10.5" fill="' + (isFocus || n.depth - f.depth > 1 ? T.muted : '#fff') + '" font-family="' + esc(T.mono) + '" pointer-events="none">' + esc(sub) + '</text>' : '') + '</g>';
      };
      block(f, 0, 0, c0, H, true);
      const draw = (n, y0, h, lvl) => { if (lvl > lv || !n.value) return; let y = y0; n.kids.forEach(k => { const hh = (h * k.value) / n.value; if (hh > 0.6) { block(k, c0 + (lvl - 1) * cw, y, cw, hh, false); draw(k, y, hh, lvl + 1); } y += hh; }); };
      draw(f, 0, H, 1);
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Blocks of ' + f.label + ', left to right. Tap a block to zoom in, the first column to go back up.');
      this._keep(this.$svg, s); this._crumbs(); this._note();
    }
  }

  /* ======================================================================================
   * Circlepack: circles inside circles; zoom
   * data = same as Sunburst
   * ====================================================================================== */
  function packSiblings(cs) {
    // Greedy: each circle sits against two placed circles, as close to the middle as it can without overlapping.
    const placed = [];
    cs.slice().sort((a, b) => b.r - a.r).forEach((c, i) => {
      if (i === 0) { c.x = 0; c.y = 0; }
      else if (i === 1) { c.x = placed[0].r + c.r; c.y = 0; }
      else {
        let best = null;
        for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) {
          const A = placed[a], B = placed[b], da = A.r + c.r, db = B.r + c.r, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
          if (d > da + db || d < Math.abs(da - db) || d === 0) continue;
          const l = (da * da - db * db + d * d) / (2 * d), h = Math.sqrt(Math.max(0, da * da - l * l)), mx = A.x + (dx * l) / d, my = A.y + (dy * l) / d;
          [[mx + (dy * h) / d, my - (dx * h) / d], [mx - (dy * h) / d, my + (dx * h) / d]].forEach(([x, y]) => {
            if (placed.some(p => Math.hypot(p.x - x, p.y - y) < p.r + c.r - 1e-6)) return;
            const sc = Math.hypot(x, y) + c.r; if (!best || sc < best[2]) best = [x, y, sc];
          });
        }
        if (!best) { const far = Math.max(...placed.map(p => Math.hypot(p.x, p.y) + p.r)); best = [far + c.r, 0]; }
        c.x = best[0]; c.y = best[1];
      }
      placed.push(c);
    });
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity; placed.forEach(p => { mnx = Math.min(mnx, p.x - p.r); mxx = Math.max(mxx, p.x + p.r); mny = Math.min(mny, p.y - p.r); mxy = Math.max(mxy, p.y + p.r); });
    const ox = (mnx + mxx) / 2, oy = (mny + mxy) / 2; placed.forEach(p => { p.x -= ox; p.y -= oy; });
    return placed.length ? Math.max(...placed.map(p => Math.hypot(p.x, p.y) + p.r)) : 0;
  }
  class Circlepack extends Nested {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      const lay = n => { if (!n.kids.length) { n.r = Math.sqrt(n.value || 0.0001); return; } n.kids.forEach(lay); const R = packSiblings(n.kids); n.r = R * 1.06 + (n.kids.length === 1 ? R * 0.15 : 0); };
      lay(this.t.root);
      const abs = (n, x, y) => { n.ax = x; n.ay = y; n.kids.forEach(k => abs(k, x + k.x, y + k.y)); };
      abs(this.t.root, 0, 0);
      this.render();
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 600), S = Math.min(W, 540), cx = W / 2, cy = S / 2, f = this.focus, k0 = (S / 2 - 6) / f.r, P = n => [cx + (n.ax - f.ax) * k0, cy + (n.ay - f.ay) * k0];
      let s = '<g data-k="' + esc(f.id) + '" tabindex="0" role="button" aria-label="' + esc(f.label + (f.parent ? ', go back up to ' + f.parent.label : '')) + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + f1(f.r * k0) + '" fill="' + (f.depth ? tint(this._col(f), 0.75) : T.bg) + '" stroke="' + T.line + '"/></g>';
      const draw = (n, lvl) => n.kids.forEach(k => {
        const [x, y] = P(k), r = k.r * k0, on = this.sel === k; if (r < 1.2) return;
        const lab = lvl === 1 && r > 16 ? fitText(k.label, r * 1.8, 11) : '';
        s += '<g data-k="' + esc(k.id) + '" tabindex="' + (lvl === 1 ? 0 : -1) + '" role="button" aria-label="' + esc(k.label + ': ' + this._v(k.value) + ', ' + pct(k.value / n.value) + (k.kids.length ? ', ' + k.kids.length + ' parts inside' : '')) + '"' + (this.sel && !on && lvl === 1 ? ' opacity=".5"' : '') + (lvl > 1 ? ' pointer-events="none"' : '') + '><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="' + (k.kids.length ? tint(this._col(k), lvl === 1 ? 0.55 : 0.3) : this._col(k)) + '" stroke="' + (on ? T.fg : T.surface) + '" stroke-width="' + (on ? 2.5 : 1) + '"/>' +
          (lab ? '<text x="' + f1(x) + '" y="' + f1(k.kids.length && r > 40 ? y - r + 15 : y + 4) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3" stroke-linejoin="round" pointer-events="none">' + esc(lab) + '</text>' : '') + '</g>';
        if (lvl < 3) draw(k, lvl + 1);
      });
      draw(f, 1);
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + S); this.$svg.style.height = S + 'px';
      this.$svg.setAttribute('aria-label', 'Circles inside ' + f.label + '. Tap a circle to zoom in, the outer circle to go back up.');
      this._keep(this.$svg, s); this._crumbs(); this._note();
    }
  }

  /* ======================================================================================
   * Arcflow: arcs between items down one line
   * data = { nodes:[{id,label,group?}], groups?:[{id,label}], links:[{from,to,value}], unit? }  options: { sort: 'data' }
   * ====================================================================================== */
  class Arcflow extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'data' });
      this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g)); this.nodes = data.nodes.map((n, i) => Object.assign({ i }, n));
      const ix = Object.fromEntries(this.nodes.map(n => [n.id, n])); this.links = data.links.filter(l => ix[l.from] && ix[l.to]).map(l => ({ a: ix[l.from], b: ix[l.to], v: +l.value || 1 }));
      this.nodes.forEach(n => { n.tot = this.links.reduce((s, l) => s + (l.a === n || l.b === n ? l.v : 0), 0); });
      this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="dx-sortwrap"></div><svg role="group"></svg><div class="dx-legend"></div><p class="dx-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.dx-sortwrap'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dx-legend'); this.$note = el.querySelector('.dx-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; this.sort = b.dataset.sort; this.render(); this._emit('sort', { sort: this.sort }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.nodes[this.sel].id }); });
      this.render();
    }
    _gc(n) { const g = this.groups.find(x => x.id === n.group); return g ? colorFor(this.el, g, g.i) : themeOf(this.el).accent; }
    render() {
      const T = themeOf(this.el), F = this._fmt, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, step = 30, pl = narrow ? 110 : 160, pt = 14, N = this.nodes.length, H = pt * 2 + (N - 1) * step;
      const order = this.nodes.slice().sort({ data: (a, b) => a.i - b.i, total: (a, b) => b.tot - a.tot, name: (a, b) => String(a.label).localeCompare(b.label), group: (a, b) => (this.groups.findIndex(g => g.id === a.group) - this.groups.findIndex(g => g.id === b.group)) || a.i - b.i }[this.sort] || ((a, b) => a.i - b.i));
      order.forEach((n, k) => { n.y = pt + k * step; });
      const vmax = Math.max(...this.links.map(l => l.v)), sw = v => 1.5 + (v / vmax) * 9, sel = this.sel != null ? this.nodes[this.sel] : null, maxR = (W - pl - 16);
      let s = '';
      this.links.slice().sort((x, y) => y.v - x.v).forEach(l => {
        const y0 = Math.min(l.a.y, l.b.y), y1 = Math.max(l.a.y, l.b.y), r = (y1 - y0) / 2, bulge = Math.min(r, maxR), mine = sel && (l.a === sel || l.b === sel);
        s += '<path d="M' + pl + ' ' + y0 + ' C' + f1(pl + bulge * 1.33) + ' ' + y0 + ' ' + f1(pl + bulge * 1.33) + ' ' + y1 + ' ' + pl + ' ' + y1 + '" fill="none" stroke="' + (mine ? this._gc(sel) : T.muted) + '" stroke-width="' + f1(sw(l.v)) + '" stroke-linecap="round" opacity="' + (sel ? (mine ? 0.85 : 0.07) : 0.3) + '" pointer-events="none"/>';
      });
      order.forEach(n => {
        const on = this.sel === n.i, linked = sel && this.links.some(l => (l.a === sel && l.b === n) || (l.b === sel && l.a === n)), dim = sel && !on && !linked;
        s += '<g data-k="' + n.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(n.label + ': ' + fmt(n.tot, F) + ' in all') + '" opacity="' + (dim ? 0.35 : 1) + '"><circle cx="' + pl + '" cy="' + n.y + '" r="' + (on ? 8 : 6) + '" fill="' + this._gc(n) + '" stroke="' + T.surface + '" stroke-width="2"/><rect x="0" y="' + (n.y - step / 2) + '" width="' + (pl + 10) + '" height="' + step + '" fill="transparent"/>' +
          '<text x="' + (pl - 12) + '" y="' + (n.y + 4) + '" text-anchor="end" font-size="12" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(n.label, pl - 50, 12)) + '</text><text x="' + (pl - 12 - Math.min(pl - 50, String(fitText(n.label, pl - 50, 12)).length * 6.7) - 6) + '" y="' + (n.y + 4) + '" text-anchor="end" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(n.tot, { decimals: 0 })) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', N + ' items and ' + this.links.length + ' links between them');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = this._seg('Sort', 'sort', [['data', 'As listed'], ['total', 'Most linked']].concat(this.groups.length ? [['group', 'By group']] : []).concat([['name', 'A–Z']]), this.sort);
      this.$leg.innerHTML = this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + ';border-radius:50%"></i>' + esc(g.label) + '</span>').join('');
      if (sel) { const ls = this.links.filter(l => l.a === sel || l.b === sel).map(l => [l.a === sel ? l.b : l.a, l.v]).sort((a, b) => b[1] - a[1]); this.$note.innerHTML = '<b>' + esc(sel.label) + '</b>: ' + fmt(sel.tot, F) + ' with ' + ls.length + ' others' + (ls.length ? ' — most with <b>' + esc(ls[0][0].label) + '</b> (' + fmt(ls[0][1], F) + ')' : '') + (ls.length > 1 ? ', then ' + ls.slice(1, 4).map(x => esc(x[0].label) + ' (' + fmt(x[1], { decimals: 0 }) + ')').join(', ') : '') + '.'; }
      else { const top = this.links.reduce((a, b) => (b.v > a.v ? b : a)), hub = this.nodes.reduce((a, b) => (b.tot > a.tot ? b : a)); this.$note.innerHTML = 'Busiest link: <b>' + esc(top.a.label) + ' – ' + esc(top.b.label) + '</b> (' + fmt(top.v, F) + '). Most linked: <b>' + esc(hub.label) + '</b>. Thicker arcs carry more. Tap an item to see only its links.'; }
    }
  }

  /* ======================================================================================
   * Linkmatrix: a grid of who links to whom
   * data = { nodes:[{id,label,group?}], links:[{from,to,value}], directed?: true, unit?, rowsLabel?, colsLabel? }  options: { sort: 'data' }
   * ====================================================================================== */
  class Linkmatrix extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'data' });
      this.nodes = data.nodes.map((n, i) => Object.assign({ i }, n)); const N = this.nodes.length, ix = Object.fromEntries(this.nodes.map(n => [n.id, n.i]));
      this.m = Array.from({ length: N }, () => new Array(N).fill(0));
      data.links.forEach(l => { const a = ix[l.from], b = ix[l.to]; if (a == null || b == null) return; this.m[a][b] += +l.value || 1; if (!data.directed && a !== b) this.m[b][a] += +l.value || 1; });
      this.nodes.forEach(n => { n.out = this.m[n.i].reduce((a, b) => a + b, 0); n.inn = this.m.reduce((a, r) => a + r[n.i], 0); });
      this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="dx-sortwrap"></div><svg role="grid"></svg><p class="dx-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.dx-sortwrap'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dx-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; this.sort = b.dataset.sort; this.render(); this._emit('sort', { sort: this.sort }); });
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) { const [a, b] = k.split(':').map(Number); this._emit('select', { from: this.nodes[a].id, to: this.nodes[b].id, value: this.m[a][b] }); } });
      this.$svg.addEventListener('keydown', e => {
        const g = e.target.closest('[data-k]'); if (!g) return; const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!d) return; e.preventDefault();
        const [a, b] = g.dataset.k.split(':').map(Number), ra = this._ord.indexOf(a), cb = this._ord.indexOf(b), na = this._ord[clamp(ra + d[0], 0, this._ord.length - 1)], nb = this._ord[clamp(cb + d[1], 0, this._ord.length - 1)];
        const t = this.$svg.querySelector('[data-k="' + na + ':' + nb + '"]'); t && t.focus();
      });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, F = this._fmt, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, N = this.nodes.length, pl = narrow ? 84 : 130, top = narrow ? 84 : 110;
      const cs = Math.min(46, (W - pl - 8) / N), H = top + cs * N + 6, max = Math.max(1, ...this.m.flat());
      const ord = this._ord = this.nodes.slice().sort({ data: (a, b) => a.i - b.i, total: (a, b) => (b.out + b.inn) - (a.out + a.inn), name: (a, b) => String(a.label).localeCompare(b.label) }[this.sort] || ((a, b) => a.i - b.i)).map(n => n.i);
      const [sa, sb] = this.sel ? this.sel.split(':').map(Number) : [null, null];
      let s = '';
      ord.forEach((a, r) => {
        const y = top + r * cs, n = this.nodes[a];
        s += '<text x="' + (pl - 8) + '" y="' + f1(y + cs / 2 + 4) + '" text-anchor="end" font-size="11.5" font-weight="' + (a === sa ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(n.label, pl - 12, 11.5)) + '</text>';
        const x = pl + r * cs + cs / 2; s += '<text transform="translate(' + f1(x + 4) + ' ' + (top - 8) + ') rotate(-55)" font-size="11.5" font-weight="' + (a === sb ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(n.label, top * 1.15, 11.5)) + '</text>';
        ord.forEach((b, c) => {
          const v = this.m[a][b], x0 = pl + c * cs, on = this.sel === a + ':' + b, cross = this.sel && (a === sa || b === sb);
          s += '<g data-k="' + a + ':' + b + '" tabindex="' + (r === 0 && c === 0 ? 0 : -1) + '" role="gridcell" aria-label="' + esc((d.directed ? n.label + ' to ' + this.nodes[b].label : n.label + ' and ' + this.nodes[b].label) + ': ' + fmt(v, F)) + '"><rect x="' + f1(x0 + 1) + '" y="' + f1(y + 1) + '" width="' + f1(cs - 2) + '" height="' + f1(cs - 2) + '" rx="3" fill="' + (a === b && !v ? T.line : T.accent) + '" fill-opacity="' + (v ? f1(0.12 + 0.88 * (v / max)) : a === b ? 0.5 : 0.04) + '" stroke="' + (on ? T.fg : cross ? T.accent : 'none') + '" stroke-width="' + (on ? 2.5 : 1) + '"/>' +
            (v && cs >= 26 ? '<text x="' + f1(x0 + cs / 2) + '" y="' + f1(y + cs / 2 + 4) + '" text-anchor="middle" font-size="' + (cs >= 36 ? 11 : 9.5) + '" font-weight="700" fill="' + (v / max > 0.5 ? '#fff' : T.fg) + '" pointer-events="none">' + esc(fmt(v, { decimals: 0 })) + '</text>' : '') + '</g>';
        });
      });
      if (d.rowsLabel) s += '<text x="4" y="' + (top - 8) + '" font-size="10.5" fill="' + T.muted + '">' + esc(d.rowsLabel) + ' ↓</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + f1(H)); this.$svg.style.height = f1(H) + 'px';
      this.$svg.setAttribute('aria-label', (d.directed ? 'From each row to each column' : 'Links between each pair') + ', ' + N + ' by ' + N + '. Use the arrow keys to move between cells.');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = this._seg('Sort', 'sort', [['data', 'As listed'], ['total', 'Most linked'], ['name', 'A–Z']], this.sort);
      if (this.sel) { const v = this.m[sa][sb], back = this.m[sb][sa], A = this.nodes[sa], B = this.nodes[sb]; this.$note.innerHTML = '<b>' + esc(A.label) + (d.directed ? ' → ' : ' and ') + esc(B.label) + '</b>: ' + fmt(v, F) + (d.directed && sa !== sb ? '; the other way, ' + fmt(back, F) : '') + '. That is ' + pct(v / (A.out || 1)) + ' of all ' + (d.directed ? 'from ' : 'for ') + esc(A.label) + '.'; }
      else { let best = [0, 0, -1]; for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) if ((d.directed || b > a) && a !== b && this.m[a][b] > best[2]) best = [a, b, this.m[a][b]]; const quiet = this.nodes.reduce((x, y) => (y.out + y.inn < x.out + x.inn ? y : x)); this.$note.innerHTML = 'Strongest: <b>' + esc(this.nodes[best[0]].label) + (d.directed ? ' → ' : ' and ') + esc(this.nodes[best[1]].label) + '</b> (' + fmt(best[2], F) + '). Least linked: ' + esc(quiet.label) + '. Darker cells mean more' + (d.directed ? '; read from the row to the column' : '') + '. Tap a cell.'; }
    }
  }

  /* ======================================================================================
   * Lifespans: bars on a time line; who overlapped
   * data = { groups?:[{id,label}], items:[{id,label,start,end?,group?,note?}], unit?:'year', now? }  options: { at: null }
   * ====================================================================================== */
  class Lifespans extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { at: null });
      const now = +data.now || new Date().getFullYear();
      this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g)); this.items = data.items.map((it, i) => Object.assign({ i }, it, { start: +it.start, end: it.end == null ? now : +it.end, open: it.end == null })).sort((a, b) => a.start - b.start || a.i - b.i);
      this.lo = Math.min(...this.items.map(x => x.start)); this.hi = Math.max(...this.items.map(x => x.end)); this.at = this.o.at; this.sel = null; this.hide = new Set();
      el.innerHTML = '<label class="dx-range"><span>Year: <output></output></span><input type="range" min="' + this.lo + '" max="' + this.hi + '" step="1" value="' + (this.at || this.lo) + '"></label><svg role="group"></svg><div class="dx-legend"></div><p class="dx-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dx-legend'); this.$note = el.querySelector('.dx-note');
      this.$in.addEventListener('input', () => { this.at = +this.$in.value; this.sel = null; this.render(); this._emit('year', { year: this.at, alive: this._alive(this.at).map(x => x.id) }); });
      this.$leg.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; const g = b.dataset.g; this.hide.has(g) ? this.hide.delete(g) : this.hide.add(g); this.render(); this._emit('filter', { hidden: [...this.hide] }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const it = this.items.find(x => x.i === this.sel); this._emit('select', { id: it.id, overlaps: this._over(it).map(x => x.id) }); } });
      this.render();
    }
    _vis() { return this.items.filter(x => !this.hide.has(x.group)); }
    _alive(y) { return this._vis().filter(x => x.start <= y && x.end >= y); }
    _over(it) { return this._vis().filter(x => x !== it && x.start <= it.end && x.end >= it.start); }
    _gc(it) { const g = this.groups.find(x => x.id === it.group); return g ? colorFor(this.el, g, g.i) : themeOf(this.el).accent; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, V = this._vis(), rowH = 26, pt = 8, pb = 26, H = pt + V.length * rowH + pb, pl = 6, pr = 6;
      const span = this.hi - this.lo, lo = this.lo - span * 0.01, hi = this.hi + span * 0.01, sx = y => pl + ((y - lo) / (hi - lo)) * (W - pl - pr), sel = this.sel != null ? this.items.find(x => x.i === this.sel) : null;
      const st = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find(s => span / s <= (narrow ? 5 : 10)) || 1000;
      let s = '';
      for (let y = Math.ceil(lo / st) * st; y <= hi; y += st) s += '<line x1="' + f1(sx(y)) + '" y1="' + pt + '" x2="' + f1(sx(y)) + '" y2="' + (H - pb) + '" stroke="' + T.line + '"/><text x="' + f1(clamp(sx(y), 16, W - 16)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + y + '</text>';
      V.forEach((it, r) => {
        const y = pt + r * rowH, x0 = sx(it.start), x1 = sx(it.end), on = sel === it, alive = this.at != null && it.start <= this.at && it.end >= this.at, overlap = sel && !on && it.start <= sel.end && it.end >= sel.start, dim = (sel && !on && !overlap) || (this.at != null && !sel && !alive), c = this._gc(it);
        const lab = it.label + ' ' + it.start + '–' + (it.open ? '' : it.end), tw = lab.length * 6.3, inside = x1 - x0 > tw + 10, left = !inside && x0 - tw - 8 > 0;
        s += '<g data-k="' + it.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(it.label + ', ' + it.start + ' to ' + (it.open ? 'now' : it.end)) + '" opacity="' + (dim ? 0.3 : 1) + '"><rect x="' + f1(x0) + '" y="' + (y + 3) + '" width="' + f1(Math.max(3, x1 - x0)) + '" height="' + (rowH - 6) + '" rx="5" fill="' + c + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2.5"' : '') + '/>' + (it.open ? '<path d="M' + f1(x1 - 1) + ' ' + (y + 3) + ' l8 ' + ((rowH - 6) / 2) + ' l-8 ' + ((rowH - 6) / 2) + 'Z" fill="' + c + '"/>' : '') +
          '<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          '<text x="' + f1(inside ? x0 + 7 : left ? x0 - 6 : x1 + 6) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="' + (left ? 'end' : 'start') + '" font-size="11.5" font-weight="' + (on ? 800 : 600) + '" fill="' + (inside ? '#fff' : T.fg) + '" pointer-events="none">' + esc(it.label) + ' <tspan font-weight="500" font-size="10.5" ' + (inside ? 'fill-opacity=".85"' : 'fill="' + T.muted + '"') + '>' + it.start + '–' + (it.open ? '' : it.end) + '</tspan></text></g>';
      });
      if (this.at != null) s += '<line x1="' + f1(sx(this.at)) + '" y1="' + (pt - 4) + '" x2="' + f1(sx(this.at)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '" stroke-width="2" pointer-events="none"/>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', V.length + ' spans from ' + this.lo + ' to ' + this.hi);
      this._keep(this.$svg, s);
      this.$out.textContent = this.at != null ? this.at : 'slide to choose';
      this.$leg.innerHTML = this.groups.map(g => '<button type="button" class="dx-btn" data-g="' + esc(g.id) + '" aria-pressed="' + !this.hide.has(g.id) + '" style="padding:4px 10px;font-size:12.5px"><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</button>').join('');
      const word = this.data.verb || 'lived';
      if (sel) { const o = this._over(sel); this.$note.innerHTML = '<b>' + esc(sel.label) + '</b>, ' + sel.start + '–' + (sel.open ? 'now' : sel.end) + ' (' + (sel.end - sel.start) + ' years). Overlapped with <b>' + o.length + '</b>' + (o.length ? ': ' + o.map(x => esc(x.label)).join(', ') : '') + '.' + (sel.note ? ' ' + esc(sel.note) : ''); }
      else if (this.at != null) { const a = this._alive(this.at); this.$note.innerHTML = 'In <b>' + this.at + '</b>: ' + (a.length ? a.length + ' at once — ' + a.map(x => esc(x.label) + ' (' + (this.at - x.start) + ')').join(', ') : 'none of these') + '.'; }
      else { const L = V.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a)); let best = [0, this.lo]; for (let y = this.lo; y <= this.hi; y++) { const n = this._alive(y).length; if (n > best[0]) best = [n, y]; } this.$note.innerHTML = '<b>' + V.length + '</b> spans from ' + this.lo + ' to ' + this.hi + '. Longest: <b>' + esc(L.label) + '</b> (' + (L.end - L.start) + ' years). Most at once: <b>' + best[0] + '</b>, first in ' + best[1] + '. Slide to a year, or tap a bar to see who ' + esc(word) + ' at the same time.'; }
    }
  }

  return { Sunburst, Circlepack, Icicle, Arcflow, Linkmatrix, Lifespans, tree };
});
