/*! Compare 1.0 · Dimau Infographics
 *  Six formats for comparing, choosing and deciding:
 *    Dropoff     a funnel: how many make it through each step, and where most are lost.
 *    Quadrant    a 2×2 matrix (effort against impact, cost against value …); drag items between boxes.
 *    Slope       before and after: one line per item from the first value to the second.
 *    Pathfinder  a question path: answer one question at a time to reach the right result, with a map of the path.
 *    Radar       profiles on several measures at once; switch profiles on and off to compare shapes.
 *    Pyramid     two groups back to back, row by row (the population-pyramid format).
 *
 *  new Dropoff(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Dropoff', 'Quadrant', 'Slope', 'Pathfinder', 'Radar', 'Pyramid'].forEach(function (k) { root[k] = m[k]; }); root.DimauCompare = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#7a6bd1', '#c2563a'];
  const DOWN = '#d9822b';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : (Math.abs(n) < 10 ? 1 : 0) }) + (o.suffix || '') : '–'; };
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
  /** Push label positions apart so none are closer than gap, keeping them inside [lo, hi]. */
  function spread(ys, gap, lo, hi) {
    const o = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    for (let k = 0; k < 40; k++) {
      let moved = false;
      for (let j = 1; j < o.length; j++) { const d = o[j].y - o[j - 1].y; if (d < gap) { const p = (gap - d) / 2; o[j - 1].y -= p; o[j].y += p; moved = true; } }
      o.forEach(e => { e.y = clamp(e.y, lo, hi); });
      if (!moved) break;
    }
    const out = []; o.forEach(e => { out[e.i] = e.y; }); return out;
  }

  /** Split a label onto two lines (at the space nearest the middle) when it does not fit on one. */
  function wrap2(t, w, size) {
    t = String(t); if (t.length * size * 0.56 <= w || t.indexOf(' ') < 0) return [fitText(t, w, size)];
    let best = -1; for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (best < 0 || Math.abs(i - t.length / 2) < Math.abs(best - t.length / 2))) best = i;
    return [fitText(t.slice(0, best), w, size), fitText(t.slice(best + 1), w, size)];
  }

  const STYLE = `
.dk{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dk) button{font:inherit;color:inherit}
.dk :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dk svg{display:block;width:100%;touch-action:manipulation}
.dk-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.dk-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.dk-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dk-btn i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:-1px}
.dk-btn[aria-pressed="false"] i{opacity:.35}
.dk-note{font-size:14px;line-height:1.5;margin:10px 0 0;min-height:1.5em}
.dk-hot{cursor:pointer}
.dk-hot:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dk-drag{cursor:grab}
.dk-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dk-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.pf-trail{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.pf-trail button{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:999px;padding:5px 11px;font-size:12.5px;cursor:pointer;text-align:left}
.pf-trail button b{font-weight:700}
.pf-card{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:14px;padding:18px;display:grid;gap:12px}
.pf-step{font:600 11.5px/1 var(--di-mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--di-muted,#4f6578)}
.pf-q{font-size:20px;font-weight:800;line-height:1.3;margin:0;display:flex;gap:8px;align-items:flex-start}
.pf-opts{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.pf-opt{border:1.5px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);border-radius:11px;padding:12px 14px;font-size:15px;font-weight:700;text-align:left;cursor:pointer}
.pf-opt:hover{border-color:var(--di-accent,#0b6fa4)}
.pf-opt span{display:block;font-size:12.5px;font-weight:500;color:var(--di-muted,#4f6578);margin-top:3px}
.pf-help{position:relative;flex:none}
.pf-help>button{width:24px;height:24px;border-radius:50%;border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);font-size:13px;font-weight:800;cursor:pointer;padding:0;line-height:1}
.pf-pop{position:absolute;z-index:5;top:30px;right:0;width:min(280px,70vw);background:var(--di-fg,#13263a);color:var(--di-surface,#fff);font-size:13px;font-weight:500;line-height:1.45;padding:10px 12px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.18)}
.pf-pop[hidden]{display:none}
.pf-result{font-size:24px;font-weight:800;margin:0;color:var(--di-accent,#0b6fa4)}
.pf-text{margin:0;font-size:15px;line-height:1.55}
.pf-actions{display:flex;flex-wrap:wrap;gap:8px}
.pf-actions a{display:inline-block;background:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff);border-radius:9px;padding:8px 14px;font-weight:700;font-size:14px;text-decoration:none}
.pf-map{margin-top:14px}
@media (prefers-reduced-motion:no-preference){.pf-card{animation:dk-in .25s both}}
@keyframes dk-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;
  function injectStyle() {
    if (document.getElementById('dk-style')) return;
    const s = document.createElement('style'); s.id = 'dk-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dk');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    /** Delegated tap/keyboard handling for elements with class dk-hot and data-k. */
    _hot(container, fn) {
      container.addEventListener('click', e => { if (this._dragged) { this._dragged = false; return; } const g = e.target.closest('.dk-hot'); if (g) fn(g.dataset.k, g); });
      container.addEventListener('keydown', e => { const g = e.target.closest('.dk-hot'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k, g); } });
    }
    /** Redraw the SVG while keeping keyboard focus on the same data-k element. */
    _paint(svg, html) {
      const a = document.activeElement, keep = a && svg.contains(a) && a.dataset ? a.dataset.k : null;
      svg.innerHTML = html;
      if (keep != null) { const g = svg.querySelector('.dk-hot[data-k="' + CSS.escape(keep) + '"]'); g && g.focus({ preventScroll: true }); }
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dk'); }
  }

  /* ======================================================================================
   * Dropoff: a funnel of steps, with the loss between each step
   * data = { label?, unit?, prefix?, suffix?, stages:[{id,label,value,note?}] }
   * ====================================================================================== */
  class Dropoff extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.stages = data.stages.map((s, i) => Object.assign({ i }, s, { value: +s.value }));
      this.sel = null;
      el.innerHTML = '<svg role="img"></svg><p class="dk-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dk-note');
      this._hot(this.$svg, k => this.select(this.stages[+k].id));
      this.render();
    }
    _worst() {
      let w = null;
      this.stages.forEach((s, i) => { if (!i) return; const p = this.stages[i - 1], lost = p.value ? (p.value - s.value) / p.value : 0; if (!w || lost > w.lost) w = { i, lost, from: p, to: s }; });
      return w;
    }
    select(id) {
      const s = this.stages.find(x => x.id === id); if (!s) return;
      this.sel = this.sel === s.i ? null : s.i; this.render();
      if (this.sel != null) this._emit('select', { id: s.id, value: s.value, ofStart: s.value / this.stages[0].value });
    }
    render() {
      const T = themeOf(this.el), d = this.data, st = this.stages, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520;
      const barH = narrow ? 34 : 42, lab = 20, gap = narrow ? 26 : 28, rowH = lab + barH + gap, H = st.length * rowH - gap + 4;
      const max = Math.max(...st.map(s => s.value)) || 1, cx = W / 2, full = W - 4, worst = this._worst();
      const w = v => Math.max(6, (v / max) * full);
      let s = '';
      st.forEach((g, i) => {
        const y = i * rowH + lab, bw = w(g.value), on = this.sel === i, dim = this.sel != null && !on;
        if (i) {
          const p = st[i - 1], py = (i - 1) * rowH + lab + barH, pw = w(p.value), lost = p.value - g.value, isW = worst && worst.i === i;
          s += '<path d="M' + f1(cx - pw / 2) + ' ' + py + ' L' + f1(cx + pw / 2) + ' ' + py + ' L' + f1(cx + bw / 2) + ' ' + (y - lab) + ' L' + f1(cx - bw / 2) + ' ' + (y - lab) + 'Z" fill="' + T.line + '" opacity=".55"/>' +
            '<text x="' + f1(cx) + '" y="' + f1(py + gap / 2 + 4) + '" text-anchor="middle" font-size="12" font-weight="' + (isW ? 800 : 600) + '" fill="' + (isW ? DOWN : T.muted) + '" font-family="' + esc(T.mono) + '">' +
            esc('−' + fmtNum(lost, d) + ' (' + pct(lost, p.value) + '%)' + (isW ? ' · biggest drop' : '')) + '</text>';
        }
        s += '<g class="dk-hot" tabindex="0" role="button" data-k="' + i + '" aria-pressed="' + on + '" aria-label="' + esc(g.label + ': ' + fmtNum(g.value, d) + ', ' + pct(g.value, st[0].value) + '% of the start') + '">' +
          '<rect x="' + f1(cx - bw / 2) + '" y="' + y + '" width="' + f1(bw) + '" height="' + barH + '" rx="8" fill="' + T.accent + '" opacity="' + (dim ? 0.35 : 1 - i * (0.5 / Math.max(1, st.length))) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/>' +
          '<text x="0" y="' + (y - 6) + '" font-size="13" font-weight="700" fill="' + T.fg + '">' + esc(fitText((i + 1) + '. ' + g.label, W * 0.62, 13)) + '</text>' +
          '<text x="' + W + '" y="' + (y - 6) + '" text-anchor="end" font-size="12.5" font-weight="700" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(g.value, d) + ' · ' + pct(g.value, st[0].value) + '%') + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.label ? d.label + ': ' : '') + st.map(g => g.label + ' ' + fmtNum(g.value, d)).join(', '));
      this._paint(this.$svg, s);
      const first = st[0], last = st[st.length - 1];
      if (this.sel != null) {
        const g = st[this.sel], p = st[this.sel - 1];
        this.$note.innerHTML = '<b>' + esc(g.label) + '</b>: ' + esc(fmtNum(g.value, d)) + ', which is ' + pct(g.value, first.value) + '% of everyone who started.' +
          (p ? ' ' + esc(fmtNum(p.value - g.value, d)) + ' (' + pct(p.value - g.value, p.value) + '%) dropped off after “' + esc(p.label) + '”.' : '') + (g.note ? ' ' + esc(g.note) : '');
      } else {
        this.$note.innerHTML = '<b>' + pct(last.value, first.value) + '%</b> made it from “' + esc(first.label) + '” to “' + esc(last.label) + '”.' +
          (worst ? ' The biggest drop is between “' + esc(worst.from.label) + '” and “' + esc(worst.to.label) + '”: ' + Math.round(worst.lost * 100) + '% left there.' : '') + ' Tap a step for detail.';
      }
    }
  }

  /* ======================================================================================
   * Quadrant: a 2×2 matrix; drag items between the four boxes
   * data = { x:{label,low?,high?,min?,max?}, y:{label,low?,high?,min?,max?},
   *          quadrants?:{tl,tr,bl,br}, groups?:[{id,label,color?}], items:[{id,label,x,y,group?,note?}] }
   * options: { editable: true }
   * ====================================================================================== */
  class Quadrant extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { editable: true });
      this.items = data.items.map((t, i) => Object.assign({ i }, t, { x: +t.x, y: +t.y }));
      this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g));
      this.sel = null;
      el.innerHTML = '<svg role="img"></svg><div class="dk-legend"></div><p class="dk-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$legend = el.querySelector('.dk-legend'); this.$note = el.querySelector('.dk-note');
      this._hot(this.$svg, k => this.select(this.items[+k].id));
      this.$svg.addEventListener('keydown', e => this._key(e));
      this._drag();
      this.render();
    }
    _ax(a) { const ax = this.data[a] || {}; return { min: ax.min != null ? +ax.min : 0, max: ax.max != null ? +ax.max : 10, label: ax.label || a, low: ax.low || 'Low', high: ax.high || 'High' }; }
    quadrantOf(t) {
      const X = this._ax('x'), Y = this._ax('y'), q = this.data.quadrants || {}, right = t.x >= (X.min + X.max) / 2, top = t.y >= (Y.min + Y.max) / 2;
      const k = (top ? 't' : 'b') + (right ? 'r' : 'l');
      return { key: k, label: q[k] || ({ tl: 'Top left', tr: 'Top right', bl: 'Bottom left', br: 'Bottom right' })[k] };
    }
    select(id) {
      const t = this.items.find(x => x.id === id); if (!t) return;
      this.sel = this.sel === t.i ? null : t.i; this.render();
      if (this.sel != null) this._emit('select', { id: t.id, x: t.x, y: t.y, quadrant: this.quadrantOf(t).key });
    }
    _move(t, x, y) {
      const X = this._ax('x'), Y = this._ax('y');
      t.x = Math.round(clamp(x, X.min, X.max) * 10) / 10; t.y = Math.round(clamp(y, Y.min, Y.max) * 10) / 10;
    }
    _done(t) { this.sel = t.i; this.render(); this._emit('move', { id: t.id, x: t.x, y: t.y, quadrant: this.quadrantOf(t).key }); }
    _key(e) {
      if (!this.o.editable) return;
      const g = e.target.closest('.dk-hot'), dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!g || !dir) return;
      e.preventDefault();
      const t = this.items[+g.dataset.k], X = this._ax('x'), Y = this._ax('y');
      this._move(t, t.x + dir[0] * (X.max - X.min) / 20, t.y + dir[1] * (Y.max - Y.min) / 20); this._done(t);
    }
    _drag() {
      let cur = null;
      const pt = e => { const r = this.$svg.getBoundingClientRect(), k = this._geo.W / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
      this.$svg.addEventListener('pointerdown', e => {
        if (!this.o.editable) return;
        const g = e.target.closest('.dk-hot'); if (!g) return;
        cur = { t: this.items[+g.dataset.k], x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId };
      });
      this.$svg.addEventListener('pointermove', e => {
        if (!cur || e.pointerId !== cur.id) return;
        if (!cur.moved && Math.hypot(e.clientX - cur.x0, e.clientY - cur.y0) < 5) return;
        if (!cur.moved) { cur.moved = true; try { this.$svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
        e.preventDefault();
        const [px, py] = pt(e), G = this._geo;
        this._move(cur.t, G.ix(px), G.iy(py)); this.sel = cur.t.i; this.render();
      });
      const end = () => { if (cur && cur.moved) { this._dragged = true; this._done(cur.t); } cur = null; };
      this.$svg.addEventListener('pointerup', end); this.$svg.addEventListener('pointercancel', end);
    }
    getState() { return { items: this.items.map(t => ({ id: t.id, x: t.x, y: t.y })) }; }
    setState(s) { (s && s.items || []).forEach(p => { const t = this.items.find(x => x.id === p.id); if (t) this._move(t, +p.x, +p.y); }); this.render(); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520;
      const X = this._ax('x'), Y = this._ax('y'), pl = 26, pb = 30, pt = 6, H = narrow ? Math.round(W * 0.95) : Math.min(560, Math.round(W * 0.6));
      const pw = W - pl - 4, ph = H - pb - pt;
      const sx = v => pl + ((v - X.min) / (X.max - X.min)) * pw, sy = v => pt + ph - ((v - Y.min) / (Y.max - Y.min)) * ph;
      this._geo = { W, ix: px => X.min + ((px - pl) / pw) * (X.max - X.min), iy: py => Y.min + ((pt + ph - py) / ph) * (Y.max - Y.min) };
      const q = d.quadrants || {}, mx = pl + pw / 2, my = pt + ph / 2;
      let s = '';
      [['tl', pl, pt], ['tr', mx, pt], ['bl', pl, my], ['br', mx, my]].forEach(([k, x, y], i) => {
        s += '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(pw / 2) + '" height="' + f1(ph / 2) + '" fill="' + (k === 'tr' ? T.accent : T.line) + '" opacity="' + (k === 'tr' ? 0.1 : i % 3 ? 0.28 : 0.16) + '"/>';
        if (q[k]) s += '<text x="' + f1(k[1] === 'l' ? x + 10 : x + pw / 2 - 10) + '" y="' + f1(k[0] === 't' ? y + 20 : y + ph / 2 - 10) + '" text-anchor="' + (k[1] === 'l' ? 'start' : 'end') + '" font-size="' + (narrow ? 11.5 : 13) + '" font-weight="800" fill="' + T.muted + '" letter-spacing=".02em">' + esc(q[k].toUpperCase()) + '</text>';
      });
      s += '<line x1="' + f1(mx) + '" y1="' + pt + '" x2="' + f1(mx) + '" y2="' + (pt + ph) + '" stroke="' + T.line + '" stroke-width="1.5"/><line x1="' + pl + '" y1="' + f1(my) + '" x2="' + (pl + pw) + '" y2="' + f1(my) + '" stroke="' + T.line + '" stroke-width="1.5"/>' +
        '<text x="' + pl + '" y="' + (H - 8) + '" font-size="11.5" fill="' + T.muted + '">' + esc(X.low) + '</text><text x="' + (pl + pw) + '" y="' + (H - 8) + '" text-anchor="end" font-size="11.5" fill="' + T.muted + '">' + esc(X.high) + '</text>' +
        '<text x="' + f1(mx) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="' + T.fg + '">' + esc(X.label + ' →') + '</text>' +
        '<g transform="translate(14 ' + f1(pt + ph / 2) + ') rotate(-90)"><text text-anchor="middle" font-size="12.5" font-weight="700" fill="' + T.fg + '">' + esc(Y.label + ' →') + '</text></g>';
      const ord = this.items.slice().sort((a, b) => (a.i === this.sel) - (b.i === this.sel));
      ord.forEach(t => {
        const g = this.groups.find(x => x.id === t.group), c = g ? colorFor(this.el, g, g.i) : T.accent, x = sx(t.x), y = sy(t.y), on = this.sel === t.i, left = x > pl + pw * (narrow ? 0.55 : 0.72);
        s += '<g class="dk-hot' + (this.o.editable ? ' dk-drag' : '') + '" tabindex="0" role="button" data-k="' + t.i + '" aria-pressed="' + on + '" aria-label="' + esc(t.label + ', ' + this.quadrantOf(t).label + (this.o.editable ? '. Arrow keys move it.' : '')) + '">' +
          '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (on ? 10 : 7.5) + '" fill="' + c + '" stroke="' + T.surface + '" stroke-width="2"/>' +
          '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="18" fill="transparent"/>' +
          '<text x="' + f1(left ? x - 12 : x + 12) + '" y="' + f1(y + 4) + '" text-anchor="' + (left ? 'end' : 'start') + '" font-size="' + (narrow ? 11 : 12.5) + '" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3" stroke-linejoin="round">' + esc(fitText(t.label, narrow ? 124 : 170, narrow ? 11 : 12.5)) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', X.label + ' against ' + Y.label + ': ' + this.items.map(t => t.label + ' in ' + this.quadrantOf(t).label).join(', '));
      this._paint(this.$svg, s);
      const counts = {}; this.items.forEach(t => { const k = this.quadrantOf(t).key; counts[k] = (counts[k] || 0) + 1; });
      this.$legend.innerHTML = this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</span>').join('') +
        ['tr', 'tl', 'br', 'bl'].filter(k => q[k]).map(k => '<span>' + esc(q[k]) + ': <b>' + (counts[k] || 0) + '</b></span>').join('');
      const t = this.sel != null ? this.items[this.sel] : null;
      this.$note.innerHTML = t ? '<b>' + esc(t.label) + '</b> is in <b>' + esc(this.quadrantOf(t).label) + '</b> (' + esc(X.label) + ' ' + t.x + ', ' + esc(Y.label) + ' ' + t.y + ').' + (t.note ? ' ' + esc(t.note) : '')
        : 'Tap an item for detail' + (this.o.editable ? ', or drag it (arrow keys work too) to where you think it belongs.' : '.');
    }
  }

  /* ======================================================================================
   * Slope: before and after, one line per item
   * data = { from:{label}, to:{label}, prefix?, suffix?, decimals?, items:[{id,label,a,b,note?}] }
   * ====================================================================================== */
  class Slope extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { filter: 'all' });
      this.items = data.items.map((t, i) => Object.assign({ i }, t, { a: +t.a, b: +t.b }));
      this.sel = null; this.filter = this.o.filter;
      el.innerHTML = '<div class="dk-bar" role="group" aria-label="Show">' + [['all', 'All'], ['up', 'Went up'], ['down', 'Went down']].map(f => '<button type="button" class="dk-btn" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><svg role="img"></svg><p class="dk-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dk-note');
      el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { this.filter = b.dataset.f; this.sel = null; this.render(); this._emit('filter', { by: this.filter }); });
      this._hot(this.$svg, k => this.select(this.items[+k].id));
      this.render();
    }
    _dir(t) { return t.b > t.a ? 'up' : t.b < t.a ? 'down' : 'flat'; }
    _shown(t) { return this.filter === 'all' || this._dir(t) === this.filter; }
    select(id) {
      const t = this.items.find(x => x.id === id); if (!t) return;
      this.sel = this.sel === t.i ? null : t.i; this.render();
      if (this.sel != null) this._emit('select', { id: t.id, from: t.a, to: t.b, change: t.b - t.a });
    }
    _chg(t) { const d = this.data, ch = t.b - t.a, p = t.a ? Math.round((100 * ch) / t.a) : null; return (ch > 0 ? 'up ' : ch < 0 ? 'down ' : 'no change') + (ch ? fmtNum(Math.abs(ch), d) + (p != null ? ' (' + (ch > 0 ? '+' : '−') + Math.abs(p) + '%)' : '') : ''); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520;
      const L = narrow ? 48 : 200, R = narrow ? Math.min(170, Math.round(W * 0.45)) : 200, H = Math.max(260, Math.min(520, this.items.length * 34 + 70)), top = 36, bot = H - 14;
      const vals = this.items.reduce((a, t) => a.concat([t.a, t.b]), []), lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
      const sy = v => bot - ((v - lo) / span) * (bot - top), x0 = L, x1 = W - R;
      const fs = narrow ? 11 : 12.5, ya = spread(this.items.map(t => sy(t.a)), fs + 3, top, bot), yb = spread(this.items.map(t => sy(t.b)), fs + 3, top, bot);
      let s = '<text x="' + x0 + '" y="16" text-anchor="middle" font-size="12.5" font-weight="800" fill="' + T.fg + '">' + esc(d.from && d.from.label || 'Before') + '</text>' +
        '<text x="' + x1 + '" y="16" text-anchor="middle" font-size="12.5" font-weight="800" fill="' + T.fg + '">' + esc(d.to && d.to.label || 'After') + '</text>' +
        '<line x1="' + x0 + '" y1="' + (top - 8) + '" x2="' + x0 + '" y2="' + (bot + 4) + '" stroke="' + T.line + '" stroke-width="2"/><line x1="' + x1 + '" y1="' + (top - 8) + '" x2="' + x1 + '" y2="' + (bot + 4) + '" stroke="' + T.line + '" stroke-width="2"/>';
      const ord = this.items.slice().sort((a, b) => (a.i === this.sel) - (b.i === this.sel));
      ord.forEach(t => {
        const dir = this._dir(t), c = dir === 'up' ? T.accent : dir === 'down' ? DOWN : T.muted, on = this.sel === t.i, shown = this._shown(t);
        const op = !shown ? 0.12 : this.sel != null && !on ? 0.3 : 1, la = narrow ? fmtNum(t.a, d) : fitText(t.label, L - 70, fs) + '  ' + fmtNum(t.a, d), lb = fmtNum(t.b, d) + '  ' + fitText(t.label, R - 62, fs);
        s += '<g class="dk-hot" tabindex="' + (shown ? 0 : -1) + '" role="button" data-k="' + t.i + '" aria-pressed="' + on + '" aria-label="' + esc(t.label + ': ' + fmtNum(t.a, d) + ' to ' + fmtNum(t.b, d) + ', ' + this._chg(t)) + '" opacity="' + op + '">' +
          '<line x1="' + x0 + '" y1="' + f1(sy(t.a)) + '" x2="' + x1 + '" y2="' + f1(sy(t.b)) + '" stroke="' + c + '" stroke-width="' + (on ? 4.5 : 2.5) + '" stroke-linecap="round"/>' +
          '<line x1="' + x0 + '" y1="' + f1(sy(t.a)) + '" x2="' + x1 + '" y2="' + f1(sy(t.b)) + '" stroke="transparent" stroke-width="14"/>' +
          '<circle cx="' + x0 + '" cy="' + f1(sy(t.a)) + '" r="4.5" fill="' + c + '"/><circle cx="' + x1 + '" cy="' + f1(sy(t.b)) + '" r="4.5" fill="' + c + '"/>' +
          '<text x="' + (x0 - 10) + '" y="' + f1(ya[t.i] + 4) + '" text-anchor="end" font-size="' + fs + '" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(la) + '</text>' +
          '<text x="' + (x1 + 10) + '" y="' + f1(yb[t.i] + 4) + '" font-size="' + fs + '" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(narrow ? fitText(lb, R - 14, fs) : lb) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.from && d.from.label || 'Before') + ' to ' + (d.to && d.to.label || 'After') + ': ' + this.items.map(t => t.label + ' ' + this._chg(t)).join(', '));
      this._paint(this.$svg, s);
      this.el.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === this.filter)));
      const t = this.sel != null ? this.items[this.sel] : null;
      if (t) { this.$note.innerHTML = '<b>' + esc(t.label) + '</b> went from ' + esc(fmtNum(t.a, d)) + ' to ' + esc(fmtNum(t.b, d)) + ': ' + esc(this._chg(t)) + '.' + (t.note ? ' ' + esc(t.note) : ''); return; }
      const rel = x => (x.a ? (x.b - x.a) / Math.abs(x.a) : 0), up = this.items.filter(x => x.b > x.a), dn = this.items.filter(x => x.b < x.a);
      const best = up.slice().sort((p, q2) => rel(q2) - rel(p))[0], worst = dn.slice().sort((p, q2) => rel(p) - rel(q2))[0];
      this.$note.innerHTML = '<b>' + up.length + ' of ' + this.items.length + '</b> went up' + (dn.length ? ', ' + dn.length + ' went down' : '') + '.' +
        (best ? ' Biggest rise: <b>' + esc(best.label) + '</b>, ' + esc(this._chg(best)) + '.' : '') + (worst ? ' Biggest fall: <b>' + esc(worst.label) + '</b>, ' + esc(this._chg(worst)) + '.' : '') + ' Tap a line for detail.';
    }
  }

  /* ======================================================================================
   * Pathfinder: one question at a time to the right result, with a map of the path
   * data = { title?, start, nodes:{ id: { q, help?, options:[{label, hint?, to}] } | { result, text?, link?, linkLabel? } } }
   * options: { map: true }
   * ====================================================================================== */
  class Pathfinder extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { map: true });
      this.nodes = data.nodes; this.path = [{ node: data.start }];
      el.innerHTML = '<ol class="pf-trail" aria-label="Your answers so far"></ol><div class="pf-body" aria-live="polite"></div>' + (this.o.map ? '<svg class="pf-map" role="img"></svg>' : '');
      this.$trail = el.querySelector('.pf-trail'); this.$body = el.querySelector('.pf-body'); this.$svg = el.querySelector('.pf-map');
      this.$trail.addEventListener('click', e => { const b = e.target.closest('[data-back]'); if (b) this.back(+b.dataset.back); });
      this.$body.addEventListener('click', e => {
        const o = e.target.closest('[data-opt]'); if (o) return this.answer(+o.dataset.opt);
        if (e.target.closest('[data-restart]')) return this.restart();
        const h = e.target.closest('[data-help]'); if (h) { const p = this.$body.querySelector('.pf-pop'); p.hidden = !p.hidden; h.setAttribute('aria-expanded', String(!p.hidden)); }
      });
      if (this.$svg) this._hotMap();
      this._onKey = e => { if (e.key === 'Escape') { const p = this.$body.querySelector('.pf-pop'); if (p && !p.hidden) { p.hidden = true; } } };
      el.addEventListener('keydown', this._onKey);
      this._layout(); this.render();
    }
    _hotMap() {
      this.$svg.addEventListener('click', e => { const g = e.target.closest('.dk-hot'); if (g) this.back(+g.dataset.k); });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('.dk-hot'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.back(+g.dataset.k); } });
    }
    /** Lay the question tree out in levels (breadth first from the start). */
    _layout() {
      const lv = {}, order = [], seen = new Set([this.data.start]), queue = [this.data.start]; lv[this.data.start] = 0;
      while (queue.length) { const id = queue.shift(), n = this.nodes[id]; order.push(id); (n && n.options || []).forEach(o => { if (!seen.has(o.to)) { seen.add(o.to); lv[o.to] = lv[id] + 1; queue.push(o.to); } }); }
      this.lv = lv; this.order = order; this.depth = Math.max(...order.map(id => lv[id])) + 1;
      const xs = {}, done = new Set(); let leaf = 0;
      const place = id => {
        done.add(id); const kids = (this.nodes[id] && this.nodes[id].options || []).map(o => o.to).filter(k => lv[k] === lv[id] + 1 && !done.has(k));
        if (!kids.length) { xs[id] = leaf++; return; }
        kids.forEach(place); xs[id] = (xs[kids[0]] + xs[kids[kids.length - 1]]) / 2;
      };
      place(this.data.start); this.xs = xs; this.leaves = Math.max(1, leaf);
    }
    get current() { return this.path[this.path.length - 1].node; }
    answer(i) {
      const id = this.current, n = this.nodes[id], o = n && n.options && n.options[i]; if (!o) return;
      this.path[this.path.length - 1].choice = i; this.path.push({ node: o.to });
      this.render(true); this._emit('answer', { node: id, option: o.label, to: o.to });
      const r = this.nodes[o.to]; if (r && r.result) this._emit('result', { id: o.to, result: r.result, path: this.path.slice(0, -1).map(p => ({ node: p.node, option: this.nodes[p.node].options[p.choice].label })) });
    }
    back(k) { if (k < 0 || k >= this.path.length - 1) return; this.path = this.path.slice(0, k + 1); delete this.path[k].choice; this.render(true); this._emit('back', { node: this.current }); }
    restart() { this.path = [{ node: this.data.start }]; this.render(true); this._emit('back', { node: this.current }); }
    getState() { return { answers: this.path.slice(0, -1).map(p => p.choice) }; }
    setState(s) { this.path = [{ node: this.data.start }]; (s && s.answers || []).forEach(i => { const n = this.nodes[this.current], o = n && n.options && n.options[i]; if (o) { this.path[this.path.length - 1].choice = i; this.path.push({ node: o.to }); } }); this.render(); }
    render(focus) {
      const n = this.nodes[this.current] || { result: 'Not found', text: 'This step is missing from the data.' }, step = this.path.length;
      this.$trail.innerHTML = this.path.slice(0, -1).map((p, k) => { const q = this.nodes[p.node]; return '<li><button type="button" data-back="' + k + '" aria-label="' + esc('Change your answer to: ' + q.q) + '"><b>' + esc(q.options[p.choice].label) + '</b> ✎</button></li>'; }).join('');
      this.$trail.hidden = step < 2;
      if (n.result) {
        this.$body.innerHTML = '<div class="pf-card"><span class="pf-step">Result after ' + (step - 1) + ' answer' + (step === 2 ? '' : 's') + '</span><p class="pf-result" tabindex="-1">' + esc(n.result) + '</p>' + (n.text ? '<p class="pf-text">' + esc(n.text) + '</p>' : '') +
          '<div class="pf-actions">' + (n.link ? '<a href="' + esc(n.link) + '">' + esc(n.linkLabel || 'Open') + '</a>' : '') + '<button type="button" class="dk-btn" data-restart>Start again</button></div></div>';
      } else {
        this.$body.innerHTML = '<div class="pf-card"><span class="pf-step">Question ' + step + '</span><p class="pf-q" tabindex="-1"><span style="flex:1">' + esc(n.q) + '</span>' +
          (n.help ? '<span class="pf-help"><button type="button" data-help aria-expanded="false" aria-label="Why this question?">?</button><span class="pf-pop" role="tooltip" hidden>' + esc(n.help) + '</span></span>' : '') + '</p>' +
          '<div class="pf-opts">' + n.options.map((o, i) => '<button type="button" class="pf-opt" data-opt="' + i + '">' + esc(o.label) + (o.hint ? '<span>' + esc(o.hint) + '</span>' : '') + '</button>').join('') + '</div>' +
          (step > 1 ? '<div class="pf-actions"><button type="button" class="dk-btn" data-restart>Start again</button></div>' : '') + '</div>';
      }
      if (focus) { const h = this.$body.querySelector('[tabindex="-1"]'); h && h.focus({ preventScroll: true }); }
      if (this.$svg) this._map();
    }
    _map() {
      const T = themeOf(this.el), W = Math.max(260, this.$svg.clientWidth || 600), byLv = [];
      this.order.forEach(id => { (byLv[this.lv[id]] = byLv[this.lv[id]] || []).push(id); });
      const rowH = 34, H = this.depth * rowH + 6, pos = {};
      byLv.forEach((ids, l) => ids.forEach(id => { pos[id] = { x: ((this.xs[id] + 0.5) / this.leaves) * (W - 20) + 10, y: l * rowH + 16 }; }));
      const onPath = new Set(this.path.map(p => p.node)), edges = new Set(); this.path.slice(0, -1).forEach(p => edges.add(p.node + '>' + this.nodes[p.node].options[p.choice].to));
      let s = '';
      this.order.forEach(id => (this.nodes[id] && this.nodes[id].options || []).forEach(o => {
        const a = pos[id], b = pos[o.to]; if (!b) return; const hot = edges.has(id + '>' + o.to);
        s += '<path d="M' + f1(a.x) + ' ' + f1(a.y) + ' C' + f1(a.x) + ' ' + f1(a.y + rowH / 2) + ' ' + f1(b.x) + ' ' + f1(b.y - rowH / 2) + ' ' + f1(b.x) + ' ' + f1(b.y) + '" fill="none" stroke="' + (hot ? T.accent : T.line) + '" stroke-width="' + (hot ? 3 : 1.5) + '"/>';
      }));
      this.order.forEach(id => {
        const p = pos[id], n = this.nodes[id] || {}, cur = id === this.current, k = this.path.findIndex(x => x.node === id), back = k >= 0 && k < this.path.length - 1;
        const dot = '<circle cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="' + (cur ? 8 : 5.5) + '" fill="' + (onPath.has(id) ? T.accent : n.result ? T.surface : T.line) + '" stroke="' + (cur ? T.fg : n.result ? T.muted : 'none') + '" stroke-width="' + (cur ? 2.5 : 1.2) + '"/>';
        s += back ? '<g class="dk-hot" tabindex="0" role="button" data-k="' + k + '" aria-label="' + esc('Go back to: ' + (n.q || n.result)) + '">' + dot + '<circle cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="14" fill="transparent"/><title>' + esc(n.q || n.result) + '</title></g>' : '<g>' + dot + '<title>' + esc(n.q || n.result) + '</title></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Map of the questions: step ' + this.path.length + ' of at most ' + this.depth + '. Answered steps can be tapped to go back.');
      this.$svg.innerHTML = s;
    }
    destroy() { this.el.removeEventListener('keydown', this._onKey); super.destroy(); }
  }

  /* ======================================================================================
   * Radar: profiles on several measures; switch profiles on and off
   * data = { axes:[{id,label,max?,prefix?,suffix?}], series:[{id,label,values:{axisId:number},color?}], show?:[seriesId] }
   * ====================================================================================== */
  class Radar extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.axes = data.axes.map((a, i) => Object.assign({ i }, a));
      this.series = data.series.map((s, i) => Object.assign({ i }, s));
      this.on_ = new Set(data.show || this.series.slice(0, 2).map(s => s.id));
      this.sel = null;
      el.innerHTML = '<div class="dk-bar" role="group" aria-label="Profiles to show"></div><svg role="img"></svg><p class="dk-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.dk-bar'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dk-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) this.toggle(b.dataset.s); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { axis: this.axes[this.sel].id }); });
      this.render();
    }
    toggle(id) {
      if (this.on_.has(id)) { if (this.on_.size > 1) this.on_.delete(id); } else this.on_.add(id);
      this.render(); this._emit('change', { visible: [...this.on_] });
    }
    _max(a) { return a.max != null ? +a.max : Math.max(...this.series.map(s => +s.values[a.id] || 0)) || 1; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 600), narrow = W < 520, S = Math.min(W, 480), H = S, cx = W / 2, cy = S / 2 + 2, R = S * (narrow ? 0.27 : 0.34);
      const n = this.axes.length, ang = i => (i / n) * TAU - Math.PI / 2, P = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
      let s = '';
      [0.25, 0.5, 0.75, 1].forEach(k => { s += '<polygon points="' + this.axes.map((a, i) => P(i, R * k).map(f1).join(',')).join(' ') + '" fill="none" stroke="' + T.line + '" stroke-width="' + (k === 1 ? 1.5 : 1) + '"/>'; });
      this.axes.forEach((a, i) => { const [x, y] = P(i, R); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(x) + '" y2="' + f1(y) + '" stroke="' + (this.sel === i ? T.fg : T.line) + '" stroke-width="' + (this.sel === i ? 2 : 1) + '"/>'; });
      const vis = this.series.filter(x => this.on_.has(x.id));
      vis.forEach(se => {
        const c = colorFor(this.el, se, se.i), pts = this.axes.map((a, i) => P(i, R * clamp((+se.values[a.id] || 0) / this._max(a), 0, 1)));
        s += '<polygon points="' + pts.map(p => p.map(f1).join(',')).join(' ') + '" fill="' + c + '" fill-opacity=".18" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round"/>' + pts.map(p => '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="3.5" fill="' + c + '"/>').join('');
      });
      const fs = narrow ? 11 : 12.5;
      this.axes.forEach((a, i) => {
        const [x, y] = P(i, R + (narrow ? 16 : 20)), cos = Math.cos(ang(i)), anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end', on = this.sel === i;
        const room = anchor === 'middle' ? W * 0.5 : anchor === 'start' ? W - x - 4 : x - 4;
        s += '<g class="dk-hot" tabindex="0" role="button" data-k="' + i + '" aria-pressed="' + on + '" aria-label="' + esc(a.label + ': compare') + '"><rect x="' + f1(anchor === 'start' ? x - 4 : anchor === 'end' ? x - Math.min(room, a.label.length * fs * 0.58) - 4 : x - 50) + '" y="' + f1(y - fs) + '" width="' + f1(anchor === 'middle' ? 100 : Math.min(room, a.label.length * fs * 0.58) + 8) + '" height="' + (fs + 10) + '" rx="6" fill="' + (on ? T.accent : 'transparent') + '" opacity="' + (on ? 0.14 : 1) + '"/>' +
          '<text x="' + f1(x) + '" y="' + f1(y + 4) + '" text-anchor="' + anchor + '" font-size="' + fs + '" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + wrap2(a.label, room, fs).map((ln, k) => '<tspan x="' + f1(x) + '" dy="' + (k ? fs + 2 : 0) + '">' + esc(ln) + '</tspan>').join('') + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', vis.map(se => se.label + ': ' + this.axes.map(a => a.label + ' ' + fmtNum(+se.values[a.id], a)).join(', ')).join('. '));
      this._paint(this.$svg, s);
      this.$bar.innerHTML = this.series.map(se => '<button type="button" class="dk-btn" data-s="' + esc(se.id) + '" aria-pressed="' + this.on_.has(se.id) + '"><i style="background:' + esc(colorFor(this.el, se, se.i)) + '"></i>' + esc(se.label) + '</button>').join('');
      if (this.sel != null) {
        const a = this.axes[this.sel], r = vis.slice().sort((p, q) => (+q.values[a.id] || 0) - (+p.values[a.id] || 0));
        this.$note.innerHTML = '<b>' + esc(a.label) + '</b>: ' + r.map((se, k) => (k ? '' : '<b>') + esc(se.label + ' ' + fmtNum(+se.values[a.id], a)) + (k ? '' : '</b>')).join(', ') + '.';
      } else {
        this.$note.innerHTML = vis.map(se => { const top = this.axes.slice().sort((p, q) => (+se.values[q.id] || 0) / this._max(q) - (+se.values[p.id] || 0) / this._max(p))[0]; return '<b>' + esc(se.label) + '</b> is strongest on ' + esc(top.label.toLowerCase()); }).join('; ') + '. Tap a measure to compare, or switch profiles above.';
      }
    }
  }

  /* ======================================================================================
   * Pyramid: two groups back to back, row by row
   * data = { left:{label,color?}, right:{label,color?}, rowLabel?, prefix?, suffix?, rows:[{label,left,right,note?}] }
   * options: { mode: 'count' | 'share' }
   * ====================================================================================== */
  class Pyramid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: 'count' });
      this.rows = data.rows.map((r, i) => Object.assign({ i }, r, { left: +r.left, right: +r.right }));
      this.mode = this.o.mode; this.sel = null;
      el.innerHTML = '<div class="dk-bar" role="group" aria-label="Show as"><button type="button" class="dk-btn" data-m="count">Numbers</button><button type="button" class="dk-btn" data-m="share">Share of all</button></div><svg role="img"></svg><p class="dk-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dk-note');
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { this.mode = b.dataset.m; this.render(); this._emit('mode', { mode: this.mode }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const r = this.rows[this.sel]; this._emit('select', { row: r.label, left: r.left, right: r.right }); } });
      this.render();
    }
    _v(n) { const tot = this.rows.reduce((s, r) => s + r.left + r.right, 0) || 1; return this.mode === 'share' ? (100 * n) / tot : n; }
    _f(n) { return this.mode === 'share' ? fmtNum(this._v(n), { decimals: 1, suffix: '%' }) : fmtNum(n, this.data); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520;
      const mid = narrow ? 54 : 76, rowH = narrow ? 22 : 24, top = 26, H = top + this.rows.length * rowH + 6, half = (W - mid) / 2, valW = narrow ? 42 : 56;
      const max = Math.max(...this.rows.map(r => Math.max(r.left, r.right))) || 1, bw = v => (v / max) * (half - valW);
      const cl = colorFor(this.el, Object.assign({ id: 'left' }, d.left), 0), cr = colorFor(this.el, Object.assign({ id: 'right' }, d.right), 1);
      let s = '<text x="' + f1(half - 4) + '" y="14" text-anchor="end" font-size="12.5" font-weight="800" fill="' + cl + '">← ' + esc(d.left && d.left.label || 'Left') + '</text>' +
        '<text x="' + f1(half + mid + 4) + '" y="14" font-size="12.5" font-weight="800" fill="' + cr + '">' + esc(d.right && d.right.label || 'Right') + ' →</text>';
      const ord = this.rows.slice();
      ord.forEach(r => {
        const y = top + r.i * rowH, on = this.sel === r.i, dim = this.sel != null && !on, wl = bw(r.left), wr = bw(r.right), h = rowH - 5;
        s += '<g class="dk-hot" tabindex="0" role="button" data-k="' + r.i + '" aria-pressed="' + on + '" aria-label="' + esc((d.rowLabel ? d.rowLabel + ' ' : '') + r.label + ': ' + (d.left && d.left.label || 'Left') + ' ' + this._f(r.left) + ', ' + (d.right && d.right.label || 'Right') + ' ' + this._f(r.right)) + '" opacity="' + (dim ? 0.4 : 1) + '">' +
          '<rect x="0" y="' + (y - 2) + '" width="' + W + '" height="' + rowH + '" fill="' + (on ? T.line : 'transparent') + '" opacity=".5"/>' +
          '<rect x="' + f1(half - wl) + '" y="' + y + '" width="' + f1(Math.max(1, wl)) + '" height="' + h + '" rx="3" fill="' + cl + '"/>' +
          '<rect x="' + f1(half + mid) + '" y="' + y + '" width="' + f1(Math.max(1, wr)) + '" height="' + h + '" rx="3" fill="' + cr + '"/>' +
          '<text x="' + f1(half + mid / 2) + '" y="' + f1(y + h / 2 + 4) + '" text-anchor="middle" font-size="' + (narrow ? 11 : 12) + '" font-weight="700" fill="' + T.fg + '" font-family="' + esc(T.mono) + '">' + esc(r.label) + '</text>' +
          '<text x="' + f1(half - wl - 5) + '" y="' + f1(y + h / 2 + 4) + '" text-anchor="end" font-size="11" font-weight="600" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(this._f(r.left)) + '</text>' +
          '<text x="' + f1(half + mid + wr + 5) + '" y="' + f1(y + h / 2 + 4) + '" font-size="11" font-weight="600" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(this._f(r.right)) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.left && d.left.label || 'Left') + ' and ' + (d.right && d.right.label || 'Right') + ' by ' + (d.rowLabel || 'row') + ': ' + this.rows.map(r => r.label + ' ' + this._f(r.left) + ' and ' + this._f(r.right)).join(', '));
      this._paint(this.$svg, s);
      this.el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === this.mode)));
      const L = d.left && d.left.label || 'Left', Rl = d.right && d.right.label || 'Right';
      if (this.sel != null) {
        const r = this.rows[this.sel], tot = r.left + r.right;
        this.$note.innerHTML = '<b>' + esc((d.rowLabel ? d.rowLabel + ' ' : '') + r.label) + '</b>: ' + esc(L + ' ' + this._f(r.left) + ', ' + Rl + ' ' + this._f(r.right)) + ' (' + esc(L) + ' ' + pct(r.left, tot) + '% of this row).' + (r.note ? ' ' + esc(r.note) : '');
      } else {
        const tl = this.rows.reduce((s2, r) => s2 + r.left, 0), tr = this.rows.reduce((s2, r) => s2 + r.right, 0), big = this.rows.slice().sort((p, q) => (q.left + q.right) - (p.left + p.right))[0];
        this.$note.innerHTML = 'In all: <b>' + esc(L) + ' ' + esc(fmtNum(tl, d)) + '</b> and <b>' + esc(Rl) + ' ' + esc(fmtNum(tr, d)) + '</b>. The largest row is <b>' + esc(big.label) + '</b>. Tap a row for detail.';
      }
    }
  }

  return { Dropoff, Quadrant, Slope, Pathfinder, Radar, Pyramid, spread };
});
