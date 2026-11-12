/*! Metrics 1.0 · Dimau Infographics
 *  Six formats for keeping score:
 *    Cohortgrid    how many of each starting group are still active, period by period; tap a cell for it in words.
 *    Burndown      work left against the plan line, with the finish date at the current pace.
 *    Controlchart  a measure over time with its usual range; points that are unusual are flagged and explained.
 *    Cumflow       work piling up in each stage over time; slide to a day for work in progress and time to finish.
 *    Kpitiles      headline numbers with change, target and a small trend; tap a tile for more.
 *    Abtest        two versions compared fairly: rates, ranges and the chance one is really better.
 *
 *  new Cohortgrid(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Cohortgrid', 'Burndown', 'Controlchart', 'Cumflow', 'Kpitiles', 'Abtest'].forEach(function (k) { root[k] = m[k]; }); root.DimauMetrics = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmt = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 1 }) + (o.suffix || '') : '–'; };
  const fmtOf = o => ({ prefix: o.prefix, suffix: o.suffix != null ? o.suffix : o.unit ? ' ' + o.unit : '', decimals: o.decimals });
  const pct = (n, d) => (n * 100).toFixed(d || 0).replace(/\.0+$/, '') + '%';
  const DAY = 86400000, MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dstr = t => { const d = new Date(t); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
  const pd = s => Date.parse(String(s).slice(0, 10) + 'T00:00:00Z');
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }
  /** Standard normal cumulative probability. */
  function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  /** 95% range for a rate (Wilson). */
  function wilson(x, n) { if (!n) return [0, 0]; const z = 1.96, p = x / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; }

  const STYLE = `
.dm{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dm) button{font:inherit;color:inherit}
.dm :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dm svg{display:block;width:100%}
.dm svg [data-k]{cursor:pointer}
.dm svg [data-k]:focus{outline:none}
.dm svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dm-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dm-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.dm-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dm-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dm-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dm-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.kt{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.kt button{display:grid;gap:4px;text-align:left;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:14px;padding:12px 14px;cursor:pointer}
.kt button[aria-expanded="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.kt .lab{font-size:12.5px;font-weight:700;color:var(--di-muted,#4f6578)}
.kt .val{font-size:28px;font-weight:800;line-height:1.1}
.kt .chg{font:700 12.5px/1.2 var(--di-mono,ui-monospace,monospace)}
.kt .good{color:#1f8a5b}.kt .bad{color:#c2563a}.kt .flat{color:var(--di-muted,#4f6578)}
.kt svg{height:34px}
.kt .more{font-size:12.5px;line-height:1.5;color:var(--di-fg,#13263a);border-top:1px solid var(--di-line,#c9dce8);padding-top:6px;margin-top:2px}
.ab-in{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:0 0 12px}
.ab-in fieldset{border:1px solid var(--di-line,#c9dce8);border-radius:12px;padding:8px 12px 10px;margin:0;background:var(--di-surface,#fff)}
.ab-in legend{font-weight:800;font-size:13.5px;padding:0 4px}
.ab-in label{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;margin-top:6px}
.ab-in input{width:110px;height:34px;border-radius:8px;border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);padding:0 8px;font:inherit;font-size:14px;color:inherit}
.ab-verdict{font-size:17px;font-weight:800;margin:10px 0 0}
`;
  function injectStyle() {
    if (document.getElementById('dm-style')) return;
    const s = document.createElement('style'); s.id = 'dm-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dm');
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
    /** Drag or arrow keys along an svg slider; calls set(index). */
    _scrub(svg, n, set, getAt) {
      const at = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (this._W / r.width); set(clamp(Math.round((x - this._pl) / this._step), 0, n() - 1)); };
      svg.addEventListener('pointerdown', at); svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') at(e); });
      svg.addEventListener('keydown', e => { const d = { ArrowLeft: -1, ArrowRight: 1, Home: -1e6, End: 1e6 }[e.key]; if (d == null) return; e.preventDefault(); const c = getAt(); set(clamp((c == null ? n() - 1 : c) + d, 0, n() - 1)); });
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('dm'); }
  }

  /* ======================================================================================
   * Cohortgrid: retention by starting group
   * data = { periodLabel?:'Month', cohorts:[{label,size,values:[active in period 1, 2, …]}] }  options: { show: 'percent' }
   * ====================================================================================== */
  class Cohortgrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { show: 'percent' });
      this.co = data.cohorts.map((c, i) => Object.assign({ i }, c, { size: +c.size, values: c.values.map(Number) })); this.show = this.o.show; this.sel = null;
      el.innerHTML = '<div class="dm-bar"><button type="button" class="dm-btn" data-show="percent">Percent</button><button type="button" class="dm-btn" data-show="count">People</button></div><svg role="grid"></svg><p class="dm-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dm-note');
      el.querySelector('.dm-bar').addEventListener('click', e => { const b = e.target.closest('[data-show]'); if (b) { this.show = b.dataset.show; this.render(); } });
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) { const [c, p] = k.split(':').map(Number); this._emit('select', { cohort: this.co[c].label, period: p + 1, active: this.co[c].values[p] }); } });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (!g) return; const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!d) return; e.preventDefault(); const [c, p] = g.dataset.k.split(':').map(Number), t = this.$svg.querySelector('[data-k="' + (c + d[0]) + ':' + (p + d[1]) + '"]'); t && t.focus(); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, P = Math.max(...this.co.map(c => c.values.length)), pl = narrow ? 70 : 110, top = 26, cw = Math.min(64, (W - pl - 4) / P), ch = narrow ? 30 : 32, H = top + this.co.length * ch + 4, pl2 = d.periodLabel || 'Month';
      let s = '';
      for (let p = 0; p < P; p++) s += '<text x="' + f1(pl + p * cw + cw / 2) + '" y="16" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + (narrow ? '' : pl2.slice(0, 1)) + (p + 1) + '</text>';
      this.co.forEach((c, r) => {
        const y = top + r * ch;
        s += '<text x="' + (pl - 8) + '" y="' + f1(y + ch / 2 - 1) + '" text-anchor="end" font-size="12" font-weight="700" fill="' + T.fg + '">' + esc(fitText(c.label, pl - 12, 12)) + '</text><text x="' + (pl - 8) + '" y="' + f1(y + ch / 2 + 11) + '" text-anchor="end" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + c.size.toLocaleString() + '</text>';
        c.values.forEach((v, p) => {
          const share = v / c.size, x = pl + p * cw, k = r + ':' + p, on = this.sel === k;
          s += '<g data-k="' + k + '" tabindex="' + (r === 0 && p === 0 ? 0 : -1) + '" role="gridcell" aria-label="' + esc(c.label + ', ' + pl2.toLowerCase() + ' ' + (p + 1) + ': ' + v + ' of ' + c.size + ' (' + pct(share) + ')') + '"><rect x="' + f1(x + 1) + '" y="' + (y + 1) + '" width="' + f1(cw - 2) + '" height="' + (ch - 2) + '" rx="3" fill="' + T.accent + '" fill-opacity="' + f1(0.08 + share * 0.92) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2.5"' : '') + '/>' +
            (cw >= 30 ? '<text x="' + f1(x + cw / 2) + '" y="' + f1(y + ch / 2 + 4) + '" text-anchor="middle" font-size="' + (cw >= 44 ? 11 : 9.5) + '" font-weight="700" fill="' + (share > 0.5 ? '#fff' : T.fg) + '" pointer-events="none">' + (this.show === 'count' ? v : Math.round(share * 100) + (cw >= 44 ? '%' : '')) + '</text>' : '') + '</g>';
        });
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Still active by starting group and ' + pl2.toLowerCase() + '. Use the arrow keys to move between cells.');
      this._keep(this.$svg, s);
      this.el.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.show === this.show)));
      const avg = p => { const xs = this.co.filter(c => c.values.length > p); return xs.reduce((a, c) => a + c.values[p] / c.size, 0) / (xs.length || 1); }, lastP = P - 1;
      if (this.sel) { const [r, p] = this.sel.split(':').map(Number), c = this.co[r], v = c.values[p], a = avg(p); this.$note.innerHTML = 'Of the <b>' + c.size.toLocaleString() + '</b> who started in <b>' + esc(c.label) + '</b>, <b>' + v.toLocaleString() + ' (' + pct(v / c.size) + ')</b> were still active in ' + esc(pl2.toLowerCase()) + ' ' + (p + 1) + ' — ' + (Math.abs(v / c.size - a) < 0.01 ? 'about the same as' : v / c.size > a ? (pct(v / c.size - a) + ' points better than') : (pct(a - v / c.size) + ' points worse than')) + ' the average.'; }
      else { const p1 = Math.min(1, lastP), best = this.co.filter(c => c.values.length > p1).reduce((a, b) => (b.values[p1] / b.size > a.values[p1] / a.size ? b : a)); this.$note.innerHTML = 'On average <b>' + pct(avg(0)) + '</b> are still active in ' + esc(pl2.toLowerCase()) + ' 1 and <b>' + pct(avg(lastP)) + '</b> by ' + esc(pl2.toLowerCase()) + ' ' + P + '. Best start: <b>' + esc(best.label) + '</b> (' + pct(best.values[p1] / best.size) + ' in ' + esc(pl2.toLowerCase()) + ' ' + (p1 + 1) + '). Darker means more stayed. Tap a cell.'; }
    }
  }

  /* ======================================================================================
   * Burndown: work left against the plan
   * data = { start, end, total, unit?, days:[{date, left}] }  options: { pace: 5 (days used for the pace) }
   * ====================================================================================== */
  class Burndown extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { pace: 5 });
      this.t0 = pd(data.start); this.t1 = pd(data.end); this.days = data.days.map(x => ({ t: pd(x.date), left: +x.left })).sort((a, b) => a.t - b.t); this.at = null;
      el.innerHTML = '<svg role="slider" tabindex="0" aria-valuemin="0"></svg><div class="dm-legend"></div><p class="dm-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dm-legend'); this.$note = el.querySelector('.dm-note');
      this._scrub(this.$svg, () => this.days.length, i => { if (i === this.at) return; this.at = i; this.render(); this._emit('move', { date: new Date(this.days[i].t).toISOString().slice(0, 10), left: this.days[i].left }); }, () => this.at);
      this.render();
    }
    _forecast() {
      const D = this.days, k = Math.min(this.o.pace, D.length - 1), a = D[D.length - 1 - k], b = D[D.length - 1], rate = k ? (a.left - b.left) / ((b.t - a.t) / DAY) : 0;
      return { rate, finish: rate > 0 ? b.t + Math.ceil(b.left / rate) * DAY : null };
    }
    render() {
      const T = themeOf(this.el), d = this.data, U = d.unit || 'tasks', W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 240 : 290, pl = 40, pr = 14, pt = 14, pb = 26, fc = this._forecast();
      const tEnd = Math.max(this.t1, fc.finish || this.t1), hi = Math.max(+d.total, ...this.days.map(x => x.left)) * 1.05, sx = t => pl + ((t - this.t0) / (tEnd - this.t0)) * (W - pl - pr), sy = v => pt + (1 - v / hi) * (H - pt - pb);
      this._W = W; this._pl = pl; this._step = this.days.length > 1 ? (sx(this.days[this.days.length - 1].t) - sx(this.days[0].t)) / (this.days.length - 1) : 1;
      let s = ticks(0, hi, 4).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + v + '</text>').join('');
      const nd = Math.round((tEnd - this.t0) / DAY), every = Math.max(1, Math.ceil(nd / (narrow ? 4 : 8)));
      for (let k = 0; k <= nd; k += every) s += '<text x="' + f1(clamp(sx(this.t0 + k * DAY), pl + 12, W - 20)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + dstr(this.t0 + k * DAY) + '</text>';
      s += '<line x1="' + f1(sx(this.t0)) + '" y1="' + f1(sy(+d.total)) + '" x2="' + f1(sx(this.t1)) + '" y2="' + f1(sy(0)) + '" stroke="' + T.muted + '" stroke-width="1.5" stroke-dasharray="6 4"/>';
      s += '<line x1="' + f1(sx(this.t1)) + '" y1="' + pt + '" x2="' + f1(sx(this.t1)) + '" y2="' + (H - pb) + '" stroke="#c2563a" stroke-width="1.2"/><text x="' + f1(sx(this.t1) - 4) + '" y="' + (pt + 10) + '" text-anchor="end" font-size="10.5" font-weight="700" fill="#c2563a">Due</text>';
      const last = this.days[this.days.length - 1];
      if (fc.finish) s += '<line x1="' + f1(sx(last.t)) + '" y1="' + f1(sy(last.left)) + '" x2="' + f1(sx(fc.finish)) + '" y2="' + f1(sy(0)) + '" stroke="' + T.accent + '" stroke-width="2" stroke-dasharray="2 4"/><circle cx="' + f1(sx(fc.finish)) + '" cy="' + f1(sy(0)) + '" r="4" fill="' + T.accent + '"/>';
      s += '<path d="' + this.days.map((x, k) => (k ? 'L' : 'M') + f1(sx(x.t)) + ' ' + f1(sy(x.left))).join(' ') + '" fill="none" stroke="' + T.fg + '" stroke-width="2.5" stroke-linejoin="round"/>' + this.days.map(x => '<circle cx="' + f1(sx(x.t)) + '" cy="' + f1(sy(x.left)) + '" r="2.5" fill="' + T.fg + '"/>').join('');
      if (this.at != null) { const x = this.days[this.at]; s += '<line x1="' + f1(sx(x.t)) + '" y1="' + pt + '" x2="' + f1(sx(x.t)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '"/><circle cx="' + f1(sx(x.t)) + '" cy="' + f1(sy(x.left)) + '" r="5.5" fill="' + T.accent + '" stroke="' + T.surface + '" stroke-width="2"/>'; }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Work left each day against the plan. Use the arrow keys to move day by day.'); this.$svg.setAttribute('aria-valuemax', String(this.days.length - 1));
      if (this.at != null) { this.$svg.setAttribute('aria-valuenow', String(this.at)); this.$svg.setAttribute('aria-valuetext', dstr(this.days[this.at].t)); }
      this.$svg.innerHTML = s;
      this.$leg.innerHTML = '<span><i style="background:' + T.fg + ';height:3px"></i>Work left</span><span><i style="background:' + T.muted + ';height:3px"></i>Plan</span><span><i style="background:' + T.accent + ';height:3px"></i>At the current pace</span>';
      const plan = t => +d.total * (1 - clamp((t - this.t0) / (this.t1 - this.t0), 0, 1));
      if (this.at != null) { const x = this.days[this.at], p = plan(x.t), diff = x.left - p; this.$note.innerHTML = '<b>' + dstr(x.t) + '</b>: ' + x.left + ' ' + esc(U) + ' left; the plan said ' + Math.round(p) + ' — ' + (Math.abs(diff) < 0.5 ? 'right on plan.' : diff > 0 ? '<b>' + Math.round(diff) + ' behind</b>.' : '<b>' + Math.round(-diff) + ' ahead</b>.'); }
      else { const late = fc.finish ? Math.round((fc.finish - this.t1) / DAY) : null, toGo = Math.round((this.t1 - last.t) / DAY); this.$note.innerHTML = '<b>' + last.left + ' ' + esc(U) + '</b> left with ' + toGo + ' day' + (toGo === 1 ? '' : 's') + ' to the due date (' + dstr(this.t1) + '). ' + (fc.finish ? 'At the recent pace of ' + f1(fc.rate) + ' a day, it finishes on <b>' + dstr(fc.finish) + '</b> — ' + (late > 0 ? '<b>' + late + ' day' + (late === 1 ? '' : 's') + ' late</b>' : late < 0 ? '<b>' + -late + ' day' + (late === -1 ? '' : 's') + ' early</b>' : '<b>on the day</b>') + '.' : 'No work has been finished recently, so there is no finish date yet.') + ' Drag along the chart to compare any day with the plan.'; }
    }
  }

  /* ======================================================================================
   * Controlchart: a measure with its usual range; unusual points flagged
   * data = { unit?, prefix?, decimals?, points:[{label,value,note?}], baseline?: n }
   * ====================================================================================== */
  function controlRules(vals, mean, ucl, lcl) {
    const flags = vals.map(() => []);
    vals.forEach((v, i) => { if (v > ucl) flags[i].push('above the usual range'); else if (v < lcl) flags[i].push('below the usual range'); });
    for (let i = 7; i < vals.length; i++) { const w = vals.slice(i - 7, i + 1); if (w.every(v => v > mean) || w.every(v => v < mean)) flags[i].push('8 in a row on one side of the average'); }
    for (let i = 5; i < vals.length; i++) { const w = vals.slice(i - 5, i + 1); let up = true, dn = true; for (let k = 1; k < w.length; k++) { if (!(w[k] > w[k - 1])) up = false; if (!(w[k] < w[k - 1])) dn = false; } if (up) flags[i].push('6 rises in a row'); if (dn) flags[i].push('6 falls in a row'); }
    return flags;
  }
  class Controlchart extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.pts = data.points.map((p, i) => Object.assign({ i }, p, { value: +p.value })); this.base = clamp(+data.baseline || this.pts.length, 4, this.pts.length); this.sel = null;
      const b = this.pts.slice(0, this.base).map(p => p.value), mr = b.slice(1).map((v, k) => Math.abs(v - b[k])); this.mean = b.reduce((a, c) => a + c, 0) / b.length; this.sigma = (mr.reduce((a, c) => a + c, 0) / (mr.length || 1)) / 1.128; this.ucl = this.mean + 3 * this.sigma; this.lcl = this.mean - 3 * this.sigma;
      this.flags = controlRules(this.pts.map(p => p.value), this.mean, this.ucl, this.lcl);
      el.innerHTML = '<svg role="group"></svg><div class="dm-legend"></div><p class="dm-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dm-legend'); this.$note = el.querySelector('.dm-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { label: this.pts[this.sel].label, value: this.pts[this.sel].value, flags: this.flags[this.sel] }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), F = fmtOf(this.data), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 250 : 300, pr = 44, pt = 12, pb = 26, n = this.pts.length;
      const vals = this.pts.map(p => p.value).concat([this.ucl, this.lcl]), lo0 = Math.min(...vals), hi0 = Math.max(...vals), pad = (hi0 - lo0) * 0.08, lo = lo0 - pad, hi = hi0 + pad, pl = 12 + Math.max(...ticks(lo, hi, 5).map(v => fmt(v, { prefix: F.prefix, decimals: F.decimals }).length)) * 6.2;
      const sx = i => pl + (i / Math.max(1, n - 1)) * (W - pl - pr), sy = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
      let s = '<rect x="' + f1(pl) + '" y="' + f1(sy(this.ucl)) + '" width="' + f1(W - pl - pr) + '" height="' + f1(sy(this.lcl) - sy(this.ucl)) + '" fill="' + T.accent + '" opacity=".07"/>';
      s += ticks(lo, hi, 5).map(v => '<text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmt(v, { prefix: F.prefix, decimals: F.decimals })) + '</text>').join('');
      [[this.ucl, 'High', '6 4'], [this.mean, 'Avg', ''], [this.lcl, 'Low', '6 4']].forEach(([v, l, da]) => { s += '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + (l === 'Avg' ? T.fg : '#c2563a') + '" stroke-width="1.2"' + (da ? ' stroke-dasharray="' + da + '"' : '') + '/><text x="' + (W - pr + 4) + '" y="' + f1(sy(v) + 4) + '" font-size="10.5" font-weight="700" fill="' + (l === 'Avg' ? T.fg : '#c2563a') + '">' + l + '</text>'; });
      if (this.base < n) s += '<line x1="' + f1(sx(this.base - 0.5)) + '" y1="' + pt + '" x2="' + f1(sx(this.base - 0.5)) + '" y2="' + (H - pb) + '" stroke="' + T.muted + '" stroke-dasharray="2 3"/><text x="' + f1(sx(this.base - 0.5) - 4) + '" y="' + (pt + 10) + '" text-anchor="end" font-size="10" fill="' + T.muted + '">' + (narrow ? 'range from first ' : 'usual range set from the first ') + this.base + '</text>';
      s += '<path d="' + this.pts.map((p, i) => (i ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(sy(p.value))).join(' ') + '" fill="none" stroke="' + T.muted + '" stroke-width="1.5"/>';
      const every = Math.ceil(n / (narrow ? 5 : 10));
      this.pts.forEach((p, i) => {
        const bad = this.flags[i].length > 0, on = this.sel === i;
        s += '<g data-k="' + i + '" tabindex="' + (bad || i === 0 ? 0 : -1) + '" role="button" aria-pressed="' + on + '" aria-label="' + esc(p.label + ': ' + fmt(p.value, F) + (bad ? '. Unusual: ' + this.flags[i].join('; ') : '')) + '"><circle cx="' + f1(sx(i)) + '" cy="' + f1(sy(p.value)) + '" r="' + (on ? 7 : bad ? 5.5 : 3.5) + '" fill="' + (bad ? '#c2563a' : T.fg) + '" stroke="' + T.surface + '" stroke-width="1.5"/><circle cx="' + f1(sx(i)) + '" cy="' + f1(sy(p.value)) + '" r="11" fill="transparent"/></g>';
        if (i % every === 0) s += '<text x="' + f1(clamp(sx(i), pl + 10, W - pr - 10)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(p.label) + '</text>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', n + ' readings with their usual range; unusual points are red and can be reached with Tab');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = '<span><i style="background:' + T.accent + ';opacity:.25"></i>Usual range (' + fmt(this.lcl, F) + ' to ' + fmt(this.ucl, F) + ')</span><span><i style="background:#c2563a;border-radius:50%"></i>Unusual</span>';
      const odd = this.pts.filter((p, i) => this.flags[i].length);
      if (this.sel != null) { const p = this.pts[this.sel], f = this.flags[this.sel]; this.$note.innerHTML = '<b>' + esc(p.label) + '</b>: ' + fmt(p.value, F) + '. ' + (f.length ? '<b>Unusual</b>: ' + f.join('; ') + '. Worth finding out what changed.' : 'Within the usual ups and downs; no special cause needed.') + (p.note ? ' ' + esc(p.note) : ''); }
      else this.$note.innerHTML = 'Average <b>' + fmt(this.mean, F) + '</b>; readings normally fall between ' + fmt(this.lcl, F) + ' and ' + fmt(this.ucl, F) + '. ' + (odd.length ? '<b>' + odd.length + ' unusual</b>: ' + odd.map(p => esc(p.label)).join(', ') + '. Tap a red point for why.' : 'Nothing unusual: the ups and downs are normal variation.');
    }
  }

  /* ======================================================================================
   * Cumflow: work in each stage over time
   * data = { unit?, dates:[...], stages:[{id,label}] (first = new, last = done), counts:[[per stage] per date] }
   * ====================================================================================== */
  class Cumflow extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.st = data.stages.map((s, i) => Object.assign({ i }, s)); this.c = data.counts.map(r => r.map(Number)); this.t = data.dates.map(pd); this.at = null;
      el.innerHTML = '<svg role="slider" tabindex="0" aria-valuemin="0"></svg><div class="dm-legend"></div><p class="dm-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dm-legend'); this.$note = el.querySelector('.dm-note');
      this._scrub(this.$svg, () => this.t.length, i => { if (i === this.at) return; this.at = i; this.render(); this._emit('move', { date: this.data.dates[i], wip: this._wip(i) }); }, () => this.at);
      this.render();
    }
    _arr(i) { return this.c[i].reduce((a, b) => a + b, 0); }
    _done(i) { return this.c[i][this.c[i].length - 1]; }
    _wip(i) { return this._arr(i) - this._done(i) - this.c[i][0]; }
    _lead(i) { const A = this._arr(i); for (let e = i; e < this.t.length; e++) if (this._done(e) >= A) return Math.round((this.t[e] - this.t[i]) / DAY); return null; }
    render() {
      const T = themeOf(this.el), U = this.data.unit || 'items', W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 250 : 300, pl = 40, pr = 10, pt = 10, pb = 26, n = this.t.length, S = this.st.length;
      const hi = Math.max(...this.c.map((r, i) => this._arr(i))) * 1.05, sx = i => pl + (i / Math.max(1, n - 1)) * (W - pl - pr), sy = v => pt + (1 - v / hi) * (H - pt - pb);
      this._W = W; this._pl = pl; this._step = (W - pl - pr) / Math.max(1, n - 1);
      let s = ticks(0, hi, 4).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + v + '</text>').join('');
      // stack from done (bottom) up to new (top)
      const cum = this.c.map(r => { const out = new Array(S + 1).fill(0); for (let k = S - 1, acc = 0; k >= 0; k--) { acc += r[k]; out[k] = acc; } return out; });
      for (let k = 0; k < S; k++) { const top = cum.map((r, i) => f1(sx(i)) + ' ' + f1(sy(r[k]))), bot = cum.map((r, i) => f1(sx(i)) + ' ' + f1(sy(r[k + 1] || 0))).reverse(); s += '<path d="M' + top.join(' L') + ' L' + bot.join(' L') + 'Z" fill="' + colorFor(this.el, this.st[k], k) + '" opacity=".8"/>'; }
      const every = Math.ceil(n / (narrow ? 4 : 8)); this.t.forEach((t, i) => { if (i % every === 0) s += '<text x="' + f1(clamp(sx(i), pl + 12, W - 20)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + dstr(t) + '</text>'; });
      if (this.at != null) { const i = this.at, L = this._lead(i); s += '<line x1="' + f1(sx(i)) + '" y1="' + pt + '" x2="' + f1(sx(i)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '" stroke-width="1.5"/>'; if (L != null && L > 0) { const e = this.t.findIndex(t => t >= this.t[i] + L * DAY); s += '<line x1="' + f1(sx(i)) + '" y1="' + f1(sy(this._arr(i))) + '" x2="' + f1(sx(e)) + '" y2="' + f1(sy(this._arr(i))) + '" stroke="' + T.fg + '" stroke-width="2" stroke-dasharray="4 3"/>'; } }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Work in each stage over time. Use the arrow keys to move day by day.'); this.$svg.setAttribute('aria-valuemax', String(n - 1));
      if (this.at != null) { this.$svg.setAttribute('aria-valuenow', String(this.at)); this.$svg.setAttribute('aria-valuetext', dstr(this.t[this.at])); }
      this.$svg.innerHTML = s;
      this.$leg.innerHTML = this.st.slice().reverse().map(st => '<span><i style="background:' + esc(colorFor(this.el, st, st.i)) + '"></i>' + esc(st.label) + '</span>').join('');
      const i = this.at != null ? this.at : n - 1, L = this._lead(i), wipNow = this._wip(i), w0 = this._wip(0), dn = (this._done(n - 1) - this._done(0)) / Math.max(1, (this.t[n - 1] - this.t[0]) / DAY);
      if (this.at != null) this.$note.innerHTML = '<b>' + dstr(this.t[i]) + '</b>: ' + this.st.map((st, k) => esc(st.label.toLowerCase()) + ' ' + this.c[i][k]).join(', ') + '. Work in progress: <b>' + wipNow + '</b>. ' + (L != null ? 'Everything that had arrived by then was done ' + (L ? L + ' day' + (L === 1 ? '' : 's') + ' later.' : 'the same day.') : 'Not all of it is done yet.');
      else this.$note.innerHTML = '<b>' + this._done(n - 1) + ' ' + esc(U) + '</b> done; <b>' + wipNow + '</b> in progress (' + (wipNow > w0 ? 'up from ' + w0 : wipNow < w0 ? 'down from ' + w0 : 'the same as') + ' at the start). About <b>' + f1(dn) + '</b> finished a day. A widening middle band means work is piling up. Drag along the chart to read any day.';
    }
  }

  /* ======================================================================================
   * Kpitiles: headline numbers with change and trend
   * data = { tiles:[{id,label,value,prev?,target?,unit?,prefix?,suffix?,decimals?,better?:'up'|'down',history?:[...],note?}], period? }
   * ====================================================================================== */
  class Kpitiles extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.tiles = data.tiles.map((t, i) => Object.assign({ i }, t)); this.open = null;
      el.innerHTML = '<div class="kt"></div><p class="dm-note" aria-live="polite"></p>';
      this.$g = el.querySelector('.kt'); this.$note = el.querySelector('.dm-note');
      this.$g.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; this.open = this.open === b.dataset.id ? null : b.dataset.id; this.render(); if (this.open) this._emit('select', { id: this.open }); const n = this.$g.querySelector('[data-id="' + CSS.escape(b.dataset.id) + '"]'); n && n.focus(); });
      this.render();
    }
    _state(t) { const v = +t.value, p = t.prev != null ? +t.prev : null, up = t.better !== 'down', ch = p != null ? v - p : null, good = ch == null || ch === 0 ? null : (ch > 0) === up, hit = t.target != null ? (up ? v >= +t.target : v <= +t.target) : null; return { v, p, ch, good, hit }; }
    render() {
      const T = themeOf(this.el), per = this.data.period || 'last time';
      this.$g.innerHTML = this.tiles.map(t => {
        const F = fmtOf(t), st = this._state(t), on = this.open === t.id, h = (t.history || []).map(Number), sw = 160, sh = 30;
        let spark = ''; if (h.length > 1) { const lo = Math.min(...h), hi = Math.max(...h), sp = hi - lo || 1; spark = '<svg viewBox="0 0 ' + sw + ' ' + sh + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + h.map((v, k) => (k ? 'L' : 'M') + f1((k / (h.length - 1)) * (sw - 4) + 2) + ' ' + f1(sh - 3 - ((v - lo) / sp) * (sh - 6))).join(' ') + '" fill="none" stroke="' + T.accent + '" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'; }
        const chg = st.ch == null ? '' : st.ch === 0 ? '<span class="chg flat">no change on ' + esc(per) + '</span>' : '<span class="chg ' + (st.good ? 'good' : 'bad') + '">' + (st.ch > 0 ? '▲ ' : '▼ ') + esc(fmt(Math.abs(st.ch), { prefix: F.prefix, decimals: F.decimals, suffix: F.suffix })) + (st.p ? ' (' + (st.ch > 0 ? '+' : '−') + pct(Math.abs(st.ch / st.p)) + ')' : '') + ' on ' + esc(per) + '</span>';
        const more = on ? '<span class="more">' + (t.target != null ? 'Target ' + esc(fmt(+t.target, F)) + ': ' + (st.hit ? 'met.' : esc(fmt(Math.abs(+t.target - st.v), F)) + ' to go.') + ' ' : '') + (h.length ? 'Lowest ' + esc(fmt(Math.min(...h), F)) + ', highest ' + esc(fmt(Math.max(...h), F)) + ' over the last ' + h.length + '. ' : '') + (t.note ? esc(t.note) : '') + '</span>' : '';
        return '<button type="button" data-id="' + esc(t.id) + '" aria-expanded="' + on + '"><span class="lab">' + esc(t.label) + (t.target != null ? ' · ' + (st.hit ? '✓ on target' : 'below target') : '') + '</span><span class="val">' + esc(fmt(st.v, F)) + '</span>' + chg + spark + more + '</button>';
      }).join('');
      const S = this.tiles.map(t => this._state(t)), good = S.filter(x => x.good === true).length, bad = S.filter(x => x.good === false).length, hits = S.filter(x => x.hit === true).length, tg = S.filter(x => x.hit != null).length;
      if (this.open) { const t = this.tiles.find(x => x.id === this.open), st = this._state(t); this.$note.innerHTML = '<b>' + esc(t.label) + '</b>: ' + fmt(st.v, fmtOf(t)) + (st.ch != null ? ', ' + (st.ch === 0 ? 'unchanged' : (st.ch > 0 ? 'up' : 'down') + ' on ' + esc(per) + (st.good ? ' (good)' : ' (not good)')) : '') + '.'; }
      else this.$note.innerHTML = '<b>' + good + '</b> of ' + this.tiles.length + ' moved the right way on ' + esc(per) + (bad ? ', <b>' + bad + '</b> the wrong way' : '') + '.' + (tg ? ' ' + hits + ' of ' + tg + ' targets met.' : '') + ' Tap a tile for more.';
    }
  }

  /* ======================================================================================
   * Abtest: two versions compared
   * data = { goal?:'sign-ups', a:{label,visitors,conversions}, b:{label,visitors,conversions} }  options: { editable: true }
   * ====================================================================================== */
  function abStats(a, b) {
    const pa = a.conversions / a.visitors, pb = b.conversions / b.visitors, se = Math.sqrt(pa * (1 - pa) / a.visitors + pb * (1 - pb) / b.visitors), z = se ? (pb - pa) / se : 0, chance = phi(z), d = pb - pa;
    const need = d ? Math.ceil((Math.pow(1.96 + 0.84, 2) * (pa * (1 - pa) + pb * (1 - pb))) / (d * d)) : Infinity;
    return { pa, pb, ra: wilson(a.conversions, a.visitors), rb: wilson(b.conversions, b.visitors), chance, d, lift: pa ? d / pa : 0, need };
  }
  class Abtest extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { editable: true });
      this.a = Object.assign({}, data.a); this.b = Object.assign({}, data.b);
      const box = (k, v) => '<fieldset><legend>' + esc(v.label) + '</legend><label>Visitors <input type="number" min="1" step="1" data-f="' + k + '.visitors" value="' + +v.visitors + '"' + (this.o.editable ? '' : ' readonly') + '></label><label>' + esc(data.goal ? data.goal.charAt(0).toUpperCase() + data.goal.slice(1) : 'Conversions') + ' <input type="number" min="0" step="1" data-f="' + k + '.conversions" value="' + +v.conversions + '"' + (this.o.editable ? '' : ' readonly') + '></label></fieldset>';
      el.innerHTML = '<div class="ab-in">' + box('a', this.a) + box('b', this.b) + '</div><svg role="img"></svg><p class="ab-verdict" aria-live="polite"></p><p class="dm-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$v = el.querySelector('.ab-verdict'); this.$note = el.querySelector('.dm-note');
      el.querySelector('.ab-in').addEventListener('input', e => { const f = e.target.dataset.f; if (!f) return; const [k, field] = f.split('.'), v = Math.max(0, Math.round(+e.target.value || 0)); this[k][field] = v; if (this[k].conversions > this[k].visitors) this[k].conversions = this[k].visitors; this.render(); this._emit('change', { chance: Math.round(this._r.chance * 1000) / 10 }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), g = this.data.goal || 'conversions', W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = 150, pl = narrow ? 70 : 100, pr = 16;
      if (!(this.a.visitors > 0 && this.b.visitors > 0)) { this.$svg.innerHTML = ''; this.$v.textContent = 'Enter visitors for both versions.'; this.$note.textContent = ''; return; }
      const r = this._r = abStats(this.a, this.b), lo = Math.max(0, Math.min(r.ra[0], r.rb[0]) * 0.9), hi = Math.min(1, Math.max(r.ra[1], r.rb[1]) * 1.1), sx = p => pl + ((p - lo) / (hi - lo || 1)) * (W - pl - pr), cA = PALETTE[0], cB = PALETTE[1];
      let s = ticks(lo * 100, hi * 100, narrow ? 4 : 6).map(v => '<line x1="' + f1(sx(v / 100)) + '" y1="14" x2="' + f1(sx(v / 100)) + '" y2="' + (H - 24) + '" stroke="' + T.line + '"/><text x="' + f1(sx(v / 100)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + v + '%</text>').join('');
      [[this.a, r.pa, r.ra, cA, 40], [this.b, r.pb, r.rb, cB, 86]].forEach(([v, p, rg, c, y]) => { s += '<text x="' + (pl - 10) + '" y="' + (y + 4) + '" text-anchor="end" font-size="12.5" font-weight="800" fill="' + T.fg + '">' + esc(fitText(v.label, pl - 14, 12.5)) + '</text><rect x="' + f1(sx(rg[0])) + '" y="' + (y - 9) + '" width="' + f1(Math.max(2, sx(rg[1]) - sx(rg[0]))) + '" height="18" rx="9" fill="' + c + '" opacity=".25"/><line x1="' + f1(sx(p)) + '" y1="' + (y - 13) + '" x2="' + f1(sx(p)) + '" y2="' + (y + 13) + '" stroke="' + c + '" stroke-width="3.5"/><text x="' + f1(sx(p)) + '" y="' + (y - 17) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + c + '">' + pct(p, 1) + '</text>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.a.label + ' ' + pct(r.pa, 1) + ', ' + this.b.label + ' ' + pct(r.pb, 1) + ', each with its likely range');
      this.$svg.innerHTML = s;
      const win = r.d >= 0 ? this.b : this.a, lose = r.d >= 0 ? this.a : this.b, ch = r.d >= 0 ? r.chance : 1 - r.chance;
      this.$v.textContent = ch >= 0.95 ? win.label + ' is very likely better.' : ch >= 0.8 ? win.label + ' is probably better, but not for sure yet.' : 'Not enough evidence yet to pick one.';
      const more = isFinite(r.need) ? Math.max(0, r.need - Math.min(this.a.visitors, this.b.visitors)) : null;
      this.$note.innerHTML = esc(this.a.label) + ': ' + pct(r.pa, 1) + ' (' + this.a.conversions.toLocaleString() + ' of ' + this.a.visitors.toLocaleString() + '); ' + esc(this.b.label) + ': ' + pct(r.pb, 1) + ' (' + this.b.conversions.toLocaleString() + ' of ' + this.b.visitors.toLocaleString() + '). ' + (r.d ? esc(win.label) + ' is ' + pct(Math.abs(r.d) * 100 / 100, 1).replace('%', '') + ' points higher (' + pct(Math.abs(r.d) / (r.d >= 0 ? r.pa : r.pb)) + ' more ' + esc(g) + '). Chance it is really better: <b>' + pct(ch) + '</b>.' : 'The two are level.') + (ch < 0.95 && more ? ' About ' + more.toLocaleString() + ' more visitors each would usually settle it.' : '') + ' The shaded bars show where each true rate probably lies.';
    }
  }

  return { Cohortgrid, Burndown, Controlchart, Cumflow, Kpitiles, Abtest, abStats, controlRules, wilson };
});
