/*! Chartbook 1.0 · Dimau Infographics
 *  Six classic chart forms, each made explorable:
 *    Stackbar     100% stacked bars: what each group is made of; switch to numbers, focus one part.
 *    Featuregrid  a comparison table of options and features; show only the differences, pick a favourite.
 *    Ringflow     a chord diagram: flows between groups around a ring; tap a group to follow its flows.
 *    Bumpline     rankings over time as crossing lines; tap one to follow its climb or fall.
 *    Spiral       months wound into a spiral, one turn a year, so the same season lines up year after year.
 *    Streamgraph  layered amounts over time as a flowing stream (or stacked from zero).
 *
 *  new Stackbar(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Stackbar', 'Featuregrid', 'Ringflow', 'Bumpline', 'Spiral', 'Streamgraph'].forEach(function (k) { root[k] = m[k]; }); root.DimauChartbook = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#7a6bd1', '#c2563a', '#5a7d2a'];
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : (Math.abs(n) < 10 ? 1 : 0) }) + (o.suffix || '') : '–'; };
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10 < 4 ? n % 10 : 0]);
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
  /** Smooth path through points (Catmull-Rom to cubic Bézier). */
  function smooth(pts) {
    if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ');
    let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ' C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
    }
    return d;
  }

  const STYLE = `
.dv{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dv) button{font:inherit;color:inherit}
.dv :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dv svg{display:block;width:100%}
.dv svg [data-k]{cursor:pointer}
.dv svg [data-k]:focus{outline:none}
.dv svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dv-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dv-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.dv-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dv-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dv-legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.dv-legend button{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:999px;padding:4px 10px;font-size:12.5px;cursor:pointer}
.dv-legend button[aria-pressed="true"]{border-color:var(--di-fg,#13263a);font-weight:700}
.dv-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.fg-wrap{overflow-x:auto;border:1px solid var(--di-line,#c9dce8);border-radius:12px;background:var(--di-surface,#fff)}
.fg-t{border-collapse:collapse;width:100%;font-size:14px}
.fg-t th,.fg-t td{padding:9px 12px;border-bottom:1px solid var(--di-line,#c9dce8);text-align:center;vertical-align:middle}
.fg-t tbody th{text-align:left;font-weight:600;min-width:180px}
.fg-t thead th{position:sticky;top:0;background:var(--di-surface,#fff);z-index:1}
.fg-t thead button{border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);border-radius:9px;padding:6px 10px;font-weight:800;font-size:13.5px;cursor:pointer}
.fg-t thead button[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.fg-t .grp th{background:var(--di-bg,#eef7fb);font:700 11.5px/1.2 var(--di-mono,ui-monospace,monospace);letter-spacing:.05em;text-transform:uppercase;color:var(--di-muted,#4f6578)}
.fg-t td.pick{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 9%,transparent)}
.fg-y{color:#137a66;font-weight:800}.fg-n{color:var(--di-muted,#4f6578)}.fg-p{color:#a76b12;font-weight:700}
.fg-t td small{display:block;font-size:11.5px;color:var(--di-muted,#4f6578);font-weight:500}
.fg-t tr.same{opacity:.55}
`;
  function injectStyle() {
    if (document.getElementById('dv-style')) return;
    const s = document.createElement('style'); s.id = 'dv-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dv');
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
      c.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k); } });
    }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dv'); }
  }

  /* ======================================================================================
   * Stackbar: 100% stacked bars; switch to numbers; focus one part and sort by it
   * data = { groups:[{id,label}], parts:[{id,label,color?}], values:{ groupId:{ partId:number } }, unit?, prefix?, suffix? }
   * options: { mode: 'share' | 'count' }
   * ====================================================================================== */
  class Stackbar extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: 'share' });
      this.parts = data.parts.map((p, i) => Object.assign({ i }, p)); this.groups = data.groups.map((g, i) => Object.assign({ i }, g));
      this.mode = this.o.mode; this.focus = null; this.sel = null;
      el.innerHTML = '<div class="dv-bar" role="group" aria-label="Show as"><button type="button" class="dv-btn" data-m="share">Share (%)</button><button type="button" class="dv-btn" data-m="count">Numbers</button></div><svg role="img"></svg><div class="dv-legend" role="group" aria-label="Focus on one part"></div><p class="dv-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dv-legend'); this.$note = el.querySelector('.dv-note');
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { this.mode = b.dataset.m; this.render(); this._emit('mode', { mode: this.mode }); });
      this.$leg.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { this.focus = this.focus === b.dataset.p ? null : b.dataset.p; this.sel = null; this.render(); this._emit('focus', { part: this.focus }); } });
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) { const [g, p] = k.split('|'); this._emit('select', { group: g, part: p, value: this._v(g, p) }); } });
      this.render();
    }
    _v(g, p) { return +((this.data.values[g] || {})[p]) || 0; }
    _tot(g) { return this.parts.reduce((s, p) => s + this._v(g, p.id), 0); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, lab = 18, bh = narrow ? 24 : 28, gap = 12, rowH = lab + bh + gap;
      let gs = this.groups.slice(); if (this.focus) gs.sort((a, b) => this._v(b.id, this.focus) / (this._tot(b.id) || 1) - this._v(a.id, this.focus) / (this._tot(a.id) || 1));
      const maxTot = Math.max(...this.groups.map(g => this._tot(g.id))) || 1, valW = this.mode === 'count' ? 44 : 0;
      let s = '';
      gs.forEach((g, r) => {
        const y = r * rowH + lab, tot = this._tot(g.id), full = this.mode === 'share' ? W : ((W - valW) * tot) / maxTot;
        s += '<text x="0" y="' + (y - 5) + '" font-size="13" font-weight="700" fill="' + T.fg + '">' + esc(g.label) + '</text>';
        let x = 0;
        this.parts.forEach(p => {
          const v = this._v(g.id, p.id); if (!v) return; const w = (full * v) / (tot || 1), k = g.id + '|' + p.id, on = this.sel === k, dim = (this.focus && this.focus !== p.id) || (this.sel && !on);
          s += '<g data-k="' + esc(k) + '" tabindex="0" role="button" aria-label="' + esc(g.label + ', ' + p.label + ': ' + fmtNum(v, d) + ', ' + pct(v, tot) + '%') + '"><rect x="' + f1(x) + '" y="' + y + '" width="' + f1(Math.max(1, w - 1)) + '" height="' + bh + '" fill="' + colorFor(this.el, p, p.i) + '" opacity="' + (dim ? 0.28 : 1) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/>' +
            (w > 34 ? '<text x="' + f1(x + w / 2) + '" y="' + f1(y + bh / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff" pointer-events="none">' + (this.mode === 'share' ? pct(v, tot) + '%' : esc(fmtNum(v))) + '</text>' : '') + '</g>';
          x += w;
        });
        if (this.mode === 'count') s += '<text x="' + f1(x + 6) + '" y="' + f1(y + bh / 2 + 4) + '" font-size="11.5" font-weight="700" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(tot, d)) + '</text>';
      });
      const H = gs.length * rowH - gap + 4;
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', gs.map(g => g.label + ': ' + this.parts.map(p => p.label + ' ' + pct(this._v(g.id, p.id), this._tot(g.id)) + '%').join(', ')).join('. '));
      this._keep(this.$svg, s);
      this.el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === this.mode)));
      this.$leg.innerHTML = this.parts.map(p => '<button type="button" data-p="' + esc(p.id) + '" aria-pressed="' + (this.focus === p.id) + '"><i style="background:' + esc(colorFor(this.el, p, p.i)) + '"></i>' + esc(p.label) + '</button>').join('');
      if (this.sel) { const [gid, pid] = this.sel.split('|'), g = this.groups.find(x => x.id === gid), p = this.parts.find(x => x.id === pid), v = this._v(gid, pid); this.$note.innerHTML = '<b>' + esc(g.label) + '</b>: ' + esc(p.label) + ' is ' + esc(fmtNum(v, d)) + ' of ' + esc(fmtNum(this._tot(gid), d)) + ' (' + pct(v, this._tot(gid)) + '%).'; }
      else if (this.focus) { const p = this.parts.find(x => x.id === this.focus), top = gs[0]; this.$note.innerHTML = 'Sorted by <b>' + esc(p.label) + '</b>. The biggest share is in <b>' + esc(top.label) + '</b> (' + pct(this._v(top.id, p.id), this._tot(top.id)) + '%). Tap the part again to clear.'; }
      else this.$note.innerHTML = 'Each bar shows what one group is made of. Tap a part in the key to sort by it, or a piece of a bar for its numbers.';
    }
  }

  /* ======================================================================================
   * Featuregrid: options against features; show only the differences, pick a favourite
   * data = { options:[{id,label,note?}], features:[{id,label,group?,note?,values:{optId: true|false|'partial'|string}}] }
   * ====================================================================================== */
  class Featuregrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.opt = data.options; this.only = false; this.pick = null;
      el.innerHTML = '<div class="dv-bar"><button type="button" class="dv-btn" data-diff aria-pressed="false">Show only the differences</button></div><div class="fg-wrap"><table class="fg-t"><thead></thead><tbody></tbody></table></div><p class="dv-note" aria-live="polite"></p>';
      this.$t = el.querySelector('table'); this.$note = el.querySelector('.dv-note');
      el.querySelector('[data-diff]').onclick = () => { this.only = !this.only; this.render(); this._emit('filter', { onlyDifferences: this.only }); };
      this.$t.addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (b) { this.pick = this.pick === b.dataset.o ? null : b.dataset.o; this.render(); this.$t.querySelector('[data-o="' + CSS.escape(b.dataset.o) + '"]').focus(); this._emit('pick', { option: this.pick }); } });
      this.render();
    }
    _cell(v) { return v === true ? '<span class="fg-y" aria-label="Yes">✓ Yes</span>' : v === false || v == null ? '<span class="fg-n" aria-label="No">✗ No</span>' : v === 'partial' ? '<span class="fg-p">◐ Partly</span>' : '<span>' + esc(v) + '</span>'; }
    _score(o) { return this.data.features.reduce((s, f) => s + (f.values[o] === true ? 1 : f.values[o] === 'partial' ? 0.5 : typeof f.values[o] === 'string' ? 1 : 0), 0); }
    render() {
      const fs = this.data.features, same = f => { const vs = this.opt.map(o => JSON.stringify(f.values[o.id] == null ? false : f.values[o.id])); return vs.every(v => v === vs[0]); };
      this.$t.querySelector('thead').innerHTML = '<tr><th scope="col"><span style="font-size:12px;font-weight:500;color:var(--di-muted,#4f6578)">Tap an option to pick it</span></th>' + this.opt.map(o => '<th scope="col"><button type="button" data-o="' + esc(o.id) + '" aria-pressed="' + (this.pick === o.id) + '">' + esc(o.label) + '</button>' + (o.note ? '<br><small style="font-weight:500;color:var(--di-muted,#4f6578)">' + esc(o.note) + '</small>' : '') + '</th>').join('') + '</tr>';
      let lastG = null, rows = '';
      fs.forEach(f => {
        if (this.only && same(f)) return;
        if (f.group && f.group !== lastG) { rows += '<tr class="grp"><th colspan="' + (this.opt.length + 1) + '" scope="colgroup">' + esc(f.group) + '</th></tr>'; lastG = f.group; }
        rows += '<tr' + (!this.only && same(f) ? ' class="same"' : '') + '><th scope="row">' + esc(f.label) + (f.note ? '<br><small style="font-weight:500;color:var(--di-muted,#4f6578)">' + esc(f.note) + '</small>' : '') + '</th>' + this.opt.map(o => '<td' + (this.pick === o.id ? ' class="pick"' : '') + '>' + this._cell(f.values[o.id]) + '</td>').join('') + '</tr>';
      });
      this.$t.querySelector('tbody').innerHTML = rows;
      this.el.querySelector('[data-diff]').setAttribute('aria-pressed', String(this.only));
      const diffs = fs.filter(f => !same(f)).length;
      if (this.pick) {
        const o = this.opt.find(x => x.id === this.pick), yes = fs.filter(f => f.values[o.id] === true || (typeof f.values[o.id] === 'string' && f.values[o.id] !== 'partial')).length, part = fs.filter(f => f.values[o.id] === 'partial').length, missing = fs.filter(f => !f.values[o.id]);
        this.$note.innerHTML = '<b>' + esc(o.label) + '</b> has ' + yes + ' of ' + fs.length + (part ? ', and ' + part + ' partly' : '') + '.' + (missing.length ? ' It does not have: ' + missing.map(f => esc(f.label.toLowerCase())).join(', ') + '.' : '');
      } else this.$note.innerHTML = '<b>' + diffs + ' of ' + fs.length + '</b> features differ between the options; the rest are the same for all (shown faded). Tap an option to pick it.';
    }
  }

  /* ======================================================================================
   * Ringflow: a chord diagram of flows between groups
   * data = { groups:[{id,label,color?}], flows:[{from,to,value}], unit? }
   * ====================================================================================== */
  class Ringflow extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.groups = data.groups.map((g, i) => Object.assign({ i }, g)); this.sel = null;
      el.innerHTML = '<svg role="img"></svg><div class="dv-legend" role="group" aria-label="Groups"></div><p class="dv-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dv-legend'); this.$note = el.querySelector('.dv-note');
      const pick = k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { group: this.sel }); };
      this._hot(this.$svg, pick); this.$leg.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) pick(b.dataset.g); });
      this.render();
    }
    _out(id) { return this.data.flows.filter(f => f.from === id).reduce((s, f) => s + +f.value, 0); }
    _in(id) { return this.data.flows.filter(f => f.to === id).reduce((s, f) => s + +f.value, 0); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 600), narrow = W < 520, S0 = Math.min(W, 520), R = S0 * (narrow ? 0.4 : 0.36), R2 = R + 12, S = Math.round(2 * R2 + (narrow ? 16 : 56)), cx = W / 2, cy = S / 2;
      const tot = this.groups.reduce((s, g) => s + this._out(g.id) + this._in(g.id), 0) || 1, pad = 0.04, avail = TAU - pad * this.groups.length;
      const P = (a, r) => [cx + Math.cos(a - Math.PI / 2) * r, cy + Math.sin(a - Math.PI / 2) * r];
      let a = 0; const span = {};
      this.groups.forEach(g => { const len = ((this._out(g.id) + this._in(g.id)) / tot) * avail; span[g.id] = { a0: a, a1: a + len, outAt: a, inAt: a + (this._out(g.id) / tot) * avail }; a += len + pad; });
      const unit = avail / tot; let rib = '', arcs = '';
      d.flows.forEach(f => {
        const sg = span[f.from], tg = span[f.to]; if (!sg || !tg) return; const w = +f.value * unit;
        const s0 = sg.outAt, s1 = s0 + w; sg.outAt = s1; const t0 = tg.inAt, t1 = t0 + w; tg.inAt = t1;
        const g = this.groups.find(x => x.id === f.from), on = !this.sel || this.sel === f.from || this.sel === f.to;
        const [x0, y0] = P(s0, R), [x1, y1] = P(s1, R), [x2, y2] = P(t0, R), [x3, y3] = P(t1, R);
        rib += '<path d="M' + f1(x0) + ' ' + f1(y0) + ' A' + R + ' ' + R + ' 0 ' + (w > Math.PI ? 1 : 0) + ' 1 ' + f1(x1) + ' ' + f1(y1) + ' Q' + cx + ' ' + cy + ' ' + f1(x2) + ' ' + f1(y2) + ' A' + R + ' ' + R + ' 0 ' + (w > Math.PI ? 1 : 0) + ' 1 ' + f1(x3) + ' ' + f1(y3) + ' Q' + cx + ' ' + cy + ' ' + f1(x0) + ' ' + f1(y0) + 'Z" fill="' + colorFor(this.el, g, g.i) + '" opacity="' + (on ? (this.sel ? 0.75 : 0.5) : 0.07) + '"><title>' + esc(g.label + ' → ' + this.groups.find(x => x.id === f.to).label + ': ' + fmtNum(+f.value)) + '</title></path>';
      });
      this.groups.forEach(g => {
        const sp = span[g.id], c = colorFor(this.el, g, g.i), [ax, ay] = P(sp.a0, R2), [bx, by] = P(sp.a1, R2), [cx2, cy2] = P(sp.a1, R + 2), [dx, dy] = P(sp.a0, R + 2), lg = sp.a1 - sp.a0 > Math.PI ? 1 : 0, mid = (sp.a0 + sp.a1) / 2, [lx, ly] = P(mid, R2 + 12), on = this.sel === g.id;
        const anchor = Math.abs(Math.sin(mid)) < 0.3 ? 'middle' : Math.sin(mid) > 0 ? 'start' : 'end';
        arcs += '<g data-k="' + esc(g.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(g.label + ': ' + fmtNum(this._out(g.id)) + ' out, ' + fmtNum(this._in(g.id)) + ' in') + '"><path d="M' + f1(ax) + ' ' + f1(ay) + ' A' + R2 + ' ' + R2 + ' 0 ' + lg + ' 1 ' + f1(bx) + ' ' + f1(by) + ' L' + f1(cx2) + ' ' + f1(cy2) + ' A' + (R + 2) + ' ' + (R + 2) + ' 0 ' + lg + ' 0 ' + f1(dx) + ' ' + f1(dy) + 'Z" fill="' + c + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/>' +
          (narrow ? '' : '<text x="' + f1(lx) + '" y="' + f1(ly + 4) + '" text-anchor="' + anchor + '" font-size="12" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(g.label, 120, 12)) + '</text>') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + S); this.$svg.style.height = S + 'px';
      this.$svg.setAttribute('aria-label', 'Flows between ' + this.groups.map(g => g.label).join(', '));
      this._keep(this.$svg, rib + arcs);
      this.$leg.innerHTML = this.groups.map(g => '<button type="button" data-g="' + esc(g.id) + '" aria-pressed="' + (this.sel === g.id) + '"><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</button>').join('');
      const u = d.unit ? ' ' + d.unit : '';
      if (this.sel) {
        const g = this.groups.find(x => x.id === this.sel), out = d.flows.filter(f => f.from === g.id).sort((a2, b) => b.value - a2.value), inn = d.flows.filter(f => f.to === g.id).sort((a2, b) => b.value - a2.value), nm = id => this.groups.find(x => x.id === id).label;
        this.$note.innerHTML = '<b>' + esc(g.label) + '</b>: ' + esc(fmtNum(this._out(g.id)) + u) + ' out' + (out[0] ? ', most to ' + esc(nm(out[0].to)) + ' (' + pct(out[0].value, this._out(g.id)) + '%)' : '') + '; ' + esc(fmtNum(this._in(g.id)) + u) + ' in' + (inn[0] ? ', most from ' + esc(nm(inn[0].from)) + ' (' + pct(inn[0].value, this._in(g.id)) + '%)' : '') + '.';
      } else {
        const big = d.flows.slice().sort((a2, b) => b.value - a2.value)[0], nm = id => this.groups.find(x => x.id === id).label;
        this.$note.innerHTML = 'Each band is a flow; its width is the amount. The biggest: <b>' + esc(nm(big.from)) + ' → ' + esc(nm(big.to)) + '</b> (' + esc(fmtNum(+big.value) + u) + '). Tap a group to follow its flows.';
      }
    }
  }

  /* ======================================================================================
   * Bumpline: rankings over time as crossing lines
   * data = { periods:[labels], items:[{id,label,values:[…]}], higherIsBetter?: true }
   * ====================================================================================== */
  class Bumpline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.items = data.items.map((t, i) => Object.assign({ i }, t)); this.sel = null;
      const hb = data.higherIsBetter !== false, n = data.periods.length;
      this.ranks = this.items.map(() => []);
      for (let p = 0; p < n; p++) { const order = this.items.slice().sort((a, b) => hb ? (+b.values[p] - +a.values[p]) : (+a.values[p] - +b.values[p])); order.forEach((t, r) => { this.ranks[t.i][p] = r + 1; }); }
      el.innerHTML = '<svg role="img"></svg><p class="dv-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dv-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items[this.sel].id, ranks: this.ranks[this.sel].slice() }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, n = d.periods.length, m = this.items.length;
      const L = narrow ? 30 : 130, R = narrow ? 92 : 140, top = 24, rowH = narrow ? 30 : 34, H = top + m * rowH;
      const sx = p => L + (p / (n - 1)) * (W - L - R), sy = r => top + (r - 0.5) * rowH;
      let s = d.periods.map((p, i) => '<text x="' + f1(sx(i)) + '" y="12" text-anchor="middle" font-size="11" font-weight="700" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(narrow && n > 6 && i % 2 ? '' : p) + '</text>').join('');
      const order = this.items.slice().sort((a, b) => (a.i === this.sel) - (b.i === this.sel));
      order.forEach(t => {
        const rk = this.ranks[t.i], c = colorFor(this.el, t, t.i), on = this.sel === t.i, dim = this.sel != null && !on, pts = rk.map((r, p) => [sx(p), sy(r)]);
        s += '<g data-k="' + t.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(t.label + ': ' + rk.map((r, p) => d.periods[p] + ' ' + ord(r)).join(', ')) + '" opacity="' + (dim ? 0.18 : 1) + '">' +
          '<path d="' + smooth(pts) + '" fill="none" stroke="' + c + '" stroke-width="' + (on ? 5 : 3) + '" stroke-linecap="round"/><path d="' + smooth(pts) + '" fill="none" stroke="transparent" stroke-width="14"/>' +
          pts.map((p, i) => '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (on ? 9 : 5) + '" fill="' + c + '" stroke="' + T.surface + '" stroke-width="1.5"/>' + (on ? '<text x="' + f1(p[0]) + '" y="' + f1(p[1] + 3.5) + '" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff" pointer-events="none">' + rk[i] + '</text>' : '')).join('') +
          (narrow ? '<text x="' + (L - 8) + '" y="' + f1(sy(rk[0]) + 4) + '" text-anchor="end" font-size="11" font-weight="700" fill="' + T.muted + '">' + rk[0] + '</text>' : '<text x="' + (L - 10) + '" y="' + f1(sy(rk[0]) + 4) + '" text-anchor="end" font-size="12" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(t.label, L - 14, 12)) + '</text>') +
          '<text x="' + f1(W - R + 10) + '" y="' + f1(sy(rk[n - 1]) + 4) + '" font-size="12" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(t.label, R - 14, 12)) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Rankings from ' + d.periods[0] + ' to ' + d.periods[n - 1]);
      this._keep(this.$svg, s);
      if (this.sel != null) {
        const t = this.items[this.sel], rk = this.ranks[t.i], best = Math.min(...rk), bi = rk.indexOf(best), ch = rk[0] - rk[n - 1];
        this.$note.innerHTML = '<b>' + esc(t.label) + '</b> went from ' + ord(rk[0]) + ' in ' + esc(d.periods[0]) + ' to <b>' + ord(rk[n - 1]) + '</b> in ' + esc(d.periods[n - 1]) + (ch ? ' (' + (ch > 0 ? 'up ' : 'down ') + Math.abs(ch) + ' place' + (Math.abs(ch) === 1 ? '' : 's') + ')' : ' (no change)') + '. Best: ' + ord(best) + ' in ' + esc(d.periods[bi]) + '.';
      } else {
        const moves = this.items.map(t => ({ t, ch: this.ranks[t.i][0] - this.ranks[t.i][n - 1] })).sort((a, b) => b.ch - a.ch), top = this.items.find(t => this.ranks[t.i][n - 1] === 1);
        this.$note.innerHTML = 'Top in ' + esc(d.periods[n - 1]) + ': <b>' + esc(top.label) + '</b>. Biggest climber: <b>' + esc(moves[0].t.label) + '</b> (up ' + moves[0].ch + '); biggest drop: <b>' + esc(moves[moves.length - 1].t.label) + '</b> (down ' + Math.abs(moves[moves.length - 1].ch) + '). Tap a line to follow it.';
      }
    }
  }

  /* ======================================================================================
   * Spiral: months wound into a spiral, one turn a year
   * data = { start:'YYYY-MM', values:[monthly numbers], label?, unit?, prefix?, suffix? }
   * ====================================================================================== */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  class Spiral extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.y0 = +data.start.slice(0, 4); this.m0 = +data.start.slice(5, 7) - 1; this.sel = null; this.month = null;
      el.innerHTML = '<svg role="img"></svg><div class="dv-legend" role="group" aria-label="Compare one month across the years"></div><p class="dv-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dv-legend'); this.$note = el.querySelector('.dv-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.month = null; this.render(); if (this.sel != null) this._emit('select', this._at(this.sel)); });
      this.$leg.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { this.month = this.month === +b.dataset.m ? null : +b.dataset.m; this.sel = null; this.render(); this._emit('month', { month: this.month }); } });
      this.render();
    }
    _at(i) { const m = (this.m0 + i) % 12, y = this.y0 + Math.floor((this.m0 + i) / 12); return { year: y, month: MON[m], m, value: +this.data.values[i] }; }
    render() {
      const T = themeOf(this.el), d = this.data, vals = d.values.map(Number), W = Math.max(280, this.$svg.clientWidth || 600), S = Math.min(W, 520), cx = W / 2, cy = S / 2, years = Math.ceil((this.m0 + vals.length) / 12);
      const r0 = S * 0.12, step = (S * 0.36 - r0) / Math.max(1, years), max = Math.max(...vals) || 1, min = Math.min(...vals);
      const ang = k => (k / 12) * TAU - Math.PI / 2, rad = k => r0 + (k / 12) * step;
      let s = '';
      for (let m = 0; m < 12; m++) { const a = ang(m + 0.5), [x, y] = [cx + Math.cos(a) * (S * 0.36 + 18), cy + Math.sin(a) * (S * 0.36 + 18)]; s += '<text x="' + f1(x) + '" y="' + f1(y + 4) + '" text-anchor="middle" font-size="11" font-weight="' + (this.month === m ? 800 : 600) + '" fill="' + (this.month === m ? T.fg : T.muted) + '" font-family="' + esc(T.mono) + '">' + MON[m] + '</text>'; }
      vals.forEach((v, i) => {
        const k = this.m0 + i, a0 = ang(k), a1 = ang(k + 1), rA = rad(k), rB = rad(k + 1), t = (v - min) / (max - min || 1), w = 3 + t * step * 0.62, at = this._at(i), on = this.sel === i, hl = this.month == null || this.month === at.m;
        const pts = []; for (let q = 0; q <= 6; q++) { const f = q / 6, aa = a0 + (a1 - a0) * f, rr = rA + (rB - rA) * f; pts.push([cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr]); }
        s += '<g data-k="' + i + '" tabindex="0" role="button" aria-label="' + esc(at.month + ' ' + at.year + ': ' + fmtNum(v, d)) + '"><path d="' + pts.map((p, q) => (q ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ') + '" fill="none" stroke="' + T.accent + '" stroke-opacity="' + f1((hl ? 0.25 + 0.75 * t : 0.08) * 100) / 100 + '" stroke-width="' + f1(w) + '" stroke-linecap="butt"' + '/>' +
          (on ? '<path d="' + pts.map((p, q) => (q ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ') + '" fill="none" stroke="' + T.fg + '" stroke-width="2"/>' : '') + '</g>';
        if (at.m === 0 || i === 0) { const [x, y] = [cx + Math.cos(a0) * rA, cy + Math.sin(a0) * rA]; s += '<text x="' + f1(x - 6) + '" y="' + f1(y + 3.5) + '" text-anchor="end" font-size="10" font-weight="700" fill="' + T.muted + '" pointer-events="none">' + at.year + '</text>'; }
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + S); this.$svg.style.height = S + 'px';
      this.$svg.setAttribute('aria-label', (d.label || 'Monthly values') + ' from ' + MON[this.m0] + ' ' + this.y0 + ', one turn of the spiral per year; thicker and darker means more');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = MON.map((m, i) => '<button type="button" data-m="' + i + '" aria-pressed="' + (this.month === i) + '">' + m + '</button>').join('');
      if (this.sel != null) { const at = this._at(this.sel), same = vals.map((v, i) => ({ v, at: this._at(i) })).filter(x => x.at.m === at.m), avg = same.reduce((a, x) => a + x.v, 0) / same.length; this.$note.innerHTML = '<b>' + at.month + ' ' + at.year + '</b>: ' + esc(fmtNum(at.value, d)) + '. The average ' + at.month + ' is ' + esc(fmtNum(avg, d)) + ', so this one was ' + (at.value >= avg ? 'above' : 'below') + ' it.'; }
      else if (this.month != null) { const same = vals.map((v, i) => ({ v, at: this._at(i) })).filter(x => x.at.m === this.month); this.$note.innerHTML = '<b>' + MON[this.month] + '</b> each year: ' + same.map(x => x.at.year + ' ' + esc(fmtNum(x.v, d))).join(', ') + '.'; }
      else { const by = MON.map((m, i) => { const xs = vals.filter((v, j) => this._at(j).m === i); return { m, avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 }; }), hi = by.slice().sort((a, b) => b.avg - a.avg)[0], lo = by.slice().sort((a, b) => a.avg - b.avg)[0]; this.$note.innerHTML = 'One turn is one year; thicker and darker means more. On average the highest month is <b>' + hi.m + '</b> and the lowest is <b>' + lo.m + '</b>. Tap a month name to compare it across the years.'; }
    }
  }

  /* ======================================================================================
   * Streamgraph: layered amounts over time, as a stream or stacked from zero
   * data = { periods:[labels], series:[{id,label,values:[…],color?}], unit? }  options: { mode:'stream'|'stack' }
   * ====================================================================================== */
  class Streamgraph extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: 'stream' });
      this.series = data.series.map((s, i) => Object.assign({ i }, s, { values: s.values.map(Number) })); this.mode = this.o.mode; this.sel = null;
      el.innerHTML = '<div class="dv-bar" role="group" aria-label="Shape"><button type="button" class="dv-btn" data-m="stream">Stream</button><button type="button" class="dv-btn" data-m="stack">Stacked from zero</button></div><svg role="img"></svg><div class="dv-legend" role="group" aria-label="Layers"></div><p class="dv-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dv-legend'); this.$note = el.querySelector('.dv-note');
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { this.mode = b.dataset.m; this.render(); this._emit('mode', { mode: this.mode }); });
      const pick = k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { id: this.sel }); };
      this._hot(this.$svg, pick); this.$leg.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) pick(b.dataset.s); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, n = d.periods.length, H = narrow ? 240 : 300, pb = 22, top = 8;
      const tot = d.periods.map((_, p) => this.series.reduce((s, se) => s + (se.values[p] || 0), 0)), maxT = Math.max(...tot) || 1;
      const sx = p => 6 + (p / (n - 1)) * (W - 12), k = (H - pb - top) / maxT, mid = top + (H - pb - top) / 2;
      const base = p => this.mode === 'stream' ? mid - (tot[p] * k) / 2 : H - pb - tot[p] * k;
      let acc = d.periods.map(() => 0), s = '';
      const layers = this.series.map(se => { const lo = d.periods.map((_, p) => [sx(p), base(p) + acc[p] * k]); acc = acc.map((a, p) => a + (se.values[p] || 0)); const hi = d.periods.map((_, p) => [sx(p), base(p) + acc[p] * k]); return { se, lo, hi }; });
      layers.forEach(L => {
        const c = colorFor(this.el, L.se, L.se.i), on = this.sel === L.se.id, dim = this.sel && !on;
        const path = smooth(L.hi) + ' L' + L.lo.slice().reverse().map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L').replace(/^/, '') + 'Z';
        s += '<g data-k="' + esc(L.se.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(L.se.label + ': ' + L.se.values.map((v, p) => d.periods[p] + ' ' + fmtNum(v)).join(', ')) + '"><path d="' + path + '" fill="' + c + '" opacity="' + (dim ? 0.2 : on ? 1 : 0.85) + '" stroke="' + T.surface + '" stroke-width="0.8"/></g>';
        const last = L.se.values[n - 1] || 0; if (!narrow && last * k > 14) { const y = (L.hi[n - 1][1] + L.lo[n - 1][1]) / 2; s += '<text x="' + (W - 10) + '" y="' + f1(y + 4) + '" text-anchor="end" font-size="11.5" font-weight="700" fill="#ffffff" pointer-events="none">' + esc(fitText(L.se.label, 120, 11.5)) + '</text>'; }
      });
      const every = Math.max(1, Math.ceil(n / (narrow ? 5 : 10)));
      d.periods.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += '<text x="' + f1(clamp(sx(i), 14, W - 14)) + '" y="' + (H - 6) + '" text-anchor="' + (i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle') + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(p) + '</text>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.series.length + ' layers over ' + n + ' periods; total ' + fmtNum(tot[0]) + ' at the start and ' + fmtNum(tot[n - 1]) + ' at the end');
      this._keep(this.$svg, s);
      this.el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === this.mode)));
      this.$leg.innerHTML = this.series.map(se => '<button type="button" data-s="' + esc(se.id) + '" aria-pressed="' + (this.sel === se.id) + '"><i style="background:' + esc(colorFor(this.el, se, se.i)) + '"></i>' + esc(se.label) + '</button>').join('');
      const u = d.unit ? ' ' + d.unit : '';
      if (this.sel) {
        const se = this.series.find(x => x.id === this.sel), v = se.values, peak = Math.max(...v), pi = v.indexOf(peak), first = v.findIndex(x => x > 0);
        this.$note.innerHTML = '<b>' + esc(se.label) + '</b>: ' + esc(fmtNum(v[n - 1]) + u) + ' in ' + esc(d.periods[n - 1]) + ' (' + pct(v[n - 1], tot[n - 1]) + '% of the total)' + (first > 0 ? ', first appearing in ' + esc(d.periods[first]) : '') + '. Peak ' + esc(fmtNum(peak) + u) + ' in ' + esc(d.periods[pi]) + '.';
      } else {
        const big = this.series.slice().sort((a, b) => (b.values[n - 1] || 0) - (a.values[n - 1] || 0))[0];
        this.$note.innerHTML = 'From <b>' + esc(fmtNum(tot[0]) + u) + '</b> in ' + esc(d.periods[0]) + ' to <b>' + esc(fmtNum(tot[n - 1]) + u) + '</b> in ' + esc(d.periods[n - 1]) + '. Biggest layer now: <b>' + esc(big.label) + '</b>. Tap a layer to follow it.';
      }
    }
  }

  return { Stackbar, Featuregrid, Ringflow, Bumpline, Spiral, Streamgraph, smooth };
});
