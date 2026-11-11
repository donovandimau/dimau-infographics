/*! Strata 1.0 · Dimau Infographics
 *  Core-sample drilling through any hierarchy (catalogues, budgets, org charts, curricula).
 *  Each level is a stack of layers sized by value. A strip along each layer previews what is inside it.
 *  Drill into a layer and it is pulled out to fill the core. The depth gauge shows the way back up.
 *
 *  const st = new Strata(el, { title, unit:'chapters', unitSingular:'chapter', source, root:{ label, note, children:[…] } }, { info:true });
 *  st.on('drill' | 'select', handler) · st.drillTo(id) · st.up() · st.getState() · st.setState(s) · st.destroy()
 *  Leaves need `value`; parents sum their children unless they give their own value.
 *
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-display --di-mono --di-c-<topLevelId>
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Strata = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#1fa38a', '#d9822b', '#8a5cd6', '#cf4b6a', '#4a9c3b', '#b8862f', '#3b8fa8', '#7a6bd1', '#c2563a'];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b ? (100 * a) / b : 0);
  const fmtPct = p => (p >= 10 ? Math.round(p) : p >= 1 ? p.toFixed(1) : p > 0 ? '<1' : '0') + '%';

  const STYLE = `
.st{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#18202b);display:grid;grid-template-columns:150px minmax(0,1fr) minmax(200px,280px);gap:16px;align-items:start}
.st-gauge{display:grid;gap:8px;position:sticky;top:8px}
.st-gauge h4,.st-info h4{margin:0;font:600 10.5px/1.2 var(--di-font,system-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--di-muted,#5a6574)}
.st-depth{font:500 11.5px/1.3 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#5a6574)}
.st-crumbs{display:grid;gap:3px;margin:0;padding:0;list-style:none}
.st-crumbs button{width:100%;text-align:left;border:0;cursor:pointer;padding:6px 8px;border-radius:6px;font:500 12.5px/1.25 var(--di-font,system-ui);color:var(--di-fg,#18202b);
 background:color-mix(in srgb,var(--c,var(--di-line,#cfd6de)) 22%,var(--di-surface,#fff));display:grid;gap:1px}
.st-crumbs button small{font:11px var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#5a6574)}
.st-crumbs button:hover{background:color-mix(in srgb,var(--c,var(--di-line,#cfd6de)) 38%,var(--di-surface,#fff))}
.st-crumbs li.cur button{box-shadow:inset 0 0 0 1.5px var(--di-fg,#18202b);cursor:default}
.st-core-wrap{position:relative;min-width:0}
.st-core{display:flex;flex-direction:column;gap:3px;height:var(--st-h,440px);border-radius:12px;padding:3px;background:var(--di-line,#cfd6de);
 transition:clip-path .45s cubic-bezier(.3,.7,.2,1)}
.st-band{all:unset;box-sizing:border-box;position:relative;flex:var(--v) 1 0;min-height:34px;border-radius:8px;padding:6px 12px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;
 background:color-mix(in srgb,var(--c) 26%,var(--di-surface,#fff));color:var(--di-fg,#18202b);overflow:hidden;transition:background .15s}
.st-band:hover,.st-band.on{background:color-mix(in srgb,var(--c) 40%,var(--di-surface,#fff))}
.st-band:focus-visible{outline:2px solid var(--di-accent,#2f7fd1);outline-offset:1px}
.st-band .t{font:600 14px/1.2 var(--di-display,inherit);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.st-band .n{font:500 12px/1 var(--di-mono,ui-monospace,monospace);font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--di-muted,#5a6574)}
.st-band .n b{color:var(--di-fg,#18202b);font-weight:600}
.st-band .go{font:600 15px/1 var(--di-mono,ui-monospace,monospace);opacity:.55}
.st-xray{position:absolute;left:8px;right:8px;bottom:5px;height:4px;display:flex;gap:2px;transition:height .2s}
.st-xray i{flex:var(--v) 1 0;background:var(--c);border-radius:2px;opacity:.85}
.st-xray i:nth-child(even){opacity:.5}
.st-band:hover .st-xray,.st-band.on .st-xray{height:8px}
.st-info{display:grid;gap:8px;padding:14px 16px;border-radius:12px;background:var(--di-surface,#fff);box-shadow:0 0 0 1px var(--di-line,#cfd6de)}
.st-info h3{margin:0;font:700 19px/1.2 var(--di-display,inherit);text-wrap:balance}
.st-info p{margin:0;font-size:13.5px;line-height:1.5}
.st-stats{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:2px 0 0;font-size:13px}
.st-stats dt{color:var(--di-muted,#5a6574)}
.st-stats dd{margin:0;font:600 13px/1.35 var(--di-font,system-ui);font-variant-numeric:tabular-nums;text-align:right}
.st-meter{height:6px;border-radius:3px;background:var(--di-line,#cfd6de);overflow:hidden}
.st-meter i{display:block;height:100%;background:var(--c,var(--di-accent,#2f7fd1))}
.st-btn{justify-self:start;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--di-line,#cfd6de);background:var(--di-surface,#fff);cursor:pointer;font:600 13px var(--di-font,system-ui);color:var(--di-fg,#18202b)}
.st-btn:hover{border-color:var(--di-accent,#2f7fd1)}
.st-src{font-size:11.5px;color:var(--di-muted,#5a6574)}
@keyframes st-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.st-core.fresh .st-band{animation:st-in .35s both}
@media (max-width:900px){.st{grid-template-columns:minmax(0,1fr)}.st-gauge{position:static}.st-crumbs{display:flex;flex-wrap:wrap;gap:4px}.st-crumbs button{width:auto}}
@media (prefers-reduced-motion:reduce){.st-core{transition:none}.st-core.fresh .st-band{animation:none}}
`;
  function injectStyle() {
    if (document.getElementById('st-style')) return;
    const s = document.createElement('style'); s.id = 'st-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Strata {
    constructor(el, data, opts) {
      injectStyle();
      this.el = el;
      this.o = Object.assign({ info: true, height: null }, opts || {});
      this.data = data;
      this.unit = data.unit || '';
      this.unit1 = data.unitSingular || this.unit;
      this._ev = {};
      this.byId = new Map();
      let seq = 0;
      const walk = (n, parent, depth, colour) => {
        n = Object.assign({}, n);
        n.id = n.id || 'n' + seq++;
        n.parent = parent; n.depth = depth;
        n.kids = (n.children || []).map((c, i) => walk(c, n, depth + 1, depth === 0 ? null : colour));
        if (depth === 1) n.colour = null; // set below
        n.value = n.value != null ? +n.value : n.kids.reduce((s, k) => s + k.value, 0);
        this.byId.set(n.id, n);
        return n;
      };
      this.root = walk(data.root, null, 0, null);
      this.root.kids.forEach((k, i) => {
        const col = 'var(--di-c-' + k.id + ', ' + (k.color || PALETTE[i % PALETTE.length]) + ')';
        const paint = n => { n.colour = n.color ? n.color : col; n.kids.forEach(paint); };
        paint(k);
      });
      this.root.colour = 'var(--di-accent, #2f7fd1)';
      this.maxDepth = (function d(n) { return n.kids.length ? 1 + Math.max(...n.kids.map(d)) : 0; })(this.root);
      this.cur = this.root;
      this.focusNode = null;
      this._build();
      this._render(null);
    }

    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }

    fmt(v) { return v.toLocaleString() + ' ' + (v === 1 ? this.unit1 : this.unit); }
    path(n) { const p = []; for (let x = n; x; x = x.parent) p.unshift(x); return p; }

    _build() {
      this.el.classList.add('st');
      this.el.innerHTML =
        '<nav class="st-gauge" aria-label="Depth"><h4>Depth</h4><div class="st-depth"></div><ol class="st-crumbs"></ol></nav>' +
        '<div class="st-core-wrap"><div class="st-core" role="list"></div></div>' +
        (this.o.info ? '<aside class="st-info" aria-live="polite"></aside>' : '');
      this.$depth = this.el.querySelector('.st-depth');
      this.$crumbs = this.el.querySelector('.st-crumbs');
      this.$core = this.el.querySelector('.st-core');
      this.$info = this.el.querySelector('.st-info');
      this.$core.addEventListener('keydown', e => {
        const bands = [...this.$core.querySelectorAll('.st-band')];
        const i = bands.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' && i >= 0) { e.preventDefault(); bands[Math.min(bands.length - 1, i + 1)].focus(); }
        else if (e.key === 'ArrowUp' && i >= 0) { e.preventDefault(); bands[Math.max(0, i - 1)].focus(); }
        else if ((e.key === 'Escape' || e.key === 'Backspace' || e.key === 'ArrowLeft') && this.cur.parent) { e.preventDefault(); this.up(); }
        else if (e.key === 'ArrowRight' && i >= 0) { e.preventDefault(); bands[i].click(); }
      });
    }

    drillTo(id, fromRect) {
      const n = typeof id === 'string' ? this.byId.get(id) : id;
      if (!n) return;
      if (!n.kids.length) { this.select(n); return; }
      const prev = this.cur;
      this.cur = n;
      this.focusNode = null;
      this._render(fromRect || null, prev);
      this._emit('drill', { node: this._pub(n), path: this.path(n).map(x => this._pub(x)) });
    }
    up() { if (this.cur.parent) { const from = this.cur; this.cur = this.cur.parent; this.focusNode = from; this._render(null, from); this._emit('drill', { node: this._pub(this.cur), path: this.path(this.cur).map(x => this._pub(x)) }); } }
    select(n) { this.focusNode = n; this._mark(); this._info(n); this._emit('select', { node: this._pub(n), path: this.path(n).map(x => this._pub(x)) }); }
    _pub(n) { return { id: n.id, label: n.label, value: n.value, note: n.note || '', depth: n.depth, children: n.kids.length }; }

    getState() { return { v: 1, at: this.cur.id }; }
    setState(s) { if (s && s.v === 1 && this.byId.has(s.at)) { this.cur = this.byId.get(s.at); this._render(null); return true; } return false; }

    _render(fromRect, prev) {
      const n = this.cur, kids = n.kids;
      const hadFocus = this.el.contains(document.activeElement);
      // gauge
      const p = this.path(n);
      this.$depth.textContent = 'Level ' + (n.depth + 1) + ' of ' + (this.maxDepth + 1);
      this.$crumbs.innerHTML = p.map((x, i) =>
        '<li' + (x === n ? ' class="cur"' : '') + '><button type="button" data-id="' + esc(x.id) + '" style="--c:' + x.colour + '"' + (x === n ? ' aria-current="location"' : '') + '>' +
        esc(x.label) + '<small>' + esc(this.fmt(x.value)) + (i ? ' · ' + fmtPct(pct(x.value, this.root.value)) + ' of all' : '') + '</small></button></li>').join('');
      this.$crumbs.querySelectorAll('button').forEach(b => b.onclick = () => {
        const t = this.byId.get(b.dataset.id);
        if (t !== this.cur) { const from = this.cur; this.cur = t; this.focusNode = this.path(from)[t.depth + 1] || null; this._render(null, from); this._emit('drill', { node: this._pub(t), path: this.path(t).map(x => this._pub(x)) }); }
      });
      // core
      const h = this.o.height || Math.max(380, Math.min(620, kids.length * 40));
      this.$core.style.setProperty('--st-h', h + 'px');
      this.$core.innerHTML = kids.map(k =>
        '<button class="st-band" type="button" role="listitem" data-id="' + esc(k.id) + '" style="--v:' + Math.max(k.value, 0.0001) + ';--c:' + k.colour + '"' +
        ' aria-label="' + esc(k.label + ', ' + this.fmt(k.value) + ', ' + fmtPct(pct(k.value, n.value)) + (k.kids.length ? ', ' + k.kids.length + ' inside' : '')) + '">' +
        '<span class="t">' + esc(k.label) + '</span>' +
        '<span class="n"><b>' + esc(k.value.toLocaleString()) + '</b> · ' + fmtPct(pct(k.value, n.value)) + '</span>' +
        (k.kids.length ? '<span class="go" aria-hidden="true">›</span><span class="st-xray" aria-hidden="true">' + k.kids.map(c => '<i style="--v:' + Math.max(c.value, 0.0001) + '"></i>').join('') + '</span>' : '') +
        '</button>').join('');
      this.$core.querySelectorAll('.st-band').forEach(b => {
        const k = this.byId.get(b.dataset.id);
        b.addEventListener('mouseenter', () => this._info(k));
        b.addEventListener('focus', () => this._info(k));
        b.addEventListener('click', () => (k.kids.length ? this.drillTo(k, b.getBoundingClientRect()) : this.select(k)));
      });
      // the chosen layer is pulled out to fill the core
      const core = this.$core;
      core.classList.remove('fresh'); void core.offsetWidth; core.classList.add('fresh');
      if (fromRect) {
        const r = core.getBoundingClientRect();
        const top = Math.max(0, fromRect.top - r.top), bottom = Math.max(0, r.bottom - fromRect.bottom);
        core.style.transition = 'none';
        core.style.clipPath = 'inset(' + top + 'px 0 ' + bottom + 'px 0 round 10px)';
        void core.offsetWidth;
        core.style.transition = '';
        core.style.clipPath = 'inset(0 0 0 0 round 12px)';
      } else core.style.clipPath = '';
      this._mark();
      this._info(this.focusNode);
      const focusId = this.focusNode && this.focusNode.parent === n ? this.focusNode.id : null;
      if (prev && hadFocus) {
        const target = (focusId && core.querySelector('[data-id="' + CSS.escape(focusId) + '"]')) || core.querySelector('.st-band');
        target && target.focus({ preventScroll: true });
      }
    }

    _mark() {
      this.$core.querySelectorAll('.st-band').forEach(b => b.classList.toggle('on', !!this.focusNode && b.dataset.id === this.focusNode.id));
    }

    _info(k) {
      if (!this.$info) return;
      const n = k || this.cur;
      const parent = n.parent;
      const crumbs = this.path(n).slice(1, -1).map(x => esc(x.label)).join(' › ');
      const biggest = n.kids.slice().sort((a, b) => b.value - a.value)[0];
      this.$info.style.setProperty('--c', n.colour);
      this.$info.innerHTML =
        '<h4>' + (crumbs || esc(this.data.title || 'Overview')) + '</h4>' +
        '<h3>' + esc(n.label) + '</h3>' +
        (n.note ? '<p>' + esc(n.note) + '</p>' : '') +
        '<dl class="st-stats">' +
          '<dt>Size</dt><dd>' + esc(this.fmt(n.value)) + '</dd>' +
          (parent ? '<dt>Share of ' + esc(parent.label) + '</dt><dd>' + fmtPct(pct(n.value, parent.value)) + '</dd>' : '') +
          (n !== this.root ? '<dt>Share of everything</dt><dd>' + fmtPct(pct(n.value, this.root.value)) + '</dd>' : '') +
          (n.kids.length ? '<dt>Inside</dt><dd>' + n.kids.length + '</dd>' : '') +
          (biggest && n.kids.length > 1 ? '<dt>Largest</dt><dd>' + esc(biggest.label) + '</dd>' : '') +
        '</dl>' +
        (n !== this.root ? '<div class="st-meter" title="Share of everything"><i style="width:' + Math.max(1, pct(n.value, this.root.value)).toFixed(1) + '%"></i></div>' : '') +
        (k && k.kids.length ? '<button class="st-btn" type="button">Open ' + esc(k.label) + ' ›</button>' : '') +
        (!k && this.cur.parent ? '<button class="st-btn" type="button" data-up>‹ Back to ' + esc(this.cur.parent.label) + '</button>' : '') +
        (this.data.source && n === this.root ? '<p class="st-src">Source: ' + esc(this.data.source) + '</p>' : '');
      const b = this.$info.querySelector('.st-btn');
      if (b) b.onclick = () => (b.hasAttribute('data-up') ? this.up() : this.drillTo(k));
    }

    destroy() { this.el.innerHTML = ''; this.el.classList.remove('st'); }
  }

  return Strata;
});
