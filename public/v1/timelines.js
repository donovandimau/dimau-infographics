/*! Timelines 1.0 · Dimau Infographics
 *  One timeline dataset, four views. Every view reads the same data, so an app can switch view without
 *  reshaping anything, and Riverline data (lanes/lane) works here too.
 *
 *    Switchback  vertical timeline: cards alternate sides, the spine fills as you read, year rail,
 *                category filters, "read more", and a story mode that walks through the events.
 *    Swimlane    one lane per category, points and spans, zoom and pan, a navigator strip with a
 *                draggable window, and a detail panel with previous / next.
 *    Roadmap     Gantt rows with milestones, dependencies, progress and a today line. Drag a task
 *                and everything that depends on it moves too; the new finish date is spelled out.
 *    Waypath     a milestone path (winding road, cycle or staircase); tap a stop to reveal it,
 *                press play to walk the path.
 *
 *  data = { title?, categories|lanes:[{id,label,color?}], eras?:[{start,end,label}],
 *           events:[{ id?, date|start, end?, when?, title, summary?, category|lane, status?, progress?,
 *                     depends?:[id], milestone?, link?, weight? }] }
 *  dates: a year (1874, -1000), '1874-10', '1874-10-10'.
 *  new Switchback(el, data, opts) · .on('open'|'filter'|'progress'|'change'|'step', fn) · .open(id) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-display --di-mono --di-c-<categoryId>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { root.Switchback = m.Switchback; root.Swimlane = m.Swimlane; root.Roadmap = m.Roadmap; root.Waypath = m.Waypath; root.DimauTimelines = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- dates as decimal years (works for BCE and for day precision) ---------- */
  function parseDate(d) {
    if (typeof d === 'number') return { t: d, p: 'y' };
    const m = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(String(d || '').trim());
    if (!m) return null;
    const y = +m[1], mo = m[2] ? +m[2] - 1 : 0, da = m[3] ? +m[3] - 1 : 0;
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][mo] + (leap && mo > 1 ? 1 : 0);
    return { t: y + (cum + da) / (leap ? 366 : 365), p: m[3] ? 'd' : m[2] ? 'm' : 'y' };
  }
  function ymd(t) {
    const y = Math.floor(t), leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0, len = leap ? 366 : 365;
    let doy = Math.round((t - y) * len), mo = 0;
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    while (mo < 11 && doy >= days[mo]) { doy -= days[mo]; mo++; }
    return { y, m: mo, d: doy + 1 };
  }
  const yearLabel = y => (y < 0 ? Math.round(-y) + ' BCE' : String(Math.round(y)));
  function fmt(t, p) {
    if (p === 'y') return yearLabel(t);
    const x = ymd(t);
    return (p === 'd' ? x.d + ' ' : '') + MON[x.m] + ' ' + yearLabel(x.y);
  }
  function toDecimal(date) { const r = parseDate(date); return r ? r.t : NaN; }
  function fromDecimal(t) { const x = ymd(t); return x.y + '-' + String(x.m + 1).padStart(2, '0') + '-' + String(x.d).padStart(2, '0'); }
  function span(t0, t1, p) {
    const yrs = t1 - t0;
    if (p === 'y' || yrs >= 2) return Math.round(yrs) + (Math.round(yrs) === 1 ? ' year' : ' years');
    const days = Math.round(yrs * 365.25);
    if (days >= 60) return Math.round(days / 30.44) + ' months';
    if (days >= 14) return Math.round(days / 7) + ' weeks';
    return days + (days === 1 ? ' day' : ' days');
  }

  /* ---------- the shared data model ---------- */
  function normalise(data) {
    const cats = (data.categories || data.lanes || [{ id: 'all', label: 'Events' }]).map((c, i) => Object.assign({}, c, { i, color: c.color || PALETTE[i % PALETTE.length] }));
    const byCat = new Map(cats.map(c => [c.id, c]));
    const events = (data.events || []).map((e, i) => {
      // undated steps (a process rather than a history) keep their order
      const a = parseDate(e.start != null ? e.start : e.date) || (e.start == null && e.date == null ? { t: i, p: 'seq' } : null), b = e.end != null ? parseDate(e.end) : null;
      if (!a) return null;
      const cat = byCat.get(e.category || e.lane) || cats[0];
      const ev = Object.assign({}, e, { id: e.id || 'e' + i, t0: a.t, t1: b ? Math.max(b.t, a.t) : null, p: a.p, cat, w: e.weight || 1 });
      ev.whenText = e.when || (a.p === 'seq' ? '' : b ? fmt(a.t, a.p) + ' – ' + fmt(b.t, b.p) : fmt(a.t, a.p));
      ev.spanText = b ? span(a.t, b.t, a.p) : '';
      return ev;
    }).filter(Boolean).sort((x, y) => x.t0 - y.t0);
    const eras = (data.eras || []).map(r => ({ t0: toDecimal(r.start), t1: toDecimal(r.end), label: r.label })).filter(r => isFinite(r.t0) && isFinite(r.t1));
    return { title: data.title || '', cats, byCat, events, eras };
  }

  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return {
      bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'),
      line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), font: v('--di-font', 'system-ui, sans-serif'),
      display: v('--di-display', v('--di-font', 'system-ui, sans-serif')), mono: v('--di-mono', 'ui-monospace, monospace')
    };
  }
  const catColor = (el, c) => (getComputedStyle(el).getPropertyValue('--di-c-' + c.id) || '').trim() || c.color;

  const STYLE = `
.tl{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
.tl button{font:inherit;color:inherit}
.tl :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.tl-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px}
.tl-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:99px;padding:5px 11px;font-size:13px;font-weight:600;cursor:pointer}
.tl-chip i{width:9px;height:9px;border-radius:50%;background:var(--c)}
.tl-chip[aria-pressed="false"]{opacity:.45}
.tl-chip[aria-pressed="false"] i{background:transparent;box-shadow:inset 0 0 0 1.5px var(--c)}
.tl-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer}
.tl-btn.on{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.tl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
/* Switchback */
.sb{display:grid;grid-template-columns:minmax(0,1fr) 76px;gap:14px}
.sb-col{position:relative;min-width:0}
.sb-list{position:relative;list-style:none;margin:0;padding:6px 0}
.sb-spine,.sb-fill{position:absolute;left:50%;top:0;width:4px;margin-left:-2px;border-radius:2px}
.sb-spine{bottom:0;background:var(--di-line,#c9dce8)}
.sb-fill{height:0;background:var(--di-accent,#0b6fa4);transition:height .15s linear}
.sb-item{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:10px 0}
.sb-item .sb-card{grid-column:1;margin-right:34px;justify-self:end}
.sb-item.r .sb-card{grid-column:2;margin:0 0 0 34px;justify-self:start}
.sb-dot{position:absolute;left:50%;top:26px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:var(--di-surface,#fff);border:4px solid var(--c);box-sizing:border-box;transition:transform .25s}
.sb-item.seen .sb-dot{background:var(--c)}
.sb-item.on .sb-dot{transform:scale(1.35)}
.sb-card{max-width:420px;width:100%;box-sizing:border-box;background:var(--di-surface,#fff);border-radius:14px;padding:13px 15px 12px;box-shadow:0 0 0 1px var(--di-line,#c9dce8),0 10px 24px -18px rgba(0,0,0,.35);opacity:.55;transform:translateY(8px);transition:opacity .4s,transform .4s,box-shadow .2s}
.sb-item.seen .sb-card{opacity:1;transform:none}
.sb-item.on .sb-card{box-shadow:0 0 0 2px var(--c),0 14px 30px -16px rgba(0,0,0,.4)}
.sb-when{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font:600 12px/1.2 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);margin-bottom:5px}
.sb-when b{color:var(--c);font-weight:700}
.sb-when span{border:1px solid var(--di-line,#c9dce8);border-radius:99px;padding:1px 7px}
.sb-card h4{margin:0;font:700 16.5px/1.25 var(--di-display,inherit)}
.sb-card p{margin:6px 0 0;font-size:14px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sb-card.open p{-webkit-line-clamp:unset;display:block}
.sb-more{margin-top:6px;border:0;background:none;padding:0;font-size:12.5px;font-weight:700;color:var(--di-accent,#0b6fa4);cursor:pointer}
.sb-rail{position:sticky;top:12px;align-self:start;display:grid;gap:3px;max-height:80vh;overflow:auto}
.sb-rail button{border:0;background:none;text-align:right;padding:3px 6px;border-radius:6px;font:600 12px var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);cursor:pointer}
.sb-rail button.on{background:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.tl.narrow .sb{grid-template-columns:minmax(0,1fr)}
.tl.narrow .sb-rail{display:none}
.tl.narrow .sb-spine,.tl.narrow .sb-fill{left:9px}
.tl.narrow .sb-dot{left:9px}
.tl.narrow .sb-item{grid-template-columns:1fr}
.tl.narrow .sb-item .sb-card,.tl.narrow .sb-item.r .sb-card{grid-column:1;margin:0 0 0 30px;justify-self:stretch;max-width:none}
/* Swimlane */
.sl-stage{position:relative;border-radius:12px;background:var(--di-surface,#fff);box-shadow:0 0 0 1px var(--di-line,#c9dce8);overflow:hidden;touch-action:pan-y}
.sl-stage svg{display:block;width:100%}
.sl-stage .ev{cursor:pointer}
.sl-stage .ev:focus-visible rect,.sl-stage .ev:focus-visible circle{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.sl-nav{margin-top:8px;border-radius:10px;background:var(--di-surface,#fff);box-shadow:0 0 0 1px var(--di-line,#c9dce8);touch-action:none;cursor:pointer}
.sl-nav svg{display:block;width:100%}
.sl-detail{margin-top:10px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;background:var(--di-surface,#fff);border-radius:12px;padding:12px 14px;box-shadow:0 0 0 1px var(--di-line,#c9dce8)}
.sl-detail h4{margin:2px 0 3px;font:700 16px/1.25 var(--di-display,inherit)}
.sl-detail p{margin:0;font-size:14px;line-height:1.5}
.sl-detail small{font:600 12px var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
/* Roadmap */
.rm-wrap{overflow-x:auto;border-radius:12px;background:var(--di-surface,#fff);box-shadow:0 0 0 1px var(--di-line,#c9dce8)}
.rm-wrap svg{display:block}
.rm-bar{cursor:grab;touch-action:none}
.rm-bar.drag{cursor:grabbing}
.rm-msg{margin:10px 0 0;font-size:14px;min-height:1.5em}
.rm-msg b{font-weight:700}
/* Waypath */
.wp-stage{position:relative}
.wp-stage svg{display:block;width:100%;height:auto}
.wp-stop{cursor:pointer}
.wp-stop:focus-visible circle{stroke:var(--di-fg,#13263a);stroke-width:3}
.wp-card{margin-top:10px;background:var(--di-surface,#fff);border-radius:14px;padding:14px 16px;box-shadow:0 0 0 1px var(--di-line,#c9dce8);display:grid;gap:4px}
.wp-card h4{margin:0;font:700 18px/1.25 var(--di-display,inherit)}
.wp-card p{margin:0;font-size:14.5px;line-height:1.55}
.wp-card small{font:600 12px var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
@media (prefers-reduced-motion:reduce){.sb-card,.sb-fill,.sb-dot{transition:none}}
`;
  function injectStyle() {
    if (document.getElementById('tl-style')) return;
    const s = document.createElement('style'); s.id = 'tl-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  /* ---------- base ---------- */
  class TimelineBase {
    constructor(el, data, opts) {
      injectStyle();
      this.el = el; this.o = Object.assign({}, this.constructor.DEFAULTS || {}, opts || {});
      this._ev = {}; this.d = normalise(data || {});
      this.hidden = new Set(this.o.hidden || []);
      el.classList.add('tl');
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    visible() { return this.d.events.filter(e => !this.hidden.has(e.cat.id)); }
    _pub(e) { return { id: e.id, title: e.title, summary: e.summary || '', when: e.whenText, category: e.cat.id, start: e.t0, end: e.t1 }; }
    _resize() {}
    chips(container) {
      if (this.d.cats.length < 2) { container.innerHTML = ''; return; }
      container.innerHTML = this.d.cats.map(c => '<button type="button" class="tl-chip" data-cat="' + esc(c.id) + '" aria-pressed="' + !this.hidden.has(c.id) + '" style="--c:' + esc(catColor(this.el, c)) + '"><i></i>' + esc(c.label) + '</button>').join('');
      container.querySelectorAll('.tl-chip').forEach(b => b.onclick = () => {
        const id = b.dataset.cat;
        if (this.hidden.has(id)) this.hidden.delete(id);
        else if (this.d.cats.length - this.hidden.size > 1) this.hidden.add(id);
        b.setAttribute('aria-pressed', String(!this.hidden.has(id)));
        this._emit('filter', { hidden: [...this.hidden] });
        this.render();
      });
    }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('tl', 'narrow'); }
  }

  /* ======================================================================================
   * Switchback: vertical, alternating, reading progress, year rail, story mode
   * ====================================================================================== */
  class Switchback extends TimelineBase {
    constructor(el, data, opts) {
      super(el, data, opts);
      el.innerHTML = '<div class="tl-bar"><div class="tl-bar sb-chips" style="margin:0"></div><span style="flex:1"></span><button type="button" class="tl-btn sb-play">Play story</button></div>' +
        '<div class="sb"><div class="sb-col"><div class="sb-spine"></div><div class="sb-fill"></div><ol class="sb-list"></ol></div><nav class="sb-rail" aria-label="Jump to a year"></nav></div>';
      this.$chips = el.querySelector('.sb-chips'); this.$list = el.querySelector('.sb-list'); this.$rail = el.querySelector('.sb-rail');
      this.$fill = el.querySelector('.sb-fill'); this.$play = el.querySelector('.sb-play');
      this.chips(this.$chips);
      this.$play.onclick = () => (this._story ? this.stop() : this.play());
      this._onScroll = () => { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(() => this._progress()); };
      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onScroll);
      this.render();
    }
    _resize() { const n = this.el.clientWidth < 640; if (n !== this.el.classList.contains('narrow')) { this.el.classList.toggle('narrow', n); this._progress(); } else this._progress(); }
    render() {
      const evs = this.visible();
      this.$list.querySelectorAll('.sb-item').forEach(n => n.remove());
      const frag = document.createDocumentFragment();
      evs.forEach((e, i) => {
        const li = document.createElement('li');
        li.className = 'sb-item' + (i % 2 ? ' r' : '');
        li.dataset.id = e.id;
        li.style.setProperty('--c', catColor(this.el, e.cat));
        li.innerHTML = '<div class="sb-dot" aria-hidden="true"></div><article class="sb-card" tabindex="0" aria-label="' + esc(e.whenText + ': ' + e.title) + '">' +
          '<div class="sb-when"><b>' + esc(e.whenText) + '</b>' + (e.spanText ? '<span>' + esc(e.spanText) + '</span>' : '') + (this.d.cats.length > 1 ? '<span>' + esc(e.cat.label) + '</span>' : '') + '</div>' +
          '<h4>' + esc(e.title) + '</h4>' + (e.summary ? '<p>' + esc(e.summary) + '</p><button type="button" class="sb-more" hidden>Read more</button>' : '') +
          (e.link ? '<p style="-webkit-line-clamp:unset"><a href="' + esc(e.link) + '" target="_blank" rel="noopener">Source</a></p>' : '') + '</article>';
        frag.appendChild(li);
      });
      this.$list.appendChild(frag);
      this.$list.querySelectorAll('.sb-card').forEach(card => {
        const p = card.querySelector('p'), more = card.querySelector('.sb-more');
        if (p && more && p.scrollHeight > p.clientHeight + 2) {
          more.hidden = false;
          more.onclick = ev => { ev.stopPropagation(); card.classList.toggle('open'); more.textContent = card.classList.contains('open') ? 'Show less' : 'Read more'; };
        }
        card.addEventListener('click', () => this.open(card.parentNode.dataset.id, { scroll: false }));
        card.addEventListener('keydown', ev => { if (ev.key === 'Enter') this.open(card.parentNode.dataset.id, { scroll: false }); });
      });
      // year rail: one jump target per decade (or per year for short spans)
      const ys = evs.map(e => e.t0), spanY = ys.length ? ys[ys.length - 1] - ys[0] : 0;
      const step = spanY > 200 ? 100 : spanY > 40 ? 10 : 1, marks = [];
      evs.forEach(e => { const k = Math.floor(e.t0 / step) * step; if (!marks.length || marks[marks.length - 1].k !== k) marks.push({ k, id: e.id }); });
      this.$rail.innerHTML = marks.map(m => '<button type="button" data-id="' + esc(m.id) + '">' + esc(step === 1 ? yearLabel(m.k) : yearLabel(m.k) + (m.k >= 0 ? 's' : '')) + '</button>').join('');
      this.$rail.querySelectorAll('button').forEach(b => b.onclick = () => this.open(b.dataset.id));
      this._resize();
    }
    open(id, o) {
      o = o || {};
      const li = this.$list.querySelector('.sb-item[data-id="' + CSS.escape(id) + '"]');
      if (!li) return;
      this.$list.querySelectorAll('.sb-item.on').forEach(n => n.classList.remove('on'));
      li.classList.add('on', 'seen');
      if (o.scroll !== false) li.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      const e = this.d.events.find(x => x.id === id);
      this._emit('open', { event: this._pub(e) });
    }
    _progress() {
      const items = [...this.$list.querySelectorAll('.sb-item')];
      if (!items.length) return;
      const vh = window.innerHeight, line = vh * 0.62, r = this.$list.getBoundingClientRect();
      const fill = clamp(line - r.top, 0, r.height);
      this.$fill.style.height = fill + 'px';
      let seen = 0, current = null;
      items.forEach(li => { const b = li.getBoundingClientRect(); if (b.top < line) { li.classList.add('seen'); seen++; current = li; } });
      this.$rail.querySelectorAll('button').forEach(b => b.classList.remove('on'));
      if (current) {
        const evIdx = items.indexOf(current), ids = [...this.$rail.querySelectorAll('button')].map(b => b.dataset.id);
        for (let k = evIdx; k >= 0; k--) { const j = ids.indexOf(items[k].dataset.id); if (j >= 0) { this.$rail.querySelectorAll('button')[j].classList.add('on'); break; } }
      }
      if (seen !== this._seen) { this._seen = seen; this._emit('progress', { seen, total: items.length }); }
    }
    play() {
      const items = [...this.$list.querySelectorAll('.sb-item')];
      if (!items.length) return;
      let i = Math.max(0, items.findIndex(li => li.classList.contains('on')) + 1);
      if (i >= items.length) i = 0;
      this._story = true; this.$play.textContent = 'Pause story'; this.$play.classList.add('on');
      const step = () => {
        if (!this._story) return;
        if (i >= items.length) { this.stop(); return; }
        this.open(items[i].dataset.id);
        this._emit('step', { index: i, total: items.length });
        i++;
        this._storyT = setTimeout(step, this.o.storyMs);
      };
      step();
    }
    stop() { this._story = false; clearTimeout(this._storyT); this.$play.textContent = 'Play story'; this.$play.classList.remove('on'); }
    _teardown() { this.stop(); window.removeEventListener('scroll', this._onScroll); window.removeEventListener('resize', this._onScroll); }
  }
  Switchback.DEFAULTS = { storyMs: 3200 };

  /* ======================================================================================
   * Swimlane: lanes, points and spans, zoom/pan, navigator brush, detail panel
   * ====================================================================================== */
  class Swimlane extends TimelineBase {
    constructor(el, data, opts) {
      super(el, data, opts);
      const ev = this.d.events, a = Math.min(...ev.map(e => e.t0)), b = Math.max(...ev.map(e => e.t1 != null ? e.t1 : e.t0));
      const pad = Math.min((b - a) * 0.03, 25) || 1;
      this.full = [a - pad, b + pad];
      this.view = this.o.view ? [toDecimal(this.o.view[0]), toDecimal(this.o.view[1])] : this.full.slice();
      el.innerHTML = '<div class="tl-bar"><div class="tl-bar sl-chips" style="margin:0"></div><span style="flex:1"></span>' +
        '<button type="button" class="tl-btn" data-z="in" aria-label="Zoom in">+</button><button type="button" class="tl-btn" data-z="out" aria-label="Zoom out">−</button><button type="button" class="tl-btn" data-z="all">All</button></div>' +
        '<div class="sl-stage" tabindex="0" aria-label="Timeline lanes. Drag to move through time, scroll or pinch to zoom."></div><div class="sl-nav" aria-label="Navigator: drag the window to move through time"></div>' +
        '<div class="sl-detail" aria-live="polite" hidden></div>';
      this.$chips = el.querySelector('.sl-chips'); this.$stage = el.querySelector('.sl-stage'); this.$nav = el.querySelector('.sl-nav'); this.$detail = el.querySelector('.sl-detail');
      this.chips(this.$chips);
      el.querySelectorAll('[data-z]').forEach(bn => bn.onclick = () => {
        const z = bn.dataset.z, mid = (this.view[0] + this.view[1]) / 2;
        if (z === 'all') this.setView(this.full[0], this.full[1]); else this._zoom(mid, z === 'in' ? 0.6 : 1 / 0.6);
      });
      this._bind();
      this.render();
    }
    _resize() { this.render(); }
    setView(a, b) {
      const span = clamp(b - a, 0.05, (this.full[1] - this.full[0]) * 1.4), mid = clamp((a + b) / 2, this.full[0], this.full[1]);
      this.view = [mid - span / 2, mid + span / 2];
      this.render();
      this._emit('range', { view: this.view.slice() });
    }
    _zoom(t, f) { const v = this.view; this.setView(t - (t - v[0]) * f, t + (v[1] - t) * f); }
    _x(t) { return ((t - this.view[0]) / (this.view[1] - this.view[0])) * this.W; }
    _bind() {
      const st = this.$stage;
      const ptrs = new Map();
      st.addEventListener('pointerdown', e => {
        if (e.target.closest('.ev')) return;
        st.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, e.clientX);
        if (ptrs.size === 1) this._drag = { x: e.clientX, v: this.view.slice() };
        if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; this._pinch = { d: Math.abs(p - q) || 1, v: this.view.slice(), mid: (p + q) / 2 }; this._drag = null; }
      });
      st.addEventListener('pointermove', e => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.set(e.pointerId, e.clientX);
        const r = st.getBoundingClientRect();
        if (this._pinch && ptrs.size >= 2) {
          const [p, q] = [...ptrs.values()], f = this._pinch.d / (Math.abs(p - q) || 1), v = this._pinch.v;
          const t = v[0] + ((this._pinch.mid - r.left) / r.width) * (v[1] - v[0]);
          this.setView(t - (t - v[0]) * f, t + (v[1] - t) * f);
        } else if (this._drag) {
          const v = this._drag.v, dt = ((e.clientX - this._drag.x) / r.width) * (v[1] - v[0]);
          this.setView(v[0] - dt, v[1] - dt);
        }
      });
      const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) this._pinch = null; if (!ptrs.size) this._drag = null; };
      st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
      st.addEventListener('wheel', e => {
        if (!e.ctrlKey && Math.abs(e.deltaY) < Math.abs(e.deltaX)) { e.preventDefault(); const v = this.view, dt = (e.deltaX / this.W) * (v[1] - v[0]); this.setView(v[0] + dt, v[1] + dt); return; }
        e.preventDefault();
        const r = st.getBoundingClientRect(), t = this.view[0] + ((e.clientX - r.left) / r.width) * (this.view[1] - this.view[0]);
        this._zoom(t, Math.exp(e.deltaY * 0.0015));
      }, { passive: false });
      st.addEventListener('keydown', e => {
        const v = this.view, s = (v[1] - v[0]) * 0.15;
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.setView(v[0] - s, v[1] - s); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); this.setView(v[0] + s, v[1] + s); }
        else if (e.key === '+' || e.key === '=') this._zoom((v[0] + v[1]) / 2, 0.7);
        else if (e.key === '-') this._zoom((v[0] + v[1]) / 2, 1 / 0.7);
      });
      st.addEventListener('click', e => { const g = e.target.closest('.ev'); if (g) this.open(g.dataset.id); });
      st.addEventListener('keydown', e => { const g = e.target.closest('.ev'); if (g && e.key === 'Enter') this.open(g.dataset.id); });
      // navigator: click to centre, drag the window
      const nav = this.$nav;
      const navT = cx => { const r = nav.getBoundingClientRect(); return this.full[0] + ((cx - r.left) / r.width) * (this.full[1] - this.full[0]); };
      nav.addEventListener('pointerdown', e => {
        nav.setPointerCapture(e.pointerId);
        const t = navT(e.clientX), v = this.view, w = v[1] - v[0];
        this._nd = { off: t >= v[0] && t <= v[1] ? t - v[0] : w / 2, w };
        this.setView(t - this._nd.off, t - this._nd.off + w);
      });
      nav.addEventListener('pointermove', e => { if (!this._nd) return; const t = navT(e.clientX); this.setView(t - this._nd.off, t - this._nd.off + this._nd.w); });
      nav.addEventListener('pointerup', () => { this._nd = null; });
    }
    /** Pack the visible items of one lane into rows so labels never overlap at the current zoom. */
    _pack(evs) {
      const rows = [];
      evs.forEach(e => {
        const x0 = this._x(e.t0), x1 = e.t1 != null ? Math.max(this._x(e.t1), x0 + 8) : x0;
        const labelEnd = Math.max(x1, x0) + 14 + Math.min(220, e.title.length * 7.2);
        let r = rows.findIndex(end => end < x0 - 6);
        if (r < 0) { rows.push(0); r = rows.length - 1; }
        rows[r] = labelEnd;
        e._row = r; e._x0 = x0; e._x1 = x1;
      });
      return Math.max(1, rows.length);
    }
    render() {
      const T = themeOf(this.el), W = (this.W = Math.max(320, this.$stage.clientWidth || 800));
      const evs = this.visible(), lanes = this.d.cats.filter(c => !this.hidden.has(c.id));
      const axisH = 34, rowH = 30, lanePad = 12, labW = W < 560 ? 0 : 0;
      let y = axisH + 6, body = '';
      const span = this.view[1] - this.view[0];
      // eras as soft bands
      let bands = '';
      this.d.eras.forEach((er, i) => {
        const x0 = this._x(er.t0), x1 = this._x(er.t1);
        if (x1 < 0 || x0 > W) return;
        bands += (i % 2 ? '' : '<rect x="' + f1(x0) + '" y="0" width="' + f1(x1 - x0) + '" height="100%" fill="' + T.line + '" opacity=".25"/>') +
          (x1 - Math.max(x0, 0) > 70 ? '<text x="' + f1(Math.max(x0, 0) + 8) + '" y="' + (axisH + 16) + '" font-size="11" font-weight="700" fill="' + T.muted + '" letter-spacing=".06em">' + esc(er.label.toUpperCase()) + '</text>' : '');
      });
      lanes.forEach((c, li) => {
        const col = catColor(this.el, c);
        const inView = evs.filter(e => e.cat === c && (e.t1 != null ? e.t1 : e.t0) >= this.view[0] - span * 0.02 && e.t0 <= this.view[1] + span * 0.02);
        const rows = this._pack(inView), h = lanePad * 2 + rows * rowH + 16;
        body += '<rect x="0" y="' + y + '" width="' + W + '" height="' + h + '" fill="' + (li % 2 ? T.bg : T.surface) + '" opacity=".55"/>' +
          '<text x="10" y="' + (y + 16) + '" font-size="11.5" font-weight="800" fill="' + col + '" letter-spacing=".06em">' + esc(c.label.toUpperCase()) + '</text>';
        inView.forEach(e => {
          const yy = y + lanePad + 16 + e._row * rowH, sel = this.sel === e;
          const txt = e.title.length > 34 ? e.title.slice(0, 33) + '…' : e.title, lw = txt.length * 7.2;
          const right = (e.t1 != null ? e._x1 : e._x0) + 12, flip = right + lw > W - 6 && e._x0 - 12 - lw > 6;
          const label = '<text x="' + f1(flip ? e._x0 - 12 : right) + '" y="' + (yy + 4) + '"' + (flip ? ' text-anchor="end"' : '') + ' font-size="13" font-weight="' + (sel ? 800 : 600) + '" fill="' + T.fg + '">' + esc(txt) + '</text>';
          const mark = e.t1 != null
            ? '<rect x="' + f1(e._x0) + '" y="' + (yy - 8) + '" width="' + f1(e._x1 - e._x0) + '" height="16" rx="8" fill="' + col + '" opacity="' + (sel ? 1 : 0.8) + '"/>'
            : '<circle cx="' + f1(e._x0) + '" cy="' + yy + '" r="' + (sel ? 8.5 : 6.5) + '" fill="' + col + '" stroke="' + T.surface + '" stroke-width="2"/>';
          body += '<g class="ev" tabindex="0" role="button" data-id="' + esc(e.id) + '" aria-label="' + esc(e.whenText + ': ' + e.title) + '">' + mark + label + '</g>';
        });
        y += h;
      });
      const H = y + 4;
      // axis
      const step = niceStep(span, Math.max(3, Math.round(W / 120)));
      let axis = '<rect x="0" y="0" width="' + W + '" height="' + axisH + '" fill="' + T.surface + '"/><line x1="0" y1="' + axisH + '" x2="' + W + '" y2="' + axisH + '" stroke="' + T.line + '"/>';
      for (let t = Math.ceil(this.view[0] / step) * step; t <= this.view[1]; t += step) {
        const x = this._x(t);
        axis += '<line x1="' + f1(x) + '" y1="' + axisH + '" x2="' + f1(x) + '" y2="' + H + '" stroke="' + T.line + '" stroke-dasharray="2 5"/>' +
          '<text x="' + f1(x) + '" y="21" font-size="11.5" font-weight="600" text-anchor="middle" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(step < 1 ? fmt(t, step < 0.08 ? 'd' : 'm') : yearLabel(t)) + '</text>';
      }
      const now = new Date(), tn = now.getFullYear() + (now.getMonth() + now.getDate() / 31) / 12;
      if (tn > this.view[0] && tn < this.view[1]) axis += '<line x1="' + f1(this._x(tn)) + '" y1="' + axisH + '" x2="' + f1(this._x(tn)) + '" y2="' + H + '" stroke="' + T.accent + '" stroke-width="2"/><text x="' + f1(this._x(tn) + 5) + '" y="' + (H - 6) + '" font-size="11" font-weight="700" fill="' + T.accent + '">Today</text>';
      this.$stage.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" font-family="' + esc(T.font) + '">' + bands + body + axis + '</svg>';
      this._nav(T);
    }
    _nav(T) {
      const W = this.W, H = 44, f = this.full, x = t => ((t - f[0]) / (f[1] - f[0])) * W;
      let s = '';
      this.d.events.forEach(e => {
        const c = catColor(this.el, e.cat), yy = 10 + (e.cat.i % 4) * 7;
        s += e.t1 != null ? '<rect x="' + f1(x(e.t0)) + '" y="' + (yy - 2) + '" width="' + f1(Math.max(2, x(e.t1) - x(e.t0))) + '" height="4" rx="2" fill="' + c + '" opacity=".7"/>' : '<circle cx="' + f1(x(e.t0)) + '" cy="' + yy + '" r="2.5" fill="' + c + '"/>';
      });
      const vx0 = clamp(x(this.view[0]), 0, W), vx1 = clamp(x(this.view[1]), 0, W);
      s += '<rect x="' + f1(vx0) + '" y="2" width="' + f1(Math.max(6, vx1 - vx0)) + '" height="' + (H - 4) + '" rx="6" fill="' + T.accent + '" fill-opacity=".12" stroke="' + T.accent + '" stroke-width="1.5"/>';
      s += '<text x="6" y="' + (H - 6) + '" font-size="10" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(yearLabel(f[0])) + '</text><text x="' + (W - 6) + '" y="' + (H - 6) + '" font-size="10" text-anchor="end" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(yearLabel(f[1])) + '</text>';
      this.$nav.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '">' + s + '</svg>';
    }
    open(id) {
      const evs = this.visible(), i = evs.findIndex(e => e.id === id);
      if (i < 0) return;
      const e = evs[i]; this.sel = e;
      const v = this.view, w = v[1] - v[0];
      if (e.t0 < v[0] || e.t0 > v[1]) this.setView(e.t0 - w / 2, e.t0 + w / 2); else this.render();
      const col = catColor(this.el, e.cat);
      this.$detail.hidden = false;
      this.$detail.innerHTML = '<button type="button" class="tl-btn" data-n="-1" aria-label="Previous event"' + (i ? '' : ' disabled') + '>‹</button>' +
        '<div><small style="color:' + esc(col) + '">' + esc(e.whenText) + (e.spanText ? ' · ' + esc(e.spanText) : '') + ' · ' + esc(e.cat.label) + '</small><h4>' + esc(e.title) + '</h4>' + (e.summary ? '<p>' + esc(e.summary) + '</p>' : '') + '</div>' +
        '<button type="button" class="tl-btn" data-n="1" aria-label="Next event"' + (i < evs.length - 1 ? '' : ' disabled') + '>›</button>';
      this.$detail.querySelectorAll('[data-n]').forEach(b => b.onclick = () => this.open(evs[i + +b.dataset.n].id));
      this._emit('open', { event: this._pub(e) });
    }
  }
  function niceStep(span, target) {
    const raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    let s = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
    if (s < 1) { const opts = [1 / 365, 7 / 365, 1 / 12, 1 / 4, 1 / 2, 1]; s = opts.find(o => o >= raw) || 1; }
    return s;
  }

  /* ======================================================================================
   * Roadmap: Gantt with milestones, dependencies, progress, today line, drag-to-slip
   * ====================================================================================== */
  class Roadmap extends TimelineBase {
    constructor(el, data, opts) {
      super(el, data, opts);
      this.base = new Map(this.d.events.map(e => [e.id, [e.t0, e.t1 != null ? e.t1 : e.t0]]));
      el.innerHTML = '<div class="tl-bar"><div class="tl-bar rm-chips" style="margin:0"></div><span style="flex:1"></span><button type="button" class="tl-btn rm-reset">Back to the plan</button></div>' +
        '<div class="rm-wrap"></div><p class="rm-msg" aria-live="polite">Drag a task to see what moves with it.</p>';
      this.$chips = el.querySelector('.rm-chips'); this.$wrap = el.querySelector('.rm-wrap'); this.$msg = el.querySelector('.rm-msg');
      this.chips(this.$chips);
      el.querySelector('.rm-reset').onclick = () => this.reset();
      this.render();
    }
    _resize() { this.render(); }
    reset() {
      this.d.events.forEach(e => { const b = this.base.get(e.id); e.t0 = b[0]; if (e.t1 != null) e.t1 = b[1]; });
      this.$msg.textContent = 'Back to the original plan.';
      this.render();
      this._emit('change', { events: this.d.events.map(e => this._pub(e)), moved: null });
    }
    _finish() { return Math.max(...this.d.events.map(e => (e.t1 != null ? e.t1 : e.t0))); }
    /** Push dependants later so nothing starts before what it depends on finishes. */
    _cascade() {
      const byId = new Map(this.d.events.map(e => [e.id, e]));
      for (let pass = 0; pass < this.d.events.length; pass++) {
        let moved = false;
        this.d.events.forEach(e => {
          (e.depends || []).forEach(dep => {
            const d = byId.get(dep); if (!d) return;
            const need = d.t1 != null ? d.t1 : d.t0;
            if (e.t0 < need - 1e-9) { const len = e.t1 != null ? e.t1 - e.t0 : 0; e.t0 = need; if (e.t1 != null) e.t1 = need + len; moved = true; }
          });
        });
        if (!moved) break;
      }
    }
    render() {
      const T = themeOf(this.el), evs = this.visible();
      const minW = Math.max(this.$wrap.clientWidth || 800, 560);
      const labW = Math.min(230, minW * 0.32), rowH = 38, headH = 44;
      const all = this.d.events, a = Math.min(...all.map(e => e.t0)), b = Math.max(...all.map(e => (e.t1 != null ? e.t1 : e.t0)));
      const pad = (b - a) * 0.06 || 0.02, t0 = a - pad, t1 = b + pad * 3;
      const W = minW, gw = W - labW - 16, x = t => labW + ((t - t0) / (t1 - t0)) * gw;
      this._x = x; this._t = px => t0 + ((px - labW) / gw) * (t1 - t0);
      // group rows by category
      const rows = [];
      this.d.cats.filter(c => !this.hidden.has(c.id)).forEach(c => { const list = evs.filter(e => e.cat === c); if (list.length) { rows.push({ head: c }); list.forEach(e => rows.push({ e })); } });
      const H = headH + rows.length * rowH + 10;
      let g = '<rect width="' + W + '" height="' + H + '" fill="' + T.surface + '"/>';
      // month ticks
      const step = niceStep(t1 - t0, Math.max(4, Math.round(gw / 110)));
      for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) {
        g += '<line x1="' + f1(x(t)) + '" y1="' + headH + '" x2="' + f1(x(t)) + '" y2="' + H + '" stroke="' + T.line + '" stroke-dasharray="2 5"/>' +
          '<text x="' + f1(x(t)) + '" y="26" text-anchor="middle" font-size="11.5" font-weight="600" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(step < 0.08 ? fmt(t, 'd').replace(/ \d{4}$/, '') : fmt(t, 'm')) + '</text>';
      }
      const now = new Date(), tn = toDecimal(now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate());
      if (tn > t0 && tn < t1) g += '<line x1="' + f1(x(tn)) + '" y1="' + (headH - 6) + '" x2="' + f1(x(tn)) + '" y2="' + H + '" stroke="' + T.accent + '" stroke-width="2"/><text x="' + f1(x(tn)) + '" y="' + (headH - 10) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + T.accent + '">Today</text>';
      const pos = new Map();
      rows.forEach((r, i) => {
        const y = headH + i * rowH;
        if (r.head) { g += '<text x="12" y="' + (y + 25) + '" font-size="12" font-weight="800" letter-spacing=".06em" fill="' + catColor(this.el, r.head) + '">' + esc(r.head.label.toUpperCase()) + '</text><line x1="0" y1="' + (y + rowH - 1) + '" x2="' + W + '" y2="' + (y + rowH - 1) + '" stroke="' + T.line + '"/>'; return; }
        const e = r.e, col = catColor(this.el, e.cat), cy = y + rowH / 2;
        const name = e.title.length > 28 ? e.title.slice(0, 27) + '…' : e.title;
        g += '<text x="22" y="' + (cy + 4) + '" font-size="13.5" font-weight="600" fill="' + T.fg + '">' + esc(name) + '</text>';
        const st = e.status === 'risk' ? T.accent : col;
        if (e.t1 == null || e.milestone) {
          const mx = x(e.t0);
          g += '<g class="rm-bar" data-id="' + esc(e.id) + '" tabindex="0" role="button" aria-label="' + esc(e.title + ', milestone, ' + fmt(e.t0, 'd')) + '"><path d="M' + f1(mx) + ' ' + f1(cy - 11) + ' l11 11 l-11 11 l-11 -11 z" fill="' + st + '"/>' +
            '<text x="' + f1(mx + 16) + '" y="' + (cy + 4) + '" font-size="12" font-weight="700" fill="' + T.muted + '">' + esc(fmt(e.t0, 'd')) + '</text></g>';
          pos.set(e.id, { s: mx, f: mx, y: cy });
        } else {
          const bx = x(e.t0), bw = Math.max(6, x(e.t1) - bx), prog = clamp(+e.progress || 0, 0, 1);
          g += '<g class="rm-bar" data-id="' + esc(e.id) + '" tabindex="0" role="button" aria-label="' + esc(e.title + ', ' + fmt(e.t0, 'd') + ' to ' + fmt(e.t1, 'd')) + '">' +
            '<rect x="' + f1(bx) + '" y="' + (cy - 10) + '" width="' + f1(bw) + '" height="20" rx="6" fill="' + col + '" opacity=".28"/>' +
            '<rect x="' + f1(bx) + '" y="' + (cy - 10) + '" width="' + f1(Math.max(prog ? 6 : 0, bw * prog)) + '" height="20" rx="6" fill="' + col + '"/>' +
            (e.status === 'risk' ? '<rect x="' + f1(bx) + '" y="' + (cy - 10) + '" width="' + f1(bw) + '" height="20" rx="6" fill="none" stroke="' + T.accent + '" stroke-width="2" stroke-dasharray="4 3"/>' : '') +
            (bw > 70 ? '<text x="' + f1(bx + 8) + '" y="' + (cy + 4) + '" font-size="11.5" font-weight="700" fill="' + T.fg + '">' + esc(span(e.t0, e.t1, 'd')) + '</text>' : '') + '</g>';
          pos.set(e.id, { s: bx, f: bx + bw, y: cy });
        }
      });
      // dependency arrows
      let deps = '';
      evs.forEach(e => (e.depends || []).forEach(d => {
        const p = pos.get(d), q = pos.get(e.id); if (!p || !q) return;
        const mx = Math.max(p.f + 10, q.s - 10);
        deps += '<path d="M' + f1(p.f) + ' ' + f1(p.y) + ' H' + f1(mx) + ' V' + f1(q.y) + ' H' + f1(q.s - 4) + '" fill="none" stroke="' + T.muted + '" stroke-width="1.4" opacity=".7" marker-end="url(#rm-arrow)"/>';
      }));
      const defs = '<defs><marker id="rm-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="' + T.muted + '"/></marker></defs>';
      this.$wrap.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="' + esc(T.font) + '">' + defs + g + deps + '</svg>';
      this._bindBars();
    }
    _bindBars() {
      const svg = this.$wrap.querySelector('svg');
      svg.querySelectorAll('.rm-bar').forEach(bar => {
        const id = bar.dataset.id, e = this.d.events.find(x => x.id === id);
        const start = (clientX, pid) => {
          this._drag = { id, x: clientX, t0: e.t0, t1: e.t1, before: this._finish(), snapshot: this.d.events.map(x => [x.t0, x.t1]) };
          bar.classList.add('drag');
          if (pid != null) try { bar.setPointerCapture(pid); } catch (_) {}
        };
        bar.addEventListener('pointerdown', ev => { ev.preventDefault(); start(ev.clientX, ev.pointerId); });
        bar.addEventListener('pointermove', ev => {
          if (!this._drag || this._drag.id !== id) return;
          const r = svg.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width;
          const dt = this._t(this._x(this._drag.t0) + (ev.clientX - this._drag.x) * scale) - this._drag.t0;
          this._apply(dt);
        });
        const end = () => { if (!this._drag || this._drag.id !== id) return; this._done(); };
        bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
        bar.addEventListener('keydown', ev => {
          if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
          ev.preventDefault();
          start(0, null);
          this._apply((ev.key === 'ArrowRight' ? 7 : -7) / 365);
          this._done();
          const again = this.$wrap.querySelector('.rm-bar[data-id="' + CSS.escape(id) + '"]'); again && again.focus();
        });
      });
    }
    _apply(dt) {
      const d = this._drag, day = 1 / 365;
      dt = Math.round(dt / day) * day;
      this.d.events.forEach((x, i) => { x.t0 = d.snapshot[i][0]; x.t1 = d.snapshot[i][1]; });
      const e = this.d.events.find(x => x.id === d.id);
      e.t0 = d.t0 + dt; if (e.t1 != null) e.t1 = d.t1 + dt;
      this._cascade();
      this.render();
    }
    _done() {
      const d = this._drag; this._drag = null;
      const e = this.d.events.find(x => x.id === d.id), shift = e.t0 - d.t0, after = this._finish(), delta = after - d.before;
      const days = Math.round(Math.abs(shift) * 365), fdays = Math.round(Math.abs(delta) * 365);
      const end = this.d.events.slice().sort((a, b) => (b.t1 != null ? b.t1 : b.t0) - (a.t1 != null ? a.t1 : a.t0))[0];
      if (!days) this.$msg.textContent = 'Drag a task to see what moves with it.';
      else this.$msg.innerHTML = 'Moving <b>' + esc(e.title) + '</b> ' + days + ' days ' + (shift > 0 ? 'later' : 'earlier') + (fdays ? ' moves the finish (<b>' + esc(end.title) + '</b>) to <b>' + esc(fmt(after, 'd')) + '</b>, ' + fdays + ' days ' + (delta > 0 ? 'later' : 'earlier') + '.' : ' does not change the finish date.');
      this._emit('change', { moved: { id: e.id, days: Math.round(shift * 365) }, finish: fromDecimal(after), events: this.d.events.map(x => this._pub(x)) });
    }
  }

  /* ======================================================================================
   * Waypath: road / cycle / steps; tap a stop to reveal it; play walks the path
   * ====================================================================================== */
  class Waypath extends TimelineBase {
    constructor(el, data, opts) {
      super(el, data, opts);
      el.innerHTML = '<div class="tl-bar"><div class="tl-bar wp-shapes" role="group" aria-label="Path shape" style="margin:0"></div><span style="flex:1"></span><button type="button" class="tl-btn wp-play">Play</button></div>' +
        '<div class="wp-stage"></div><div class="wp-card" aria-live="polite"></div>';
      this.$shapes = el.querySelector('.wp-shapes'); this.$stage = el.querySelector('.wp-stage'); this.$card = el.querySelector('.wp-card'); this.$play = el.querySelector('.wp-play');
      const shapes = [['road', 'Road'], ['cycle', 'Cycle'], ['steps', 'Steps']];
      this.$shapes.innerHTML = shapes.map(s => '<button type="button" class="tl-btn' + (s[0] === this.o.shape ? ' on' : '') + '" data-s="' + s[0] + '" aria-pressed="' + (s[0] === this.o.shape) + '">' + s[1] + '</button>').join('');
      this.$shapes.querySelectorAll('button').forEach(b => b.onclick = () => {
        this.o.shape = b.dataset.s;
        this.$shapes.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        this.render();
      });
      this.$play.onclick = () => (this._playing ? this.stop() : this.play());
      this.current = 0;
      this.render();
    }
    _resize() { const w = this.$stage.clientWidth; if (w && w !== this._w) { this._w = w; this.render(); } }
    _layout(n, W) {
      const shape = this.o.shape, pts = [];
      if (shape === 'cycle') {
        const H = Math.min(W, 640) * 0.86, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / n) * TAU; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
        let d = '';
        for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + ((i % n) / n) * TAU; d += (i ? ' A' + f1(R) + ' ' + f1(R) + ' 0 0 1 ' : 'M') + f1(cx + Math.cos(a) * R) + ' ' + f1(cy + Math.sin(a) * R); }
        return { pts, d, H, label: 'out', cx, cy };
      }
      if (shape === 'steps') {
        const H = Math.max(320, n * 70 + 60), sw = (W - 80) / n, sh = (H - 120) / n;
        let d = 'M40 ' + f1(H - 40);
        for (let i = 0; i < n; i++) {
          const x0 = 40 + i * sw, y = H - 40 - (i + 1) * sh;
          d += ' V' + f1(y) + ' H' + f1(x0 + sw);
          pts.push([x0 + sw / 2, y]);
        }
        return { pts, d, H, label: 'above' };
      }
      // road: serpentine rows
      const perRow = W < 520 ? 2 : W < 900 ? 3 : 4, rows = Math.ceil(n / perRow), rowH = 150, H = rows * rowH + 40, mx = 70;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / perRow), k = i % perRow, ltr = r % 2 === 0;
        const x = mx + ((ltr ? k : perRow - 1 - k) + 0.5) * ((W - mx * 2) / perRow), y = 50 + r * rowH;
        pts.push([x, y]);
      }
      let d = 'M' + f1(pts[0][0] - 40) + ' ' + f1(pts[0][1]) + ' L' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
      for (let i = 1; i < n; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (y1 === y0) d += ' L' + f1(x1) + ' ' + f1(y1);
        else { const ex = x0 > W / 2 ? W - mx / 2 : mx / 2; d += ' C' + f1(ex) + ' ' + f1(y0) + ' ' + f1(ex) + ' ' + f1(y1) + ' ' + f1(x1) + ' ' + f1(y1); }
      }
      return { pts, d, H, label: 'below' };
    }
    render() {
      const T = themeOf(this.el), evs = this.visible(), W = Math.max(300, this.$stage.clientWidth || 800), n = evs.length;
      if (!n) { this.$stage.innerHTML = ''; return; }
      this.current = clamp(this.current, 0, n - 1);
      const L = this._layout(n, W);
      let s = '<path d="' + L.d + '" fill="none" stroke="' + T.line + '" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + L.d + '" fill="none" stroke="' + T.surface + '" stroke-width="2" stroke-dasharray="10 10"/>';
      L.pts.forEach(([x, y], i) => {
        const e = evs[i], col = catColor(this.el, e.cat), on = i === this.current, done = i < this.current, r = on ? 24 : 19;
        let tx = x, ty = L.label === 'above' ? y - r - 14 : y + r + 22, anchor = 'middle';
        if (L.label === 'out') { const a = Math.atan2(y - L.cy, x - L.cx); tx = x + Math.cos(a) * (r + 16); ty = y + Math.sin(a) * (r + 16) + 4; anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle'; if (Math.abs(Math.cos(a)) <= 0.3) ty += Math.sin(a) > 0 ? 12 : -4; }
        const title = e.title.length > 24 ? e.title.slice(0, 23) + '…' : e.title;
        s += '<g class="wp-stop" tabindex="0" role="button" data-i="' + i + '" aria-label="Stop ' + (i + 1) + ': ' + esc(e.title) + '"' + (on ? ' aria-current="step"' : '') + '>' +
          (on ? '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (r + 8) + '" fill="' + col + '" opacity=".18"/>' : '') +
          '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + r + '" fill="' + (on || done ? col : T.surface) + '" stroke="' + col + '" stroke-width="3"/>' +
          '<text x="' + f1(x) + '" y="' + f1(y + 5) + '" text-anchor="middle" font-size="' + (on ? 16 : 14) + '" font-weight="800" fill="' + (on || done ? T.surface : col) + '">' + (i + 1) + '</text>' +
          '<text x="' + f1(tx) + '" y="' + f1(ty) + '" text-anchor="' + anchor + '" font-size="13" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(title) + '</text></g>';
      });
      this.$stage.innerHTML = '<svg viewBox="0 0 ' + f1(W) + ' ' + f1(L.H) + '" font-family="' + esc(T.font) + '">' + s + '</svg>';
      this.$stage.querySelectorAll('.wp-stop').forEach(g => {
        g.onclick = () => this.go(+g.dataset.i);
        g.onkeydown = ev => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.go(+g.dataset.i); }
          else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); this.go(+g.dataset.i + 1, true); }
          else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); this.go(+g.dataset.i - 1, true); }
        };
      });
      const e = evs[this.current];
      this.$card.innerHTML = '<small style="color:' + esc(catColor(this.el, e.cat)) + '">Stop ' + (this.current + 1) + ' of ' + n + (e.whenText ? ' · ' + esc(e.whenText) : '') + '</small><h4>' + esc(e.title) + '</h4>' + (e.summary ? '<p>' + esc(e.summary) + '</p>' : '');
    }
    go(i, focus) {
      const n = this.visible().length;
      this.current = clamp(i, 0, n - 1);
      this.render();
      if (focus) { const g = this.$stage.querySelector('.wp-stop[data-i="' + this.current + '"]'); g && g.focus(); }
      const e = this.visible()[this.current];
      this._emit('open', { event: this._pub(e), index: this.current });
    }
    play() {
      this._playing = true; this.$play.textContent = 'Pause'; this.$play.classList.add('on');
      if (this.current >= this.visible().length - 1) this.current = -1;
      const tick = () => {
        if (!this._playing) return;
        if (this.current >= this.visible().length - 1) { this.stop(); return; }
        this.go(this.current + 1);
        this._emit('step', { index: this.current });
        this._t = setTimeout(tick, this.o.stepMs);
      };
      tick();
    }
    stop() { this._playing = false; clearTimeout(this._t); this.$play.textContent = 'Play'; this.$play.classList.remove('on'); }
    _teardown() { this.stop(); }
  }
  Waypath.DEFAULTS = { shape: 'road', stepMs: 2400 };

  return { Switchback, Swimlane, Roadmap, Waypath, parseDate, normalise };
});
