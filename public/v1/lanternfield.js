/*! Lanternfield 1.0 · Dimau Infographics. Exploratory infographic engine, no dependencies.
 *
 *  const lf = new Lanternfield(element, data, { lensRadius: 115 });
 *  lf.on('open' | 'progress' | 'pins' | 'lens' | 'focus' | 'tour' | 'statechange' | 'reset', handler);
 *  lf.open(id) · lf.focus(id) · lf.suggestNext() · lf.search(q) · lf.pinLens() · lf.pinAtNode(id, r)
 *  lf.removePin(id) · lf.clearPins() · lf.setLensRadius(px) · lf.fit() · lf.destroy()
 *  lf.getState() · lf.setState(state) · lf.reset()
 *  lf.tourStart(tour) · lf.tourNext() · lf.tourPrev() · lf.tourGo(i) · lf.tourStop()
 *
 *  Theme through CSS custom properties on the element (or any ancestor):
 *  --lf-bg --lf-fg --lf-muted --lf-line --lf-line-strong --lf-fog --lf-fog-alpha
 *  --lf-lens --lf-lens-bg --lf-font --lf-display --lf-mono --lf-c-<clusterId>
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Lanternfield = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const angDiff = (a, b) => { let d = Math.abs(a - b) % TAU; return d > Math.PI ? TAU - d : d; };
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  const STYLE = `
.lf{position:relative;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
.lf-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;cursor:default}
.lf-canvas:focus-visible{box-shadow:inset 0 0 0 2px var(--lf-lens,var(--di-accent,#f2b84b))}
.lf-canvas.lf-point{cursor:pointer}
.lf-canvas.lf-grab{cursor:grabbing}
.lf-peek{position:absolute;left:0;top:0;width:max-content;max-width:250px;padding:10px 12px 9px;border-radius:10px;
 background:var(--lf-peek-bg,var(--di-popover,rgba(16,24,38,.95)));color:var(--lf-fg,var(--di-fg,#e6ebf2));font:13px/1.42 var(--lf-font,var(--di-font,system-ui,sans-serif));
 box-shadow:0 10px 30px rgba(0,0,0,.28);border:1px solid var(--lf-peek-border,var(--di-popover-border,rgba(255,255,255,.08)));pointer-events:none;z-index:2}
.lf-peek-eb{display:flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--lf-muted,var(--di-muted,#8a96a8))}
.lf-peek-eb i{width:8px;height:8px;border-radius:50%;flex:none}
.lf-peek-t{font-weight:600;font-size:14.5px;margin:3px 0 4px;font-family:var(--lf-display,var(--di-display,inherit));line-height:1.2}
.lf-peek-s{color:var(--lf-fg,var(--di-fg,#e6ebf2));opacity:.86}
.lf-peek-m{font:11px/1.3 var(--lf-mono,var(--di-mono,ui-monospace,monospace));color:var(--lf-muted,var(--di-muted,#8a96a8));margin-top:7px}
.lf-mini{position:absolute;left:12px;bottom:12px;border-radius:8px;cursor:crosshair;z-index:1;
 box-shadow:0 0 0 1px var(--lf-mini-border,var(--di-line,rgba(255,255,255,.12))),0 6px 18px rgba(0,0,0,.18)}
`;
  function injectStyle() {
    if (document.getElementById('lf-style')) return;
    const s = document.createElement('style');
    s.id = 'lf-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  class Lanternfield {
    constructor(el, data, opts) {
      injectStyle();
      this.el = el;
      this.o = Object.assign({ lensRadius: 115, magnify: 2.6, seed: 11, maxPins: 4, startAt: null, minimap: true }, opts || {});
      this.R = this.o.lensRadius;
      this._ev = {};
      this.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._setupData(data);
      this._layout();
      this._buildDom();
      this._readTheme();
      this._initFog();
      this.cam = { x: 0, y: 0, k: 1 };
      this.minK = 0.2; this.maxK = 4;
      this.W = 1; this.H = 1; this.dpr = 1;
      this.lens = { x: 0, y: 0 };
      this.ptr = { x: -1, y: -1, inside: false };
      this.mode = 'follow';
      this.pins = []; this.opened = []; this.current = null;
      this.seen = new Set(); this.pulses = [];
      this.hover = null; this.anim = null; this._lastReveal = null;
      this._pointers = new Map(); this._layouts = []; this._live = null;
      this.stats = { startedAt: Date.now(), opens: 0, rimJumps: 0, pinsMade: 0 };
      this._bind();
      this._resize(true);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.invalidate());
    }

    /* ---------- events ---------- */
    on(type, fn) { (this._ev[type] = this._ev[type] || []).push(fn); return this; }
    off(type, fn) { this._ev[type] = (this._ev[type] || []).filter(f => f !== fn); return this; }
    _emit(type, payload) { (this._ev[type] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }

    /* ---------- data + layout ---------- */
    _setupData(d) {
      this.clusters = d.clusters.map((c, i) => Object.assign({}, c, { i }));
      this.cById = new Map(this.clusters.map(c => [c.id, c]));
      this.nodes = d.nodes.map((n, i) => Object.assign({}, n, { i, links: [], x: 0, y: 0, vx: 0, vy: 0 }));
      this.byId = new Map(this.nodes.map(n => [n.id, n]));
      this.links = [];
      for (const l of d.links) {
        const a = this.byId.get(l.source), b = this.byId.get(l.target);
        if (!a || !b) { console.warn('Lanternfield: link refers to a missing node', l); continue; }
        const L = { a, b, label: l.label || 'relates to', cross: a.cluster !== b.cluster };
        this.links.push(L); a.links.push(L); b.links.push(L);
      }
      for (const n of this.nodes) {
        n.c = this.cById.get(n.cluster);
        if (!n.c) throw new Error('Lanternfield: node ' + n.id + ' has unknown cluster ' + n.cluster);
        n.deg = n.links.length;
        n.r = 4 + Math.sqrt(n.deg) * 1.9;
      }
    }

    neighbors(node) {
      const n = typeof node === 'string' ? this.byId.get(node) : node;
      return n.links.map(L => {
        const other = L.a === n ? L.b : L.a;
        return { node: other, label: L.label, outgoing: L.a === n, sentence: L.a.title + ' ' + L.label + ' ' + L.b.title,
          seen: this.seen.has(other), opened: this.opened.includes(other) };
      });
    }

    _layout() {
      const rand = rng(this.o.seed);
      const C = this.clusters.length, ring = 140 + 72 * C;
      this.clusters.forEach((c, i) => {
        const a = -Math.PI / 2 + (i * TAU) / C;
        c.ax = Math.cos(a) * ring; c.ay = Math.sin(a) * ring;
      });
      const N = this.nodes;
      for (const n of N) {
        if (typeof n.fx === 'number') { n.x = n.fx; n.y = n.fy; continue; }
        const a = rand() * TAU, r = rand() * 150;
        n.x = n.c.ax + Math.cos(a) * r; n.y = n.c.ay + Math.sin(a) * r;
      }
      const iters = 520;
      for (let it = 0; it < iters; it++) {
        const al = 1 - it / iters;
        for (let i = 0; i < N.length; i++) {
          for (let j = i + 1; j < N.length; j++) {
            const a = N[i], b = N[j];
            let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
            if (d2 < 1) { dx = rand() - 0.5; dy = rand() - 0.5; d2 = 1; }
            if (d2 > 260 * 260) continue;
            const d = Math.sqrt(d2), f = Math.min(6, 5200 / d2) * al;
            dx /= d; dy /= d;
            a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
          }
        }
        for (const L of this.links) {
          const a = L.a, b = L.b;
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = (d - (L.cross ? 320 : 100)) * (L.cross ? 0.0025 : 0.028) * al;
          dx /= d; dy /= d;
          a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
        }
        for (const n of N) {
          if (typeof n.fx === 'number') { n.vx = n.vy = 0; continue; }
          n.vx += (n.c.ax - n.x) * 0.022 * al; n.vy += (n.c.ay - n.y) * 0.022 * al;
          n.x += n.vx; n.y += n.vy; n.vx *= 0.55; n.vy *= 0.55;
        }
      }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const n of N) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
      this.nb = { x: x0 - 70, y: y0 - 70, w: x1 - x0 + 140, h: y1 - y0 + 140 };
      const pad = 320;
      this.bounds = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
      for (const c of this.clusters) {
        const ns = N.filter(n => n.c === c);
        c.x = ns.reduce((s, n) => s + n.x, 0) / ns.length;
        c.y = ns.reduce((s, n) => s + n.y, 0) / ns.length;
        c.spread = Math.max(...ns.map(n => Math.hypot(n.x - c.x, n.y - c.y))) + 70;
        c.count = ns.length;
        c.top = Math.min(...ns.map(n => n.y));
      }
    }

    /* ---------- DOM + theme ---------- */
    _buildDom() {
      this.el.classList.add('lf');
      const cv = (this.canvas = document.createElement('canvas'));
      cv.className = 'lf-canvas';
      cv.tabIndex = 0;
      cv.setAttribute('role', 'application');
      cv.setAttribute('aria-label', 'Explorable map. Arrow keys pan, plus and minus zoom, Enter opens the topic under the lantern, P pins the lantern.');
      this.ctx = cv.getContext('2d');
      this.peek = document.createElement('div');
      this.peek.className = 'lf-peek';
      this.peek.hidden = true;
      this.el.append(cv, this.peek);
      if (this.o.minimap) {
        this.mini = document.createElement('canvas');
        this.mini.className = 'lf-mini';
        this.mini.setAttribute('aria-hidden', 'true');
        this.mctx = this.mini.getContext('2d');
        this.el.append(this.mini);
      }
    }

    _readTheme() {
      const cs = getComputedStyle(this.el);
      const v = n => (cs.getPropertyValue(n) || '').trim();
      // Lanternfield-specific tokens win; shared Dimau Infographics tokens (--di-*) are the fallback.
      const DI = {'--lf-bg': '--di-bg', '--lf-fg': '--di-fg', '--lf-muted': '--di-muted', '--lf-line': '--di-line', '--lf-line-strong': '--di-line-strong', '--lf-fog': '--di-fog', '--lf-fog-alpha': '--di-fog-alpha', '--lf-lens': '--di-accent', '--lf-lens-bg': '--di-surface', '--lf-font': '--di-font', '--lf-display': '--di-display', '--lf-mono': '--di-mono', '--lf-peek-bg': '--di-popover', '--lf-peek-border': '--di-popover-border', '--lf-mini-border': '--di-line'};
      const g = (n, f) => v(n) || (DI[n] ? v(DI[n]) : '') || f;
      this.theme = {
        bg: g('--lf-bg', '#0b111b'), fg: g('--lf-fg', '#e6ebf2'), muted: g('--lf-muted', '#8a96a8'),
        line: g('--lf-line', 'rgba(190,205,230,.16)'), lineStrong: g('--lf-line-strong', 'rgba(210,222,240,.42)'),
        fog: g('--lf-fog', '#070b12'), fogAlpha: parseFloat(g('--lf-fog-alpha', '0.8')),
        lens: g('--lf-lens', '#f2b84b'), lensBg: g('--lf-lens-bg', '#101826'),
        font: g('--lf-font', 'system-ui, sans-serif'), display: g('--lf-display', g('--lf-font', 'system-ui, sans-serif')),
        mono: g('--lf-mono', 'ui-monospace, monospace')
      };
      for (const c of this.clusters) c.col = v('--lf-c-' + c.id) || v('--di-c-' + c.id) || c.color || '#888';
    }

    /* ---------- fog of discovery ---------- */
    _initFog() {
      const b = this.bounds;
      this.fs = 0.3;
      this.fogC = document.createElement('canvas');
      this.fogC.width = Math.ceil(b.w * this.fs);
      this.fogC.height = Math.ceil(b.h * this.fs);
      this.fctx = this.fogC.getContext('2d');
      this.reveals = [];
      this._paintFog();
    }
    _paintFog() {
      const c = this.fctx;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = this.theme.fog;
      c.fillRect(0, 0, this.fogC.width, this.fogC.height);
      for (const r of this.reveals) this._revealDraw(r);
    }
    _revealDraw(r) {
      const c = this.fctx, b = this.bounds, fs = this.fs;
      const px = (r.x - b.x) * fs, py = (r.y - b.y) * fs, pr = Math.max(2, r.r * fs);
      const g = c.createRadialGradient(px, py, pr * 0.5, px, py, pr);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = g;
      c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
    reveal(x, y, r) { const R = { x, y, r }; this.reveals.push(R); this._revealDraw(R); this._changed(); }

    /* ---------- persistence ---------- */
    _changed() {
      if (this._restoring) return;
      clearTimeout(this._chT);
      this._chT = setTimeout(() => this._emit('statechange', this.getState()), 500);
    }
    /* A compact, JSON-safe snapshot of the viewer's exploration. */
    getState() {
      let rv = this.reveals;
      if (rv.length > 1500) rv = rv.slice(rv.length - 1500);
      return {
        v: 1,
        reveals: rv.map(r => [Math.round(r.x), Math.round(r.y), Math.round(r.r)]),
        seen: [...this.seen].map(n => n.id),
        opened: this.opened.map(n => n.id),
        current: this.current ? this.current.id : null,
        pins: this.pins.map(p => ({ letter: p.letter, wx: Math.round(p.wx), wy: Math.round(p.wy), wr: Math.round(p.wr), name: p.name })),
        cam: { x: Math.round(this.cam.x), y: Math.round(this.cam.y), k: +this.cam.k.toFixed(3) },
        lensRadius: this.R,
        stats: Object.assign({}, this.stats)
      };
    }
    setState(s) {
      if (!s || s.v !== 1) return false;
      this._restoring = true;
      try {
        this.reveals = (s.reveals || []).map(a => ({ x: a[0], y: a[1], r: a[2] }));
        this._paintFog();
        this.seen = new Set((s.seen || []).map(id => this.byId.get(id)).filter(Boolean));
        this.opened = (s.opened || []).map(id => this.byId.get(id)).filter(Boolean);
        this.current = this.byId.get(s.current) || null;
        this.pins = (s.pins || []).map((p, i) => Object.assign({ id: p.letter + 'r' + i }, p));
        if (s.cam && isFinite(s.cam.k)) Object.assign(this.cam, { x: s.cam.x, y: s.cam.y, k: clamp(s.cam.k, this.minK, this.maxK) });
        if (s.lensRadius) this.R = clamp(s.lensRadius, 60, 220);
        if (s.stats) Object.assign(this.stats, s.stats, { startedAt: Date.now() });
        this._lastReveal = null;
      } finally { this._restoring = false; }
      this._emit('lens', this.R);
      this._emitPins();
      this._emitProgress();
      if (this.current) this._emit('open', { node: this.current, cluster: this.current.c, neighbors: this.neighbors(this.current), path: this.opened.slice() });
      this.invalidate();
      return true;
    }
    reset() {
      this.reveals = []; this._paintFog();
      this.seen = new Set(); this.opened = []; this.current = null; this.pins = [];
      this.stats = { startedAt: Date.now(), opens: 0, rimJumps: 0, pinsMade: 0 };
      this._lastReveal = null; this.tourStop();
      this._emitPins(); this._emitProgress(); this._emit('reset', {});
      this.fit(true); this._changed();
    }

    /* ---------- guided tours ----------
       tour = { title, steps: [ { node:'id', note:'…', open?:true } | { pins:['idA','idB'], note:'…', radius?:150 } ] } */
    tourStart(tour) {
      if (!tour || !tour.steps || !tour.steps.length) return;
      this.tour = { tour, i: -1 };
      this.tourGo(0);
    }
    tourGo(i) {
      if (!this.tour) return;
      const steps = this.tour.tour.steps;
      i = clamp(i, 0, steps.length - 1);
      this.tour.i = i;
      const s = steps[i];
      if (s.pins) {
        this.pins = [];
        const r = s.radius || 150;
        const nodes = s.pins.map(id => this.byId.get(id)).filter(Boolean);
        nodes.forEach(n => this.pinAtWorld(n.x, n.y, r));
        if (nodes.length) {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          for (const n of nodes) { x0 = Math.min(x0, n.x - r); y0 = Math.min(y0, n.y - r); x1 = Math.max(x1, n.x + r); y1 = Math.max(y1, n.y + r); }
          const k = clamp(Math.min(this.W / (x1 - x0 + 160), this.H / (y1 - y0 + 160)), this.minK, this.maxK);
          // park the live lantern out of the way so the pins read clearly
          this.lens.x = this.W + this.R + 60; this.lens.y = this.H + this.R + 60;
          this._fly({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, k });
        }
      } else if (s.node) {
        if (s.open !== false) this.open(s.node, { zoom: s.zoom || 1.25 });
        else this.focus(s.node, { zoom: s.zoom || 1.25 });
      }
      this._emit('tour', { title: this.tour.tour.title, index: i, total: steps.length, step: s, bridges: s.pins ? this.bridges() : null });
    }
    tourNext() { if (this.tour) this.tourGo(this.tour.i + 1); }
    tourPrev() { if (this.tour) this.tourGo(this.tour.i - 1); }
    tourStop() { if (!this.tour) return; this.tour = null; this._emit('tour', null); }

    /* ---------- camera ---------- */
    w2s(x, y) { return [(x - this.cam.x) * this.cam.k + this.W / 2, (y - this.cam.y) * this.cam.k + this.H / 2]; }
    s2w(x, y) { return [(x - this.W / 2) / this.cam.k + this.cam.x, (y - this.H / 2) / this.cam.k + this.cam.y]; }
    _fitTarget() {
      const b = this.nb, pad = 24;
      const k = Math.min((this.W - pad * 2) / b.w, (this.H - pad * 2) / b.h);
      return { x: b.x + b.w / 2, y: b.y + b.h / 2, k };
    }
    fit(animate = true) {
      const t = this._fitTarget();
      this.minK = t.k * 0.6;
      if (animate) this._fly(t); else { Object.assign(this.cam, t); this.invalidate(); }
    }
    _fly(to, dur = 800, done) {
      this.anim = { from: Object.assign({}, this.cam), to, t0: performance.now(), dur: this.reduced ? 1 : dur, done };
      this.invalidate();
    }
    zoomAt(sx, sy, f) {
      const [wx, wy] = this.s2w(sx, sy);
      const k = clamp(this.cam.k * f, this.minK, this.maxK);
      this.cam.k = k;
      this.cam.x = wx - (sx - this.W / 2) / k;
      this.cam.y = wy - (sy - this.H / 2) / k;
      this.anim = null;
      this.invalidate();
    }

    /* ---------- public actions ---------- */
    setLensRadius(r) { this.R = clamp(Math.round(r), 60, 220); this._emit('lens', this.R); this.invalidate(); }

    focus(id, o = {}) {
      const n = this.byId.get(id);
      if (!n) return null;
      let ax, ay;
      if (o.anchor) [ax, ay] = o.anchor;
      else if (this.mode === 'reticle' || !this.ptr.inside) { this.lens.x = ax = this.W / 2; this.lens.y = ay = this.H / 2; }
      else { ax = this.lens.x; ay = this.lens.y; }
      const k = o.zoom ? clamp(Math.max(this.cam.k, o.zoom), this.minK, this.maxK) : this.cam.k;
      this._fly({ x: n.x - (ax - this.W / 2) / k, y: n.y - (ay - this.H / 2) / k, k }, o.duration || 800);
      this.pulse(n);
      this._emit('focus', { node: n });
      return n;
    }

    open(id, o = {}) {
      const n = this.byId.get(id);
      if (!n) return null;
      if (!this.opened.includes(n)) this.opened.push(n);
      this.current = n;
      this.stats.opens++;
      this.seen.add(n);
      this.reveal(n.x, n.y, 190);
      if (o.fly !== false) this.focus(id, { zoom: o.zoom || 1.15 });
      this._emit('open', { node: n, cluster: n.c, neighbors: this.neighbors(n), path: this.opened.slice() });
      this._emitProgress();
      this.invalidate();
      return n;
    }

    pulse(n) { this.pulses.push({ n, t0: performance.now() }); this.invalidate(); }

    search(q) {
      q = (q || '').trim().toLowerCase();
      if (!q) return [];
      return this.nodes.map(n => {
        const t = n.title.toLowerCase();
        const s = t.startsWith(q) ? 4 : t.includes(q) ? 3 : n.c.label.toLowerCase().startsWith(q) ? 2 : (n.summary || '').toLowerCase().includes(q) ? 1 : 0;
        return { n, s };
      }).filter(r => r.s).sort((a, b) => b.s - a.s || b.n.deg - a.n.deg).slice(0, 8).map(r => r.n);
    }

    /* Frontier pick: an unopened topic most tied to what the viewer already opened. */
    suggestNext() {
      const visited = new Set(this.opened);
      let best = null, bestScore = -Infinity, because = [];
      for (const n of this.nodes) {
        if (visited.has(n)) continue;
        let s = 0; const via = [];
        for (const L of n.links) {
          const o = L.a === n ? L.b : L.a;
          if (visited.has(o)) { s += 3; via.push(o); } else if (this.seen.has(o)) s += 0.4;
        }
        if (!this.seen.has(n)) s += 1.2;
        s += n.deg * 0.12;
        if (!visited.size) s = n.deg + (this.seen.has(n) ? 0 : 0.5);
        if (s > bestScore) { bestScore = s; best = n; because = via; }
      }
      if (best) this.focus(best.id, { zoom: 1.15 });
      return best ? { node: best, because } : null;
    }

    pinAt(sx, sy) {
      const [wx, wy] = this.s2w(sx, sy);
      return this.pinAtWorld(wx, wy, this.R / this.cam.k);
    }
    pinAtNode(id, worldRadius) {
      const n = this.byId.get(id);
      return n ? this.pinAtWorld(n.x, n.y, worldRadius || 150) : null;
    }
    pinAtWorld(wx, wy, wr) {
      if (this.pins.length >= this.o.maxPins) this.pins.shift();
      const used = new Set(this.pins.map(p => p.letter));
      const letter = 'ABCDEFGH'.split('').find(l => !used.has(l));
      let near = null, nd = Infinity;
      for (const n of this.nodes) { const d = Math.hypot(n.x - wx, n.y - wy); if (d < nd) { nd = d; near = n; } }
      const pin = { id: letter + Date.now().toString(36), letter, wx, wy, wr, name: near ? near.title : 'Area ' + letter };
      this.pins.push(pin);
      this.stats.pinsMade++;
      this.reveal(wx, wy, wr);
      this._emitPins();
      this.invalidate();
      return pin;
    }
    pinLens() { return this.pinAt(this.lens.x, this.lens.y); }
    removePin(id) { this.pins = this.pins.filter(p => p.id !== id); this._emitPins(); this.invalidate(); }
    clearPins() { this.pins = []; this._emitPins(); this.invalidate(); }
    _inPin(p, n) { return Math.hypot(n.x - p.wx, n.y - p.wy) < p.wr; }
    bridges() {
      const out = [];
      for (let i = 0; i < this.pins.length; i++) {
        for (let j = i + 1; j < this.pins.length; j++) {
          const A = this.pins[i], B = this.pins[j], list = [];
          for (const L of this.links) {
            const aA = this._inPin(A, L.a), aB = this._inPin(B, L.a), bA = this._inPin(A, L.b), bB = this._inPin(B, L.b);
            if ((aA && bB && !(aB && bA)) || (aB && bA && !(aA && bB))) list.push(L);
          }
          if (list.length) out.push({ a: A, b: B, links: list.map(L => ({ from: L.a, to: L.b, label: L.label, sentence: L.a.title + ' ' + L.label + ' ' + L.b.title })) });
        }
      }
      return out;
    }
    _emitPins() { this._emit('pins', { pins: this.pins.slice(), bridges: this.bridges() }); this._changed(); }

    progress() {
      const perCluster = this.clusters.map(c => ({ cluster: c, total: c.count, seen: this.nodes.filter(n => n.c === c && this.seen.has(n)).length }));
      return { seen: this.seen.size, opened: this.opened.length, total: this.nodes.length, perCluster, stats: Object.assign({ seconds: Math.round((Date.now() - this.stats.startedAt) / 1000) }, this.stats) };
    }
    _emitProgress() {
      if (this._progQueued) return;
      this._progQueued = true;
      Promise.resolve().then(() => { this._progQueued = false; this._emit('progress', this.progress()); });
    }

    /* ---------- input ---------- */
    _pos(e) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    _setMode(type) {
      const m = type === 'touch' ? 'reticle' : 'follow';
      if (m !== this.mode) { this.mode = m; if (m === 'reticle') { this.lens.x = this.W / 2; this.lens.y = this.H / 2; } }
    }
    _bind() {
      const cv = this.canvas, H = (this._handlers = {});
      H.down = e => {
        cv.focus({ preventScroll: true });
        try { cv.setPointerCapture(e.pointerId); } catch (_) {}
        const p = this._pos(e);
        this._pointers.set(e.pointerId, p);
        this._setMode(e.pointerType);
        if (this._pointers.size === 1) {
          this._drag = { x: p.x, y: p.y, cx: this.cam.x, cy: this.cam.y, moved: false };
        } else if (this._pointers.size === 2) {
          const [a, b] = [...this._pointers.values()];
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const [wx, wy] = this.s2w(mid.x, mid.y);
          this._pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: this.cam.k, wx, wy };
          this._drag = null;
        }
        this.anim = null;
      };
      H.move = e => {
        const p = this._pos(e);
        if (this._pointers.has(e.pointerId)) this._pointers.set(e.pointerId, p);
        if (e.pointerType !== 'touch') {
          if (this.mode !== 'follow') this._setMode(e.pointerType);
          this.ptr.x = p.x; this.ptr.y = p.y; this.ptr.inside = true;
          if (!this._drag || !this._drag.moved) this._leash(p);
        }
        if (this._pinch && this._pointers.size >= 2) {
          const [a, b] = [...this._pointers.values()];
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const k = clamp(this._pinch.k * (Math.hypot(a.x - b.x, a.y - b.y) / this._pinch.d), this.minK, this.maxK);
          this.cam.k = k;
          this.cam.x = this._pinch.wx - (mid.x - this.W / 2) / k;
          this.cam.y = this._pinch.wy - (mid.y - this.H / 2) / k;
        } else if (this._drag) {
          const dx = p.x - this._drag.x, dy = p.y - this._drag.y;
          if (!this._drag.moved && Math.hypot(dx, dy) > 5) { this._drag.moved = true; cv.classList.add('lf-grab'); }
          if (this._drag.moved) { this.cam.x = this._drag.cx - dx / this.cam.k; this.cam.y = this._drag.cy - dy / this.cam.k; }
        }
        this.invalidate();
      };
      H.up = e => {
        const p = this._pos(e);
        this._pointers.delete(e.pointerId);
        if (this._pointers.size < 2) this._pinch = null;
        if (this._pointers.size === 1) {
          const q = [...this._pointers.values()][0];
          this._drag = { x: q.x, y: q.y, cx: this.cam.x, cy: this.cam.y, moved: true };
        } else if (this._pointers.size === 0 && this._drag) {
          if (!this._drag.moved && e.type === 'pointerup') this._tap(p, e.pointerType);
          this._drag = null;
          cv.classList.remove('lf-grab');
        }
        this.invalidate();
      };
      H.leave = e => { if (e.pointerType !== 'touch') { this.ptr.inside = false; this.invalidate(); } };
      H.wheel = e => {
        e.preventDefault();
        const p = this._pos(e);
        this.zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
      };
      H.dbl = e => { e.preventDefault(); this.pinLens(); };
      H.key = e => {
        const step = 70 / this.cam.k;
        const keys = {
          ArrowLeft: () => (this.cam.x -= step), ArrowRight: () => (this.cam.x += step),
          ArrowUp: () => (this.cam.y -= step), ArrowDown: () => (this.cam.y += step),
          '+': () => this.zoomAt(this.lens.x, this.lens.y, 1.2), '=': () => this.zoomAt(this.lens.x, this.lens.y, 1.2),
          '-': () => this.zoomAt(this.lens.x, this.lens.y, 1 / 1.2),
          '[': () => this.setLensRadius(this.R - 15), ']': () => this.setLensRadius(this.R + 15),
          p: () => this.pinLens(), P: () => this.pinLens(),
          Enter: () => { const h = this.hover || this._focusByCenter(); if (h) this._activate(h); }
        };
        if (keys[e.key]) { e.preventDefault(); this.anim = null; keys[e.key](); this.invalidate(); }
      };
      cv.addEventListener('pointerdown', H.down);
      cv.addEventListener('pointermove', H.move);
      cv.addEventListener('pointerup', H.up);
      cv.addEventListener('pointercancel', H.up);
      cv.addEventListener('pointerleave', H.leave);
      cv.addEventListener('wheel', H.wheel, { passive: false });
      cv.addEventListener('dblclick', H.dbl);
      cv.addEventListener('keydown', H.key);

      if (this.mini) {
        const go = e => {
          const r = this.mini.getBoundingClientRect(), b = this.bounds;
          const s = this.mw / b.w;
          this.cam.x = b.x + (e.clientX - r.left) / s;
          this.cam.y = b.y + (e.clientY - r.top) / s;
          this.anim = null; this.invalidate();
        };
        H.mdown = e => { e.stopPropagation(); try { this.mini.setPointerCapture(e.pointerId); } catch (_) {} this._miniDrag = true; go(e); };
        H.mmove = e => { if (this._miniDrag) go(e); };
        H.mup = () => { this._miniDrag = false; };
        this.mini.addEventListener('pointerdown', H.mdown);
        this.mini.addEventListener('pointermove', H.mmove);
        this.mini.addEventListener('pointerup', H.mup);
      }

      this._ro = new ResizeObserver(() => this._resize(false));
      this._ro.observe(this.el);
      const retheme = () => { this._readTheme(); this._paintFog(); this.invalidate(); };
      this._mq = window.matchMedia('(prefers-color-scheme: dark)');
      this._mq.addEventListener && this._mq.addEventListener('change', retheme);
      this._mo = new MutationObserver(retheme);
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      this._retheme = retheme;
    }

    /* The leash: inside the rim the pointer roams freely; past it, the lantern is pulled along. */
    _leash(p) {
      const leash = this.R + 30;
      const dx = p.x - this.lens.x, dy = p.y - this.lens.y, d = Math.hypot(dx, dy);
      if (d > leash) { this.lens.x += (dx / d) * (d - leash); this.lens.y += (dy / d) * (d - leash); }
    }

    _tap(p, type) {
      for (const L of this._layouts) {
        if (L.pin && L.close && Math.hypot(p.x - L.close[0], p.y - L.close[1]) < 12) { this.removePin(L.pin.id); return; }
      }
      const h = this._hitAt(p.x, p.y);
      if (h) { this._activate(h); return; }
      if (type === 'touch') {
        const [wx, wy] = this.s2w(p.x, p.y);
        this._fly({ x: wx, y: wy, k: this.cam.k }, 450);
      }
    }
    _activate(h) {
      if (h.kind === 'tick') {
        this.stats.rimJumps++;
        const anchor = this.mode === 'reticle' ? [this.W / 2, this.H / 2] : [this.lens.x, this.lens.y];
        this.focus(h.n.id, { anchor, duration: 700 });
      } else this.open(h.n.id, { fly: false });
    }

    /* ---------- lens geometry ---------- */
    _lensLayout(cx, cy, R, pin) {
      const m = this.o.magnify, k = this.cam.k;
      const [wx, wy] = this.s2w(cx, cy), wr = R / k;
      const items = [], pos = new Map();
      for (const n of this.nodes) {
        const dx = n.x - wx, dy = n.y - wy, d = Math.hypot(dx, dy);
        if (d >= wr) continue;
        const x = d / wr, fx = ((m + 1) * x) / (m * x + 1);
        const mag = (m + 1) / Math.pow(m * x + 1, 2);
        const px = d > 0 ? cx + (dx / d) * fx * R : cx, py = d > 0 ? cy + (dy / d) * fx * R : cy;
        const r = Math.max(3.5, Math.min(n.r * k, 9)) * (0.8 + 0.42 * Math.min(mag, m + 1));
        const it = { n, x: px, y: py, mag, r };
        items.push(it); pos.set(n, it);
      }
      const outMap = new Map();
      for (const it of items) {
        for (const Lk of it.n.links) {
          const o = Lk.a === it.n ? Lk.b : Lk.a;
          if (pos.has(o)) continue;
          let e = outMap.get(o);
          if (!e) {
            const [ox, oy] = this.w2s(o.x, o.y);
            const ang = Math.atan2(oy - cy, ox - cx);
            e = { n: o, ang, tx: cx + Math.cos(ang) * R, ty: cy + Math.sin(ang) * R, from: [], links: [] };
            outMap.set(o, e);
          }
          e.from.push(it); e.links.push(Lk);
        }
      }
      const outs = [...outMap.values()];
      // rim labels: most-connected first, spaced by angle
      const c = this.ctx;
      c.font = '500 11px ' + this.theme.font;
      const maxL = pin ? 4 : 8, minGap = 15 / (R + 16), labels = [];
      const ranked = outs.slice().sort((a, b) => b.from.length - a.from.length || b.n.deg - a.n.deg);
      for (const e of ranked) {
        if (labels.length >= maxL) break;
        if (pin && (angDiff(e.ang, -Math.PI * 0.75) < 0.35 || angDiff(e.ang, -Math.PI * 0.25) < 0.35)) continue;
        if (labels.some(l => angDiff(l.e.ang, e.ang) < minGap)) continue;
        const text = trunc(e.n.title, 22), w = c.measureText(text).width;
        const rr = R + 11, x = cx + Math.cos(e.ang) * rr, y = cy + Math.sin(e.ang) * rr;
        const left = Math.cos(e.ang) >= -0.05;
        labels.push({ e, text, x, y, align: left ? 'left' : 'right', rect: [left ? x - 2 : x - w - 2, y - 9, w + 4, 18] });
      }
      const L = { cx, cy, R, wx, wy, wr, items, pos, outs, labels, pin };
      if (pin) {
        L.badge = [cx + Math.cos(-Math.PI * 0.75) * R, cy + Math.sin(-Math.PI * 0.75) * R];
        L.close = [cx + Math.cos(-Math.PI * 0.25) * R, cy + Math.sin(-Math.PI * 0.25) * R];
      }
      return L;
    }

    _hitAt(px, py) {
      const ls = this._layouts;
      for (let i = ls.length - 1; i >= 0; i--) {
        const L = ls[i];
        for (const e of L.outs) if (Math.hypot(px - e.tx, py - e.ty) < 11) return { kind: 'tick', n: e.n, e, L };
        for (const l of L.labels) {
          const r = l.rect;
          if (px >= r[0] && px <= r[0] + r[2] && py >= r[1] && py <= r[1] + r[3]) return { kind: 'tick', n: l.e.n, e: l.e, L };
        }
      }
      let best = null, bd = Infinity;
      for (let i = ls.length - 1; i >= 0; i--) {
        const L = ls[i];
        if (Math.hypot(px - L.cx, py - L.cy) > L.R) continue;
        for (const it of L.items) {
          const d = Math.hypot(px - it.x, py - it.y);
          if (d < Math.max(13, it.r + 7) && d < bd) { bd = d; best = { kind: 'node', n: it.n, it, L }; }
        }
        if (best) return best;
      }
      return null;
    }
    _focusByCenter() {
      const L = this._live || this._layouts[this._layouts.length - 1];
      if (!L) return null;
      let best = null, bd = L.R * 0.42;
      for (const it of L.items) { const d = Math.hypot(it.x - L.cx, it.y - L.cy); if (d < bd) { bd = d; best = { kind: 'node', n: it.n, it, L }; } }
      return best;
    }
    _computeHover() {
      if (this._drag && this._drag.moved) return null;
      if (this.mode === 'follow' && this.ptr.inside) return this._hitAt(this.ptr.x, this.ptr.y);
      return this._focusByCenter();
    }

    /* ---------- frame loop ---------- */
    invalidate() { if (!this._raf) this._raf = requestAnimationFrame(t => { this._raf = 0; this._frame(t); }); }
    _frame(now) {
      let more = false;
      if (this.anim) {
        const a = this.anim, p = clamp((now - a.t0) / a.dur, 0, 1), e = easeInOut(p);
        this.cam.x = a.from.x + (a.to.x - a.from.x) * e;
        this.cam.y = a.from.y + (a.to.y - a.from.y) * e;
        this.cam.k = Math.exp(Math.log(a.from.k) + (Math.log(a.to.k) - Math.log(a.from.k)) * e);
        if (p < 1) more = true; else { this.anim = null; a.done && a.done(); }
      }
      this.pulses = this.pulses.filter(p => now - p.t0 < 1600);
      if (this.pulses.length) more = true;
      this._render(now);
      if (more) this.invalidate();
    }

    _resize(first) {
      const r = this.el.getBoundingClientRect();
      const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const prevW = this.W, prevH = this.H;
      this.W = W; this.H = H; this.dpr = dpr;
      this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
      if (this.mini) {
        const b = this.bounds;
        this.mw = W < 560 ? 104 : 164;
        this.mh = Math.round(this.mw * (b.h / b.w));
        this.mini.width = Math.round(this.mw * dpr); this.mini.height = Math.round(this.mh * dpr);
        this.mini.style.width = this.mw + 'px'; this.mini.style.height = this.mh + 'px';
      }
      const t = this._fitTarget();
      this.minK = t.k * 0.6;
      if (first) {
        Object.assign(this.cam, t);
        const start = this.byId.get(this.o.startAt) || this.nodes.slice().sort((a, b) => b.deg - a.deg)[0];
        const [sx, sy] = this.w2s(start.x, start.y);
        this.lens.x = sx; this.lens.y = sy;
      } else {
        this.lens.x *= W / prevW; this.lens.y *= H / prevH;
      }
      if (this.mode === 'reticle') { this.lens.x = W / 2; this.lens.y = H / 2; }
      this._render(performance.now());
    }

    /* ---------- drawing ---------- */
    _render(now) {
      const c = this.ctx, T = this.theme, k = this.cam.k, W = this.W, H = this.H;
      if (this.mode === 'reticle') { this.lens.x = W / 2; this.lens.y = H / 2; }
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = T.bg; c.fillRect(0, 0, W, H);

      // layouts first, so hover and drawing agree
      const pinL = this.pins.map(p => { const [sx, sy] = this.w2s(p.wx, p.wy); return this._lensLayout(sx, sy, p.wr * k, p); });
      let docked = null;
      for (const L of pinL) if (Math.hypot(this.lens.x - L.cx, this.lens.y - L.cy) < L.R * 0.8) { docked = L; break; }
      const live = docked ? null : this._lensLayout(this.lens.x, this.lens.y, this.R, null);
      this._live = live;
      this._layouts = live ? pinL.concat([live]) : pinL;
      this.hover = this._computeHover();
      this.canvas.classList.toggle('lf-point', !!(this.hover && this.mode === 'follow' && this.ptr.inside));

      // world layer
      c.save();
      c.translate(W / 2, H / 2); c.scale(k, k); c.translate(-this.cam.x, -this.cam.y);
      for (const cl of this.clusters) {
        const g = c.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.spread);
        g.addColorStop(0, cl.col); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = 0.1; c.fillStyle = g;
        c.beginPath(); c.arc(cl.x, cl.y, cl.spread, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      c.lineWidth = 1 / k;
      c.strokeStyle = T.line;
      c.beginPath();
      for (const L of this.links) { c.moveTo(L.a.x, L.a.y); c.lineTo(L.b.x, L.b.y); }
      c.stroke();
      for (const n of this.nodes) {
        c.fillStyle = n.c.col;
        c.beginPath(); c.arc(n.x, n.y, Math.max(n.r, 2.4 / k), 0, TAU); c.fill();
      }
      c.restore();

      // node labels appear when zoomed in; the fog hides the unexplored ones
      if (k > 0.95) {
        c.globalAlpha = clamp((k - 0.95) / 0.35, 0, 1);
        c.font = '500 11px ' + T.font; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.lineWidth = 3; c.strokeStyle = T.bg; c.fillStyle = T.fg;
        const placed = [];
        for (const n of this.nodes.slice().sort((a, b) => b.deg - a.deg)) {
          const [sx, sy] = this.w2s(n.x, n.y);
          if (sx < -50 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
          const t = trunc(n.title, 24), w = c.measureText(t).width, x = sx + n.r * k + 5;
          const rect = [x, sy - 7, w, 14];
          if (placed.some(p => rect[0] < p[0] + p[2] + 4 && rect[0] + rect[2] + 4 > p[0] && rect[1] < p[1] + p[3] && rect[1] + rect[3] > p[1])) continue;
          placed.push(rect);
          c.strokeText(t, x, sy); c.fillText(t, x, sy);
        }
        c.globalAlpha = 1;
      }

      // fog of discovery
      const b = this.bounds;
      const [bx0, by0] = this.w2s(b.x, b.y), [bx1, by1] = this.w2s(b.x + b.w, b.y + b.h);
      c.save();
      c.globalAlpha = T.fogAlpha; c.fillStyle = T.fog;
      c.beginPath(); c.rect(0, 0, W, H); c.rect(bx0, by0, bx1 - bx0, by1 - by0); c.fill('evenodd');
      c.imageSmoothingEnabled = true;
      c.drawImage(this.fogC, bx0, by0, bx1 - bx0, by1 - by0);
      c.restore();

      // cluster names sit above the fog so the territory is always legible
      const ca = k < 1.3 ? 1 : clamp(1 - (k - 1.3) / 0.9, 0, 1);
      if (ca > 0) {
        const prog = this.progress().perCluster;
        c.globalAlpha = ca; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        for (const cl of this.clusters) {
          const [sx, sy] = this.w2s(cl.x, cl.top - 22);
          const fsz = clamp(12 + 9 * k, 13, 22);
          c.font = '700 ' + fsz + 'px ' + T.display;
          if ('letterSpacing' in c) c.letterSpacing = '0.12em';
          c.fillStyle = cl.col;
          c.fillText(cl.label.toUpperCase(), sx, sy);
          if ('letterSpacing' in c) c.letterSpacing = '0px';
          const pc = prog[cl.i];
          c.font = '400 10.5px ' + T.mono; c.fillStyle = T.muted;
          c.fillText(pc.seen + ' / ' + pc.total + ' seen', sx, sy + 15);
        }
        c.globalAlpha = 1;
      }

      this._drawTrail(now);
      for (const p of this.pulses) {
        const t = ((now - p.t0) % 800) / 800, [sx, sy] = this.w2s(p.n.x, p.n.y);
        c.globalAlpha = 1 - t; c.strokeStyle = T.lens; c.lineWidth = 2;
        c.beginPath(); c.arc(sx, sy, 8 + 34 * t, 0, TAU); c.stroke();
      }
      c.globalAlpha = 1;
      this._drawBridges(pinL);
      for (const L of pinL) this._drawLens(L, false, L === docked);
      if (live) this._drawLens(live, true, false);

      this._track(live, pinL);
      this._updatePeek();
      this._drawMini();
    }

    _drawTrail() {
      const path = this.opened;
      if (!path.length) return;
      const c = this.ctx, T = this.theme;
      const pts = path.map(n => this.w2s(n.x, n.y));
      c.save();
      c.strokeStyle = T.lens; c.globalAlpha = 0.75; c.lineWidth = 1.5; c.setLineDash([4, 5]);
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
      c.font = '600 9.5px ' + T.mono; c.textAlign = 'center'; c.textBaseline = 'middle';
      pts.forEach((p, i) => {
        const n = path[i], off = n.r * this.cam.k + 9;
        const x = p[0] - off * 0.7, y = p[1] - off * 0.7;
        c.fillStyle = n === this.current ? T.lens : T.lensBg;
        c.strokeStyle = T.lens; c.lineWidth = 1.2;
        c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = n === this.current ? T.lensBg : T.lens;
        c.fillText(String(i + 1), x, y + 0.5);
        c.strokeStyle = T.fg; c.lineWidth = 1.5;
        c.beginPath(); c.arc(p[0], p[1], n.r * this.cam.k + 3, 0, TAU); c.stroke();
      });
      c.restore();
    }

    _drawBridges(pinL) {
      if (pinL.length < 2) return;
      const c = this.ctx, T = this.theme, br = this.bridges();
      const byPin = new Map(pinL.map(L => [L.pin, L]));
      c.save();
      for (const bdg of br) {
        const A = byPin.get(bdg.a), B = byPin.get(bdg.b);
        if (!A || !B) continue;
        const ang = Math.atan2(B.cy - A.cy, B.cx - A.cx), n = bdg.links.length;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        c.strokeStyle = T.lens; c.lineWidth = 1.5; c.globalAlpha = 0.6;
        for (let i = 0; i < n; i++) {
          const o = i - (n - 1) / 2, spread = 0.11;
          const p0 = [A.cx + Math.cos(ang + o * spread) * A.R, A.cy + Math.sin(ang + o * spread) * A.R];
          const p1 = [B.cx + Math.cos(ang + Math.PI - o * spread) * B.R, B.cy + Math.sin(ang + Math.PI - o * spread) * B.R];
          const mx = (p0[0] + p1[0]) / 2 + nx * o * 16, my = (p0[1] + p1[1]) / 2 + ny * o * 16;
          c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(mx, my, p1[0], p1[1]); c.stroke();
        }
        c.globalAlpha = 1;
        const mx = (A.cx + Math.cos(ang) * A.R + B.cx - Math.cos(ang) * B.R) / 2;
        const my = (A.cy + Math.sin(ang) * A.R + B.cy - Math.sin(ang) * B.R) / 2;
        const txt = bdg.a.letter + '↔' + bdg.b.letter + '  ' + n + (n === 1 ? ' link' : ' links');
        c.font = '600 11px ' + T.mono;
        const w = c.measureText(txt).width + 16;
        c.fillStyle = T.lens;
        c.beginPath(); c.roundRect ? c.roundRect(mx - w / 2, my - 11, w, 22, 11) : c.rect(mx - w / 2, my - 11, w, 22); c.fill();
        c.fillStyle = T.lensBg; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(txt, mx, my + 0.5);
      }
      c.restore();
    }

    _drawLens(L, live, docked) {
      const c = this.ctx, T = this.theme, { cx, cy, R } = L, h = this.hover;
      c.save();
      if (live || docked) {
        const g = c.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.55);
        g.addColorStop(0, T.lens); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = 0.16; c.fillStyle = g;
        c.beginPath(); c.arc(cx, cy, R * 1.55, 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
      c.beginPath(); c.arc(cx, cy, R, 0, TAU);
      c.fillStyle = T.lensBg; c.fill();
      c.save(); c.clip();
      // tinted territory inside the lens
      const counts = new Map();
      for (const it of L.items) counts.set(it.n.c, (counts.get(it.n.c) || 0) + 1);
      for (const it of L.items) {
        c.globalAlpha = 0.07; c.fillStyle = it.n.c.col;
        c.beginPath(); c.arc(it.x, it.y, 38 * Math.min(it.mag, 2.2), 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      c.strokeStyle = T.line; c.lineWidth = 1;
      for (const f of [0.38, 0.72]) { c.beginPath(); c.arc(cx, cy, R * f, 0, TAU); c.stroke(); }
      // links inside the lens
      for (const it of L.items) {
        for (const Lk of it.n.links) {
          if (Lk.a !== it.n) continue;
          const o = L.pos.get(Lk.b);
          if (!o) continue;
          const hl = h && h.kind === 'node' && (h.n === Lk.a || h.n === Lk.b);
          c.strokeStyle = hl ? T.lens : T.lineStrong; c.lineWidth = hl ? 2 : 1.1;
          c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(o.x, o.y); c.stroke();
        }
      }
      // stubs reaching toward the rim compass
      c.setLineDash([3, 4]);
      for (const e of L.outs) {
        const hl = h && ((h.kind === 'tick' && h.n === e.n) || (h.kind === 'node' && e.from.some(f => f.n === h.n)));
        c.strokeStyle = e.n.c.col; c.globalAlpha = hl ? 0.95 : 0.4; c.lineWidth = hl ? 1.8 : 1;
        for (const it of e.from) { c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(e.tx, e.ty); c.stroke(); }
      }
      c.setLineDash([]); c.globalAlpha = 1;
      // nodes
      for (const it of L.items) {
        c.fillStyle = it.n.c.col;
        c.beginPath(); c.arc(it.x, it.y, it.r, 0, TAU); c.fill();
        if (this.opened.includes(it.n)) { c.strokeStyle = T.fg; c.lineWidth = 1.5; c.beginPath(); c.arc(it.x, it.y, it.r + 3, 0, TAU); c.stroke(); }
        if (h && h.n === it.n && h.kind === 'node') { c.strokeStyle = T.lens; c.lineWidth = 2.5; c.beginPath(); c.arc(it.x, it.y, it.r + 5.5, 0, TAU); c.stroke(); }
      }
      // labels inside the lens, larger near the center
      c.textBaseline = 'middle'; c.lineWidth = 3.5; c.strokeStyle = T.lensBg;
      const placed = [];
      for (const it of L.items.slice().sort((a, b) => b.mag - a.mag)) {
        const fsz = 10.5 + 3.5 * clamp((it.mag - 0.6) / 2.6, 0, 1);
        c.font = (it.mag > 1.6 ? '600 ' : '500 ') + fsz.toFixed(1) + 'px ' + T.font;
        const t = trunc(it.n.title, 26), w = c.measureText(t).width;
        let x = it.x + it.r + 5, align = 'left';
        if (Math.hypot(x + w - cx, it.y - cy) > R - 6) { x = it.x - it.r - 5; align = 'right'; }
        const rx = align === 'left' ? x : x - w;
        if (Math.hypot((align === 'left' ? x + w : x - w) - cx, it.y - cy) > R - 4) continue;
        const rect = [rx, it.y - fsz / 2 - 1, w, fsz + 2];
        if (placed.some(p => rect[0] < p[0] + p[2] + 3 && rect[0] + rect[2] + 3 > p[0] && rect[1] < p[1] + p[3] && rect[1] + rect[3] > p[1])) continue;
        placed.push(rect);
        c.textAlign = align;
        c.globalAlpha = clamp(0.55 + it.mag * 0.2, 0.55, 1);
        c.fillStyle = T.fg;
        c.strokeText(t, x, it.y); c.fillText(t, x, it.y);
      }
      c.globalAlpha = 1;
      c.restore(); // end clip

      // rim
      c.strokeStyle = T.lens; c.lineWidth = live ? 2 : 1.5;
      if (!live) c.setLineDash([7, 5]);
      c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
      c.setLineDash([]);
      // rim compass ticks
      for (const e of L.outs) {
        const hl = h && h.kind === 'tick' && h.n === e.n;
        c.fillStyle = e.n.c.col; c.strokeStyle = T.lensBg; c.lineWidth = 2;
        c.beginPath(); c.arc(e.tx, e.ty, hl ? 6 : 4, 0, TAU); c.fill(); c.stroke();
        if (this.seen.has(e.n)) continue;
        c.strokeStyle = e.n.c.col; c.lineWidth = 1;
        c.beginPath(); c.arc(e.tx, e.ty, hl ? 9 : 7, 0, TAU); c.stroke();
      }
      c.font = '500 11px ' + T.font; c.textBaseline = 'middle'; c.lineWidth = 3; c.strokeStyle = T.bg;
      for (const l of L.labels) {
        const hl = h && h.kind === 'tick' && h.n === l.e.n;
        c.textAlign = l.align;
        c.fillStyle = hl ? T.lens : T.fg; c.globalAlpha = hl ? 1 : 0.82;
        c.strokeText(l.text, l.x, l.y); c.fillText(l.text, l.x, l.y);
      }
      c.globalAlpha = 1;
      if (L.pin) {
        const [bx, by] = L.badge, [qx, qy] = L.close;
        c.fillStyle = T.lens; c.beginPath(); c.arc(bx, by, 11, 0, TAU); c.fill();
        c.fillStyle = T.lensBg; c.font = '700 12px ' + T.display; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(L.pin.letter, bx, by + 0.5);
        c.fillStyle = T.lensBg; c.strokeStyle = T.lens; c.lineWidth = 1.5;
        c.beginPath(); c.arc(qx, qy, 9, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(qx - 3.5, qy - 3.5); c.lineTo(qx + 3.5, qy + 3.5); c.moveTo(qx + 3.5, qy - 3.5); c.lineTo(qx - 3.5, qy + 3.5); c.stroke();
      }
      c.restore();
    }

    _track(live, pinL) {
      let changed = false;
      for (const L of live ? pinL.concat([live]) : pinL) {
        for (const it of L.items) if (!this.seen.has(it.n)) { this.seen.add(it.n); changed = true; }
      }
      if (live) {
        const lr = this._lastReveal;
        if (!lr || Math.hypot(live.wx - lr.x, live.wy - lr.y) > live.wr * 0.28 || Math.abs(live.wr - lr.r) > lr.r * 0.25) {
          this.reveal(live.wx, live.wy, live.wr * 1.05);
          this._lastReveal = { x: live.wx, y: live.wy, r: live.wr };
        }
      }
      if (changed) this._emitProgress();
    }

    _updatePeek() {
      const h = this.hover, P = this.peek;
      if (!h) { P.hidden = true; this._peekKey = ''; return; }
      const key = h.kind + ':' + h.n.id + ':' + this.opened.length;
      const touch = this.mode === 'reticle';
      if (key !== this._peekKey) {
        this._peekKey = key;
        const n = h.n, sw = '<i style="background:' + esc(n.c.col) + '"></i>';
        if (h.kind === 'tick') {
          const Lk = h.e.links[0];
          P.innerHTML = '<div class="lf-peek-eb">' + sw + 'Outside the lantern · ' + esc(n.c.label) + '</div>' +
            '<div class="lf-peek-t">' + esc(n.title) + '</div>' +
            '<div class="lf-peek-s">' + esc(Lk.a.title) + ' <b>' + esc(Lk.label) + '</b> ' + esc(Lk.b.title) + '.</div>' +
            '<div class="lf-peek-m">' + (touch ? 'Tap' : 'Click') + ' to pull it into the lantern' + (this.seen.has(n) ? '' : ' · unexplored') + '</div>';
        } else {
          const opened = this.opened.includes(n);
          P.innerHTML = '<div class="lf-peek-eb">' + sw + esc(n.c.label) + '</div>' +
            '<div class="lf-peek-t">' + esc(n.title) + '</div>' +
            '<div class="lf-peek-s">' + esc(n.summary || '') + '</div>' +
            '<div class="lf-peek-m">' + n.deg + ' connections · ' + (opened ? 'opened' : (touch ? 'tap' : 'click') + ' to open') + '</div>';
        }
      }
      P.hidden = false;
      const pw = P.offsetWidth, ph = P.offsetHeight;
      let x, y;
      if (touch) { x = (this.W - pw) / 2; y = 10; }
      else {
        const ax = h.kind === 'tick' ? h.e.tx : h.it.x, ay = h.kind === 'tick' ? h.e.ty : h.it.y;
        const L = h.L, side = ax >= L.cx ? 1 : -1;
        x = side > 0 ? Math.max(ax, L.cx + L.R) + 18 : Math.min(ax, L.cx - L.R) - 18 - pw;
        if (x + pw > this.W - 8) x = L.cx - L.R - 18 - pw;
        if (x < 8) x = Math.min(this.W - pw - 8, L.cx + L.R + 18);
        y = ay - ph / 2;
      }
      x = clamp(x, 8, Math.max(8, this.W - pw - 8));
      y = clamp(y, 8, Math.max(8, this.H - ph - 8));
      P.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    }

    _drawMini() {
      if (!this.mini) return;
      const m = this.mctx, T = this.theme, b = this.bounds, mw = this.mw, mh = this.mh, s = mw / b.w;
      m.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      m.fillStyle = T.bg; m.fillRect(0, 0, mw, mh);
      for (const n of this.nodes) { m.fillStyle = n.c.col; m.beginPath(); m.arc((n.x - b.x) * s, (n.y - b.y) * s, 1.6, 0, TAU); m.fill(); }
      m.globalAlpha = T.fogAlpha; m.drawImage(this.fogC, 0, 0, mw, mh); m.globalAlpha = 1;
      m.strokeStyle = T.lens; m.lineWidth = 1;
      for (const p of this.pins) { m.setLineDash([2, 2]); m.beginPath(); m.arc((p.wx - b.x) * s, (p.wy - b.y) * s, Math.max(3, p.wr * s), 0, TAU); m.stroke(); }
      m.setLineDash([]);
      for (const n of this.opened) { m.beginPath(); m.arc((n.x - b.x) * s, (n.y - b.y) * s, 3, 0, TAU); m.stroke(); }
      const [x0, y0] = this.s2w(0, 0), [x1, y1] = this.s2w(this.W, this.H);
      m.strokeStyle = T.fg; m.globalAlpha = 0.7;
      m.strokeRect((x0 - b.x) * s, (y0 - b.y) * s, (x1 - x0) * s, (y1 - y0) * s);
      m.globalAlpha = 1;
      if (this._live) { m.fillStyle = T.lens; m.beginPath(); m.arc((this._live.wx - b.x) * s, (this._live.wy - b.y) * s, 2.5, 0, TAU); m.fill(); }
    }

    destroy() {
      const cv = this.canvas, H = this._handlers;
      cv.removeEventListener('pointerdown', H.down); cv.removeEventListener('pointermove', H.move);
      cv.removeEventListener('pointerup', H.up); cv.removeEventListener('pointercancel', H.up);
      cv.removeEventListener('pointerleave', H.leave); cv.removeEventListener('wheel', H.wheel);
      cv.removeEventListener('dblclick', H.dbl); cv.removeEventListener('keydown', H.key);
      this._ro.disconnect(); this._mo.disconnect();
      this._mq.removeEventListener && this._mq.removeEventListener('change', this._retheme);
      cancelAnimationFrame(this._raf);
      this.el.innerHTML = ''; this.el.classList.remove('lf');
    }
  }

  return Lanternfield;
});
