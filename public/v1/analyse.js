/*! Analyse 1.0 · Dimau Infographics
 *  Six formats for reading change, risk and priorities:
 *    Bubbletrail   bubbles that move through the years (across, up, size); press play, or tap one to see its trail.
 *    Fanchart      a forecast with its uncertainty: the likely line and the ranges it could fall in.
 *    Rangebars     the low and the high of each period as floating bars, with the average.
 *    Pareto        the few that make up most: sorted bars with a running total; slide to the share you care about.
 *    Parallelaxes  many things on several measures at once, one line each; tap a measure to keep only the better half.
 *    Radialbars    bars around a circle, for many categories in a small space; sort or tap.
 *
 *  new Bubbletrail(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Bubbletrail', 'Fanchart', 'Rangebars', 'Pareto', 'Parallelaxes', 'Radialbars'].forEach(function (k) { root[k] = m[k]; }); root.DimauAnalyse = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#c2563a', '#6a7f2a', '#a04f9a', '#2a6f97', '#b05a2c', '#557a95', '#9a6a2f', '#2f8f6f'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmt = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 1 }) + (o.suffix || '') : '–'; };
  const pct = n => Math.round(n * 100) + '%';
  const TAU = Math.PI * 2;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }
  const fmtOf = o => ({ prefix: o.prefix, suffix: o.suffix != null ? o.suffix : o.unit ? ' ' + o.unit : '', decimals: o.decimals });

  const STYLE = `
.du{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.du) button{font:inherit;color:inherit}
.du :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.du svg{display:block;width:100%}
.du svg [data-k]{cursor:pointer}
.du svg [data-k]:focus{outline:none}
.du svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:3}
.du-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.du-bar .du-lab{font-size:13px;font-weight:700;color:var(--di-muted,#4f6578);margin-right:2px}
.du-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.du-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.du-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.du-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.du-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.du-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700}
.du-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.du-play{display:flex;gap:10px;align-items:center;margin:0 0 10px}
.du-play .du-range{flex:1;margin:0}
.du-bub{transition:transform .55s ease}
@media (prefers-reduced-motion:reduce){.du-bub{transition:none}}
`;
  function injectStyle() {
    if (document.getElementById('du-style')) return;
    const s = document.createElement('style'); s.id = 'du-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('du');
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
    _seg(name, attr, opts, cur) { return '<div class="du-bar" role="group" aria-label="' + esc(name) + '"><span class="du-lab">' + esc(name) + '</span>' + opts.map(([v, l]) => '<button type="button" class="du-btn" data-' + attr + '="' + esc(v) + '" aria-pressed="' + (v === cur) + '">' + esc(l) + '</button>').join('') + '</div>'; }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._stop && this._stop(); this.el.innerHTML = ''; this.el.classList.remove('du'); }
  }

  /* ======================================================================================
   * Bubbletrail: bubbles moving through periods
   * data = { x:{label,unit?,prefix?,log?}, y:{label,unit?,prefix?}, size:{label,unit?}, periods:[...], groups?:[{id,label}],
   *          items:[{id,label,group?,values:[[x,y,size] per period]}] }  options: { period: last, speed: 1200 }
   * ====================================================================================== */
  class Bubbletrail extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { period: null, speed: 1200 });
      this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g)); this.items = data.items.map((it, i) => Object.assign({ i }, it));
      this.p = this.o.period != null ? this.o.period : data.periods.length - 1; this.sel = null; this._t = null;
      const P = data.periods.length;
      el.innerHTML = '<div class="du-play"><button type="button" class="du-btn" data-play aria-pressed="false">Play</button><label class="du-range"><span>' + esc(data.periodLabel || 'Year') + ': <output></output></span><input type="range" min="0" max="' + (P - 1) + '" step="1" value="' + this.p + '"></label></div><svg role="group"></svg><div class="du-legend"></div><p class="du-note" aria-live="polite"></p>';
      this.$play = el.querySelector('[data-play]'); this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.du-legend'); this.$note = el.querySelector('.du-note');
      this.$in.addEventListener('input', () => { this._stop(); this.go(+this.$in.value); });
      this.$play.onclick = () => (this._t ? this._stop() : this.play());
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items[this.sel].id }); });
      const all = (k) => this.items.flatMap(it => it.values.map(v => +v[k]).filter(isFinite));
      this._x = all(0); this._y = all(1); this._s = Math.max(...all(2));
      this.render();
    }
    go(p) { this.p = clamp(p, 0, this.data.periods.length - 1); this.$in.value = this.p; this.render(); this._emit('period', { period: this.data.periods[this.p] }); }
    play() { if (this.p >= this.data.periods.length - 1) this.go(0); this.$play.textContent = 'Pause'; this.$play.setAttribute('aria-pressed', 'true'); this._t = setInterval(() => { if (this.p >= this.data.periods.length - 1) return this._stop(); this.go(this.p + 1); }, reduced() ? this.o.speed * 1.5 : this.o.speed); }
    _stop() { if (this._t) clearInterval(this._t); this._t = null; if (this.$play) { this.$play.textContent = 'Play'; this.$play.setAttribute('aria-pressed', 'false'); } }
    _gc(it) { const g = this.groups.find(x => x.id === it.group); return g ? colorFor(this.el, g, g.i) : colorFor(this.el, it, it.i); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 320 : 400, pl = narrow ? 42 : 56, pr = 14, pt = 14, pb = 40;
      const lg = !!d.x.log, xl0 = Math.min(...this._x), xh0 = Math.max(...this._x), yl0 = Math.min(0, ...this._y), yh0 = Math.max(...this._y) * 1.08;
      const tx = v => (lg ? Math.log10(v) : v), xl = lg ? Math.floor(tx(xl0)) : xl0 - (xh0 - xl0) * 0.05, xh = lg ? Math.ceil(tx(xh0)) : xh0 + (xh0 - xl0) * 0.05;
      const sx = v => pl + ((tx(v) - xl) / (xh - xl)) * (W - pl - pr), sy = v => H - pb - ((v - yl0) / (yh0 - yl0)) * (H - pt - pb), sr = v => 3 + Math.sqrt(Math.max(0, v) / this._s) * (narrow ? 22 : 32);
      const FX = fmtOf(d.x), FY = fmtOf(d.y), FS = fmtOf(d.size);
      let s = '';
      ticks(yl0, yh0, 5).forEach(v => { s += '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: FY.prefix, decimals: FY.decimals })) + '</text>'; });
      const xt = lg ? Array.from({ length: xh - xl + 1 }, (_, k) => Math.pow(10, xl + k)) : ticks(xl, xh, narrow ? 4 : 6);
      xt.forEach(v => { s += '<line x1="' + f1(sx(v)) + '" y1="' + pt + '" x2="' + f1(sx(v)) + '" y2="' + (H - pb) + '" stroke="' + T.line + '"/><text x="' + f1(clamp(sx(v), pl + 10, W - 16)) + '" y="' + (H - pb + 15) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: FX.prefix, decimals: FX.decimals })) + '</text>'; });
      s += '<text x="' + f1((pl + W - pr) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + T.muted + '">' + esc(d.x.label + (lg ? ' (each step ×10)' : '')) + ' →</text><text x="' + (pl + 6) + '" y="' + (pt + 10) + '" font-size="11.5" font-weight="700" fill="' + T.muted + '">↑ ' + esc(d.y.label) + '</text>';
      s += '<text x="' + (W - pr - 8) + '" y="' + f1(H - pb - 12) + '" text-anchor="end" font-size="' + (narrow ? 40 : 64) + '" font-weight="800" fill="' + T.line + '" opacity=".8" pointer-events="none">' + esc(d.periods[this.p]) + '</text>';
      if (this.sel != null) { const it = this.items[this.sel], pts = it.values.slice(0, this.p + 1).filter(v => isFinite(+v[0]) && isFinite(+v[1])); s += '<path d="' + pts.map((v, k) => (k ? 'L' : 'M') + f1(sx(+v[0])) + ' ' + f1(sy(+v[1]))).join(' ') + '" fill="none" stroke="' + this._gc(it) + '" stroke-width="2" stroke-dasharray="4 3" pointer-events="none"/>' + pts.slice(0, -1).map(v => '<circle cx="' + f1(sx(+v[0])) + '" cy="' + f1(sy(+v[1])) + '" r="3" fill="' + this._gc(it) + '" pointer-events="none"/>').join(''); }
      const order = this.items.slice().sort((a, b) => (+b.values[this.p][2] || 0) - (+a.values[this.p][2] || 0));
      order.forEach(it => {
        const v = it.values[this.p]; if (!v || !isFinite(+v[0]) || !isFinite(+v[1])) return;
        const on = this.sel === it.i, dim = this.sel != null && !on, r = sr(+v[2]), x = sx(+v[0]), y = sy(+v[1]);
        s += '<g data-k="' + it.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(it.label + ' in ' + d.periods[this.p] + ': ' + d.x.label + ' ' + fmt(+v[0], FX) + ', ' + d.y.label + ' ' + fmt(+v[1], FY) + ', ' + d.size.label + ' ' + fmt(+v[2], FS)) + '" class="du-bub" style="transform:translate(' + f1(x) + 'px,' + f1(y) + 'px)" opacity="' + (dim ? 0.3 : 1) + '"><circle r="' + f1(r) + '" fill="' + this._gc(it) + '" fill-opacity=".75" stroke="' + (on ? T.fg : T.surface) + '" stroke-width="' + (on ? 2.5 : 1.2) + '"/>' +
          (on || r > 14 ? '<text y="' + f1(-r - 4) + '" text-anchor="middle" font-size="11" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3" stroke-linejoin="round" pointer-events="none">' + esc(it.label) + '</text>' : '') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', d.y.label + ' against ' + d.x.label + ' in ' + d.periods[this.p] + ', bubble size ' + d.size.label);
      // keep the bubbles' nodes so they glide between periods
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g'); tmp.innerHTML = s;
      const old = {}; this.$svg.querySelectorAll('g.du-bub').forEach(g => { old[g.dataset.k] = g; });
      const a = document.activeElement, keepK = a && this.$svg.contains(a) && a.dataset ? a.dataset.k : null;
      this.$svg.innerHTML = '';
      [...tmp.childNodes].forEach(n => { if (n.classList && n.classList.contains('du-bub') && old[n.dataset.k]) { const g = old[n.dataset.k]; g.setAttribute('style', n.getAttribute('style')); g.setAttribute('opacity', n.getAttribute('opacity')); g.setAttribute('aria-label', n.getAttribute('aria-label')); g.setAttribute('aria-pressed', n.getAttribute('aria-pressed')); g.innerHTML = n.innerHTML; this.$svg.appendChild(g); } else this.$svg.appendChild(n); });
      if (keepK != null) { const g = this.$svg.querySelector('[data-k="' + keepK + '"]'); g && g.focus({ preventScroll: true }); }
      this.$out.textContent = d.periods[this.p];
      this.$leg.innerHTML = this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + ';border-radius:50%"></i>' + esc(g.label) + '</span>').join('') + '<span>Bubble size: ' + esc(d.size.label) + '</span>';
      if (this.sel != null) {
        const it = this.items[this.sel], a0 = it.values.findIndex(v => v && isFinite(+v[1])), v0 = it.values[a0], v1 = it.values[this.p], dx = +v1[0] - +v0[0], dy = +v1[1] - +v0[1];
        this.$note.innerHTML = '<b>' + esc(it.label) + '</b> in ' + esc(d.periods[this.p]) + ': ' + esc(d.x.label.toLowerCase()) + ' ' + fmt(+v1[0], FX) + ', ' + esc(d.y.label.toLowerCase()) + ' ' + fmt(+v1[1], FY) + ', ' + esc(d.size.label.toLowerCase()) + ' ' + fmt(+v1[2], FS) + '.' + (this.p > a0 ? ' Since ' + esc(d.periods[a0]) + ': ' + esc(d.x.label.toLowerCase()) + ' ' + (dx >= 0 ? 'up ' : 'down ') + fmt(Math.abs(dx), FX) + ', ' + esc(d.y.label.toLowerCase()) + ' ' + (dy >= 0 ? 'up ' : 'down ') + fmt(Math.abs(dy), FY) + '.' : '');
      } else {
        const now = this.items.filter(it => it.values[this.p]), top = now.reduce((a, b) => (+b.values[this.p][1] > +a.values[this.p][1] ? b : a)), gain = this.p ? now.filter(it => it.values[0]).reduce((a, b) => ((+b.values[this.p][1] - +b.values[0][1]) > (+a.values[this.p][1] - +a.values[0][1]) ? b : a)) : null;
        this.$note.innerHTML = 'In <b>' + esc(d.periods[this.p]) + '</b>, highest ' + esc(d.y.label.toLowerCase()) + ': <b>' + esc(top.label) + '</b> (' + fmt(+top.values[this.p][1], FY) + ').' + (gain ? ' Biggest rise since ' + esc(d.periods[0]) + ': <b>' + esc(gain.label) + '</b> (+' + fmt(+gain.values[this.p][1] - +gain.values[0][1], FY) + ').' : '') + ' Press play, or tap a bubble to follow its trail.';
      }
    }
  }

  /* ======================================================================================
   * Fanchart: history plus a forecast with likely ranges
   * data = { unit?, prefix?, history:[{label,value}], forecast:[{label,mid,lo50,hi50,lo90,hi90}], target?:{value,label} }  options: { wide: true }
   * ====================================================================================== */
  class Fanchart extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { wide: true });
      this.wide = !!this.o.wide; this.at = null;
      el.innerHTML = '<div class="du-bar"><button type="button" class="du-btn" data-wide aria-pressed="' + this.wide + '">Show the 9-in-10 range</button></div><svg role="slider" tabindex="0" aria-valuemin="0"></svg><div class="du-legend"></div><p class="du-note" aria-live="polite"></p>';
      this.$w = el.querySelector('[data-wide]'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.du-legend'); this.$note = el.querySelector('.du-note');
      this.$w.onclick = () => { this.wide = !this.wide; this.render(); };
      const all = this._all = data.history.map(h => ({ label: h.label, v: +h.value, h: true })).concat(data.forecast.map(f => ({ label: f.label, v: +f.mid, f })));
      this.$svg.setAttribute('aria-valuemax', String(all.length - 1));
      const at = e => { const r = this.$svg.getBoundingClientRect(), x = (e.clientX - r.left) * (this._W / r.width); this.set(Math.round((x - this._pl) / this._step)); };
      this.$svg.addEventListener('pointerdown', at); this.$svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') at(e); });
      this.$svg.addEventListener('keydown', e => { const dd = { ArrowLeft: -1, ArrowRight: 1, Home: -1e3, End: 1e3 }[e.key]; if (dd == null) return; e.preventDefault(); this.set((this.at == null ? all.length - 1 : this.at) + dd); });
      this.render();
    }
    set(i) { i = clamp(i, 0, this._all.length - 1); if (i === this.at) return; this.at = i; this.render(); const p = this._all[i]; this._emit('move', { label: p.label, value: p.v, forecast: !!p.f }); }
    render() {
      const T = themeOf(this.el), d = this.data, F = fmtOf(d), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 260 : 320, pr = 14, pt = 14, pb = 28, A = this._all, n = A.length;
      const vals = A.map(p => p.v).concat(d.forecast.flatMap(f => this.wide ? [+f.lo90, +f.hi90] : [+f.lo50, +f.hi50])).concat(d.target ? [+d.target.value] : []), lo0 = Math.min(...vals), hi0 = Math.max(...vals), pad = (hi0 - lo0) * 0.08, lo = lo0 - pad, hi = hi0 + pad;
      const pl = 12 + Math.max(...ticks(lo, hi, 5).map(v => fmt(v, { prefix: F.prefix, decimals: F.decimals }).length)) * 6.4;
      const step = this._step = (W - pl - pr) / (n - 1); this._W = W; this._pl = pl; const sx = i => pl + i * step, sy = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb), nh = d.history.length, i0 = nh - 1;
      let s = ticks(lo, hi, 5).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: F.prefix, decimals: F.decimals })) + '</text>').join('');
      s += '<rect x="' + f1(sx(i0)) + '" y="' + pt + '" width="' + f1(W - pr - sx(i0)) + '" height="' + (H - pt - pb) + '" fill="' + T.accent + '" opacity=".04"/><text x="' + f1(sx(i0) + 6) + '" y="' + (pt + 12) + '" font-size="11" font-weight="700" fill="' + T.muted + '">Forecast →</text>';
      const band = (loK, hiK, op) => { const last = A[i0].v, up = [[i0, last]].concat(d.forecast.map((f, k) => [nh + k, +f[hiK]])), dn = [[i0, last]].concat(d.forecast.map((f, k) => [nh + k, +f[loK]])).reverse(); return '<path d="M' + up.map(p => f1(sx(p[0])) + ' ' + f1(sy(p[1]))).join(' L') + ' L' + dn.map(p => f1(sx(p[0])) + ' ' + f1(sy(p[1]))).join(' L') + 'Z" fill="' + T.accent + '" opacity="' + op + '"/>'; };
      if (this.wide) s += band('lo90', 'hi90', 0.16);
      s += band('lo50', 'hi50', 0.32);
      if (d.target) s += '<line x1="' + pl + '" y1="' + f1(sy(+d.target.value)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(+d.target.value)) + '" stroke="#c2563a" stroke-width="1.5" stroke-dasharray="6 4"/><text x="' + (W - pr - 4) + '" y="' + f1(sy(+d.target.value) - 5) + '" text-anchor="end" font-size="11" font-weight="700" fill="#c2563a">' + esc(d.target.label || 'Target') + '</text>';
      s += '<path d="' + A.slice(0, nh).map((p, i) => (i ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(sy(p.v))).join(' ') + '" fill="none" stroke="' + T.fg + '" stroke-width="2.5"/><path d="M' + f1(sx(i0)) + ' ' + f1(sy(A[i0].v)) + ' ' + A.slice(nh).map((p, k) => 'L' + f1(sx(nh + k)) + ' ' + f1(sy(p.v))).join(' ') + '" fill="none" stroke="' + T.accent + '" stroke-width="2.5" stroke-dasharray="6 4"/>';
      const every = Math.ceil(n / (narrow ? 5 : 10)); A.forEach((p, i) => { if (i % every === 0 || (i === n - 1 && (n - 1) % every >= every * 0.8)) s += '<text x="' + f1(clamp(sx(i), pl + 10, W - 20)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(p.label) + '</text>'; });
      if (this.at != null) { const p = A[this.at]; s += '<line x1="' + f1(sx(this.at)) + '" y1="' + pt + '" x2="' + f1(sx(this.at)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '" stroke-width="1.2"/><circle cx="' + f1(sx(this.at)) + '" cy="' + f1(sy(p.v)) + '" r="5" fill="' + (p.f ? T.accent : T.fg) + '" stroke="' + T.surface + '" stroke-width="2"/>'; }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'History and forecast. Use the arrow keys to move along it.');
      if (this.at != null) { this.$svg.setAttribute('aria-valuenow', String(this.at)); this.$svg.setAttribute('aria-valuetext', A[this.at].label); }
      this.$svg.innerHTML = s;
      this.$w.setAttribute('aria-pressed', String(this.wide));
      this.$leg.innerHTML = '<span><i style="background:' + T.fg + ';height:3px"></i>So far</span><span><i style="background:' + T.accent + ';height:3px"></i>Most likely</span><span><i style="background:' + T.accent + ';opacity:.45"></i>1-in-2 range</span>' + (this.wide ? '<span><i style="background:' + T.accent + ';opacity:.2"></i>9-in-10 range</span>' : '');
      const last = d.forecast[d.forecast.length - 1], showF = f => 'most likely <b>' + fmt(+f.mid, F) + '</b>; an even chance it is between ' + fmt(+f.lo50, F) + ' and ' + fmt(+f.hi50, F) + ', and a 9-in-10 chance between ' + fmt(+f.lo90, F) + ' and ' + fmt(+f.hi90, F);
      if (this.at != null) { const p = A[this.at]; this.$note.innerHTML = p.f ? '<b>' + esc(p.label) + '</b> (forecast): ' + showF(p.f) + '.' : '<b>' + esc(p.label) + '</b>: ' + fmt(p.v, F) + ' (actual).'; }
      else { let tgt = ''; if (d.target) { const t = +d.target.value, up = t >= A[i0].v, k = d.forecast.findIndex(f => (up ? +f.mid >= t : +f.mid <= t)); tgt = ' ' + esc(d.target.label || 'The target') + (k < 0 ? ' is not reached in the most likely path.' : ' is most likely reached in <b>' + esc(d.forecast[k].label) + '</b>.'); } this.$note.innerHTML = 'By <b>' + esc(last.label) + '</b>: ' + showF(last) + '.' + tgt + ' Drag along the chart to read any point.'; }
    }
  }

  /* ======================================================================================
   * Rangebars: low to high per period, with an average
   * data = { unit?, prefix?, periods:[{label,lo,hi,avg?}], loLabel?, hiLabel? }
   * ====================================================================================== */
  class Rangebars extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.rows = data.periods.map((p, i) => Object.assign({ i }, p, { lo: +p.lo, hi: +p.hi, avg: p.avg == null ? null : +p.avg })); this.sel = null;
      el.innerHTML = '<svg role="group"></svg><div class="du-legend"></div><p class="du-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.du-legend'); this.$note = el.querySelector('.du-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const r = this.rows[this.sel]; this._emit('select', { label: r.label, lo: r.lo, hi: r.hi }); } });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, F = fmtOf(d), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 260 : 300, pr = 10, pt = 18, pb = 26, n = this.rows.length;
      const all = this.rows.flatMap(r => [r.lo, r.hi]), lo0 = Math.min(...all), hi0 = Math.max(...all), pad = (hi0 - lo0) * 0.1, lo = lo0 - pad, hi = hi0 + pad, pl = 12 + Math.max(...ticks(lo, hi, 5).map(v => fmt(v, F).length)) * 6.2, bw = (W - pl - pr) / n, sy = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
      let s = ticks(lo, hi, 5).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, F)) + '</text>').join('');
      const wide = this.rows.reduce((a, b) => (b.hi - b.lo > a.hi - a.lo ? b : a)), narrowR = this.rows.reduce((a, b) => (b.hi - b.lo < a.hi - a.lo ? b : a));
      if (this.rows.every(r => r.avg != null)) s += '<path d="' + this.rows.map((r, k) => (k ? 'L' : 'M') + f1(pl + (k + 0.5) * bw) + ' ' + f1(sy(r.avg))).join(' ') + '" fill="none" stroke="' + T.fg + '" stroke-width="1.2" stroke-dasharray="3 3" pointer-events="none"/>';
      this.rows.forEach((r, k) => {
        const x = pl + k * bw + bw * 0.22, w = bw * 0.56, on = this.sel === r.i, dim = this.sel != null && !on, mid = x + w / 2;
        s += '<g data-k="' + r.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(r.label + ': ' + fmt(r.lo, F) + ' to ' + fmt(r.hi, F) + (r.avg != null ? ', average ' + fmt(r.avg, F) : '')) + '" opacity="' + (dim ? 0.35 : 1) + '"><rect x="' + f1(x) + '" y="' + f1(sy(r.hi)) + '" width="' + f1(w) + '" height="' + f1(Math.max(2, sy(r.lo) - sy(r.hi))) + '" rx="' + f1(Math.min(6, w / 2)) + '" fill="' + T.accent + '" opacity="' + (on ? 1 : 0.75) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/><rect x="' + f1(pl + k * bw) + '" y="' + pt + '" width="' + f1(bw) + '" height="' + (H - pt - pb) + '" fill="transparent"/>' +
          (r.avg != null ? '<circle cx="' + f1(mid) + '" cy="' + f1(sy(r.avg)) + '" r="' + (narrow ? 3 : 4) + '" fill="' + T.surface + '" stroke="' + T.fg + '" stroke-width="1.5"/>' : '') +
          (on || (!narrow && bw > 44) ? '<text x="' + f1(mid) + '" y="' + f1(sy(r.hi) - 5) + '" text-anchor="middle" font-size="10" fill="' + T.fg + '" font-family="' + esc(T.mono) + '" pointer-events="none">' + esc(fmt(r.hi, { decimals: F.decimals })) + '</text><text x="' + f1(mid) + '" y="' + f1(sy(r.lo) + 13) + '" text-anchor="middle" font-size="10" fill="' + T.fg + '" font-family="' + esc(T.mono) + '" pointer-events="none">' + esc(fmt(r.lo, { decimals: F.decimals })) + '</text>' : '') +
          '<text x="' + f1(mid) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(narrow && n > 8 ? String(r.label).slice(0, 1) : fitText(r.label, bw, 10.5)) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Low to high for ' + n + ' periods');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = '<span><i style="background:' + T.accent + '"></i>' + esc((d.loLabel || 'Lowest') + ' to ' + (d.hiLabel || 'highest').toLowerCase()) + '</span>' + (this.rows.some(r => r.avg != null) ? '<span><i style="background:' + T.surface + ';border:1.5px solid ' + T.fg + ';border-radius:50%"></i>Average</span>' : '');
      if (this.sel != null) { const r = this.rows[this.sel]; this.$note.innerHTML = '<b>' + esc(r.label) + '</b>: ' + esc((d.loLabel || 'lowest').toLowerCase()) + ' ' + fmt(r.lo, F) + ', ' + esc((d.hiLabel || 'highest').toLowerCase()) + ' ' + fmt(r.hi, F) + (r.avg != null ? ', average ' + fmt(r.avg, F) : '') + ' — a spread of ' + fmt(r.hi - r.lo, F) + '.'; }
      else { const top = this.rows.reduce((a, b) => (b.hi > a.hi ? b : a)), bot = this.rows.reduce((a, b) => (b.lo < a.lo ? b : a)); this.$note.innerHTML = 'Highest: <b>' + esc(top.label) + '</b> (' + fmt(top.hi, F) + '). Lowest: <b>' + esc(bot.label) + '</b> (' + fmt(bot.lo, F) + '). Widest spread: ' + esc(wide.label) + ' (' + fmt(wide.hi - wide.lo, F) + '); narrowest: ' + esc(narrowR.label) + ' (' + fmt(narrowR.hi - narrowR.lo, F) + '). Tap a bar.'; }
    }
  }

  /* ======================================================================================
   * Pareto: sorted bars with a running total
   * data = { unit?, prefix?, items:[{id,label,value}] }  options: { share: 80 }
   * ====================================================================================== */
  class Pareto extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { share: 80 });
      this.items = data.items.map((it, i) => Object.assign({ i }, it, { value: +it.value })).sort((a, b) => b.value - a.value); this.share = this.o.share; this.sel = null;
      this.tot = this.items.reduce((a, b) => a + b.value, 0); let c = 0; this.items.forEach(it => { c += it.value; it.cum = c / this.tot; });
      el.innerHTML = '<label class="du-range"><span>Show the few that make up <output></output></span><input type="range" min="10" max="100" step="5" value="' + this.share + '"></label><svg role="group"></svg><p class="du-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.du-note');
      this.$in.addEventListener('input', () => { this.share = +this.$in.value; this.sel = null; this.render(); this._emit('share', { share: this.share, items: this._few().map(x => x.id) }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items.find(x => x.i === this.sel).id }); });
      this.render();
    }
    _few() { const out = []; for (const it of this.items) { out.push(it); if (it.cum * 100 >= this.share - 1e-9) break; } return out; }
    render() {
      const T = themeOf(this.el), F = fmtOf(this.data), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, n = this.items.length, H = narrow ? 300 : 320, pl = narrow ? 40 : 50, pr = 36, pt = 16, pb = narrow ? 70 : 60;
      const bw = (W - pl - pr) / n, max = this.items[0].value, sy = v => H - pb - (v / max) * (H - pt - pb), sc = c => H - pb - c * (H - pt - pb), few = this._few();
      let s = ticks(0, max, 4).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: F.prefix })) + '</text>').join('');
      [0, 0.5, 1].forEach(c => { s += '<text x="' + (W - pr + 4) + '" y="' + f1(sc(c) + 4) + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + pct(c) + '</text>'; });
      s += '<line x1="' + pl + '" y1="' + f1(sc(this.share / 100)) + '" x2="' + (W - pr) + '" y2="' + f1(sc(this.share / 100)) + '" stroke="#c2563a" stroke-dasharray="5 4"/>';
      this.items.forEach((it, k) => {
        const x = pl + k * bw, on = this.sel === it.i, inFew = few.includes(it), dim = this.sel != null ? !on : !inFew;
        s += '<g data-k="' + it.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(it.label + ': ' + fmt(it.value, F) + ', ' + pct(it.value / this.tot) + ' of the total; running total ' + pct(it.cum)) + '" opacity="' + (dim ? 0.35 : 1) + '"><rect x="' + f1(x + bw * 0.12) + '" y="' + f1(sy(it.value)) + '" width="' + f1(bw * 0.76) + '" height="' + f1(H - pb - sy(it.value)) + '" rx="2" fill="' + (inFew ? T.accent : T.muted) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/><rect x="' + f1(x) + '" y="' + pt + '" width="' + f1(bw) + '" height="' + (H - pt - pb) + '" fill="transparent"/>' +
          '<text transform="translate(' + f1(x + bw / 2 + 3) + ' ' + (H - pb + 10) + ') rotate(-40)" text-anchor="end" font-size="10.5" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(it.label, pb * 1.3, 10.5)) + '</text></g>';
      });
      s += '<path d="' + this.items.map((it, k) => (k ? 'L' : 'M') + f1(pl + (k + 0.5) * bw) + ' ' + f1(sc(it.cum))).join(' ') + '" fill="none" stroke="' + T.fg + '" stroke-width="2" pointer-events="none"/>' + this.items.map((it, k) => '<circle cx="' + f1(pl + (k + 0.5) * bw) + '" cy="' + f1(sc(it.cum)) + '" r="3" fill="' + T.fg + '" pointer-events="none"/>').join('');
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', n + ' items, largest first, with a running total');
      this._keep(this.$svg, s);
      this.$out.textContent = this.share + '%';
      const fs = few[few.length - 1].cum;
      if (this.sel != null) { const it = this.items.find(x => x.i === this.sel), rank = this.items.indexOf(it) + 1; this.$note.innerHTML = '<b>' + esc(it.label) + '</b>: ' + fmt(it.value, F) + ' (' + pct(it.value / this.tot) + ' of the total), number ' + rank + ' of ' + n + '. With everything larger, ' + pct(it.cum) + '.'; }
      else this.$note.innerHTML = '<b>' + few.length + ' of ' + n + '</b> (' + pct(few.length / n) + ' of the items) make up <b>' + pct(fs) + '</b> of the total ' + fmt(this.tot, F) + ': ' + few.map(x => esc(x.label)).join(', ') + '. The line is the running total. Slide to change the share, or tap a bar.';
    }
  }

  /* ======================================================================================
   * Parallelaxes: many items across several measures
   * data = { axes:[{id,label,unit?,prefix?,better?:'up'|'down'}], items:[{id,label,group?,values:{axisId:number}}], groups?:[{id,label}] }
   * ====================================================================================== */
  class Parallelaxes extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.axes = data.axes.map((a, i) => Object.assign({ i }, a)); this.items = data.items.map((it, i) => Object.assign({ i }, it)); this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g));
      this.axes.forEach(a => { const v = this.items.map(it => +it.values[a.id]).filter(isFinite); a.lo = Math.min(...v); a.hi = Math.max(...v); const s = v.slice().sort((x, y) => x - y); a.med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; });
      this.keep = new Set(); this.sel = null;
      el.innerHTML = '<svg role="group"></svg><div class="du-legend"></div><p class="du-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.du-legend'); this.$note = el.querySelector('.du-note');
      this._hot(this.$svg, k => {
        if (k[0] === 'a') { const id = k.slice(1); this.keep.has(id) ? this.keep.delete(id) : this.keep.add(id); this.sel = null; this.render(); this._emit('filter', { axes: [...this.keep], items: this._pass().map(x => x.id) }); return; }
        this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items[this.sel].id });
      });
      this.render();
    }
    _good(a, v) { return (a.better === 'down') ? v <= a.med : v >= a.med; }
    _pass() { return this.items.filter(it => [...this.keep].every(id => { const a = this.axes.find(x => x.id === id); return this._good(a, +it.values[id]); })); }
    _gc(it) { const g = this.groups.find(x => x.id === it.group); return g ? colorFor(this.el, g, g.i) : colorFor(this.el, it, it.i); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), m = this.axes.length, narrow = (W - 160) / (m - 1) < 104, H = narrow ? 360 : 360, pl = narrow ? 38 : 52, pr = narrow ? 54 : 110, pt = narrow ? 84 : 54, pb = 24, bw = narrow ? 70 : 96;
      const ax = k => pl + (k / (m - 1)) * (W - pl - pr), sy = (a, v) => { const t = a.hi === a.lo ? 0.5 : (v - a.lo) / (a.hi - a.lo); return pt + (a.better === 'down' ? t : 1 - t) * (H - pt - pb); };
      const pass = new Set(this._pass());
      let s = '';
      this.axes.forEach((a, k) => {
        const x = ax(k), on = this.keep.has(a.id), F = fmtOf(a), yb = sy(a, a.med);
        s += '<line x1="' + f1(x) + '" y1="' + pt + '" x2="' + f1(x) + '" y2="' + (H - pb) + '" stroke="' + T.muted + '" stroke-width="1.5"/>' + (on ? '<rect x="' + f1(x - 6) + '" y="' + f1(a.better === 'down' ? yb : pt) + '" width="12" height="' + f1(a.better === 'down' ? H - pb - yb : yb - pt) + '" rx="4" fill="' + T.accent + '" opacity=".25"/>' : '') +
          '<text x="' + f1(x) + '" y="' + (pt - 6) + '" text-anchor="middle" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(a.better === 'down' ? a.lo : a.hi, F)) + '</text><text x="' + f1(x) + '" y="' + (H - pb + 14) + '" text-anchor="middle" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(a.better === 'down' ? a.hi : a.lo, F)) + '</text>' +
          (narrow ? '<line x1="' + f1(x) + '" y1="' + (k % 2 ? 64 : 34) + '" x2="' + f1(x) + '" y2="' + (pt - 18) + '" stroke="' + T.line + '"/>' : '') + '<g data-k="a' + esc(a.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(a.label + (on ? ': showing only the better half. Tap to show all.' : ': tap to keep only the better half')) + '"><rect x="' + f1(clamp(x - bw / 2, 2, W - bw - 2)) + '" y="' + (narrow && k % 2 ? 34 : 4) + '" width="' + bw + '" height="30" rx="8" fill="' + (on ? T.accent : T.surface) + '" stroke="' + (on ? T.accent : T.line) + '"/><text x="' + f1(clamp(x, bw / 2 + 2, W - bw / 2 - 2)) + '" y="' + (narrow && k % 2 ? 53 : 23) + '" text-anchor="middle" font-size="' + (narrow ? 10.5 : 11.5) + '" font-weight="700" fill="' + (on ? T.surface : T.fg) + '">' + esc(fitText(a.label, bw - 6, narrow ? 10.5 : 11.5)) + '</text></g>';
      });
      const order = this.items.slice().sort((a, b) => (pass.has(a) - pass.has(b)) || ((a.i === this.sel) - (b.i === this.sel)));
      const ly = {}; this.items.filter(it => pass.has(it) || this.sel === it.i).map(it => [it.i, sy(this.axes[m - 1], +it.values[this.axes[m - 1].id])]).sort((a, b) => a[1] - b[1]).reduce((prev, [i, y]) => { const yy = Math.max(y, prev + 13); ly[i] = yy; return yy; }, -1e9);
      order.forEach(it => {
        const on = this.sel === it.i, ok = pass.has(it), c = this._gc(it), pts = this.axes.map((a, k) => [ax(k), sy(a, +it.values[a.id])]), last = pts[pts.length - 1];
        s += '<g data-k="' + it.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(it.label + ': ' + this.axes.map(a => a.label + ' ' + fmt(+it.values[a.id], fmtOf(a))).join(', ')) + '" opacity="' + (this.sel != null ? (on ? 1 : 0.2) : ok ? 1 : 0.12) + '"><path d="M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L') + '" fill="none" stroke="' + c + '" stroke-width="' + (on ? 4 : 2.2) + '" stroke-linejoin="round"/><path d="M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L') + '" fill="none" stroke="transparent" stroke-width="12"/>' +
          (ly[it.i] != null ? '<text x="' + f1(last[0] + 8) + '" y="' + f1(ly[it.i] + 4) + '" font-size="11" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(it.label, pr - 10, 11)) + '</text>' : '') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.items.length + ' items on ' + m + ' measures; higher on each axis is better');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</span>').join('') + '<span>Better is at the top of every axis</span>';
      if (this.sel != null) {
        const it = this.items[this.sel], ranks = this.axes.map(a => { const sorted = this.items.slice().sort((x, y) => (a.better === 'down' ? +x.values[a.id] - +y.values[a.id] : +y.values[a.id] - +x.values[a.id])); return [a, sorted.indexOf(it) + 1]; }), best = ranks.reduce((x, y) => (y[1] < x[1] ? y : x)), worst = ranks.reduce((x, y) => (y[1] > x[1] ? y : x));
        this.$note.innerHTML = '<b>' + esc(it.label) + '</b>: ' + ranks.map(([a]) => esc(a.label.toLowerCase()) + ' ' + fmt(+it.values[a.id], fmtOf(a))).join(', ') + '. Best at ' + esc(best[0].label.toLowerCase()) + ' (number ' + best[1] + ' of ' + this.items.length + '), weakest at ' + esc(worst[0].label.toLowerCase()) + ' (number ' + worst[1] + ').';
      } else if (this.keep.size) { const p = this._pass(); this.$note.innerHTML = '<b>' + p.length + ' of ' + this.items.length + '</b> are in the better half on ' + [...this.keep].map(id => esc(this.axes.find(a => a.id === id).label.toLowerCase())).join(' and ') + (p.length ? ': ' + p.map(x => esc(x.label)).join(', ') : '') + '. Tap a measure again to let everything back in.'; }
      else this.$note.innerHTML = 'One line per item across ' + m + ' measures, with better always at the top. Tap a measure to keep only the better half on it, or tap a line.';
    }
  }

  /* ======================================================================================
   * Radialbars: bars around a circle
   * data = { unit?, prefix?, items:[{id,label,value,group?}], groups?:[{id,label}], centre? }  options: { sort: 'data' }
   * ====================================================================================== */
  class Radialbars extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'data' });
      this.items = data.items.map((it, i) => Object.assign({ i }, it, { value: +it.value })); this.groups = (data.groups || []).map((g, i) => Object.assign({ i }, g)); this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="du-sortwrap"></div><svg role="group"></svg><div class="du-legend"></div><p class="du-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.du-sortwrap'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.du-legend'); this.$note = el.querySelector('.du-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; this.sort = b.dataset.sort; this.render(); this._emit('sort', { sort: this.sort }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items[this.sel].id }); });
      this.render();
    }
    _gc(it) { const g = this.groups.find(x => x.id === it.group); return g ? colorFor(this.el, g, g.i) : colorFor(this.el, it, it.i); }
    render() {
      const T = themeOf(this.el), d = this.data, F = fmtOf(d), W = Math.max(280, this.$svg.clientWidth || 600), narrow = W < 520, S = Math.min(W, narrow ? 360 : 500), cx = W / 2, cy = S / 2, R = S / 2 - (narrow ? 58 : 76), r0 = R * 0.4, n = this.items.length;
      const order = this.sort === 'size' ? this.items.slice().sort((a, b) => b.value - a.value) : this.sort === 'name' ? this.items.slice().sort((a, b) => String(a.label).localeCompare(b.label)) : this.items, max = Math.max(...this.items.map(x => x.value)), step = TAU / n, tot = this.items.reduce((a, b) => a + b.value, 0);
      let s = ticks(0, max, 3).filter(v => v > 0).map(v => '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(r0 + (v / max) * (R - r0)) + '" fill="none" stroke="' + T.line + '" stroke-dasharray="3 4"/>').join('');
      order.forEach((it, k) => {
        const a0 = k * step + step * 0.1, a1 = (k + 1) * step - step * 0.1, ro = r0 + (it.value / max) * (R - r0), on = this.sel === it.i, dim = this.sel != null && !on, am = (a0 + a1) / 2, P = (a, r) => f1(cx + Math.sin(a) * r) + ' ' + f1(cy - Math.cos(a) * r);
        const lr = R + 8, lx = cx + Math.sin(am) * lr, ly = cy - Math.cos(am) * lr, right = Math.sin(am) >= 0, deg = (am * 180) / Math.PI, rot = right ? deg - 90 : deg + 90;
        s += '<g data-k="' + it.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(it.label + ': ' + fmt(it.value, F)) + '" opacity="' + (dim ? 0.35 : 1) + '"><path d="M' + P(a0, r0) + ' L' + P(a0, ro) + ' A' + f1(ro) + ' ' + f1(ro) + ' 0 0 1 ' + P(a1, ro) + ' L' + P(a1, r0) + ' A' + f1(r0) + ' ' + f1(r0) + ' 0 0 0 ' + P(a0, r0) + 'Z" fill="' + this._gc(it) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/><path d="M' + P(a0 - step * 0.1, r0) + ' L' + P(a0 - step * 0.1, R + 4) + ' A' + f1(R + 4) + ' ' + f1(R + 4) + ' 0 0 1 ' + P(a1 + step * 0.1, R + 4) + ' L' + P(a1 + step * 0.1, r0) + 'Z" fill="transparent"/>' +
          '<text transform="translate(' + f1(lx) + ' ' + f1(ly) + ') rotate(' + f1(rot) + ')" text-anchor="' + (right ? 'start' : 'end') + '" dy="3.5" font-size="' + (narrow ? 10 : 11) + '" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '" pointer-events="none">' + esc(fitText(it.label, narrow ? 56 : 72, narrow ? 10 : 11)) + '</text></g>';
      });
      const ctr = this.sel != null ? [fmt(this.items[this.sel].value, { prefix: F.prefix }), fitText(this.items[this.sel].label, r0 * 1.7, 10.5)] : [fmt(tot, { prefix: F.prefix }), d.centre || d.unit || 'total'];
      s += '<text x="' + cx + '" y="' + f1(cy + 2) + '" text-anchor="middle" font-size="' + (narrow ? 18 : 22) + '" font-weight="800" fill="' + T.fg + '">' + esc(ctr[0]) + '</text><text x="' + cx + '" y="' + f1(cy + 17) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '">' + esc(ctr[1]) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + S); this.$svg.style.height = S + 'px';
      this.$svg.setAttribute('aria-label', n + ' bars around a circle');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = this._seg('Sort', 'sort', [['data', 'As listed'], ['size', 'Largest first'], ['name', 'A–Z']], this.sort);
      this.$leg.innerHTML = this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</span>').join('');
      const sorted = this.items.slice().sort((a, b) => b.value - a.value);
      if (this.sel != null) { const it = this.items[this.sel]; this.$note.innerHTML = '<b>' + esc(it.label) + '</b>: ' + fmt(it.value, F) + ' (' + pct(it.value / tot) + ' of the total), number ' + (sorted.indexOf(it) + 1) + ' of ' + n + '.'; }
      else { const ties = sorted.filter(x => x.value === sorted[0].value); this.$note.innerHTML = 'Largest: <b>' + ties.map(x => esc(x.label)).join(', ') + '</b> (' + fmt(sorted[0].value, F) + (ties.length > 1 ? ' each' : '') + '). Smallest: ' + esc(sorted[n - 1].label) + ' (' + fmt(sorted[n - 1].value, F) + '). Total ' + fmt(tot, F) + '. Tap a bar, or sort.'; }
    }
  }

  return { Bubbletrail, Fanchart, Rangebars, Pareto, Parallelaxes, Radialbars };
});
