/*! Tidepool 1.0 · Dimau Infographics
 *  Communicating vessels for budgets, allocations and trade-offs.
 *  Drag a vessel's water level. With `conserve: true` the total stays fixed, so the water
 *  flows out of (or back into) the other unlocked vessels through the pipes between them.
 *
 *  const tp = new Tidepool(el, { unit:'FJD', period:'per fortnight', conserve:true, step:5,
 *    items:[{ id:'rent', label:'Rent', value:420, note:'…', locked:true, min:0, max:800, color:'#…' }] });
 *  tp.on('change', ({ items, total, move }) => …)
 *  tp.setValue(id, v) · tp.lock(id, bool) · tp.reset() · tp.getState() · tp.setState(s) · tp.destroy()
 *
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-display --di-mono --di-c-<itemId>
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tidepool = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#1fa38a', '#d9822b', '#8a5cd6', '#cf4b6a', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round2 = n => Math.round(n * 100) / 100;
  function niceCeil(x) {
    if (x <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
    return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => f <= s + 1e-9)) * p;
  }

  const STYLE = `
.tp{--tp-h:230px;font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#18202b);display:grid;gap:14px}
.tp-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 16px}
.tp-total{font:600 13px/1.3 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#5a6574)}
.tp-total b{color:var(--di-fg,#18202b);font-size:15px}
.tp-scroll{overflow-x:auto;overflow-y:hidden;padding:4px 2px 2px;-webkit-overflow-scrolling:touch}
.tp-row{display:flex;gap:16px;min-width:min-content;position:relative}
.tp-v{flex:1 1 0;min-width:62px;max-width:150px;display:grid;justify-items:center;gap:6px;position:relative}
.tp-lock{width:28px;height:28px;border-radius:50%;border:1px solid var(--di-line,#cfd6de);background:var(--di-surface,#fff);color:var(--di-muted,#5a6574);display:grid;place-items:center;cursor:pointer;padding:0}
.tp-lock[aria-pressed="true"]{background:var(--di-fg,#18202b);color:var(--di-surface,#fff);border-color:var(--di-fg,#18202b)}
.tp-lock svg{width:14px;height:14px}
.tp-glass{position:relative;width:100%;height:var(--tp-h);border-radius:10px 10px 14px 14px;background:color-mix(in srgb,var(--di-surface,#fff) 70%,transparent);
 box-shadow:inset 0 0 0 1.5px var(--di-line,#cfd6de),inset 0 -24px 40px -30px rgba(0,0,0,.18);overflow:hidden;cursor:ns-resize;touch-action:none;outline:none}
.tp-glass:focus-visible{box-shadow:inset 0 0 0 2px var(--di-accent,#2f7fd1)}
.tp-locked .tp-glass{cursor:not-allowed}
.tp-water{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 78%,#fff) 0%,var(--c) 60%,color-mix(in srgb,var(--c) 80%,#000) 100%);transition:height .28s cubic-bezier(.3,.7,.3,1)}
.tp-dragging .tp-water{transition:none}
.tp-water::before{content:"";position:absolute;left:-50%;right:-50%;top:-5px;height:10px;border-radius:50%;
 background:radial-gradient(closest-side,color-mix(in srgb,var(--c) 45%,#fff),transparent);opacity:.9;animation:tp-wave 3.2s ease-in-out infinite alternate}
@keyframes tp-wave{from{transform:translateX(-12%)}to{transform:translateX(12%)}}
.tp-ghost{position:absolute;left:6px;right:6px;border-top:1.5px dashed var(--di-fg,#18202b);opacity:.45;pointer-events:none}
.tp-handle{position:absolute;left:50%;width:34px;height:6px;margin-left:-17px;border-radius:3px;background:var(--di-surface,#fff);box-shadow:0 1px 4px rgba(0,0,0,.3);pointer-events:none;transform:translateY(-50%)}
.tp-locked .tp-handle{display:none}
.tp-val{font:600 14px/1 var(--di-mono,ui-monospace,monospace);font-variant-numeric:tabular-nums;white-space:nowrap}
.tp-delta{font:500 11px/1 var(--di-mono,ui-monospace,monospace);min-height:11px;color:var(--di-muted,#5a6574)}
.tp-delta.up{color:#1f8a4c}.tp-delta.down{color:#c0392b}
.tp-label{font-size:12.5px;line-height:1.25;text-align:center;font-weight:600;max-width:100%;overflow-wrap:anywhere}
.tp-pipe{position:absolute;bottom:0;height:9px;border-radius:5px;background:color-mix(in srgb,var(--di-line,#cfd6de) 80%,transparent);overflow:hidden;pointer-events:none}
.tp-pipe i{position:absolute;inset:2px 0;background:repeating-linear-gradient(90deg,var(--di-accent,#2f7fd1) 0 6px,transparent 6px 12px);opacity:0;transition:opacity .2s}
.tp-pipe.flow-r i{opacity:.9;animation:tp-flow-r .5s linear infinite}
.tp-pipe.flow-l i{opacity:.9;animation:tp-flow-l .5s linear infinite}
@keyframes tp-flow-r{from{background-position:0 0}to{background-position:12px 0}}
@keyframes tp-flow-l{from{background-position:12px 0}to{background-position:0 0}}
.tp-story{margin:0;min-height:1.5em;font-size:14px;line-height:1.5}
.tp-story b{font-weight:600}
.tp-note{position:absolute;z-index:3;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);width:max-content;max-width:220px;padding:8px 10px;border-radius:8px;
 background:var(--di-popover,#18202b);color:var(--di-popover-fg,#fff);font-size:12.5px;line-height:1.4;pointer-events:none;opacity:0;transition:opacity .15s}
.tp-v:hover .tp-note,.tp-v:focus-within .tp-note{opacity:1}
@media (max-width:520px){.tp{--tp-h:190px}.tp-row{gap:12px}}
@media (prefers-reduced-motion:reduce){.tp-water,.tp-pipe i{transition:none}.tp-water::before,.tp-pipe.flow-r i,.tp-pipe.flow-l i{animation:none}}
`;
  function injectStyle() {
    if (document.getElementById('tp-style')) return;
    const s = document.createElement('style'); s.id = 'tp-style'; s.textContent = STYLE; document.head.appendChild(s);
  }
  const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const UNLOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  class Tidepool {
    constructor(el, data, opts) {
      injectStyle();
      this.el = el;
      this.o = Object.assign({ format: null }, opts || {});
      this._ev = {};
      this.unit = data.unit || '';
      this.period = data.period || '';
      this.conserve = !!data.conserve;
      this.step = data.step || 1;
      this.items = data.items.map((it, i) => ({
        id: it.id, label: it.label, note: it.note || '', color: it.color || null, i,
        value: +it.value, base: +it.value, min: it.min != null ? +it.min : 0, max: it.max != null ? +it.max : Infinity,
        locked: !!it.locked, lockedBase: !!it.locked
      }));
      this.total0 = this.items.reduce((s, it) => s + it.value, 0);
      // the tallest vessel holds 1.6x the largest starting amount, so small amounts stay visible
      const hi = Math.max(...this.items.map(it => it.value)) * 1.6;
      this.top = data.scaleMax || niceCeil(this.conserve ? Math.min(hi, this.total0) : hi);
      this.items.forEach(it => { if (!isFinite(it.max)) it.max = this.conserve ? this.total0 : this.top; it.max = Math.min(it.max, this.top); });
      this.lastMove = null;
      this._build();
      this._render();
    }

    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }

    fmt(n) {
      if (this.o.format) return this.o.format(n);
      const s = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: this.step < 1 ? 2 : 0 });
      return (n < 0 ? '−' : '') + (this.unit ? this.unit + ' ' : '') + s;
    }
    total() { return round2(this.items.reduce((s, it) => s + it.value, 0)); }

    _build() {
      const el = this.el;
      el.classList.add('tp');
      el.innerHTML =
        '<div class="tp-head"><div class="tp-total" aria-live="polite"></div></div>' +
        '<div class="tp-scroll"><div class="tp-row"></div></div>' +
        '<p class="tp-story" aria-live="polite"></p>';
      this.$total = el.querySelector('.tp-total');
      this.$row = el.querySelector('.tp-row');
      this.$story = el.querySelector('.tp-story');
      this.items.forEach((it, i) => {
        const v = document.createElement('div');
        v.className = 'tp-v';
        const col = it.color || 'var(--di-c-' + it.id + ', ' + PALETTE[i % PALETTE.length] + ')';
        v.style.setProperty('--c', col);
        v.innerHTML =
          (it.note ? '<div class="tp-note" role="tooltip" id="tpn-' + esc(it.id) + '">' + esc(it.note) + '</div>' : '') +
          '<button class="tp-lock" type="button"></button>' +
          '<div class="tp-glass" role="slider" tabindex="0" aria-label="' + esc(it.label) + '"' + (it.note ? ' aria-describedby="tpn-' + esc(it.id) + '"' : '') + '>' +
            '<div class="tp-water"></div><div class="tp-ghost"></div><div class="tp-handle"></div></div>' +
          '<div class="tp-val"></div><div class="tp-delta"></div><div class="tp-label">' + esc(it.label) + '</div>';
        this.$row.appendChild(v);
        it.$ = { v, glass: v.querySelector('.tp-glass'), water: v.querySelector('.tp-water'), ghost: v.querySelector('.tp-ghost'),
          handle: v.querySelector('.tp-handle'), val: v.querySelector('.tp-val'), delta: v.querySelector('.tp-delta'), lock: v.querySelector('.tp-lock') };
        it.$.lock.addEventListener('click', () => this.lock(it.id, !it.locked));
        this._bindGlass(it);
      });
      this.pipes = this.items.slice(0, -1).map(() => {
        const p = document.createElement('div'); p.className = 'tp-pipe'; p.innerHTML = '<i></i>'; this.$row.appendChild(p); return p;
      });
      this._ro = new ResizeObserver(() => this._placePipes());
      this._ro.observe(this.$row);
    }

    _placePipes() {
      const row = this.$row.getBoundingClientRect();
      this.pipes.forEach((p, i) => {
        const a = this.items[i].$.glass.getBoundingClientRect(), b = this.items[i + 1].$.glass.getBoundingClientRect();
        p.style.left = (a.right - row.left - 4) + 'px';
        p.style.width = (b.left - a.right + 8) + 'px';
        p.style.top = (a.bottom - row.top - 13) + 'px';
        p.style.bottom = 'auto';
      });
    }

    _bindGlass(it) {
      const g = it.$.glass;
      const fromY = e => {
        const r = g.getBoundingClientRect();
        return clamp((r.bottom - e.clientY) / r.height, 0, 1) * this.top;
      };
      g.addEventListener('pointerdown', e => {
        if (it.locked) { this._story('<b>' + esc(it.label) + '</b> is locked. Unlock it to change it.'); return; }
        try { g.setPointerCapture(e.pointerId); } catch (_) {}
        this._snap = this.items.map(x => x.value);
        this.el.classList.add('tp-dragging');
        this._dragging = it;
        this._applyFrom(it, fromY(e));
        e.preventDefault();
      });
      g.addEventListener('pointermove', e => { if (this._dragging === it) this._applyFrom(it, fromY(e)); });
      const end = () => {
        if (this._dragging !== it) return;
        const snap = this._snap;
        const move = {
          id: it.id, label: it.label, delta: round2(it.value - snap[it.i]),
          from: this.items.filter(x => x !== it && Math.abs(x.value - snap[x.i]) > 1e-9)
            .map(x => ({ id: x.id, label: x.label, amount: round2(x.value - snap[x.i]) }))
        };
        this._dragging = null; this._snap = null; this._prev = snap;
        this.el.classList.remove('tp-dragging');
        this.lastMove = move;
        this._render();
        this._commit(move);
      };
      g.addEventListener('pointerup', end);
      g.addEventListener('pointercancel', end);
      g.addEventListener('keydown', e => {
        const s = this.step, big = s * 10;
        const map = { ArrowUp: s, ArrowRight: s, ArrowDown: -s, ArrowLeft: -s, PageUp: big, PageDown: -big };
        if (e.key === 'l' || e.key === 'L') { e.preventDefault(); this.lock(it.id, !it.locked); return; }
        let target = null;
        if (e.key in map) target = it.value + map[e.key];
        else if (e.key === 'Home') target = it.min;
        else if (e.key === 'End') target = it.max;
        if (target == null) return;
        e.preventDefault();
        if (it.locked) { this._story('<b>' + esc(it.label) + '</b> is locked. Press L to unlock it.'); return; }
        this.setValue(it.id, target);
      });
    }

    _applyFrom(it, raw) {
      this.items.forEach((x, i) => (x.value = this._snap[i]));
      this._set(it, raw);
      this._render(true);
    }

    /* Core redistribution. Returns the move record. */
    _set(it, raw) {
      const s = this.step;
      let target = clamp(Math.round(raw / s) * s, it.min, it.max);
      let delta = round2(target - it.value);
      const move = { id: it.id, label: it.label, delta: 0, from: [] };
      if (!delta) return move;
      if (!this.conserve) { it.value = target; move.delta = delta; return move; }
      const others = this.items.filter(x => x !== it && !x.locked);
      if (!others.length) { move.blocked = true; return move; }
      if (delta > 0) {
        const room = others.map(x => Math.max(0, x.value - x.min));
        const avail = room.reduce((a, b) => a + b, 0);
        delta = Math.min(delta, avail);
        if (delta <= 0) { move.blocked = true; return move; }
        others.forEach((x, i) => { const take = avail ? (delta * room[i]) / avail : 0; x.value = round2(x.value - take); move.from.push({ id: x.id, label: x.label, amount: -take }); });
      } else {
        const give = -delta;
        const room = others.map(x => Math.max(0, x.max - x.value));
        const weights = others.map((x, i) => (room[i] > 0 ? Math.max(x.value, s) : 0));
        const wsum = weights.reduce((a, b) => a + b, 0);
        const cap = room.reduce((a, b) => a + b, 0);
        const g = Math.min(give, cap);
        if (g <= 0 || !wsum) { move.blocked = true; return move; }
        others.forEach((x, i) => { const add = Math.min(room[i], (g * weights[i]) / wsum); x.value = round2(x.value + add); move.from.push({ id: x.id, label: x.label, amount: add }); });
        delta = -g;
      }
      it.value = round2(it.value + delta);
      // absorb rounding drift so the total is exact
      const drift = round2(this.total0 - this.total());
      if (drift) { const big = others.slice().sort((a, b) => b.value - a.value)[0]; big.value = round2(big.value + drift); }
      move.delta = delta;
      return move;
    }

    setValue(id, v) {
      const it = this.items.find(x => x.id === id);
      if (!it) return null;
      const move = this._set(it, v);
      this.lastMove = move;
      this._render();
      this._commit(move);
      return move;
    }

    _commit(move) {
      this._emit('change', { items: this.items.map(x => ({ id: x.id, label: x.label, value: x.value, base: x.base, locked: x.locked })), total: this.total(), move });
    }

    lock(id, on) {
      const it = this.items.find(x => x.id === id);
      if (!it) return;
      it.locked = !!on;
      this._render();
      this._story('<b>' + esc(it.label) + '</b> ' + (on ? 'is locked. Other changes will leave it alone.' : 'is unlocked.'));
      this._emit('lock', { id, locked: it.locked });
    }

    reset() {
      this.items.forEach(x => { x.value = x.base; x.locked = x.lockedBase; });
      this.lastMove = null;
      this._render();
      this._story('Back to the starting figures.');
      this._commit(null);
    }

    getState() { return { v: 1, values: Object.fromEntries(this.items.map(x => [x.id, x.value])), locked: this.items.filter(x => x.locked).map(x => x.id) }; }
    setState(s) {
      if (!s || s.v !== 1) return false;
      this.items.forEach(x => { if (s.values && x.id in s.values) x.value = +s.values[x.id]; x.locked = (s.locked || []).includes(x.id); });
      this._render(); return true;
    }

    _story(html) { this.$story.innerHTML = html; }

    _render(live) {
      const top = this.top;
      for (const it of this.items) {
        const $ = it.$, pct = clamp(it.value / top, 0, 1) * 100, bpct = clamp(it.base / top, 0, 1) * 100;
        $.water.style.height = pct + '%';
        $.handle.style.bottom = 'auto';
        $.handle.style.top = (100 - pct) + '%';
        $.ghost.style.bottom = bpct + '%';
        $.ghost.hidden = Math.abs(it.value - it.base) < 1e-9;
        $.val.textContent = this.fmt(it.value);
        const d = round2(it.value - it.base);
        $.delta.textContent = d ? (d > 0 ? '+' : '−') + this.fmt(Math.abs(d)).replace(this.unit + ' ', '') : '';
        $.delta.className = 'tp-delta' + (d > 0 ? ' up' : d < 0 ? ' down' : '');
        $.v.classList.toggle('tp-locked', it.locked);
        $.lock.setAttribute('aria-pressed', String(it.locked));
        $.lock.setAttribute('aria-label', (it.locked ? 'Unlock ' : 'Lock ') + it.label);
        $.lock.title = it.locked ? 'Locked: other changes leave this alone' : 'Lock this amount';
        $.lock.innerHTML = it.locked ? LOCK : UNLOCK;
        $.glass.setAttribute('aria-valuemin', it.min);
        $.glass.setAttribute('aria-valuemax', it.max);
        $.glass.setAttribute('aria-valuenow', it.value);
        $.glass.setAttribute('aria-valuetext', this.fmt(it.value) + (it.locked ? ', locked' : ''));
        $.glass.setAttribute('aria-readonly', String(it.locked));
      }
      const t = this.total();
      this.$total.innerHTML = 'Total <b>' + esc(this.fmt(t)) + '</b>' + (this.period ? ' ' + esc(this.period) : '') +
        (this.conserve ? ' · stays the same as you move water' : (t !== this.total0 ? ' · was ' + esc(this.fmt(this.total0)) : ''));
      this._flow(live);
      if (!live) this._describe();
    }

    /* Net water crossing each pipe = minus the change of everything to its left. */
    _flow() {
      let cum = 0;
      const ref = this._snap || null;
      this.items.forEach((it, i) => {
        const before = ref ? ref[i] : (this._prev ? this._prev[i] : it.value);
        cum += it.value - before;
        if (i < this.pipes.length) {
          const p = this.pipes[i], f = -cum;
          p.classList.toggle('flow-r', f > 1e-6);
          p.classList.toggle('flow-l', f < -1e-6);
        }
      });
      if (!this._snap) {
        this._prev = this.items.map(x => x.value);
        clearTimeout(this._flowT);
        this._flowT = setTimeout(() => this.pipes.forEach(p => p.classList.remove('flow-r', 'flow-l')), 1100);
      }
    }

    _describe() {
      const m = this.lastMove;
      if (!m) {
        const changed = this.items.filter(x => Math.abs(x.value - x.base) > 1e-9);
        if (!changed.length) return;
      }
      if (m && m.blocked) { this._story('Nothing could move: every other vessel is locked or empty.'); return; }
      if (m && m.delta) {
        const verb = m.delta > 0 ? 'into' : 'out of';
        let s = 'Moving <b>' + esc(this.fmt(Math.abs(m.delta))) + '</b> ' + verb + ' <b>' + esc(m.label) + '</b>';
        if (this.conserve && m.from.length) {
          const parts = m.from.filter(f => Math.abs(f.amount) >= 0.5).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .map(f => esc(this.fmt(Math.abs(f.amount))) + ' ' + (m.delta > 0 ? 'from' : 'to') + ' ' + esc(f.label));
          if (parts.length) s += (m.delta > 0 ? ' took ' : ' gave ') + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]);
        }
        this._story(s + '.');
      }
    }

    destroy() { this._ro && this._ro.disconnect(); clearTimeout(this._flowT); this.el.innerHTML = ''; this.el.classList.remove('tp'); }
  }

  return Tidepool;
});
