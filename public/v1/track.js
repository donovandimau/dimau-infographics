/*! Track 1.0 · Dimau Infographics
 *  Six formats for keeping an eye on things and planning time:
 *    Dial         a gauge with coloured zones: where a reading sits (low, fine, high) and how it has moved.
 *    Statusboard  day-by-day status for several services: working, slow or down, with uptime and notes.
 *    Sparkgrid    small trend lines side by side, each with its latest value and change; sort by rise or fall.
 *    Treeline     a tree to expand and collapse (an outline), with counts and search; arrow keys move through it.
 *    Monthview    a month calendar of events; tap a day to see what is on, move between months.
 *    Slotgrid     a booking grid of days and times: free, booked or closed; pick a free slot.
 *
 *  new Dial(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Dial', 'Statusboard', 'Sparkgrid', 'Treeline', 'Monthview', 'Slotgrid'].forEach(function (k) { root[k] = m[k]; }); root.DimauTrack = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const TONE = { low: '#d9822b', ok: '#1fa38a', high: '#c2563a', good: '#1fa38a', warn: '#d9a42b', bad: '#c2563a', info: '#2f7fd1' };
  const STATUS = { ok: { c: '#1fa38a', w: 'Working' }, slow: { c: '#d9a42b', w: 'Slow' }, down: { c: '#c2563a', w: 'Down' }, none: { c: null, w: 'No data' } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : (Math.abs(n) < 10 ? 1 : 0) }) + (o.suffix || '') : '–'; };
  const DAY = 86400000, MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const nice = t => { const d = new Date(t); return WD[(d.getUTCDay() + 6) % 7] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()].slice(0, 3) + ' ' + d.getUTCFullYear(); };
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };

  const STYLE = `
.dt{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dt) button{font:inherit;color:inherit}
.dt :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dt svg{display:block;width:100%}
.dt svg [data-k]:focus{outline:none}
.dt svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dt-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dt-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.dt-btn[aria-pressed="true"],.dt-btn.primary{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dt-btn:disabled{opacity:.4;cursor:default}
.dt-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dt-small{font-size:12.5px;color:var(--di-muted,#4f6578)}
.dt-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.dt-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.sg-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
.sg-card{display:grid;gap:2px;text-align:left;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:12px;cursor:pointer}
.sg-card[aria-pressed="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 1px var(--di-accent,#0b6fa4) inset}
.sg-card b{font-size:14px}
.sg-v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}
.sg-ch{font:700 12px/1.3 var(--di-mono,ui-monospace,monospace)}
.sg-card svg{height:44px;margin-top:6px}
.tl-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.tl-tools input{flex:1;min-width:160px;height:36px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 12px;font:inherit;font-size:14px;color:inherit}
.tl-tree,.tl-tree ul{list-style:none;margin:0;padding:0}
.tl-tree ul{margin-left:14px;padding-left:12px;border-left:1.5px solid var(--di-line,#c9dce8)}
.tl-row{display:flex;align-items:baseline;gap:8px;padding:5px 8px;border-radius:8px;cursor:pointer;line-height:1.4}
.tl-row:hover{background:var(--di-bg,#eef7fb)}
.tl-row:focus{outline:none}
.tl-row:focus-visible{outline:2px solid var(--di-accent,#0b6fa4)}
.tl-row[aria-selected="true"]{background:var(--di-bg,#eef7fb);box-shadow:inset 3px 0 0 var(--di-accent,#0b6fa4)}
.tl-tw{flex:none;width:16px;text-align:center;font-size:11px;color:var(--di-muted,#4f6578)}
.tl-lab{font-weight:700;font-size:14.5px}
.tl-leaf .tl-lab{font-weight:600}
.tl-n{font:600 11.5px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
.tl-sub{font-size:12.5px;color:var(--di-muted,#4f6578)}
.tl-hit{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 22%,transparent);border-radius:3px}
.mv-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.mv-head h4{margin:0;font-size:18px}
.mv-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:auto;grid-auto-rows:84px;gap:4px}
.mv-grid .mv-wd{height:auto}
.mv-wd{font:700 11px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);text-align:center;padding:4px 0}
.mv-day{height:100%;margin:0;box-sizing:border-box;justify-content:flex-start;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:8px;padding:4px 5px;text-align:left;display:flex;flex-direction:column;gap:2px;cursor:pointer;overflow:hidden}
.mv-day.out{opacity:.35;cursor:default}
.mv-day.today{border-color:var(--di-fg,#13263a)}
.mv-day[aria-pressed="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.mv-num{font:700 12px/1 var(--di-mono,ui-monospace,monospace)}
.mv-ev{font-size:11px;line-height:1.25;padding:1px 4px;border-radius:4px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mv-dots{display:flex;gap:3px;flex-wrap:wrap}
.mv-dots i{width:7px;height:7px;border-radius:50%}
.mv-grid.mv-narrow{grid-auto-rows:48px}
.mv-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}
.mv-list li{border-left:4px solid var(--di-accent,#0b6fa4);background:var(--di-surface,#fff);border-radius:0 8px 8px 0;padding:8px 10px;font-size:14px;line-height:1.45}
.mv-list small{display:block;color:var(--di-muted,#4f6578)}
.st-wrap{overflow-x:auto}
.st-table{border-collapse:separate;border-spacing:3px;width:100%;font-size:13px}
.st-table th{font:700 11.5px/1.2 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);padding:2px 4px;white-space:nowrap}
.st-table th.rowh{text-align:left;font:700 13px/1.3 var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a)}
.st-slot{width:100%;min-width:44px;height:34px;border-radius:7px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);cursor:pointer;font-size:11.5px;font-weight:700}
.st-slot.booked{background:var(--di-line,#c9dce8);color:var(--di-muted,#4f6578);cursor:not-allowed}
.st-slot.closed{background:repeating-linear-gradient(45deg,var(--di-bg,#eef7fb) 0 4px,var(--di-line,#c9dce8) 4px 6px);color:var(--di-muted,#4f6578);cursor:not-allowed}
.st-slot.free{border-color:#1fa38a;color:#137a66}
.st-slot[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
`;
  function injectStyle() {
    if (document.getElementById('dt-style')) return;
    const s = document.createElement('style'); s.id = 'dt-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dt');
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
      c.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k); } });
    }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dt'); }
  }

  /* ======================================================================================
   * Dial: a gauge with coloured zones, a needle, and the recent history
   * data = { label, value, min, max, prefix?, suffix?, zones:[{to, label, tone:'low'|'ok'|'high'|'good'|'warn'|'bad', note?}], target?, history?:[{label,value}] }
   * ====================================================================================== */
  class Dial extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.value = +data.value; this.sel = null;
      el.innerHTML = '<svg role="img" data-dial></svg><svg role="img" data-hist></svg><p class="dt-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('[data-dial]'); this.$h = el.querySelector('[data-hist]'); this.$note = el.querySelector('.dt-note');
      this._hot(this.$svg, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { zone: this.data.zones[this.sel].label }); });
      this.render();
    }
    zoneOf(v) { const z = this.data.zones; let lo = +this.data.min; for (let i = 0; i < z.length; i++) { if (v <= +z[i].to || i === z.length - 1) return { i, z: z[i], from: lo }; lo = +z[i].to; } }
    setValue(v) { this.value = clamp(+v, +this.data.min, +this.data.max); this.render(); this._emit('change', { value: this.value, zone: this.zoneOf(this.value).z.label }); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(260, this.$svg.clientWidth || 520), S = Math.min(W, 460), cx = W / 2, R = S * 0.4, cy = R + 24, H = cy + 46, min = +d.min, max = +d.max;
      const a = v => Math.PI * (1 + clamp((v - min) / (max - min || 1), 0, 1)), P = (v, r) => [cx + Math.cos(a(v)) * r, cy + Math.sin(a(v)) * r];
      const arc = (v0, v1, r0, r1) => { const [x0, y0] = P(v0, r1), [x1, y1] = P(v1, r1), [x2, y2] = P(v1, r0), [x3, y3] = P(v0, r0), lg = (a(v1) - a(v0)) > Math.PI ? 1 : 0; return 'M' + f1(x0) + ' ' + f1(y0) + ' A' + r1 + ' ' + r1 + ' 0 ' + lg + ' 1 ' + f1(x1) + ' ' + f1(y1) + ' L' + f1(x2) + ' ' + f1(y2) + ' A' + r0 + ' ' + r0 + ' 0 ' + lg + ' 0 ' + f1(x3) + ' ' + f1(y3) + 'Z'; };
      let s = '', lo = min; const cur = this.zoneOf(this.value);
      d.zones.forEach((z, i) => {
        const hi = i === d.zones.length - 1 ? max : +z.to, on = this.sel === i || (this.sel == null && cur.i === i), col = TONE[z.tone] || PALETTE[i % PALETTE.length];
        const [lx, ly] = P((lo + hi) / 2, R + 16);
        s += '<g data-k="' + i + '" tabindex="0" role="button" style="cursor:pointer" aria-pressed="' + (this.sel === i) + '" aria-label="' + esc(z.label + ': ' + fmtNum(lo, d) + ' to ' + fmtNum(hi, d)) + '"><path d="' + arc(lo, hi, R * 0.72, R) + '" fill="' + col + '" opacity="' + (on ? 1 : 0.45) + '" stroke="' + T.surface + '" stroke-width="2"/>' +
          '<text x="' + f1(lx) + '" y="' + f1(ly) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + col + '">' + esc(fitText(z.label, 90, 11.5)) + '</text></g>';
        lo = hi;
      });
      if (d.target != null) { const [tx0, ty0] = P(+d.target, R * 0.68), [tx1, ty1] = P(+d.target, R + 4); s += '<line x1="' + f1(tx0) + '" y1="' + f1(ty0) + '" x2="' + f1(tx1) + '" y2="' + f1(ty1) + '" stroke="' + T.fg + '" stroke-width="3" stroke-dasharray="4 3"/>'; }
      const [nx, ny] = P(this.value, R * 0.86);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(nx) + '" y2="' + f1(ny) + '" stroke="' + T.fg + '" stroke-width="4" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + T.fg + '"/>' +
        '<text x="' + cx + '" y="' + (cy + 34) + '" text-anchor="middle" font-size="26" font-weight="800" fill="' + T.fg + '">' + esc(fmtNum(this.value, d)) + '</text>' +
        '<text x="' + f1(cx - R) + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(min, d)) + '</text><text x="' + f1(cx + R) + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(max, d)) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', d.label + ': ' + fmtNum(this.value, d) + ', ' + cur.z.label);
      this._keep(this.$svg, s);
      const hist = d.history || [];
      if (hist.length > 1) {
        const hw = W, hh = 70, vals = hist.map(h => +h.value), pad = Math.max(1, (Math.max(...vals) - Math.min(...vals)) * 0.15), hmin = Math.min(...vals) - pad, hmax = Math.max(...vals) + pad, sx = i => 8 + (i / (hist.length - 1)) * (hw - 16), sy = v => 8 + (1 - (v - hmin) / (hmax - hmin || 1)) * (hh - 26);
        let h = '<path d="' + hist.map((p, i) => (i ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(sy(+p.value))).join(' ') + '" fill="none" stroke="' + T.accent + '" stroke-width="2"/>';
        hist.forEach((p, i) => { const z = this.zoneOf(+p.value).z; h += '<circle cx="' + f1(sx(i)) + '" cy="' + f1(sy(+p.value)) + '" r="3.5" fill="' + (TONE[z.tone] || T.accent) + '"><title>' + esc(p.label + ': ' + fmtNum(+p.value, d) + ' (' + z.label + ')') + '</title></circle>'; });
        h += '<text x="8" y="' + (hh - 2) + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(hist[0].label) + '</text><text x="' + (hw - 8) + '" y="' + (hh - 2) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(hist[hist.length - 1].label) + '</text>';
        this.$h.setAttribute('viewBox', '0 0 ' + hw + ' ' + hh); this.$h.style.height = hh + 'px'; this.$h.innerHTML = h; this.$h.setAttribute('aria-label', 'History: ' + hist.map(p => p.label + ' ' + fmtNum(+p.value, d)).join(', '));
      } else this.$h.setAttribute('hidden', '');
      const sel = this.sel != null ? d.zones[this.sel] : null;
      if (sel) { const from = this.sel ? +d.zones[this.sel - 1].to : min, to = this.sel === d.zones.length - 1 ? max : +sel.to; this.$note.innerHTML = '<b>' + esc(sel.label) + '</b>: ' + esc(fmtNum(from, d)) + ' to ' + esc(fmtNum(to, d)) + '.' + (sel.note ? ' ' + esc(sel.note) : ''); }
      else {
        const prev = hist.length > 1 ? +hist[hist.length - 2].value : null;
        this.$note.innerHTML = '<b>' + esc(d.label) + ': ' + esc(fmtNum(this.value, d)) + '</b>, which is <b>' + esc(cur.z.label.toLowerCase()) + '</b>.' + (cur.z.note ? ' ' + esc(cur.z.note) : '') + (prev != null ? ' ' + (this.value > prev ? 'Up' : this.value < prev ? 'Down' : 'No change') + ' from ' + esc(fmtNum(prev, d)) + ' last time.' : '') + (d.target != null ? ' Target: ' + esc(fmtNum(+d.target, d)) + '.' : '') + ' Tap a zone for its range.';
      }
    }
  }

  /* ======================================================================================
   * Statusboard: day-by-day status for several services
   * data = { end:'YYYY-MM-DD', services:[{id,label,days:['ok'|'slow'|'down'|'none' …oldest first], notes?:{ 'YYYY-MM-DD': text }}] }
   * ====================================================================================== */
  class Statusboard extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.sv = data.services.map((s, i) => Object.assign({ i }, s)); this.n = Math.max(...this.sv.map(s => s.days.length)); this.cur = [0, this.n - 1]; this.sel = null;
      el.innerHTML = '<svg role="group"></svg><div class="dt-legend">' + ['ok', 'slow', 'down'].map(k => '<span><i style="background:' + STATUS[k].c + '"></i>' + STATUS[k].w + '</span>').join('') + '</div><p class="dt-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dt-note');
      this._hot(this.$svg, k => { const [r, c] = k.split(':').map(Number); this.pick(r, c); });
      this.$svg.addEventListener('keydown', e => { const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!mv) return; e.preventDefault(); this.pick(clamp(this.cur[0] + mv[0], 0, this.sv.length - 1), clamp(this.cur[1] + mv[1], 0, this.n - 1), true); });
      this.render();
    }
    dateOf(c) { return Date.parse(this.data.end + 'T00:00:00Z') - (this.n - 1 - c) * DAY; }
    uptime(s) { const d = s.days.filter(x => x !== 'none'); return d.length ? (100 * d.filter(x => x !== 'down').length) / d.length : 100; }
    pick(r, c, kb) {
      this.cur = [r, c]; this.sel = [r, c]; this.render();
      const g = this.$svg.querySelector('[data-k="' + r + ':' + c + '"]'); if (g && (kb || this.el.contains(document.activeElement))) g.focus({ preventScroll: true });
      const s = this.sv[r]; this._emit('select', { service: s.id, date: iso(this.dateOf(c)), status: s.days[c] || 'none' });
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, labH = 18, barH = narrow ? 26 : 30, gap = 14, rowH = labH + barH + gap, cw = W / this.n;
      let s = '';
      this.sv.forEach((sv, r) => {
        const y = r * rowH + labH, up = this.uptime(sv);
        s += '<text x="0" y="' + (y - 5) + '" font-size="13" font-weight="700" fill="' + T.fg + '">' + esc(sv.label) + '</text><text x="' + W + '" y="' + (y - 5) + '" text-anchor="end" font-size="11.5" font-weight="700" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + up.toFixed(up === 100 ? 0 : 1) + '% up</text>';
        for (let c = 0; c < this.n; c++) {
          const st = sv.days[c] || 'none', on = this.sel && this.sel[0] === r && this.sel[1] === c, cur = this.cur[0] === r && this.cur[1] === c, note = sv.notes && sv.notes[iso(this.dateOf(c))];
          s += '<g data-k="' + r + ':' + c + '" role="button" tabindex="' + (cur ? 0 : -1) + '" style="cursor:pointer" aria-label="' + esc(sv.label + ', ' + nice(this.dateOf(c)) + ': ' + STATUS[st].w + (note ? '. ' + note : '')) + '"><rect x="' + f1(c * cw + 0.75) + '" y="' + (on ? y - 3 : y) + '" width="' + f1(Math.max(1.5, cw - 1.5)) + '" height="' + (on ? barH + 6 : barH) + '" rx="' + Math.min(3, cw / 3) + '" fill="' + (STATUS[st].c || T.line) + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/>' + (note ? '<circle cx="' + f1(c * cw + cw / 2) + '" cy="' + (y + barH + 5) + '" r="2.2" fill="' + T.fg + '"/>' : '') + '</g>';
        }
      });
      const H = this.sv.length * rowH + 4;
      s += '<text x="0" y="' + (H - 1) + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + this.n + ' days ago</text><text x="' + W + '" y="' + (H - 1) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">Today</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 4)); this.$svg.style.height = (H + 4) + 'px';
      this.$svg.setAttribute('aria-label', 'Status for the last ' + this.n + ' days. Arrow keys move between days and services.');
      this.$svg.innerHTML = s;
      if (this.sel) {
        const [r, c] = this.sel, sv = this.sv[r], st = sv.days[c] || 'none', note = sv.notes && sv.notes[iso(this.dateOf(c))];
        this.$note.innerHTML = '<b>' + esc(sv.label) + '</b>, ' + esc(nice(this.dateOf(c))) + ': <b>' + STATUS[st].w + '</b>.' + (note ? ' ' + esc(note) : '');
      } else {
        const today = this.sv.filter(sv => (sv.days[this.n - 1] || 'none') !== 'ok'), worst = this.sv.slice().sort((a, b) => this.uptime(a) - this.uptime(b))[0];
        this.$note.innerHTML = (today.length ? '<b>Today:</b> ' + today.map(sv => esc(sv.label) + ' is ' + STATUS[sv.days[this.n - 1] || 'none'].w.toLowerCase()).join('; ') + '.' : '<b>Everything is working today.</b>') + ' Lowest over ' + this.n + ' days: <b>' + esc(worst.label) + '</b> (' + this.uptime(worst).toFixed(1) + '% up). Dots mark days with a note; tap any day.';
      }
    }
  }

  /* ======================================================================================
   * Sparkgrid: small trend lines side by side
   * data = { periods:[labels], items:[{id,label,values:[…]}], prefix?, suffix?, unit?, better?:'up'|'down' }
   * options: { sameScale: false }
   * ====================================================================================== */
  class Sparkgrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sameScale: false, sort: 'given' });
      this.items = data.items.map((t, i) => Object.assign({ i }, t, { values: t.values.map(Number) })); this.same = this.o.sameScale; this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="dt-bar" role="group" aria-label="Order and scale"><button type="button" class="dt-btn" data-s="given">A to Z</button><button type="button" class="dt-btn" data-s="up">Biggest rise</button><button type="button" class="dt-btn" data-s="down">Biggest fall</button><button type="button" class="dt-btn" data-same>Same scale for all</button></div><div class="sg-grid"></div><p class="dt-note" aria-live="polite"></p>';
      this.$grid = el.querySelector('.sg-grid'); this.$note = el.querySelector('.dt-note');
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { this.sort = b.dataset.s; this.render(); this._emit('sort', { by: this.sort }); });
      el.querySelector('[data-same]').onclick = () => { this.same = !this.same; this.render(); };
      this._hot(this.$grid, k => { this.sel = this.sel === +k ? null : +k; this.render(); if (this.sel != null) this._emit('select', { id: this.items[this.sel].id }); });
      this.render();
    }
    _ch(t) { const a = t.values[0], b = t.values[t.values.length - 1]; return { a, b, d: b - a, p: a ? (b - a) / Math.abs(a) : 0 }; }
    render() {
      const T = themeOf(this.el), d = this.data, better = d.better || 'up', all = this.items.flatMap(t => t.values), gmin = Math.min(...all), gmax = Math.max(...all);
      let list = this.items.slice(); if (this.sort === 'given') list.sort((a, b) => String(a.label).localeCompare(b.label)); if (this.sort === 'up') list.sort((a, b) => this._ch(b).p - this._ch(a).p); if (this.sort === 'down') list.sort((a, b) => this._ch(a).p - this._ch(b).p);
      const html = list.map(t => {
        const c = this._ch(t), lo = this.same ? gmin : Math.min(...t.values), hi = this.same ? gmax : Math.max(...t.values), n = t.values.length, W = 200, H = 44, sx = i => 3 + (i / (n - 1)) * (W - 6), sy = v => 3 + (1 - (v - lo) / (hi - lo || 1)) * (H - 6);
        const good = c.d === 0 ? null : (c.d > 0) === (better === 'up'), col = good == null ? T.muted : good ? '#1fa38a' : '#c2563a', imax = t.values.indexOf(Math.max(...t.values)), imin = t.values.indexOf(Math.min(...t.values));
        return '<button type="button" class="sg-card" data-k="' + t.i + '" aria-pressed="' + (this.sel === t.i) + '" aria-label="' + esc(t.label + ': ' + fmtNum(c.b, d) + ', ' + (c.d > 0 ? 'up' : c.d < 0 ? 'down' : 'no change') + ' ' + Math.round(Math.abs(c.p) * 100) + '%') + '"><b>' + esc(t.label) + '</b><span class="sg-v">' + esc(fmtNum(c.b, d)) + '</span>' +
          '<span class="sg-ch" style="color:' + col + '">' + (c.d > 0 ? '▲ +' : c.d < 0 ? '▼ −' : '■ ') + Math.round(Math.abs(c.p) * 100) + '%' + (c.d ? (c.d > 0 ? ' up' : ' down') : ' no change') + '</span>' +
          '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + t.values.map((v, i) => (i ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(sy(v))).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
          '<circle cx="' + f1(sx(imax)) + '" cy="' + f1(sy(t.values[imax])) + '" r="2.5" fill="' + T.fg + '"/><circle cx="' + f1(sx(imin)) + '" cy="' + f1(sy(t.values[imin])) + '" r="2.5" fill="' + T.muted + '"/></svg></button>';
      }).join('');
      this._keep(this.$grid, html);
      this.el.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === this.sort)));
      this.el.querySelector('[data-same]').setAttribute('aria-pressed', String(this.same));
      const per = d.periods || [];
      if (this.sel != null) {
        const t = this.items[this.sel], c = this._ch(t), imax = t.values.indexOf(Math.max(...t.values)), imin = t.values.indexOf(Math.min(...t.values));
        this.$note.innerHTML = '<b>' + esc(t.label) + '</b>: ' + esc(fmtNum(c.a, d)) + ' in ' + esc(per[0] || 'the first period') + ', ' + esc(fmtNum(c.b, d)) + ' in ' + esc(per[per.length - 1] || 'the last') + ' (' + (c.d >= 0 ? '+' : '−') + Math.round(Math.abs(c.p) * 100) + '%). Highest ' + esc(fmtNum(t.values[imax], d)) + (per[imax] ? ' in ' + esc(per[imax]) : '') + ', lowest ' + esc(fmtNum(t.values[imin], d)) + (per[imin] ? ' in ' + esc(per[imin]) : '') + '.';
      } else {
        const by = this.items.slice().sort((a, b) => this._ch(b).p - this._ch(a).p), up = by.filter(t => this._ch(t).d > 0).length;
        this.$note.innerHTML = '<b>' + up + ' of ' + this.items.length + '</b> went up from ' + esc(per[0] || 'the start') + ' to ' + esc(per[per.length - 1] || 'the end') + '. Biggest rise: <b>' + esc(by[0].label) + '</b>; biggest fall: <b>' + esc(by[by.length - 1].label) + '</b>. ' + (this.same ? 'All lines share one scale.' : 'Each line has its own scale; switch on “Same scale for all” to compare sizes.') + ' Tap a card for detail.';
      }
    }
  }

  /* ======================================================================================
   * Treeline: a tree to expand and collapse, with counts and search (ARIA tree)
   * data = { root:{label, sub?, children:[{label, sub?, link?, children?}]} }  options: { open: 1 (levels open at start) }
   * ====================================================================================== */
  class Treeline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { open: 1 });
      let n = 0; const walk = (node, depth, parent) => { node._id = 'n' + (n++); node._d = depth; node._p = parent; (node.children || []).forEach(c => walk(c, depth + 1, node)); };
      walk(data.root, 0, null); this.root = data.root; this.openSet = new Set(); this.q = ''; this.sel = this.root._id;
      const openTo = (node) => { if (node._d < this.o.open && node.children) { this.openSet.add(node._id); node.children.forEach(openTo); } }; openTo(this.root);
      el.innerHTML = '<div class="tl-tools"><input type="search" placeholder="Search" aria-label="Search the tree"><button type="button" class="dt-btn" data-all>Open all</button><button type="button" class="dt-btn" data-none>Close all</button></div><ul class="tl-tree" role="tree"></ul><p class="dt-note" aria-live="polite"></p>';
      this.$tree = el.querySelector('.tl-tree'); this.$note = el.querySelector('.dt-note'); this.$q = el.querySelector('input');
      this.$q.addEventListener('input', () => { this.q = this.$q.value.trim().toLowerCase(); this.render(); this._emit('search', { query: this.q }); });
      el.querySelector('[data-all]').onclick = () => { this._each(x => { if (x.children) this.openSet.add(x._id); }); this.render(); };
      el.querySelector('[data-none]').onclick = () => { this.openSet.clear(); this.openSet.add(this.root._id); this.render(); };
      this.$tree.addEventListener('click', e => { const r = e.target.closest('[data-id]'); if (r) { this.choose(r.dataset.id, true); } });
      this.$tree.addEventListener('keydown', e => this._key(e));
      this.render();
    }
    _each(fn, node) { node = node || this.root; fn(node); (node.children || []).forEach(c => this._each(fn, c)); }
    _find(id) { let f = null; this._each(x => { if (x._id === id) f = x; }); return f; }
    _count(node) { let c = 0; (node.children || []).forEach(k => { c += k.children ? this._count(k) : 1; }); return c; }
    _match(node) { if (!this.q) return true; const hit = (node.label + ' ' + (node.sub || '')).toLowerCase().includes(this.q); return hit || (node.children || []).some(c => this._match(c)); }
    _visible() { const out = []; const walk = n => { if (!this._match(n)) return; out.push(n); if (n.children && (this.openSet.has(n._id) || this.q)) n.children.forEach(walk); }; walk(this.root); return out; }
    choose(id, toggle) {
      const n = this._find(id); if (!n) return; this.sel = id;
      if (toggle && n.children) { if (this.openSet.has(id)) this.openSet.delete(id); else this.openSet.add(id); this._emit('toggle', { label: n.label, open: this.openSet.has(id) }); }
      this.render(); this._focus(); this._emit('select', { label: n.label, path: this._path(n) });
    }
    _path(n) { const p = []; while (n) { p.unshift(n.label); n = n._p; } return p; }
    _focus() { const r = this.$tree.querySelector('[data-id="' + this.sel + '"]'); r && r.focus({ preventScroll: false }); }
    _key(e) {
      const vis = this._visible(), i = vis.findIndex(n => n._id === this.sel), n = vis[i]; if (!n) return;
      const go = id => { e.preventDefault(); this.sel = id; this.render(); this._focus(); };
      if (e.key === 'ArrowDown' && vis[i + 1]) go(vis[i + 1]._id);
      else if (e.key === 'ArrowUp' && vis[i - 1]) go(vis[i - 1]._id);
      else if (e.key === 'ArrowRight' && n.children) { if (!this.openSet.has(n._id)) { this.openSet.add(n._id); go(n._id); } else go(n.children[0]._id); }
      else if (e.key === 'ArrowLeft') { if (n.children && this.openSet.has(n._id)) { this.openSet.delete(n._id); go(n._id); } else if (n._p) go(n._p._id); }
      else if (e.key === 'Home') go(vis[0]._id); else if (e.key === 'End') go(vis[vis.length - 1]._id);
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.choose(n._id, true); }
    }
    _hl(t) { if (!this.q) return esc(t); const i = t.toLowerCase().indexOf(this.q); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark class="tl-hit">' + esc(t.slice(i, i + this.q.length)) + '</mark>' + esc(t.slice(i + this.q.length)); }
    render() {
      const node = n => {
        if (!this._match(n)) return '';
        const open = n.children && (this.openSet.has(n._id) || !!this.q), leaf = !n.children;
        return '<li role="none"><div class="tl-row' + (leaf ? ' tl-leaf' : '') + '" role="treeitem" data-id="' + n._id + '" tabindex="' + (n._id === this.sel ? 0 : -1) + '" aria-level="' + (n._d + 1) + '" aria-selected="' + (n._id === this.sel) + '"' + (leaf ? '' : ' aria-expanded="' + open + '"') + '><span class="tl-tw" aria-hidden="true">' + (leaf ? '•' : open ? '▾' : '▸') + '</span><span><span class="tl-lab">' + this._hl(n.label) + '</span>' + (n.children ? ' <span class="tl-n">' + this._count(n) + '</span>' : '') + (n.sub ? '<br><span class="tl-sub">' + this._hl(n.sub) + '</span>' : '') + (n.link && n._id === this.sel ? ' <a href="' + esc(n.link) + '" class="tl-sub">Open →</a>' : '') + '</span></div>' +
          (open ? '<ul role="group">' + n.children.map(node).join('') + '</ul>' : '') + '</li>';
      };
      this.$tree.innerHTML = node(this.root);
      const s = this._find(this.sel), shown = this._visible().filter(n => !n.children).length;
      this.$note.innerHTML = this.q ? '<b>' + this._countMatches() + '</b> match' + (this._countMatches() === 1 ? '' : 'es') + ' for “' + esc(this.q) + '”.' : s && s !== this.root ? esc(this._path(s).join(' › ')) + (s.children ? ': ' + this._count(s) + ' inside.' : '.') : '<b>' + this._count(this.root) + '</b> items in all. Tap a branch to open it; arrow keys move through the tree.';
      void shown;
    }
    _countMatches() { let c = 0; this._each(n => { if (!n.children && (n.label + ' ' + (n.sub || '')).toLowerCase().includes(this.q)) c++; }); return c; }
  }

  /* ======================================================================================
   * Monthview: a month calendar of events
   * data = { month?:'YYYY-MM', cats?:[{id,label,color?}], events:[{date:'YYYY-MM-DD', title, time?, place?, cat?, note?}] }
   * options: { today?: 'YYYY-MM-DD' }
   * ====================================================================================== */
  class Monthview extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { today: null });
      this.cats = (data.cats || []).map((c, i) => Object.assign({ i }, c)); this.ev = data.events.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
      const m = data.month || (this.ev[0] ? this.ev[0].date.slice(0, 7) : iso(Date.now()).slice(0, 7)); this.y = +m.slice(0, 4); this.m = +m.slice(5, 7) - 1; this.sel = null;
      el.innerHTML = '<div class="mv-head"><button type="button" class="dt-btn" data-prev aria-label="Previous month">←</button><h4 aria-live="polite"></h4><button type="button" class="dt-btn" data-next aria-label="Next month">→</button></div><div class="mv-grid"></div><div class="dt-legend"></div><div data-day></div>';
      this.$grid = el.querySelector('.mv-grid'); this.$h = el.querySelector('h4'); this.$day = el.querySelector('[data-day]');
      el.querySelector('[data-prev]').onclick = () => this.shift(-1); el.querySelector('[data-next]').onclick = () => this.shift(1);
      this._hot(this.$grid, k => this.pick(k));
      this.render();
    }
    shift(d) { this.m += d; if (this.m < 0) { this.m = 11; this.y--; } if (this.m > 11) { this.m = 0; this.y++; } this.sel = null; this.render(); this._emit('month', { month: this.y + '-' + String(this.m + 1).padStart(2, '0') }); }
    pick(date) { this.sel = this.sel === date ? null : date; this.render(); if (this.sel) this._emit('select', { date, events: this.ev.filter(e => e.date === date) }); }
    _col(e) { const c = this.cats.find(x => x.id === e.cat); return c ? colorFor(this.el, c, c.i) : themeOf(this.el).accent; }
    render() {
      const narrow = this.el.clientWidth < 520, first = Date.UTC(this.y, this.m, 1), lead = (new Date(first).getUTCDay() + 6) % 7, days = new Date(Date.UTC(this.y, this.m + 1, 0)).getUTCDate(), today = this.o.today || iso(Date.now());
      this.$grid.classList.toggle('mv-narrow', narrow); this.el.classList.toggle('mv-narrow', narrow);
      this.$h.textContent = MON[this.m] + ' ' + this.y;
      let h = WD.map(w => '<div class="mv-wd" aria-hidden="true">' + (narrow ? w[0] : w) + '</div>').join('');
      for (let i = 0; i < lead; i++) h += '<div class="mv-day out" aria-hidden="true"></div>';
      for (let dnum = 1; dnum <= days; dnum++) {
        const ds = iso(Date.UTC(this.y, this.m, dnum)), list = this.ev.filter(e => e.date === ds), on = this.sel === ds;
        h += '<button type="button" class="mv-day' + (ds === today ? ' today' : '') + '" data-k="' + ds + '" aria-pressed="' + on + '" aria-label="' + esc(nice(Date.parse(ds)) + ': ' + (list.length ? list.length + ' event' + (list.length === 1 ? '' : 's') + ', ' + list.map(e => e.title).join(', ') : 'nothing on')) + '"><span class="mv-num">' + dnum + '</span>' +
          (narrow ? (list.length ? '<span class="mv-dots">' + list.map(e => '<i style="background:' + esc(this._col(e)) + '"></i>').join('') + '</span>' : '') : list.slice(0, 2).map(e => '<span class="mv-ev" style="background:' + esc(this._col(e)) + '">' + esc((e.time ? e.time + ' ' : '') + e.title) + '</span>').join('') + (list.length > 2 ? '<span class="dt-small">+' + (list.length - 2) + ' more</span>' : '')) + '</button>';
      }
      this._keep(this.$grid, h);
      this.el.querySelector('.dt-legend').innerHTML = this.cats.map(c => '<span><i style="background:' + esc(colorFor(this.el, c, c.i)) + '"></i>' + esc(c.label) + '</span>').join('');
      const monthEv = this.ev.filter(e => e.date.startsWith(this.y + '-' + String(this.m + 1).padStart(2, '0')));
      if (this.sel) {
        const list = this.ev.filter(e => e.date === this.sel);
        this.$day.innerHTML = '<p class="dt-note"><b>' + esc(nice(Date.parse(this.sel))) + '</b>: ' + (list.length ? list.length + ' event' + (list.length === 1 ? '' : 's') + '.' : 'nothing on.') + '</p>' + (list.length ? '<ul class="mv-list">' + list.map(e => '<li style="border-left-color:' + esc(this._col(e)) + '"><b>' + esc(e.title) + '</b><small>' + esc([e.time, e.place].filter(Boolean).join(' · ')) + '</small>' + (e.note ? esc(e.note) : '') + '</li>').join('') + '</ul>' : '');
      } else {
        const next = this.ev.find(e => e.date >= today);
        this.$day.innerHTML = '<p class="dt-note"><b>' + monthEv.length + ' event' + (monthEv.length === 1 ? '' : 's') + '</b> in ' + MON[this.m] + '.' + (next ? ' Next: <b>' + esc(next.title) + '</b> on ' + esc(nice(Date.parse(next.date))) + '.' : '') + ' Tap a day to see what is on.</p>';
      }
    }
  }

  /* ======================================================================================
   * Slotgrid: a booking grid; pick a free slot
   * data = { days:[{id,label}], times:[labels], slots:{ dayId:[ 'free'|'booked'|'closed' per time ] }, label? }
   * ====================================================================================== */
  class Slotgrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.pick = null;
      el.innerHTML = '<div class="st-wrap"><table class="st-table"><caption class="dt-small" style="text-align:left;caption-side:bottom;padding-top:6px"></caption><thead></thead><tbody></tbody></table></div><div class="dt-legend"><span><i style="background:#fff;border:1px solid #1fa38a"></i>Free</span><span><i style="background:#c9dce8"></i>Booked</span><span><i style="background:repeating-linear-gradient(45deg,#eef7fb 0 3px,#c9dce8 3px 5px)"></i>Closed</span></div><p class="dt-note" aria-live="polite"></p><div class="dt-bar"><button type="button" class="dt-btn primary" data-book hidden>Book this slot</button></div>';
      this.$t = el.querySelector('table'); this.$note = el.querySelector('.dt-note'); this.$book = el.querySelector('[data-book]');
      this.$t.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b && !b.disabled) this.choose(b.dataset.k); });
      this.$book.onclick = () => { if (!this.pick) return; const [d, t] = this.pick.split('|'); this.data.slots[d][+t] = 'booked'; const p = this.pick; this.pick = null; this.render(); this.$note.innerHTML = '<b>Booked:</b> ' + esc(this._name(p)) + '.'; this._emit('book', this._obj(p)); };
      this.render();
    }
    _obj(k) { const [d, t] = k.split('|'); return { day: d, time: this.data.times[+t] }; }
    _name(k) { const [d, t] = k.split('|'); return this.data.days.find(x => x.id === d).label + ' at ' + this.data.times[+t]; }
    choose(k) { this.pick = this.pick === k ? null : k; this.render(); const b = this.$t.querySelector('[data-k="' + CSS.escape(k) + '"]'); b && b.focus(); if (this.pick) this._emit('pick', this._obj(k)); }
    getState() { return { pick: this.pick }; }
    render() {
      const d = this.data;
      this.$t.querySelector('caption').textContent = d.label || '';
      this.$t.querySelector('thead').innerHTML = '<tr><th></th>' + d.days.map(x => '<th scope="col">' + esc(x.label) + '</th>').join('') + '</tr>';
      this.$t.querySelector('tbody').innerHTML = d.times.map((tm, ti) => '<tr><th scope="row" class="rowh">' + esc(tm) + '</th>' + d.days.map(x => { const st = (d.slots[x.id] || [])[ti] || 'closed', k = x.id + '|' + ti, on = this.pick === k; return '<td><button type="button" class="st-slot ' + st + '" data-k="' + esc(k) + '"' + (st !== 'free' ? ' disabled' : '') + ' aria-pressed="' + on + '" aria-label="' + esc(x.label + ' ' + tm + ': ' + (st === 'free' ? 'free' : st)) + '">' + (on ? '✓' : st === 'free' ? 'Free' : st === 'booked' ? '—' : '') + '</button></td>'; }).join('') + '</tr>').join('');
      const free = []; d.times.forEach((tm, ti) => d.days.forEach((x, di) => { if (((d.slots[x.id] || [])[ti]) === 'free') free.push({ di, ti, k: x.id + '|' + ti }); }));
      free.sort((a, b) => a.di - b.di || a.ti - b.ti);
      this.$book.hidden = !this.pick;
      if (this.pick) this.$note.innerHTML = 'You picked <b>' + esc(this._name(this.pick)) + '</b>. Tap it again to change your mind.';
      else if (!/^<b>Booked/.test(this.$note.innerHTML)) this.$note.innerHTML = '<b>' + free.length + ' free slot' + (free.length === 1 ? '' : 's') + '</b>' + (free.length ? '. The first is ' + esc(this._name(free[0].k)) + '.' : '.') + ' Tap a free slot to pick it.';
    }
  }

  return { Dial, Statusboard, Sparkgrid, Treeline, Monthview, Slotgrid };
});
