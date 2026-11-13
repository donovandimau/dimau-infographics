/*! Sport 1.0 · Dimau Infographics
 *  Six sport templates for clubs, schools, leagues and match reports.
 *    Scoreworm    the score gap through a match, with every score marked; lead changes and time in front in words.
 *    Pitchmap     where things happened on a rugby or football pitch; filter by team and kind; which part of the pitch.
 *    Splitpace    a race split by split against a target pace; even, faster or slower second half; ahead or behind.
 *    Bracket      a knockout draw from first round to final; scores carry winners forward; pick the unplayed matches.
 *    Teamsheet    a line-up on the pitch (rugby 1–15 or a football formation), with a plain list view.
 *    Medaltable   a medal table ranked gold-first or by total, with the places that change between the two.
 *
 *  new Scoreworm(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<team id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Scoreworm', 'Pitchmap', 'Splitpace', 'Bracket', 'Teamsheet', 'Medaltable'].forEach(function (k) { root[k] = m[k]; }); root.DimauSport = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };
  function niceStep(span, n) { const raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), k = raw / p; return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * p; }
  function ticks(lo, hi, n) { const st = niceStep(hi - lo, n), out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }
  const tm = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const gapL = s => { s = Math.round(Math.abs(s)); const m = Math.floor(s / 60), x = s % 60; return m ? m + ' min' + (x ? ' ' + x + ' s' : '') : x + ' s'; };

  const STYLE = `
.da{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.da) button{font:inherit;color:inherit}
.da :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.da svg{display:block;width:100%;touch-action:pan-y}
.da svg [data-k]{cursor:pointer}
.da svg [data-k]:focus{outline:none}
.da svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.da svg.da-plot{cursor:crosshair}
.da-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.da-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer;min-height:36px}
.da-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.da-btn i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.da-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.da-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.da-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.da-board{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin:0 0 10px}
.da-board div{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800}
.da-board div b{font-size:26px;font-variant-numeric:tabular-nums}
.da-board span{font-size:12.5px;color:var(--di-muted,#4f6578);font-weight:700;text-align:center}
.da-list{display:grid;gap:4px;margin:0;padding:0;list-style:none}
.da-list li{display:grid;grid-template-columns:2.4em 1fr auto;gap:10px;align-items:center;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:6px 10px;font-size:14px}
.da-list li b{font-variant-numeric:tabular-nums}
.da-list li small{color:var(--di-muted,#4f6578)}
.da-warn{color:#c2563a;font-weight:800}
`;
  function injectStyle() {
    if (document.getElementById('da-style')) return;
    const s = document.createElement('style'); s.id = 'da-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('da');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    /** Tap/Enter on any [data-k] inside c calls fn(key). */
    _hot(c, fn) {
      c.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g && c.contains(g)) fn(g.dataset.k, g); });
      c.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k, g); } });
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('da'); }
  }

  /* ======================================================================================
   * Scoreworm: the score gap through a match
   * data = { teams:[{id,label},{id,label}], length?:80, half?:40, unit?:'minute', events:[{t, team, pts, kind?, who?}] }
   * events: minute {t, score:[a,b]}
   * ====================================================================================== */
  class Scoreworm extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.T = data.teams.slice(0, 2); this.len = +data.length || 80; this.half = data.half == null ? this.len / 2 : +data.half;
      this.E = data.events.map((e, i) => Object.assign({ i }, e, { t: +e.t, pts: +e.pts })).sort((a, b) => a.t - b.t || a.i - b.i);
      let a = 0, b = 0; this.E.forEach(e => { if (e.team === this.T[0].id) a += e.pts; else b += e.pts; e.a = a; e.b = b; });
      this.cur = null;
      el.innerHTML = '<div class="da-board"></div><svg class="da-plot" tabindex="0" role="img"></svg><div class="da-legend"></div><p class="da-note" aria-live="polite"></p>';
      this.$board = el.querySelector('.da-board'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.da-legend'); this.$note = el.querySelector('.da-note');
      let drag = false;
      const at = e => { const r = this.$svg.getBoundingClientRect(), k = (this._W || r.width) / r.width, x = (e.clientX - r.left) * k; this._set(Math.round(clamp((x - this._pl) / (this._pw), 0, 1) * this.len)); };
      this.$svg.addEventListener('pointerdown', e => { drag = true; at(e); });
      this.$svg.addEventListener('pointermove', e => { if (drag || e.pointerType === 'mouse') at(e); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => this.$svg.addEventListener(n, () => { drag = false; }));
      this.$svg.addEventListener('keydown', e => {
        const c = this.cur == null ? 0 : this.cur, st = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1, PageUp: -10, PageDown: 10 }[e.key];
        if (st != null) this._set(clamp(c + st * (e.shiftKey ? 5 : 1), 0, this.len)); else if (e.key === 'Home') this._set(0); else if (e.key === 'End') this._set(this.len); else if (e.key === 'Escape') { this.cur = null; this.render(); } else return;
        e.preventDefault();
      });
      this.render();
    }
    score(t) { let a = 0, b = 0, last = null; this.E.forEach(e => { if (e.t <= t) { a = e.a; b = e.b; last = e; } }); return { a, b, last }; }
    _set(t) { if (t === this.cur) return; this.cur = t; this.render(); const s = this.score(t); this._emit('minute', { t, score: [s.a, s.b] }); }
    stats() {
      let changes = 0, prev = 0, big = { d: 0, t: 0 }, ledA = 0, ledB = 0;
      this.E.forEach(e => { const d = e.a - e.b, sgn = Math.sign(d); if (sgn && prev && sgn !== prev) changes++; if (sgn) prev = sgn; if (Math.abs(d) > Math.abs(big.d)) big = { d, t: e.t }; });
      for (let t = 0; t < this.len; t++) { const s = this.score(t + 0.5), d = s.a - s.b; if (d > 0) ledA++; else if (d < 0) ledB++; }
      return { changes, big, ledA, ledB };
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 220 : 260, pl = 34, pr = 10, top = 14, bot = 26;
      const ca = colorFor(this.el, this.T[0], 0), cb = colorFor(this.el, this.T[1], 1);
      const ds = this.E.map(e => e.a - e.b), m = Math.max(7, ...ds.map(Math.abs)), yt = ticks(-m, m, narrow ? 4 : 6), ym = Math.max(m, -yt[0], yt[yt.length - 1]);
      const x = t => pl + t / this.len * (W - pl - pr), y = d => top + (1 - (d + ym) / (2 * ym)) * (H - top - bot);
      this._W = W; this._pl = pl; this._pw = W - pl - pr;
      let s = '<rect x="' + pl + '" y="' + top + '" width="' + (W - pl - pr) + '" height="' + f1(y(0) - top) + '" fill="' + ca + '" opacity=".07"/><rect x="' + pl + '" y="' + f1(y(0)) + '" width="' + (W - pl - pr) + '" height="' + f1(H - bot - y(0)) + '" fill="' + cb + '" opacity=".07"/>';
      yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + (v === 0 ? T.fg : T.line) + '" stroke-width="1"/><text x="' + (pl - 5) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + (v > 0 ? ca : v < 0 ? cb : T.muted) + '">' + Math.abs(v) + '</text>'; });
      s += '<text x="' + (pl + 4) + '" y="' + (top + 12) + '" font-size="11" font-weight="800" fill="' + ca + '">' + esc(this.T[0].label) + ' ahead</text><text x="' + (pl + 4) + '" y="' + (H - bot - 5) + '" font-size="11" font-weight="800" fill="' + cb + '">' + esc(this.T[1].label) + ' ahead</text>';
      if (this.half > 0 && this.half < this.len) s += '<line x1="' + f1(x(this.half)) + '" x2="' + f1(x(this.half)) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="' + T.muted + '" stroke-dasharray="4 4"/><text x="' + f1(x(this.half) + 4) + '" y="' + (top + 12) + '" font-size="10.5" fill="' + T.muted + '">Half time</text>';
      const step = this.len >= 60 ? 10 : 5;
      for (let t = 0; t <= this.len; t += step) s += '<text x="' + f1(x(t)) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + t + '′</text>';
      let d = 'M' + pl + ',' + f1(y(0)), lastD = 0;
      this.E.forEach(e => { const xx = f1(x(e.t)); d += 'H' + xx + 'V' + f1(y(e.a - e.b)); lastD = e.a - e.b; });
      d += 'H' + (W - pr);
      s += '<path d="' + d + '" fill="none" stroke="' + T.fg + '" stroke-width="2.4" stroke-linejoin="round"/>';
      this.E.forEach(e => { const c = e.team === this.T[0].id ? ca : cb; s += '<circle cx="' + f1(x(e.t)) + '" cy="' + f1(y(e.a - e.b)) + '" r="' + (e.pts >= 5 ? 5 : 3.5) + '" fill="' + c + '" stroke="' + T.surface + '" stroke-width="1.5"><title>' + esc(e.t + '′ ' + (e.kind || 'Score') + ', ' + this._lab(e.team) + (e.who ? ' (' + e.who + ')' : '') + ': ' + e.a + '–' + e.b) + '</title></circle>'; });
      const cur = this.cur == null ? this.len : this.cur, sc = this.score(cur);
      if (this.cur != null) s += '<line x1="' + f1(x(cur)) + '" x2="' + f1(x(cur)) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="' + T.fg + '" stroke-width="1.2"/><circle cx="' + f1(x(cur)) + '" cy="' + f1(y(sc.a - sc.b)) + '" r="5" fill="' + T.surface + '" stroke="' + T.fg + '" stroke-width="2"/>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Score gap through the match between ' + this.T[0].label + ' and ' + this.T[1].label + '. Use the arrow keys to step through the minutes.');
      this.$svg.innerHTML = s;
      this.$board.innerHTML = '<div style="border-left:5px solid ' + ca + '">' + esc(this.T[0].label) + '<b>' + sc.a + '</b></div><span>' + (this.cur == null ? 'Full time' : cur + '′') + '</span><div style="border-right:5px solid ' + cb + '"><b>' + sc.b + '</b>' + esc(this.T[1].label) + '</div>';
      const kinds = [...new Set(this.E.map(e => e.kind).filter(Boolean))];
      this.$leg.innerHTML = '<span><i style="background:' + ca + '"></i>' + esc(this.T[0].label) + ' scores</span><span><i style="background:' + cb + '"></i>' + esc(this.T[1].label) + ' scores</span>' + (kinds.length ? '<span>Big dots: 5 points or more</span>' : '');
      if (this.cur != null) {
        const g = sc.a - sc.b;
        this.$note.innerHTML = '<b>' + cur + '′: ' + esc(this.T[0].label) + ' ' + sc.a + '–' + sc.b + ' ' + esc(this.T[1].label) + '</b> (' + (g ? esc(this._lab(g > 0 ? this.T[0].id : this.T[1].id)) + ' leads by ' + Math.abs(g) : 'level') + '). ' + (sc.last ? 'Last score: ' + esc((sc.last.kind || 'score').toLowerCase()) + ', ' + esc(this._lab(sc.last.team)) + (sc.last.who ? ' (' + esc(sc.last.who) + ')' : '') + ', ' + sc.last.t + '′.' : 'No score yet.');
        return;
      }
      const st = this.stats(), g = sc.a - sc.b, win = g > 0 ? this.T[0] : this.T[1], lose = g > 0 ? this.T[1] : this.T[0];
      this.$note.innerHTML = (g ? '<b>' + esc(win.label) + ' won ' + Math.max(sc.a, sc.b) + '–' + Math.min(sc.a, sc.b) + '</b> against ' + esc(lose.label) + '. ' : '<b>A draw, ' + sc.a + '–' + sc.b + '.</b> ') + 'The lead changed ' + plural(st.changes, 'time') + '. Biggest lead: ' + esc(this._lab(st.big.d > 0 ? this.T[0].id : this.T[1].id)) + ' by ' + Math.abs(st.big.d) + ' (' + st.big.t + '′). In front: ' + esc(this.T[0].label) + ' ' + plural(st.ledA, 'minute') + ', ' + esc(this.T[1].label) + ' ' + plural(st.ledB, 'minute') + '. Drag across or use the arrow keys to replay it.';
    }
    _lab(id) { const t = this.T.find(z => z.id === id); return t ? t.label : id; }
  }

  /* ======================================================================================
   * Pitchmap: where things happened on the pitch
   * data = { sport?:'rugby'|'football', teams:[{id,label}], kinds?:[{id,label}], events:[{x (0–100 along, towards the right-hand end), y (0–100 across), team, kind, t?, who?}] }
   * events: select {i, team, kind, x, y}
   * ====================================================================================== */
  const SHAPES = ['circle', 'square', 'diamond', 'triangle'];
  function mark(shape, cx, cy, r, fill, stroke) {
    const a = ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"';
    if (shape === 'square') return '<rect x="' + f1(cx - r) + '" y="' + f1(cy - r) + '" width="' + f1(2 * r) + '" height="' + f1(2 * r) + '" rx="1.5"' + a + '/>';
    if (shape === 'diamond') return '<path d="M' + f1(cx) + ',' + f1(cy - r * 1.3) + 'L' + f1(cx + r * 1.3) + ',' + f1(cy) + 'L' + f1(cx) + ',' + f1(cy + r * 1.3) + 'L' + f1(cx - r * 1.3) + ',' + f1(cy) + 'Z"' + a + '/>';
    if (shape === 'triangle') return '<path d="M' + f1(cx) + ',' + f1(cy - r * 1.3) + 'L' + f1(cx + r * 1.2) + ',' + f1(cy + r) + 'L' + f1(cx - r * 1.2) + ',' + f1(cy + r) + 'Z"' + a + '/>';
    return '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + r + '"' + a + '/>';
  }
  class Pitchmap extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.sport = data.sport || 'rugby'; this.T = data.teams;
      const ks = [...new Set(data.events.map(e => e.kind))]; this.K = (data.kinds || ks.map(k => ({ id: k, label: k }))).map((k, i) => Object.assign({ shape: SHAPES[i % SHAPES.length] }, k));
      this.E = data.events.map((e, i) => Object.assign({ i }, e)); this.offT = new Set(); this.offK = new Set(); this.sel = null;
      el.innerHTML = '<div class="da-bar" role="group" aria-label="Show"></div><svg role="group"></svg><p class="da-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.da-bar'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.da-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; const [k, v] = b.dataset.f.split(':'), set = k === 't' ? this.offT : this.offK; set.has(v) ? set.delete(v) : set.add(v); this.sel = null; this.render(); });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const e = this.E[this.sel]; this._emit('select', { i: e.i, team: e.team, kind: e.kind, x: e.x, y: e.y }); } });
      this.render();
    }
    _lines(X, Y, T) {
      const ln = (a, b, c, d, dash) => '<line x1="' + f1(a) + '" y1="' + f1(b) + '" x2="' + f1(c) + '" y2="' + f1(d) + '" stroke="#ffffff" stroke-opacity=".85" stroke-width="1.6"' + (dash ? ' stroke-dasharray="6 5"' : '') + '/>';
      let s = '';
      if (this.sport === 'football') {
        s += ln(X(50), Y(0), X(50), Y(100)) + '<circle cx="' + f1(X(50)) + '" cy="' + f1(Y(50)) + '" r="' + f1(Math.abs(Y(13.4) - Y(0))) + '" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.6"/>';
        [[0, 15.7], [100, 84.3]].forEach(([e, b]) => { s += '<path d="M' + f1(X(e)) + ',' + f1(Y(20.4)) + 'H' + f1(X(b)) + 'V' + f1(Y(79.6)) + 'H' + f1(X(e)) + '" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.6"/>'; const g = e ? 94.8 : 5.2; s += '<path d="M' + f1(X(e)) + ',' + f1(Y(36.8)) + 'H' + f1(X(g)) + 'V' + f1(Y(63.2)) + 'H' + f1(X(e)) + '" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.6"/>'; });
      } else {
        // rugby: 100 m between try lines plus 5 m in-goal each end, drawn as 0–100 inside the try lines
        [0, 100].forEach(v => { s += ln(X(v), Y(0), X(v), Y(100)); });
        [22, 78].forEach(v => { s += ln(X(v), Y(0), X(v), Y(100)); });
        s += ln(X(50), Y(0), X(50), Y(100)); [40, 60].forEach(v => { s += ln(X(v), Y(0), X(v), Y(100), true); });
        [5, 95].forEach(v => { s += ln(X(5), Y(v === 5 ? 7 : 93), X(95), Y(v === 5 ? 7 : 93), true); });
        s += '<text x="' + f1(X(22) + 3) + '" y="' + f1(Y(100) - 4) + '" font-size="10" fill="#fff" fill-opacity=".9">22</text><text x="' + f1(X(78) - 3) + '" y="' + f1(Y(100) - 4) + '" font-size="10" text-anchor="end" fill="#fff" fill-opacity=".9">22</text>';
      }
      return s;
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rugby = this.sport !== 'football';
      const end = rugby ? 7 : 1.5, pad = 6, iw = W - 2 * pad, ratio = rugby ? 70 / 114 : 68 / 105, ih = Math.round(iw * ratio), H = ih + 2 * pad + 18;
      const X = v => pad + (v + end) / (100 + 2 * end) * iw, Y = v => pad + v / 100 * ih;
      let s = '<rect x="' + pad + '" y="' + pad + '" width="' + iw + '" height="' + ih + '" rx="6" fill="#3f8f5a"/>';
      if (rugby) s += '<rect x="' + pad + '" y="' + pad + '" width="' + f1(X(0) - pad) + '" height="' + ih + '" fill="#2f7a4a"/><rect x="' + f1(X(100)) + '" y="' + pad + '" width="' + f1(pad + iw - X(100)) + '" height="' + ih + '" rx="0" fill="#2f7a4a"/>';
      for (let i = 0; i < 10; i += 2) s += '<rect x="' + f1(X(i * 10)) + '" y="' + pad + '" width="' + f1(X(10) - X(0)) + '" height="' + ih + '" fill="#ffffff" opacity=".04"/>';
      s += this._lines(X, Y, T);
      const shown = this.E.filter(e => !this.offT.has(e.team) && !this.offK.has(e.kind)), r = narrow ? 5 : 6.5;
      shown.forEach(e => { const ti = this.T.findIndex(t => t.id === e.team), k = this.K.find(z => z.id === e.kind) || this.K[0], on = this.sel === e.i; s += '<g data-k="' + e.i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(this._line(e)) + '"' + (this.sel != null && !on ? ' opacity=".45"' : '') + '>' + mark(k.shape, X(e.x), Y(e.y), on ? r + 2.5 : r, colorFor(this.el, this.T[ti] || {}, ti), on ? T.fg : '#ffffff') + '</g>'; });
      if (this.T.length) s += '<text x="' + (pad + 2) + '" y="' + (H - 4) + '" font-size="11" fill="' + T.muted + '">' + esc(this.data.direction || ('Play runs left to right for ' + this.T[0].label + ' →')) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (rugby ? 'Rugby' : 'Football') + ' pitch with ' + plural(shown.length, 'event') + ' marked. Tab to each mark to hear it.');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = this.T.map((t, i) => '<button type="button" class="da-btn" data-f="t:' + esc(t.id) + '" aria-pressed="' + !this.offT.has(t.id) + '"><i style="background:' + colorFor(this.el, t, i) + '"></i>' + esc(t.label) + '</button>').join('') + this.K.map(k => '<button type="button" class="da-btn" data-f="k:' + esc(k.id) + '" aria-pressed="' + !this.offK.has(k.id) + '"><svg viewBox="0 0 16 16" width="14" height="14" style="display:inline-block;width:14px;vertical-align:-2px;margin-right:6px" aria-hidden="true">' + mark(k.shape, 8, 8, 4.5, 'currentColor', 'currentColor') + '</svg>' + esc(k.label) + '</button>').join('');
      if (this.sel != null) { this.$note.innerHTML = '<b>' + esc(this._line(this.E[this.sel])) + '</b>'; return; }
      if (!shown.length) { this.$note.textContent = 'Nothing to show: switch a team or kind back on.'; return; }
      const zone = [0, 0, 0]; shown.forEach(e => { zone[e.x < 100 / 3 ? 0 : e.x < 200 / 3 ? 1 : 2]++; });
      const zn = ['the left third', 'the middle third', 'the right third'], zi = zone.indexOf(Math.max(...zone));
      const per = this.T.filter(t => !this.offT.has(t.id)).map(t => esc(t.label) + ' ' + this.K.filter(k => !this.offK.has(k.id)).map(k => plural(shown.filter(e => e.team === t.id && e.kind === k.id).length, k.label.toLowerCase(), k.plural)).join(', ')).join('; ');
      this.$note.innerHTML = plural(shown.length, 'event') + ' shown: ' + per + '. Most were in <b>' + zn[zi] + '</b> (' + zone[zi] + ' of ' + shown.length + '). Tap a mark for details.';
    }
    _line(e) { const t = this.T.find(z => z.id === e.team), k = this.K.find(z => z.id === e.kind); return (e.t != null ? e.t + '′ ' : '') + (k ? k.label : e.kind) + ', ' + (t ? t.label : e.team) + (e.who ? ' (' + e.who + ')' : '') + ': ' + Math.round(e.x) + '% of the way along, ' + (e.y < 33 ? 'near the top touchline' : e.y > 67 ? 'near the bottom touchline' : 'in the middle') + '.'; }
  }

  /* ======================================================================================
   * Splitpace: a race split by split
   * data = { unit?:'km', distance?, splits:[seconds], target?: seconds per unit, label? }
   * opts = { mode?:'pace'|'gap' }   events: split {i, time, pace, ahead}
   * ====================================================================================== */
  class Splitpace extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { mode: 'pace' });
      this.U = data.unit || 'km'; this.S = data.splits.map(Number); this.mode = this.o.mode; this.sel = null;
      this.total = this.S.reduce((a, b) => a + b, 0); this.tgt = data.target ? +data.target : this.total / this.S.length;
      el.innerHTML = '<div class="da-bar" role="group" aria-label="Show"></div><svg role="group"></svg><div class="da-legend"></div><p class="da-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.da-bar'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.da-legend'); this.$note = el.querySelector('.da-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { this.mode = b.dataset.mode; this.render(); } });
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) { const i = this.sel; this._emit('split', { i, time: this.S[i], pace: tm(this.S[i]), ahead: Math.round(this._ahead(i)) }); } });
      this.render();
    }
    _cum(i) { let c = 0; for (let k = 0; k <= i; k++) c += this.S[k]; return c; }
    _ahead(i) { return this.tgt * (i + 1) - this._cum(i); }
    _halves() { const n = this.S.length, h = n / 2, k = Math.floor(h), first = this._cum(k - 1) + (h - k) * (this.S[k] || 0); return [first, this.total - first]; }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, n = this.S.length, H = narrow ? 220 : 250, pl = 46, pr = 10, top = 14, bot = 26, pw = (W - pl - pr) / n;
      const fast = '#1fa38a', slow = '#e0862b';
      let s = '';
      if (this.mode === 'gap') {
        const g = this.S.map((_, i) => this._ahead(i)), m = Math.max(10, ...g.map(Math.abs)), yt = ticks(-m, m, 4), ym = Math.max(m, -yt[0], yt[yt.length - 1]), y = v => top + (1 - (v + ym) / (2 * ym)) * (H - top - bot), x = i => pl + (i + 1) * pw;
        yt.forEach(v => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + (v === 0 ? T.fg : T.line) + '"/><text x="' + (pl - 5) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + (v > 0 ? '+' : v < 0 ? '−' : '') + tm(Math.abs(v)) + '</text>'; });
        s += '<text x="' + (pl + 4) + '" y="' + (top + 11) + '" font-size="11" font-weight="800" fill="' + fast + '">Ahead of target</text><text x="' + (pl + 4) + '" y="' + (H - bot - 5) + '" font-size="11" font-weight="800" fill="' + slow + '">Behind</text>';
        s += '<path d="M' + pl + ',' + f1(y(0)) + g.map((v, i) => 'L' + f1(x(i)) + ',' + f1(y(v))).join('') + '" fill="none" stroke="' + T.accent + '" stroke-width="2.4"/>';
        g.forEach((v, i) => { const on = this.sel === i; s += '<g data-k="' + i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(this._line(i)) + '"><circle cx="' + f1(x(i)) + '" cy="' + f1(y(v)) + '" r="' + (on ? 7 : 5) + '" fill="' + (v >= 0 ? fast : slow) + '" stroke="' + T.surface + '" stroke-width="2"/><rect x="' + f1(x(i) - pw / 2) + '" y="' + top + '" width="' + f1(pw) + '" height="' + (H - top - bot) + '" fill="transparent"/></g>'; });
      } else {
        const lo = Math.min(...this.S, this.tgt), hi = Math.max(...this.S, this.tgt), span = hi - lo || 30, y0 = Math.max(0, lo - span * 0.6), yt = ticks(y0, hi + span * 0.15, 4), y = v => H - bot - (v - y0) / (yt[yt.length - 1] - y0) * (H - top - bot);
        yt.forEach(v => { if (v < y0) return; s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '" stroke="' + T.line + '"/><text x="' + (pl - 5) + '" y="' + f1(y(v) + 4) + '" font-size="10.5" text-anchor="end" fill="' + T.muted + '">' + tm(v) + '</text>'; });
        this.S.forEach((v, i) => { const on = this.sel === i, c = v <= this.tgt ? fast : slow, bx = pl + i * pw + pw * 0.14, bw = pw * 0.72; s += '<g data-k="' + i + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(this._line(i)) + '"' + (this.sel != null && !on ? ' opacity=".5"' : '') + '><rect x="' + f1(bx) + '" y="' + f1(y(v)) + '" width="' + f1(bw) + '" height="' + f1(H - bot - y(v)) + '" rx="3" fill="' + c + '"/></g>'; });
        s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f1(y(this.tgt)) + '" y2="' + f1(y(this.tgt)) + '" stroke="' + T.fg + '" stroke-width="1.6" stroke-dasharray="6 4"/><text x="' + (W - pr - 2) + '" y="' + f1(y(this.tgt) - 5) + '" font-size="10.5" font-weight="700" text-anchor="end" fill="' + T.fg + '" paint-order="stroke" stroke="' + T.surface + '" stroke-width="3">' + (this.data.target ? 'Target ' : 'Even pace ') + tm(this.tgt) + '/' + esc(this.U) + '</text>';
      }
      const every = n > 24 ? 5 : n > 12 ? 2 : 1;
      this.S.forEach((_, i) => { if ((i + 1) % every === 0 || i === 0) s += '<text x="' + f1(pl + (i + (this.mode === 'gap' ? 1 : 0.5)) * pw) + '" y="' + (H - 8) + '" font-size="10.5" text-anchor="middle" fill="' + T.muted + '">' + (i + 1) + '</text>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (this.mode === 'gap' ? 'Time ahead of or behind ' : 'Time for each ' + this.U + ' against ') + (this.data.target ? 'the target' : 'an even pace') + '. Tab to each ' + this.U + '.');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = [['pace', 'Each ' + this.U], ['gap', 'Ahead or behind']].map(([k, l]) => '<button type="button" class="da-btn" data-mode="' + k + '" aria-pressed="' + (this.mode === k) + '">' + esc(l) + '</button>').join('');
      this.$leg.innerHTML = '<span><i style="background:' + fast + '"></i>On or faster than ' + (this.data.target ? 'target' : 'even pace') + '</span><span><i style="background:' + slow + '"></i>Slower</span>';
      if (this.sel != null) { this.$note.innerHTML = '<b>' + esc(this._line(this.sel)) + '</b>'; return; }
      const [h1, h2] = this._halves(), diff = h2 - h1, fastI = this.S.indexOf(Math.min(...this.S)), slowI = this.S.indexOf(Math.max(...this.S)), endGap = this._ahead(n - 1);
      this.$note.innerHTML = (this.data.label ? esc(this.data.label) + ': ' : '') + '<b>' + tm(this.total) + '</b> for ' + n + ' ' + esc(this.U) + ' (' + tm(this.total / n) + '/' + esc(this.U) + '). First half ' + tm(h1) + ', second half ' + tm(h2) + ' — ' + (Math.abs(diff) < 5 ? 'an even split.' : diff < 0 ? 'a negative split: the second half was ' + gapL(diff) + ' faster.' : 'the second half was ' + gapL(diff) + ' slower.') + ' Fastest: ' + esc(this.U) + ' ' + (fastI + 1) + ' (' + tm(this.S[fastI]) + '); slowest: ' + esc(this.U) + ' ' + (slowI + 1) + ' (' + tm(this.S[slowI]) + ').' + (this.data.target ? ' Finished ' + gapL(endGap) + (endGap >= 0 ? ' inside' : ' outside') + ' the target time of ' + tm(this.tgt * n) + '.' : '');
    }
    _line(i) { const a = this._ahead(i); return this.U + ' ' + (i + 1) + ': ' + tm(this.S[i]) + ', ' + tm(this._cum(i)) + ' so far, ' + (Math.abs(a) < 1 ? 'on ' + (this.data.target ? 'target' : 'even pace') : gapL(a) + (a > 0 ? ' ahead of ' : ' behind ') + (this.data.target ? 'target' : 'even pace')) + '.'; }
  }

  /* ======================================================================================
   * Bracket: a knockout draw
   * data = { rounds:[{name, matches:[{a?, b?, sa?, sb?}]}] } — the first round names both sides; later rounds fill in from the winners.
   * opts = { pick?: true }   events: pick {round, match, winner}, select {team}
   * ====================================================================================== */
  class Bracket extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { pick: true });
      this.R = data.rounds; this.picks = {}; this.hl = null;
      el.innerHTML = '<svg role="group"></svg><p class="da-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.da-note');
      this._hot(this.$svg, k => {
        const [r, m, side] = k.split('-').map(Number), M = this.solve()[r][m], team = side ? M.b : M.a;
        if (!team) return;
        if (M.played || !this.o.pick || !M.a || !M.b) { this.hl = this.hl === team ? null : team; this.render(); this._emit('select', { team: this.hl }); return; }
        this.picks[r + '-' + m] = team; this.render(); this._emit('pick', { round: this.R[r].name, match: m, winner: team });
      });
      this.render();
    }
    solve() {
      const out = [];
      this.R.forEach((rd, r) => {
        out.push(rd.matches.map((mt, m) => {
          const prev = r ? out[r - 1] : null, a = mt.a || (prev && prev[2 * m] ? prev[2 * m].win : null), b = mt.b || (prev && prev[2 * m + 1] ? prev[2 * m + 1].win : null);
          const played = mt.sa != null && mt.sb != null; let win = null, picked = false;
          if (played && a && b) win = +mt.sa > +mt.sb ? a : +mt.sb > +mt.sa ? b : (mt.winner || null);
          else if (a && b && (this.picks[r + '-' + m] === a || this.picks[r + '-' + m] === b)) { win = this.picks[r + '-' + m]; picked = true; }
          return { a, b, sa: mt.sa, sb: mt.sb, played, win, picked };
        }));
      });
      return out;
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), S = this.solve(), nr = this.R.length, stacked = W < 560;
      const bh = 50, gap = 12, n0 = this.R[0].matches.length;
      let s = '', H;
      const box = (r, m, x, y, w) => {
        const M = S[r][m]; let g = '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + bh + '" rx="8" fill="' + T.surface + '" stroke="' + T.line + '"/><line x1="' + f1(x) + '" x2="' + f1(x + w) + '" y1="' + f1(y + bh / 2) + '" y2="' + f1(y + bh / 2) + '" stroke="' + T.line + '"/>';
        [[M.a, M.sa, 0], [M.b, M.sb, 1]].forEach(([t, sc, side]) => {
          const yy = y + side * bh / 2, isW = M.win && M.win === t, isL = M.win && t && M.win !== t, hl = this.hl && t === this.hl, can = t && !M.played && M.a && M.b && this.o.pick;
          g += '<g data-k="' + r + '-' + m + '-' + side + '"' + (t ? ' tabindex="0" role="button" aria-label="' + esc(t + (M.played ? ', ' + sc + (isW ? ', won' : ', lost') : isW ? ', your pick to win' : can ? ': tap to pick as the winner' : '')) + '"' : '') + '><rect x="' + f1(x + 1) + '" y="' + f1(yy + 1) + '" width="' + f1(w - 2) + '" height="' + (bh / 2 - 2) + '" rx="7" fill="' + (hl ? T.accent : isW ? T.bg : 'transparent') + '" opacity="' + (hl ? 0.22 : 1) + '"/>' +
            '<text x="' + f1(x + 10) + '" y="' + f1(yy + bh / 4 + 4.5) + '" font-size="12.5" font-weight="' + (isW ? 800 : 600) + '" fill="' + (t ? (isL ? T.muted : T.fg) : T.muted) + '">' + esc(t ? fitText(t, w - 46, 12.5) : 'To be decided') + '</text>' +
            (M.played ? '<text x="' + f1(x + w - 10) + '" y="' + f1(yy + bh / 4 + 4.5) + '" font-size="12.5" font-weight="800" text-anchor="end" fill="' + (isL ? T.muted : T.fg) + '">' + esc(sc) + '</text>' : isW && M.picked ? '<text x="' + f1(x + w - 10) + '" y="' + f1(yy + bh / 4 + 4.5) + '" font-size="11" font-weight="800" text-anchor="end" fill="' + T.accent + '">pick ✓</text>' : '') + '</g>';
        });
        return g;
      };
      if (stacked) {
        let y = 4; const w = W - 8;
        this.R.forEach((rd, r) => { s += '<text x="4" y="' + (y + 13) + '" font-size="12" font-weight="800" fill="' + T.muted + '">' + esc(rd.name) + '</text>'; y += 22; rd.matches.forEach((_, m) => { s += box(r, m, 4, y, w); y += bh + 8; }); y += 8; });
        H = y;
      } else {
        const cw = (W - 8) / nr, w = Math.min(220, cw - 28), slot = bh + gap; H = n0 * slot + 26;
        const cy = (r, m) => { const span = Math.pow(2, r); return 26 + (m * span + span / 2) * slot - gap / 2; };
        this.R.forEach((rd, r) => {
          const x = 4 + r * cw; s += '<text x="' + f1(x) + '" y="14" font-size="12" font-weight="800" fill="' + T.muted + '">' + esc(rd.name) + '</text>';
          rd.matches.forEach((_, m) => {
            const yc = cy(r, m);
            if (r) { const xa = 4 + (r - 1) * cw + w, y1 = cy(r - 1, 2 * m), y2 = cy(r - 1, 2 * m + 1), mid = xa + (x - xa) / 2; s += '<path d="M' + f1(xa) + ',' + f1(y1) + 'H' + f1(mid) + 'V' + f1(y2) + 'H' + f1(xa) + 'M' + f1(mid) + ',' + f1(yc) + 'H' + f1(x) + '" fill="none" stroke="' + T.line + '" stroke-width="1.5"/>'; }
            s += box(r, m, x, yc - bh / 2, w);
          });
        });
      }
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Knockout draw, ' + this.R.map(r => r.name).join(', then ') + '.');
      this._keep(this.$svg, s);
      if (this.hl) {
        const path = []; S.forEach((rd, r) => rd.forEach(M => { if (M.a !== this.hl && M.b !== this.hl) return; const opp = M.a === this.hl ? M.b : M.a, us = M.a === this.hl ? M.sa : M.sb, them = M.a === this.hl ? M.sb : M.sa; if (!opp) return; path.push(M.played ? (M.win === this.hl ? 'beat ' : 'lost to ') + esc(opp) + ' ' + us + '–' + them + ' in the ' + esc(this.R[r].name) : M.win === this.hl ? 'picked to beat ' + esc(opp) + ' in the ' + esc(this.R[r].name) : 'plays ' + esc(opp) + ' in the ' + esc(this.R[r].name)); }));
        this.$note.innerHTML = '<b>' + esc(this.hl) + '</b>: ' + (path.join(', ') || 'no matches yet') + '.'; return;
      }
      const F = S[nr - 1][0];
      if (F.win) { const path = []; S.forEach((rd, r) => rd.forEach(M => { if (M.win !== F.win) return; const opp = M.a === F.win ? M.b : M.a; path.push((M.played ? 'beat ' + esc(opp) + ' ' + (M.a === F.win ? M.sa + '–' + M.sb : M.sb + '–' + M.sa) : 'picked over ' + esc(opp))); })); this.$note.innerHTML = (F.picked ? 'Your pick for champion' : 'Champion') + ': <b>' + esc(F.win) + '</b> — ' + path.join(', then ') + '. Tap a team to follow its path.'; return; }
      const open = []; S.forEach((rd, r) => rd.forEach(M => { if (M.a && M.b && !M.win) open.push(esc(M.a) + ' v ' + esc(M.b) + ' (' + esc(this.R[r].name) + ')'); }));
      this.$note.innerHTML = (open.length ? 'Still to play: ' + open.join('; ') + '.' + (this.o.pick ? ' Tap a team to pick the winner.' : '') : 'Waiting for earlier results.') + ' Tap a team that has played to follow its path.';
    }
  }

  /* ======================================================================================
   * Teamsheet: a line-up on the pitch
   * data = { sport?:'rugby'|'football', formation?:'4-3-3', team?, players:[{n, name, role?, note?}], bench?:[{n,name,role?}] }
   * opts = { view?:'pitch'|'list' }   events: select {n, name, role}
   * Rugby: players are placed by shirt number 1–15. Football: the first player is the goalkeeper, then each line of the formation from the back, left to right.
   * ====================================================================================== */
  const RUGBY = { 1: [32, 18, 'Loosehead prop'], 2: [50, 18, 'Hooker'], 3: [68, 18, 'Tighthead prop'], 4: [38, 29, 'Lock'], 5: [62, 29, 'Lock'], 6: [15, 33, 'Blindside flanker'], 7: [85, 33, 'Openside flanker'], 8: [50, 40, 'Number eight'], 9: [62, 49, 'Scrum-half'], 10: [44, 57, 'Fly-half'], 12: [31, 65, 'Inside centre'], 13: [18, 73, 'Outside centre'], 11: [8, 83, 'Left wing'], 14: [92, 83, 'Right wing'], 15: [50, 90, 'Full-back'] };
  class Teamsheet extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { view: 'pitch' });
      this.sport = data.sport || 'rugby'; this.view = this.o.view; this.sel = null; this.P = this._place();
      el.innerHTML = '<div class="da-bar" role="group" aria-label="Show as"></div><div class="da-body"></div><p class="da-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.da-bar'); this.$body = el.querySelector('.da-body'); this.$note = el.querySelector('.da-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) { this.view = b.dataset.view; this.render(); } });
      this._hot(this.$body, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel != null) { const p = this.P.find(z => String(z.n) === this.sel); this._emit('select', { n: p.n, name: p.name, role: p.role }); } });
      this.render();
    }
    _place() {
      const ps = this.data.players.map(p => Object.assign({}, p));
      if (this.sport !== 'football') return ps.map(p => { const r = RUGBY[p.n] || [50, 50, '']; return Object.assign(p, { x: r[0], y: r[1], role: p.role || r[2] }); });
      const lines = String(this.data.formation || '4-4-2').split('-').map(Number), names = lines.length === 3 ? ['Defender', 'Midfielder', 'Forward'] : ['Defender', 'Defensive midfielder', 'Attacking midfielder', 'Forward'];
      ps[0] && Object.assign(ps[0], { x: 50, y: 90, role: ps[0].role || 'Goalkeeper' });
      let i = 1; lines.forEach((cnt, li) => { const y = 74 - li * (54 / Math.max(1, lines.length - 1)); for (let k = 0; k < cnt && i < ps.length; k++, i++) Object.assign(ps[i], { x: (k + 1) / (cnt + 1) * 100, y, role: ps[i].role || names[li] || 'Player' }); });
      return ps;
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.el.clientWidth || 640), narrow = W < 520;
      this.$bar.innerHTML = [['pitch', 'On the pitch'], ['list', 'As a list']].map(([k, l]) => '<button type="button" class="da-btn" data-view="' + k + '" aria-pressed="' + (this.view === k) + '">' + l + '</button>').join('');
      const bench = (this.data.bench || []);
      if (this.view === 'list') {
        this._keep(this.$body, '<ul class="da-list">' + this.P.concat(bench.map(b => Object.assign({ bench: true }, b))).map(p => '<li data-k="' + esc(p.n) + '" tabindex="0" role="button" aria-pressed="' + (this.sel === String(p.n)) + '"><b>' + esc(p.n) + '</b><span>' + esc(p.name) + '</span><small>' + esc(p.bench ? 'Bench' + (p.role ? ' · ' + p.role : '') : p.role) + '</small></li>').join('') + '</ul>');
      } else {
        const fw = Math.min(W, 560), ratio = 1.25, H = Math.round(fw * ratio), x0 = (W - fw) / 2, X = v => x0 + 8 + v / 100 * (fw - 16), Y = v => 8 + v / 100 * (H - 16), r = narrow ? 14 : 17;
        let s = '<rect x="' + f1(x0) + '" y="0" width="' + fw + '" height="' + H + '" rx="10" fill="#3f8f5a"/>';
        const ln = (a, b, c, d, dash) => '<line x1="' + f1(a) + '" y1="' + f1(b) + '" x2="' + f1(c) + '" y2="' + f1(d) + '" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"' + (dash ? ' stroke-dasharray="6 5"' : '') + '/>';
        if (this.sport === 'football') { s += ln(X(0), Y(0), X(100), Y(0)) + '<circle cx="' + f1(X(50)) + '" cy="' + f1(Y(0)) + '" r="' + f1(fw * 0.13) + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/><path d="M' + f1(X(20)) + ',' + f1(Y(100)) + 'V' + f1(Y(82)) + 'H' + f1(X(80)) + 'V' + f1(Y(100)) + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/>'; }
        else { s += ln(X(0), Y(2), X(100), Y(2)) + ln(X(0), Y(9), X(100), Y(9), true) + ln(X(0), Y(98), X(100), Y(98)); }
        this.P.forEach(p => { const on = this.sel === String(p.n), cx = X(p.x), cy = Y(p.y), nm = fitText(p.name, narrow ? 58 : 92, narrow ? 10 : 11); s += '<g data-k="' + esc(p.n) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(p.n + ', ' + p.name + ', ' + p.role) + '"><circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + (on ? r + 3 : r) + '" fill="' + (on ? T.fg : T.surface) + '" stroke="' + T.accent + '" stroke-width="3"/><text x="' + f1(cx) + '" y="' + f1(cy + 4.5) + '" font-size="' + (narrow ? 12 : 13.5) + '" font-weight="800" text-anchor="middle" fill="' + (on ? T.surface : T.fg) + '" pointer-events="none">' + esc(p.n) + '</text><text x="' + f1(cx) + '" y="' + f1(cy + r + 12) + '" font-size="' + (narrow ? 10 : 11) + '" font-weight="700" text-anchor="middle" fill="#fff" paint-order="stroke" stroke="#2b6b43" stroke-width="3" pointer-events="none">' + esc(nm) + '</text></g>'; });
        this.$body.innerHTML = '<svg role="group" viewBox="0 0 ' + W + ' ' + H + '" style="height:' + H + 'px" aria-label="' + esc((this.data.team ? this.data.team + ' line-up' : 'Line-up') + (this.sport === 'football' ? ', ' + (this.data.formation || '4-4-2') : '') + '. Tab to each player.') + '"></svg>';
        this._keep(this.$body.querySelector('svg'), s);
      }
      if (this.sel != null) { const p = this.P.find(z => String(z.n) === this.sel) || bench.find(z => String(z.n) === this.sel); this.$note.innerHTML = p ? '<b>' + esc(p.n) + ' · ' + esc(p.name) + '</b>, ' + esc(p.role || 'bench') + '.' + (p.note ? ' ' + esc(p.note) : '') : ''; return; }
      this.$note.innerHTML = (this.data.team ? '<b>' + esc(this.data.team) + '</b>: ' : '') + plural(this.P.length, 'starter') + (this.sport === 'football' ? ' in a ' + esc(this.data.formation || '4-4-2') : '') + (bench.length ? ' and ' + bench.length + ' on the bench' : '') + '. Tap a player for their position' + (this.P.some(p => p.note) ? ' and notes' : '') + '.';
    }
  }

  /* ======================================================================================
   * Medaltable: gold-first or total
   * data = { event?, rows:[{id,label,gold,silver,bronze}] }
   * opts = { by?:'gold'|'total' }   events: sort {by}, select {id, rank}
   * ====================================================================================== */
  const MEDAL = [['gold', 'Gold', '#d4a72c'], ['silver', 'Silver', '#a3adb8'], ['bronze', 'Bronze', '#b0703a']];
  class Medaltable extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { by: 'gold' });
      this.Rw = data.rows.map(r => Object.assign({}, r, { gold: +r.gold || 0, silver: +r.silver || 0, bronze: +r.bronze || 0 })); this.Rw.forEach(r => { r.total = r.gold + r.silver + r.bronze; });
      this.by = this.o.by; this.sel = null;
      el.innerHTML = '<div class="da-bar" role="group" aria-label="Rank by"></div><svg role="group"></svg><div class="da-legend"></div><p class="da-note" aria-live="polite"></p>';
      this.$bar = el.querySelector('.da-bar'); this.$svg = el.querySelector('svg'); this.$leg = el.querySelector('.da-legend'); this.$note = el.querySelector('.da-note');
      this.$bar.addEventListener('click', e => { const b = e.target.closest('[data-by]'); if (b) { this.by = b.dataset.by; this.render(); this._emit('sort', { by: this.by }); } });
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { id: this.sel, rank: this.rank(this.by).get(this.sel) }); });
      this.render();
    }
    order(by) { const key = r => by === 'total' ? [r.total, r.gold, r.silver] : [r.gold, r.silver, r.bronze]; return this.Rw.slice().sort((a, b) => { const A = key(a), B = key(b); for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return B[i] - A[i]; return String(a.label).localeCompare(b.label); }); }
    rank(by) {
      const o = this.order(by), m = new Map(), key = r => by === 'total' ? r.total : r.gold * 1e6 + r.silver * 1e3 + r.bronze;
      o.forEach((r, i) => { m.set(r.id, i && key(r) === key(o[i - 1]) ? m.get(o[i - 1].id) : i + 1); }); return m;
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, rows = this.order(this.by), rk = this.rank(this.by), other = this.rank(this.by === 'gold' ? 'total' : 'gold');
      const rh = 30, H = rows.length * rh + 4, lw = narrow ? 104 : 170, nw = 30, cw = narrow ? 30 : 40, x0 = nw + lw, bw = W - x0 - cw - 6, mx = Math.max(...rows.map(r => r.total), 1);
      let s = '';
      rows.forEach((r, i) => {
        const y = 2 + i * rh, on = this.sel === r.id, mv = other.get(r.id) - rk.get(r.id);
        s += '<g data-k="' + esc(r.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(this._line(r, rk, other)) + '"><rect x="0" y="' + y + '" width="' + W + '" height="' + (rh - 2) + '" rx="7" fill="' + (on ? T.accent : i % 2 ? 'transparent' : T.bg) + '" opacity="' + (on ? 0.18 : 1) + '"/>' +
          '<text x="' + (nw - 8) + '" y="' + (y + 19) + '" font-size="12.5" font-weight="800" text-anchor="end" fill="' + T.fg + '">' + rk.get(r.id) + '</text><text x="' + nw + '" y="' + (y + 19) + '" font-size="13" font-weight="700" fill="' + T.fg + '">' + esc(fitText(r.label, lw - 30, 13)) + '</text>' +
          (mv ? '<text x="' + (x0 - 6) + '" y="' + (y + 19) + '" font-size="10.5" font-weight="800" text-anchor="end" fill="' + (mv > 0 ? '#1f8a5b' : '#c2563a') + '">' + (mv > 0 ? '▲' : '▼') + Math.abs(mv) + '</text>' : '');
        let x = x0; MEDAL.forEach(([k, , c]) => { const w = r[k] / mx * bw; if (w > 0) s += '<rect x="' + f1(x) + '" y="' + (y + 6) + '" width="' + f1(Math.max(1, w - 1)) + '" height="' + (rh - 14) + '" rx="3" fill="' + c + '"/>' + (w > 22 ? '<text x="' + f1(x + w / 2) + '" y="' + (y + 18.5) + '" font-size="11" font-weight="800" text-anchor="middle" fill="#13263a">' + r[k] + '</text>' : ''); x += w; });
        s += '<text x="' + (W - 4) + '" y="' + (y + 19) + '" font-size="12.5" font-weight="800" text-anchor="end" fill="' + T.fg + '">' + r.total + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', (this.data.event ? this.data.event + ' medal table' : 'Medal table') + ', ranked ' + (this.by === 'gold' ? 'by gold first' : 'by total medals') + '. Tab to each row.');
      this._keep(this.$svg, s);
      this.$bar.innerHTML = [['gold', 'Gold first'], ['total', 'Total medals']].map(([k, l]) => '<button type="button" class="da-btn" data-by="' + k + '" aria-pressed="' + (this.by === k) + '">' + l + '</button>').join('');
      this.$leg.innerHTML = MEDAL.map(([, l, c]) => '<span><i style="background:' + c + '"></i>' + l + '</span>').join('') + '<span>▲▼ places gained or lost against the other order</span>';
      if (this.sel) { const r = this.Rw.find(z => z.id === this.sel); this.$note.innerHTML = '<b>' + esc(this._line(r, rk, other)) + '</b>'; return; }
      const g = this.order('gold')[0], t = this.order('total')[0], moved = this.Rw.filter(r => this.rank('gold').get(r.id) !== this.rank('total').get(r.id)).length;
      this.$note.innerHTML = 'Gold first: <b>' + esc(g.label) + '</b> top with ' + plural(g.gold, 'gold medal') + '. By total medals: <b>' + esc(t.label) + '</b> top with ' + t.total + '. ' + (moved ? plural(moved, 'team') + ' change place between the two orders.' : 'Both orders give the same table.') + ' Tap a row for its medals.';
    }
    _line(r, rk, other) { return r.label + ': ' + ord(rk.get(r.id)) + (this.by === 'gold' ? ' by gold first, ' : ' by total, ') + ord(other.get(r.id)) + (this.by === 'gold' ? ' by total' : ' by gold first') + '. ' + r.gold + ' gold, ' + r.silver + ' silver, ' + r.bronze + ' bronze (' + r.total + ' in all).'; }
  }

  return { Scoreworm, Pitchmap, Splitpace, Bracket, Teamsheet, Medaltable };
});
