/*! Guides 1.0 · Dimau Infographics
 *  Six formats that help people decide, find their way and understand:
 *    Weighscore  a decision helper: set how much each thing matters and watch the options re-rank.
 *    Routeline   a route with its stops and times, and where the bus or boat is now.
 *    Levelup     a ladder of levels: where you are, what the next level needs, and what each one unlocks.
 *    Orgchart    a top-down chart of who is in which team; open and close branches (an outline on phones).
 *    Numberline  amounts from tiny to huge on one line, with even steps for each ×10 or true to scale.
 *    Glossary    an A–Z of terms with search, letter jumps and “see also” links.
 *
 *  new Weighscore(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Weighscore', 'Routeline', 'Levelup', 'Orgchart', 'Numberline', 'Glossary'].forEach(function (k) { root[k] = m[k]; }); root.DimauGuides = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : (Math.abs(n) < 10 ? 2 : 0) }) + (o.suffix || '') : '–'; };
  const short = (v, o) => { o = o || {}; const u = [[1e9, 'bn'], [1e6, 'M'], [1e3, 'k']].find(x => Math.abs(v) >= x[0]); return (o.prefix || '') + (u ? +(v / u[0]).toFixed(1) + u[1] : (+v).toLocaleString()) + (o.suffix || ''); };
  const mins = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s)); return m ? +m[1] * 60 + +m[2] : 0; };
  const wait = m => (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' minutes');
  const hm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function spread(ys, gap, lo, hi) {
    const o = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    for (let k = 0; k < 50; k++) { let mv = false; for (let j = 1; j < o.length; j++) { const d = o[j].y - o[j - 1].y; if (d < gap) { const p = (gap - d) / 2; o[j - 1].y -= p; o[j].y += p; mv = true; } } o.forEach(e => { e.y = clamp(e.y, lo, hi); }); if (!mv) break; }
    const out = []; o.forEach(e => { out[e.i] = e.y; }); return out;
  }

  const STYLE = `
.dg{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dg) button{font:inherit;color:inherit}
.dg :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dg svg{display:block;width:100%}
.dg svg [data-k]{cursor:pointer}
.dg svg [data-k]:focus{outline:none}
.dg svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dg-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dg-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.dg-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dg-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dg-small{font-size:12.5px;color:var(--di-muted,#4f6578)}
.ws-grid{display:grid;gap:16px;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)}
.ws-grid.narrow{grid-template-columns:1fr}
.ws-w{display:grid;gap:10px}
.ws-w label{display:grid;gap:2px;font-size:13.5px;font-weight:700}
.ws-w label span{display:flex;justify-content:space-between}
.ws-w output{font:700 12px/1.4 var(--di-mono,ui-monospace,monospace);color:var(--di-accent,#0b6fa4)}
.ws-w input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.ws-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ws-row{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:10px 12px;display:grid;gap:6px;transition:transform .35s}
.ws-row.first{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 1px var(--di-accent,#0b6fa4) inset}
.ws-row header{display:flex;justify-content:space-between;gap:8px;font-weight:800}
.ws-row header span{font:700 12.5px/1.4 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
.ws-track{display:flex;height:12px;border-radius:99px;overflow:hidden;background:var(--di-line,#c9dce8)}
.ws-track i{display:block;height:100%}
@media (prefers-reduced-motion:reduce){.ws-row{transition:none}}
.lv-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.lv-item{display:grid;grid-template-columns:auto 1fr auto;gap:4px 12px;align-items:center;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:10px 12px;text-align:left;width:100%;cursor:pointer}
.lv-item.done{background:var(--di-bg,#eef7fb)}
.lv-item.now{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.lv-badge{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:800;border:2px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff)}
.lv-item.done .lv-badge,.lv-item.now .lv-badge{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.lv-item b{font-size:15px}
.lv-need{font:700 12px/1.3 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);text-align:right}
.lv-meter{grid-column:2/4;height:8px;border-radius:99px;background:var(--di-line,#c9dce8);overflow:hidden}
.lv-meter i{display:block;height:100%;background:var(--di-accent,#0b6fa4)}
.lv-perk{grid-column:2/4;font-size:13px;line-height:1.45;color:var(--di-fg,#13263a)}
.lv-perk[hidden]{display:none}
.oc-list,.oc-list ul{list-style:none;margin:0;padding:0}
.oc-list ul{margin-left:14px;padding-left:12px;border-left:1.5px solid var(--di-line,#c9dce8)}
.oc-li{display:flex;gap:8px;align-items:baseline;width:100%;text-align:left;border:0;background:none;padding:6px 8px;border-radius:8px;cursor:pointer}
.oc-li[aria-pressed="true"]{background:var(--di-bg,#eef7fb)}
.oc-li small{color:var(--di-muted,#4f6578)}
.gl-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.gl-tools input{flex:1;min-width:180px;height:38px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 12px;font:inherit;font-size:14px;color:inherit}
.gl-az{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:12px}
.gl-az button{min-width:30px;height:30px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:7px;font:700 12.5px/1 var(--di-mono,ui-monospace,monospace);cursor:pointer}
.gl-az button:disabled{opacity:.3;cursor:default}
.gl-letter{font:800 13px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-accent,#0b6fa4);margin:14px 0 6px;letter-spacing:.06em}
.gl-term{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:10px 14px;margin-bottom:8px;scroll-margin-top:90px}
.gl-term.hl{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.gl-term h5{margin:0 0 4px;font-size:15.5px}
.gl-term p{margin:0;font-size:14px;line-height:1.55}
.gl-see{margin-top:6px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.gl-see button{border:0;background:none;padding:0 2px;color:var(--di-accent,#0b6fa4);font-weight:700;cursor:pointer;text-decoration:underline}
.gl-term mark{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 22%,transparent);border-radius:3px;color:inherit}
`;
  function injectStyle() {
    if (document.getElementById('dg-style')) return;
    const s = document.createElement('style'); s.id = 'dg-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dg');
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
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dg'); }
  }

  /* ======================================================================================
   * Weighscore: set how much each criterion matters; options re-rank
   * data = { criteria:[{id,label,weight:0..5,better:'high'|'low',prefix?,suffix?,color?}], options:[{id,label,values:{critId:number},note?}] }
   * ====================================================================================== */
  class Weighscore extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.crit = data.criteria.map((c, i) => Object.assign({ i }, c, { weight: c.weight != null ? +c.weight : 3 }));
      el.innerHTML = '<div class="ws-grid"><div class="ws-w"><p class="dg-small" style="margin:0">How much does each matter to you? 0 = not at all, 5 = a lot.</p>' +
        this.crit.map(c => '<label>' + '<span>' + esc(c.label) + '<output data-o="' + esc(c.id) + '"></output></span><input type="range" min="0" max="5" step="1" value="' + c.weight + '" data-c="' + esc(c.id) + '" aria-label="' + esc('How much ' + c.label + ' matters') + '"></label>').join('') +
        '</div><ol class="ws-list" aria-live="polite"></ol></div><p class="dg-note"></p>';
      this.$grid = el.querySelector('.ws-grid'); this.$list = el.querySelector('.ws-list'); this.$note = el.querySelector('.dg-note');
      el.querySelectorAll('input[data-c]').forEach(inp => inp.addEventListener('input', () => { this.crit.find(c => c.id === inp.dataset.c).weight = +inp.value; this.render(); this._emit('change', { weights: this.getState().weights, order: this.ranking().map(r => r.o.id) }); }));
      this.render();
    }
    getState() { const w = {}; this.crit.forEach(c => { w[c.id] = c.weight; }); return { weights: w }; }
    setState(s) { Object.keys((s && s.weights) || {}).forEach(id => { const c = this.crit.find(x => x.id === id); if (c) { c.weight = clamp(+s.weights[id], 0, 5); const inp = this.el.querySelector('input[data-c="' + CSS.escape(id) + '"]'); if (inp) inp.value = c.weight; } }); this.render(); }
    ranking() {
      const tw = this.crit.reduce((s, c) => s + c.weight, 0) || 1;
      return this.data.options.map(o => {
        const parts = this.crit.map(c => {
          const vs = this.data.options.map(x => +x.values[c.id]), lo = Math.min(...vs), hi = Math.max(...vs), v = +o.values[c.id];
          let n = hi === lo ? 1 : (v - lo) / (hi - lo); if (c.better === 'low') n = 1 - n;
          return { c, n, pts: (100 * n * c.weight) / tw };
        });
        return { o, parts, score: parts.reduce((s, p) => s + p.pts, 0) };
      }).sort((a, b) => b.score - a.score);
    }
    render() {
      this.$grid.classList.toggle('narrow', this.el.clientWidth < 620);
      this.crit.forEach(c => { const o = this.el.querySelector('[data-o="' + CSS.escape(c.id) + '"]'); if (o) o.textContent = c.weight + ' of 5'; });
      const R = this.ranking();
      this.$list.innerHTML = R.map((r, i) => '<li class="ws-row' + (i === 0 ? ' first' : '') + '"><header>' + (i + 1) + '. ' + esc(r.o.label) + '<span>' + Math.round(r.score) + ' points</span></header><div class="ws-track" role="img" aria-label="' + esc(r.o.label + ': ' + r.parts.map(p => p.c.label + ' ' + Math.round(p.pts)).join(', ')) + '">' +
        r.parts.map(p => '<i style="width:' + f1(p.pts) + '%;background:' + esc(colorFor(this.el, p.c, p.c.i)) + '" title="' + esc(p.c.label + ': ' + Math.round(p.pts) + ' points') + '"></i>').join('') + '</div>' +
        '<span class="dg-small">' + this.crit.map(c => esc(c.label) + ' ' + esc(fmtNum(+r.o.values[c.id], c))).join(' · ') + '</span></li>').join('');
      const a = R[0], b = R[1], top = a.parts.slice().sort((x, y) => y.pts - x.pts)[0];
      this.$note.innerHTML = this.crit.every(c => !c.weight) ? 'Move a slider to say what matters to you.' : 'With these priorities, <b>' + esc(a.o.label) + '</b> comes first' + (b ? ', ' + Math.round(a.score - b.score) + ' points ahead of ' + esc(b.o.label) : '') + '. Most of its score comes from <b>' + esc(top.c.label.toLowerCase()) + '</b>. Scores compare these options only: the best on each measure scores full marks, the worst none.';
    }
  }

  /* ======================================================================================
   * Routeline: a route with stops and times, and where the vehicle is now
   * data = { label?, stops:[{id,label,time:'HH:MM',note?}] }  options: { now?: 'HH:MM' }
   * ====================================================================================== */
  class Routeline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { now: null });
      this.stops = data.stops.map((s, i) => Object.assign({ i, t: mins(s.time) }, s)); this.sel = null;
      el.innerHTML = '<svg role="img"></svg><p class="dg-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dg-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.stops[this.sel].id }); });
      if (this.o.now == null) { this._t = setInterval(() => this.render(), 30000); this._teardown = () => clearInterval(this._t); }
      this.render();
    }
    now() { if (this.o.now != null) return mins(this.o.now); const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
    where(t) {
      const S = this.stops; if (t < S[0].t) return { before: true }; if (t >= S[S.length - 1].t) return { after: true };
      for (let i = 0; i < S.length - 1; i++) if (t >= S[i].t && t < S[i + 1].t) return { i, f: (t - S[i].t) / (S[i + 1].t - S[i].t || 1) };
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 560, S = this.stops, n = S.length, now = this.now(), w = this.where(now);
      const pos = w.before ? 0 : w.after ? n - 1 : w.i + w.f;
      let s = '', H;
      if (narrow) {
        const top = 18, step = 54, x = 34; H = top + (n - 1) * step + 24;
        const y = i => top + i * step;
        s += '<line x1="' + x + '" y1="' + y(0) + '" x2="' + x + '" y2="' + y(n - 1) + '" stroke="' + T.line + '" stroke-width="6" stroke-linecap="round"/><line x1="' + x + '" y1="' + y(0) + '" x2="' + x + '" y2="' + f1(y(pos)) + '" stroke="' + T.accent + '" stroke-width="6" stroke-linecap="round"/>';
        S.forEach(st => { const passed = st.i < pos || (w.after), on = this.sel === st.i; s += '<g data-k="' + st.i + '" tabindex="0" role="button" aria-label="' + esc(st.label + ', ' + st.time + (passed ? ', passed' : '')) + '"><circle cx="' + x + '" cy="' + y(st.i) + '" r="' + (on ? 11 : 9) + '" fill="' + (passed ? T.accent : T.surface) + '" stroke="' + T.fg + '" stroke-width="2"/><rect x="' + (x + 14) + '" y="' + (y(st.i) - 16) + '" width="' + (W - x - 18) + '" height="32" fill="transparent"/>' +
          '<text x="' + (x + 22) + '" y="' + (y(st.i) + 5) + '" font-size="14" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(st.label, W - x - 100, 14)) + '</text><text x="' + (W - 4) + '" y="' + (y(st.i) + 5) + '" text-anchor="end" font-size="13" font-weight="700" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(st.time) + '</text></g>'; });
        if (!w.before && !w.after) s += '<g><circle cx="' + x + '" cy="' + f1(y(pos)) + '" r="7" fill="' + T.fg + '" stroke="' + T.surface + '" stroke-width="3"/></g>';
      } else {
        const pad = 50, y = 46, x = i => pad + (i / (n - 1)) * (W - pad * 2); H = 124;
        s += '<line x1="' + x(0) + '" y1="' + y + '" x2="' + x(n - 1) + '" y2="' + y + '" stroke="' + T.line + '" stroke-width="6" stroke-linecap="round"/><line x1="' + x(0) + '" y1="' + y + '" x2="' + f1(pad + (pos / (n - 1)) * (W - pad * 2)) + '" y2="' + y + '" stroke="' + T.accent + '" stroke-width="6" stroke-linecap="round"/>';
        S.forEach(st => { const passed = st.i < pos || w.after, on = this.sel === st.i, up = st.i % 2 === 0; s += '<g data-k="' + st.i + '" tabindex="0" role="button" aria-label="' + esc(st.label + ', ' + st.time + (passed ? ', passed' : '')) + '"><circle cx="' + f1(x(st.i)) + '" cy="' + y + '" r="' + (on ? 11 : 9) + '" fill="' + (passed ? T.accent : T.surface) + '" stroke="' + T.fg + '" stroke-width="2"/>' +
          '<text x="' + f1(x(st.i)) + '" y="' + (y + 32) + '" text-anchor="middle" font-size="13" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(st.label, (W - pad * 2) / (n - 1) + 20, 13)) + '</text><text x="' + f1(x(st.i)) + '" y="' + (y + 50) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(st.time) + '</text></g>'; void up; });
        if (!w.before && !w.after) { const vx = pad + (pos / (n - 1)) * (W - pad * 2); s += '<g><circle cx="' + f1(vx) + '" cy="' + y + '" r="8" fill="' + T.fg + '" stroke="' + T.surface + '" stroke-width="3"/><text x="' + f1(clamp(vx, 40, W - 40)) + '" y="' + (y - 18) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="' + T.fg + '">Now ' + hm(now) + '</text></g>'; }
      }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (this.data.label || 'Route') + ': ' + S.map(st => st.label + ' ' + st.time).join(', '));
      this._keep(this.$svg, s);
      const nxt = S.find(st => st.t > now), d = this.data;
      if (this.sel != null) { const st = S[this.sel], diff = st.t - now; this.$note.innerHTML = '<b>' + esc(st.label) + '</b> at ' + esc(st.time) + (diff > 0 ? ': in ' + wait(diff) + '.' : diff === 0 ? ': now.' : ': ' + wait(-diff) + ' ago.') + (st.note ? ' ' + esc(st.note) : ''); }
      else if (w.before) this.$note.innerHTML = (d.label ? '<b>' + esc(d.label) + '</b> ' : 'It ') + 'starts from <b>' + esc(S[0].label) + '</b> at ' + esc(S[0].time) + ', in ' + wait(S[0].t - now) + '.';
      else if (w.after) this.$note.innerHTML = (d.label ? esc(d.label) + ': ' : '') + 'the last stop, ' + esc(S[n - 1].label) + ', was at ' + esc(S[n - 1].time) + '. Tap a stop for its time.';
      else this.$note.innerHTML = 'Now between <b>' + esc(S[w.i].label) + '</b> and <b>' + esc(S[w.i + 1].label) + '</b>. Next stop: <b>' + esc(nxt.label) + '</b> at ' + esc(nxt.time) + ', in ' + wait(nxt.t - now) + '. Tap a stop for its time.';
    }
  }

  /* ======================================================================================
   * Levelup: a ladder of levels, where you are, and what is next
   * data = { unit?, current:number, levels:[{id,label,need:number,perks?}] }  (need = total to reach the level)
   * ====================================================================================== */
  class Levelup extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.levels = data.levels.map((l, i) => Object.assign({ i }, l, { need: +l.need })).sort((a, b) => a.need - b.need); this.cur = +data.current; this.open = null;
      el.innerHTML = '<ol class="lv-list"></ol><p class="dg-note" aria-live="polite"></p>';
      this.$list = el.querySelector('.lv-list'); this.$note = el.querySelector('.dg-note');
      this.$list.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { this.open = this.open === +b.dataset.k ? null : +b.dataset.k; this.render(); this.$list.querySelector('[data-k="' + b.dataset.k + '"]').focus(); if (this.open != null) this._emit('select', { id: this.levels[this.open].id }); } });
      this.render();
    }
    setValue(v) { const before = this.level(); this.cur = Math.max(0, +v); this.render(); const after = this.level(); this._emit('change', { value: this.cur }); if (after && (!before || after.i > before.i)) this._emit('levelup', { id: after.id, label: after.label }); }
    level() { let L = null; this.levels.forEach(l => { if (this.cur >= l.need) L = l; }); return L; }
    render() {
      const u = this.data.unit || 'points', L = this.level(), next = this.levels.find(l => l.need > this.cur);
      const rows = this.levels.slice().reverse();
      this._keep(this.$list, rows.map(l => {
        const done = this.cur >= l.need && L && l.i !== L.i, now = L && l.i === L.i, prev = this.levels[this.levels.indexOf(l) - 1], from = prev ? prev.need : 0;
        const frac = this.cur >= l.need ? 1 : clamp((this.cur - from) / ((l.need - from) || 1), 0, 1), op = this.open === l.i;
        return '<li><button type="button" class="lv-item' + (done ? ' done' : '') + (now ? ' now' : '') + '" data-k="' + l.i + '" aria-expanded="' + op + '"><span class="lv-badge" aria-hidden="true">' + (this.cur >= l.need ? '✓' : this.levels.indexOf(l) + 1) + '</span><span><b>' + esc(l.label) + '</b>' + (now ? ' <span class="dg-small">· you are here</span>' : '') + '</span><span class="lv-need">' + l.need.toLocaleString() + ' ' + esc(u) + '</span>' +
          (next && l.i === next.i ? '<span class="lv-meter" role="img" aria-label="' + Math.round(frac * 100) + '% of the way"><i style="width:' + f1(frac * 100) + '%"></i></span>' : '') +
          (l.perks ? '<span class="lv-perk"' + (op ? '' : ' hidden') + '>' + esc(l.perks) + '</span>' : '') + '</button></li>';
      }).join(''));
      if (this.open != null) { const l = this.levels[this.open]; this.$note.innerHTML = '<b>' + esc(l.label) + '</b>: ' + l.need.toLocaleString() + ' ' + esc(u) + (this.cur >= l.need ? ', reached.' : ', ' + (l.need - this.cur).toLocaleString() + ' to go.') + (l.perks ? ' Unlocks: ' + esc(l.perks) : ''); }
      else this.$note.innerHTML = '<b>' + this.cur.toLocaleString() + ' ' + esc(u) + '</b>' + (L ? ', level <b>' + esc(L.label) + '</b>' : '') + '.' + (next ? ' <b>' + (next.need - this.cur).toLocaleString() + '</b> more to reach ' + esc(next.label) + '.' : ' Top level reached.') + ' Tap a level to see what it unlocks.';
    }
  }

  /* ======================================================================================
   * Orgchart: a top-down chart; open and close branches; an outline on narrow screens
   * data = { root:{id,label,role?,children?} }  options: { open: 2 }
   * ====================================================================================== */
  class Orgchart extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { open: 2 });
      let n = 0; const walk = (x, d, p) => { x._k = 'o' + (n++); x._d = d; x._p = p; (x.children || []).forEach(c => walk(c, d + 1, x)); }; walk(data.root, 0, null);
      this.root = data.root; this.openSet = new Set(); this.sel = null;
      const op = x => { if (x._d < this.o.open - 1 && x.children) { this.openSet.add(x._k); x.children.forEach(op); } }; op(this.root);
      el.innerHTML = '<div class="dg-bar"><button type="button" class="dg-btn" data-all>Open all</button><button type="button" class="dg-btn" data-none>Close all</button></div><div data-view></div><p class="dg-note" aria-live="polite"></p>';
      this.$v = el.querySelector('[data-view]'); this.$note = el.querySelector('.dg-note');
      el.querySelector('[data-all]').onclick = () => { this._each(x => { if (x.children) this.openSet.add(x._k); }); this.render(); };
      el.querySelector('[data-none]').onclick = () => { this.openSet.clear(); this.render(); };
      this._hot(this.$v, k => this.choose(k));
      this.render();
    }
    _each(fn, x) { x = x || this.root; fn(x); (x.children || []).forEach(c => this._each(fn, c)); }
    _find(k) { let f = null; this._each(x => { if (x._k === k) f = x; }); return f; }
    _size(x) { let c = 0; (x.children || []).forEach(k => { c += 1 + this._size(k); }); return c; }
    choose(k) {
      const x = this._find(k); if (!x) return; this.sel = k;
      if (x.children) { if (this.openSet.has(k)) this.openSet.delete(k); else this.openSet.add(k); this._emit('toggle', { id: x.id, open: this.openSet.has(k) }); }
      this.render(); this._emit('select', { id: x.id, label: x.label });
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$v.clientWidth || 640), vis = [], leaves = {};
      let leaf = 0; const lay = x => { vis.push(x); const kids = x.children && this.openSet.has(x._k) ? x.children : []; if (!kids.length) { leaves[x._k] = leaf++; return; } kids.forEach(lay); leaves[x._k] = (leaves[kids[0]._k] + leaves[kids[kids.length - 1]._k]) / 2; }; lay(this.root);
      const bw = 136, bh = 52, gx = 20, gy = 46, need = leaf * (bw + gx);
      if (need > W) {
        const li = x => '<li><button type="button" class="oc-li" data-k="' + x._k + '" aria-pressed="' + (this.sel === x._k) + '"' + (x.children ? ' aria-expanded="' + this.openSet.has(x._k) + '"' : '') + '><span aria-hidden="true" class="dg-small">' + (x.children ? (this.openSet.has(x._k) ? '▾' : '▸') : '•') + '</span><span><b>' + esc(x.label) + '</b>' + (x.role ? '<br><small>' + esc(x.role) + '</small>' : '') + '</span>' + (x.children ? '<small style="margin-left:auto">' + x.children.length + '</small>' : '') + '</button>' + (x.children && this.openSet.has(x._k) ? '<ul>' + x.children.map(li).join('') + '</ul>' : '') + '</li>';
        this._keep(this.$v, '<ul class="oc-list">' + li(this.root) + '</ul>');
      } else {
        const ox = (W - need) / 2, X = x => ox + leaves[x._k] * (bw + gx) + gx / 2, Y = x => 4 + x._d * (bh + gy), H = Math.max(...vis.map(Y)) + bh + 6;
        let s = '';
        vis.forEach(x => { if (x._p && vis.includes(x._p)) { const px = X(x._p) + bw / 2, py = Y(x._p) + bh, cx = X(x) + bw / 2, cy = Y(x), my = py + gy / 2; s += '<path d="M' + f1(px) + ' ' + py + ' V' + f1(my) + ' H' + f1(cx) + ' V' + cy + '" fill="none" stroke="' + T.line + '" stroke-width="2"/>'; } });
        vis.forEach(x => { const on = this.sel === x._k, kids = x.children ? x.children.length : 0, op = this.openSet.has(x._k);
          s += '<g data-k="' + x._k + '" tabindex="0" role="button" aria-pressed="' + on + '"' + (kids ? ' aria-expanded="' + op + '"' : '') + ' aria-label="' + esc(x.label + (x.role ? ', ' + x.role : '') + (kids ? ', ' + kids + ' reporting, ' + (op ? 'open' : 'closed') : '')) + '"><rect x="' + f1(X(x)) + '" y="' + Y(x) + '" width="' + bw + '" height="' + bh + '" rx="10" fill="' + (x._d === 0 ? T.accent : T.surface) + '" stroke="' + (on ? T.fg : T.line) + '" stroke-width="' + (on ? 2.5 : 1.5) + '"/>' +
            '<text x="' + f1(X(x) + bw / 2) + '" y="' + (Y(x) + (x.role ? 21 : 30)) + '" text-anchor="middle" font-size="13" font-weight="800" fill="' + (x._d === 0 ? T.surface : T.fg) + '">' + esc(fitText(x.label, bw - 12, 13)) + '</text>' +
            (x.role ? '<text x="' + f1(X(x) + bw / 2) + '" y="' + (Y(x) + 38) + '" text-anchor="middle" font-size="11" fill="' + (x._d === 0 ? T.surface : T.muted) + '">' + esc(fitText(x.role, bw - 12, 11)) + '</text>' : '') +
            (kids ? '<circle cx="' + f1(X(x) + bw - 2) + '" cy="' + (Y(x) + 2) + '" r="10" fill="' + (op ? T.fg : T.accent) + '" stroke="' + T.surface + '" stroke-width="2"/><text x="' + f1(X(x) + bw - 2) + '" y="' + (Y(x) + 6) + '" text-anchor="middle" font-size="10.5" font-weight="800" fill="' + T.surface + '" pointer-events="none">' + (op ? '−' : '+' + kids) + '</text>' : '') + '</g>'; });
        this._keep(this.$v, '<svg role="group" viewBox="0 0 ' + W + ' ' + H + '" style="height:' + H + 'px" aria-label="Organisation chart">' + s + '</svg>');
      }
      const x = this.sel ? this._find(this.sel) : null;
      this.$note.innerHTML = x ? '<b>' + esc(x.label) + '</b>' + (x.role ? ' (' + esc(x.role) + ')' : '') + (x._p ? ', part of ' + esc(x._p.label) : '') + '.' + (x.children ? ' ' + x.children.length + ' directly below, ' + this._size(x) + ' in all.' : '') : '<b>' + (this._size(this.root) + 1) + '</b> in all. Tap a box to open or close the team below it.';
    }
  }

  /* ======================================================================================
   * Numberline: amounts from tiny to huge; even steps per ×10, or true to scale
   * data = { items:[{id,label,value,note?}], prefix?, suffix?, unit? }  options: { scale:'log'|'linear' }
   * ====================================================================================== */
  class Numberline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { scale: 'log' });
      this.items = data.items.map((t, i) => Object.assign({ i }, t, { value: +t.value })).sort((a, b) => a.value - b.value); this.scale = this.o.scale; this.sel = null;
      el.innerHTML = '<div class="dg-bar" role="group" aria-label="Scale"><button type="button" class="dg-btn" data-s="log">Even steps for each ×10</button><button type="button" class="dg-btn" data-s="linear">True to scale</button></div><svg role="img"></svg><p class="dg-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dg-note');
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { this.scale = b.dataset.s; this.render(); this._emit('mode', { scale: this.scale }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items.find(t => t.i === this.sel).id }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 560, vals = this.items.map(t => t.value).filter(v => v > 0);
      const e0 = Math.floor(Math.log10(Math.min(...vals))), e1 = Math.ceil(Math.log10(Math.max(...vals))), lin = this.scale === 'linear';
      const len = (narrow ? Math.max(420, this.items.length * 34 + 40) : W - 30), pad = 20;
      const p = v => lin ? pad + (v / Math.pow(10, e1)) * (len - pad * 2) : pad + ((Math.log10(Math.max(v, 1e-9)) - e0) / (e1 - e0 || 1)) * (len - pad * 2);
      let s = '';
      if (narrow) {
        const x = 54, H = len; s += '<line x1="' + x + '" y1="' + pad + '" x2="' + x + '" y2="' + (H - pad) + '" stroke="' + T.fg + '" stroke-width="2"/>';
        const Y = v => H - p(v);
        for (let e = e0; e <= e1; e++) { const v = Math.pow(10, e); if (lin && e < e1 - 1) continue; s += '<line x1="' + (x - 6) + '" y1="' + f1(Y(v)) + '" x2="' + (x + 6) + '" y2="' + f1(Y(v)) + '" stroke="' + T.fg + '"/><text x="' + (x - 10) + '" y="' + f1(Y(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(short(v, d)) + '</text>'; }
        const ly = spread(this.items.map(t => Y(t.value)), 30, 14, H - 10);
        this.items.forEach((t, k) => { const on = this.sel === t.i; s += '<g data-k="' + t.i + '" tabindex="0" role="button" aria-label="' + esc(t.label + ': ' + fmtNum(t.value, d)) + '"><circle cx="' + x + '" cy="' + f1(Y(t.value)) + '" r="' + (on ? 8 : 6) + '" fill="' + T.accent + '" stroke="' + T.surface + '" stroke-width="2"/><line x1="' + (x + 7) + '" y1="' + f1(Y(t.value)) + '" x2="' + (x + 24) + '" y2="' + f1(ly[k]) + '" stroke="' + T.line + '"/><rect x="' + (x + 24) + '" y="' + f1(ly[k] - 14) + '" width="' + (W - x - 28) + '" height="28" fill="transparent"/>' +
          '<text x="' + (x + 28) + '" y="' + f1(ly[k] - 1) + '" font-size="12.5" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(t.label, W - x - 34, 12.5)) + '</text><text x="' + (x + 28) + '" y="' + f1(ly[k] + 12) + '" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(t.value, d)) + '</text></g>'; });
        this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      } else {
        const y = 150, H = 200; s += '<line x1="' + pad + '" y1="' + y + '" x2="' + (len - pad) + '" y2="' + y + '" stroke="' + T.fg + '" stroke-width="2"/>';
        for (let e = e0; e <= e1; e++) { const v = Math.pow(10, e); if (lin && e < e1 - 1) continue; s += '<line x1="' + f1(p(v)) + '" y1="' + (y - 6) + '" x2="' + f1(p(v)) + '" y2="' + (y + 6) + '" stroke="' + T.fg + '"/><text x="' + f1(p(v)) + '" y="' + (y + 22) + '" text-anchor="middle" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(short(v, d)) + '</text>'; }
        const lx = spread(this.items.map(t => p(t.value)), 0.1, pad, len - pad), lvl = []; const rows = 4, rowY = r => 18 + r * 28;
        this.items.forEach((t, k) => { const x = p(t.value); let r = 0; while (r < rows - 1 && lvl[r] != null && lvl[r] > x - 160) r++; lvl[r] = x; const on = this.sel === t.i, ty = rowY(r);
          s += '<g data-k="' + t.i + '" tabindex="0" role="button" aria-label="' + esc(t.label + ': ' + fmtNum(t.value, d)) + '"><circle cx="' + f1(x) + '" cy="' + y + '" r="' + (on ? 8 : 6) + '" fill="' + T.accent + '" stroke="' + T.surface + '" stroke-width="2"/><line x1="' + f1(x) + '" y1="' + (y - 7) + '" x2="' + f1(x) + '" y2="' + (ty + 8) + '" stroke="' + T.line + '"/>' +
            '<text x="' + f1(x + 4) + '" y="' + ty + '" font-size="12" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(t.label, 152, 12)) + '</text><text x="' + f1(x + 4) + '" y="' + (ty + 13) + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(t.value, d)) + '</text></g>'; void lx[k]; });
        this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      }
      this.$svg.setAttribute('aria-label', 'Amounts from ' + fmtNum(this.items[0].value, d) + ' to ' + fmtNum(this.items[this.items.length - 1].value, d) + (lin ? ', true to scale' : ', each step ten times bigger'));
      this._keep(this.$svg, s);
      this.el.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === this.scale)));
      const its = this.items, lo = its[0], hi = its[its.length - 1];
      if (this.sel != null) { const t = its.find(x => x.i === this.sel), k = its.indexOf(t), prev = its[k - 1]; this.$note.innerHTML = '<b>' + esc(t.label) + '</b>: ' + esc(fmtNum(t.value, d)) + '.' + (prev ? ' That is ' + fmtNum(t.value / prev.value, { decimals: 1 }) + ' times ' + esc(prev.label.toLowerCase()) + '.' : '') + ' It would take ' + fmtNum(t.value / lo.value, { decimals: 0 }) + ' × ' + esc(lo.label.toLowerCase()) + ' to make it.' + (t.note ? ' ' + esc(t.note) : ''); }
      else this.$note.innerHTML = 'From <b>' + esc(lo.label) + '</b> (' + esc(fmtNum(lo.value, d)) + ') to <b>' + esc(hi.label) + '</b> (' + esc(fmtNum(hi.value, d)) + '): ' + fmtNum(hi.value / lo.value, { decimals: 0 }) + ' times bigger. ' + (lin ? 'True to scale, the small amounts are squeezed into the left end.' : 'Each step along the line is ten times the one before.') + ' Tap an amount to compare.';
    }
  }

  /* ======================================================================================
   * Glossary: an A–Z of terms with search, letter jumps and see-also links
   * data = { terms:[{id, term, def, see?:[ids]}] }
   * ====================================================================================== */
  class Glossary extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.terms = data.terms.slice().sort((a, b) => a.term.localeCompare(b.term)); this.q = ''; this.hl = null;
      el.innerHTML = '<div class="gl-tools"><input type="search" placeholder="Search terms and meanings" aria-label="Search the glossary"></div><nav class="gl-az" aria-label="Jump to a letter"></nav><p class="dg-note" aria-live="polite" style="margin:0 0 6px"></p><div class="gl-body"></div>';
      this.$q = el.querySelector('input'); this.$az = el.querySelector('.gl-az'); this.$body = el.querySelector('.gl-body'); this.$note = el.querySelector('.dg-note');
      this.$q.addEventListener('input', () => { this.q = this.$q.value.trim().toLowerCase(); this.hl = null; this.render(); this._emit('search', { query: this.q }); });
      this.$az.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; const h = this.$body.querySelector('[data-letter="' + b.dataset.l + '"]'); if (h) { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); const t = h.nextElementSibling; t && t.focus({ preventScroll: true }); } });
      this.$body.addEventListener('click', e => { const b = e.target.closest('[data-see]'); if (b) this.go(b.dataset.see); });
      this.render();
    }
    go(id) {
      const t = this.terms.find(x => x.id === id); if (!t) return;
      if (this.q && !this._match(t)) { this.q = ''; this.$q.value = ''; }
      this.hl = id; this.render(); const c = this.$body.querySelector('[data-id="' + CSS.escape(id) + '"]'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.focus({ preventScroll: true }); }
      this._emit('select', { id });
    }
    _match(t) { return !this.q || (t.term + ' ' + t.def).toLowerCase().includes(this.q); }
    _mark(s) { s = String(s); if (!this.q) return esc(s); const i = s.toLowerCase().indexOf(this.q); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + this.q.length)) + '</mark>' + esc(s.slice(i + this.q.length)); }
    render() {
      const shown = this.terms.filter(t => this._match(t)), letters = [...new Set(shown.map(t => t.term[0].toUpperCase()))];
      this.$az.innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => '<button type="button" data-l="' + l + '"' + (letters.includes(l) ? '' : ' disabled') + ' aria-label="' + l + '">' + l + '</button>').join('');
      let h = '', last = '';
      shown.forEach(t => {
        const L = t.term[0].toUpperCase(); if (L !== last) { h += '<div class="gl-letter" data-letter="' + L + '">' + L + '</div>'; last = L; }
        const see = (t.see || []).map(id => this.terms.find(x => x.id === id)).filter(Boolean);
        h += '<article class="gl-term' + (this.hl === t.id ? ' hl' : '') + '" data-id="' + esc(t.id) + '" tabindex="-1"><h5>' + this._mark(t.term) + '</h5><p>' + this._mark(t.def) + '</p>' + (see.length ? '<div class="gl-see">See also: ' + see.map(x => '<button type="button" data-see="' + esc(x.id) + '">' + esc(x.term) + '</button>').join(', ') + '</div>' : '') + '</article>';
      });
      this.$body.innerHTML = h || '<p class="dg-small">No terms match. Try a shorter word.</p>';
      this.$note.innerHTML = this.q ? '<b>' + shown.length + '</b> of ' + this.terms.length + ' terms match “' + esc(this.q) + '”.' : '<b>' + this.terms.length + '</b> terms. Search, jump to a letter, or follow a “see also” link.';
    }
  }

  return { Weighscore, Routeline, Levelup, Orgchart, Numberline, Glossary };
});
