/*! Riverline 1.0 · Dimau Infographics
 *  Timelines as a river. The river widens where more happened, so busy periods are visible at a glance.
 *  A magnifying current follows the pointer and spreads out the years under it; the reading strip below
 *  lists what falls inside the current. Drag to travel through time, scroll or pinch to zoom.
 *
 *  const rl = new Riverline(el, { title, view:[1600, 2030], lanes:[{id,label,color}], eras:[{start,end,label}],
 *    events:[{ id, date: 1874 | '1874-10-10', when:'10 Oct 1874', title, summary, lane, weight:1..3 }] });
 *  rl.on('open' | 'range', handler) · rl.open(id) · rl.next() · rl.prev() · rl.setView(t0, t1) · rl.destroy()
 *
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-display --di-mono --di-c-<laneId>
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Riverline = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function toYear(d) {
    if (typeof d === 'number') return d;
    const m = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(String(d));
    if (!m) return NaN;
    const y = +m[1], mo = m[2] ? +m[2] - 1 : 0, da = m[3] ? +m[3] - 1 : 0;
    return y + (mo * 30.44 + da) / 365.25;
  }
  const yearLabel = y => (y < 0 ? Math.round(-y) + ' BCE' : String(Math.round(y)));
  function niceStep(span, target) {
    const raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }

  const STYLE = `
.rl{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#18202b);display:grid;gap:10px}
.rl-stage{position:relative;height:var(--rl-h,320px);border-radius:12px;overflow:hidden;background:var(--di-surface,#fff);box-shadow:0 0 0 1px var(--di-line,#cfd6de);touch-action:none}
.rl-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;cursor:grab}
.rl-stage canvas.grabbing{cursor:grabbing}
.rl-stage canvas.point{cursor:pointer}
.rl-stage canvas:focus-visible{box-shadow:inset 0 0 0 2px var(--di-accent,#2f7fd1)}
.rl-tools{position:absolute;right:10px;top:34px;display:flex;gap:6px;z-index:2}
.rl-tools button{width:30px;height:30px;border-radius:8px;border:1px solid var(--di-line,#cfd6de);background:var(--di-surface,#fff);color:var(--di-fg,#18202b);cursor:pointer;font:600 15px/1 var(--di-mono,ui-monospace,monospace)}
.rl-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--di-muted,#5a6574);margin:0;padding:0;list-style:none}
.rl-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:0}
.rl-strip{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 6px;scroll-snap-type:x proximity}
.rl-card{all:unset;box-sizing:border-box;scroll-snap-align:start;flex:0 0 220px;display:grid;gap:4px;align-content:start;padding:10px 12px;border-radius:10px;cursor:pointer;
 background:var(--di-surface,#fff);box-shadow:0 0 0 1px var(--di-line,#cfd6de);font-size:13px;line-height:1.45}
.rl-card:focus-visible{outline:2px solid var(--di-accent,#2f7fd1)}
.rl-card .w{font:600 11px var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#5a6574);display:flex;align-items:center;gap:6px}
.rl-card .w i{width:8px;height:8px;border-radius:50%}
.rl-card b{font:600 14px/1.25 var(--di-display,inherit)}
.rl-card p{margin:0;color:var(--di-muted,#5a6574);display:none}
.rl-card.on{flex-basis:300px;box-shadow:0 0 0 2px var(--di-accent,#2f7fd1)}
.rl-card.on p{display:block;color:var(--di-fg,#18202b)}
.rl-empty{font-size:13px;color:var(--di-muted,#5a6574);padding:10px 2px}
@media (max-width:560px){.rl-card{flex-basis:180px}.rl-card.on{flex-basis:250px}}
`;
  function injectStyle() {
    if (document.getElementById('rl-style')) return;
    const s = document.createElement('style'); s.id = 'rl-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Riverline {
    constructor(el, data, opts) {
      injectStyle();
      this.el = el;
      this.o = Object.assign({ height: 320, magnify: 3, current: 0.22 }, opts || {});
      this._ev = {};
      this.lanes = (data.lanes || [{ id: 'all', label: 'Events' }]).map((l, i) => Object.assign({}, l, { i }));
      this.laneById = new Map(this.lanes.map(l => [l.id, l]));
      this.eras = (data.eras || []).map(e => ({ start: toYear(e.start), end: toYear(e.end), label: e.label }));
      this.events = data.events.map((e, i) => Object.assign({}, e, { id: e.id || 'e' + i, t: toYear(e.date), w: e.weight || 1, lane: this.laneById.get(e.lane) || this.lanes[0] }))
        .filter(e => isFinite(e.t)).sort((a, b) => a.t - b.t);
      const ts = this.events.map(e => e.t);
      const pad = (Math.max(...ts) - Math.min(...ts)) * 0.04 || 1;
      this.full = [Math.min(...ts, ...this.eras.map(e => e.start)) - pad, Math.max(...ts, ...this.eras.map(e => e.end)) + pad];
      this.view = data.view ? [toYear(data.view[0]), toYear(data.view[1])] : this.full.slice();
      this.selected = null;
      this.hover = null;
      this.fx = null;
      this._build();
      this._resize();
    }

    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }

    _build() {
      this.el.classList.add('rl');
      this.el.innerHTML =
        '<div class="rl-stage" style="--rl-h:' + this.o.height + 'px"><canvas tabindex="0" role="application" aria-label="Timeline. Left and right arrows step through events, Enter opens one, plus and minus zoom."></canvas>' +
        '<div class="rl-tools"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="all" aria-label="Show everything">↔</button></div></div>' +
        '<ul class="rl-legend">' + this.lanes.map((l, i) => '<li><i style="background:var(--di-c-' + esc(l.id) + ',' + (l.color || PALETTE[i % PALETTE.length]) + ')"></i>' + esc(l.label) + '</li>').join('') + '</ul>' +
        '<div class="rl-strip" aria-live="polite"></div>';
      this.cv = this.el.querySelector('canvas');
      this.ctx = this.cv.getContext('2d');
      this.$strip = this.el.querySelector('.rl-strip');
      this.el.querySelectorAll('.rl-tools button').forEach(b => b.onclick = () => {
        const z = b.dataset.z, mid = (this.view[0] + this.view[1]) / 2;
        if (z === 'all') this.setView(this.full[0], this.full[1]);
        else this._zoomAt(mid, z === 'in' ? 0.6 : 1 / 0.6);
      });
      const cv = this.cv;
      this._ptrs = new Map();
      cv.addEventListener('pointerdown', e => {
        try { cv.setPointerCapture(e.pointerId); } catch (_) {}
        const p = this._pos(e);
        this._ptrs.set(e.pointerId, p);
        if (this._ptrs.size === 1) this._drag = { x: p.x, view: this.view.slice(), moved: false };
        else if (this._ptrs.size === 2) { const [a, b] = [...this._ptrs.values()]; this._pinch = { d: Math.abs(a.x - b.x) || 1, view: this.view.slice(), t: this._tAt((a.x + b.x) / 2) }; this._drag = null; }
      });
      cv.addEventListener('pointermove', e => {
        const p = this._pos(e);
        if (this._ptrs.has(e.pointerId)) this._ptrs.set(e.pointerId, p);
        if (this._pinch && this._ptrs.size >= 2) {
          const [a, b] = [...this._ptrs.values()];
          const f = this._pinch.d / (Math.abs(a.x - b.x) || 1), v = this._pinch.view, t = this._pinch.t;
          this._setViewRaw(t - (t - v[0]) * f, t + (v[1] - t) * f);
        } else if (this._drag) {
          const dx = p.x - this._drag.x;
          if (Math.abs(dx) > 4) { this._drag.moved = true; cv.classList.add('grabbing'); }
          if (this._drag.moved) { const v = this._drag.view, dt = (dx / this.W) * (v[1] - v[0]); this._setViewRaw(v[0] - dt, v[1] - dt); }
        }
        if (e.pointerType !== 'touch') { this.fx = p.x; this._hoverAt(p); clearTimeout(this._stT); this._stT = setTimeout(() => this._strip(), 120); }
        this.draw();
      });
      const up = e => {
        const p = this._pos(e);
        this._ptrs.delete(e.pointerId);
        if (this._ptrs.size < 2) this._pinch = null;
        if (this._drag && !this._drag.moved && e.type === 'pointerup') {
          const h = this._hit(p);
          if (h) this.open(h.id); else if (e.pointerType === 'touch') { this.fx = p.x; this.draw(); this._strip(); }
        }
        if (!this._ptrs.size) { this._drag = null; cv.classList.remove('grabbing'); this._strip(); }
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { this.hover = null; cv.classList.remove('point'); this.draw(); });
      cv.addEventListener('wheel', e => { e.preventDefault(); const p = this._pos(e); this._zoomAt(this._tAt(p.x), Math.exp(e.deltaY * 0.0015)); }, { passive: false });
      cv.addEventListener('keydown', e => {
        const k = e.key;
        if (k === 'ArrowRight') { e.preventDefault(); this.next(); }
        else if (k === 'ArrowLeft') { e.preventDefault(); this.prev(); }
        else if (k === '+' || k === '=') { e.preventDefault(); this._zoomAt(this._tAt(this.fx ?? this.W / 2), 0.7); }
        else if (k === '-') { e.preventDefault(); this._zoomAt(this._tAt(this.fx ?? this.W / 2), 1 / 0.7); }
        else if (k === 'Enter' && this.selected) { e.preventDefault(); this.open(this.selected.id); }
      });
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.el);
      const retheme = () => { this._theme(); this.draw(); };
      this._mo = new MutationObserver(retheme);
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      this._mq = matchMedia('(prefers-color-scheme: dark)');
      this._mq.addEventListener && this._mq.addEventListener('change', retheme);
      this._retheme = retheme;
    }

    _theme() {
      const cs = getComputedStyle(this.el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
      this.T = { fg: v('--di-fg', '#18202b'), muted: v('--di-muted', '#5a6574'), surface: v('--di-surface', '#ffffff'), line: v('--di-line', '#cfd6de'),
        accent: v('--di-accent', '#2f7fd1'), water: v('--di-water', v('--di-accent', '#2f7fd1')), font: v('--di-font', 'system-ui, sans-serif'), mono: v('--di-mono', 'ui-monospace, monospace') };
      this.lanes.forEach((l, i) => { l.col = v('--di-c-' + l.id, l.color || PALETTE[i % PALETTE.length]); });
    }

    _pos(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    _resize() {
      const r = this.cv.getBoundingClientRect();
      this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
      this._theme();
      this.draw();
      this._strip();
    }

    /* ---------- the magnifying current: 1-D fisheye around fx ---------- */
    _R() { return this.W * this.o.current; }
    _fx() { return this.fx == null ? this.W / 2 : this.fx; }
    _lin(t) { return ((t - this.view[0]) / (this.view[1] - this.view[0])) * this.W; }
    _unlin(x) { return this.view[0] + (x / this.W) * (this.view[1] - this.view[0]); }
    _dist(x) {
      const fx = this._fx(), R = this._R(), m = this.o.magnify, d = x - fx;
      if (Math.abs(d) >= R) return x;
      const u = Math.abs(d) / R;
      return fx + Math.sign(d) * R * (((m + 1) * u) / (m * u + 1));
    }
    _undist(X) {
      const fx = this._fx(), R = this._R(), m = this.o.magnify, D = X - fx;
      if (Math.abs(D) >= R) return X;
      const v = Math.abs(D) / R;
      return fx + Math.sign(D) * R * (v / (m + 1 - m * v));
    }
    xOf(t) { return this._dist(this._lin(t)); }
    _tAt(X) { return this._unlin(this._undist(X)); }
    currentRange() { const fx = this._fx(), R = this._R(); return [this._tAt(fx - R), this._tAt(fx + R)]; }

    _setViewRaw(a, b) {
      const span = clamp(b - a, 2, (this.full[1] - this.full[0]) * 1.2);
      const mid = clamp((a + b) / 2, this.full[0], this.full[1]);
      this.view = [mid - span / 2, mid + span / 2];
    }
    setView(a, b) { this._setViewRaw(toYear(a), toYear(b)); this.draw(); this._strip(); this._emit('range', { view: this.view.slice() }); }
    _zoomAt(t, f) {
      const v = this.view;
      this._setViewRaw(t - (t - v[0]) * f, t + (v[1] - t) * f);
      this.draw(); this._strip();
    }

    /* ---------- selection ---------- */
    open(id) {
      const e = this.events.find(x => x.id === id);
      if (!e) return;
      this.selected = e;
      const x = this._lin(e.t);
      if (x < this.W * 0.1 || x > this.W * 0.9) { const span = this.view[1] - this.view[0]; this._setViewRaw(e.t - span / 2, e.t + span / 2); }
      this.fx = this._lin(e.t);
      this.draw(); this._strip();
      this._emit('open', { event: this._pub(e) });
    }
    next() { const t = this.selected ? this.selected.t : this._tAt(this._fx()) - 1e-9; const e = this.events.find(x => x.t > t + 1e-9) || this.events[this.events.length - 1]; this.open(e.id); }
    prev() { const t = this.selected ? this.selected.t : this._tAt(this._fx()) + 1e-9; const list = this.events.filter(x => x.t < t - 1e-9); this.open((list[list.length - 1] || this.events[0]).id); }
    _pub(e) { return { id: e.id, title: e.title, summary: e.summary || '', when: e.when || yearLabel(e.t), year: e.t, lane: e.lane.id }; }

    _hit(p) {
      let best = null, bd = 16;
      for (const s of this._stones || []) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < Math.max(bd, s.r + 6) && d < bd + s.r) { bd = d; best = s.e; } }
      return best;
    }
    _hoverAt(p) {
      const h = this._hit(p);
      this.hover = h;
      this.cv.classList.toggle('point', !!h);
    }

    /* ---------- drawing ---------- */
    draw() {
      if (!this.T) return;
      const c = this.ctx, T = this.T, W = this.W, H = this.H;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const top = 28, bottom = H - 30, mid = (top + bottom) / 2, maxHalf = (bottom - top) / 2 - 6;
      const fx = this._fx(), R = this._R();

      // eras: shaded columns + labels along the top bank
      c.font = '600 11px ' + T.font; c.textBaseline = 'middle';
      this.eras.forEach((er, i) => {
        const x0 = this.xOf(er.start), x1 = this.xOf(er.end);
        if (x1 < 0 || x0 > W) return;
        if (i % 2 === 0) { c.fillStyle = T.line; c.globalAlpha = 0.28; c.fillRect(x0, top, x1 - x0, bottom - top); c.globalAlpha = 1; }
        const lx = clamp(x0 + 8, 6, W - 6), maxw = Math.min(x1, W) - lx - 6;
        if (maxw > 30) {
          c.fillStyle = T.muted; c.textAlign = 'left';
          let t = er.label.toUpperCase();
          while (t.length > 3 && c.measureText(t).width > maxw) t = t.slice(0, -2);
          if (t !== er.label.toUpperCase()) t = t.slice(0, -1) + '…';
          c.fillText(t, lx, 14);
        }
      });

      // the current (magnifier) glow
      const g = c.createLinearGradient(fx - R, 0, fx + R, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, T.accent); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.09; c.fillStyle = g; c.fillRect(fx - R, top, 2 * R, bottom - top); c.globalAlpha = 1;

      // river: half-width from a kernel density of events, sampled in screen space
      const span = this.view[1] - this.view[0], bw = span / 45;
      const dens = t => { let s = 0; for (const e of this.events) { const z = (t - e.t) / bw; if (z > -4 && z < 4) s += e.w * Math.exp(-0.5 * z * z); } return s; };
      const pts = [];
      let mx = 0;
      for (let X = 0; X <= W + 3; X += 3) { const d = dens(this._tAt(X)); pts.push([X, d]); if (d > mx) mx = d; }
      const half = d => 7 + (maxHalf - 7) * Math.sqrt(mx ? d / mx : 0);
      c.beginPath();
      pts.forEach(([X, d], i) => (i ? c.lineTo(X, mid - half(d)) : c.moveTo(X, mid - half(d))));
      for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0], mid + half(pts[i][1]));
      c.closePath();
      const rg = c.createLinearGradient(0, top, 0, bottom);
      rg.addColorStop(0, T.water); rg.addColorStop(0.5, T.water); rg.addColorStop(1, T.water);
      c.globalAlpha = 0.16; c.fillStyle = rg; c.fill();
      c.globalAlpha = 0.5; c.strokeStyle = T.water; c.lineWidth = 1.2; c.stroke();
      c.globalAlpha = 1;
      // flow lines
      c.setLineDash([2, 6]); c.strokeStyle = T.water; c.globalAlpha = 0.35;
      [-0.45, 0, 0.45].forEach(k => { c.beginPath(); pts.forEach(([X, d], i) => (i ? c.lineTo(X, mid + k * half(d)) : c.moveTo(X, mid + k * half(d)))); c.stroke(); });
      c.setLineDash([]); c.globalAlpha = 1;

      // axis ticks: regular years outside the current, finer years inside it, never overlapping
      const step = niceStep(span, Math.max(4, Math.round(W / 110)));
      const [ca, cb] = this.currentRange();
      const fine = Math.min(step, niceStep(cb - ca, 6));
      const ticks = [];
      for (let y = Math.ceil(this.view[0] / step) * step; y <= this.view[1]; y += step) { const X = this.xOf(y); if (Math.abs(X - fx) >= R) ticks.push({ y, X, inner: false }); }
      for (let y = Math.ceil(ca / fine) * fine; y <= cb; y += fine) { const X = this.xOf(y); if (Math.abs(X - fx) < R) ticks.push({ y, X, inner: true }); }
      ticks.sort((a, b) => a.X - b.X);
      c.font = '500 10.5px ' + T.mono; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.strokeStyle = T.line; c.lineWidth = 1;
      let lastX = -1e9;
      for (const tk of ticks) {
        c.beginPath(); c.moveTo(tk.X, bottom); c.lineTo(tk.X, bottom + (tk.inner ? 4 : 5)); c.stroke();
        const label = yearLabel(tk.y), w = c.measureText(label).width;
        if (tk.X - w / 2 - lastX > 10 && tk.X - w / 2 > 0 && tk.X + w / 2 < W) {
          c.fillStyle = tk.inner ? T.fg : T.muted;
          c.fillText(label, tk.X, bottom + 15); lastX = tk.X + w / 2;
        }
      }

      // stones
      const L = this.lanes.length;
      this._stones = [];
      const placed = [];
      for (const e of this.events) {
        const X = this.xOf(e.t);
        if (X < -20 || X > W + 20) continue;
        const d = dens(e.t), hw = half(d);
        const laneK = L > 1 ? (e.lane.i / (L - 1) - 0.5) * 1.3 : 0;
        const Y = mid + laneK * Math.max(0, hw - 8);
        const inCur = Math.abs(X - fx) < R;
        const r = (3.5 + 1.6 * e.w) * (inCur ? 1.25 : 0.9);
        this._stones.push({ e, x: X, y: Y, r });
        c.fillStyle = e.lane.col;
        c.beginPath(); c.arc(X, Y, r, 0, TAU); c.fill();
        c.strokeStyle = T.surface; c.lineWidth = 1.5; c.stroke();
        if (e === this.selected || e === this.hover) { c.strokeStyle = T.fg; c.lineWidth = 2; c.beginPath(); c.arc(X, Y, r + 4, 0, TAU); c.stroke(); }
        if (inCur || e === this.selected) placed.push({ e, X, Y, r });
      }
      // labels for stones inside the current, alternating above / below the river
      c.font = '600 11.5px ' + T.font; c.textBaseline = 'middle'; c.lineWidth = 3.5; c.strokeStyle = T.surface;
      const rects = [];
      placed.sort((a, b) => (b.e === this.selected) - (a.e === this.selected) || b.e.w - a.e.w);
      for (const p of placed) {
        let text = p.e.title; if (text.length > 34) text = text.slice(0, 33) + '…';
        const w = c.measureText(text).width;
        for (const side of [-1, 1]) {
          const y = side < 0 ? Math.max(top + 22, p.Y - p.r - 26) : Math.min(bottom - 10, p.Y + p.r + 26);
          const x = clamp(p.X - w / 2, 4, W - w - 4);
          const rect = [x - 3, y - 9, w + 6, 18];
          if (rects.some(q => rect[0] < q[0] + q[2] && rect[0] + rect[2] > q[0] && rect[1] < q[1] + q[3] && rect[1] + rect[3] > q[1])) continue;
          rects.push(rect);
          c.strokeStyle = T.line; c.lineWidth = 1; c.beginPath(); c.moveTo(p.X, p.Y + side * p.r); c.lineTo(p.X, y - side * 8); c.stroke();
          c.lineWidth = 3.5; c.strokeStyle = T.surface;
          c.fillStyle = p.e === this.selected ? T.accent : T.fg; c.textAlign = 'left';
          c.strokeText(text, x, y); c.fillText(text, x, y);
          break;
        }
      }
    }

    _strip() {
      const [a, b] = this.currentRange();
      const list = this.events.filter(e => e.t >= a && e.t <= b);
      if (this.selected && !list.includes(this.selected)) list.unshift(this.selected);
      list.sort((x, y) => x.t - y.t);
      const key = list.map(e => e.id).join(',') + '|' + (this.selected ? this.selected.id : '');
      if (key === this._stripKey) return;
      this._stripKey = key;
      if (!list.length) { this.$strip.innerHTML = '<p class="rl-empty">Nothing recorded between ' + esc(yearLabel(a)) + ' and ' + esc(yearLabel(b)) + '. Move the current along the river.</p>'; return; }
      this.$strip.innerHTML = list.map(e =>
        '<button type="button" class="rl-card' + (e === this.selected ? ' on' : '') + '" data-id="' + esc(e.id) + '" aria-expanded="' + (e === this.selected) + '">' +
        '<span class="w"><i style="background:' + esc(e.lane.col) + '"></i>' + esc(e.when || yearLabel(e.t)) + ' · ' + esc(e.lane.label) + '</span>' +
        '<b>' + esc(e.title) + '</b>' + (e.summary ? '<p>' + esc(e.summary) + '</p>' : '') + '</button>').join('');
      this.$strip.querySelectorAll('.rl-card').forEach(b => b.onclick = () => this.open(b.dataset.id));
      const on = this.$strip.querySelector('.rl-card.on');
      if (on) this.$strip.scrollLeft = Math.max(0, on.offsetLeft - this.$strip.offsetLeft - 8);
    }

    destroy() {
      this._ro.disconnect(); this._mo.disconnect();
      this._mq.removeEventListener && this._mq.removeEventListener('change', this._retheme);
      this.el.innerHTML = ''; this.el.classList.remove('rl');
    }
  }

  return Riverline;
});
