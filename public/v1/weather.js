/*! Weather 1.0 · Dimau Infographics
 *  Six weather and sea templates. They show and work things out; they are not official warnings or navigation advice.
 *    Tidecurve    tide height through the day from the published highs and lows; next high, times below a chosen height.
 *    Warmstripes  one coloured stripe per year against a base-period average; switch to bars; warmest and coolest years.
 *    Stormtrack   a storm's path on a latitude / longitude grid, coloured by category; play it through; closest to each place.
 *    Uvday        sunburn risk (UV index) through a clear day, worked out from the sun's height; any day of the year.
 *    Feelslike    how hot it feels from temperature and humidity (heat index), on a grid of risk levels.
 *    Forecastrow  a few days ahead in rows: sky, chance of rain, and each day's low-to-high on one shared scale.
 *
 *  new Tidecurve(el, data, opts) · .on(event, fn) · .destroy()
 *  Times in the data are local wall-clock times ('YYYY-MM-DDTHH:MM'); nothing is converted to the viewer's time zone.
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Tidecurve', 'Warmstripes', 'Stormtrack', 'Uvday', 'Feelslike', 'Forecastrow'].forEach(function (k) { root[k] = m[k]; }); root.DimauWeather = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RAD = Math.PI / 180, MIN = 60000, HOUR = 3600000, DAY = 86400000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  /** 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' as a wall-clock time (held in UTC so the viewer's zone never shifts it). */
  const pt = s => { const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/); if (!m) return NaN; return Date.UTC(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)); };
  const iso = ms => new Date(ms).toISOString().slice(0, 16);
  const clock = ms => { const d = new Date(ms), h = d.getUTCHours(), m = d.getUTCMinutes(); return ((h + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'am' : 'pm'); };
  const hourL = ms => { const h = new Date(ms).getUTCHours(); return h === 12 ? 'noon' : ((h + 11) % 12 + 1) + (h < 12 ? ' am' : ' pm'); };
  const dayL = ms => { const d = new Date(ms); return DAYN[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
  const dateL = ms => { const d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
  const dur = min => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h && m ? h + ' h ' + m + ' min' : h ? h + ' h' : m + ' min'; };
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }
  function mix(stops, t) {
    t = clamp(t, 0, 1) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t)), f = t - i;
    const a = stops[i].match(/\w\w/g).map(h => parseInt(h, 16)), b = stops[i + 1].match(/\w\w/g).map(h => parseInt(h, 16));
    return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('');
  }
  const inkOn = hex => { const c = hex.match(/\w\w/g).map(h => parseInt(h, 16)); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 150 ? '#13263a' : '#ffffff'; };

  const STYLE = `
.dh{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dh) button{font:inherit;color:inherit}
.dh :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dh svg{display:block;width:100%;touch-action:pan-y}
.dh svg.dh-plot{cursor:crosshair}
.dh-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dh-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer;min-height:36px}
.dh-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dh-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dh-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dh-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.dh-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700;flex:1 1 220px}
.dh-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.dh-warn{color:#c2563a;font-weight:800}
.dh-fc{display:grid;gap:6px}
.dh-day{display:grid;grid-template-columns:2.7em 28px 3.4em 2.2em minmax(40px,1fr) 2.4em;gap:7px;align-items:center;width:100%;text-align:left;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:10px;padding:7px 10px;cursor:pointer;font-size:14px}
.dh-fc.wide .dh-day{gap:10px;grid-template-columns:7em 30px 7.5em 2.8em minmax(60px,1fr) 2.8em 6.5em}
.dh-day[aria-pressed="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.dh-day b{font-weight:800}
.dh-day svg{width:30px;height:30px}
.dh-rain{display:grid;gap:3px;font-size:12px;font-weight:700;color:var(--di-muted,#4f6578)}
.dh-rain s{display:block;height:5px;border-radius:3px;background:var(--di-line,#c9dce8);overflow:hidden;text-decoration:none}
.dh-rain s i{display:block;height:100%;background:#2f7fd1;border-radius:3px}
.dh-lo{color:var(--di-muted,#4f6578);text-align:right;font-weight:700}
.dh-hi{font-weight:800}
.dh-rng{position:relative;height:8px;border-radius:4px;background:var(--di-bg,#eef7fb)}
.dh-rng i{position:absolute;top:0;bottom:0;border-radius:4px}
.dh-wind{font-size:12px;color:var(--di-muted,#4f6578)}
.dh-chips{display:flex;flex-wrap:wrap;gap:6px}
`;
  function injectStyle() {
    if (document.getElementById('dh-style')) return;
    const s = document.createElement('style'); s.id = 'dh-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dh');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    /** A plot that reads a position from pointer or keys: fn(fraction 0–1 across the plot) for pointers, keys(e) for keyboard. */
    _scrub(svg, pick, keys) {
      let drag = false;
      const at = e => { const r = svg.getBoundingClientRect(), b = this._plot || { l: 0, r: r.width }; pick(clamp((e.clientX - r.left - b.l * r.width / (this._W || r.width)) / ((b.r - b.l) * r.width / (this._W || r.width)), 0, 1)); };
      svg.addEventListener('pointerdown', e => { drag = true; at(e); });
      svg.addEventListener('pointermove', e => { if (drag || e.pointerType === 'mouse') at(e); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => svg.addEventListener(n, () => { drag = false; }));
      svg.addEventListener('keydown', e => { if (keys(e) !== false) e.preventDefault(); });
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); clearInterval(this._timer); this.el.innerHTML = ''; this.el.classList.remove('dh'); }
  }

  /* ======================================================================================
   * Tidecurve: tide height between the published highs and lows
   * data = { place?, unit?:'m', extremes:[{t:'YYYY-MM-DDTHH:MM', h}], below?:{h,label}, now?:'YYYY-MM-DDTHH:MM' }
   * opts = { now?, below? }   events: time {t, h, rising}
   * ====================================================================================== */
  class Tidecurve extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.U = data.unit || 'm';
      this.E = data.extremes.map(e => ({ t: pt(e.t), h: +e.h })).sort((a, b) => a.t - b.t);
      this.below = this.o.below || data.below || null;
      this.t0 = this.E[0].t; this.t1 = this.E[this.E.length - 1].t;
      const now = this.o.now || data.now; this.now = now ? pt(now) : null;
      this.cur = this.now != null ? clamp(this.now, this.t0, this.t1) : this.t0;
      el.innerHTML = '<svg class="dh-plot" tabindex="0" role="img"></svg><div class="dh-legend"></div><p class="dh-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dh-legend'); this.$note = el.querySelector('.dh-note');
      this._scrub(this.$svg, f => this._set(this.t0 + f * (this.t1 - this.t0)), e => {
        const st = { ArrowLeft: -15, ArrowRight: 15, ArrowDown: -15, ArrowUp: 15, PageUp: -1440, PageDown: 1440 }[e.key];
        if (st != null) this._set(this.cur + st * (e.shiftKey ? 4 : 1) * MIN); else if (e.key === 'Home') this._set(this.t0); else if (e.key === 'End') this._set(this.t1); else return false;
      });
      this.render();
    }
    _set(t) { t = clamp(Math.round(t / MIN) * MIN, this.t0, this.t1); if (t === this.cur) return; this.cur = t; this.render(); const s = this.at(t); this._emit('time', { t: iso(t), h: f1(s.h * 10) / 10, rising: s.rising }); }
    /** Height at time t: half a cosine between each low and the next high (how tide tables are usually filled in). */
    at(t) {
      const E = this.E; let i = 0; while (i < E.length - 2 && E[i + 1].t <= t) i++;
      const a = E[i], b = E[i + 1], f = clamp((t - a.t) / (b.t - a.t), 0, 1);
      return { h: a.h + (b.h - a.h) * (1 - Math.cos(Math.PI * f)) / 2, rising: b.h > a.h, next: b };
    }
    windows() {
      if (!this.below) return []; const thr = +this.below.h, out = []; let a = null;
      for (let t = this.t0; t <= this.t1; t += 5 * MIN) { const lo = this.at(t).h < thr; if (lo && a == null) a = t; if (!lo && a != null) { out.push({ a, b: t, open: a === this.t0 }); a = null; } }
      if (a != null) out.push({ a, b: this.t1, open: a === this.t0, end: true });
      return out;
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 220 : 250, pl = 40, pr = 12, top = 30, bot = 30, U = this.U;
      const hs = this.E.map(e => e.h), lo = Math.min(0, ...hs, this.below ? +this.below.h : 0), hi = Math.max(...hs, this.below ? +this.below.h : 0), pad = (hi - lo) * 0.12 || 0.2;
      const yt = ticks(lo - pad * 0.3, hi + pad, 4), y0 = Math.min(yt[0], lo), y1 = Math.max(yt[yt.length - 1], hi + pad * 0.5);
      const x = t => pl + (t - this.t0) / (this.t1 - this.t0) * (W - pl - pr), y = h => H - bot - (h - y0) / (y1 - y0) * (H - top - bot);
      this._W = W; this._plot = { l: pl, r: W - pr };
      let s = '';
      yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + T.line + '" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + v + ' ' + esc(U) + '</text>'; });
      const wins = this.windows();
      wins.forEach(w => { s += '<rect x="' + f1(x(w.a)) + '" y="' + top + '" width="' + f1(Math.max(1, x(w.b) - x(w.a))) + '" height="' + (H - top - bot) + '" fill="#1fa38a" opacity=".14"/>'; });
      // days and hours
      const step = narrow ? 12 : 6;
      for (let t = Math.floor(this.t0 / DAY) * DAY; t <= this.t1; t += step * HOUR) {
        if (t < this.t0) continue; const mid = t % DAY === 0;
        s += '<line x1="' + f1(x(t)) + '" x2="' + f1(x(t)) + '" y1="' + (mid ? 14 : top) + '" y2="' + (H - bot + 4) + '" stroke="' + T.line + '" stroke-width="1"' + (mid ? '' : ' stroke-dasharray="2 4"') + '/>';
        if (!mid) s += '<text x="' + f1(x(t)) + '" y="' + (H - bot + 17) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + hourL(t) + '</text>';
      }
      for (let t = Math.floor(this.t0 / DAY) * DAY; t <= this.t1; t += DAY) {
        const a = Math.max(t, this.t0), b = Math.min(t + DAY, this.t1), sx = x(a) + 4, room = x(b) - x(a);
        if (room > 44) s += '<text x="' + f1(sx) + '" y="12" font-size="11" font-weight="800" fill="' + T.fg + '">' + esc(room > 90 ? dayL(a) : DAYN[new Date(a).getUTCDay()]) + '</text>';
      }
      if (this.below) { const yb = y(+this.below.h); s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(yb) + '" y2="' + f1(yb) + '" stroke="#1fa38a" stroke-width="1.5" stroke-dasharray="5 4"/><text x="' + (W - pr - 4) + '" y="' + f1(yb - 5) + '" font-size="10.5" font-weight="700" text-anchor="end" fill="#1a8a74" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3">' + esc((this.below.label ? this.below.label + ': ' : '') + 'below ' + this.below.h + ' ' + U) + '</text>'; }
      let path = '';
      for (let t = this.t0; t <= this.t1; t += 10 * MIN) path += (path ? 'L' : 'M') + f1(x(t)) + ',' + f1(y(this.at(t).h));
      path += 'L' + f1(x(this.t1)) + ',' + f1(y(this.E[this.E.length - 1].h));
      s += '<path d="' + path + 'L' + f1(x(this.t1)) + ',' + (H - bot) + 'L' + pl + ',' + (H - bot) + 'Z" fill="' + T.accent + '" opacity=".16"/><path d="' + path + '" fill="none" stroke="' + T.accent + '" stroke-width="2.4"/>';
      let gap = Infinity; for (let i = 1; i < this.E.length; i++) gap = Math.min(gap, x(this.E[i].t) - x(this.E[i - 1].t));
      this.E.forEach((e, i) => {
        const high = (i > 0 ? e.h > this.E[i - 1].h : e.h > this.E[i + 1].h), cx = x(e.t), cy = y(e.h), anc = cx < pl + 24 ? 'start' : cx > W - pr - 24 ? 'end' : 'middle';
        s += '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="3.5" fill="' + T.surface + '" stroke="' + T.accent + '" stroke-width="2"/>';
        if (gap > 30) s += '<text x="' + f1(cx) + '" y="' + f1(high ? cy - 8 : cy + 15) + '" font-size="10.5" font-weight="700" text-anchor="' + anc + '" fill="' + T.fg + '">' + e.h.toFixed(1) + (gap > 64 ? ' · ' + clock(e.t) : '') + '</text>';
      });
      if (this.now != null && this.now >= this.t0 && this.now <= this.t1) s += '<line x1="' + f1(x(this.now)) + '" x2="' + f1(x(this.now)) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="' + T.muted + '" stroke-width="1.5" stroke-dasharray="1 3"/>';
      const c = this.at(this.cur), cx = x(this.cur);
      s += '<line x1="' + f1(cx) + '" x2="' + f1(cx) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="' + T.fg + '" stroke-width="1.2"/><circle cx="' + f1(cx) + '" cy="' + f1(y(c.h)) + '" r="5.5" fill="' + T.accent + '" stroke="' + T.surface + '" stroke-width="2"/>';
      const lab = c.h.toFixed(2) + ' ' + U + (c.rising ? ' ↑' : ' ↓'), lw = lab.length * 6.6 + 10, lx = clamp(cx - lw / 2, pl, W - pr - lw);
      s += '<rect x="' + f1(lx) + '" y="' + (top - 2) + '" width="' + f1(lw) + '" height="18" rx="5" fill="' + T.fg + '"/><text x="' + f1(lx + lw / 2) + '" y="' + (top + 11) + '" font-size="11" font-weight="800" text-anchor="middle" fill="' + T.surface + '">' + esc(lab) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Tide height' + (this.data.place ? ' at ' + this.data.place : '') + ' from ' + dayL(this.t0) + ' to ' + dayL(this.t1) + '. Use the arrow keys to move through the day.');
      this.$svg.innerHTML = s;
      this.$leg.innerHTML = '<span><i style="background:' + T.accent + '"></i>Tide height</span>' + (this.below ? '<span><i style="background:#1fa38a;opacity:.5"></i>Below ' + esc(this.below.h + ' ' + U) + (this.below.label ? ' (' + esc(this.below.label) + ')' : '') + '</span>' : '') + (this.now != null ? '<span>Dotted line: now</span>' : '');
      const nx = this.E.find((e, i) => e.t > this.cur && (i > 0 ? e.h > this.E[i - 1].h : e.h > this.E[1].h));
      let note = '<b>' + dayL(this.cur) + ', ' + clock(this.cur) + '</b>: ' + c.h.toFixed(2) + ' ' + U + ' and ' + (c.rising ? 'rising' : 'falling') + '.';
      if (nx) note += ' Next high: ' + nx.h.toFixed(2) + ' ' + U + ' at ' + clock(nx.t) + (new Date(nx.t).getUTCDate() !== new Date(this.cur).getUTCDate() ? ' on ' + dayL(nx.t) : '') + ' (in ' + dur((nx.t - this.cur) / MIN) + ').';
      if (this.below) {
        const ds = Math.floor(this.cur / DAY) * DAY, today = wins.filter(w => w.b > ds && w.a < ds + DAY);
        note += ' Below ' + this.below.h + ' ' + U + (this.below.label ? ' (' + esc(this.below.label.toLowerCase()) + ')' : '') + ' on ' + dayL(this.cur) + ': ' + (today.length ? today.map(w => (w.a < ds || w.open ? 'until ' + clock(w.b) : clock(w.a) + (w.end ? ' to the end of the times given' : '–' + clock(w.b) + (w.b > ds + DAY ? ' (next day)' : '')))).join(' and ') : 'not at all') + '.';
      }
      this.$note.innerHTML = note;
    }
  }

  /* ======================================================================================
   * Warmstripes: one stripe per year, coloured by how far it is from a base-period average
   * data = { title?, unit?:'°C', base:[fromYear,toYear], years:[{y, v}] }
   * opts = { mode?:'stripes'|'bars' }   events: year {y, v, diff, rank}
   * ====================================================================================== */
  const STRIPES = ['#08306b', '#2166ac', '#4393c3', '#92c5de', '#f7f7f7', '#f4a582', '#d6604d', '#b2182b', '#67000d'];
  class Warmstripes extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: 'stripes' });
      this.U = data.unit || '°C'; this.Y = data.years.map(d => ({ y: +d.y, v: +d.v })).sort((a, b) => a.y - b.y);
      const b = data.base || [this.Y[0].y, this.Y[this.Y.length - 1].y], inb = this.Y.filter(d => d.y >= b[0] && d.y <= b[1]);
      this.base = b; this.mean = inb.reduce((a, d) => a + d.v, 0) / (inb.length || 1);
      this.Y.forEach(d => { d.d = d.v - this.mean; });
      const byWarm = this.Y.slice().sort((a, b2) => b2.d - a.d); byWarm.forEach((d, i) => { d.rank = i + 1; });
      this.max = Math.max(...this.Y.map(d => Math.abs(d.d))) || 1; this.mode = this.o.mode; this.sel = null;
      el.innerHTML = '<div class="dh-bar" role="group" aria-label="Show as"></div><svg class="dh-plot" tabindex="0" role="img"></svg><div class="dh-legend"></div><p class="dh-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.dh-bar'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dh-legend'); this.$note = el.querySelector('.dh-note');
      this.$bar.addEventListener('click', e => { const m = e.target.closest('[data-mode]'); if (m) { this.mode = m.dataset.mode; this.render(); } });
      const n = this.Y.length;
      this._scrub(this.$svg, f => this._set(Math.min(n - 1, Math.floor(f * n))), e => {
        const i = this.sel == null ? -1 : this.sel, st = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1, PageUp: -10, PageDown: 10 }[e.key];
        if (st != null) this._set(clamp(i < 0 ? (st > 0 ? 0 : n - 1) : i + st, 0, n - 1)); else if (e.key === 'Home') this._set(0); else if (e.key === 'End') this._set(n - 1); else if (e.key === 'Escape') { this.sel = null; this.render(); } else return false;
      });
      this.render();
    }
    _set(i) { if (i === this.sel) return; this.sel = i; this.render(); const d = this.Y[i]; this._emit('year', { y: d.y, v: d.v, diff: Math.round(d.d * 100) / 100, rank: d.rank }); }
    col(d) { return mix(STRIPES, 0.5 + d / (2 * this.max)); }
    _diff(d) { const a = Math.abs(d).toFixed(Math.abs(d) < 0.1 ? 2 : 1); return a + ' ' + this.U + (d >= 0 ? ' above' : ' below') + ' the ' + this.base[0] + '–' + this.base[1] + ' average'; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, n = this.Y.length, bars = this.mode === 'bars';
      const pl = bars ? 46 : 0, pr = bars ? 6 : 0, top = 6, H = (narrow ? 150 : 200) + (bars ? 30 : 0), bot = 24, cw = (W - pl - pr) / n;
      this._W = W; this._plot = { l: pl, r: W - pr };
      let s = '';
      if (bars) {
        const yt = ticks(-this.max, this.max, 4), m = Math.max(this.max, Math.abs(yt[0]), yt[yt.length - 1]), y = v => top + (1 - (v + m) / (2 * m)) * (H - top - bot);
        yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + (v === 0 ? T.fg : T.line) + '" stroke-width="1"/><text x="' + (pl - 5) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '</text>'; });
        this.Y.forEach((d, i) => { const a = y(Math.max(0, d.d)), b = y(Math.min(0, d.d)); s += '<rect x="' + f1(pl + i * cw + cw * 0.1) + '" y="' + f1(a) + '" width="' + f1(Math.max(0.8, cw * 0.8)) + '" height="' + f1(Math.max(0.5, b - a)) + '" fill="' + this.col(d.d) + '"' + (this.sel != null && this.sel !== i ? ' opacity=".55"' : '') + '/>'; });
      } else {
        this.Y.forEach((d, i) => { s += '<rect x="' + f1(pl + i * cw) + '" y="' + top + '" width="' + f1(cw + 0.6) + '" height="' + (H - top - bot) + '" fill="' + this.col(d.d) + '"/>'; });
      }
      const every = [5, 10, 20, 25, 50].find(k => (W - pl - pr) / (n / k) > 44) || 50;
      this.Y.forEach((d, i) => { const end = i === 0 || i === n - 1; if (end || (d.y % every === 0 && Math.min(i, n - 1 - i) * cw >= 34)) { const tx = pl + i * cw + cw / 2; s += '<text x="' + f1(clamp(tx, 14, W - 14)) + '" y="' + (H - 7) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + d.y + '</text>'; } });
      if (this.sel != null) {
        const d = this.Y[this.sel], cx = pl + this.sel * cw;
        s += '<rect x="' + f1(cx - 1) + '" y="' + (top - 2) + '" width="' + f1(cw + 2) + '" height="' + (H - top - bot + 4) + '" fill="none" stroke="' + T.fg + '" stroke-width="2"/>';
        const lab = d.y + ': ' + (d.d >= 0 ? '+' : '−') + Math.abs(d.d).toFixed(2) + ' ' + this.U, lw = lab.length * 6.6 + 12, lx = clamp(cx + cw / 2 - lw / 2, 0, W - lw);
        s += '<rect x="' + f1(lx) + '" y="' + (top + 6) + '" width="' + f1(lw) + '" height="19" rx="5" fill="' + T.fg + '" opacity=".92"/><text x="' + f1(lx + lw / 2) + '" y="' + (top + 19) + '" font-size="11" font-weight="800" text-anchor="middle" fill="' + T.surface + '">' + esc(lab) + '</text>';
      }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (this.data.title || 'Yearly values') + ', ' + this.Y[0].y + ' to ' + this.Y[n - 1].y + ', coloured by difference from the ' + this.base[0] + '–' + this.base[1] + ' average. Use the arrow keys to read each year.');
      this.$svg.innerHTML = s;
      this.$bar.innerHTML = [['stripes', 'Stripes'], ['bars', 'Bars']].map(([k, l]) => '<button type="button" class="dh-btn" data-mode="' + k + '" aria-pressed="' + (this.mode === k) + '">' + l + '</button>').join('');
      this.$leg.innerHTML = '<span><i style="background:' + mix(STRIPES, 0.08) + '"></i>Cooler than the ' + this.base[0] + '–' + this.base[1] + ' average (' + this.mean.toFixed(1) + ' ' + esc(this.U) + ')</span><span><i style="background:' + mix(STRIPES, 0.92) + '"></i>Warmer</span>';
      if (this.sel != null) { const d = this.Y[this.sel]; this.$note.innerHTML = '<b>' + d.y + '</b>: ' + d.v.toFixed(2) + ' ' + esc(this.U) + ', ' + this._diff(d.d) + ' — the ' + ord(d.rank) + ' warmest of ' + n + ' years.'; return; }
      const warm = this.Y.reduce((a, d) => d.d > a.d ? d : a), cool = this.Y.reduce((a, d) => d.d < a.d ? d : a), last = this.Y.slice(-10), above = last.filter(d => d.d > 0).length;
      this.$note.innerHTML = 'Warmest: <b>' + warm.y + '</b>, ' + this._diff(warm.d) + '. Coolest: <b>' + cool.y + '</b>, ' + this._diff(cool.d) + '. ' + (above === last.length ? 'The last ' + last.length + ' years were all above the average.' : above + ' of the last ' + last.length + ' years were above the average.') + ' Tap a stripe or use the arrow keys to read a year.';
    }
  }

  /* ======================================================================================
   * Stormtrack: a storm's path, coloured by category, with the closest pass to each place
   * data = { name?, unit?:'km/h', points:[{t, lat, lon, wind, cat?, forecast?}], places?:[{id,label,lat,lon}] }
   * opts = { at?: index }   events: time {t, cat, wind, forecast}
   * Categories from the 10-minute mean wind (km/h), as used in the South Pacific: 1 from 63, 2 from 89, 3 from 118, 4 from 159, 5 from 200.
   * ====================================================================================== */
  const CATC = ['#7fa7c9', '#3fae6b', '#d9b62a', '#ef8a2d', '#d9452b', '#9b2d6f'];
  const catOf = w => w >= 200 ? 5 : w >= 159 ? 4 : w >= 118 ? 3 : w >= 89 ? 2 : w >= 63 ? 1 : 0;
  const catL = c => c ? 'category ' + c : 'below cyclone strength';
  function km(a, b) { const s = Math.sin((b.lat - a.lat) * RAD / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin((b.L - a.L) * RAD / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s))); }
  class Stormtrack extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.U = data.unit || 'km/h';
      const wrap = data.points.some(p => p.lon > 150) && [...data.points, ...(data.places || [])].some(p => p.lon < -150);
      const L = lon => wrap && lon < 0 ? lon + 360 : lon;
      this.P = data.points.map(p => ({ t: pt(p.t), lat: +p.lat, L: L(+p.lon), wind: +p.wind, cat: p.cat != null ? +p.cat : catOf(+p.wind), fc: !!p.forecast })).sort((a, b) => a.t - b.t);
      this.Q = (data.places || []).map((p, i) => ({ id: p.id || 'p' + i, label: p.label, lat: +p.lat, L: L(+p.lon) }));
      this.Q.forEach(q => { let best = { d: Infinity }; for (let i = 0; i < this.P.length - 1; i++) for (let k = 0; k <= 20; k++) { const a = this.P[i], b = this.P[i + 1], f = k / 20, p = { lat: a.lat + (b.lat - a.lat) * f, L: a.L + (b.L - a.L) * f }, d = km(p, q); if (d < best.d) best = { d, t: a.t + (b.t - a.t) * f, cat: f < 0.5 ? a.cat : b.cat, fc: b.fc }; } q.near = best; });
      const firstFc = this.P.findIndex(p => p.fc); this.i = this.o.at != null ? clamp(+this.o.at, 0, this.P.length - 1) : firstFc > 0 ? firstFc - 1 : this.P.length - 1;
      el.innerHTML = '<div class="dh-bar"><button type="button" class="dh-btn" data-play aria-pressed="false">Play</button><label class="dh-range"><span></span><input type="range" min="0" max="' + (this.P.length - 1) + '" step="1" value="' + this.i + '" aria-label="Time along the track"></label></div><svg role="img"></svg><div class="dh-legend"></div><p class="dh-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dh-legend'); this.$note = el.querySelector('.dh-note'); this.$in = el.querySelector('input'); this.$lab = el.querySelector('.dh-range span'); this.$play = el.querySelector('[data-play]');
      this.$in.addEventListener('input', () => { this._stop(); this._set(+this.$in.value); });
      this.$play.addEventListener('click', () => { if (this._timer) return this._stop(); if (this.i >= this.P.length - 1) this._set(0); this.$play.setAttribute('aria-pressed', 'true'); this.$play.textContent = 'Pause'; this._timer = setInterval(() => { if (this.i >= this.P.length - 1) return this._stop(); this._set(this.i + 1); }, 650); });
      this.render();
    }
    _stop() { clearInterval(this._timer); this._timer = null; this.$play.setAttribute('aria-pressed', 'false'); this.$play.textContent = 'Play'; }
    _set(i) { if (i === this.i) return; this.i = i; this.$in.value = i; this.render(); const p = this.P[i]; this._emit('time', { t: iso(p.t), cat: p.cat, wind: p.wind, forecast: p.fc }); }
    _ll(v, ns) { const a = Math.abs(v); return ns ? f1(a) + '°' + (v < 0 ? 'S' : 'N') : (v > 180 ? f1(360 - v) + '°W' : f1(a) + '°' + (v < 0 ? 'W' : 'E')); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, all = [...this.P, ...this.Q];
      let la0 = Math.min(...all.map(p => p.lat)), la1 = Math.max(...all.map(p => p.lat)), lo0 = Math.min(...all.map(p => p.L)), lo1 = Math.max(...all.map(p => p.L));
      const k = Math.cos((la0 + la1) / 2 * RAD), padA = Math.max(0.6, (la1 - la0) * 0.08), padO = Math.max(0.6, (lo1 - lo0) * 0.08); la0 -= padA; la1 += padA; lo0 -= padO; lo1 += padO;
      const pl = 8, pr = 8, top = 8, bot = 22, iw = W - pl - pr; let H = Math.round(iw * (la1 - la0) / ((lo1 - lo0) * k)) + top + bot; H = clamp(H, narrow ? 240 : 280, narrow ? 460 : 520);
      const sc = Math.min(iw / ((lo1 - lo0) * k), (H - top - bot) / (la1 - la0)), cxo = pl + (iw - (lo1 - lo0) * k * sc) / 2, cyo = top + ((H - top - bot) - (la1 - la0) * sc) / 2;
      const X = p => cxo + (p.L - lo0) * k * sc, Y = p => cyo + (la1 - p.lat) * sc;
      let s = '<rect x="' + pl + '" y="' + top + '" width="' + iw + '" height="' + (H - top - bot) + '" rx="8" fill="' + T.bg + '" stroke="' + T.line + '"/>';
      const gs = niceStep(Math.max(la1 - la0, (lo1 - lo0)), narrow ? 3 : 5);
      for (let v = Math.ceil(la0 / gs) * gs; v <= la1; v += gs) { const yy = Y({ lat: v }); s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(yy) + '" y2="' + f1(yy) + '" stroke="' + T.line + '" stroke-dasharray="2 4"/><text x="' + (pl + 4) + '" y="' + f1(yy - 3) + '" font-size="10" fill="' + T.muted + '">' + this._ll(+v.toFixed(4), true) + '</text>'; }
      for (let v = Math.ceil(lo0 / gs) * gs; v <= lo1; v += gs) { const xx = X({ L: v }); s += '<line x1="' + f1(xx) + '" x2="' + f1(xx) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="' + T.line + '" stroke-dasharray="2 4"/><text x="' + f1(clamp(xx, pl + 20, W - pr - 20)) + '" y="' + (H - 7) + '" font-size="10" text-anchor="middle" fill="' + T.muted + '">' + this._ll(+v.toFixed(4)) + '</text>'; }
      for (let i = 0; i < this.P.length - 1; i++) { const a = this.P[i], b = this.P[i + 1]; s += '<line x1="' + f1(X(a)) + '" y1="' + f1(Y(a)) + '" x2="' + f1(X(b)) + '" y2="' + f1(Y(b)) + '" stroke="' + CATC[b.cat] + '" stroke-width="' + (b.fc ? 2 : 3.5) + '"' + (b.fc ? ' stroke-dasharray="5 5"' : '') + ' stroke-linecap="round"' + (i >= this.i ? ' opacity=".45"' : '') + '/>'; }
      this.P.forEach((p, i) => { s += '<circle cx="' + f1(X(p)) + '" cy="' + f1(Y(p)) + '" r="' + (p.cat >= 3 ? 4.5 : 3.5) + '" fill="' + (p.fc ? T.surface : CATC[p.cat]) + '" stroke="' + CATC[p.cat] + '" stroke-width="2"' + (i > this.i ? ' opacity=".5"' : '') + '/>'; });
      const c = this.P[this.i], ccx = X(c), ccy = Y(c), r = 10 + c.cat * 3;
      s += '<circle cx="' + f1(ccx) + '" cy="' + f1(ccy) + '" r="' + r + '" fill="' + CATC[c.cat] + '" opacity=".25"/><circle cx="' + f1(ccx) + '" cy="' + f1(ccy) + '" r="7" fill="' + CATC[c.cat] + '" stroke="' + T.surface + '" stroke-width="2.5"/>';
      this.Q.forEach(q => { const qx = X(q), qy = Y(q), right = qx < W - 90; s += '<rect x="' + f1(qx - 4) + '" y="' + f1(qy - 4) + '" width="8" height="8" fill="' + T.fg + '" transform="rotate(45 ' + f1(qx) + ' ' + f1(qy) + ')"/><text x="' + f1(qx + (right ? 9 : -9)) + '" y="' + f1(qy + 4) + '" font-size="11.5" font-weight="700" text-anchor="' + (right ? 'start' : 'end') + '" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.bg + '" stroke-width="3">' + esc(q.label) + '</text>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (this.data.name || 'The storm') + "'s track from " + dayL(this.P[0].t) + ' to ' + dayL(this.P[this.P.length - 1].t) + '. The summary below gives the closest pass to each place.');
      this.$svg.innerHTML = s;
      this.$lab.textContent = dayL(c.t) + ', ' + clock(c.t) + (c.fc ? ' (forecast)' : '');
      const used = [...new Set(this.P.map(p => p.cat))].sort();
      this.$leg.innerHTML = used.map(k2 => '<span><i style="background:' + CATC[k2] + '"></i>' + (k2 ? 'Category ' + k2 : 'Below cyclone strength') + '</span>').join('') + (this.P.some(p => p.fc) ? '<span>Dashed: forecast</span>' : '');
      const near = this.Q.map(q => q.label + ' ' + Math.round(q.near.d / 5) * 5 + ' km at ' + clock(q.near.t) + ' ' + dayL(q.near.t) + ' (' + catL(q.near.cat) + (q.near.fc ? ', forecast' : '') + ')');
      this.$note.innerHTML = '<b>' + esc(this.data.name || 'The storm') + ', ' + dayL(c.t) + ' ' + clock(c.t) + (c.fc ? ' (forecast)' : '') + '</b>: ' + catL(c.cat) + ', winds about ' + c.wind + ' ' + esc(this.U) + '.' + (this.Q.length ? ' Closest pass: ' + near.map(esc).join('; ') + '.' : '');
    }
  }

  /* ======================================================================================
   * Uvday: the UV index through a clear day, from the sun's height
   * data = { place?, lat, lon, tz (hours from UTC), date:'YYYY-MM-DD', ozone?: Dobson units (default 270) }
   * events: date {date, peak, from, to}
   * Clear-sky estimate: UVI ≈ 12.5 · cos(z)^2.42 · (ozone / 300)^−1.23 (Madronich's approximation). Cloud, haze and altitude change it.
   * ====================================================================================== */
  const UVB = [[0, 'Low', '#3ea72d'], [3, 'Moderate', '#e8c31a'], [6, 'High', '#f18b00'], [8, 'Very high', '#e53210'], [11, 'Extreme', '#b567a4']];
  const uvBand = v => UVB.reduce((a, b) => (Math.round(v) >= b[0] ? b : a));
  function cosZen(dayMs, minute, lat, lon, tz) {
    const d = new Date(dayMs), doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / DAY);
    const g = (2 * Math.PI / 365) * (doy - 1 + (minute / 60 - 12) / 24);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const ha = ((minute + eq + 4 * lon - 60 * tz) / 4 - 180) * RAD;
    return Math.sin(lat * RAD) * Math.sin(decl) + Math.cos(lat * RAD) * Math.cos(decl) * Math.cos(ha);
  }
  class Uvday extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.day = pt(data.date); this.cur = null;
      el.innerHTML = '<div class="dh-bar"><label class="dh-range"><span></span><input type="range" min="0" max="364" step="1" aria-label="Day of the year"></label></div><svg class="dh-plot" tabindex="0" role="img"></svg><div class="dh-legend"></div><p class="dh-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dh-legend'); this.$note = el.querySelector('.dh-note'); this.$in = el.querySelector('input'); this.$lab = el.querySelector('.dh-range span');
      const y0 = Date.UTC(new Date(this.day).getUTCFullYear(), 0, 1); this.y0 = y0; this.$in.value = Math.round((this.day - y0) / DAY);
      this.$in.addEventListener('input', () => { this.day = this.y0 + (+this.$in.value) * DAY; this.render(); const c = this.curve(); this._emit('date', { date: iso(this.day).slice(0, 10), peak: c.peak, from: c.from, to: c.to }); });
      this._scrub(this.$svg, f => { this.cur = Math.round((this.m0 + f * (this.m1 - this.m0)) / 5) * 5; this.render(); }, e => {
        const st = { ArrowLeft: -15, ArrowRight: 15, ArrowDown: -15, ArrowUp: 15 }[e.key], c = this.cur == null ? 720 : this.cur;
        if (st != null) this.cur = clamp(c + st * (e.shiftKey ? 4 : 1), this.m0, this.m1); else if (e.key === 'Home') this.cur = this.m0; else if (e.key === 'End') this.cur = this.m1; else if (e.key === 'Escape') this.cur = null; else return false;
        this.render();
      });
      this.render();
    }
    uv(m) { const d = this.data, cz = cosZen(this.day, m, +d.lat, +d.lon, +d.tz); return cz <= 0 ? 0 : 12.5 * Math.pow(cz, 2.42) * Math.pow((+d.ozone || 270) / 300, -1.23); }
    curve() {
      const pts = []; let peak = 0, pm = 720, from = null, to = null;
      for (let m = 0; m <= 1440; m += 5) { const v = this.uv(m); pts.push([m, v]); if (v > peak) { peak = v; pm = m; } if (v >= 2.5) { if (from == null) from = m; to = m; } }
      return { pts, peak: Math.round(peak), pm, from, to, fromL: from == null ? null : clock(this.day + from * MIN), toL: to == null ? null : clock(this.day + to * MIN) };
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, c = this.curve(), d = this.data;
      const lit = c.pts.filter(p => p[1] > 0.05), m0 = Math.max(0, Math.floor((lit.length ? lit[0][0] : 360) / 60) * 60 - 30), m1 = Math.min(1440, Math.ceil((lit.length ? lit[lit.length - 1][0] : 1080) / 60) * 60 + 30);
      this.m0 = m0; this.m1 = m1;
      const H = narrow ? 230 : 260, pl = 30, pr = 10, top = 14, bot = 26, ym = Math.max(12, Math.ceil(c.peak + 1));
      const x = m => pl + (m - m0) / (m1 - m0) * (W - pl - pr), y = v => H - bot - v / ym * (H - top - bot);
      this._W = W; this._plot = { l: pl, r: W - pr };
      let s = '<defs><clipPath id="dh-uvclip-' + this._id() + '"><path d="' + 'M' + f1(x(m0)) + ',' + (H - bot) + c.pts.filter(p => p[0] >= m0 && p[0] <= m1).map(p => 'L' + f1(x(p[0])) + ',' + f1(y(p[1]))).join('') + 'L' + f1(x(m1)) + ',' + (H - bot) + 'Z"/></clipPath></defs>';
      UVB.forEach((b, i) => { const lo = b[0] - (i ? 0.5 : 0), hi = i < UVB.length - 1 ? UVB[i + 1][0] - 0.5 : ym; s += '<rect x="' + pl + '" y="' + f1(y(Math.min(hi, ym))) + '" width="' + (W - pl - pr) + '" height="' + f1(Math.max(0, y(lo) - y(Math.min(hi, ym)))) + '" fill="' + b[2] + '" clip-path="url(#dh-uvclip-' + this._id() + ')"/>'; });
      UVB.slice(1).forEach(b => { if (b[0] - 0.5 > ym) return; s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(b[0] - 0.5)) + '" y2="' + f1(y(b[0] - 0.5)) + '" stroke="' + T.line + '" stroke-dasharray="3 4"/><text x="' + (pl - 5) + '" y="' + f1(y(b[0] - 0.5) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + b[0] + '</text>'; });
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - bot) + '" y2="' + (H - bot) + '" stroke="' + T.fg + '"/>';
      s += '<path d="' + c.pts.filter(p => p[0] >= m0 && p[0] <= m1).map((p, i) => (i ? 'L' : 'M') + f1(x(p[0])) + ',' + f1(y(p[1]))).join('') + '" fill="none" stroke="' + T.fg + '" stroke-width="1.6"/>';
      const hstep = narrow ? 180 : 120;
      for (let m = Math.ceil(m0 / hstep) * hstep; m <= m1; m += hstep) s += '<text x="' + f1(x(m)) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + hourL(this.day + m * MIN) + '</text>';
      const pb = uvBand(c.peak);
      s += '<text x="' + f1(clamp(x(c.pm), pl + 30, W - pr - 30)) + '" y="' + f1(y(c.peak) - 6) + '" font-size="12" font-weight="800" text-anchor="middle" fill="' + T.fg + '">' + c.peak + ' · ' + esc(pb[1]) + '</text>';
      if (this.cur != null) { const v = this.uv(this.cur), cx = x(this.cur); s += '<line x1="' + f1(cx) + '" x2="' + f1(cx) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="' + T.fg + '" stroke-width="1.2"/><circle cx="' + f1(cx) + '" cy="' + f1(y(v)) + '" r="5" fill="' + T.surface + '" stroke="' + T.fg + '" stroke-width="2"/>'; }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'UV index through ' + dateL(this.day) + (d.place ? ' in ' + d.place : '') + ', clear sky. Use the arrow keys to read a time.');
      this.$svg.innerHTML = s;
      this.$lab.textContent = 'Day: ' + dateL(this.day);
      this.$leg.innerHTML = UVB.map(b => '<span><i style="background:' + b[2] + '"></i>' + b[1] + ' (' + b[0] + (b === UVB[UVB.length - 1] ? '+' : '–' + (UVB[UVB.indexOf(b) + 1][0] - 1)) + ')</span>').join('');
      const head = '<b>' + dateL(this.day) + (d.place ? ' in ' + esc(d.place) : '') + '</b>';
      if (this.cur != null) { const v = Math.round(this.uv(this.cur)); this.$note.innerHTML = head + ', ' + clock(this.day + this.cur * MIN) + ': UV about ' + v + ', ' + uvBand(v)[1].toLowerCase() + ' (clear sky).'; return; }
      this.$note.innerHTML = head + ': on a clear day the UV index peaks at about <b>' + c.peak + '</b> (' + pb[1].toLowerCase() + ') at ' + clock(this.day + c.pm * MIN) + '. ' + (c.from != null ? 'It is 3 or more from ' + c.fromL + ' to ' + c.toL + ': cover up, wear a hat and sunscreen, and find shade around midday.' : 'It stays below 3 all day.') + ' Cloud lowers it; sand, water and height raise it.';
    }
    _id() { return this.__id || (this.__id = Math.random().toString(36).slice(2, 8)); }
  }

  /* ======================================================================================
   * Feelslike: heat index from temperature and humidity
   * data = { temp (°C), humidity (%), readings?:[{id,label,temp,humidity}] }
   * events: change {temp, humidity, feels, level}
   * The US National Weather Service heat index (Rothfusz regression with its adjustments). It assumes shade and a light wind.
   * ====================================================================================== */
  const HEAT = [[-99, 'Lower risk', '#cfe3ee', 'Take normal care.'], [27, 'Caution', '#f5d76e', 'Tiredness is possible with long exposure or activity.'], [33, 'Extreme caution', '#f0a33a', 'Heat cramps and heat exhaustion are possible; heatstroke with long exposure or activity.'], [40, 'Danger', '#e0592a', 'Heat cramps and heat exhaustion are likely; heatstroke is possible with long exposure or activity.'], [52, 'Extreme danger', '#a8233a', 'Heatstroke is highly likely.']];
  const heatLevel = c => HEAT.reduce((a, b) => (Math.round(c) >= b[0] ? b : a));
  function heatIndex(tc, rh) {
    const T = tc * 9 / 5 + 32; let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + rh * 0.094);
    if ((hi + T) / 2 >= 80) {
      hi = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 0.00683783 * T * T - 0.05481717 * rh * rh + 0.00122874 * T * T * rh + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
      if (rh < 13 && T >= 80 && T <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
      if (rh > 85 && T >= 80 && T <= 87) hi += ((rh - 85) / 10) * ((87 - T) / 5);
    }
    return (hi - 32) * 5 / 9;
  }
  class Feelslike extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.t = +data.temp; this.rh = +data.humidity; this.R = (data.readings || []).map((r, i) => Object.assign({ id: 'r' + i }, r));
      el.innerHTML = '<div class="dh-bar"><label class="dh-range"><span data-l="t"></span><input type="range" min="20" max="46" step="0.5" data-t aria-label="Temperature in °C"></label><label class="dh-range"><span data-l="h"></span><input type="range" min="10" max="100" step="1" data-h aria-label="Humidity in %"></label></div>' + (this.R.length ? '<div class="dh-bar dh-chips" role="group" aria-label="Readings">' + this.R.map(r => '<button type="button" class="dh-btn" data-r="' + esc(r.id) + '" aria-pressed="false">' + esc(r.label) + '</button>').join('') + '</div>' : '') + '<svg role="img"></svg><div class="dh-legend"></div><p class="dh-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dh-legend'); this.$note = el.querySelector('.dh-note'); this.$t = el.querySelector('[data-t]'); this.$h = el.querySelector('[data-h]');
      this.$t.value = this.t; this.$h.value = this.rh;
      el.addEventListener('input', e => { if (e.target === this.$t) this.t = +this.$t.value; else if (e.target === this.$h) this.rh = +this.$h.value; else return; this._chg(); });
      el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; const r = this.R.find(x => x.id === b.dataset.r); this.t = +r.temp; this.rh = +r.humidity; this.$t.value = this.t; this.$h.value = this.rh; this._chg(); });
      this.render();
    }
    _chg() { this.render(); const f = heatIndex(this.t, this.rh); this._emit('change', { temp: this.t, humidity: this.rh, feels: Math.round(f), level: heatLevel(f)[1] }); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, t0 = 26, t1 = 44, h0 = 40, h1 = 100, pl = 38, pr = 8, top = 8, bot = 30, H = narrow ? 260 : 300;
      const cw = (W - pl - pr) / (t1 - t0 + 1), ch = (H - top - bot) / ((h1 - h0) / 5 + 1);
      const x = t => pl + (t - t0) * cw, y = h => top + (h1 - h) / 5 * ch;
      let s = '';
      for (let t = t0; t <= t1; t++) for (let h = h0; h <= h1; h += 5) { const f = heatIndex(t, h), lv = heatLevel(f); s += '<rect x="' + f1(x(t)) + '" y="' + f1(y(h)) + '" width="' + f1(cw - 1) + '" height="' + f1(ch - 1) + '" fill="' + lv[2] + '"><title>' + t + ' °C, ' + h + '%: feels like ' + (f > 60 ? 'over 60' : Math.round(f)) + ' °C</title></rect>'; if (!narrow && cw > 26 && ch > 14 && f <= 60) s += '<text x="' + f1(x(t) + cw / 2 - 0.5) + '" y="' + f1(y(h) + ch / 2 + 3.5) + '" font-size="9.5" text-anchor="middle" fill="' + inkOn(lv[2]) + '" opacity=".75" pointer-events="none">' + Math.round(f) + '</text>'; }
      for (let t = t0; t <= t1; t += narrow ? 3 : 2) s += '<text x="' + f1(x(t) + cw / 2) + '" y="' + (H - bot + 14) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + t + '°</text>';
      s += '<text x="' + f1((W + pl) / 2) + '" y="' + (H - 3) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">Temperature (°C)</text>';
      for (let h = h0; h <= h1; h += narrow ? 20 : 10) s += '<text x="' + (pl - 5) + '" y="' + f1(y(h) + ch / 2 + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + h + '%</text>';
      const mx = clamp(x(this.t) + cw / 2, pl + 4, W - pr - 4), my = clamp(y(Math.round(this.rh / 5) * 5) + ch / 2 - (this.rh - Math.round(this.rh / 5) * 5) / 5 * ch, top + 4, H - bot - 4);
      s += '<circle cx="' + f1(mx) + '" cy="' + f1(my) + '" r="9" fill="none" stroke="' + T.fg + '" stroke-width="3"/><circle cx="' + f1(mx) + '" cy="' + f1(my) + '" r="9" fill="none" stroke="' + T.surface + '" stroke-width="1.2"/>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'How hot it feels for temperatures from ' + t0 + ' to ' + t1 + ' °C and humidity from ' + h0 + ' to ' + h1 + '%, coloured by risk. The ring marks the chosen reading.');
      this.$svg.innerHTML = s;
      this.el.querySelector('[data-l="t"]').textContent = 'Temperature: ' + this.t + ' °C'; this.el.querySelector('[data-l="h"]').textContent = 'Humidity: ' + this.rh + '%';
      this.el.querySelectorAll('[data-r]').forEach(b => { const r = this.R.find(z => z.id === b.dataset.r); b.setAttribute('aria-pressed', String(+r.temp === this.t && +r.humidity === this.rh)); });
      this.$leg.innerHTML = HEAT.map(b => '<span><i style="background:' + b[2] + '"></i>' + b[1] + (b[0] > 0 ? ' from ' + b[0] + ' °C' : '') + '</span>').join('');
      const f = heatIndex(this.t, this.rh), lv = heatLevel(f), out = this.t < t0 || this.t > t1 || this.rh < h0;
      this.$note.innerHTML = '<b>' + this.t + ' °C at ' + this.rh + '% humidity feels like ' + Math.round(f) + ' °C</b>: ' + lv[1].toLowerCase() + '. ' + lv[3] + (lv[0] >= 33 ? ' Rest in the shade, drink water often and check on older people and babies.' : '') + (out ? ' (The grid shows ' + t0 + '–' + t1 + ' °C and ' + h0 + '–' + h1 + '%; the ring is at its edge.)' : '');
    }
  }

  /* ======================================================================================
   * Forecastrow: the next few days in rows
   * data = { place?, unit?:'°C', days:[{date:'YYYY-MM-DD', hi, lo, rain (chance %), mm?, wind?, sky:'sun'|'part'|'cloud'|'rain'|'storm'}] }
   * events: day {date, hi, lo, rain}
   * ====================================================================================== */
  const SKY = { sun: 'sunny', part: 'sun and cloud', cloud: 'cloudy', rain: 'showers', storm: 'thunderstorms' };
  function skyIcon(k, T) {
    const sun = (cx, cy, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#f2b51c"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => '<line x1="' + f1(cx + Math.cos(a * RAD) * (r + 2.5)) + '" y1="' + f1(cy + Math.sin(a * RAD) * (r + 2.5)) + '" x2="' + f1(cx + Math.cos(a * RAD) * (r + 5)) + '" y2="' + f1(cy + Math.sin(a * RAD) * (r + 5)) + '" stroke="#f2b51c" stroke-width="2" stroke-linecap="round"/>').join('');
    const cloud = (dx, dy, c) => '<path d="M' + (7 + dx) + ',' + (22 + dy) + 'h15a5,5 0 0 0 0-10a7,7 0 0 0-13-2a5,5 0 0 0-2,12z" fill="' + c + '"/>';
    const grey = '#9aaaba', dark = '#6f7f90';
    const body = { sun: sun(15, 15, 6), part: sun(11, 11, 5) + cloud(2, 3, grey), cloud: cloud(0, 0, grey), rain: cloud(0, -3, dark) + [10, 15, 20].map(x => '<line x1="' + x + '" y1="23" x2="' + (x - 2) + '" y2="28" stroke="#2f7fd1" stroke-width="2" stroke-linecap="round"/>').join(''), storm: cloud(0, -3, '#56636f') + '<path d="M16,19l-4,6h4l-2,5l6-7h-4l2-4z" fill="#f2b51c"/>' }[k] || cloud(0, 0, grey);
    return '<svg viewBox="0 0 30 30" aria-hidden="true">' + body + '</svg>';
  }
  const TEMPC = ['#2f7fd1', '#3fae9b', '#e8c31a', '#f18b00', '#d9452b'];
  class Forecastrow extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.U = data.unit || '°C'; this.D = data.days.map((d, i) => Object.assign({ i, ms: pt(d.date) }, d)); this.sel = null;
      el.innerHTML = '<div class="dh-fc" role="group"></div><p class="dh-note" aria-live="polite"></p>';
      this.$fc = el.querySelector('.dh-fc'); this.$note = el.querySelector('.dh-note');
      this.$fc.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const i = +b.dataset.k; this.sel = this.sel === i ? null : i; this.render(); if (this.sel != null) { const d = this.D[i]; this._emit('day', { date: d.date, hi: d.hi, lo: d.lo, rain: d.rain }); } });
      this.render();
    }
    _line(d) { return dayL(d.ms) + ': ' + (SKY[d.sky] || d.sky || '') + ', ' + d.lo + '–' + d.hi + ' ' + this.U + ', ' + d.rain + '% chance of rain' + (d.mm != null && d.rain >= 20 ? ' (about ' + d.mm + ' mm)' : '') + (d.wind != null ? ', wind ' + d.wind + ' km/h' : '') + '.'; }
    render() {
      const T = themeOf(this.el), W = this.el.clientWidth || 640, wide = W >= 560, lo = Math.min(...this.D.map(d => +d.lo)), hi = Math.max(...this.D.map(d => +d.hi)), span = Math.max(1, hi - lo), ct = v => mix(TEMPC, (v - 18) / 16);
      this.$fc.classList.toggle('wide', wide);
      this.$fc.setAttribute('aria-label', 'Forecast' + (this.data.place ? ' for ' + this.data.place : ''));
      this._keep(this.$fc, this.D.map(d => {
        const a = (d.lo - lo) / span * 100, b = (d.hi - lo) / span * 100;
        return '<button type="button" class="dh-day" data-k="' + d.i + '" aria-pressed="' + (this.sel === d.i) + '" aria-label="' + esc(this._line(d)) + '"><b>' + (wide ? dayL(d.ms) : DAYN[new Date(d.ms).getUTCDay()]) + '</b>' + skyIcon(d.sky, T) + '<span class="dh-rain">' + d.rain + '%' + (wide && d.mm != null && d.rain >= 20 ? ' · ' + d.mm + ' mm' : '') + '<s><i style="width:' + clamp(d.rain, 0, 100) + '%"></i></s></span><span class="dh-lo">' + d.lo + '°</span><span class="dh-rng"><i style="left:' + f1(a) + '%;width:' + f1(Math.max(3, b - a)) + '%;background:linear-gradient(90deg,' + ct(d.lo) + ',' + ct(d.hi) + ')"></i></span><span class="dh-hi">' + d.hi + '°</span>' + (wide ? '<span class="dh-wind">' + (d.wind != null ? 'Wind ' + d.wind + ' km/h' : '') + '</span>' : '') + '</button>';
      }).join(''));
      if (this.sel != null) { this.$note.innerHTML = '<b>' + esc(this._line(this.D[this.sel])) + '</b>'; return; }
      const warm = this.D.reduce((a, d) => d.hi > a.hi ? d : a), wet = this.D.reduce((a, d) => d.rain > a.rain ? d : a), dry = this.D.reduce((a, d) => d.rain < a.rain ? d : a), name = d => DAYN[new Date(d.ms).getUTCDay()];
      this.$note.innerHTML = (this.data.place ? esc(this.data.place) + ', next ' + this.D.length + ' days. ' : '') + 'Warmest: <b>' + name(warm) + '</b> (' + warm.hi + ' ' + esc(this.U) + '). Wettest: <b>' + name(wet) + '</b> (' + wet.rain + '% chance). Driest: <b>' + name(dry) + '</b> (' + dry.rain + '%). Tap a day for more.';
    }
  }

  return { Tidecurve, Warmstripes, Stormtrack, Uvday, Feelslike, Forecastrow, heatIndex };
});
