/*! Basics 1.0 · Dimau Infographics
 *  The everyday charts, done carefully: every one can be tapped for its numbers, read with the keyboard,
 *  and switched to a plain table.
 *    Donut       parts of a whole as a ring; tap a slice or a key, hide parts.
 *    Barchart    bars for one or more series, grouped or stacked, sortable; turns sideways when labels are long.
 *    Linechart   one or more lines over time; drag or use the arrow keys to read every line at one point.
 *    Areachart   amounts piled up over time, as totals or as shares of 100%.
 *    Combochart  bars and a line on two scales, for two measures of the same periods.
 *    Waffle      100 squares showing shares, so each square is one percent.
 *
 *  new Donut(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Donut', 'Barchart', 'Linechart', 'Areachart', 'Combochart', 'Waffle'].forEach(function (k) { root[k] = m[k]; }); root.DimauBasics = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#c2563a', '#6a7f2a'];
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmt = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 1 }) + (o.suffix || '') : '–'; };
  const fmtOf = o => ({ prefix: o.prefix, suffix: o.suffix != null ? o.suffix : o.unit ? ' ' + o.unit : '', decimals: o.decimals });
  const pct = n => Math.round(n * 100) + '%';
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }
  const labW = (vals, F) => 12 + Math.max(...vals.map(v => fmt(v, { prefix: F.prefix, decimals: F.decimals }).length)) * 6.3;

  const STYLE = `
.db{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.db) button{font:inherit;color:inherit}
.db :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.db svg{display:block;width:100%}
.db svg [data-k]{cursor:pointer}
.db svg [data-k]:focus{outline:none}
.db svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.db-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.db-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.db-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.db-keys{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.db-key{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:999px;padding:4px 10px;font-size:12.5px;font-weight:700;cursor:pointer}
.db-key i{width:10px;height:10px;border-radius:3px;display:inline-block}
.db-key[aria-pressed="false"]{opacity:.45;text-decoration:line-through}
.db-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.db-table{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:4px}
.db-table th,.db-table td{border-bottom:1px solid var(--di-line,#c9dce8);padding:6px 8px;text-align:right;white-space:nowrap}
.db-table th:first-child,.db-table td:first-child{text-align:left;white-space:normal}
.db-table thead th{font-size:12px;color:var(--di-muted,#4f6578)}
.db-twrap{overflow-x:auto}
`;
  function injectStyle() {
    if (document.getElementById('db-style')) return;
    const s = document.createElement('style'); s.id = 'db-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  /* Shared frame: optional mode buttons, a chart, keys that hide series, a table switch and a note. */
  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {}; this.table = false; this.hidden = new Set();
      el.classList.add('db');
      el.innerHTML = '<div class="db-bar"><span class="db-modes" style="display:contents"></span><button type="button" class="db-btn" data-table aria-pressed="false">Show as table</button></div><div class="db-view"><svg role="group"></svg></div><div class="db-keys"></div><p class="db-note" aria-live="polite"></p>';
      this.$modes = el.querySelector('.db-modes'); this.$view = el.querySelector('.db-view'); this.$keys = el.querySelector('.db-keys'); this.$note = el.querySelector('.db-note');
      el.querySelector('[data-table]').onclick = e => { this.table = !this.table; e.currentTarget.setAttribute('aria-pressed', String(this.table)); e.currentTarget.textContent = this.table ? 'Show as chart' : 'Show as table'; this.render(); this._emit('view', { table: this.table }); };
      this.$keys.addEventListener('click', e => { const b = e.target.closest('[data-key]'); if (!b) return; const id = b.dataset.key, vis = this._keysAll().filter(k => !this.hidden.has(k.id)); if (this.hidden.has(id)) this.hidden.delete(id); else if (vis.length > 1) this.hidden.add(id); this.sel = null; this.render(); this._emit('toggle', { hidden: [...this.hidden] }); });
      this.$modes.addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; this.mode = b.dataset.mode; this.sel = null; this.render(); this._emit('mode', { mode: this.mode }); });
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    get $svg() { return this.$view.querySelector('svg'); }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _hot(fn) {
      this.$view.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) fn(g.dataset.k); });
      this.$view.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k); } });
    }
    _svg(html, W, H, label) {
      let svg = this.$svg; if (!svg) { this.$view.innerHTML = '<svg role="group"></svg>'; svg = this.$svg; }
      const a = document.activeElement, k = a && svg.contains(a) && a.dataset ? a.dataset.k : null;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.style.height = H + 'px'; svg.setAttribute('aria-label', label); svg.innerHTML = html;
      if (k != null) { const g = svg.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); }
      return svg;
    }
    _table(head, rows) { this.$view.innerHTML = '<div class="db-twrap"><table class="db-table"><thead><tr>' + head.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map((c, i) => i ? '<td>' + esc(c) + '</td>' : '<th scope="row" style="text-align:left;font-weight:600">' + esc(c) + '</th>').join('') + '</tr>').join('') + '</tbody></table></div>'; }
    _keys(list) { this.$keys.innerHTML = list.length > 1 ? list.map(k => '<button type="button" class="db-key" data-key="' + esc(k.id) + '" aria-pressed="' + !this.hidden.has(k.id) + '"><i style="background:' + esc(k.c) + '"></i>' + esc(k.label) + '</button>').join('') : ''; }
    _modes(list) { this.$modes.innerHTML = list.map(([v, l]) => '<button type="button" class="db-btn" data-mode="' + v + '" aria-pressed="' + (this.mode === v) + '">' + esc(l) + '</button>').join(''); }
    /** Crosshair along x: drag or arrow keys. */
    _cross(n, set) {
      const svgOf = () => this.$svg;
      this.$view.addEventListener('pointerdown', e => { const s = svgOf(); if (s && s.contains(e.target)) this._px(e, n, set); });
      this.$view.addEventListener('pointermove', e => { const s = svgOf(); if (s && s.contains(e.target) && (e.buttons || e.pointerType === 'mouse')) this._px(e, n, set); });
      this.$view.addEventListener('keydown', e => { const s = svgOf(); if (!s || e.target !== s) return; const d = { ArrowLeft: -1, ArrowRight: 1, Home: -1e6, End: 1e6 }[e.key]; if (d == null) return; e.preventDefault(); set(clamp((this.at == null ? n() - 1 : this.at) + d, 0, n() - 1)); });
    }
    _px(e, n, set) { const s = this.$svg, r = s.getBoundingClientRect(), x = (e.clientX - r.left) * (this._W / r.width); set(clamp(Math.round((x - this._x0) / this._dx), 0, n() - 1)); }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('db'); }
  }

  /* ======================================================================================
   * Donut: parts of a whole
   * data = { unit?, prefix?, items:[{id,label,value}], centre? }
   * ====================================================================================== */
  class Donut extends Base {
    constructor(el, data, opts) { super(el, data, opts, {}); this.items = data.items.map((x, i) => Object.assign({ i }, x, { value: +x.value, id: x.id || 'p' + i })); this.sel = null; this._hot(k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { id: k }); }); this.render(); }
    _keysAll() { return this.items.map(x => ({ id: x.id, label: x.label, c: colorFor(this.el, x, x.i) })); }
    render() {
      const T = themeOf(this.el), F = fmtOf(this.data), vis = this.items.filter(x => !this.hidden.has(x.id)), tot = vis.reduce((a, x) => a + x.value, 0) || 1, sorted = vis.slice().sort((a, b) => b.value - a.value);
      this._keys(this._keysAll());
      if (this.table) this._table(['Part', 'Amount', 'Share'], sorted.map(x => [x.label, fmt(x.value, F), pct(x.value / tot)]));
      else {
        const W = Math.max(280, this.el.clientWidth || 600), S = Math.min(W, 360), cx = W / 2, cy = S / 2, R = S / 2 - 14, r0 = R * 0.58;
        const P = (a, r) => f1(cx + Math.sin(a) * r) + ' ' + f1(cy - Math.cos(a) * r);
        let s = '', a = 0;
        vis.forEach(x => {
          const da = (x.value / tot) * TAU, on = this.sel === x.id, mid = a + da / 2, off = on ? 8 : 0, ox = Math.sin(mid) * off, oy = -Math.cos(mid) * off, a1 = a + Math.max(0, da - 0.008), big = da > Math.PI ? 1 : 0;
          s += '<g data-k="' + esc(x.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(x.label + ': ' + fmt(x.value, F) + ', ' + pct(x.value / tot)) + '" transform="translate(' + f1(ox) + ' ' + f1(oy) + ')"' + (this.sel && !on ? ' opacity=".5"' : '') + '><path d="M' + P(a, R) + ' A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + P(a1, R) + ' L' + P(a1, r0) + ' A' + f1(r0) + ' ' + f1(r0) + ' 0 ' + big + ' 0 ' + P(a, r0) + 'Z" fill="' + colorFor(this.el, x, x.i) + '"/>' + (da > 0.35 ? '<text x="' + f1(cx + Math.sin(mid) * (R + r0) / 2) + '" y="' + f1(cy - Math.cos(mid) * (R + r0) / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" pointer-events="none">' + pct(x.value / tot) + '</text>' : '') + '</g>';
          a += da;
        });
        const sx = this.sel ? vis.find(x => x.id === this.sel) : null;
        s += '<text x="' + cx + '" y="' + f1(cy + 2) + '" text-anchor="middle" font-size="22" font-weight="800" fill="' + T.fg + '">' + esc(sx ? pct(sx.value / tot) : fmt(tot, { prefix: F.prefix, decimals: F.decimals })) + '</text><text x="' + cx + '" y="' + f1(cy + 20) + '" text-anchor="middle" font-size="11.5" fill="' + T.muted + '">' + esc(fitText(sx ? sx.label : this.data.centre || 'total', r0 * 1.7, 11.5)) + '</text>';
        this._svg(s, W, S, 'Ring of ' + vis.length + ' parts');
      }
      const sx = this.sel ? vis.find(x => x.id === this.sel) : null;
      if (sx) this.$note.innerHTML = '<b>' + esc(sx.label) + '</b>: ' + fmt(sx.value, F) + ', <b>' + pct(sx.value / tot) + '</b> of the total' + (this.hidden.size ? ' shown' : '') + ' — number ' + (sorted.indexOf(sx) + 1) + ' of ' + vis.length + '.';
      else this.$note.innerHTML = 'Total ' + fmt(tot, F) + (this.hidden.size ? ' (with ' + this.hidden.size + ' hidden)' : '') + '. Largest: <b>' + esc(sorted[0].label) + '</b> (' + pct(sorted[0].value / tot) + ')' + (sorted[1] ? ', then ' + esc(sorted[1].label) + ' (' + pct(sorted[1].value / tot) + ')' : '') + '. Tap a slice, or a key to hide it.';
    }
  }

  /* ======================================================================================
   * Barchart: one or more series
   * data = { unit?, prefix?, categories:[...], series:[{id,label,values:[]}] }  options: { mode:'grouped'|'stacked', sort:false }
   * ====================================================================================== */
  class Barchart extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: 'grouped', sort: false });
      this.ser = data.series.map((s, i) => Object.assign({ i }, s, { id: s.id || 's' + i, values: s.values.map(Number) })); this.mode = this.o.mode; this.sorted = !!this.o.sort; this.sel = null;
      this.$modes.insertAdjacentHTML('afterend', '<button type="button" class="db-btn" data-sort aria-pressed="' + this.sorted + '">Largest first</button>');
      this.el.querySelector('[data-sort]').onclick = e => { this.sorted = !this.sorted; e.currentTarget.setAttribute('aria-pressed', String(this.sorted)); this.render(); this._emit('sort', { sorted: this.sorted }); };
      this._hot(k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) { const [c, s] = k.split(':').map(Number); this._emit('select', { category: this.data.categories[c], series: this.ser[s].id, value: this.ser[s].values[c] }); } });
      this.render();
    }
    _keysAll() { return this.ser.map(s => ({ id: s.id, label: s.label, c: colorFor(this.el, s, s.i) })); }
    render() {
      const T = themeOf(this.el), F = fmtOf(this.data), C = this.data.categories, vis = this.ser.filter(s => !this.hidden.has(s.id)), tot = c => vis.reduce((a, s) => a + (s.values[c] || 0), 0), order = C.map((_, c) => c); if (this.sorted) order.sort((a, b) => tot(b) - tot(a));
      const stacked = this.mode === 'stacked' && vis.length > 1;
      this._modes(this.ser.length > 1 ? [['grouped', 'Side by side'], ['stacked', 'Stacked']] : []); this._keys(this._keysAll());
      if (this.table) this._table(['', ...vis.map(s => s.label)].concat(vis.length > 1 ? ['Total'] : []), order.map(c => [C[c], ...vis.map(s => fmt(s.values[c], F))].concat(vis.length > 1 ? [fmt(tot(c), F)] : [])));
      else {
        const W = Math.max(280, this.el.clientWidth || 640), narrow = W < 520, longL = Math.max(...C.map(c => String(c).length)) > 8 || C.length * vis.length > (narrow ? 10 : 24), max = Math.max(1e-9, ...order.map(c => (stacked ? tot(c) : Math.max(...vis.map(s => s.values[c] || 0)))));
        let s = '';
        if (longL) {
          const band = stacked ? 30 : Math.max(22, vis.length * 14 + 10), pl = Math.min(narrow ? 110 : 170, 10 + Math.max(...C.map(c => String(c).length)) * 6.6), pr = 50, H = order.length * band + 26, sx = v => pl + (v / max) * (W - pl - pr);
          ticks(0, max, narrow ? 3 : 5).forEach(v => { s += '<line x1="' + f1(sx(v)) + '" y1="2" x2="' + f1(sx(v)) + '" y2="' + (H - 22) + '" stroke="' + T.line + '"/><text x="' + f1(sx(v)) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: F.prefix })) + '</text>'; });
          order.forEach((c, r) => {
            const y0 = 2 + r * band; s += '<text x="' + (pl - 8) + '" y="' + f1(y0 + band / 2 + 4) + '" text-anchor="end" font-size="12" font-weight="600" fill="' + T.fg + '">' + esc(fitText(C[c], pl - 12, 12)) + '</text>';
            let acc = 0; vis.forEach((se, k) => { const v = se.values[c] || 0, key = c + ':' + se.i, on = this.sel === key, x0 = stacked ? sx(acc) : sx(0), w = sx(v) - sx(0), y = stacked ? y0 + 5 : y0 + 5 + k * ((band - 10) / vis.length), h = stacked ? band - 10 : (band - 10) / vis.length - 2; acc += v;
              s += '<g data-k="' + key + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(C[c] + (vis.length > 1 ? ', ' + se.label : '') + ': ' + fmt(v, F)) + '"' + (this.sel && !on ? ' opacity=".45"' : '') + '><rect x="' + f1(x0) + '" y="' + f1(y) + '" width="' + f1(Math.max(1, w)) + '" height="' + f1(h) + '" rx="2" fill="' + colorFor(this.el, se, se.i) + '"/></g>' + (!stacked ? '<text x="' + f1(x0 + Math.max(1, w) + 4) + '" y="' + f1(y + h / 2 + 3.5) + '" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '" pointer-events="none">' + esc(fmt(v, { prefix: F.prefix, decimals: F.decimals })) + '</text>' : ''); });
            if (stacked) s += '<text x="' + f1(sx(tot(c)) + 5) + '" y="' + f1(y0 + band / 2 + 4) + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(tot(c), { prefix: F.prefix, decimals: F.decimals })) + '</text>';
          });
          this._svg(s, W, H, 'Bars for ' + C.length + ' categories');
        } else {
          const H = narrow ? 260 : 300, pt = 14, pb = 28, pl = labW(ticks(0, max, 5), F), pr = 8, band = (W - pl - pr) / order.length, sy = v => H - pb - (v / max) * (H - pt - pb);
          ticks(0, max, 5).forEach(v => { s += '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: F.prefix })) + '</text>'; });
          order.forEach((c, r) => {
            const x0 = pl + r * band; s += '<text x="' + f1(x0 + band / 2) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11" fill="' + T.fg + '">' + esc(fitText(C[c], band - 2, 11)) + '</text>';
            let acc = 0; vis.forEach((se, k) => { const v = se.values[c] || 0, key = c + ':' + se.i, on = this.sel === key, bw = stacked ? band * 0.6 : (band * 0.76) / vis.length, x = stacked ? x0 + band * 0.2 : x0 + band * 0.12 + k * bw, y1 = sy(acc + (stacked ? v : 0) + (stacked ? 0 : v) - (stacked ? 0 : 0)), yb = stacked ? sy(acc) : sy(0); acc += stacked ? v : 0;
              const top = stacked ? sy(acc) : sy(v);
              s += '<g data-k="' + key + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(C[c] + (vis.length > 1 ? ', ' + se.label : '') + ': ' + fmt(v, F)) + '"' + (this.sel && !on ? ' opacity=".45"' : '') + '><rect x="' + f1(x + 0.5) + '" y="' + f1(top) + '" width="' + f1(Math.max(1, bw - 1)) + '" height="' + f1(Math.max(1, yb - top)) + '" rx="2" fill="' + colorFor(this.el, se, se.i) + '"/></g>'; void y1; });
          });
          this._svg(s, W, H, 'Bars for ' + C.length + ' categories');
        }
      }
      if (this.sel) { const [c, si] = this.sel.split(':').map(Number), se = this.ser[si], v = se.values[c]; this.$note.innerHTML = '<b>' + esc(C[c]) + '</b>' + (vis.length > 1 ? ', ' + esc(se.label) : '') + ': <b>' + fmt(v, F) + '</b>' + (vis.length > 1 ? ' (' + pct(v / (tot(c) || 1)) + ' of ' + esc(C[c]) + '’s total ' + fmt(tot(c), F) + ')' : '') + '.'; }
      else { const best = C.map((_, c) => c).sort((a, b) => tot(b) - tot(a)); this.$note.innerHTML = 'Highest: <b>' + esc(C[best[0]]) + '</b> (' + fmt(tot(best[0]), F) + (vis.length > 1 ? ' in all' : '') + '). Lowest: ' + esc(C[best[best.length - 1]]) + ' (' + fmt(tot(best[best.length - 1]), F) + ').' + (vis.length > 1 ? ' ' + vis.map(se => esc(se.label) + ' totals ' + fmt(se.values.reduce((a, b) => a + (b || 0), 0), F)).join('; ') + '.' : '') + ' Tap a bar for its number.'; }
    }
  }

  /* ======================================================================================
   * Linechart: lines over time with a crosshair
   * data = { unit?, prefix?, decimals?, x:[labels], series:[{id,label,values:[]}], zero?: true }
   * ====================================================================================== */
  class Linechart extends Base {
    constructor(el, data, opts) { super(el, data, opts, {}); this.ser = data.series.map((s, i) => Object.assign({ i }, s, { id: s.id || 's' + i, values: s.values.map(v => (v == null ? null : +v)) })); this.at = null; this._cross(() => this.data.x.length, i => { if (i === this.at) return; this.at = i; this.render(); this._emit('move', { x: this.data.x[i] }); }); this.render(); }
    _keysAll() { return this.ser.map(s => ({ id: s.id, label: s.label, c: colorFor(this.el, s, s.i) })); }
    render() {
      const T = themeOf(this.el), F = fmtOf(this.data), X = this.data.x, n = X.length, vis = this.ser.filter(s => !this.hidden.has(s.id));
      this._keys(this._keysAll());
      if (this.table) this._table(['', ...vis.map(s => s.label)], X.map((x, i) => [x, ...vis.map(s => fmt(s.values[i], F))]));
      else {
        const W = Math.max(280, this.el.clientWidth || 640), narrow = W < 520, H = narrow ? 250 : 300, pt = 12, pb = 26, pr = narrow ? 10 : 90, all = vis.flatMap(s => s.values.filter(v => v != null));
        let lo = Math.min(...all), hi = Math.max(...all); if (this.data.zero) lo = Math.min(0, lo); const pad = (hi - lo) * 0.06 || 1; lo = this.data.zero ? lo : lo - pad; hi += pad;
        const pl = labW(ticks(lo, hi, 5), F), sx = i => pl + (i / Math.max(1, n - 1)) * (W - pl - pr), sy = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
        this._W = W; this._x0 = pl; this._dx = (W - pl - pr) / Math.max(1, n - 1);
        let s = ticks(lo, hi, 5).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: F.prefix, decimals: F.decimals })) + '</text>').join('');
        const every = Math.ceil(n / (narrow ? 4 : 8)); X.forEach((x, i) => { if (i % every === 0) s += '<text x="' + f1(clamp(sx(i), pl + 12, W - pr - 12)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(x) + '</text>'; });
        const ends = [];
        vis.forEach(se => { const c = colorFor(this.el, se, se.i); let d = '', pen = false; se.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(sy(v)); pen = true; }); s += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'; const li = se.values.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0).pop(); if (!narrow && li != null) ends.push({ y: sy(se.values[li]), label: se.label, c }); });
        ends.sort((a, b) => a.y - b.y).reduce((prev, e) => { e.y = Math.max(e.y, prev + 13); s += '<text x="' + (W - pr + 6) + '" y="' + f1(e.y + 4) + '" font-size="11.5" font-weight="700" fill="' + e.c + '">' + esc(fitText(e.label, pr - 10, 11.5)) + '</text>'; return e.y; }, -1e9);
        if (this.at != null) { s += '<line x1="' + f1(sx(this.at)) + '" y1="' + pt + '" x2="' + f1(sx(this.at)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '"/>'; vis.forEach(se => { const v = se.values[this.at]; if (v != null) s += '<circle cx="' + f1(sx(this.at)) + '" cy="' + f1(sy(v)) + '" r="4.5" fill="' + colorFor(this.el, se, se.i) + '" stroke="' + T.surface + '" stroke-width="2"/>'; }); }
        const svg = this._svg(s, W, H, vis.map(s => s.label).join(', ') + ' over ' + n + ' points. Use the left and right arrow keys to read each point.');
        svg.setAttribute('tabindex', '0'); svg.setAttribute('role', 'slider'); svg.setAttribute('aria-valuemin', '0'); svg.setAttribute('aria-valuemax', String(n - 1)); if (this.at != null) { svg.setAttribute('aria-valuenow', String(this.at)); svg.setAttribute('aria-valuetext', X[this.at]); }
      }
      if (this.at != null) this.$note.innerHTML = '<b>' + esc(X[this.at]) + '</b>: ' + vis.map(se => esc(se.label) + ' <b>' + fmt(se.values[this.at], F) + '</b>').join(', ') + '.';
      else this.$note.innerHTML = vis.map(se => { const v = se.values.filter(x => x != null), mx = Math.max(...v), mn = Math.min(...v); return '<b>' + esc(se.label) + '</b>: ' + fmt(mn, F) + ' (' + esc(X[se.values.indexOf(mn)]) + ') to ' + fmt(mx, F) + ' (' + esc(X[se.values.indexOf(mx)]) + ')'; }).join('; ') + '. Drag along the chart, or use the arrow keys, to read any point.';
    }
  }

  /* ======================================================================================
   * Areachart: piled-up amounts over time
   * data = { unit?, prefix?, x:[labels], series:[{id,label,values:[]}] }  options: { mode:'total'|'share' }
   * ====================================================================================== */
  class Areachart extends Base {
    constructor(el, data, opts) { super(el, data, opts, { mode: 'total' }); this.ser = data.series.map((s, i) => Object.assign({ i }, s, { id: s.id || 's' + i, values: s.values.map(Number) })); this.mode = this.o.mode; this.at = null; this._cross(() => this.data.x.length, i => { if (i === this.at) return; this.at = i; this.render(); this._emit('move', { x: this.data.x[i] }); }); this.render(); }
    _keysAll() { return this.ser.map(s => ({ id: s.id, label: s.label, c: colorFor(this.el, s, s.i) })); }
    render() {
      const T = themeOf(this.el), F = fmtOf(this.data), X = this.data.x, n = X.length, vis = this.ser.filter(s => !this.hidden.has(s.id)), share = this.mode === 'share', tot = i => vis.reduce((a, s) => a + (s.values[i] || 0), 0), val = (s, i) => (share ? (s.values[i] || 0) / (tot(i) || 1) : s.values[i] || 0);
      this._modes([['total', 'Totals'], ['share', 'Shares of 100%']]); this._keys(this._keysAll());
      if (this.table) this._table(['', ...vis.map(s => s.label), 'Total'], X.map((x, i) => [x, ...vis.map(s => share ? pct(val(s, i)) : fmt(s.values[i], F)), share ? '100%' : fmt(tot(i), F)]));
      else {
        const W = Math.max(280, this.el.clientWidth || 640), narrow = W < 520, H = narrow ? 250 : 300, pt = 12, pb = 26, pr = 10, hi = share ? 1 : Math.max(...X.map((_, i) => tot(i))) * 1.05, tk = share ? [0, 0.25, 0.5, 0.75, 1] : ticks(0, hi, 5);
        const pl = share ? 40 : labW(tk, F), sx = i => pl + (i / Math.max(1, n - 1)) * (W - pl - pr), sy = v => pt + (1 - v / hi) * (H - pt - pb);
        this._W = W; this._x0 = pl; this._dx = (W - pl - pr) / Math.max(1, n - 1);
        let s = tk.map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(share ? pct(v) : fmt(v, { prefix: F.prefix })) + '</text>').join('');
        const base = new Array(n).fill(0);
        vis.forEach(se => { const top = base.map((b, i) => b + val(se, i)); s += '<path d="M' + top.map((v, i) => f1(sx(i)) + ' ' + f1(sy(v))).join(' L') + ' L' + base.map((v, i) => f1(sx(i)) + ' ' + f1(sy(v))).reverse().join(' L') + 'Z" fill="' + colorFor(this.el, se, se.i) + '" opacity=".85"/>'; top.forEach((v, i) => { base[i] = v; }); });
        const every = Math.ceil(n / (narrow ? 4 : 8)); X.forEach((x, i) => { if (i % every === 0) s += '<text x="' + f1(clamp(sx(i), pl + 12, W - pr - 12)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(x) + '</text>'; });
        if (this.at != null) s += '<line x1="' + f1(sx(this.at)) + '" y1="' + pt + '" x2="' + f1(sx(this.at)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '" stroke-width="1.5"/>';
        const svg = this._svg(s, W, H, 'Piled-up amounts over ' + n + ' points. Use the arrow keys to read each point.');
        svg.setAttribute('tabindex', '0'); svg.setAttribute('role', 'slider'); svg.setAttribute('aria-valuemin', '0'); svg.setAttribute('aria-valuemax', String(n - 1)); if (this.at != null) { svg.setAttribute('aria-valuenow', String(this.at)); svg.setAttribute('aria-valuetext', X[this.at]); }
      }
      if (this.at != null) this.$note.innerHTML = '<b>' + esc(X[this.at]) + '</b>: ' + vis.map(se => esc(se.label) + ' ' + (share ? '<b>' + pct(val(se, this.at)) + '</b>' : '<b>' + fmt(se.values[this.at], F) + '</b>')).join(', ') + (share ? '' : '; total ' + fmt(tot(this.at), F)) + '.';
      else { const first = vis.map(se => (se.values[0] || 0) / (tot(0) || 1)), last = vis.map(se => (se.values[n - 1] || 0) / (tot(n - 1) || 1)), k = last.map((v, i) => v - first[i]), up = k.indexOf(Math.max(...k)); this.$note.innerHTML = 'Total ' + fmt(tot(0), F) + ' at ' + esc(X[0]) + ', ' + fmt(tot(n - 1), F) + ' at ' + esc(X[n - 1]) + '. Biggest gain in share: <b>' + esc(vis[up].label) + '</b> (' + pct(first[up]) + ' to ' + pct(last[up]) + '). Drag along it to read any point.'; }
    }
  }

  /* ======================================================================================
   * Combochart: bars and a line on two scales
   * data = { x:[labels], bars:{label,values,unit?,prefix?}, line:{label,values,unit?,prefix?,decimals?} }
   * ====================================================================================== */
  class Combochart extends Base {
    constructor(el, data, opts) { super(el, data, opts, {}); this.at = null; this._cross(() => this.data.x.length, i => { if (i === this.at) return; this.at = i; this.render(); this._emit('move', { x: this.data.x[i] }); }); this.render(); }
    _keysAll() { return [{ id: 'bars', label: this.data.bars.label, c: PALETTE[0] }, { id: 'line', label: this.data.line.label, c: PALETTE[1] }]; }
    render() {
      const T = themeOf(this.el), d = this.data, X = d.x, n = X.length, B = d.bars.values.map(Number), L = d.line.values.map(Number), FB = fmtOf(d.bars), FL = fmtOf(d.line), showB = !this.hidden.has('bars'), showL = !this.hidden.has('line');
      this._keys(this._keysAll());
      if (this.table) this._table(['', d.bars.label, d.line.label], X.map((x, i) => [x, fmt(B[i], FB), fmt(L[i], FL)]));
      else {
        const W = Math.max(280, this.el.clientWidth || 640), narrow = W < 520, H = narrow ? 260 : 300, pt = 22, pb = 26, bhi = Math.max(...B) * 1.08, llo = Math.min(0, ...L), lhi = Math.max(...L) * 1.12, tb = ticks(0, bhi, 4), tl = ticks(llo, lhi, 4);
        const pl = labW(tb, FB), pr = labW(tl, FL), band = (W - pl - pr) / n, sx = i => pl + (i + 0.5) * band, syB = v => H - pb - (v / bhi) * (H - pt - pb), syL = v => pt + (1 - (v - llo) / (lhi - llo)) * (H - pt - pb);
        this._W = W; this._x0 = pl + band / 2; this._dx = band;
        let s = tb.map(v => '<line x1="' + pl + '" y1="' + f1(syB(v)) + '" x2="' + (W - pr) + '" y2="' + f1(syB(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(syB(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + PALETTE[0] + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: FB.prefix })) + '</text>').join('') + tl.map(v => '<text x="' + (W - pr + 6) + '" y="' + f1(syL(v) + 4) + '" font-size="10.5" fill="' + PALETTE[1] + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: FL.prefix, decimals: FL.decimals })) + '</text>').join('');
        s += '<text x="' + pl + '" y="12" font-size="11" font-weight="700" fill="' + PALETTE[0] + '">' + esc(d.bars.label + (d.bars.unit ? ' (' + d.bars.unit + ')' : '')) + '</text><text x="' + (W - pr) + '" y="12" text-anchor="end" font-size="11" font-weight="700" fill="' + PALETTE[1] + '">' + esc(d.line.label + (d.line.unit ? ' (' + d.line.unit + ')' : '')) + '</text>';
        if (showB) B.forEach((v, i) => { s += '<rect x="' + f1(sx(i) - band * 0.32) + '" y="' + f1(syB(v)) + '" width="' + f1(band * 0.64) + '" height="' + f1(H - pb - syB(v)) + '" rx="2" fill="' + PALETTE[0] + '" opacity="' + (this.at === i ? 1 : 0.7) + '"/>'; });
        if (showL) s += '<path d="' + L.map((v, i) => (i ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(syL(v))).join(' ') + '" fill="none" stroke="' + PALETTE[1] + '" stroke-width="2.5"/>' + L.map((v, i) => '<circle cx="' + f1(sx(i)) + '" cy="' + f1(syL(v)) + '" r="' + (this.at === i ? 5.5 : 3) + '" fill="' + PALETTE[1] + '" stroke="' + T.surface + '" stroke-width="1.5"/>').join('');
        const every = Math.ceil(n / (narrow ? 6 : 12)); X.forEach((x, i) => { if (i % every === 0) s += '<text x="' + f1(sx(i)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(x) + '</text>'; });
        const svg = this._svg(s, W, H, d.bars.label + ' as bars and ' + d.line.label + ' as a line. Use the arrow keys to read each period.');
        svg.setAttribute('tabindex', '0'); svg.setAttribute('role', 'slider'); svg.setAttribute('aria-valuemin', '0'); svg.setAttribute('aria-valuemax', String(n - 1)); if (this.at != null) { svg.setAttribute('aria-valuenow', String(this.at)); svg.setAttribute('aria-valuetext', X[this.at]); }
      }
      if (this.at != null) this.$note.innerHTML = '<b>' + esc(X[this.at]) + '</b>: ' + esc(d.bars.label.toLowerCase()) + ' <b>' + fmt(B[this.at], FB) + '</b>, ' + esc(d.line.label.toLowerCase()) + ' <b>' + fmt(L[this.at], FL) + '</b>.';
      else { const bi = B.indexOf(Math.max(...B)), li = L.indexOf(Math.max(...L)), mb = B.reduce((a, b) => a + b, 0) / n, ml = L.reduce((a, b) => a + b, 0) / n, r = B.reduce((a, b, i) => a + (b - mb) * (L[i] - ml), 0) / Math.sqrt(B.reduce((a, b) => a + (b - mb) ** 2, 0) * L.reduce((a, b) => a + (b - ml) ** 2, 0) || 1); this.$note.innerHTML = 'Most ' + esc(d.bars.label.toLowerCase()) + ' in <b>' + esc(X[bi]) + '</b> (' + fmt(B[bi], FB) + '); highest ' + esc(d.line.label.toLowerCase()) + ' in <b>' + esc(X[li]) + '</b> (' + fmt(L[li], FL) + '). The two ' + (Math.abs(r) < 0.3 ? 'do not move together much' : r > 0 ? 'tend to rise and fall together' : 'tend to move in opposite directions') + '. Drag along it to read any period.'; }
    }
  }

  /* ======================================================================================
   * Waffle: 100 squares
   * data = { items:[{id,label,value}], unit?, label? }
   * ====================================================================================== */
  class Waffle extends Base {
    constructor(el, data, opts) { super(el, data, opts, {}); this.items = data.items.map((x, i) => Object.assign({ i }, x, { value: +x.value, id: x.id || 'p' + i })); this.sel = null; this._hot(k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { id: k }); }); this.render(); }
    _keysAll() { return this.items.map(x => ({ id: x.id, label: x.label, c: colorFor(this.el, x, x.i) })); }
    _cells(vis, tot) { const raw = vis.map(x => (x.value / tot) * 100), fl = raw.map(Math.floor); let left = 100 - fl.reduce((a, b) => a + b, 0); raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { fl[i]++; left--; } }); return fl; }
    render() {
      const T = themeOf(this.el), F = fmtOf(this.data), vis = this.items.filter(x => !this.hidden.has(x.id)), tot = vis.reduce((a, x) => a + x.value, 0) || 1, cells = this._cells(vis, tot);
      this._keys(this._keysAll());
      if (this.table) this._table(['Part', 'Amount', 'Squares (of 100)'], vis.map((x, k) => [x.label, fmt(x.value, F), String(cells[k])]));
      else {
        const W = Math.max(280, this.el.clientWidth || 600), S = Math.min(W, 340), g = 3, c = (S - g * 9) / 10, ox = (W - S) / 2;
        let s = '', n = 0;
        vis.forEach((x, k) => { const on = this.sel === x.id, col = colorFor(this.el, x, x.i); let sq = ''; for (let j = 0; j < cells[k]; j++, n++) { const r = Math.floor(n / 10), q = n % 10; sq += '<rect x="' + f1(ox + q * (c + g)) + '" y="' + f1(r * (c + g)) + '" width="' + f1(c) + '" height="' + f1(c) + '" rx="3" fill="' + col + '"/>'; } s += '<g data-k="' + esc(x.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(x.label + ': ' + cells[k] + ' of 100 squares, ' + fmt(x.value, F)) + '"' + (this.sel && !on ? ' opacity=".3"' : '') + '>' + sq + '</g>'; });
        this._svg(s, W, f1(S), '100 squares split into ' + vis.length + ' parts');
      }
      const sorted = vis.slice().sort((a, b) => b.value - a.value);
      if (this.sel) { const x = vis.find(z => z.id === this.sel), k = vis.indexOf(x); this.$note.innerHTML = '<b>' + esc(x.label) + '</b>: ' + fmt(x.value, F) + ' — <b>' + cells[k] + ' in every 100</b>' + (cells[k] >= 2 && 100 % cells[k] === 0 ? ', or 1 in ' + 100 / cells[k] : '') + '.'; }
      else this.$note.innerHTML = 'Each square is 1% of ' + fmt(tot, F) + (this.data.label ? ' ' + esc(this.data.label) : '') + '. ' + sorted.map(x => '<b>' + esc(x.label) + '</b> ' + cells[vis.indexOf(x)]).join(', ') + ' squares. Tap a colour to pick it out.';
    }
  }

  return { Donut, Barchart, Linechart, Areachart, Combochart, Waffle };
});
