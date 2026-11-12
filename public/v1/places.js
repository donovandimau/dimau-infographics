/*! Places 1.0 · Dimau Infographics
 *  Six formats for places, the sky and getting around:
 *    Daylight     sunrise and sunset for every day of a year at one place, worked out from the sun's position.
 *    Moonmonth    a month calendar of moon phases, worked out from where the sun and moon are; tap a day for how full it is.
 *    Windrose     which way the wind blows and how strongly: one petal per direction, split by speed.
 *    Reachrings   places by distance and direction from a centre, with rings; slide to see what is within reach.
 *    Profileline  the ups and downs along a walk or road; drag along it for height, climb so far and distance.
 *    Floorplan    a plan of rooms: search or tap to find a room, coloured by what it is for, with "you are here".
 *
 *  new Daylight(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Daylight', 'Moonmonth', 'Windrose', 'Reachrings', 'Profileline', 'Floorplan'].forEach(function (k) { root[k] = m[k]; }); root.DimauPlaces = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const TAU = Math.PI * 2, RAD = Math.PI / 180, DAY = 86400000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 1 }) + (o.suffix || '') : '–'; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hm = h => { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const dur = h => Math.floor(h) + ' h ' + String(Math.round((h % 1) * 60)).padStart(2, '0') + ' min';
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };

  /** Sunrise and sunset (local hours) for a UTC date at lat/lon, NOAA solar equations (to a few minutes). */
  function sunTimes(dateUTC, lat, lon, tz) {
    const d = new Date(dateUTC), doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / DAY);
    const g = (TAU / 365) * (doy - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const cosH = (Math.cos(90.833 * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) / (Math.cos(lat * RAD) * Math.cos(decl));
    if (cosH > 1) return { polar: 'night' }; if (cosH < -1) return { polar: 'day' };
    const ha = Math.acos(cosH) / RAD, noon = 720 - 4 * lon - eq; // minutes UTC
    return { rise: (noon - 4 * ha) / 60 + tz, set: (noon + 4 * ha) / 60 + tz, noon: noon / 60 + tz, length: (8 * ha) / 60 };
  }
  /** Moon phase from the sun's and moon's positions (main terms of the lunar theory; event times good to about half an hour). */
  const SYN = 29.530588853;
  function elong(t) {
    const d = (t - Date.UTC(2000, 0, 1, 12)) / DAY, s = x => Math.sin(x * RAD);
    const g = 357.528 + 0.9856003 * d, sun = 280.46 + 0.9856474 * d + 1.915 * s(g) + 0.02 * s(2 * g);
    const Mm = 134.963 + 13.064993 * d, D = 297.85 + 12.190749 * d, F = 93.272 + 13.22935 * d;
    const moon = 218.316 + 13.176396 * d + 6.289 * s(Mm) + 1.274 * s(2 * D - Mm) + 0.658 * s(2 * D) + 0.214 * s(2 * Mm) - 0.186 * s(g) - 0.114 * s(2 * F)
      - 0.059 * s(2 * D - 2 * Mm) - 0.057 * s(2 * D - g - Mm) + 0.053 * s(2 * D + Mm) + 0.046 * s(2 * D - g) + 0.041 * s(Mm - g) - 0.035 * s(D) - 0.031 * s(g + Mm);
    return (((moon - sun) % 360) + 360) % 360;
  }
  function moonInfo(t) {
    const e = elong(t), lit = (1 - Math.cos(e * RAD)) / 2, k = e / 360, age = k * SYN;
    const name = k < 0.0339 || k > 0.9661 ? 'New moon' : k < 0.2161 ? 'Waxing crescent' : k < 0.2839 ? 'First quarter' : k < 0.4661 ? 'Waxing gibbous' : k < 0.5339 ? 'Full moon' : k < 0.7161 ? 'Waning gibbous' : k < 0.7839 ? 'Last quarter' : 'Waning crescent';
    return { age, lit, name, waxing: e < 180, e };
  }
  /** Find when the elongation reaches `target` degrees between t0 and t1 (it rises about 12 degrees a day). */
  function crossing(t0, t1, target) {
    const f = t => ((elong(t) - target + 540) % 360) - 180;
    if (!(f(t0) < 0 && f(t1) >= 0)) return null;
    for (let i = 0; i < 40; i++) { const m = (t0 + t1) / 2; if (f(m) < 0) t0 = m; else t1 = m; }
    return t1;
  }

  const STYLE = `
.dz{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dz) button{font:inherit;color:inherit}
.dz :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dz svg{display:block;width:100%}
.dz svg [data-k]{cursor:pointer}
.dz svg [data-k]:focus{outline:none}
.dz svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dz-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dz-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.dz-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dz-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dz-small{font-size:12.5px;color:var(--di-muted,#4f6578)}
.dz-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dz-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.dz-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700}
.dz-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.mm-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.mm-head h4{margin:0;font-size:18px}
.mm-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.mm-wd{font:700 11px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);text-align:center;padding:4px 0}
.mm-day{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:8px;padding:4px 2px 6px;display:grid;justify-items:center;gap:2px;cursor:pointer;min-height:58px}
.mm-day[aria-pressed="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.mm-day.today{border-color:var(--di-fg,#13263a)}
.mm-day svg{width:28px;height:28px}
.mm-n{font:700 11.5px/1 var(--di-mono,ui-monospace,monospace)}
.mm-day.key .mm-n{color:var(--di-accent,#0b6fa4)}
.fp-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.fp-tools input{flex:1;min-width:170px;height:38px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 12px;font:inherit;font-size:14px;color:inherit}
`;
  function injectStyle() {
    if (document.getElementById('dz-style')) return;
    const s = document.createElement('style'); s.id = 'dz-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dz');
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
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dz'); }
  }

  /* ======================================================================================
   * Daylight: sunrise and sunset through a year
   * data = { place, lat, lon, tz (hours from UTC), year }  options: { today?: 'YYYY-MM-DD' }
   * ====================================================================================== */
  class Daylight extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { today: null });
      this.year = +data.year || new Date().getUTCFullYear(); this.days = [];
      const n = (Date.UTC(this.year + 1, 0, 1) - Date.UTC(this.year, 0, 1)) / DAY;
      for (let i = 0; i < n; i++) { const t = Date.UTC(this.year, 0, 1 + i); this.days.push(Object.assign({ i, t }, sunTimes(t, +data.lat, +data.lon, +data.tz))); }
      const td = this.o.today || new Date().toISOString().slice(0, 10); const ti = Math.round((Date.parse(td + 'T00:00:00Z') - Date.UTC(this.year, 0, 1)) / DAY);
      this.sel = ti >= 0 && ti < n ? ti : null; this.today = this.sel;
      el.innerHTML = '<svg role="img"></svg><p class="dz-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dz-note');
      this.$svg.addEventListener('click', e => { const r = this.$svg.getBoundingClientRect(), x = (e.clientX - r.left) * (this._W / r.width); this.pick(Math.round(((x - this._pl) / (this._W - this._pl - 8)) * (this.days.length - 1))); });
      this.$svg.addEventListener('keydown', e => { const d = { ArrowLeft: -1, ArrowRight: 1, PageUp: -30, PageDown: 30, Home: -400, End: 400 }[e.key]; if (d == null) return; e.preventDefault(); this.pick((this.sel == null ? 0 : this.sel) + d); });
      this.render();
    }
    pick(i) { this.sel = clamp(i, 0, this.days.length - 1); this.render(); const d = this.days[this.sel]; this._emit('select', { date: new Date(d.t).toISOString().slice(0, 10), sunrise: hm(d.rise), sunset: hm(d.set) }); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 240 : 300, pl = narrow ? 34 : 44, pt = 10, pb = 26;
      this._W = W; this._pl = pl; const n = this.days.length, sx = i => pl + (i / (n - 1)) * (W - pl - 8), sy = h => pt + (h / 24) * (H - pt - pb);
      let s = '<rect x="' + pl + '" y="' + pt + '" width="' + (W - pl - 8) + '" height="' + (H - pt - pb) + '" fill="#13263a" opacity=".85" rx="6"/>';
      const top = this.days.map(x => f1(sx(x.i)) + ' ' + f1(sy(x.rise))).join(' L'), bot = this.days.slice().reverse().map(x => f1(sx(x.i)) + ' ' + f1(sy(x.set))).join(' L');
      s += '<path d="M' + top + ' L' + bot + 'Z" fill="#f2c94c" opacity=".9"/><path d="M' + this.days.map(x => f1(sx(x.i)) + ' ' + f1(sy(x.noon))).join(' L') + '" fill="none" stroke="#b5531f" stroke-width="1.5" stroke-dasharray="4 4"/>';
      for (let h = 0; h <= 24; h += 6) s += '<text x="' + (pl - 6) + '" y="' + f1(sy(h) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + String(h).padStart(2, '0') + ':00</text>';
      for (let m = 0; m < 12; m++) { const i = Math.round((Date.UTC(this.year, m, 15) - Date.UTC(this.year, 0, 1)) / DAY); if (!narrow || m % 2 === 0) s += '<text x="' + f1(sx(i)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + MON[m] + '</text>'; }
      if (this.today != null) s += '<line x1="' + f1(sx(this.today)) + '" y1="' + pt + '" x2="' + f1(sx(this.today)) + '" y2="' + (H - pb) + '" stroke="' + T.surface + '" stroke-width="1.5" stroke-dasharray="2 3"/>';
      if (this.sel != null) { const x = this.days[this.sel]; s += '<line x1="' + f1(sx(x.i)) + '" y1="' + pt + '" x2="' + f1(sx(x.i)) + '" y2="' + (H - pb) + '" stroke="' + T.accent + '" stroke-width="2.5"/><circle cx="' + f1(sx(x.i)) + '" cy="' + f1(sy(x.rise)) + '" r="5" fill="' + T.accent + '" stroke="#fff" stroke-width="2"/><circle cx="' + f1(sx(x.i)) + '" cy="' + f1(sy(x.set)) + '" r="5" fill="' + T.accent + '" stroke="#fff" stroke-width="2"/>'; }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('tabindex', '0'); this.$svg.setAttribute('aria-label', 'Daylight in ' + d.place + ' through ' + this.year + '. Use the arrow keys to move day by day.');
      this.$svg.innerHTML = s;
      const L = this.days.slice().sort((a, b) => b.length - a.length), long = L[0], short = L[L.length - 1], ds = t => { const x = new Date(t); return x.getUTCDate() + ' ' + MON[x.getUTCMonth()]; };
      if (this.sel != null) { const x = this.days[this.sel], prev = this.days[this.sel - 1]; this.$note.innerHTML = '<b>' + ds(x.t) + ' ' + this.year + '</b> in ' + esc(d.place) + ': sunrise <b>' + hm(x.rise) + '</b>, sunset <b>' + hm(x.set) + '</b>, ' + dur(x.length) + ' of daylight' + (prev ? ' (' + (x.length >= prev.length ? '+' : '−') + Math.round(Math.abs(x.length - prev.length) * 60 * 60) + ' seconds on the day before)' : '') + '. Longest day ' + ds(long.t) + ' (' + dur(long.length) + '), shortest ' + ds(short.t) + ' (' + dur(short.length) + ').'; }
      else this.$note.innerHTML = 'Longest day in ' + esc(d.place) + ': <b>' + ds(long.t) + '</b> (' + dur(long.length) + '). Shortest: <b>' + ds(short.t) + '</b> (' + dur(short.length) + '). Tap a day.';
    }
  }

  /* ======================================================================================
   * Moonmonth: a month calendar of moon phases
   * data = { month:'YYYY-MM', tz?, south? (true draws the moon as seen south of the equator) }  options: { today?: 'YYYY-MM-DD' }
   * ====================================================================================== */
  class Moonmonth extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { today: null });
      const m = data.month || new Date().toISOString().slice(0, 7); this.y = +m.slice(0, 4); this.m = +m.slice(5, 7) - 1; this.sel = null; this.tz = +(data.tz || 0);
      el.innerHTML = '<div class="mm-head"><button type="button" class="dz-btn" data-p aria-label="Previous month">←</button><h4 aria-live="polite"></h4><button type="button" class="dz-btn" data-n aria-label="Next month">→</button></div><div class="mm-grid"></div><p class="dz-note" aria-live="polite"></p>';
      this.$g = el.querySelector('.mm-grid'); this.$h = el.querySelector('h4'); this.$note = el.querySelector('.dz-note');
      el.querySelector('[data-p]').onclick = () => this.shift(-1); el.querySelector('[data-n]').onclick = () => this.shift(1);
      this._hot(this.$g, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', Object.assign({ date: k }, this._at(k))); });
      this.render();
    }
    shift(d) { this.m += d; if (this.m < 0) { this.m = 11; this.y--; } if (this.m > 11) { this.m = 0; this.y++; } this.sel = null; this.render(); this._emit('month', { month: this.y + '-' + String(this.m + 1).padStart(2, '0') }); }
    _at(ds) { const i = moonInfo(Date.parse(ds + 'T21:00:00Z') - this.tz * 3600000); return { phase: i.name, lit: Math.round(i.lit * 100), age: Math.round(i.age * 10) / 10 }; }
    _icon(lit, waxing, T) {
      // Lit side: right while waxing in the northern sky; the southern sky sees it mirrored.
      const r = 12, c = 14, right = this.data.south ? !waxing : waxing, rx = Math.abs(1 - 2 * lit) * r, crescent = lit < 0.5;
      const outer = right ? 1 : 0, inner = crescent ? (right ? 0 : 1) : (right ? 1 : 0);
      const shape = lit > 0.985 ? '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#f4e7b8"/>' : lit > 0.015 ? '<path d="M' + c + ' ' + (c - r) + ' A' + r + ' ' + r + ' 0 0 ' + outer + ' ' + c + ' ' + (c + r) + ' A' + f1(rx) + ' ' + r + ' 0 0 ' + inner + ' ' + c + ' ' + (c - r) + 'Z" fill="#f4e7b8"/>' : '';
      return '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#26384a"/>' + shape + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + T.line + '"/></svg>';
    }
    render() {
      const T = themeOf(this.el), first = Date.UTC(this.y, this.m, 1), lead = (new Date(first).getUTCDay() + 6) % 7, days = new Date(Date.UTC(this.y, this.m + 1, 0)).getUTCDate(), today = this.o.today || new Date().toISOString().slice(0, 10);
      this.$h.textContent = MONTHS[this.m] + ' ' + this.y;
      let h = WD.map(w => '<div class="mm-wd" aria-hidden="true">' + w + '</div>').join('') + '<div aria-hidden="true"></div>'.repeat(lead);
      const keys = [];
      for (let dn = 1; dn <= days; dn++) {
        const ds = this.y + '-' + String(this.m + 1).padStart(2, '0') + '-' + String(dn).padStart(2, '0'), t0 = Date.parse(ds + 'T00:00:00Z') - this.tz * 3600000, i = moonInfo(t0 + 21 * 3600000);
        const nw = crossing(t0, t0 + DAY, 0), fl = crossing(t0, t0 + DAY, 180), key = nw ? 'New moon' : fl ? 'Full moon' : null;
        if (key) keys.push({ ds, key, at: nw || fl });
        h += '<button type="button" class="mm-day' + (ds === today ? ' today' : '') + (key ? ' key' : '') + '" data-k="' + ds + '" aria-pressed="' + (this.sel === ds) + '" aria-label="' + esc(dn + ' ' + MONTHS[this.m] + ': ' + (key || i.name) + ', ' + Math.round(i.lit * 100) + '% lit') + '"><span class="mm-n">' + dn + '</span>' + this._icon(i.lit, i.waxing, T) + '</button>';
      }
      this._keep(this.$g, h);
      if (this.sel) { const a = this._at(this.sel), dt = new Date(this.sel + 'T00:00:00Z'); this.$note.innerHTML = '<b>' + dt.getUTCDate() + ' ' + MONTHS[dt.getUTCMonth()] + '</b>: ' + a.phase.toLowerCase() + ', <b>' + a.lit + '% lit</b>, ' + a.age + ' days since the new moon (at 9 pm).'; }
      else this.$note.innerHTML = keys.length ? keys.map(k => '<b>' + k.key + '</b> on ' + Number(k.ds.slice(8)) + ' ' + MONTHS[this.m] + ' at about ' + hm(new Date(k.at).getUTCHours() + new Date(k.at).getUTCMinutes() / 60 + this.tz)).join('; ') + '. Tap a day for how full the moon is.' : 'Tap a day for how full the moon is.';
    }
  }

  /* ======================================================================================
   * Windrose: one petal per direction, split by speed
   * data = { dirs:['N','NE',…], bands:[{id,label,color?}], values:[[per band] per direction], unit? }  (values as % of the time)
   * ====================================================================================== */
  const DIRNAME = { N: 'north', NNE: 'north-north-east', NE: 'north-east', ENE: 'east-north-east', E: 'east', ESE: 'east-south-east', SE: 'south-east', SSE: 'south-south-east', S: 'south', SSW: 'south-south-west', SW: 'south-west', WSW: 'west-south-west', W: 'west', WNW: 'west-north-west', NW: 'north-west', NNW: 'north-north-west' };
  class Windrose extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.bands = data.bands.map((b, i) => Object.assign({ i }, b)); this.sel = null;
      el.innerHTML = '<svg role="img"></svg><div class="dz-legend"></div><p class="dz-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dz-legend'); this.$note = el.querySelector('.dz-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { direction: this.data.dirs[this.sel] }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, n = d.dirs.length, W = Math.max(280, this.$svg.clientWidth || 600), S = Math.min(W, 500), cx = W / 2, cy = S / 2, R = S * 0.38;
      const tot = d.values.map(v => v.reduce((a, b) => a + +b, 0)), max = Math.max(...tot) || 1, step = TAU / n, wdt = step * 0.42;
      const P = (a, r) => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
      let s = '';
      [0.25, 0.5, 0.75, 1].forEach(k => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(R * k) + '" fill="none" stroke="' + T.line + '"/><text x="' + f1(cx + 3) + '" y="' + f1(cy - R * k - 3) + '" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + fmtNum(max * k, { decimals: 0 }) + '%</text>'; });
      d.dirs.forEach((dir, i) => {
        const a = i * step, on = this.sel === i, dim = this.sel != null && !on; let r0 = 0, petals = '';
        d.values[i].forEach((v, b) => { const r1 = r0 + (R * +v) / max; if (r1 > r0) { const [x0, y0] = P(a - wdt, r0), [x1, y1] = P(a + wdt, r0), [x2, y2] = P(a + wdt, r1), [x3, y3] = P(a - wdt, r1); petals += '<path d="M' + f1(x0) + ' ' + f1(y0) + ' L' + f1(x3) + ' ' + f1(y3) + ' A' + f1(r1) + ' ' + f1(r1) + ' 0 0 1 ' + f1(x2) + ' ' + f1(y2) + ' L' + f1(x1) + ' ' + f1(y1) + (r0 > 0 ? ' A' + f1(r0) + ' ' + f1(r0) + ' 0 0 0 ' + f1(x0) + ' ' + f1(y0) : '') + 'Z" fill="' + colorFor(this.el, this.bands[b], b) + '" stroke="' + T.surface + '" stroke-width="1"/>'; } r0 = r1; });
        const [lx, ly] = P(a, R + 16);
        s += '<g data-k="' + i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc('From the ' + (DIRNAME[dir] || dir) + ': ' + fmtNum(tot[i]) + '% of the time') + '" opacity="' + (dim ? 0.3 : 1) + '">' + (petals || '<circle cx="' + cx + '" cy="' + cy + '" r="0"/>') + '<path d="M' + cx + ' ' + cy + ' L' + P(a - wdt, R).map(f1).join(' ') + ' L' + P(a + wdt, R).map(f1).join(' ') + 'Z" fill="transparent"/></g>' +
          '<text x="' + f1(lx) + '" y="' + f1(ly + 4) + '" text-anchor="middle" font-size="11.5" font-weight="' + (dir.length === 1 ? 800 : 600) + '" fill="' + T.fg + '" pointer-events="none">' + esc(dir) + '</text>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + S); this.$svg.style.height = S + 'px';
      this.$svg.setAttribute('aria-label', 'Wind directions: ' + d.dirs.map((x, i) => x + ' ' + fmtNum(tot[i]) + '%').join(', '));
      this._keep(this.$svg, s);
      this.$leg.innerHTML = this.bands.map(b => '<span><i style="background:' + esc(colorFor(this.el, b, b.i)) + '"></i>' + esc(b.label) + '</span>').join('');
      const top = tot.indexOf(Math.max(...tot)), calm = d.calm != null ? +d.calm : null;
      if (this.sel != null) { const i = this.sel; this.$note.innerHTML = 'From the <b>' + esc(DIRNAME[d.dirs[i]] || d.dirs[i]) + '</b>: ' + fmtNum(tot[i]) + '% of the time (' + this.bands.map((b, k) => esc(b.label) + ' ' + fmtNum(+d.values[i][k]) + '%').join(', ') + ').'; }
      else this.$note.innerHTML = 'Most often from the <b>' + esc(DIRNAME[d.dirs[top]] || d.dirs[top]) + '</b> (' + fmtNum(tot[top]) + '% of the time).' + (calm != null ? ' Calm ' + fmtNum(calm) + '% of the time.' : '') + ' Each petal points where the wind comes from. Tap one.';
    }
  }

  /* ======================================================================================
   * Reachrings: places by distance and direction from a centre
   * data = { centre:{label}, unit?, rings:[numbers], groups:[{id,label,color?}], places:[{id,label,dist,bearing,group}] }
   * ====================================================================================== */
  class Reachrings extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.groups = data.groups.map((g, i) => Object.assign({ i }, g)); this.places = data.places.map((p, i) => Object.assign({ i }, p, { dist: +p.dist }));
      this.max = Math.max(...data.rings); this.within = this.max; this.sel = null;
      const u = data.unit || 'km';
      el.innerHTML = '<label class="dz-range"><span>Within <output></output> ' + esc(u) + '</span><input type="range" min="0" max="' + this.max + '" step="' + (this.max > 20 ? 1 : 0.5) + '" value="' + this.max + '"></label><svg role="img"></svg><div class="dz-legend"></div><p class="dz-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dz-legend'); this.$note = el.querySelector('.dz-note');
      this.$in.addEventListener('input', () => { this.within = +this.$in.value; this.render(); this._emit('within', { distance: this.within }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.places[this.sel].id }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), d = this.data, u = d.unit || 'km', W = Math.max(280, this.$svg.clientWidth || 600), S = Math.min(W, 520), cx = W / 2, cy = S / 2, R = S * 0.44, sr = v => (v / this.max) * R;
      let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(sr(this.within)) + '" fill="' + T.accent + '" opacity=".08"/>';
      d.rings.forEach(r => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(sr(r)) + '" fill="none" stroke="' + T.line + '" stroke-dasharray="3 4"/><text x="' + f1(cx + 4) + '" y="' + f1(cy - sr(r) + 12) + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(r) + ' ' + u) + '</text>'; });
      s += '<text x="' + cx + '" y="14" text-anchor="middle" font-size="11" font-weight="800" fill="' + T.muted + '">N</text><circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + T.fg + '"/>';
      // Labels: the chosen place first, then nearest first; a label that would overlap one already placed is left off (tap shows it).
      const boxes = [[cx - 30, cy + 10, cx + 30, cy + 26]], hit = b => boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
      const order = this.places.slice().sort((a, b) => (b.i === this.sel) - (a.i === this.sel) || a.dist - b.dist), lab = {};
      const at = p => { const a = (+p.bearing) * RAD; return [cx + Math.sin(a) * sr(p.dist), cy - Math.cos(a) * sr(p.dist), a]; };
      this.places.forEach(p => { const [x, y] = at(p); boxes.push([x - 7, y - 7, x + 7, y + 7]); });
      order.forEach(p => {
        const [x, y, a] = at(p), t = fitText(p.label, W < 520 ? 96 : 150, 11.5), tw = t.length * 11.5 * 0.56;
        for (const right of Math.sin(a) >= 0 ? [true, false] : [false, true]) {
          const b = right ? [x + 9, y - 8, x + 11 + tw, y + 6] : [x - 11 - tw, y - 8, x - 9, y + 6];
          if (b[0] < 2 || b[2] > W - 2) continue;
          if (p.i === this.sel || !hit(b)) { boxes.push(b); lab[p.i] = { t, right }; break; }
        }
      });
      this.places.forEach(p => {
        const a = (+p.bearing) * RAD, x = cx + Math.sin(a) * sr(p.dist), y = cy - Math.cos(a) * sr(p.dist), g = this.groups.find(z => z.id === p.group), c = g ? colorFor(this.el, g, g.i) : T.accent, inR = p.dist <= this.within, on = this.sel === p.i, L = lab[p.i];
        s += '<g data-k="' + p.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(p.label + ': ' + fmtNum(p.dist) + ' ' + u + (inR ? '' : ', outside the range')) + '" opacity="' + (inR ? 1 : 0.25) + '"><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (on ? 9 : 6.5) + '" fill="' + c + '" stroke="' + T.surface + '" stroke-width="2"/><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="14" fill="transparent"/>' +
          (L ? '<text x="' + f1(L.right ? x + 10 : x - 10) + '" y="' + f1(y + 4) + '" text-anchor="' + (L.right ? 'start' : 'end') + '" font-size="11.5" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3" stroke-linejoin="round">' + esc(L.t) + '</text>' : '') + '</g>';
      });
      s += '<text x="' + cx + '" y="' + f1(cy + 22) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3">' + esc(d.centre.label) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + S); this.$svg.style.height = S + 'px';
      this.$svg.setAttribute('aria-label', 'Places around ' + d.centre.label + ' by distance and direction');
      this._keep(this.$svg, s);
      this.$out.textContent = fmtNum(this.within);
      const inside = this.places.filter(p => p.dist <= this.within);
      this.$leg.innerHTML = this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + ': ' + inside.filter(p => p.group === g.id).length + '</span>').join('');
      if (this.sel != null) { const p = this.places[this.sel], g = this.groups.find(z => z.id === p.group), dirs = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']; this.$note.innerHTML = '<b>' + esc(p.label) + '</b>' + (g ? ' (' + esc(g.label.toLowerCase()) + ')' : '') + ': ' + esc(fmtNum(p.dist) + ' ' + u) + ' to the ' + dirs[Math.round(((+p.bearing % 360) + 360) % 360 / 45) % 8] + ' of ' + esc(d.centre.label) + '.'; }
      else { const near = inside.slice().sort((a, b) => a.dist - b.dist)[0]; this.$note.innerHTML = '<b>' + inside.length + ' of ' + this.places.length + '</b> places within ' + esc(fmtNum(this.within) + ' ' + u) + ' of ' + esc(d.centre.label) + '.' + (near ? ' Nearest: <b>' + esc(near.label) + '</b> (' + esc(fmtNum(near.dist) + ' ' + u) + ').' : '') + ' Slide to change the distance; tap a place.'; }
    }
  }

  /* ======================================================================================
   * Profileline: height along a route; drag along it
   * data = { points:[{d,h}], marks?:[{d,label}], unit?:'km', hunit?:'m', label? }
   * ====================================================================================== */
  class Profileline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.pts = data.points.map(p => ({ d: +p.d, h: +p.h })); this.at = null;
      let up = 0, down = 0; this.climb = [0]; for (let i = 1; i < this.pts.length; i++) { const dh = this.pts[i].h - this.pts[i - 1].h; if (dh > 0) up += dh; else down -= dh; this.climb.push(up); } this.up = up; this.down = down;
      el.innerHTML = '<svg role="slider" tabindex="0" aria-valuemin="0"></svg><p class="dz-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dz-note');
      const at = e => { const r = this.$svg.getBoundingClientRect(), x = (e.clientX - r.left) * (this._W / r.width); this.set(this._ix(x)); };
      let drag = false; this.$svg.addEventListener('pointerdown', e => { drag = true; this.$svg.setPointerCapture(e.pointerId); at(e); }); this.$svg.addEventListener('pointermove', e => { if (drag) at(e); }); this.$svg.addEventListener('pointerup', () => { drag = false; });
      this.$svg.addEventListener('keydown', e => { const dd = { ArrowLeft: -1, ArrowRight: 1, Home: -1e9, End: 1e9 }[e.key]; if (dd == null) return; e.preventDefault(); const total = this.pts[this.pts.length - 1].d; this.set(clamp((this.at == null ? 0 : this.at) + dd * total / 50, 0, total)); });
      this.render();
    }
    _ix(x) { const total = this.pts[this.pts.length - 1].d; return clamp(((x - this._pl) / (this._W - this._pl - 10)) * total, 0, total); }
    hAt(d) { const p = this.pts; for (let i = 1; i < p.length; i++) if (d <= p[i].d) { const f = (d - p[i - 1].d) / ((p[i].d - p[i - 1].d) || 1); return { h: p[i - 1].h + f * (p[i].h - p[i - 1].h), climb: this.climb[i - 1] + Math.max(0, f * (p[i].h - p[i - 1].h)) }; } return { h: p[p.length - 1].h, climb: this.up }; }
    set(d) { this.at = d; this.render(); const v = this.hAt(d); this._emit('move', { distance: Math.round(d * 100) / 100, height: Math.round(v.h) }); }
    render() {
      const T = themeOf(this.el), d = this.data, u = d.unit || 'km', hu = d.hunit || 'm', W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 200 : 240, pl = narrow ? 40 : 50, pt = 26, pb = 24;
      this._W = W; this._pl = pl; const total = this.pts[this.pts.length - 1].d, hs = this.pts.map(p => p.h), lo = Math.min(0, Math.min(...hs)), hi = Math.max(...hs) * 1.1 || 1;
      const sx = v => pl + (v / total) * (W - pl - 10), sy = h => pt + (1 - (h - lo) / (hi - lo)) * (H - pt - pb);
      const line = this.pts.map((p, i) => (i ? 'L' : 'M') + f1(sx(p.d)) + ' ' + f1(sy(p.h))).join(' ');
      let s = '<path d="' + line + ' L' + f1(sx(total)) + ' ' + f1(sy(lo)) + ' L' + f1(sx(0)) + ' ' + f1(sy(lo)) + 'Z" fill="' + T.accent + '" opacity=".18"/><path d="' + line + '" fill="none" stroke="' + T.accent + '" stroke-width="2.5" stroke-linejoin="round"/>';
      [lo, (lo + hi / 1.1) / 2, hi / 1.1].forEach(h => { s += '<text x="' + (pl - 6) + '" y="' + f1(sy(h) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + Math.round(h) + ' ' + esc(hu) + '</text>'; });
      for (let k = 0; k <= 4; k++) { const v = (total * k) / 4; s += '<text x="' + f1(clamp(sx(v), pl + 8, W - 22)) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + fmtNum(v) + ' ' + esc(u) + '</text>'; }
      (d.marks || []).forEach((m, k) => { const x = sx(+m.d), y = sy(this.hAt(+m.d).h); s += '<line x1="' + f1(x) + '" y1="' + f1(y) + '" x2="' + f1(x) + '" y2="' + (k % 2 ? 20 : 12) + '" stroke="' + T.muted + '" stroke-dasharray="2 3"/><text x="' + f1(clamp(x, pl + 30, W - 40)) + '" y="' + (k % 2 ? 18 : 10) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + T.fg + '">' + esc(fitText(m.label, narrow ? 80 : 130, 11)) + '</text>'; });
      if (this.at != null) { const v = this.hAt(this.at), x = sx(this.at); s += '<line x1="' + f1(x) + '" y1="' + pt + '" x2="' + f1(x) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '" stroke-width="1.5"/><circle cx="' + f1(x) + '" cy="' + f1(sy(v.h)) + '" r="6" fill="' + T.fg + '" stroke="' + T.surface + '" stroke-width="2"/>'; }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (d.label || 'Route') + ': ' + fmtNum(total) + ' ' + u + ', climbing ' + Math.round(this.up) + ' ' + hu + '. Drag or use the arrow keys to move along it.');
      this.$svg.setAttribute('aria-valuemax', String(total)); if (this.at != null) { this.$svg.setAttribute('aria-valuenow', String(Math.round(this.at * 10) / 10)); this.$svg.setAttribute('aria-valuetext', fmtNum(this.at) + ' ' + u + ', ' + Math.round(this.hAt(this.at).h) + ' ' + hu); }
      this.$svg.innerHTML = s;
      const top = this.pts.reduce((a, b) => (b.h > a.h ? b : a));
      if (this.at != null) { const v = this.hAt(this.at); this.$note.innerHTML = 'At <b>' + fmtNum(this.at) + ' ' + esc(u) + '</b>: ' + Math.round(v.h) + ' ' + esc(hu) + ' up, ' + Math.round(v.climb) + ' ' + esc(hu) + ' climbed so far, ' + fmtNum(total - this.at) + ' ' + esc(u) + ' to go.'; }
      else this.$note.innerHTML = '<b>' + fmtNum(total) + ' ' + esc(u) + '</b> with <b>' + Math.round(this.up) + ' ' + esc(hu) + '</b> of climbing and ' + Math.round(this.down) + ' ' + esc(hu) + ' of descent. Highest point ' + Math.round(top.h) + ' ' + esc(hu) + ' at ' + fmtNum(top.d) + ' ' + esc(u) + '. Drag along the line.';
    }
  }

  /* ======================================================================================
   * Floorplan: rooms on a grid; search or tap; you are here
   * data = { cols, rows, groups:[{id,label,color?}], rooms:[{id,label,x,y,w,h,group,note?}], you?:{x,y,label}, label? }
   * ====================================================================================== */
  class Floorplan extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.groups = data.groups.map((g, i) => Object.assign({ i }, g)); this.rooms = data.rooms.map((r, i) => Object.assign({ i }, r)); this.sel = null; this.q = '';
      el.innerHTML = '<div class="fp-tools"><input type="search" placeholder="Find a room" aria-label="Find a room"></div><svg role="group"></svg><div class="dz-legend"></div><p class="dz-note" aria-live="polite"></p>';
      this.$q = el.querySelector('input'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dz-legend'); this.$note = el.querySelector('.dz-note');
      this.$q.addEventListener('input', () => { this.q = this.$q.value.trim().toLowerCase(); const hits = this._hits(); this.sel = hits.length === 1 ? hits[0].i : null; this.render(); this._emit('search', { query: this.q, matches: hits.map(r => r.id) }); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.rooms[this.sel].id }); });
      this.render();
    }
    _hits() { return this.q ? this.rooms.filter(r => (r.label + ' ' + (r.note || '')).toLowerCase().includes(this.q)) : []; }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), c = W / d.cols, H = c * d.rows, hits = this._hits(), you = d.you;
      let s = '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + f1(H - 1) + '" rx="6" fill="' + T.bg + '" stroke="' + T.fg + '" stroke-width="2"/>';
      this.rooms.forEach(r => {
        const g = this.groups.find(z => z.id === r.group), col = g ? colorFor(this.el, g, g.i) : T.accent, on = this.sel === r.i, hit = hits.includes(r), dim = (this.q && !hit) || (this.sel != null && !on && !this.q);
        const x = r.x * c + 2, y = r.y * c + 2, w = r.w * c - 4, h = r.h * c - 4, fs = Math.min(13, Math.max(9.5, w / 9));
        s += '<g data-k="' + r.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(r.label + (g ? ', ' + g.label : '')) + '" opacity="' + (dim ? 0.35 : 1) + '"><rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="4" fill="' + col + '" fill-opacity="' + (on || hit ? 0.9 : 0.28) + '" stroke="' + (on ? T.fg : col) + '" stroke-width="' + (on ? 3 : 1.5) + '"/>' +
          '<text x="' + f1(x + w / 2) + '" y="' + f1(y + h / 2 + 4) + '" text-anchor="middle" font-size="' + f1(fs) + '" font-weight="700" fill="' + (on || hit ? '#ffffff' : T.fg) + '" pointer-events="none">' + esc(fitText(r.label, w - 6, fs)) + '</text></g>';
      });
      if (you) { const x = (you.x + 0.5) * c, y = (you.y + 0.5) * c, lr = x < W / 2; s += '<g pointer-events="none"><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="9" fill="#c2563a" stroke="#fff" stroke-width="3"/><text x="' + f1(lr ? x + 14 : x - 14) + '" y="' + f1(y + 4) + '" text-anchor="' + (lr ? 'start' : 'end') + '" font-size="11.5" font-weight="800" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3">' + esc(you.label || 'You are here') + '</text></g>'; }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + f1(H)); this.$svg.style.height = f1(H) + 'px';
      this.$svg.setAttribute('aria-label', (d.label || 'Floor plan') + ' with ' + this.rooms.length + ' rooms');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = this.groups.map(g => '<span><i style="background:' + esc(colorFor(this.el, g, g.i)) + '"></i>' + esc(g.label) + '</span>').join('') + (you ? '<span><i style="background:#c2563a;border-radius:50%"></i>' + esc(you.label || 'You are here') + '</span>' : '');
      const r = this.sel != null ? this.rooms[this.sel] : null;
      if (r) { const g = this.groups.find(z => z.id === r.group); let where = ''; if (you) { const dx = (r.x + r.w / 2) - (you.x + 0.5), dy = (r.y + r.h / 2) - (you.y + 0.5); where = ' From where you are, it is ' + (Math.abs(dy) > 0.6 ? (dy < 0 ? 'ahead' : 'behind you') : '') + (Math.abs(dy) > 0.6 && Math.abs(dx) > 0.6 ? ' and ' : '') + (Math.abs(dx) > 0.6 ? 'to the ' + (dx < 0 ? 'left' : 'right') : '') + (Math.abs(dx) <= 0.6 && Math.abs(dy) <= 0.6 ? 'right here' : '') + '.'; } this.$note.innerHTML = '<b>' + esc(r.label) + '</b>' + (g ? ' (' + esc(g.label.toLowerCase()) + ')' : '') + '.' + (r.note ? ' ' + esc(r.note) : '') + where; }
      else if (this.q) this.$note.innerHTML = hits.length ? '<b>' + hits.length + '</b> room' + (hits.length === 1 ? '' : 's') + ' match “' + esc(this.q) + '”: ' + hits.map(h => esc(h.label)).join(', ') + '.' : 'No room matches “' + esc(this.q) + '”.';
      else this.$note.innerHTML = '<b>' + this.rooms.length + ' rooms</b>. Search for one, or tap a room.';
    }
  }

  return { Daylight, Moonmonth, Windrose, Reachrings, Profileline, Floorplan, sunTimes, moonInfo, crossing };
});
