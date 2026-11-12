/*! Money 1.0 · Dimau Infographics
 *  Six household money tools. They work things out; they are not financial advice.
 *    Paysplit      where a pay packet goes: deductions, bills, savings and what is left; per week, fortnight or month.
 *    Budgetplan    spending against a needs / wants / savings plan; change the amounts and see the shares move.
 *    Debtplan      two ways to clear several debts (smallest first or dearest first), months and interest compared.
 *    Sendmoney     sending money home: how much arrives with each provider after fees and exchange rate.
 *    Cashcalendar  the balance day by day through a month of paydays and bills; switch bills on and off.
 *    Pricerise     what rising prices do to money over the years, and how much is needed to keep up.
 *
 *  new Paysplit(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Paysplit', 'Budgetplan', 'Debtplan', 'Sendmoney', 'Cashcalendar', 'Pricerise'].forEach(function (k) { root[k] = m[k]; }); root.DimauMoney = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const KIND = { deduction: '#8a97a6', bill: '#d9822b', saving: '#1fa38a', spend: '#2f7fd1', needs: '#d9822b', wants: '#2f7fd1', savings: '#1fa38a' };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const money = (n, p, dec) => (n < 0 ? '−' : '') + (p == null ? '$' : p) + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: dec == null ? 0 : dec, maximumFractionDigits: dec == null ? 0 : dec });
  const pct = (n, d) => (n * 100).toFixed(d || 0) + '%';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }

  const STYLE = `
.df{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.df) button{font:inherit;color:inherit}
.df :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.df svg{display:block;width:100%}
.df svg [data-k]{cursor:pointer}
.df svg [data-k]:focus{outline:none}
.df svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.df-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.df-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.df-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.df-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.df-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.df-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.df-range{display:grid;gap:4px;margin:0 0 10px;font-size:13.5px;font-weight:700}
.df-range input{width:100%;accent-color:var(--di-accent,#0b6fa4);height:26px;margin:0}
.df-field{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700}
.df-field input{width:110px;height:36px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 10px;font:inherit;font-size:14px;color:inherit}
.df-rows{display:grid;gap:6px;margin:0 0 12px}
.df-rows label{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;font-size:13.5px;background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);border-radius:9px;padding:6px 10px}
.df-rows label i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.df-rows input[type=number]{width:96px;height:32px;border-radius:7px;border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);padding:0 8px;font:inherit;font-size:14px;color:inherit;text-align:right}
.df-rows input[type=checkbox]{width:18px;height:18px;accent-color:var(--di-accent,#0b6fa4)}
.df-rows small{color:var(--di-muted,#4f6578);font-family:var(--di-mono,ui-monospace,monospace)}
.df-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px}
.df-card{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:10px 12px}
.df-card.best{border-color:#1f8a5b;box-shadow:0 0 0 2px #1f8a5b inset}
.df-card b{display:block;font-size:22px}
.df-card span{font-size:12.5px;color:var(--di-muted,#4f6578);line-height:1.5}
.df-warn{color:#c2563a;font-weight:800}
`;
  function injectStyle() {
    if (document.getElementById('df-style')) return;
    const s = document.createElement('style'); s.id = 'df-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {}; this.P = data.prefix == null ? '$' : data.prefix;
      el.classList.add('df');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _m(n, dec) { return money(n, this.P, dec); }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('df'); }
  }

  /* ======================================================================================
   * Paysplit: where pay goes
   * data = { prefix?, gross, per:'month'|'fortnight'|'week', items:[{id,label,kind:'deduction'|'bill'|'saving',amount?|percent?}] }
   * ====================================================================================== */
  const PER = { week: 52, fortnight: 26, month: 12, year: 1 };
  class Paysplit extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.base = data.per || 'month'; this.per = this.base; this.items = data.items.map((x, i) => Object.assign({ i }, x)); this.sel = null;
      el.innerHTML = '<div class="df-bar" role="group" aria-label="Show per"></div><svg role="group"></svg><div class="df-legend"></div><p class="df-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.df-bar'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.df-legend'); this.$note = el.querySelector('.df-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-per]'); if (b) { this.per = b.dataset.per; this.render(); this._emit('per', { per: this.per }); } });
      this.$svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) { this.sel = this.sel === g.dataset.k ? null : g.dataset.k; this.render(); } });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.sel = this.sel === g.dataset.k ? null : g.dataset.k; this.render(); } });
      this.render();
    }
    _amt(x, gross) { return x.percent != null ? gross * x.percent / 100 : +x.amount; }
    render() {
      const T = themeOf(this.el), f = PER[this.base] / PER[this.per], gross = +this.data.gross * f, rows = this.items.map(x => Object.assign({}, x, { v: this._amt(x, +this.data.gross) * f })), used = rows.reduce((a, x) => a + x.v, 0), left = gross - used;
      const W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, order = ['deduction', 'bill', 'saving'], segs = order.flatMap(k => rows.filter(x => (x.kind || 'bill') === k)).concat([{ id: 'left', label: 'Left to spend', kind: 'spend', v: Math.max(0, left) }]), bh = 44, H = 22 + bh + (left < 0 ? 28 : 6), x0 = 4, w = W - 8;
      let s = '', x = x0;
      segs.forEach(sg => { const sw = (sg.v / Math.max(gross, used)) * w, on = this.sel === sg.id; s += '<g data-k="' + esc(sg.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(sg.label + ': ' + this._m(sg.v) + ', ' + pct(sg.v / gross)) + '"' + (this.sel && !on ? ' opacity=".4"' : '') + '><rect x="' + f1(x) + '" y="22" width="' + f1(Math.max(0, sw - 1.5)) + '" height="' + bh + '" rx="4" fill="' + (sg.id === 'left' ? T.accent : KIND[sg.kind || 'bill']) + '" opacity="' + (sg.id === 'left' ? 0.85 : 0.8) + '"/>' + (sw > 54 ? '<text x="' + f1(x + 6) + '" y="' + (22 + bh / 2 + 4) + '" font-size="11" font-weight="700" fill="#fff" pointer-events="none">' + esc(fitText(sg.label, sw - 10, 11)) + '</text>' : '') + '</g>'; x += sw; });
      s += '<text x="' + x0 + '" y="14" font-size="11.5" font-weight="700" fill="' + T.muted + '">Pay before anything comes off: ' + esc(this._m(gross)) + ' a ' + this.per + '</text>';
      if (left < 0) s += '<text x="' + x0 + '" y="' + (22 + bh + 18) + '" font-size="12" font-weight="800" fill="#c2563a">Short by ' + esc(this._m(-left)) + ' a ' + this.per + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Where ' + this._m(gross) + ' a ' + this.per + ' goes');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = ['week', 'fortnight', 'month', 'year'].map(p => '<button type="button" class="df-btn" data-per="' + p + '" aria-pressed="' + (this.per === p) + '">Per ' + p + '</button>').join('');
      const sum = k => rows.filter(x => (x.kind || 'bill') === k).reduce((a, x) => a + x.v, 0);
      this.$leg.innerHTML = [['deduction', 'Taken off pay'], ['bill', 'Bills'], ['saving', 'Savings']].map(([k, l]) => '<span><i style="background:' + KIND[k] + '"></i>' + l + ' ' + esc(this._m(sum(k))) + '</span>').join('') + '<span><i style="background:' + T.accent + '"></i>Left ' + esc(this._m(left)) + '</span>';
      const sg = this.sel ? segs.find(z => z.id === this.sel) : null;
      this.$note.innerHTML = sg ? '<b>' + esc(sg.label) + '</b>: ' + this._m(sg.v) + ' a ' + this.per + ' (' + pct(sg.v / gross) + ' of pay)' + (sg.percent != null ? ', worked out as ' + sg.percent + '% of pay' : '') + '. That is ' + this._m(sg.v * PER[this.per] / 12) + ' a month.' : 'Of ' + this._m(gross) + ' a ' + this.per + ': ' + pct(sum('deduction') / gross) + ' is taken off, ' + pct(sum('bill') / gross) + ' goes on bills and ' + pct(sum('saving') / gross) + ' is saved, leaving <b>' + this._m(left) + '</b> to spend' + (left < 0 ? ' — <span class="df-warn">more goes out than comes in</span>' : '') + '. Tap a part for more.';
    }
  }

  /* ======================================================================================
   * Budgetplan: needs, wants, savings against a plan
   * data = { prefix?, income, plan:{needs:50,wants:30,savings:20}, items:[{id,label,kind:'needs'|'wants'|'savings',amount}] }
   * ====================================================================================== */
  class Budgetplan extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.items = data.items.map((x, i) => Object.assign({ i }, x, { amount: +x.amount })); this.income = +data.income; this.plan = data.plan || { needs: 50, wants: 30, savings: 20 };
      el.innerHTML = '<div class="df-bar"><label class="df-field">Income a month <input type="number" min="0" step="10" data-income value="' + this.income + '"></label></div><div class="df-rows">' + this.items.map(x => '<label><span><i style="background:' + KIND[x.kind] + '"></i>' + esc(x.label) + ' <small>' + x.kind + '</small></span><input type="number" min="0" step="5" data-i="' + x.i + '" value="' + x.amount + '" aria-label="' + esc(x.label) + ' a month"><span></span></label>').join('') + '</div><svg role="img"></svg><p class="df-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.df-note');
      el.addEventListener('input', e => { if (e.target.dataset.income != null) this.income = Math.max(0, +e.target.value || 0); else if (e.target.dataset.i != null) this.items[+e.target.dataset.i].amount = Math.max(0, +e.target.value || 0); else return; this.render(); this._emit('change', this._shares()); });
      this.render();
    }
    _shares() { const s = { needs: 0, wants: 0, savings: 0 }; this.items.forEach(x => { s[x.kind] += x.amount; }); return s; }
    render() {
      const T = themeOf(this.el), s = this._shares(), inc = this.income || 1, spent = s.needs + s.wants + s.savings, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rowH = 44, pl = narrow ? 70 : 90, pr = 70, H = 3 * rowH + 24, mx = Math.max(100, ...['needs', 'wants', 'savings'].map(k => (s[k] / inc) * 100), ...Object.values(this.plan)), sx = v => pl + (v / mx) * (W - pl - pr);
      let g = '';
      ['needs', 'wants', 'savings'].forEach((k, r) => { const y = 6 + r * rowH, act = (s[k] / inc) * 100, tgt = this.plan[k], over = k === 'savings' ? act < tgt : act > tgt; g += '<text x="' + (pl - 8) + '" y="' + (y + 20) + '" text-anchor="end" font-size="13" font-weight="800" fill="' + T.fg + '">' + k.charAt(0).toUpperCase() + k.slice(1) + '</text><rect x="' + pl + '" y="' + (y + 6) + '" width="' + f1(Math.max(2, sx(act) - pl)) + '" height="22" rx="4" fill="' + KIND[k] + '"/><line x1="' + f1(sx(tgt)) + '" y1="' + y + '" x2="' + f1(sx(tgt)) + '" y2="' + (y + 34) + '" stroke="' + T.fg + '" stroke-width="2.5"/><text x="' + f1(sx(act) + 6) + '" y="' + (y + 21) + '" font-size="11.5" font-weight="700" fill="' + (over ? '#c2563a' : T.fg) + '" font-family="' + esc(T.mono) + '">' + Math.round(act) + '%</text>'; });
      g += '<text x="' + pl + '" y="' + (H - 4) + '" font-size="10.5" fill="' + T.muted + '">Upright line: the plan (' + this.plan.needs + ' / ' + this.plan.wants + ' / ' + this.plan.savings + ')</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Needs ' + Math.round(s.needs / inc * 100) + '%, wants ' + Math.round(s.wants / inc * 100) + '%, savings ' + Math.round(s.savings / inc * 100) + '% of income, against a plan of ' + this.plan.needs + ', ' + this.plan.wants + ' and ' + this.plan.savings);
      this.$svg.innerHTML = g;
      this.el.querySelectorAll('.df-rows label').forEach((l, i) => { l.lastChild.textContent = pct(this.items[i].amount / inc); l.lastChild.className = ''; l.lastChild.style.cssText = 'font-size:12px;color:var(--di-muted);font-family:var(--di-mono)'; });
      const left = this.income - spent, msgs = [];
      ['needs', 'wants'].forEach(k => { const d = s[k] - inc * this.plan[k] / 100; if (d > 0.5) msgs.push(k + ' are ' + this._m(d) + ' over the plan'); });
      const sv = inc * this.plan.savings / 100 - s.savings; if (sv > 0.5) msgs.push('savings are ' + this._m(sv) + ' short of the plan');
      this.$note.innerHTML = (msgs.length ? '<span class="df-warn">' + esc(msgs.join('; ')) + '.</span> ' : '<b>On plan.</b> ') + (left >= 0 ? this._m(left) + ' of income is not yet given a job.' : '<span class="df-warn">' + this._m(-left) + ' more is planned than comes in.</span>') + ' Change any amount to see the shares move. Not financial advice.';
    }
  }

  /* ======================================================================================
   * Debtplan: smallest first vs dearest first
   * data = { prefix?, debts:[{id,label,balance,rate,min}], extra }  (rate = yearly %)
   * ====================================================================================== */
  function payoff(debts, extra, order) {
    const D = debts.map(d => ({ id: d.id, label: d.label, b: +d.balance, r: +d.rate / 1200, min: +d.min })), seq = D.slice().sort(order), paidAt = {}, series = [];
    let month = 0, interest = 0, budget = D.reduce((a, d) => a + d.min, 0) + +extra;
    series.push(D.reduce((a, d) => a + d.b, 0));
    while (D.some(d => d.b > 0.005) && month < 600) {
      month++; D.forEach(d => { if (d.b > 0) { const i = d.b * d.r; d.b += i; interest += i; } });
      let left = budget; D.forEach(d => { if (d.b > 0) { const p = Math.min(d.min, d.b); d.b -= p; left -= p; } });
      for (const t of seq) { const d = D.find(z => z.id === t.id); if (d.b > 0 && left > 0) { const p = Math.min(left, d.b); d.b -= p; left -= p; } }
      D.forEach(d => { if (d.b <= 0.005 && !paidAt[d.id]) { d.b = 0; paidAt[d.id] = month; } });
      series.push(D.reduce((a, d) => a + d.b, 0));
    }
    return { months: month, interest, paidAt, series, order: seq.map(d => d.id), stuck: month >= 600 };
  }
  class Debtplan extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.debts = data.debts.map((d, i) => Object.assign({ i }, d)); this.extra = +data.extra || 0; this.at = null;
      el.innerHTML = '<label class="df-range"><span>Extra each month on top of the minimums: <output></output></span><input type="range" min="0" max="' + (data.maxExtra || 500) + '" step="10" value="' + this.extra + '"></label><div class="df-cards"></div><svg role="img"></svg><div class="df-legend"></div><p class="df-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$out = el.querySelector('output'); this.$cards = el.querySelector('.df-cards'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.df-legend'); this.$note = el.querySelector('.df-note');
      this.$in.addEventListener('input', () => { this.extra = +this.$in.value; this.render(); this._emit('extra', { extra: this.extra, snowball: this._s.months, avalanche: this._a.months }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), a = this._a = payoff(this.debts, this.extra, (x, y) => y.r - x.r || x.b - y.b), s = this._s = payoff(this.debts, this.extra, (x, y) => x.b - y.b || y.r - x.r), name = id => this.debts.find(d => d.id === id).label;
      this.$out.textContent = this._m(this.extra);
      const yrs = m => (m >= 12 ? Math.floor(m / 12) + ' yr ' : '') + (m % 12) + ' mo', best = a.interest <= s.interest ? 'a' : 's';
      const card = (k, r, title, how) => '<div class="df-card' + (best === k ? ' best' : '') + '"><span>' + title + '</span><b>' + (r.stuck ? 'Never' : yrs(r.months)) + '</b><span>' + this._m(r.interest) + ' in interest · ' + how + '<br>Order: ' + r.order.map(name).map(esc).join(' → ') + '</span></div>';
      this.$cards.innerHTML = card('s', s, 'Smallest balance first', 'quick wins') + card('a', a, 'Highest interest first', 'least interest');
      const W = Math.max(280, this.$svg.clientWidth || 640), H = 200, pl = 56, pr = 10, pt = 10, pb = 24, n = Math.max(a.series.length, s.series.length), hi = Math.max(...a.series, ...s.series), sx = i => pl + (i / Math.max(1, n - 1)) * (W - pl - pr), sy = v => pt + (1 - v / hi) * (H - pt - pb);
      let g = ticks(0, hi, 4).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(this._m(v)) + '</text>').join('');
      for (let m = 0; m < n; m += 12) g += '<text x="' + f1(sx(m)) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + (m / 12) + ' yr</text>';
      [[s, PALETTE[1]], [a, PALETTE[2]]].forEach(([r, c]) => { g += '<path d="' + r.series.map((v, i) => (i ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(sy(v))).join(' ') + '" fill="none" stroke="' + c + '" stroke-width="2.5"/>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Total owed month by month under both plans');
      this.$svg.innerHTML = g;
      this.$leg.innerHTML = '<span><i style="background:' + PALETTE[1] + '"></i>Smallest first</span><span><i style="background:' + PALETTE[2] + '"></i>Highest interest first</span>';
      const tot = this.debts.reduce((x, d) => x + +d.balance, 0), mins = this.debts.reduce((x, d) => x + +d.min, 0), diff = Math.abs(a.interest - s.interest);
      this.$note.innerHTML = (a.stuck || s.stuck) ? '<span class="df-warn">At this payment the debts never clear: the interest is more than you pay.</span> Add a little extra.' : 'Paying ' + this._m(mins + this.extra) + ' a month on ' + this._m(tot) + ' of debt. Highest interest first saves <b>' + this._m(diff) + '</b> in interest' + (a.months !== s.months ? ' and is ' + (a.months < s.months ? 'faster' : 'slower') + ' by ' + Math.abs(a.months - s.months) + ' month' + (Math.abs(a.months - s.months) === 1 ? '' : 's') : '') + '; smallest first clears the first debt sooner (month ' + s.paidAt[s.order[0]] + '), which helps some people keep going. Not financial advice.';
    }
  }

  /* ======================================================================================
   * Sendmoney: compare providers
   * data = { send, from:'NZD', to:'FJD', mid, providers:[{id,label,fee,rate,speed?}] }   (rate = how many `to` per 1 `from`)
   * ====================================================================================== */
  class Sendmoney extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.send = +data.send; this.pr = data.providers.map((p, i) => Object.assign({ i }, p, { fee: +p.fee, rate: +p.rate })); this.sel = null;
      el.innerHTML = '<div class="df-bar"><label class="df-field">Send <input type="number" min="1" step="10" value="' + this.send + '"> ' + esc(data.from) + '</label></div><svg role="group"></svg><p class="df-note" aria-live="polite"></p>';
      this.$in = el.querySelector('input'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.df-note');
      this.$in.addEventListener('input', () => { this.send = Math.max(0, +this.$in.value || 0); this.render(); this._emit('amount', { send: this.send }); });
      this.$svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) { this.sel = this.sel === g.dataset.k ? null : g.dataset.k; this.render(); } });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.sel = this.sel === g.dataset.k ? null : g.dataset.k; this.render(); } });
      this.render();
    }
    _got(p) { return Math.max(0, (this.send - p.fee) * p.rate); }
    render() {
      const T = themeOf(this.el), d = this.data, ideal = this.send * d.mid, list = this.pr.slice().sort((x, y) => this._got(y) - this._got(x)), best = list[0], W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rowH = narrow ? 52 : 40, pl = narrow ? 8 : 130, pr = 96, H = list.length * rowH + 6, sx = v => pl + (v / Math.max(ideal, 1)) * (W - pl - pr), cur = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + d.to;
      let g = '<line x1="' + f1(sx(ideal)) + '" y1="0" x2="' + f1(sx(ideal)) + '" y2="' + H + '" stroke="' + T.fg + '" stroke-dasharray="3 3"/>';
      list.forEach((p, k) => { const y = 3 + k * rowH, top = narrow ? y + 20 : y + 7, got = this._got(p), on = this.sel === p.id, cost = 1 - got / (ideal || 1); g += '<g data-k="' + esc(p.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(p.label + ': ' + cur(got) + ' arrives, ' + pct(cost, 1) + ' lost to fees and rate') + '"' + (this.sel && !on ? ' opacity=".45"' : '') + '><rect x="' + pl + '" y="' + top + '" width="' + f1(Math.max(2, sx(got) - pl)) + '" height="' + (rowH - (narrow ? 26 : 14)) + '" rx="4" fill="' + (p === best ? '#1f8a5b' : T.accent) + '" opacity=".8"/><rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' + (narrow ? '<text x="' + pl + '" y="' + (y + 14) + '" font-size="12.5" font-weight="800" fill="' + T.fg + '">' + esc(p.label) + (p === best ? ' ★' : '') + '</text>' : '<text x="' + (pl - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end" font-size="12.5" font-weight="800" fill="' + T.fg + '">' + esc(fitText(p.label, pl - 26, 12.5)) + (p === best ? ' ★' : '') + '</text>') + '<text x="' + (W - 4) + '" y="' + f1(top + (rowH - (narrow ? 26 : 14)) / 2 + 4) + '" text-anchor="end" font-size="11.5" font-weight="700" fill="' + T.fg + '" font-family="' + esc(T.mono) + '">' + esc(Math.round(got).toLocaleString()) + ' ' + esc(d.to) + '</text></g>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Amount that arrives with each provider; the dashed line is the amount at the mid-market rate with no fee');
      this._keep(this.$svg, g);
      const p = this.sel ? this.pr.find(x => x.id === this.sel) : best, worst = list[list.length - 1], got = this._got(p), feeLoss = p.fee * d.mid, rateLoss = (this.send - p.fee) * (d.mid - p.rate);
      this.$note.innerHTML = (this.sel ? '' : 'Sending ' + this.send.toLocaleString() + ' ' + esc(d.from) + ': most arrives with <b>' + esc(best.label) + '</b> — ') + '<b>' + cur(got) + '</b>' + (this.sel ? ' arrives with ' + esc(p.label) : '') + '. Lost: ' + cur(feeLoss) + ' to the fee and ' + cur(rateLoss) + ' to the exchange rate (' + pct(1 - got / (ideal || 1), 1) + ' in all)' + (p.speed ? '; arrives ' + esc(p.speed) : '') + '.' + (this.sel ? '' : ' ' + esc(worst.label) + ' delivers ' + cur(got - this._got(worst)) + ' less. The dashed line is the full amount at the mid-market rate. Change the amount: fixed fees matter more on small amounts.');
    }
  }

  /* ======================================================================================
   * Cashcalendar: balance through a month
   * data = { prefix?, month:'YYYY-MM', start, events:[{id,label,day,amount}] }  (amount + in, − out)
   * ====================================================================================== */
  class Cashcalendar extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.ev = data.events.map((e, i) => Object.assign({ i, on: true }, e, { amount: +e.amount, day: +e.day })); this.at = null;
      const [y, m] = data.month.split('-').map(Number); this.y = y; this.m = m - 1; this.days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      el.innerHTML = '<div class="df-rows">' + this.ev.slice().sort((a, b) => a.day - b.day).map(e => '<label><span><input type="checkbox" checked data-e="' + e.i + '"> ' + esc(e.label) + ' <small>day ' + e.day + '</small></span><small style="color:' + (e.amount >= 0 ? '#1f8a5b' : '#c2563a') + '">' + (e.amount >= 0 ? '+' : '−') + esc(money(Math.abs(e.amount), this.P)) + '</small><span></span></label>').join('') + '</div><svg role="slider" tabindex="0" aria-valuemin="1"></svg><p class="df-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.df-note');
      el.addEventListener('change', e => { const c = e.target.closest('[data-e]'); if (!c) return; this.ev[+c.dataset.e].on = c.checked; this.render(); this._emit('change', { lowest: this._low }); });
      const at = e => { const r = this.$svg.getBoundingClientRect(), x = (e.clientX - r.left) * (this._W / r.width); this.set(Math.round((x - this._pl) / this._dx) + 1); };
      this.$svg.addEventListener('pointerdown', at); this.$svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') at(e); });
      this.$svg.addEventListener('keydown', e => { const d = { ArrowLeft: -1, ArrowRight: 1, Home: -99, End: 99 }[e.key]; if (d == null) return; e.preventDefault(); this.set((this.at || 1) + d); });
      this.render();
    }
    set(day) { day = clamp(day, 1, this.days); if (day === this.at) return; this.at = day; this.render(); this._emit('day', { day, balance: this._bal[day - 1] }); }
    render() {
      const T = themeOf(this.el), bal = [], on = this.ev.filter(e => e.on); let b = +this.data.start;
      for (let d = 1; d <= this.days; d++) { on.filter(e => e.day === d).forEach(e => { b += e.amount; }); bal.push(b); }
      this._bal = bal; const lo = Math.min(0, ...bal), hi = Math.max(...bal, +this.data.start) * 1.08, low = Math.min(...bal), lowDay = bal.indexOf(low) + 1; this._low = low;
      const W = Math.max(280, this.$svg.clientWidth || 640), H = 240, pl = 58, pr = 10, pt = 12, pb = 24, sx = d => pl + ((d - 1) / (this.days - 1)) * (W - pl - pr), sy = v => pt + (1 - (v - lo) / (hi - lo || 1)) * (H - pt - pb);
      this._W = W; this._pl = pl; this._dx = (W - pl - pr) / (this.days - 1);
      let g = ticks(lo, hi, 4).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + (v === 0 ? '#c2563a' : T.line) + '"' + (v === 0 ? ' stroke-width="1.5"' : '') + '/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(money(v, this.P)) + '</text>').join('');
      g += '<path d="' + bal.map((v, i) => (i ? 'H' + f1(sx(i + 1)) + ' V' + f1(sy(v)) : 'M' + f1(sx(1)) + ' ' + f1(sy(v)))).join(' ') + '" fill="none" stroke="' + T.accent + '" stroke-width="2.5"/>';
      if (low < 0) g += '<rect x="' + pl + '" y="' + f1(sy(0)) + '" width="' + (W - pl - pr) + '" height="' + f1(sy(lo) - sy(0)) + '" fill="#c2563a" opacity=".08"/>';
      on.forEach(e => { g += '<circle cx="' + f1(sx(e.day)) + '" cy="' + f1(sy(bal[e.day - 1])) + '" r="3.5" fill="' + (e.amount >= 0 ? '#1f8a5b' : '#c2563a') + '"/>'; });
      for (let d = 1; d <= this.days; d += 7) g += '<text x="' + f1(sx(d)) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + d + ' ' + MON[this.m] + '</text>';
      g += '<circle cx="' + f1(sx(lowDay)) + '" cy="' + f1(sy(low)) + '" r="6" fill="none" stroke="' + (low < 0 ? '#c2563a' : T.fg) + '" stroke-width="2"/>';
      if (this.at) g += '<line x1="' + f1(sx(this.at)) + '" y1="' + pt + '" x2="' + f1(sx(this.at)) + '" y2="' + (H - pb) + '" stroke="' + T.fg + '"/>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Balance each day of ' + MON[this.m] + '. Use the arrow keys to move day by day.'); this.$svg.setAttribute('aria-valuemax', String(this.days));
      if (this.at) { this.$svg.setAttribute('aria-valuenow', String(this.at)); this.$svg.setAttribute('aria-valuetext', this.at + ' ' + MON[this.m] + ': ' + money(bal[this.at - 1], this.P)); }
      this.$svg.innerHTML = g;
      if (this.at) { const today = on.filter(e => e.day === this.at); this.$note.innerHTML = '<b>' + this.at + ' ' + MON[this.m] + '</b>: balance ' + money(bal[this.at - 1], this.P) + (today.length ? ' after ' + today.map(e => esc(e.label) + ' (' + (e.amount >= 0 ? '+' : '−') + money(Math.abs(e.amount), this.P) + ')').join(', ') : '') + '.'; }
      else this.$note.innerHTML = 'Starts at ' + money(+this.data.start, this.P) + ', ends at <b>' + money(bal[bal.length - 1], this.P) + '</b>. Lowest: <b>' + money(low, this.P) + '</b> on ' + lowDay + ' ' + MON[this.m] + (low < 0 ? ' — <span class="df-warn">the account goes below zero</span>; moving a bill after a payday, or leaving one out, would help.' : '.') + ' Untick a bill to see the difference, or drag along the chart.';
    }
  }

  /* ======================================================================================
   * Pricerise: what rising prices do
   * data = { prefix?, amount, rate (yearly %), years, item? }
   * ====================================================================================== */
  class Pricerise extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.amt = +data.amount; this.rate = +data.rate; this.years = +data.years;
      el.innerHTML = '<label class="df-range"><span>Prices rise by <output data-o="r"></output> a year</span><input type="range" data-r min="0" max="15" step="0.5" value="' + this.rate + '"></label><label class="df-range"><span>Over <output data-o="y"></output></span><input type="range" data-y min="1" max="40" step="1" value="' + this.years + '"></label><div class="df-cards"></div><svg role="img"></svg><p class="df-note" aria-live="polite"></p>';
      this.$cards = el.querySelector('.df-cards'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.df-note');
      el.addEventListener('input', e => { if (e.target.dataset.r != null) this.rate = +e.target.value; else if (e.target.dataset.y != null) this.years = +e.target.value; else return; this.render(); this._emit('change', { rate: this.rate, years: this.years }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), r = this.rate / 100, n = this.years, A = this.amt, need = A * Math.pow(1 + r, n), worth = A / Math.pow(1 + r, n), dbl = r > 0 ? Math.log(2) / Math.log(1 + r) : Infinity;
      this.el.querySelector('[data-o="r"]').textContent = this.rate + '%'; this.el.querySelector('[data-o="y"]').textContent = n + ' year' + (n === 1 ? '' : 's');
      this.$cards.innerHTML = '<div class="df-card"><span>What ' + esc(this._m(A)) + ' buys after ' + n + ' years</span><b>' + esc(this._m(worth)) + '</b><span>in today’s money</span></div><div class="df-card"><span>Needed then to buy what ' + esc(this._m(A)) + ' buys today</span><b>' + esc(this._m(need)) + '</b><span>' + pct(need / A - 1) + ' more</span></div><div class="df-card"><span>Prices double in about</span><b>' + (isFinite(dbl) ? Math.round(dbl) + ' years' : 'never') + '</b><span>at ' + this.rate + '% a year</span></div>';
      const W = Math.max(280, this.$svg.clientWidth || 640), H = 200, pl = 56, pr = 10, pt = 10, pb = 24, hi = need * 1.05, sx = y => pl + (y / n) * (W - pl - pr), sy = v => pt + (1 - v / hi) * (H - pt - pb);
      let g = ticks(0, hi, 4).map(v => '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(this._m(v)) + '</text>').join('');
      const pts = k => Array.from({ length: n + 1 }, (_, y) => f1(sx(y)) + ' ' + f1(sy(k(y)))).join(' L');
      g += '<path d="M' + pts(y => A * Math.pow(1 + r, y)) + '" fill="none" stroke="#c2563a" stroke-width="2.5"/><path d="M' + pts(y => A / Math.pow(1 + r, y)) + '" fill="none" stroke="' + T.accent + '" stroke-width="2.5"/><line x1="' + pl + '" y1="' + f1(sy(A)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(A)) + '" stroke="' + T.fg + '" stroke-dasharray="4 3"/>';
      const every = Math.max(1, Math.ceil(n / 8)); for (let y = 0; y <= n; y += every) g += '<text x="' + f1(sx(y)) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + y + '</text>';
      g += '<text x="' + (W - pr - 4) + '" y="' + f1(sy(need) + 14) + '" text-anchor="end" font-size="11" font-weight="700" fill="#c2563a">needed to keep up</text><text x="' + (W - pr - 4) + '" y="' + f1(sy(worth) - 6) + '" text-anchor="end" font-size="11" font-weight="700" fill="' + T.accent + '">what it buys</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Over ' + n + ' years at ' + this.rate + '%: ' + this._m(A) + ' buys what ' + this._m(worth) + ' buys today; ' + this._m(need) + ' is needed to keep up');
      this.$svg.innerHTML = g;
      this.$note.innerHTML = 'If prices rise ' + this.rate + '% a year, <b>' + this._m(A) + '</b> kept as cash buys only what ' + this._m(worth) + ' buys today after ' + n + ' years' + (this.data.item ? ' — ' + esc(this.data.item.replace('{n}', Math.round(worth / A * 100))) : '') + '. Savings need to earn at least ' + this.rate + '% a year just to stand still. Not financial advice.';
    }
  }

  return { Paysplit, Budgetplan, Debtplan, Sendmoney, Cashcalendar, Pricerise, payoff };
});
