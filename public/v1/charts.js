/*! Story Charts 1.0 · Dimau Infographics
 *  Six templates built on the formats the leading data-journalism and chart sites are known for, each with
 *  its own interaction:
 *    Rankrace    ranking over time: bars overtake each other as the years play; scrub to any moment.
 *    Peoplegrid  a unit chart: one square per person or thing; regroup into blocks or bars and the squares move.
 *    Guessline   "draw your guess": the reader sketches where the line goes, then the real line is revealed and scored.
 *    Flowbank    a flow (Sankey) diagram: where things come from and go; tap a flow for a plain-language sentence.
 *    Ledger      a living table: sort, search, inline bars, heat cells, sparklines and expandable rows.
 *    Storyscroll scrollytelling: a sticky chart changes as the reader scrolls through the story steps.
 *
 *  new Rankrace(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-display --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Rankrace', 'Peoplegrid', 'Guessline', 'Flowbank', 'Ledger', 'Storyscroll'].forEach(function (k) { root[k] = m[k]; }); root.DimauStoryCharts = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#7a6bd1', '#c2563a', '#5b8c2a', '#a3478f'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fmtNum(n, o) {
    o = o || {};
    if (!isFinite(n)) return '–';
    const abs = Math.abs(n);
    let s = o.compact && abs >= 1e6 ? (n / 1e6).toFixed(abs >= 1e7 ? 0 : 1) + 'M' : o.compact && abs >= 1e4 ? (n / 1e3).toFixed(abs >= 1e5 ? 0 : 1) + 'k' : n.toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : (abs < 10 ? 1 : 0) });
    return (o.prefix || '') + s + (o.suffix || '');
  }
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), font: v('--di-font', 'system-ui, sans-serif'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];

  const STYLE = `
.dc{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
.dc button{font:inherit;color:inherit}
.dc :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dc-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.dc-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:700;cursor:pointer}
.dc-btn.on,.dc-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dc-btn:disabled{opacity:.45;cursor:default}
.dc-note{font-size:14px;line-height:1.5;margin:10px 0 0;min-height:1.5em}
.dc-note b{font-weight:700}
/* Rankrace */
.rr-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.rr-frame{font:800 clamp(34px,6vw,64px)/1 var(--di-display,inherit);color:var(--di-accent,#0b6fa4);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.rr-board{position:relative;margin-top:10px}
.rr-row{position:absolute;left:0;right:0;display:grid;grid-template-columns:minmax(80px,170px) minmax(0,1fr);gap:10px;align-items:center;transition:transform .45s cubic-bezier(.3,.7,.3,1),opacity .3s}
.rr-row.out{opacity:0;pointer-events:none}
.rr-name{font-size:14px;font-weight:700;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rr-track{position:relative;height:100%}
.rr-fill{position:absolute;left:0;top:3px;bottom:3px;border-radius:6px;background:var(--c);min-width:4px}
.rr-val{position:absolute;top:50%;transform:translateY(-50%);font:700 13px var(--di-mono,ui-monospace,monospace);white-space:nowrap;font-variant-numeric:tabular-nums}
.rr-scrub{display:flex;gap:10px;align-items:center;margin-top:12px}
.rr-scrub input{flex:1;accent-color:var(--di-accent,#0b6fa4);min-width:0}
.dc.playing .rr-row{transition:transform .25s linear,opacity .3s}
/* Peoplegrid */
.pg-stage{position:relative;transition:height .5s}
.pg-u{position:absolute;left:0;top:0;border-radius:3px;background:var(--c);transition:transform .7s cubic-bezier(.3,.7,.2,1),opacity .3s}
.pg-u.dim{opacity:.18}
.pg-lab{position:absolute;font-size:13px;font-weight:700;transition:opacity .3s,transform .7s cubic-bezier(.3,.7,.2,1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pg-lab small{display:block;font:600 11.5px var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
.pg-legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.pg-key{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:99px;padding:4px 10px;font-size:12.5px;font-weight:600;cursor:pointer}
.pg-key i{width:10px;height:10px;border-radius:3px;background:var(--c)}
.pg-key[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--c)}
/* Guessline */
.gl-svg{display:block;width:100%;touch-action:none;user-select:none;-webkit-user-select:none}
.gl-svg .draw{cursor:crosshair}
/* Flowbank */
.fb-svg{display:block;width:100%}
.fb-link{cursor:pointer;transition:opacity .2s}
.fb-node{cursor:pointer}
/* Ledger */
.lg-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.lg-tools input{flex:1;min-width:160px;height:36px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 11px;font-size:14px;color:inherit}
.lg-wrap{overflow:auto;max-height:var(--lg-h,560px);border-radius:12px;box-shadow:0 0 0 1px var(--di-line,#c9dce8);background:var(--di-surface,#fff)}
.lg-table{border-collapse:collapse;width:100%;font-size:14px}
.lg-table th{position:sticky;top:0;z-index:1;background:var(--di-surface,#fff);text-align:left;font:700 11.5px/1.2 var(--di-font,system-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--di-muted,#4f6578);padding:10px;border-bottom:2px solid var(--di-line,#c9dce8);white-space:nowrap}
.lg-table th button{all:unset;cursor:pointer;display:inline-flex;gap:4px;align-items:center}
.lg-table th button:focus-visible{outline:2px solid var(--di-accent,#0b6fa4)}
.lg-table th.num,.lg-table td.num{text-align:right}
.lg-table td{padding:9px 10px;border-bottom:1px solid var(--di-line,#c9dce8);vertical-align:middle}
.lg-table tr.lg-row{cursor:pointer}
.lg-table tr.lg-row:hover td{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 6%,transparent)}
.lg-table tr.lg-detail td{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 5%,transparent);font-size:13.5px;line-height:1.5}
.lg-bar{display:flex;align-items:center;gap:8px;min-width:120px}
.lg-bar i{height:10px;border-radius:5px;background:var(--c,var(--di-accent,#0b6fa4))}
.lg-bar span{font:600 12.5px var(--di-mono,ui-monospace,monospace);font-variant-numeric:tabular-nums}
.lg-heat{font:700 12.5px var(--di-mono,ui-monospace,monospace);border-radius:6px;padding:3px 7px;display:inline-block;min-width:34px;text-align:center}
.lg-tag{display:inline-flex;align-items:center;gap:6px;font-size:13px}
.lg-tag i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.lg-count{font-size:12.5px;color:var(--di-muted,#4f6578);margin-top:8px}
/* Storyscroll */
.ss{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:28px}
.ss-steps{display:grid;gap:55vh;padding:20vh 0 30vh}
.ss-step{background:var(--di-surface,#fff);border-radius:14px;padding:16px 18px;box-shadow:0 0 0 1px var(--di-line,#c9dce8);opacity:.45;transition:opacity .3s,box-shadow .3s}
.ss-step.on{opacity:1;box-shadow:0 0 0 2px var(--di-accent,#0b6fa4),0 14px 30px -18px rgba(0,0,0,.4)}
.ss-step h4{margin:0 0 6px;font:700 17px/1.25 var(--di-display,inherit)}
.ss-step p{margin:0;font-size:15px;line-height:1.55}
.ss-graphic{position:sticky;top:max(calc(var(--ss-top,0px) + 8px),calc(50vh - var(--ss-h,420px)/2));height:var(--ss-h,420px);align-self:start}
.ss-graphic svg{display:block;width:100%;height:100%}
.dc.narrow .ss{grid-template-columns:minmax(0,1fr)}
.dc.narrow .ss-graphic{grid-row:1;top:calc(var(--ss-top,0px) + 8px);height:min(46vh,340px);z-index:1;background:var(--di-bg,#eef7fb);border-radius:12px}
.dc.narrow .ss-steps{grid-row:2;gap:40vh;padding:10vh 0 20vh;position:relative;z-index:2}
@media (prefers-reduced-motion:reduce){.rr-row,.pg-u,.pg-lab,.ss-step{transition:none!important}}
`;
  function injectStyle() {
    if (document.getElementById('dc-style')) return;
    const s = document.createElement('style'); s.id = 'dc-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dc');
      this._ro = new ResizeObserver(() => { const n = el.clientWidth < 640; el.classList.toggle('narrow', n); this._resize && this._resize(); });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dc', 'narrow', 'playing'); }
  }

  /* ======================================================================================
   * Rankrace: ranking over time
   * data = { unit?, prefix?, suffix?, top?, items:[{id,label,color?}], frames:[{label, values:{id:number}}] }
   * ====================================================================================== */
  class Rankrace extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { top: 10, rowH: 38, frameMs: 1400, autoplay: false });
      this.items = data.items.map((it, i) => Object.assign({}, it, { i }));
      this.frames = data.frames;
      this.pos = 0;
      el.innerHTML = '<div class="rr-head"><div class="rr-frame" aria-live="polite"></div><div class="dc-bar" style="margin:0"><button type="button" class="dc-btn rr-play">Play</button></div></div>' +
        '<div class="rr-board" role="list"></div>' +
        '<div class="rr-scrub"><span class="rr-a"></span><input type="range" min="0" step="0.01" aria-label="Move through time"><span class="rr-b"></span></div><p class="dc-note rr-note" aria-live="polite"></p>';
      this.$frame = el.querySelector('.rr-frame'); this.$board = el.querySelector('.rr-board'); this.$play = el.querySelector('.rr-play');
      this.$range = el.querySelector('input'); this.$note = el.querySelector('.rr-note');
      this.$range.max = this.frames.length - 1;
      el.querySelector('.rr-a').textContent = this.frames[0].label; el.querySelector('.rr-b').textContent = this.frames[this.frames.length - 1].label;
      this.$range.addEventListener('input', () => { this.stop(); this.seek(+this.$range.value); });
      this.$range.addEventListener('change', () => this.seek(Math.round(+this.$range.value)));
      this.$play.onclick = () => (this._raf ? this.stop() : this.play());
      this.rows = this.items.map(it => {
        const r = document.createElement('div');
        r.className = 'rr-row'; r.setAttribute('role', 'listitem');
        r.innerHTML = '<div class="rr-name">' + esc(it.label) + '</div><div class="rr-track"><div class="rr-fill"></div><div class="rr-val"></div></div>';
        this.$board.appendChild(r);
        return r;
      });
      this.render();
      if (this.o.autoplay && !reduced()) this.play();
    }
    _resize() { this.render(); }
    valuesAt(p) {
      const i = Math.floor(clamp(p, 0, this.frames.length - 1)), j = Math.min(i + 1, this.frames.length - 1), k = p - i;
      const A = this.frames[i].values, B = this.frames[j].values;
      return this.items.map(it => { const a = +A[it.id] || 0, b = B[it.id] != null ? +B[it.id] : a; return a + (b - a) * k; });
    }
    render() {
      const p = this.pos, vals = this.valuesAt(p), order = vals.map((v, i) => i).sort((a, b) => vals[b] - vals[a]);
      const top = Math.min(this.o.top, this.items.length), max = Math.max(...vals) || 1, rh = this.o.rowH;
      this.$board.style.height = top * rh + 'px';
      const fmt = v => fmtNum(v, { prefix: this.data.prefix, suffix: this.data.suffix, compact: this.data.compact });
      order.forEach((idx, rank) => {
        const r = this.rows[idx], it = this.items[idx], w = (vals[idx] / max) * 100;
        r.style.setProperty('--c', colorFor(this.el, it, idx));
        r.style.height = rh + 'px';
        r.style.transform = 'translateY(' + (Math.min(rank, top) * rh) + 'px)';
        r.classList.toggle('out', rank >= top);
        r.querySelector('.rr-fill').style.width = 'calc(' + w + '% - 70px)';
        const val = r.querySelector('.rr-val');
        val.textContent = fmt(vals[idx]);
        val.style.left = 'calc(' + w + '% - 64px)';
        r.setAttribute('aria-label', (rank + 1) + '. ' + it.label + ': ' + fmt(vals[idx]));
      });
      const fi = Math.round(p);
      this.$frame.textContent = this.frames[fi].label;
      this.$range.value = p;
      const lead = this.items[order[0]];
      if (Math.abs(p - fi) < 0.02 && fi !== this._lastFrame) {
        this._lastFrame = fi;
        const prev = fi > 0 ? this.valuesAt(fi - 1) : null;
        let note = '<b>' + esc(lead.label) + '</b> leads in ' + esc(this.frames[fi].label) + ' with ' + esc(fmt(vals[order[0]])) + '.';
        if (prev) {
          const prevOrder = prev.map((v, i) => i).sort((a, b) => prev[b] - prev[a]);
          const climber = order.slice(0, top).map((idx, rk) => ({ idx, gain: prevOrder.indexOf(idx) - rk })).sort((a, b) => b.gain - a.gain)[0];
          if (climber && climber.gain > 0) note += ' Biggest climber: <b>' + esc(this.items[climber.idx].label) + '</b>, up ' + climber.gain + (climber.gain === 1 ? ' place.' : ' places.');
        }
        this.$note.innerHTML = note;
        this._emit('frame', { index: fi, label: this.frames[fi].label, leader: lead.id });
      }
    }
    seek(p) { this.pos = clamp(p, 0, this.frames.length - 1); this.render(); }
    play() {
      if (this.pos >= this.frames.length - 1) this.pos = 0;
      if (reduced()) { this.seek(Math.min(this.frames.length - 1, Math.floor(this.pos) + 1)); return; }
      this.el.classList.add('playing'); this.$play.textContent = 'Pause'; this.$play.classList.add('on');
      let last = performance.now();
      const tick = now => {
        this.pos = Math.min(this.frames.length - 1, this.pos + (now - last) / this.o.frameMs); last = now;
        this.render();
        if (this.pos >= this.frames.length - 1) { this.stop(); return; }
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }
    stop() { cancelAnimationFrame(this._raf); this._raf = 0; this.el.classList.remove('playing'); this.$play.textContent = 'Play'; this.$play.classList.remove('on'); }
    _teardown() { this.stop(); }
  }

  /* ======================================================================================
   * Peoplegrid: unit chart that regroups
   * data = { unit, unitPlural?, groups:[{id,label,color?,count}] }   (or items:[{group}] to count)
   * ====================================================================================== */
  class Peoplegrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { view: 'mixed', size: null });
      const counts = {};
      if (data.items) data.items.forEach(it => { counts[it.group] = (counts[it.group] || 0) + 1; });
      this.groups = data.groups.map((g, i) => Object.assign({}, g, { i, count: g.count != null ? +g.count : counts[g.id] || 0 }));
      this.total = this.groups.reduce((s, g) => s + g.count, 0);
      this.unit = data.unit || 'item'; this.units = data.unitPlural || this.unit + 's';
      this.focus = null;
      el.innerHTML = '<div class="dc-bar" role="group" aria-label="Arrange"><button type="button" class="dc-btn" data-v="mixed">All together</button><button type="button" class="dc-btn" data-v="grouped">By group</button><button type="button" class="dc-btn" data-v="bars">As bars</button></div>' +
        '<div class="pg-stage" role="img"></div><div class="pg-legend"></div><p class="dc-note pg-note" aria-live="polite"></p>';
      this.$stage = el.querySelector('.pg-stage'); this.$legend = el.querySelector('.pg-legend'); this.$note = el.querySelector('.pg-note');
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => this.setView(b.dataset.v));
      // one element per unit, in group order
      this.units$ = [];
      this.groups.forEach(g => { for (let k = 0; k < g.count; k++) { const u = document.createElement('i'); u.className = 'pg-u'; u.dataset.g = g.id; this.$stage.appendChild(u); this.units$.push({ el: u, g, k }); } });
      this.labels = this.groups.map(g => { const l = document.createElement('div'); l.className = 'pg-lab'; this.$stage.appendChild(l); return l; });
      this.$legend.innerHTML = this.groups.map((g, i) => '<button type="button" class="pg-key" data-g="' + esc(g.id) + '" aria-pressed="false" style="--c:' + esc(colorFor(el, g, i)) + '"><i></i>' + esc(g.label) + ' · ' + g.count + '</button>').join('');
      this.$legend.querySelectorAll('.pg-key').forEach(b => b.onclick = () => this.highlight(this.focus === b.dataset.g ? null : b.dataset.g));
      this.$stage.addEventListener('pointerover', e => { const u = e.target.closest('.pg-u'); if (u) this._tip(this.groups.find(g => g.id === u.dataset.g)); });
      this.setView(this.o.view);
    }
    _resize() { if (this.$stage.clientWidth !== this._w) this.render(); }
    setView(v) {
      this.view = v;
      this.el.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
      this.render();
      this._emit('view', { view: v });
    }
    highlight(id) {
      this.focus = id;
      this.$legend.querySelectorAll('.pg-key').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === id)));
      this.units$.forEach(u => u.el.classList.toggle('dim', !!id && u.g.id !== id));
      this._tip(id ? this.groups.find(g => g.id === id) : null);
      this._emit('select', { group: id });
    }
    _tip(g) {
      if (!g) { this.$note.innerHTML = 'Each square is one ' + esc(this.unit) + '. ' + this.total + ' in all.'; return; }
      const pct = this.total ? (100 * g.count / this.total) : 0;
      this.$note.innerHTML = '<b>' + esc(g.label) + '</b>: ' + g.count + ' ' + esc(g.count === 1 ? this.unit : this.units) + ', ' + (pct >= 10 ? Math.round(pct) : pct.toFixed(1)) + '% of all. About ' + Math.max(1, Math.round(pct / 10)) + ' in every 10.';
    }
    render() {
      const W = (this._w = this.$stage.clientWidth || 600), n = this.total, groups = this.groups;
      groups.forEach((g, i) => { this.units$.filter(u => u.g === g).forEach(u => u.el.style.setProperty('--c', colorFor(this.el, g, i))); });
      const lay = { mixed: () => this._mixed(W), grouped: () => this._grouped(W), bars: () => this._bars(W) }[this.view]();
      this.$stage.style.height = lay.h + 'px';
      this.$stage.setAttribute('aria-label', groups.map(g => g.label + ' ' + g.count).join(', '));
      this.units$.forEach((u, idx) => {
        const p = lay.pos[idx];
        u.el.style.width = u.el.style.height = lay.s + 'px';
        u.el.style.transform = 'translate(' + f1(p[0]) + 'px,' + f1(p[1]) + 'px)';
        u.el.style.transitionDelay = reduced() ? '0ms' : Math.round((idx / n) * 220) + 'ms';
      });
      this.labels.forEach((l, i) => {
        const g = groups[i], p = lay.labels && lay.labels[i];
        l.style.opacity = p ? 1 : 0;
        if (p) { l.style.transform = 'translate(' + f1(p[0]) + 'px,' + f1(p[1]) + 'px)'; l.style.width = p[2] ? p[2] + 'px' : ''; l.style.textAlign = p[3] || 'left'; l.title = g.label; l.innerHTML = esc(g.label) + '<small>' + g.count + '</small>'; }
      });
      if (!this.focus) this._tip(null);
    }
    _mixed(W) {
      const n = this.total, gap = 3, cols = Math.max(5, Math.floor(Math.sqrt(n * (W / 260)))), s = clamp(Math.floor(W / cols) - gap, 6, 26), step = s + gap;
      const c = Math.floor((W + gap) / step);
      return { s, h: Math.ceil(n / c) * step, pos: this.units$.map((u, i) => [(i % c) * step, Math.floor(i / c) * step]) };
    }
    _grouped(W) {
      const gap = 3, s = clamp(Math.floor(W / 40), 7, 16), step = s + gap, blockCols = 6, bw = blockCols * step;
      const per = Math.max(1, Math.floor((W + 16) / (bw + 16))), pos = new Array(this.units$.length), labels = [];
      let x0 = 0, row = 0, rowTop = 0, rowH = 0, gi = 0;
      this.groups.forEach((g, i) => {
        if (gi && gi % per === 0) { row++; rowTop += rowH + 16; rowH = 0; x0 = 0; }
        const rows = Math.ceil(g.count / blockCols), h = 36 + rows * step;
        labels[i] = [x0, rowTop, bw, 'left'];
        this.units$.forEach((u, idx) => { if (u.g === g) pos[idx] = [x0 + (u.k % blockCols) * step, rowTop + 36 + Math.floor(u.k / blockCols) * step]; });
        rowH = Math.max(rowH, h); x0 += bw + 16; gi++;
      });
      return { s, h: rowTop + rowH, pos, labels };
    }
    _bars(W) {
      const gap = 2, labW = W < 520 ? 110 : 170, avail = W - labW - 10, max = Math.max(...this.groups.map(g => g.count));
      const rowsPer = Math.max(1, Math.ceil(max / Math.max(1, Math.floor(avail / 12)))), s = clamp(Math.floor(avail / Math.ceil(max / rowsPer)) - gap, 5, 16), step = s + gap;
      const perRow = Math.ceil(max / rowsPer), bh = rowsPer * step + 14, pos = new Array(this.units$.length), labels = [];
      const order = this.groups.slice().sort((a, b) => b.count - a.count);
      order.forEach((g, r) => {
        const y = r * bh;
        labels[g.i] = [0, y - 2, labW - 10, 'right'];
        this.units$.forEach((u, idx) => { if (u.g === g) pos[idx] = [labW + (u.k % perRow) * step, y + Math.floor(u.k / perRow) * step]; });
      });
      return { s, h: order.length * bh, pos, labels };
    }
  }

  /* ======================================================================================
   * Guessline: draw your guess, then see the real line
   * data = { question, unit?, prefix?, suffix?, points:[{x:label, y:number}], known: index of last shown point, yMax?, source? }
   * ====================================================================================== */
  class Guessline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { height: 340 });
      this.pts = data.points.map(p => ({ x: p.x, y: +p.y }));
      this.known = clamp(data.known != null ? data.known : Math.floor(this.pts.length / 2), 0, this.pts.length - 2);
      this.guess = new Array(this.pts.length).fill(null);
      for (let i = 0; i <= this.known; i++) this.guess[i] = this.pts[i].y;
      const ys = this.pts.map(p => p.y);
      this.yMax = data.yMax || niceMax(Math.max(...ys) * 1.25);
      this.revealed = false;
      el.innerHTML = (data.question ? '<p class="dc-note" style="margin:0 0 10px;font-size:16px;font-weight:700">' + esc(data.question) + '</p>' : '') +
        '<svg class="gl-svg" role="img"></svg><div class="dc-bar" style="margin-top:10px"><button type="button" class="dc-btn on gl-show" disabled>Show me</button><button type="button" class="dc-btn gl-skip">Skip and show</button><button type="button" class="dc-btn gl-again" hidden>Try again</button></div><p class="dc-note gl-note" aria-live="polite">Draw your guess for the rest of the line in the shaded area, then press Show me.</p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.gl-note'); this.$show = el.querySelector('.gl-show');
      el.querySelector('.gl-skip').onclick = () => this.reveal(true);
      this.$show.onclick = () => this.reveal(false);
      el.querySelector('.gl-again').onclick = () => this.reset();
      this._bind();
      this.render();
    }
    _resize() { this.render(); }
    reset() {
      this.revealed = false; this._prog = 0;
      for (let i = this.known + 1; i < this.pts.length; i++) this.guess[i] = null;
      this.$show.disabled = true; this.el.querySelector('.gl-again').hidden = true; this.el.querySelector('.gl-skip').hidden = false; this.$show.hidden = false;
      this.$note.textContent = 'Draw your guess for the rest of the line in the shaded area, then press Show me.';
      this.render();
    }
    _geom() {
      const d = this.data, W = Math.max(300, this.$svg.clientWidth || 700), H = this.o.height, padT = 18, padB = 34, n = this.pts.length;
      const widest = fmtNum(this.yMax, { prefix: d.prefix, suffix: d.suffix, compact: true }).length, padL = Math.round(widest * 6.9 + 16), padR = Math.max(24, String(this.pts[n - 1].x).length * 3.6 + 6);
      return { W, H, padL, padR, padT, padB, x: i => padL + (i / (n - 1)) * (W - padL - padR), y: v => padT + (1 - v / this.yMax) * (H - padT - padB), v: py => clamp((1 - (py - padT) / (H - padT - padB)) * this.yMax, 0, this.yMax) };
    }
    _bind() {
      const svg = this.$svg;
      const draw = e => {
        if (this.revealed) return;
        const r = svg.getBoundingClientRect(), G = this._geom(), sx = (e.clientX - r.left) * (G.W / r.width), sy = (e.clientY - r.top) * (G.H / r.height);
        const n = this.pts.length, idx = Math.round(((sx - G.padL) / (G.W - G.padL - G.padR)) * (n - 1));
        if (idx <= this.known || idx >= n) return;
        const v = G.v(sy);
        // fill any skipped points between the last drawn one and this one
        let last = this._lastIdx != null ? this._lastIdx : this.known;
        if (last < this.known) last = this.known;
        const lv = this.guess[last] != null ? this.guess[last] : v;
        const a = Math.min(last, idx), b = Math.max(last, idx);
        for (let i = a + 1; i <= b; i++) this.guess[i] = idx === last ? v : lv + (v - lv) * ((i - last) / (idx - last));
        this.guess[idx] = v; this._lastIdx = idx;
        this.$show.disabled = this.guess.slice(this.known + 1).some(g => g == null);
        if (!this.$show.disabled) this.$note.textContent = 'Happy with that? Press Show me.';
        this.render();
      };
      svg.addEventListener('pointerdown', e => { if (this.revealed) return; svg.setPointerCapture(e.pointerId); this._drawing = true; this._lastIdx = null; draw(e); });
      svg.addEventListener('pointermove', e => { if (this._drawing) draw(e); });
      svg.addEventListener('pointerup', () => { this._drawing = false; });
    }
    reveal(skipped) {
      this.revealed = true; this.skipped = skipped;
      this.$show.hidden = true; this.el.querySelector('.gl-skip').hidden = true; this.el.querySelector('.gl-again').hidden = false;
      const start = performance.now(), dur = reduced() ? 1 : 1200;
      const tick = now => { this._prog = clamp((now - start) / dur, 0, 1); this.render(); if (this._prog < 1) this._raf = requestAnimationFrame(tick); else this._score(); };
      this._raf = requestAnimationFrame(tick);
    }
    _score() {
      const d = this.data, fmt = v => fmtNum(v, { prefix: d.prefix, suffix: d.suffix });
      const last = this.pts[this.pts.length - 1];
      if (this.skipped) { this.$note.innerHTML = 'The line reaches <b>' + esc(fmt(last.y)) + '</b> in ' + esc(last.x) + '.'; this._emit('reveal', { skipped: true }); return; }
      let err = 0, cnt = 0;
      for (let i = this.known + 1; i < this.pts.length; i++) { err += Math.abs(this.guess[i] - this.pts[i].y); cnt++; }
      const avg = err / cnt, pct = (avg / this.yMax) * 100, score = Math.max(0, Math.round(100 - pct * 2.5));
      const g = this.guess[this.pts.length - 1], dir = g > last.y ? 'higher than' : 'lower than';
      const verdict = score >= 85 ? 'Very close.' : score >= 60 ? 'Not bad.' : 'Quite far off: this one surprises most people.';
      this.$note.innerHTML = verdict + ' You guessed <b>' + esc(fmt(g)) + '</b> for ' + esc(last.x) + '; the real figure is <b>' + esc(fmt(last.y)) + '</b> (' + (Math.abs(g - last.y) < this.yMax * 0.01 ? 'spot on' : dir + ' you drew') + '). Score: <b>' + score + '/100</b>.' + (d.source ? ' <span style="color:var(--di-muted,#4f6578)">Source: ' + esc(d.source) + '</span>' : '');
      this._emit('reveal', { score, guess: this.guess.slice(), actual: this.pts.map(p => p.y) });
    }
    render() {
      const T = themeOf(this.el), G = this._geom(), n = this.pts.length, d = this.data;
      this.$svg.setAttribute('viewBox', '0 0 ' + G.W + ' ' + G.H);
      this.$svg.style.height = G.H + 'px';
      let s = '';
      const ticks = 4;
      for (let k = 0; k <= ticks; k++) {
        const v = (this.yMax * k) / ticks, y = G.y(v);
        s += '<line x1="' + G.padL + '" x2="' + (G.W - G.padR) + '" y1="' + f1(y) + '" y2="' + f1(y) + '" stroke="' + T.line + '"' + (k ? ' stroke-dasharray="2 5"' : '') + '/>' +
          '<text x="' + (G.padL - 8) + '" y="' + f1(y + 4) + '" text-anchor="end" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(v, { prefix: d.prefix, suffix: d.suffix, compact: true })) + '</text>';
      }
      const step = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(G.W / 80))));
      this.pts.forEach((p, i) => { if (i % step === 0 || i === n - 1) s += '<text x="' + f1(G.x(i)) + '" y="' + (G.H - 10) + '" text-anchor="middle" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(p.x) + '</text>'; });
      const kx = G.x(this.known);
      s += '<rect class="draw" x="' + f1(kx) + '" y="' + G.padT + '" width="' + f1(G.W - G.padR - kx) + '" height="' + (G.H - G.padT - G.padB) + '" fill="' + T.accent + '" fill-opacity="' + (this.revealed ? 0.03 : 0.07) + '"/>';
      if (!this.revealed && this.guess[this.known + 1] == null) s += '<text x="' + f1((kx + G.W - G.padR) / 2) + '" y="' + f1(G.padT + 26) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + T.accent + '">Draw here</text>';
      const path = arr => arr.map((v, i) => (v == null ? null : [G.x(i), G.y(v)])).filter(Boolean).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ');
      s += '<path d="' + path(this.pts.slice(0, this.known + 1).map(p => p.y)) + '" fill="none" stroke="' + T.fg + '" stroke-width="3" stroke-linejoin="round"/>';
      const guessArr = this.guess.map((v, i) => (i >= this.known ? v : null));
      if (guessArr.filter(v => v != null).length > 1) s += '<path d="' + path(guessArr) + '" fill="none" stroke="' + T.accent + '" stroke-width="3" stroke-dasharray="7 6" stroke-linejoin="round"/>';
      if (this.revealed) {
        const p = this._prog || 0, upto = this.known + (n - 1 - this.known) * p, actual = this.pts.map((q, i) => (i >= this.known && i <= Math.ceil(upto) ? q.y : null));
        const ci = Math.ceil(upto); if (ci > this.known && ci < n) { const a = this.pts[ci - 1].y, b = this.pts[ci].y; actual[ci] = a + (b - a) * (upto - (ci - 1)); }
        s += '<path d="' + path(actual) + '" fill="none" stroke="' + T.fg + '" stroke-width="3.5" stroke-linejoin="round"/>';
        if (p >= 1) { const L = this.pts[n - 1]; s += '<circle cx="' + f1(G.x(n - 1)) + '" cy="' + f1(G.y(L.y)) + '" r="5" fill="' + T.fg + '"/><text x="' + f1(G.x(n - 1) - 8) + '" y="' + f1(G.y(L.y) - 10) + '" text-anchor="end" font-size="13" font-weight="800" fill="' + T.fg + '">' + esc(fmtNum(L.y, { prefix: d.prefix, suffix: d.suffix })) + '</text>'; }
      }
      s += '<circle cx="' + f1(kx) + '" cy="' + f1(G.y(this.pts[this.known].y)) + '" r="5" fill="' + T.fg + '"/>';
      this.$svg.innerHTML = s;
      this.$svg.setAttribute('aria-label', (d.question || 'Line chart') + (this.revealed ? '. Actual values: ' + this.pts.map(p => p.x + ' ' + p.y).join(', ') : '. Known values: ' + this.pts.slice(0, this.known + 1).map(p => p.x + ' ' + p.y).join(', ')));
    }
    _teardown() { cancelAnimationFrame(this._raf); }
  }
  function fitLabel(t, w, size) { const max = Math.max(3, Math.floor(w / (size * 0.56))); return t.length > max ? t.slice(0, max - 1) + '…' : t; }
  function niceMax(x) { if (x <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => f <= s + 1e-9)) * p; }

  /* ======================================================================================
   * Flowbank: flow (Sankey) diagram
   * data = { unit?, prefix?, nodes:[{id,label,color?}], links:[{source,target,value}] }
   * ====================================================================================== */
  class Flowbank extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { height: 460 });
      this.nodes = data.nodes.map((n, i) => Object.assign({}, n, { i, in: [], out: [] }));
      const byId = new Map(this.nodes.map(n => [n.id, n]));
      this.links = data.links.map((l, i) => ({ i, s: byId.get(l.source), t: byId.get(l.target), v: +l.value })).filter(l => l.s && l.t && l.v > 0);
      this.links.forEach(l => { l.s.out.push(l); l.t.in.push(l); });
      // column = longest path from a source
      const depth = n => (n._d != null ? n._d : (n._d = n.in.length ? 1 + Math.max(...n.in.map(l => depth(l.s))) : 0));
      this.nodes.forEach(depth);
      this.nodes.forEach(n => { n.value = Math.max(n.in.reduce((s, l) => s + l.v, 0), n.out.reduce((s, l) => s + l.v, 0)); });
      this.cols = Math.max(...this.nodes.map(n => n._d)) + 1;
      this.sel = null;
      el.innerHTML = '<svg class="fb-svg" role="img"></svg><p class="dc-note fb-note" aria-live="polite">Tap a flow or a box to follow it.</p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.fb-note');
      this.$svg.addEventListener('click', e => {
        const l = e.target.closest('.fb-link'), n = e.target.closest('.fb-node');
        if (l) this.select({ link: this.links[+l.dataset.i] }); else if (n) this.select({ node: this.nodes[+n.dataset.i] }); else this.select(null);
      });
      this.$svg.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const l = e.target.closest('.fb-link'), n = e.target.closest('.fb-node');
        if (l || n) { e.preventDefault(); this.select(l ? { link: this.links[+l.dataset.i] } : { node: this.nodes[+n.dataset.i] }); }
      });
      this.render();
    }
    _resize() { this.render(); }
    fmt(v) { return fmtNum(v, { prefix: this.data.prefix, suffix: this.data.suffix }); }
    select(s) {
      this.sel = s;
      const d = this.data;
      if (!s) this.$note.textContent = 'Tap a flow or a box to follow it.';
      else if (s.link) {
        const l = s.link, pct = l.s.value ? Math.round((100 * l.v) / l.s.value) : 0;
        this.$note.innerHTML = '<b>' + esc(this.fmt(l.v)) + '</b> goes from <b>' + esc(l.s.label) + '</b> to <b>' + esc(l.t.label) + '</b>: ' + pct + '% of ' + esc(l.s.label) + '.';
      } else {
        const n = s.node, outs = n.out.slice().sort((a, b) => b.v - a.v);
        this.$note.innerHTML = '<b>' + esc(n.label) + '</b>: ' + esc(this.fmt(n.value)) + (outs.length ? '. Biggest share goes to <b>' + esc(outs[0].t.label) + '</b> (' + Math.round((100 * outs[0].v) / n.value) + '%).' : n.in.length ? ', from ' + n.in.map(l => esc(l.s.label)).join(' and ') + '.' : '.');
      }
      this.render();
      this._emit('select', s ? (s.link ? { source: s.link.s.id, target: s.link.t.id, value: s.link.v } : { node: s.node.id, value: s.node.value }) : null);
    }
    render() {
      const T = themeOf(this.el), W = Math.max(320, this.$svg.clientWidth || 800), narrow = W < 560, H = narrow ? Math.max(this.o.height, 520) : this.o.height;
      const nodeW = 14, padY = 10, labelRoom = narrow ? 92 : 150, x0 = 4, x1 = W - labelRoom;
      const colX = c => x0 + (c / Math.max(1, this.cols - 1)) * (x1 - x0 - nodeW);
      const byCol = []; this.nodes.forEach(n => { (byCol[n._d] = byCol[n._d] || []).push(n); });
      const maxSum = Math.max(...byCol.map(col => col.reduce((s, n) => s + n.value, 0)));
      const gaps = Math.max(...byCol.map(col => col.length - 1));
      const k = (H - 20 - gaps * padY) / maxSum;
      // order nodes in each column by the weighted position of their sources (a few passes)
      byCol.forEach(col => col.forEach((n, i) => { n._o = i; }));
      for (let pass = 0; pass < 3; pass++) {
        byCol.forEach((col, c) => { if (!c) return; col.forEach(n => { const w = n.in.reduce((s, l) => s + l.v, 0); n._o = w ? n.in.reduce((s, l) => s + l.s._o * l.v, 0) / w : n._o; }); col.sort((a, b) => a._o - b._o); col.forEach((n, i) => { n._o = i; }); });
      }
      byCol.forEach((col, c) => {
        const tot = col.reduce((s, n) => s + n.value * k, 0) + (col.length - 1) * padY;
        let y = (H - tot) / 2;
        col.forEach(n => { n.x = colX(c); n.y = y; n.h = Math.max(2, n.value * k); y += n.h + padY; n._sy = n.y; n._ty = n.y; });
      });
      const col = (n) => colorFor(this.el, n, n.i);
      const S = this.sel, active = l => !S || (S.link ? S.link === l : (l.s === S.node || l.t === S.node));
      let links = '';
      this.links.slice().sort((a, b) => a.t._o - b.t._o).forEach(l => {
        const h = l.v * k, sy = l.s._sy, ty = l.t._ty; l.s._sy += h; l.t._ty += h;
        const xa = l.s.x + nodeW, xb = l.t.x, mx = (xa + xb) / 2;
        const d = 'M' + f1(xa) + ' ' + f1(sy) + ' C' + f1(mx) + ' ' + f1(sy) + ' ' + f1(mx) + ' ' + f1(ty) + ' ' + f1(xb) + ' ' + f1(ty) + ' L' + f1(xb) + ' ' + f1(ty + h) + ' C' + f1(mx) + ' ' + f1(ty + h) + ' ' + f1(mx) + ' ' + f1(sy + h) + ' ' + f1(xa) + ' ' + f1(sy + h) + ' Z';
        links += '<path class="fb-link" data-i="' + l.i + '" tabindex="0" role="button" aria-label="' + esc(l.s.label + ' to ' + l.t.label + ': ' + this.fmt(l.v)) + '" d="' + d + '" fill="' + col(l.s) + '" opacity="' + (active(l) ? 0.42 : 0.08) + '"/>';
      });
      let nodes = '';
      this.nodes.forEach(n => {
        const last = n._d === this.cols - 1, tx = last ? n.x + nodeW + 8 : n.x + nodeW + 8, sel = S && S.node === n;
        nodes += '<g class="fb-node" data-i="' + n.i + '" tabindex="0" role="button" aria-label="' + esc(n.label + ': ' + this.fmt(n.value)) + '">' +
          '<rect x="' + f1(n.x) + '" y="' + f1(n.y) + '" width="' + nodeW + '" height="' + f1(n.h) + '" rx="3" fill="' + col(n) + '"' + (sel ? ' stroke="' + T.fg + '" stroke-width="2"' : '') + '/>' +
          (n.h > 8 || last ? '<text x="' + f1(tx) + '" y="' + f1(n.y + n.h / 2 - 2) + '" font-size="' + (narrow ? 11.5 : 13) + '" font-weight="700" fill="' + T.fg + '">' + esc(n.label) + '</text><text x="' + f1(tx) + '" y="' + f1(n.y + n.h / 2 + 12) + '" font-size="11.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(this.fmt(n.value)) + '</text>' : '') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Flow diagram. ' + this.links.map(l => l.s.label + ' to ' + l.t.label + ' ' + this.fmt(l.v)).join('; '));
      this.$svg.innerHTML = links + nodes;
    }
  }

  /* ======================================================================================
   * Ledger: the living table
   * data = { columns:[{id,label,type:'text'|'number'|'bar'|'heat'|'spark'|'tag', prefix?, suffix?, decimals?}], rows:[{…, detail?}], tags?:[{id,label,color}] }
   * ====================================================================================== */
  class Ledger extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { search: true, pageHeight: 560 });
      this.cols = data.columns;
      this.rows = data.rows.map((r, i) => Object.assign({ _i: i }, r));
      this.tags = new Map((data.tags || []).map((t, i) => [t.id, Object.assign({ i }, t)]));
      const numCol = this.cols.find(c => ['number', 'bar', 'heat'].includes(c.type));
      this.sortBy = this.o.sortBy || (numCol ? numCol.id : this.cols[0].id); this.dir = this.o.dir || (numCol ? -1 : 1);
      this.q = ''; this.open = new Set();
      el.innerHTML = (this.o.search ? '<div class="lg-tools"><input type="search" placeholder="Search the table…" aria-label="Search the table"></div>' : '') +
        '<div class="lg-wrap" style="--lg-h:' + this.o.pageHeight + 'px"><table class="lg-table"><thead></thead><tbody></tbody></table></div><p class="lg-count" aria-live="polite"></p>';
      this.$head = el.querySelector('thead'); this.$body = el.querySelector('tbody'); this.$count = el.querySelector('.lg-count');
      const input = el.querySelector('input');
      if (input) input.addEventListener('input', () => { this.q = input.value.trim().toLowerCase(); this.render(); });
      this.$body.addEventListener('click', e => { const tr = e.target.closest('tr.lg-row'); if (tr) this.toggle(+tr.dataset.i); });
      this.$body.addEventListener('keydown', e => { const tr = e.target.closest('tr.lg-row'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.toggle(+tr.dataset.i); } });
      this.render();
    }
    toggle(i) { if (this.open.has(i)) this.open.delete(i); else this.open.add(i); this.render(); const r = this.rows.find(x => x._i === i); this._emit('open', { row: r, open: this.open.has(i) }); }
    sort(id) { if (this.sortBy === id) this.dir *= -1; else { this.sortBy = id; const c = this.cols.find(x => x.id === id); this.dir = c && c.type !== 'text' && c.type !== 'tag' ? -1 : 1; } this.render(); this._emit('sort', { by: this.sortBy, dir: this.dir > 0 ? 'asc' : 'desc' }); }
    render() {
      const T = themeOf(this.el), cols = this.cols, isNum = c => ['number', 'bar', 'heat'].includes(c.type);
      const max = {}, min = {};
      cols.forEach(c => { if (isNum(c)) { const vs = this.rows.map(r => +r[c.id]).filter(isFinite); max[c.id] = Math.max(...vs); min[c.id] = Math.min(...vs); } });
      this.$head.innerHTML = '<tr>' + cols.map(c => {
        const on = this.sortBy === c.id, aria = on ? (this.dir > 0 ? 'ascending' : 'descending') : 'none';
        return '<th scope="col" class="' + (isNum(c) ? 'num' : '') + '" aria-sort="' + aria + '"><button type="button" data-c="' + esc(c.id) + '">' + esc(c.label) + '<span aria-hidden="true">' + (on ? (this.dir > 0 ? '▲' : '▼') : '') + '</span></button></th>';
      }).join('') + '</tr>';
      this.$head.querySelectorAll('button').forEach(b => b.onclick = () => this.sort(b.dataset.c));
      const q = this.q, sc = cols.find(c => c.id === this.sortBy);
      let rows = this.rows.filter(r => !q || cols.some(c => String(c.type === 'tag' && this.tags.get(r[c.id]) ? this.tags.get(r[c.id]).label : r[c.id] == null ? '' : r[c.id]).toLowerCase().includes(q)) || String(r.detail || '').toLowerCase().includes(q));
      rows.sort((a, b) => {
        const va = a[sc.id], vb = b[sc.id];
        if (isNum(sc)) return ((+va || 0) - (+vb || 0)) * this.dir;
        const la = sc.type === 'tag' && this.tags.get(va) ? this.tags.get(va).label : String(va || ''), lb = sc.type === 'tag' && this.tags.get(vb) ? this.tags.get(vb).label : String(vb || '');
        return la.localeCompare(lb) * this.dir;
      });
      const cell = (c, r) => {
        const v = r[c.id], fmt = x => fmtNum(+x, { prefix: c.prefix, suffix: c.suffix, decimals: c.decimals });
        if (c.type === 'bar') { const w = max[c.id] ? (100 * (+v || 0)) / max[c.id] : 0; const tg = r[this.cols.find(x => x.type === 'tag')?.id]; const tc = this.tags.get(tg); return '<td class="num"><div class="lg-bar" style="--c:' + (tc ? colorFor(this.el, tc, tc.i) : T.accent) + '"><i style="width:' + f1(Math.max(2, w * 0.7)) + '%"></i><span>' + esc(fmt(v)) + '</span></div></td>'; }
        if (c.type === 'heat') { const k = max[c.id] > min[c.id] ? ((+v || 0) - min[c.id]) / (max[c.id] - min[c.id]) : 0.5; return '<td class="num"><span class="lg-heat" style="background:color-mix(in srgb,' + T.accent + ' ' + Math.round(8 + k * 62) + '%,transparent);color:' + (k > 0.6 ? T.surface : T.fg) + '">' + esc(fmt(v)) + '</span></td>'; }
        if (c.type === 'number') return '<td class="num" style="font-variant-numeric:tabular-nums">' + esc(fmt(v)) + '</td>';
        if (c.type === 'spark' && Array.isArray(v)) { const a = Math.min(...v), b = Math.max(...v), w = 90, h = 24, pts = v.map((y, i) => f1((i / (v.length - 1)) * w) + ',' + f1(h - 2 - ((y - a) / ((b - a) || 1)) * (h - 4))).join(' '); return '<td><svg width="' + w + '" height="' + h + '" aria-label="' + esc(c.label + ': ' + v.join(', ')) + '"><polyline points="' + pts + '" fill="none" stroke="' + T.accent + '" stroke-width="2"/></svg></td>'; }
        if (c.type === 'tag') { const t = this.tags.get(v); return '<td><span class="lg-tag" style="--c:' + (t ? colorFor(this.el, t, t.i) : T.muted) + '"><i></i>' + esc(t ? t.label : v) + '</span></td>'; }
        return '<td' + (c === cols[0] ? ' style="font-weight:700"' : '') + '>' + esc(v) + '</td>';
      };
      this.$body.innerHTML = rows.map(r => '<tr class="lg-row" data-i="' + r._i + '" tabindex="0" aria-expanded="' + this.open.has(r._i) + '">' + cols.map(c => cell(c, r)).join('') + '</tr>' +
        (this.open.has(r._i) && r.detail ? '<tr class="lg-detail"><td colspan="' + cols.length + '">' + esc(r.detail) + '</td></tr>' : '')).join('');
      this.$count.textContent = rows.length === this.rows.length ? this.rows.length + ' rows · tap a row for more' : rows.length + ' of ' + this.rows.length + ' rows match';
    }
  }

  /* ======================================================================================
   * Storyscroll: a sticky chart that changes as the reader scrolls
   * data = { items:[{id,label,value,group?}], groups?:[{id,label,color?}], unit?, steps:[{title?, text, highlight?:[id|groupId], sort?:'value'|'label'|'none', only?:[ids]}] }
   * ====================================================================================== */
  class Storyscroll extends Base {
    constructor(el, data, opts) {
      // opts.stickyTop: height in px of any sticky header the chart must stay below
      super(el, data, opts, { height: 420, stickyTop: 0 });
      el.style.setProperty('--ss-top', (+this.o.stickyTop || 0) + 'px');
      this.items = data.items.map((it, i) => Object.assign({}, it, { i }));
      this.groups = new Map((data.groups || []).map((g, i) => [g.id, Object.assign({ i }, g)]));
      this.stepIdx = 0;
      el.innerHTML = '<div class="ss" style="--ss-h:' + this.o.height + 'px"><div class="ss-steps"></div><div class="ss-graphic" aria-live="polite"><svg role="img"></svg></div></div>';
      this.$steps = el.querySelector('.ss-steps'); this.$svg = el.querySelector('svg');
      this.$steps.innerHTML = data.steps.map((s, i) => '<section class="ss-step" data-i="' + i + '" tabindex="0">' + (s.title ? '<h4>' + esc(s.title) + '</h4>' : '') + '<p>' + esc(s.text) + '</p></section>').join('');
      this.io = new IntersectionObserver(ents => {
        ents.forEach(e => { if (e.isIntersecting) this.go(+e.target.dataset.i); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      this.$steps.querySelectorAll('.ss-step').forEach(s => { this.io.observe(s); s.addEventListener('focus', () => this.go(+s.dataset.i)); });
      this.render();
    }
    _resize() { this.render(); }
    go(i) {
      if (i === this.stepIdx && this._drawn) return;
      this.stepIdx = i;
      this.$steps.querySelectorAll('.ss-step').forEach(s => s.classList.toggle('on', +s.dataset.i === i));
      this.render();
      this._emit('step', { index: i, total: this.data.steps.length });
    }
    render() {
      this._drawn = true;
      const T = themeOf(this.el), step = this.data.steps[this.stepIdx] || {}, W = Math.max(280, this.$svg.clientWidth || 500), H = Math.max(220, this.$svg.clientHeight || this.o.height);
      const hl = step.highlight ? new Set(step.highlight) : null;
      let items = this.items.filter(it => !step.only || step.only.includes(it.id));
      if (step.sort === 'value') items = items.slice().sort((a, b) => b.value - a.value);
      else if (step.sort === 'label') items = items.slice().sort((a, b) => String(a.label).localeCompare(String(b.label)));
      const max = Math.max(...items.map(i => i.value)) || 1, labW = Math.min(150, W * 0.36), gap = 6, rh = Math.min(42, (H - 20 - gap * (items.length - 1)) / items.length);
      const total = this.items.reduce((s, i) => s + i.value, 0);
      let s = '';
      items.forEach((it, r) => {
        const y = 10 + r * (rh + gap), w = ((W - labW - 70) * it.value) / max, g = this.groups.get(it.group);
        const on = !hl || hl.has(it.id) || (it.group && hl.has(it.group)), c = g ? colorFor(this.el, g, g.i) : colorFor(this.el, it, it.i);
        s += '<g opacity="' + (on ? 1 : 0.22) + '" style="transition:opacity .4s">' +
          '<text x="' + (labW - 8) + '" y="' + f1(y + rh / 2 + 4) + '" text-anchor="end" font-size="' + (rh < 22 ? 11.5 : 13) + '" font-weight="700" fill="' + T.fg + '">' + esc(fitLabel(it.label, labW - 12, rh < 22 ? 11.5 : 13)) + '<title>' + esc(it.label) + '</title></text>' +
          '<rect x="' + labW + '" y="' + f1(y) + '" width="' + f1(Math.max(3, w)) + '" height="' + f1(rh) + '" rx="5" fill="' + c + '" style="transition:width .6s"/>' +
          '<text x="' + f1(labW + Math.max(3, w) + 6) + '" y="' + f1(y + rh / 2 + 4) + '" font-size="12" font-weight="700" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(it.value)) + (on && hl ? ' · ' + Math.round((100 * it.value) / total) + '%' : '') + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      this.$svg.setAttribute('aria-label', (step.title || 'Chart') + ': ' + items.map(i => i.label + ' ' + i.value).join(', '));
      this.$svg.innerHTML = s;
    }
    _teardown() { this.io.disconnect(); }
  }

  return { Rankrace, Peoplegrid, Guessline, Flowbank, Ledger, Storyscroll };
});
