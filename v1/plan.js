/*! Plan & Ask 1.0 · Dimau Infographics
 *  Six formats for planning money and time, and for asking people what they think:
 *    Loanpath   a loan calculator: monthly payment, total interest, and what paying a little extra saves.
 *    Savegrow   savings growth: deposits and interest year by year, and when a goal is reached.
 *    Countdown  time left until a date, with milestones along the way and how far through you are.
 *    Pollbar    a poll: results as bars, and the reader can vote (the app stores the vote).
 *    Rankit     put items in order of importance by dragging or with buttons, then compare with everyone else.
 *    Opinion    agree / disagree survey answers as bars centred on neutral, sortable by net agreement.
 *
 *  new Loanpath(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Loanpath', 'Savegrow', 'Countdown', 'Pollbar', 'Rankit', 'Opinion'].forEach(function (k) { root[k] = m[k]; }); root.DimauPlan = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WARM = '#d9822b';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const money = (n, d) => (d && d.prefix != null ? d.prefix : '$') + Math.round(n).toLocaleString(undefined) + (d && d.suffix || '');
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const DAY = 86400000, MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = t => { const d = new Date(t); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const dur = m => { const y = Math.floor(m / 12), r = m % 12; return (y ? y + ' year' + (y === 1 ? '' : 's') : '') + (y && r ? ' ' : '') + (r || !y ? r + ' month' + (r === 1 ? '' : 's') : ''); };
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function niceMax(v) { const m = Math.pow(10, Math.floor(Math.log10(v || 1))); return [1, 2, 2.5, 5, 10].map(k => k * m).find(x => x >= v) || v; }

  const STYLE = `
.dq{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dq) button{font:inherit;color:inherit}
.dq :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dq svg{display:block;width:100%}
.dq-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer}
.dq-btn.primary,.dq-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dq-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.dq-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dq-small{font-size:12.5px;color:var(--di-muted,#4f6578);line-height:1.45}
.dq-inputs{display:grid;gap:12px 20px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:12px}
.dq-in{display:grid;gap:4px}
.dq-in label{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700}
.dq-in output{font:700 13px/1.2 var(--di-mono,ui-monospace,monospace);color:var(--di-accent,#0b6fa4)}
.dq-in input[type=range]{width:100%;accent-color:var(--di-accent,#0b6fa4);height:28px;margin:0}
.dq-kpis{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:6px 0 12px}
.dq-kpi{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:10px 12px}
.dq-kpi b{display:block;font-size:22px;font-weight:800;line-height:1.2;font-variant-numeric:tabular-nums}
.dq-kpi span{font-size:12.5px;color:var(--di-muted,#4f6578)}
.dq-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dq-legend i{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:6px;vertical-align:3px}
.cd-big{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}
.cd-unit{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:10px 14px;min-width:84px;text-align:center}
.cd-unit b{display:block;font-size:34px;font-weight:800;line-height:1.1;color:var(--di-accent,#0b6fa4);font-variant-numeric:tabular-nums}
.cd-unit span{font-size:12px;color:var(--di-muted,#4f6578)}
.pb-row{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;padding:10px 12px;border:1px solid var(--di-line,#c9dce8);border-radius:12px;background:var(--di-surface,#fff);margin-bottom:8px}
.pb-row.mine{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 1px var(--di-accent,#0b6fa4) inset}
.pb-lab{font-weight:700;font-size:15px}
.pb-num{font:700 13px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);text-align:right}
.pb-track{grid-column:1/3;height:10px;border-radius:99px;background:var(--di-line,#c9dce8);overflow:hidden}
.pb-track i{display:block;height:100%;background:var(--di-accent,#0b6fa4);border-radius:99px;transition:width .5s}
.pb-row.lead .pb-track i{background:var(--di-fg,#13263a)}
.pb-vote{grid-column:1/3;justify-self:start;border:0;background:none;padding:2px 0;font-size:13px;font-weight:700;color:var(--di-accent,#0b6fa4);cursor:pointer}
@media (prefers-reduced-motion:reduce){.pb-track i{transition:none}}
.rk-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.rk-item{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:10px 12px;touch-action:none}
.rk-item.drag{opacity:.85;box-shadow:0 8px 20px rgba(0,0,0,.18);position:relative;z-index:2}
.rk-pos{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff);font-weight:800;cursor:grab}
.rk-lab{font-weight:700;font-size:15px;line-height:1.35}
.rk-lab small{display:block;font-weight:500;font-size:12.5px;color:var(--di-muted,#4f6578)}
.rk-mv{display:flex;gap:4px}
.rk-mv button{width:34px;height:34px;border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);border-radius:8px;cursor:pointer;font-weight:800}
.rk-mv button:disabled{opacity:.35;cursor:default}
.rk-cmp{font:700 12px/1.3 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
`;
  function injectStyle() {
    if (document.getElementById('dq-style')) return;
    const s = document.createElement('style'); s.id = 'dq-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dq');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    /** Sliders from data: { key:{label,min,max,step,value,prefix?,suffix?} } */
    _sliders(defs) {
      this.v = {}; Object.keys(defs).forEach(k => { this.v[k] = +defs[k].value; });
      const id = 'dp' + Math.random().toString(36).slice(2, 7);
      return '<div class="dq-inputs">' + Object.keys(defs).map(k => { const d = defs[k]; return '<div class="dq-in"><label for="' + id + k + '">' + esc(d.label) + '<output data-o="' + k + '"></output></label><input type="range" id="' + id + k + '" data-k="' + k + '" min="' + d.min + '" max="' + d.max + '" step="' + (d.step || 1) + '" value="' + d.value + '"></div>'; }).join('') + '</div>';
    }
    _bindSliders(defs, after) {
      this.el.querySelectorAll('input[data-k]').forEach(inp => { inp.addEventListener('input', () => { this.v[inp.dataset.k] = +inp.value; this._outs(defs); after(); }); });
      this._outs(defs);
    }
    _outs(defs) { Object.keys(defs).forEach(k => { const d = defs[k], o = this.el.querySelector('[data-o="' + k + '"]'); if (o) o.textContent = (d.prefix || '') + (+this.v[k]).toLocaleString(undefined, { maximumFractionDigits: 2 }) + (d.suffix || ''); }); }
    set(k, val) { const inp = this.el.querySelector('input[data-k="' + k + '"]'); if (!inp) return; inp.value = val; this.v[k] = +inp.value; inp.dispatchEvent(new Event('input')); }
    getState() { return this.v ? Object.assign({}, this.v) : {}; }
    setState(s) { Object.keys(s || {}).forEach(k => this.set(k, s[k])); }
    /** A simple line/area chart: series [{pts:[[x,y]], color, area?, dash?}] */
    _chart(svg, series, xLab, yFmt, extra) {
      const T = themeOf(this.el), W = Math.max(280, svg.clientWidth || 640), narrow = W < 520, H = narrow ? 210 : 260, pl = narrow ? 52 : 64, pb = 26, pt = 10, pr = 10;
      const xs = series.flatMap(s => s.pts.map(p => p[0])), ys = series.flatMap(s => s.pts.map(p => p[1])), x1 = Math.max(...xs, 1), y1 = niceMax(Math.max(...ys, 1));
      const sx = x => pl + (x / x1) * (W - pl - pr), sy = y => pt + (1 - y / y1) * (H - pt - pb);
      let s = '';
      for (let k = 0; k <= 4; k++) { const v = (y1 * k) / 4; s += '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '" opacity=".7"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(yFmt(v)) + '</text>'; }
      const step = Math.max(1, Math.ceil(x1 / (narrow ? 5 : 10)));
      for (let x = 0; x <= x1; x += step) s += '<text x="' + f1(sx(x)) + '" y="' + (H - 8) + '" text-anchor="' + (sx(x) > W - pr - 24 ? 'end' : 'middle') + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(xLab(x)) + '</text>';
      series.forEach(se => {
        const d = se.pts.map((p, i) => (i ? 'L' : 'M') + f1(sx(p[0])) + ' ' + f1(sy(p[1]))).join(' ');
        if (se.area) s += '<path d="' + d + ' L' + f1(sx(se.pts[se.pts.length - 1][0])) + ' ' + f1(sy(se.base ? 0 : 0)) + ' L' + f1(sx(se.pts[0][0])) + ' ' + f1(sy(0)) + 'Z" fill="' + se.color + '" opacity="' + (se.op || 0.25) + '"/>';
        if (se.lower) { const lo = se.lower.slice().reverse().map(p => 'L' + f1(sx(p[0])) + ' ' + f1(sy(p[1]))).join(' '); s += '<path d="' + d + ' ' + lo + 'Z" fill="' + se.color + '" opacity="' + (se.op || 0.3) + '"/>'; }
        if (!se.noLine) s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="2.5"' + (se.dash ? ' stroke-dasharray="6 5"' : '') + '/>';
      });
      if (extra) s += extra(sx, sy, T);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.style.height = H + 'px';
      svg.innerHTML = s;
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dq'); }
  }

  /* ======================================================================================
   * Loanpath: monthly payment, total interest, and what paying extra saves
   * data = { prefix?, amount:{label,min,max,step,value}, rate:{…}, years:{…}, extra?:{…}, note? }
   * ====================================================================================== */
  function schedule(P, annual, months, extra) {
    const r = annual / 1200, pay = r ? (P * r) / (1 - Math.pow(1 + r, -months)) : P / months;
    let bal = P, m = 0, interest = 0; const pts = [[0, P]];
    while (bal > 0.005 && m < months * 2) { const i = bal * r; interest += i; bal = bal + i - pay - (extra || 0); m++; pts.push([m, Math.max(0, bal)]); }
    return { pay, months: m, interest, pts };
  }
  class Loanpath extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      const defs = { amount: data.amount, rate: data.rate, years: data.years }; if (data.extra) defs.extra = data.extra;
      el.innerHTML = this._sliders(defs) + '<div class="dq-kpis" aria-live="polite"></div><svg role="img"></svg><div class="dq-legend"></div><p class="dq-note"></p>';
      this.$svg = el.querySelector('svg'); this.$k = el.querySelector('.dq-kpis'); this.$note = el.querySelector('.dq-note'); this.$leg = el.querySelector('.dq-legend');
      this._bindSliders(defs, () => { this.render(); this._emit('change', this.result()); });
      this.render();
    }
    result() {
      const v = this.v, base = schedule(v.amount, v.rate, v.years * 12, 0), withX = v.extra ? schedule(v.amount, v.rate, v.years * 12, v.extra) : null;
      return { amount: v.amount, rate: v.rate, years: v.years, extra: v.extra || 0, payment: base.pay, interest: base.interest, total: v.amount + base.interest, saved: withX ? base.interest - withX.interest : 0, monthsSooner: withX ? base.months - withX.months : 0, base, withX };
    }
    render() {
      if (!this.v) return;
      const d = this.data, R = this.result(), T = themeOf(this.el);
      this.$k.innerHTML = '<div class="dq-kpi"><b>' + esc(money(R.payment, d)) + '</b><span>each month</span></div><div class="dq-kpi"><b>' + esc(money(R.interest, d)) + '</b><span>total interest</span></div><div class="dq-kpi"><b>' + esc(money(R.total, d)) + '</b><span>paid back in all</span></div>' +
        (R.extra ? '<div class="dq-kpi"><b>' + esc(money(R.saved, d)) + '</b><span>saved by paying ' + esc(money(R.extra, d)) + ' extra</span></div>' : '');
      const series = [{ pts: R.base.pts, color: T.accent, area: true }]; if (R.withX) series.push({ pts: R.withX.pts, color: WARM, dash: true });
      this._chart(this.$svg, series, m => (m % 12 === 0 ? 'Yr ' + m / 12 : ''), v => money(v, d).replace(/,000$/, 'k'));
      this.$svg.setAttribute('aria-label', 'Balance left to pay over ' + dur(R.base.months) + (R.withX ? ', and over ' + dur(R.withX.months) + ' when paying extra' : ''));
      this.$leg.innerHTML = '<span><i style="background:' + T.accent + '"></i>Balance left to pay</span>' + (R.withX ? '<span><i style="background:' + WARM + '"></i>With ' + esc(money(R.extra, d)) + ' extra a month</span>' : '');
      this.$note.innerHTML = 'Borrowing <b>' + esc(money(R.amount, d)) + '</b> at ' + R.rate + '% a year over ' + dur(R.years * 12) + ' costs <b>' + esc(money(R.payment, d)) + ' a month</b> and <b>' + esc(money(R.interest, d)) + '</b> in interest.' +
        (R.extra ? ' Paying ' + esc(money(R.extra, d)) + ' extra each month saves <b>' + esc(money(R.saved, d)) + '</b> and finishes <b>' + dur(R.monthsSooner) + ' sooner</b>.' : '') + ' <span class="dq-small">' + esc(d.note || 'An estimate: real loans can add fees and charges.') + '</span>';
    }
  }

  /* ======================================================================================
   * Savegrow: savings with monthly deposits and interest; when a goal is reached
   * data = { prefix?, start:{…}, monthly:{…}, rate:{…}, years:{…}, goal?, note? }
   * ====================================================================================== */
  class Savegrow extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      const defs = { start: data.start, monthly: data.monthly, rate: data.rate, years: data.years };
      el.innerHTML = this._sliders(defs) + '<div class="dq-kpis" aria-live="polite"></div><svg role="img"></svg><div class="dq-legend"></div><p class="dq-note"></p>';
      this.$svg = el.querySelector('svg'); this.$k = el.querySelector('.dq-kpis'); this.$note = el.querySelector('.dq-note'); this.$leg = el.querySelector('.dq-legend');
      this._bindSliders(defs, () => { this.render(); this._emit('change', this.result()); });
      this.render();
    }
    result() {
      const v = this.v, r = v.rate / 1200, months = v.years * 12, goal = +this.data.goal || 0;
      let bal = v.start, put = v.start, hit = null; const total = [[0, bal]], dep = [[0, put]];
      for (let m = 1; m <= months; m++) { bal = bal * (1 + r) + v.monthly; put += v.monthly; if (goal && hit == null && bal >= goal) hit = m; if (m % 12 === 0 || m === months) { total.push([m / 12, bal]); dep.push([m / 12, put]); } }
      if (goal && hit == null) { let b = bal, m = months; while (b < goal && m < 1200) { b = b * (1 + r) + v.monthly; m++; } hit = b >= goal ? m : null; }
      return { balance: bal, deposits: put, growth: bal - put, goal, goalMonth: hit, total, dep };
    }
    render() {
      if (!this.v) return;
      const d = this.data, R = this.result(), T = themeOf(this.el), v = this.v;
      this.$k.innerHTML = '<div class="dq-kpi"><b>' + esc(money(R.balance, d)) + '</b><span>after ' + dur(v.years * 12) + '</span></div><div class="dq-kpi"><b>' + esc(money(R.deposits, d)) + '</b><span>you put in</span></div><div class="dq-kpi"><b>' + esc(money(R.growth, d)) + '</b><span>interest earned</span></div>' +
        (R.goal ? '<div class="dq-kpi"><b>' + (R.goalMonth ? esc(dur(R.goalMonth)) : 'Not yet') + '</b><span>to reach ' + esc(money(R.goal, d)) + '</span></div>' : '');
      this._chart(this.$svg, [{ pts: R.total, color: T.accent, lower: R.dep, op: 0.35 }, { pts: R.dep, color: T.muted, area: true, op: 0.18 }], x => 'Yr ' + x, y => money(y, d).replace(/,000$/, 'k'),
        R.goal ? (sx, sy, TT) => { const gy = sy(R.goal); return gy > 8 ? '<line x1="' + sx(0) + '" y1="' + f1(gy) + '" x2="' + sx(v.years) + '" y2="' + f1(gy) + '" stroke="' + WARM + '" stroke-width="2" stroke-dasharray="6 5"/><text x="' + f1(sx(0) + 6) + '" y="' + f1(gy - 6) + '" font-size="11.5" font-weight="700" fill="' + WARM + '">Goal ' + esc(money(R.goal, d)) + '</text>' : ''; } : null);
      this.$svg.setAttribute('aria-label', 'Savings over ' + v.years + ' years: ' + money(R.balance, d) + ', of which ' + money(R.growth, d) + ' is interest');
      this.$leg.innerHTML = '<span><i style="background:' + T.muted + '"></i>What you put in</span><span><i style="background:' + T.accent + '"></i>With interest</span>';
      this.$note.innerHTML = 'Starting with ' + esc(money(v.start, d)) + ' and adding ' + esc(money(v.monthly, d)) + ' a month at ' + v.rate + '% a year gives <b>' + esc(money(R.balance, d)) + '</b> after ' + dur(v.years * 12) + '. <b>' + esc(money(R.growth, d)) + '</b> of that is interest (' + pct(R.growth, R.balance) + '%).' +
        (R.goal ? (R.goalMonth ? ' You reach ' + esc(money(R.goal, d)) + ' after <b>' + dur(R.goalMonth) + '</b>.' : ' At this pace the goal is out of reach.') : '') + ' <span class="dq-small">' + esc(d.note || 'An estimate: assumes the same rate every year and interest added monthly.') + '</span>';
    }
  }

  /* ======================================================================================
   * Countdown: time left until a date, milestones, and how far through you are
   * data = { label, start:'YYYY-MM-DD', end:'YYYY-MM-DD', milestones?:[{date,label}] }  options: { now?: ISO or ms }
   * ====================================================================================== */
  class Countdown extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { now: null });
      el.innerHTML = '<div class="cd-big" aria-live="polite"></div><svg role="img"></svg><p class="dq-note"></p>';
      this.$big = el.querySelector('.cd-big'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dq-note'); this.sel = null;
      this.$svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) this.select(+g.dataset.k); });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.select(+g.dataset.k); } });
      if (this.o.now == null) this._t = setInterval(() => this.render(), 60000);
      this._teardown = () => clearInterval(this._t);
      this.render();
    }
    now() { return this.o.now != null ? (typeof this.o.now === 'number' ? this.o.now : Date.parse(this.o.now)) : Date.now(); }
    select(i) { this.sel = this.sel === i ? null : i; this.render(); if (this.sel != null) this._emit('select', { milestone: this.data.milestones[i] }); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, now = this.now();
      const a = Date.parse(d.start + 'T00:00:00Z'), b = Date.parse(d.end + 'T00:00:00Z'), left = Math.max(0, b - now), frac = clamp((now - a) / (b - a), 0, 1);
      const days = Math.floor(left / DAY), weeks = Math.floor(days / 7);
      this.$big.innerHTML = left > 0 ? '<div class="cd-unit"><b>' + days.toLocaleString() + '</b><span>days</span></div><div class="cd-unit"><b>' + weeks + '</b><span>weeks</span></div><div class="cd-unit"><b>' + Math.round(frac * 100) + '%</b><span>of the way</span></div>'
        : '<div class="cd-unit"><b>Done</b><span>' + esc(fmtDate(b)) + '</span></div>';
      const ms = (d.milestones || []).map((m, i) => ({ i, t: Date.parse(m.date + 'T00:00:00Z'), m })), pad = 16, bw = W - pad * 2, x = t => pad + clamp((t - a) / (b - a), 0, 1) * bw, H = 92, y = 40;
      let s = '<rect x="' + pad + '" y="' + (y - 6) + '" width="' + bw + '" height="12" rx="6" fill="' + T.line + '"/><rect x="' + pad + '" y="' + (y - 6) + '" width="' + f1(Math.max(6, frac * bw)) + '" height="12" rx="6" fill="' + T.accent + '"/>' +
        '<text x="' + pad + '" y="' + (y + 30) + '" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtDate(a)) + '</text><text x="' + (W - pad) + '" y="' + (y + 30) + '" text-anchor="end" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtDate(b)) + '</text>' +
        '<g><line x1="' + f1(x(now)) + '" y1="' + (y - 16) + '" x2="' + f1(x(now)) + '" y2="' + (y + 12) + '" stroke="' + T.fg + '" stroke-width="2"/><text x="' + f1(clamp(x(now), 30, W - 30)) + '" y="' + (y - 20) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="' + T.fg + '">Today</text></g>';
      ms.forEach(m => {
        const passed = m.t <= now, on = this.sel === m.i, mx = x(m.t);
        s += '<g data-k="' + m.i + '" tabindex="0" role="button" style="cursor:pointer" aria-label="' + esc(m.m.label + ', ' + fmtDate(m.t) + (passed ? ', passed' : '')) + '"><circle cx="' + f1(mx) + '" cy="' + y + '" r="' + (on ? 9 : 7) + '" fill="' + (passed ? T.accent : T.surface) + '" stroke="' + T.fg + '" stroke-width="2"/><circle cx="' + f1(mx) + '" cy="' + y + '" r="16" fill="transparent"/>' +
          (narrow ? '' : '<text x="' + f1(clamp(mx, 50, W - 50)) + '" y="' + (y + 50) + '" text-anchor="middle" font-size="11" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(m.m.label, 150, 11)) + '</text>') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', d.label + ': ' + Math.round(frac * 100) + '% of the way, ' + days + ' days left');
      this.$svg.innerHTML = s;
      const next = ms.filter(m => m.t > now).sort((p, q) => p.t - q.t)[0], sel = this.sel != null ? ms[this.sel] : null;
      if (sel) this.$note.innerHTML = '<b>' + esc(sel.m.label) + '</b>: ' + esc(fmtDate(sel.t)) + (sel.t > now ? ', in ' + Math.ceil((sel.t - now) / DAY) + ' days.' : ', ' + Math.floor((now - sel.t) / DAY) + ' days ago.');
      else this.$note.innerHTML = left > 0 ? '<b>' + days.toLocaleString() + ' days</b> until ' + esc(d.label) + ' (' + esc(fmtDate(b)) + ').' + (next ? ' Next: <b>' + esc(next.m.label) + '</b> in ' + Math.ceil((next.t - now) / DAY) + ' days.' : '') + ' Tap a milestone.' : esc(d.label) + ' was on ' + esc(fmtDate(b)) + '.';
    }
  }

  /* ======================================================================================
   * Pollbar: results as bars; the reader can vote once (and change it)
   * data = { question, options:[{id,label,votes}], vote?: optionId }  options: { canVote: true }
   * ====================================================================================== */
  class Pollbar extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { canVote: true });
      this.opts = data.options.map(o => Object.assign({}, o, { votes: +o.votes || 0 })); this.mine = data.vote || null;
      el.innerHTML = '<p style="font-size:18px;font-weight:800;margin:0 0 10px">' + esc(data.question || '') + '</p><div class="pb-list"></div><p class="dq-note" aria-live="polite"></p>';
      this.$list = el.querySelector('.pb-list'); this.$note = el.querySelector('.dq-note');
      this.$list.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) this.vote(b.dataset.v); });
      this.render();
    }
    vote(id) {
      if (!this.o.canVote) return; const prev = this.mine;
      if (prev) this.opts.find(o => o.id === prev).votes--;
      this.mine = prev === id ? null : id; if (this.mine) this.opts.find(o => o.id === this.mine).votes++;
      this.render(); const b = this.$list.querySelector('[data-v="' + CSS.escape(id) + '"]'); b && b.focus();
      this._emit('vote', { id: this.mine, previous: prev });
    }
    getState() { return { vote: this.mine }; }
    setState(s) { if (s && s.vote && s.vote !== this.mine) this.vote(s.vote); }
    render() {
      const tot = this.opts.reduce((s, o) => s + o.votes, 0), lead = Math.max(...this.opts.map(o => o.votes));
      this.$list.innerHTML = this.opts.map(o => { const p = tot ? (100 * o.votes) / tot : 0, mine = this.mine === o.id; return '<div class="pb-row' + (mine ? ' mine' : '') + (o.votes === lead && lead > 0 ? ' lead' : '') + '"><span class="pb-lab">' + esc(o.label) + (mine ? ' · your vote' : '') + '</span><span class="pb-num">' + Math.round(p) + '% · ' + o.votes.toLocaleString() + '</span><span class="pb-track" role="img" aria-label="' + esc(o.label + ': ' + Math.round(p) + '%') + '"><i style="width:' + f1(p) + '%"></i></span>' +
        (this.o.canVote ? '<button type="button" class="pb-vote" data-v="' + esc(o.id) + '" aria-pressed="' + mine + '">' + (mine ? 'Take back my vote' : this.mine ? 'Change my vote to this' : 'Vote for this') + '</button>' : '') + '</div>'; }).join('');
      const top = this.opts.slice().sort((a, b) => b.votes - a.votes), gap = top[1] ? top[0].votes - top[1].votes : top[0].votes;
      this.$note.innerHTML = '<b>' + tot.toLocaleString() + ' votes.</b> ' + (top[0] ? '<b>' + esc(top[0].label) + '</b> leads with ' + pct(top[0].votes, tot) + '%' + (top[1] ? ', ' + gap.toLocaleString() + ' ahead of ' + esc(top[1].label) : '') + '.' : '');
    }
  }

  /* ======================================================================================
   * Rankit: put items in order by dragging or with the arrows; compare with everyone
   * data = { prompt?, items:[{id,label,note?}], average?:[ids in the group's order], averageLabel? }
   * ====================================================================================== */
  class Rankit extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.items = data.items.slice(); this.order = this.items.map(t => t.id); this.shown = false;
      el.innerHTML = (data.prompt ? '<p style="font-size:16px;font-weight:700;margin:0 0 10px">' + esc(data.prompt) + '</p>' : '') + '<ol class="rk-list"></ol><div class="dq-bar">' + (data.average ? '<button type="button" class="dq-btn primary" data-done>Compare with everyone</button>' : '') + '<button type="button" class="dq-btn" data-reset>Start again</button></div><p class="dq-note" aria-live="polite"></p>';
      this.$list = el.querySelector('.rk-list'); this.$note = el.querySelector('.dq-note');
      this.$list.addEventListener('click', e => { const b = e.target.closest('[data-mv]'); if (b) this.move(b.closest('[data-id]').dataset.id, +b.dataset.mv, b.dataset.mv); });
      const done = el.querySelector('[data-done]'); if (done) done.onclick = () => { this.shown = true; this.render(); this._emit('done', { order: this.order.slice() }); };
      el.querySelector('[data-reset]').onclick = () => { this.order = this.items.map(t => t.id); this.shown = false; this.render(); };
      this._drag(); this.render();
    }
    move(id, d, focusDir) {
      const i = this.order.indexOf(id), j = clamp(i + d, 0, this.order.length - 1); if (i === j) return;
      this.order.splice(i, 1); this.order.splice(j, 0, id); this.render(); this._emit('change', { order: this.order.slice() });
      if (focusDir) { let b = this.$list.querySelector('[data-id="' + CSS.escape(id) + '"] [data-mv="' + focusDir + '"]'); if (!b || b.disabled) b = this.$list.querySelector('[data-id="' + CSS.escape(id) + '"] [data-mv]:not(:disabled)'); b && b.focus(); }
    }
    _drag() {
      let cur = null;
      this.$list.addEventListener('pointerdown', e => { const h = e.target.closest('.rk-pos'); if (!h) return; const li = h.closest('[data-id]'); cur = { id: li.dataset.id, y0: e.clientY, li }; li.classList.add('drag'); h.setPointerCapture(e.pointerId); e.preventDefault(); });
      this.$list.addEventListener('pointermove', e => {
        if (!cur) return; const dy = e.clientY - cur.y0; cur.li.style.transform = 'translateY(' + dy + 'px)';
        const rows = [...this.$list.children], i = this.order.indexOf(cur.id), h = cur.li.getBoundingClientRect().height + 8;
        if (dy > h * 0.6 && i < rows.length - 1) { cur.y0 += h; this.move(cur.id, 1); cur.li = this.$list.querySelector('[data-id="' + CSS.escape(cur.id) + '"]'); cur.li.classList.add('drag'); cur.li.style.transform = 'translateY(' + (e.clientY - cur.y0) + 'px)'; }
        else if (dy < -h * 0.6 && i > 0) { cur.y0 -= h; this.move(cur.id, -1); cur.li = this.$list.querySelector('[data-id="' + CSS.escape(cur.id) + '"]'); cur.li.classList.add('drag'); cur.li.style.transform = 'translateY(' + (e.clientY - cur.y0) + 'px)'; }
      });
      const end = () => { if (!cur) return; cur.li.classList.remove('drag'); cur.li.style.transform = ''; cur = null; };
      this.$list.addEventListener('pointerup', end); this.$list.addEventListener('pointercancel', end);
    }
    getState() { return { order: this.order.slice() }; }
    setState(s) { if (s && s.order) { const ok = s.order.filter(id => this.order.includes(id)); this.order = ok.concat(this.order.filter(id => !ok.includes(id))); this.render(); } }
    render() {
      const avg = this.data.average || [], n = this.order.length;
      this.$list.innerHTML = this.order.map((id, i) => {
        const t = this.items.find(x => x.id === id), ai = avg.indexOf(id), diff = ai >= 0 ? ai - i : null;
        return '<li class="rk-item" data-id="' + esc(id) + '"><span class="rk-pos" aria-hidden="true" title="Drag to move">' + (i + 1) + '</span><span class="rk-lab">' + esc(t.label) + (t.note ? '<small>' + esc(t.note) + '</small>' : '') +
          (this.shown && ai >= 0 ? '<small class="rk-cmp">' + esc((this.data.averageLabel || 'Everyone') + ': ' + (ai + 1) + (diff === 0 ? ' · same as you' : diff > 0 ? ' · you rank it higher' : ' · you rank it lower')) + '</small>' : '') + '</span>' +
          '<span class="rk-mv"><button type="button" data-mv="-1" aria-label="' + esc('Move ' + t.label + ' up') + '"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-mv="1" aria-label="' + esc('Move ' + t.label + ' down') + '"' + (i === n - 1 ? ' disabled' : '') + '>↓</button></span></li>';
      }).join('');
      if (this.shown && avg.length) {
        const same = this.order.filter((id, i) => avg[i] === id).length, top = this.items.find(t => t.id === avg[0]);
        this.$note.innerHTML = 'You put <b>' + same + ' of ' + n + '</b> in the same place as ' + esc((this.data.averageLabel || 'everyone').toLowerCase()) + '. Their top choice: <b>' + esc(top ? top.label : '') + '</b>; yours: <b>' + esc(this.items.find(t => t.id === this.order[0]).label) + '</b>.';
      } else this.$note.innerHTML = 'Drag the numbers, or use the arrows, to put these in order. Number 1 matters most.';
    }
  }

  /* ======================================================================================
   * Opinion: agree / disagree answers as bars centred on neutral
   * data = { scale:[labels, low to high, odd count], statements:[{id,label,counts:[n per scale point]}], respondents? }
   * ====================================================================================== */
  class Opinion extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'given' });
      this.st = data.statements.map((s, i) => Object.assign({ i }, s)); this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="dq-bar" role="group" aria-label="Order"><button type="button" class="dq-btn" data-s="given">As asked</button><button type="button" class="dq-btn" data-s="net">Most agreed first</button></div><svg role="img"></svg><div class="dq-legend"></div><p class="dq-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.dq-legend'); this.$note = el.querySelector('.dq-note');
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { this.sort = b.dataset.s; this.render(); this._emit('sort', { by: this.sort }); });
      this.$svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) this.select(+g.dataset.k); });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.select(+g.dataset.k); } });
      this.render();
    }
    _split(s) {
      const c = s.counts.map(Number), n = c.length, tot = c.reduce((x, y) => x + y, 0) || 1, lo = Math.floor(n / 2), hi = Math.ceil(n / 2);
      const neg = c.slice(0, lo).reduce((x, y) => x + y, 0), pos = c.slice(hi).reduce((x, y) => x + y, 0), neu = n % 2 ? c[lo] : 0;
      return { c, tot, neg, pos, neu, net: (pos - neg) / tot };
    }
    select(i) { this.sel = this.sel === i ? null : i; this.render(); if (this.sel != null) this._emit('select', { id: this.st[i].id }); }
    colors(T) {
      const n = this.data.scale.length, m = Math.floor(n / 2), warm = ['#b5531f', '#e08a45', '#f0b98a'], cool = ['#8fbfe0', '#3f8fd2', T.accent];
      return this.data.scale.map((_, k) => k < m ? warm[k] : k >= Math.ceil(n / 2) ? cool[3 - m + (k - Math.ceil(n / 2))] : '#a9b4bd');
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, n = d.scale.length, mid = (n - 1) / 2, cols = this.colors(T);
      const order = this.sort === 'net' ? this.st.slice().sort((a, b) => this._split(b).net - this._split(a).net) : this.st, lab = 18, bh = narrow ? 18 : 22, gap = 12, rowH = lab + bh + gap, cx = W / 2, half = W / 2 - 4;
      let s = '';
      order.forEach((st, r) => {
        const S = this._split(st), y = r * rowH + lab, on = this.sel === st.i, sc = v => (v / S.tot) * half;
        let xl = cx - sc(S.neg) - (n % 2 ? sc(S.neu) / 2 : 0), parts = '';
        S.c.forEach((v, k) => { const w = sc(v); if (w > 0) parts += '<rect x="' + f1(xl) + '" y="' + y + '" width="' + f1(w) + '" height="' + bh + '" fill="' + cols[k] + '"><title>' + esc(d.scale[k] + ': ' + pct(v, S.tot) + '%') + '</title></rect>' + (w > 26 ? '<text x="' + f1(xl + w / 2) + '" y="' + f1(y + bh / 2 + 4) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="#ffffff" pointer-events="none">' + pct(v, S.tot) + '%</text>' : ''); xl += w; });
        s += '<g data-k="' + st.i + '" tabindex="0" role="button" style="cursor:pointer" aria-pressed="' + on + '" aria-label="' + esc(st.label + ': ' + pct(S.pos, S.tot) + '% agree, ' + pct(S.neg, S.tot) + '% disagree') + '"' + (this.sel != null && !on ? ' opacity=".45"' : '') + '>' +
          '<text x="0" y="' + (y - 5) + '" font-size="13" font-weight="' + (on ? 800 : 700) + '" fill="' + T.fg + '">' + esc(fitText(st.label, W, 13)) + '</text>' + parts + '<line x1="' + f1(cx) + '" y1="' + (y - 3) + '" x2="' + f1(cx) + '" y2="' + (y + bh + 3) + '" stroke="' + T.fg + '" stroke-width="1.5" opacity=".6"/>' + (on ? '<rect x="1" y="' + (y - 1) + '" width="' + (W - 2) + '" height="' + (bh + 2) + '" fill="none" stroke="' + T.fg + '" stroke-width="1.5" rx="2"/>' : '') + '</g>';
      });
      const H = order.length * rowH - gap + 4;
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Survey answers: ' + this.st.map(st => { const S = this._split(st); return st.label + ' ' + pct(S.pos, S.tot) + '% agree'; }).join('; '));
      this.$svg.innerHTML = s;
      this.el.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === this.sort)));
      this.$leg.innerHTML = d.scale.map((l, k) => '<span><i style="background:' + cols[k] + ';height:10px;width:10px;vertical-align:-1px"></i>' + esc(l) + '</span>').join('');
      if (this.sel != null) {
        const st = this.st[this.sel], S = this._split(st);
        this.$note.innerHTML = '<b>' + esc(st.label) + '</b>: ' + d.scale.map((l, k) => esc(l.toLowerCase()) + ' ' + pct(S.c[k], S.tot) + '%').join(', ') + '. In all, <b>' + pct(S.pos, S.tot) + '% agree</b> and ' + pct(S.neg, S.tot) + '% disagree (' + S.tot.toLocaleString() + ' answers).';
      } else {
        const by = this.st.slice().sort((a, b) => this._split(b).net - this._split(a).net), hi = by[0], lo = by[by.length - 1];
        this.$note.innerHTML = 'Most agreed: <b>' + esc(hi.label) + '</b> (' + pct(this._split(hi).pos, this._split(hi).tot) + '% agree). Most split or disagreed: <b>' + esc(lo.label) + '</b> (' + pct(this._split(lo).neg, this._split(lo).tot) + '% disagree). Tap a statement for detail.';
      }
    }
  }

  return { Loanpath, Savegrow, Countdown, Pollbar, Rankit, Opinion, schedule };
});
