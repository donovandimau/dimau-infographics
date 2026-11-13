/*! Energy 1.0 · Dimau Infographics
 *  Six household and community energy templates. They work things out from the figures given; they are not quotes or engineering advice.
 *    Appliancecost  what each appliance costs to run a day and a month; switch them on and off, change the hours.
 *    Solarday       solar panel output through a clear day (worked out from the sun's height) against a home's use hour by hour.
 *    Backuptime     how long a battery lasts with the chosen things switched on.
 *    Tariffsteps    a stepped (block) electricity price: what a month's use costs, block by block.
 *    Meterreading   meter readings turned into use per day between readings, with a month at the recent rate.
 *    Payback        when an up-front cost is paid back by monthly savings, with prices that may rise.
 *
 *  new Appliancecost(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Appliancecost', 'Solarday', 'Backuptime', 'Tariffsteps', 'Meterreading', 'Payback'].forEach(function (k) { root[k] = m[k]; }); root.DimauEnergy = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const DAY = 86400000, RAD = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pt = s => { const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3]) : NaN; };
  const dateL = ms => { const d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
  const money = (n, p, dec) => (n < 0 ? '−' : '') + (p == null ? '$' : p) + Math.abs(n).toLocaleString('en', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
  const kwh = n => (n >= 100 ? Math.round(n) : f1(n)) + ' kWh';
  const hrs = h => { if (!isFinite(h)) return 'as long as the battery holds its charge'; const m = Math.round(h * 60), H = Math.floor(m / 60), M = m % 60; return H ? H + ' h' + (M ? ' ' + M + ' min' : '') : M + ' min'; };
  const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }

  const STYLE = `
.ek{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.ek) button{font:inherit;color:inherit}
.ek :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.ek svg{display:block;width:100%}
.ek svg [data-k]{cursor:pointer}
.ek svg [data-k]:focus{outline:none}
.ek svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.ek-bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:0 0 12px}
.ek-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer;min-height:36px}
.ek-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.ek-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.ek-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.ek-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.ek-range{display:grid;gap:4px;font-size:13.5px;font-weight:700;flex:1 1 220px}
.ek-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.ek-rows{display:grid;gap:6px;margin:0 0 12px}
.ek-rows label{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;font-size:13.5px;background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);border-radius:9px;padding:6px 10px}
.ek-rows input[type=checkbox]{width:18px;height:18px;accent-color:var(--di-accent,#0b6fa4);margin:0}
.ek-rows input[type=number]{width:64px;height:32px;border-radius:7px;border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);padding:0 6px;font:inherit;font-size:14px;color:inherit;text-align:right}
.ek-rows small{color:var(--di-muted,#4f6578);font-variant-numeric:tabular-nums;min-width:5.5em;text-align:right}
.ek-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 0 8px}
.ek-big b{font-size:34px;font-variant-numeric:tabular-nums}
.ek-big span{color:var(--di-muted,#4f6578);font-weight:700}
.ek-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0 0 10px}
.ek-card{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:8px 12px}
.ek-card b{display:block;font-size:20px}
.ek-card span{font-size:12.5px;color:var(--di-muted,#4f6578)}
.ek-warn{color:#c2563a;font-weight:800}
`;
  function injectStyle() {
    if (document.getElementById('ek-style')) return;
    const s = document.createElement('style'); s.id = 'ek-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {}; this.P = this.data.prefix == null ? '$' : this.data.prefix;
      el.classList.add('ek');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _m(n, d) { return money(n, this.P, d); }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    _hot(c, fn) {
      c.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g && c.contains(g)) fn(g.dataset.k, g); });
      c.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k, g); } });
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('ek'); }
  }

  /* ======================================================================================
   * Appliancecost: what each appliance costs to run
   * data = { prefix?, price (per kWh), items:[{id,label,watts,hours (a day), on?}] }
   * events: change {kwhDay, costMonth}
   * ====================================================================================== */
  class Appliancecost extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.I = data.items.map((x, i) => Object.assign({ i, on: x.on !== false }, x, { watts: +x.watts, hours: +x.hours }));
      el.innerHTML = '<div class="ek-rows">' + this.I.map(x => '<label><input type="checkbox" data-on="' + x.i + '"' + (x.on ? ' checked' : '') + ' aria-label="Count ' + esc(x.label) + '"><span>' + esc(x.label) + ' <small style="text-align:left">' + x.watts + ' W</small></span><input type="number" min="0" max="24" step="0.5" data-h="' + x.i + '" value="' + x.hours + '" aria-label="' + esc(x.label) + ' hours a day"><small data-c="' + x.i + '"></small></label>').join('') + '</div><svg role="img"></svg><p class="ek-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.ek-note');
      el.addEventListener('input', e => { const t = e.target; if (t.dataset.h != null) this.I[+t.dataset.h].hours = clamp(+t.value || 0, 0, 24); else if (t.dataset.on != null) this.I[+t.dataset.on].on = t.checked; else return; this.render(); const s = this.sum(); this._emit('change', { kwhDay: f1(s.kwh), costMonth: Math.round(s.kwh * 30 * this.data.price * 100) / 100 }); });
      this.render();
    }
    kwh(x) { return x.watts * x.hours / 1000; }
    sum() { const on = this.I.filter(x => x.on); return { on, kwh: on.reduce((a, x) => a + this.kwh(x), 0) }; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, price = +this.data.price, s = this.sum(), rows = s.on.slice().sort((a, b) => this.kwh(b) - this.kwh(a));
      this.I.forEach(x => { const c = this.el.querySelector('[data-c="' + x.i + '"]'); c.textContent = this._m(this.kwh(x) * 30 * price) + '/mo'; c.style.opacity = x.on ? 1 : 0.4; });
      const rh = 26, lw = narrow ? 96 : 150, H = Math.max(30, rows.length * rh + 6), mx = Math.max(...rows.map(x => this.kwh(x)), 0.001), bw = W - lw - 90;
      let s2 = '';
      rows.forEach((x, i) => { const y = 3 + i * rh, w = this.kwh(x) / mx * bw; s2 += '<text x="0" y="' + (y + 16) + '" font-size="12.5" font-weight="700" fill="' + T.fg + '">' + esc(fitText(x.label, lw - 6, 12.5)) + '</text><rect x="' + lw + '" y="' + (y + 4) + '" width="' + f1(Math.max(2, w)) + '" height="' + (rh - 9) + '" rx="4" fill="' + colorFor(this.el, x, x.i) + '"/><text x="' + f1(lw + w + 6) + '" y="' + (y + 16) + '" font-size="11.5" font-weight="700" fill="' + T.fg + '">' + esc(this._m(this.kwh(x) * 30 * price)) + '</text>'; });
      if (!rows.length) s2 = '<text x="0" y="20" font-size="13" fill="' + T.muted + '">Nothing switched on.</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Monthly running cost of each appliance switched on, largest first.');
      this.$svg.innerHTML = s2;
      if (!rows.length) { this.$note.textContent = 'Tick an appliance to count it.'; return; }
      const top = rows[0], share = this.kwh(top) / s.kwh;
      this.$note.innerHTML = 'These ' + plural(rows.length, 'thing') + ' use <b>' + kwh(s.kwh) + ' a day</b>, about <b>' + this._m(s.kwh * 30 * price) + ' a month</b> at ' + this._m(price, 2) + ' a kWh. Biggest: ' + esc(top.label.toLowerCase()) + ', ' + Math.round(share * 100) + '% of the total. An hour less of it each day saves ' + this._m(top.watts / 1000 * 30 * price, 2) + ' a month.';
    }
  }

  /* ======================================================================================
   * Solarday: solar output against use, hour by hour
   * data = { place?, lat, lon, tz, date:'YYYY-MM-DD', kw (panel size), use:[24 numbers, kWh in each hour], loss?: 0.8 }
   * events: date {date, made, used, selfUse}
   * Output ≈ kW × clear-sky sunshine on flat panels (Meinel's air-mass model, ×1.1 for scattered light) × loss; tilted panels make more in winter.
   * ====================================================================================== */
  function cosZen(dayMs, minute, lat, lon, tz) {
    const d = new Date(dayMs), doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / DAY);
    const g = (2 * Math.PI / 365) * (doy - 1 + (minute / 60 - 12) / 24);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const ha = ((minute + eq + 4 * lon - 60 * tz) / 4 - 180) * RAD;
    return Math.sin(lat * RAD) * Math.sin(decl) + Math.cos(lat * RAD) * Math.cos(decl) * Math.cos(ha);
  }
  class Solarday extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.day = pt(data.date); this.y0 = Date.UTC(new Date(this.day).getUTCFullYear(), 0, 1);
      el.innerHTML = '<div class="ek-bar"><label class="ek-range"><span></span><input type="range" min="0" max="364" step="1" aria-label="Day of the year"></label></div><div class="ek-cards"></div><svg role="img"></svg><div class="ek-legend"></div><p class="ek-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.ek-legend'); this.$note = el.querySelector('.ek-note'); this.$in = el.querySelector('input'); this.$lab = el.querySelector('.ek-range span'); this.$cards = el.querySelector('.ek-cards');
      this.$in.value = Math.round((this.day - this.y0) / DAY);
      this.$in.addEventListener('input', () => { this.day = this.y0 + (+this.$in.value) * DAY; this.render(); const t = this.totals(); this._emit('date', { date: new Date(this.day).toISOString().slice(0, 10), made: f1(t.made), used: f1(t.used), selfUse: f1(t.self) }); });
      this.render();
    }
    solar(h) { const d = this.data; let e = 0; for (let k = 0; k < 6; k++) { const c = cosZen(this.day, h * 60 + k * 10 + 5, +d.lat, +d.lon, +d.tz); if (c > 0.01) e += 1.1 * 1.353 * Math.pow(0.7, Math.pow(1 / c, 0.678)) * c; } return +d.kw * (e / 6) * (d.loss == null ? 0.8 : +d.loss); }
    totals() { let made = 0, used = 0, self = 0; for (let h = 0; h < 24; h++) { const s = this.solar(h), u = +this.data.use[h] || 0; made += s; used += u; self += Math.min(s, u); } return { made, used, self, spare: made - self, bought: used - self }; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 210 : 240, pl = 34, pr = 6, top = 10, bot = 24, t = this.totals();
      const S = [...Array(24)].map((_, h) => this.solar(h)), U = this.data.use.map(Number), mx = Math.max(...S, ...U, 0.1), yt = ticks(0, mx * 1.08, 4), ym = Math.max(yt[yt.length - 1], mx * 1.05), cw = (W - pl - pr) / 24, y = v => H - bot - v / ym * (H - top - bot), sun = '#f2b51c', use = '#2f7fd1';
      let s = '';
      yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 4) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + v + '</text>'; });
      s += '<path d="M' + pl + ',' + (H - bot) + S.map((v, h) => 'L' + f1(pl + (h + 0.5) * cw) + ',' + f1(y(v))).join('') + 'L' + (W - pr) + ',' + (H - bot) + 'Z" fill="' + sun + '" opacity=".45"/>';
      U.forEach((v, h) => { s += '<rect x="' + f1(pl + h * cw + cw * 0.22) + '" y="' + f1(y(v)) + '" width="' + f1(cw * 0.56) + '" height="' + f1(H - bot - y(v)) + '" rx="2" fill="' + use + '" opacity=".85"/>'; });
      for (let h = 0; h <= 24; h += narrow ? 6 : 3) s += '<text x="' + f1(pl + h * cw) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="' + (h === 0 ? 'start' : h === 24 ? 'end' : 'middle') + '" fill="' + T.muted + '">' + (h === 0 || h === 24 ? 'midnight' : h === 12 ? 'noon' : (h % 12) + (h < 12 ? ' am' : ' pm')) + '</text>';
      s += '<text x="' + (pl + 4) + '" y="' + (top + 10) + '" font-size="10.5" fill="' + T.muted + '">kWh in each hour</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Solar output and household use for each hour of ' + dateL(this.day) + '.');
      this.$svg.innerHTML = s;
      this.$lab.textContent = 'Day: ' + dateL(this.day) + (this.data.place ? ', ' + this.data.place : '');
      this.$cards.innerHTML = [['Made by the panels', kwh(t.made)], ['Used at home', kwh(t.used)], ['Solar used at home', kwh(t.self)], ['Bought from the grid', kwh(t.bought)]].map(([l, v]) => '<div class="ek-card"><span>' + l + '</span><b>' + v + '</b></div>').join('');
      this.$leg.innerHTML = '<span><i style="background:' + sun + ';opacity:.6"></i>Solar output (' + this.data.kw + ' kW of panels)</span><span><i style="background:' + use + '"></i>Use</span>';
      const cover = t.self / (t.used || 1), sp = t.spare / (t.made || 1);
      this.$note.innerHTML = 'On a clear <b>' + dateL(this.day) + '</b>' + (this.data.place ? ' in ' + esc(this.data.place) : '') + ', the panels make about ' + kwh(t.made) + ' and the home uses ' + kwh(t.used) + '. Solar covers <b>' + Math.round(cover * 100) + '%</b> of the use; ' + Math.round(sp * 100) + '% of what the panels make comes when it is not needed' + (sp > 0.25 ? ' — moving washing, pumping or ironing to the middle of the day would use more of it.' : '.') + ' Cloud lowers the output.';
    }
  }

  /* ======================================================================================
   * Backuptime: how long a battery lasts
   * data = { capacity (Wh), usable?: 0–1 (default 0.8), loads:[{id,label,watts,on?}] }
   * events: change {watts, hours}
   * ====================================================================================== */
  class Backuptime extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.L = data.loads.map((x, i) => Object.assign({ i, on: !!x.on }, x, { watts: +x.watts }));
      el.innerHTML = '<div class="ek-big"><b></b><span></span></div><svg role="img"></svg><div class="ek-bar" role="group" aria-label="Switched on"></div><p class="ek-note" aria-live="polite"></p>';
      this.$big = el.querySelector('.ek-big'); this.$svg = el.querySelector('svg'); this.$bar = el.querySelector('.ek-bar'); this.$note = el.querySelector('.ek-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; const x = this.L[+b.dataset.l]; x.on = !x.on; this.render(); const w = this.watts(); this._emit('change', { watts: w, hours: w ? Math.round(this.energy() / w * 100) / 100 : null }); });
      this.render();
    }
    energy() { return +this.data.capacity * (this.data.usable == null ? 0.8 : +this.data.usable); }
    watts() { return this.L.filter(x => x.on).reduce((a, x) => a + x.watts, 0); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), w = this.watts(), E = this.energy(), h = w ? E / w : Infinity, H = 44, on = this.L.filter(x => x.on);
      this.$big.innerHTML = '<b>' + (w ? hrs(h) : '—') + '</b><span>' + (w ? 'with ' + w + ' W switched on' : 'nothing switched on') + '</span>';
      let x = 2, s = '<rect x="1" y="6" width="' + (W - 12) + '" height="' + (H - 12) + '" rx="8" fill="' + T.bg + '" stroke="' + T.fg + '" stroke-width="2"/><rect x="' + (W - 11) + '" y="' + (H / 2 - 7) + '" width="9" height="14" rx="3" fill="' + T.fg + '"/>';
      const full = W - 16;
      on.slice().sort((a, b) => b.watts - a.watts).forEach(l => { const ww = w ? l.watts / w * full : 0; s += '<rect x="' + f1(x + 1) + '" y="9" width="' + f1(Math.max(1, ww - 2)) + '" height="' + (H - 18) + '" rx="5" fill="' + colorFor(this.el, l, l.i) + '"/>' + (ww > 60 ? '<text x="' + f1(x + 8) + '" y="' + (H / 2 + 4) + '" font-size="11.5" font-weight="800" fill="#fff">' + esc(fitText(l.label, ww - 12, 11.5)) + '</text>' : ''); x += ww; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Battery split by how much of the load each thing switched on takes.');
      this.$svg.innerHTML = s;
      this.$bar.innerHTML = this.L.map(l => '<button type="button" class="ek-btn" data-l="' + l.i + '" aria-pressed="' + l.on + '">' + esc(l.label) + ' · ' + l.watts + ' W</button>').join('');
      if (!w) { this.$note.textContent = 'Switch something on to see how long the battery lasts.'; return; }
      const big = on.slice().sort((a, b) => b.watts - a.watts)[0], without = w - big.watts;
      this.$note.innerHTML = 'A ' + f1(this.data.capacity / 1000) + ' kWh battery (' + Math.round(E) + ' Wh usable) lasts about <b>' + hrs(h) + '</b> running ' + list(on.map(l => esc(l.label.toLowerCase()))) + '. ' + (on.length > 1 ? 'Without the ' + esc(big.label.toLowerCase()) + ' it would last ' + hrs(E / without) + '.' : '') + ' Real batteries last a little less when old or hot.';
    }
  }

  /* ======================================================================================
   * Tariffsteps: a stepped electricity price
   * data = { prefix?, blocks:[{upTo (kWh, null for the rest), price}], fixed?: a month, use, max? }
   * events: change {use, cost}
   * ====================================================================================== */
  class Tariffsteps extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.B = data.blocks; this.use = +data.use; this.max = +data.max || Math.round(Math.max(this.use * 2, ...this.B.filter(b => b.upTo).map(b => b.upTo * 1.5)));
      el.innerHTML = '<div class="ek-bar"><label class="ek-range"><span></span><input type="range" min="0" max="' + this.max + '" step="5" aria-label="Use in a month (kWh)"></label></div><div class="ek-big"><b></b><span></span></div><svg role="img"></svg><div class="ek-legend"></div><p class="ek-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.ek-legend'); this.$note = el.querySelector('.ek-note'); this.$in = el.querySelector('input'); this.$lab = el.querySelector('.ek-range span'); this.$big = el.querySelector('.ek-big');
      this.$in.value = this.use;
      this.$in.addEventListener('input', () => { this.use = +this.$in.value; this.render(); this._emit('change', { use: this.use, cost: Math.round(this.split().cost * 100) / 100 }); });
      this.render();
    }
    split(u) {
      u = u == null ? this.use : u; let lo = 0, cost = +this.data.fixed || 0; const parts = [];
      this.B.forEach((b, i) => { const hi = b.upTo == null ? Infinity : +b.upTo, q = clamp(u - lo, 0, hi - lo); parts.push({ i, lo, hi, q, price: +b.price, cost: q * b.price }); cost += q * b.price; lo = hi; });
      return { parts, cost };
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 190 : 220, pl = 46, pr = 10, top = 12, bot = 24, sp = this.split(), mp = Math.max(...this.B.map(b => +b.price)), yt = ticks(0, mp * 1.15, 4), ym = yt[yt.length - 1];
      const x = k => pl + k / this.max * (W - pl - pr), y = p => H - bot - p / ym * (H - top - bot);
      let s = '';
      yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 4) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + esc(this._m(v, 2)) + '</text>'; });
      sp.parts.forEach(p => { const a = x(p.lo), b = x(Math.min(p.hi, this.max)), c = colorFor(this.el, { id: 'b' + p.i }, p.i); s += '<rect x="' + f1(a) + '" y="' + f1(y(p.price)) + '" width="' + f1(Math.max(0, b - a)) + '" height="' + f1(H - bot - y(p.price)) + '" fill="' + c + '" opacity=".18"/>'; if (p.q > 0) s += '<rect x="' + f1(a) + '" y="' + f1(y(p.price)) + '" width="' + f1(x(p.lo + p.q) - a) + '" height="' + f1(H - bot - y(p.price)) + '" fill="' + c + '" opacity=".85"/>'; if (p.hi !== Infinity && p.hi < this.max) s += '<text x="' + f1(b) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + p.hi + '</text>'; });
      s += '<line x1="' + f1(x(this.use)) + '" x2="' + f1(x(this.use)) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="' + T.fg + '" stroke-width="2"/><text x="' + (W - pr) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">kWh</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Price per kWh in each block, filled up to ' + this.use + ' kWh.');
      this.$svg.innerHTML = s;
      this.$lab.textContent = 'Use in a month: ' + this.use + ' kWh';
      this.$big.innerHTML = '<b>' + esc(this._m(sp.cost, 2)) + '</b><span>a month · ' + esc(this._m(this.use ? sp.cost / this.use : 0, 3)) + ' a kWh on average</span>';
      this.$leg.innerHTML = sp.parts.map(p => '<span><i style="background:' + colorFor(this.el, { id: 'b' + p.i }, p.i) + '"></i>' + (p.hi === Infinity ? 'Over ' + p.lo : (p.lo ? p.lo + '–' : 'First ') + p.hi) + ' kWh at ' + esc(this._m(p.price, 2)) + '</span>').join('');
      const used = sp.parts.filter(p => p.q > 0), cur = used[used.length - 1], next = this.split(this.use + 10).cost - sp.cost;
      this.$note.innerHTML = this.use + ' kWh costs <b>' + esc(this._m(sp.cost, 2)) + '</b>' + (+this.data.fixed ? ' including ' + esc(this._m(+this.data.fixed, 2)) + ' fixed' : '') + ': ' + used.map(p => p.q + ' kWh × ' + esc(this._m(p.price, 2))).join(' + ') + '. ' + (cur ? 'The next 10 kWh would cost ' + esc(this._m(next, 2)) + (cur.hi !== Infinity && this.use + 10 > cur.hi ? ', partly at the higher price.' : '.') : '');
    }
  }

  /* ======================================================================================
   * Meterreading: readings into use per day
   * data = { unit?:'kWh', prefix?, price?, readings:[{date:'YYYY-MM-DD', value}] }
   * events: select {from, to, perDay}
   * ====================================================================================== */
  class Meterreading extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.U = data.unit || 'kWh'; this.R = data.readings.map(r => ({ t: pt(r.date), v: +r.value })).sort((a, b) => a.t - b.t); this.sel = null;
      this.G = this.R.slice(1).map((r, i) => { const a = this.R[i], days = (r.t - a.t) / DAY, used = r.v - a.v; return { i, a: a.t, b: r.t, days, used, per: used / days }; });
      el.innerHTML = '<svg role="group"></svg><div class="ek-legend"></div><p class="ek-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.ek-legend'); this.$note = el.querySelector('.ek-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const g = this.G[this.sel]; this._emit('select', { from: new Date(g.a).toISOString().slice(0, 10), to: new Date(g.b).toISOString().slice(0, 10), perDay: f1(g.per) }); } });
      this.render();
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 210 : 240, pl = 38, pr = 8, top = 12, bot = 26, t0 = this.R[0].t, t1 = this.R[this.R.length - 1].t;
      const mx = Math.max(...this.G.map(g => g.per)), yt = ticks(0, mx * 1.1, 4), ym = yt[yt.length - 1], x = t => pl + (t - t0) / (t1 - t0) * (W - pl - pr), y = v => H - bot - v / ym * (H - top - bot), avg = this.G.reduce((a, g) => a + g.used, 0) / ((t1 - t0) / DAY);
      let s = '';
      yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 4) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + v + '</text>'; });
      this.G.forEach(g => { const on = this.sel === g.i, hi = g.per > avg * 1.15; s += '<g data-k="' + g.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(this._line(g)) + '"' + (this.sel != null && !on ? ' opacity=".5"' : '') + '><rect x="' + f1(x(g.a) + 1) + '" y="' + f1(y(g.per)) + '" width="' + f1(Math.max(2, x(g.b) - x(g.a) - 2)) + '" height="' + f1(H - bot - y(g.per)) + '" rx="3" fill="' + (hi ? '#d9822b' : T.accent) + '"/></g>'; });
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(avg)) + '" y2="' + f1(y(avg)) + '" stroke="' + T.fg + '" stroke-dasharray="5 4"/><text x="' + (W - pr) + '" y="' + f1(y(avg) - 5) + '" font-size="10.5" font-weight="700" text-anchor="end" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3">Average ' + f1(avg) + ' a day</text>';
      let last = -1e9; this.R.forEach(r => { const xx = x(r.t); if (xx - last < (narrow ? 48 : 40)) return; last = xx; s += '<text x="' + f1(clamp(xx, pl + 14, W - pr - 14)) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + dateL(r.t) + '</text>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', this.U + ' a day between meter readings. Tab to each period.');
      this._keep(this.$svg, s);
      this.$leg.innerHTML = '<span><i style="background:' + T.accent + '"></i>' + esc(this.U) + ' a day between readings</span><span><i style="background:#d9822b"></i>More than 15% over the average</span>';
      if (this.sel != null) { this.$note.innerHTML = '<b>' + esc(this._line(this.G[this.sel])) + '</b>'; return; }
      const lastG = this.G[this.G.length - 1], hi = this.G.reduce((a, g) => g.per > a.per ? g : a), month = lastG.per * 30, price = +this.data.price;
      this.$note.innerHTML = 'From ' + dateL(t0) + ' to ' + dateL(t1) + ': ' + Math.round(this.R[this.R.length - 1].v - this.R[0].v) + ' ' + esc(this.U) + ', ' + f1(avg) + ' a day on average. Highest: ' + dateL(hi.a) + ' to ' + dateL(hi.b) + ' (' + f1(hi.per) + ' a day). At the latest rate a month is about <b>' + Math.round(month) + ' ' + esc(this.U) + '</b>' + (price ? ', or ' + esc(this._m(month * price)) : '') + '.';
    }
    _line(g) { return dateL(g.a) + ' to ' + dateL(g.b) + ': ' + Math.round(g.used) + ' ' + this.U + ' in ' + plural(Math.round(g.days), 'day') + ', ' + f1(g.per) + ' a day' + (this.data.price ? ' (' + this._m(g.per * this.data.price, 2) + ' a day)' : '') + '.'; }
  }

  /* ======================================================================================
   * Payback: when an up-front cost is paid back
   * data = { prefix?, cost, saving (a month), rise?: % a year the saving grows with prices, years?: 10 }
   * events: change {cost, saving, months}
   * ====================================================================================== */
  class Payback extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.cost = +data.cost; this.save = +data.saving; this.rise = +data.rise || 0; this.Y = +data.years || 10;
      const cm = Math.max(this.cost * 2, 1000), sm = Math.max(this.save * 3, 50);
      el.innerHTML = '<div class="ek-bar"><label class="ek-range"><span data-l="c"></span><input type="range" min="0" max="' + cm + '" step="' + niceStep(cm, 100) + '" data-c aria-label="Up-front cost"></label><label class="ek-range"><span data-l="s"></span><input type="range" min="0" max="' + sm + '" step="' + niceStep(sm, 100) + '" data-s aria-label="Saving a month"></label></div><div class="ek-cards"></div><svg role="img"></svg><p class="ek-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.ek-note'); this.$cards = el.querySelector('.ek-cards');
      el.querySelector('[data-c]').value = this.cost; el.querySelector('[data-s]').value = this.save;
      el.addEventListener('input', e => { if (e.target.dataset.c != null) this.cost = +e.target.value; else if (e.target.dataset.s != null) this.save = +e.target.value; else return; this.render(); this._emit('change', { cost: this.cost, saving: this.save, months: this.months() }); });
      this.render();
    }
    series() { const out = [0]; let c = 0; for (let m = 1; m <= this.Y * 12; m++) { c += this.save * Math.pow(1 + this.rise / 100, Math.floor((m - 1) / 12)); out.push(c); } return out; }
    months() { const s = this.series(), i = s.findIndex(v => v >= this.cost); return i < 0 ? null : i; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 200 : 230, pl = 54, pr = 10, top = 12, bot = 24, S = this.series(), n = S.length - 1, mx = Math.max(S[n], this.cost) * 1.05 || 1, yt = ticks(0, mx, 4), ym = yt[yt.length - 1];
      const x = m => pl + m / n * (W - pl - pr), y = v => H - bot - v / ym * (H - top - bot), pm = this.months();
      let s = '';
      yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 4) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + esc(this._m(v)) + '</text>'; });
      for (let yr = 0; yr <= this.Y; yr += this.Y > 12 ? 5 : narrow ? 2 : 1) s += '<text x="' + f1(x(yr * 12)) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="' + (yr === this.Y ? 'end' : 'middle') + '" fill="' + T.muted + '">' + (yr ? yr + ' yr' : 'now') + '</text>';
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(this.cost)) + '" y2="' + f1(y(this.cost)) + '" stroke="#c2563a" stroke-width="2" stroke-dasharray="6 4"/><text x="' + (pl + 4) + '" y="' + f1(y(this.cost) - 5) + '" font-size="11" font-weight="700" fill="#c2563a" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3">Up-front cost ' + esc(this._m(this.cost)) + '</text>';
      s += '<path d="' + S.map((v, m) => (m ? 'L' : 'M') + f1(x(m)) + ',' + f1(y(v))).join('') + '" fill="none" stroke="#1f8a5b" stroke-width="2.6"/>';
      if (pm != null) s += '<circle cx="' + f1(x(pm)) + '" cy="' + f1(y(S[pm])) + '" r="6" fill="#1f8a5b" stroke="' + T.surface + '" stroke-width="2"/>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Savings adding up month by month against the up-front cost over ' + this.Y + ' years.');
      this.$svg.innerHTML = s;
      this.el.querySelector('[data-l="c"]').textContent = 'Up-front cost: ' + this._m(this.cost); this.el.querySelector('[data-l="s"]').textContent = 'Saving a month: ' + this._m(this.save);
      const net = S[n] - this.cost, yrs = pm == null ? null : pm / 12;
      this.$cards.innerHTML = [['Paid back after', pm == null ? 'not within ' + this.Y + ' years' : (yrs >= 1 ? Math.floor(yrs) + ' yr ' : '') + (pm % 12 ? pm % 12 + ' mo' : '')], ['Saved over ' + this.Y + ' years', this._m(S[n])], ['Ahead after ' + this.Y + ' years', this._m(net)]].map(([l, v]) => '<div class="ek-card"><span>' + l + '</span><b>' + esc(v) + '</b></div>').join('');
      this.$note.innerHTML = 'Spending <b>' + esc(this._m(this.cost)) + '</b> to save <b>' + esc(this._m(this.save)) + ' a month</b>' + (this.rise ? ' (growing ' + this.rise + '% a year as prices rise)' : '') + ': ' + (pm == null ? '<span class="ek-warn">not paid back within ' + this.Y + ' years.</span>' : 'paid back after ' + plural(pm, 'month') + ', then ' + (net >= 0 ? esc(this._m(net)) + ' ahead by year ' + this.Y + '.' : 'still behind at year ' + this.Y + '.')) + ' Check how long the equipment is expected to last.';
    }
  }

  return { Appliancecost, Solarday, Backuptime, Tariffsteps, Meterreading, Payback };
});
