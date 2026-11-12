/*! Stories 1.0 · Dimau Infographics
 *  Six formats for telling a story with information:
 *    Beforeafter  two pictures on top of each other with a handle to drag (or arrow keys) between before and after.
 *    Slidestory   a story told one card at a time: swipe, tap or use the arrow keys; play it through.
 *    Verdict      claims to judge true, false or partly true: guess first, then see the answer and why.
 *    Annotline    a line chart with numbered notes; step through them and the chart highlights each moment.
 *    Liveticker   counters running from the moment the page opened, from real rates.
 *    Flowchart    a process with steps and decisions; tap a box to see its ways in and out, or walk the main path.
 *
 *  new Beforeafter(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Beforeafter', 'Slidestory', 'Verdict', 'Annotline', 'Liveticker', 'Flowchart'].forEach(function (k) { root[k] = m[k]; }); root.DimauStories = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 0 }) + (o.suffix || '') : '–'; };
  const OK = '#1fa38a', NO = '#c2563a', PART = '#d9a42b';
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };

  const STYLE = `
.dy{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dy) button{font:inherit;color:inherit}
.dy :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dy svg{display:block;width:100%}
.dy svg [data-k]{cursor:pointer}
.dy svg [data-k]:focus{outline:none}
.dy svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:3}
.dy-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.dy-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer}
.dy-btn.primary,.dy-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dy-btn:disabled{opacity:.4;cursor:default}
.dy-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dy-small{font-size:12.5px;color:var(--di-muted,#4f6578)}
.ba-frame{position:relative;overflow:hidden;border-radius:12px;border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);touch-action:pan-y;user-select:none}
.ba-frame img{display:block;width:100%;height:auto;pointer-events:none}
.ba-top{position:absolute;inset:0}
.ba-top img{height:100%;width:100%;object-fit:cover;object-position:left top}
.ba-line{position:absolute;top:0;bottom:0;width:3px;margin-left:-1.5px;background:var(--di-surface,#fff);box-shadow:0 0 0 1px rgba(0,0,0,.25)}
.ba-handle{position:absolute;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:var(--di-surface,#fff);border:2px solid var(--di-fg,#13263a);display:grid;place-items:center;font-weight:800;cursor:ew-resize;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.ba-tag{position:absolute;top:10px;padding:4px 10px;border-radius:99px;background:rgba(19,38,58,.82);color:#fff;font-size:12.5px;font-weight:700}
.ss-card{position:relative;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:16px;padding:22px;min-height:230px;display:grid;align-content:start;gap:10px;overflow:hidden;touch-action:pan-y}
.ss-num{font:800 13px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-accent,#0b6fa4);letter-spacing:.08em}
.ss-big{font-size:46px;font-weight:800;line-height:1;color:var(--di-accent,#0b6fa4)}
.ss-title{font-size:22px;font-weight:800;line-height:1.25;margin:0}
.ss-text{font-size:15.5px;line-height:1.6;margin:0}
.ss-dots{display:flex;gap:6px;flex-wrap:wrap}
.ss-dots button{width:26px;height:8px;border-radius:99px;border:0;background:var(--di-line,#c9dce8);cursor:pointer;padding:0}
.ss-dots button[aria-current="step"]{background:var(--di-accent,#0b6fa4)}
@media (prefers-reduced-motion:no-preference){.ss-card.in{animation:dy-in .3s both}}
@keyframes dy-in{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
.vd-card{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:14px;padding:16px;margin-bottom:10px;display:grid;gap:10px}
.vd-claim{font-size:17px;font-weight:800;line-height:1.35;margin:0}
.vd-opts{display:flex;flex-wrap:wrap;gap:8px}
.vd-opts button{border:1.5px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);border-radius:999px;padding:7px 14px;font-weight:700;cursor:pointer}
.vd-opts button:disabled{cursor:default}
.vd-opts button.pick{border-color:var(--di-fg,#13263a)}
.vd-res{border-left:4px solid;padding:8px 12px;border-radius:0 10px 10px 0;background:var(--di-bg,#eef7fb);font-size:14.5px;line-height:1.5}
.vd-stamp{display:inline-block;font:800 12px/1 var(--di-mono,ui-monospace,monospace);letter-spacing:.06em;padding:4px 8px;border-radius:6px;color:#fff;margin-right:8px;vertical-align:1px}
.lt-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.lt-card{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:14px;padding:14px 16px;display:grid;gap:4px}
.lt-v{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--di-accent,#0b6fa4);line-height:1.1;word-break:break-all}
.lt-l{font-weight:700;font-size:14.5px}
`;
  function injectStyle() {
    if (document.getElementById('dy-style')) return;
    const s = document.createElement('style'); s.id = 'dy-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dy');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dy'); }
  }

  /* ======================================================================================
   * Beforeafter: drag (or arrow keys) between two pictures
   * data = { before:{src,label,alt}, after:{src,label,alt}, caption? }  options: { start: 50 }
   * ====================================================================================== */
  class Beforeafter extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { start: 50 });
      const b = data.before, a = data.after; this.pos = clamp(+this.o.start, 0, 100);
      el.innerHTML = '<div class="ba-frame"><img src="' + esc(a.src) + '" alt="' + esc(a.alt || a.label) + '"><div class="ba-top"><img src="' + esc(b.src) + '" alt="' + esc(b.alt || b.label) + '"></div>' +
        '<span class="ba-tag" style="left:10px">' + esc(b.label) + '</span><span class="ba-tag" style="right:10px">' + esc(a.label) + '</span><div class="ba-line"></div>' +
        '<div class="ba-handle" role="slider" tabindex="0" aria-label="' + esc('Drag to compare ' + b.label + ' and ' + a.label) + '" aria-valuemin="0" aria-valuemax="100">↔</div></div>' +
        '<div class="dy-bar"><button type="button" class="dy-btn" data-go="100">Show ' + esc(b.label) + '</button><button type="button" class="dy-btn" data-go="50">Half and half</button><button type="button" class="dy-btn" data-go="0">Show ' + esc(a.label) + '</button></div><p class="dy-note" aria-live="polite"></p>';
      this.$f = el.querySelector('.ba-frame'); this.$top = el.querySelector('.ba-top'); this.$line = el.querySelector('.ba-line'); this.$h = el.querySelector('.ba-handle'); this.$note = el.querySelector('.dy-note');
      el.querySelectorAll('[data-go]').forEach(btn => btn.onclick = () => this.set(+btn.dataset.go));
      this.$h.addEventListener('keydown', e => { const d = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key]; if (d == null) return; e.preventDefault(); this.set(this.pos + d); });
      let drag = false; const at = e => { const r = this.$f.getBoundingClientRect(); this.set(((e.clientX - r.left) / r.width) * 100, true); };
      this.$f.addEventListener('pointerdown', e => { drag = true; this.$f.setPointerCapture(e.pointerId); at(e); });
      this.$f.addEventListener('pointermove', e => { if (drag) at(e); });
      const end = () => { if (drag) { drag = false; this._emit('change', { position: Math.round(this.pos) }); } };
      this.$f.addEventListener('pointerup', end); this.$f.addEventListener('pointercancel', end);
      this.render();
    }
    set(p, quiet) { this.pos = clamp(p, 0, 100); this.render(); if (!quiet) this._emit('change', { position: Math.round(this.pos) }); }
    render() {
      const p = this.pos, d = this.data;
      this.$top.style.clipPath = 'inset(0 ' + f1(100 - p) + '% 0 0)'; this.$line.style.left = p + '%'; this.$h.style.left = p + '%';
      this.$h.setAttribute('aria-valuenow', String(Math.round(p))); this.$h.setAttribute('aria-valuetext', Math.round(p) + '% ' + d.before.label + ', ' + Math.round(100 - p) + '% ' + d.after.label);
      this.$note.innerHTML = (p >= 99 ? 'Showing all of <b>' + esc(d.before.label) + '</b>.' : p <= 1 ? 'Showing all of <b>' + esc(d.after.label) + '</b>.' : '<b>' + esc(d.before.label) + '</b> on the left, <b>' + esc(d.after.label) + '</b> on the right.') + (d.caption ? ' ' + esc(d.caption) : '') + ' Drag the handle, or use the arrow keys.';
    }
  }

  /* ======================================================================================
   * Slidestory: one card at a time; swipe, tap or arrow keys; play
   * data = { title?, slides:[{id,title,text,big?,kicker?}] }  options: { interval: 6000 }
   * ====================================================================================== */
  class Slidestory extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { interval: 6000 });
      this.slides = data.slides; this.i = 0; this.playing = false;
      el.innerHTML = '<div class="ss-card" aria-live="polite" tabindex="0" aria-roledescription="slide"></div><div class="dy-bar"><button type="button" class="dy-btn" data-d="-1" aria-label="Previous">←</button><button type="button" class="dy-btn primary" data-d="1">Next →</button><button type="button" class="dy-btn" data-play aria-pressed="false">Play</button></div><nav class="ss-dots" aria-label="Slides"></nav>';
      this.$c = el.querySelector('.ss-card'); this.$dots = el.querySelector('.ss-dots');
      el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => this.go(this.i + +b.dataset.d));
      el.querySelector('[data-play]').onclick = () => this.play(!this.playing);
      this.$dots.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) this.go(+b.dataset.i); });
      el.addEventListener('keydown', e => { if (e.target.closest('input')) return; if (e.key === 'ArrowRight') { e.preventDefault(); this.go(this.i + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.i - 1); } });
      let x0 = null; this.$c.addEventListener('pointerdown', e => { x0 = e.clientX; }); this.$c.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 40) this.go(this.i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
      this._teardown = () => clearInterval(this._t);
      this.render();
    }
    go(i, auto) { const n = this.slides.length; if (i >= n && !auto) return; this.i = ((i % n) + n) % n; this.render(true); this._emit('slide', { index: this.i, id: this.slides[this.i].id }); if (!auto && this.playing) this.play(false); }
    play(on) { this.playing = on; clearInterval(this._t); if (on) this._t = setInterval(() => this.go(this.i + 1, true), reduced() ? Math.max(this.o.interval, 9000) : this.o.interval); this.el.querySelector('[data-play]').setAttribute('aria-pressed', String(on)); this.el.querySelector('[data-play]').textContent = on ? 'Pause' : 'Play'; }
    render(anim) {
      const s = this.slides[this.i], n = this.slides.length;
      this.$c.className = 'ss-card' + (anim ? ' in' : ''); void this.$c.offsetWidth;
      this.$c.setAttribute('aria-label', 'Slide ' + (this.i + 1) + ' of ' + n);
      this.$c.innerHTML = '<span class="ss-num">' + (s.kicker ? esc(s.kicker) + ' · ' : '') + (this.i + 1) + ' / ' + n + '</span>' + (s.big ? '<span class="ss-big">' + esc(s.big) + '</span>' : '') + '<h4 class="ss-title">' + esc(s.title) + '</h4><p class="ss-text">' + esc(s.text) + '</p>';
      this.$dots.innerHTML = this.slides.map((x, k) => '<button type="button" data-i="' + k + '" aria-label="' + esc('Slide ' + (k + 1) + ': ' + x.title) + '"' + (k === this.i ? ' aria-current="step"' : '') + '></button>').join('');
      const nx = this.el.querySelector('[data-d="1"]'); nx.disabled = this.i === n - 1 && !this.playing; nx.textContent = this.i === n - 1 ? 'The end' : 'Next →';
      this.el.querySelector('[data-d="-1"]').disabled = this.i === 0;
    }
  }

  /* ======================================================================================
   * Verdict: judge each claim true, false or partly; then see why
   * data = { claims:[{id, claim, verdict:'true'|'false'|'partly', why}] }
   * ====================================================================================== */
  const VERD = { true: { w: 'True', c: OK }, false: { w: 'False', c: NO }, partly: { w: 'Partly true', c: PART } };
  class Verdict extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.claims = data.claims; this.ans = {};
      el.innerHTML = '<p class="dy-note" aria-live="polite" style="margin:0 0 10px"></p><div class="vd-list"></div><div class="dy-bar"><button type="button" class="dy-btn" data-reveal>Show all answers</button><button type="button" class="dy-btn" data-reset>Start again</button></div>';
      this.$list = el.querySelector('.vd-list'); this.$note = el.querySelector('.dy-note');
      this.$list.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) this.guess(b.closest('[data-id]').dataset.id, b.dataset.v); });
      el.querySelector('[data-reveal]').onclick = () => { this.claims.forEach(c => { if (!this.ans[c.id]) this.ans[c.id] = 'shown'; }); this.render(); };
      el.querySelector('[data-reset]').onclick = () => { this.ans = {}; this.render(); };
      this.render();
    }
    guess(id, v) {
      if (this.ans[id]) return; const c = this.claims.find(x => x.id === id); this.ans[id] = v; this.render();
      const r = this.$list.querySelector('[data-id="' + CSS.escape(id) + '"] .vd-res'); r && r.focus({ preventScroll: true });
      this._emit('guess', { id, guess: v, correct: v === c.verdict });
      if (this.claims.every(x => this.ans[x.id])) this._emit('finish', { score: this.score(), total: this.claims.length });
    }
    score() { return this.claims.filter(c => this.ans[c.id] === c.verdict).length; }
    render() {
      this.$list.innerHTML = this.claims.map((c, k) => {
        const a = this.ans[c.id], V = VERD[c.verdict], done = !!a, right = a === c.verdict;
        return '<article class="vd-card" data-id="' + esc(c.id) + '"><span class="dy-small">Claim ' + (k + 1) + ' of ' + this.claims.length + '</span><p class="vd-claim">“' + esc(c.claim) + '”</p>' +
          '<div class="vd-opts" role="group" aria-label="Your verdict">' + ['true', 'partly', 'false'].map(v => '<button type="button" data-v="' + v + '"' + (done ? ' disabled' : '') + (a === v ? ' class="pick"' : '') + '>' + VERD[v].w + '</button>').join('') + '</div>' +
          (done ? '<div class="vd-res" tabindex="-1" style="border-color:' + V.c + '"><span class="vd-stamp" style="background:' + V.c + '">' + V.w.toUpperCase() + '</span>' + (a === 'shown' ? '' : right ? '<b>You got it.</b> ' : '<b>Not quite.</b> ') + esc(c.why) + '</div>' : '') + '</article>';
      }).join('');
      const g = this.claims.filter(c => this.ans[c.id] && this.ans[c.id] !== 'shown').length;
      this.$note.innerHTML = g ? '<b>' + this.score() + ' of ' + g + '</b> right so far.' + (g === this.claims.length ? ' That is all of them.' : '') : 'Is each claim true, false or partly true? Choose, then see the answer and why.';
    }
  }

  /* ======================================================================================
   * Annotline: a line chart with numbered notes to step through
   * data = { points:[{label,value}], notes:[{at:index,title,text}], prefix?, suffix?, unit? }
   * ====================================================================================== */
  class Annotline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.pts = data.points.map(p => Object.assign({}, p, { value: +p.value })); this.notes = data.notes.slice().sort((a, b) => a.at - b.at); this.k = -1;
      el.innerHTML = '<svg role="img"></svg><div class="dy-bar"><button type="button" class="dy-btn" data-d="-1" aria-label="Previous note">←</button><button type="button" class="dy-btn primary" data-d="1">First note →</button><button type="button" class="dy-btn" data-all>Whole story</button></div><p class="dy-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dy-note');
      el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => this.step(+b.dataset.d));
      el.querySelector('[data-all]').onclick = () => { this.k = -1; this.render(); };
      this.$svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) this.show(+g.dataset.k); });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.show(+g.dataset.k); } });
      this.render();
    }
    step(d) { this.show(clamp(this.k + d, 0, this.notes.length - 1)); }
    show(k) { this.k = k; this.render(); this._emit('note', { index: k, title: this.notes[k].title }); }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 230 : 280, pl = narrow ? 30 : 40, pr = 14, pt = 30, pb = 26, n = this.pts.length;
      const max = Math.max(...this.pts.map(p => p.value)) * 1.08 || 1, sx = i => pl + (i / (n - 1)) * (W - pl - pr), sy = v => pt + (1 - v / max) * (H - pt - pb), cur = this.k >= 0 ? this.notes[this.k] : null;
      let s = '';
      [0, 0.5, 1].forEach(f => { const v = max * f / 1.08; s += '<line x1="' + pl + '" y1="' + f1(sy(v)) + '" x2="' + (W - pr) + '" y2="' + f1(sy(v)) + '" stroke="' + T.line + '" opacity=".7"/><text x="' + (pl - 6) + '" y="' + f1(sy(v) + 4) + '" text-anchor="end" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(fmtNum(v)) + '</text>'; });
      if (cur) { const x0 = sx(Math.max(0, cur.at - 0.5)), x1 = sx(Math.min(n - 1, cur.at + 0.5)); s += '<rect x="' + f1(x0) + '" y="' + pt + '" width="' + f1(x1 - x0) + '" height="' + (H - pt - pb) + '" fill="' + T.accent + '" opacity=".1"/>'; }
      const line = this.pts.map((p, i) => (i ? 'L' : 'M') + f1(sx(i)) + ' ' + f1(sy(p.value))).join(' ');
      s += '<path d="' + line + ' L' + f1(sx(n - 1)) + ' ' + f1(sy(0)) + ' L' + f1(sx(0)) + ' ' + f1(sy(0)) + 'Z" fill="' + T.accent + '" opacity=".1"/><path d="' + line + '" fill="none" stroke="' + T.accent + '" stroke-width="3" stroke-linejoin="round"/>';
      const every = Math.ceil(n / (narrow ? 5 : 12));
      this.pts.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += '<text x="' + f1(clamp(sx(i), 14, W - 14)) + '" y="' + (H - 7) + '" text-anchor="' + (i === n - 1 ? 'end' : 'middle') + '" font-size="10.5" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + esc(p.label) + '</text>'; });
      this.notes.forEach((nt, k) => { const x = sx(nt.at), y = sy(this.pts[nt.at].value), on = this.k === k;
        s += '<g data-k="' + k + '" tabindex="0" role="button" aria-label="' + esc('Note ' + (k + 1) + ': ' + nt.title) + '"><circle cx="' + f1(x) + '" cy="' + f1(y - 18) + '" r="' + (on ? 13 : 11) + '" fill="' + (on ? T.fg : T.surface) + '" stroke="' + T.fg + '" stroke-width="2"/><text x="' + f1(x) + '" y="' + f1(y - 14) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="' + (on ? T.surface : T.fg) + '" pointer-events="none">' + (k + 1) + '</text><line x1="' + f1(x) + '" y1="' + f1(y - 7) + '" x2="' + f1(x) + '" y2="' + f1(y - 2) + '" stroke="' + T.fg + '" stroke-width="2"/></g>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Line from ' + this.pts[0].label + ' (' + fmtNum(this.pts[0].value, d) + ') to ' + this.pts[n - 1].label + ' (' + fmtNum(this.pts[n - 1].value, d) + ') with ' + this.notes.length + ' notes');
      const a = document.activeElement, keep = a && this.$svg.contains(a) ? a.dataset.k : null; this.$svg.innerHTML = s; if (keep != null) { const g = this.$svg.querySelector('[data-k="' + keep + '"]'); g && g.focus({ preventScroll: true }); }
      const nx = this.el.querySelector('[data-d="1"]'); nx.textContent = this.k < 0 ? 'First note →' : 'Next note →'; nx.disabled = this.k === this.notes.length - 1; this.el.querySelector('[data-d="-1"]').disabled = this.k <= 0;
      if (cur) { const p = this.pts[cur.at]; this.$note.innerHTML = '<span class="dy-small">Note ' + (this.k + 1) + ' of ' + this.notes.length + ' · ' + esc(p.label) + ' · ' + esc(fmtNum(p.value, d)) + '</span><br><b>' + esc(cur.title) + '.</b> ' + esc(cur.text); }
      else { const a0 = this.pts[0], a1 = this.pts[n - 1]; this.$note.innerHTML = 'From <b>' + esc(fmtNum(a0.value, d)) + '</b> in ' + esc(a0.label) + ' to <b>' + esc(fmtNum(a1.value, d)) + '</b> in ' + esc(a1.label) + '. Step through the ' + this.notes.length + ' notes to see what happened along the way.'; }
    }
  }

  /* ======================================================================================
   * Liveticker: counters running from the moment the page opened
   * data = { items:[{id,label,perSecond,unit,decimals?,source?}] }  options: { since?: ms timestamp }
   * ====================================================================================== */
  class Liveticker extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { since: null });
      this.t0 = this.o.since != null ? +this.o.since : Date.now(); this.paused = false; this.frozen = 0;
      el.innerHTML = '<p class="dy-note" style="margin:0 0 10px" data-head></p><div class="lt-grid"></div><div class="dy-bar"><button type="button" class="dy-btn" data-pause aria-pressed="false">Pause</button><button type="button" class="dy-btn" data-reset>Start again</button></div><p class="dy-small" data-src></p>';
      this.$g = el.querySelector('.lt-grid'); this.$head = el.querySelector('[data-head]');
      this.$g.innerHTML = data.items.map(it => '<div class="lt-card"><span class="lt-l">' + esc(it.label) + '</span><span class="lt-v" data-v="' + esc(it.id) + '">0</span><span class="dy-small">' + esc(it.unit) + ' · ' + esc(fmtNum(it.perSecond, { decimals: it.perSecond < 100 ? 2 : it.perSecond < 1000 ? 0 : 3 })) + ' a second</span></div>').join('');
      el.querySelector('[data-src]').textContent = data.items.filter(i => i.source).map(i => i.label + ': ' + i.source).join(' · ');
      el.querySelector('[data-pause]').onclick = () => { this.paused = !this.paused; if (this.paused) this.frozen = this.elapsed(); else this.t0 = Date.now() - this.frozen * 1000; el.querySelector('[data-pause]').setAttribute('aria-pressed', String(this.paused)); el.querySelector('[data-pause]').textContent = this.paused ? 'Carry on' : 'Pause'; this.render(); };
      el.querySelector('[data-reset]').onclick = () => { this.t0 = Date.now(); this.frozen = 0; this.render(); this._emit('reset', {}); };
      const tick = () => { if (!this.paused) this.render(); this._raf = setTimeout(tick, reduced() ? 1000 : 100); }; tick();
      this._teardown = () => clearTimeout(this._raf);
    }
    elapsed() { return this.paused ? this.frozen : Math.max(0, (Date.now() - this.t0) / 1000); }
    value(id) { const it = this.data.items.find(i => i.id === id); return it ? it.perSecond * this.elapsed() : NaN; }
    render() {
      if (!this.$g) return; const s = this.elapsed();
      this.data.items.forEach(it => { const v = this.$g.querySelector('[data-v="' + CSS.escape(it.id) + '"]'); if (v) v.textContent = fmtNum(it.perSecond * s, { decimals: it.decimals || 0 }); });
      this.$head.innerHTML = 'Since you opened this page <b>' + Math.floor(s) + (Math.floor(s) === 1 ? ' second' : ' seconds') + '</b> ago' + (this.paused ? ' (paused)' : '') + ':';
    }
  }

  /* ======================================================================================
   * Flowchart: steps and decisions on a grid; tap a box; walk the main path
   * data = { nodes:[{id,label,type:'start'|'step'|'decision'|'end',row,col,note?}], edges:[{from,to,label?,main?}] }
   * ====================================================================================== */
  class Flowchart extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.nodes = data.nodes; this.edges = data.edges; this.sel = null; this.walk = -1;
      this.path = this._main();
      el.innerHTML = '<div class="dy-bar"><button type="button" class="dy-btn primary" data-walk>Walk the main path</button></div><svg role="group" aria-label="Flowchart"></svg><p class="dy-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dy-note');
      el.querySelector('[data-walk]').onclick = () => { this.walk = (this.walk + 1) % this.path.length; this.sel = this.path[this.walk]; this.render(); this._emit('step', { id: this.sel, index: this.walk }); };
      this.$svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) this.pick(g.dataset.k); });
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.pick(g.dataset.k); } });
      this.render();
    }
    _main() { const start = this.nodes.find(n => n.type === 'start') || this.nodes[0], out = [start.id], seen = new Set(out); let cur = start.id;
      for (let k = 0; k < 50; k++) { const e = this.edges.find(x => x.from === cur && x.main) || this.edges.find(x => x.from === cur && !seen.has(x.to)); if (!e || seen.has(e.to)) break; out.push(e.to); seen.add(e.to); cur = e.to; } return out; }
    pick(id) { this.sel = this.sel === id ? null : id; this.walk = this.sel ? this.path.indexOf(id) : -1; this.render(); if (this.sel) this._emit('select', { id }); }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), rows = Math.max(...this.nodes.map(n => n.row)) + 1, cols = Math.max(...this.nodes.map(n => n.col)) + 1;
      const narrow = W < 560, cw = W / cols, bw = Math.min(narrow ? cw - 30 : 190, cw - 30), bh = narrow ? 50 : 46, rh = bh + (narrow ? 36 : 40), H = rows * rh + 6;
      const cx = n => (n.col + 0.5) * cw, cy = n => n.row * rh + bh / 2 + 4, byId = id => this.nodes.find(n => n.id === id);
      const lit = new Set(); if (this.sel) this.edges.forEach((e, i) => { if (e.from === this.sel || e.to === this.sel) lit.add(i); });
      let s = '<defs><marker id="dyar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + T.muted + '"/></marker><marker id="dyarh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + T.accent + '"/></marker></defs>';
      this.edges.forEach((e, i) => {
        const a = byId(e.from), b = byId(e.to); if (!a || !b) return; const on = lit.has(i);
        let d, lx, ly;
        if (a.col === b.col && b.row > a.row) { d = 'M' + f1(cx(a)) + ' ' + f1(cy(a) + bh / 2) + ' V' + f1(cy(b) - bh / 2 - 2); lx = cx(a) + 8; ly = (cy(a) + cy(b)) / 2; }
        else if (a.row === b.row) { const dir = b.col > a.col ? 1 : -1; d = 'M' + f1(cx(a) + dir * bw / 2) + ' ' + f1(cy(a)) + ' H' + f1(cx(b) - dir * (bw / 2 + 2)); lx = (cx(a) + cx(b)) / 2; ly = cy(a) - 6; }
        else { const xo = cx(a) + (b.col >= a.col ? bw / 2 : -bw / 2), back = b.row < a.row, gx = back ? Math.min(W - 4, Math.max(cx(a), cx(b)) + bw / 2 + 12) : cx(b); d = back ? 'M' + f1(xo) + ' ' + f1(cy(a)) + ' H' + f1(gx) + ' V' + f1(cy(b)) + ' H' + f1(cx(b) + bw / 2 + 2) : 'M' + f1(xo) + ' ' + f1(cy(a)) + ' H' + f1(cx(b)) + ' V' + f1(cy(b) - bh / 2 - 2); lx = back ? gx - 4 : (xo + cx(b)) / 2 - 8; ly = cy(a) - 6; }
        s += '<path d="' + d + '" fill="none" stroke="' + (on ? T.accent : T.muted) + '" stroke-width="' + (on ? 2.6 : 1.6) + '" marker-end="url(#' + (on ? 'dyarh' : 'dyar') + ')"' + (this.sel && !on ? ' opacity=".35"' : '') + '/>' + (e.label ? '<text x="' + f1(lx) + '" y="' + f1(ly) + '" font-size="11" font-weight="800" fill="' + (on ? T.accent : T.muted) + '">' + esc(e.label) + '</text>' : '');
      });
      this.nodes.forEach(n => {
        const x = cx(n), y = cy(n), on = this.sel === n.id, inPath = this.walk >= 0 && this.path.indexOf(n.id) <= this.walk && this.path.includes(n.id);
        const fill = on ? T.accent : inPath ? T.bg : T.surface, txt = on ? T.surface : T.fg, stroke = on ? T.fg : n.type === 'decision' ? PART : T.line;
        const shape = n.type === 'decision' ? '<path d="M' + f1(x) + ' ' + f1(y - bh / 2 - 4) + ' L' + f1(x + bw / 2) + ' ' + f1(y) + ' L' + f1(x) + ' ' + f1(y + bh / 2 + 4) + ' L' + f1(x - bw / 2) + ' ' + f1(y) + 'Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>'
          : '<rect x="' + f1(x - bw / 2) + '" y="' + f1(y - bh / 2) + '" width="' + f1(bw) + '" height="' + bh + '" rx="' + (n.type === 'start' || n.type === 'end' ? bh / 2 : 8) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
        const words = String(n.label).split(' '), lines = []; let ln = ''; words.forEach(w => { if ((ln + ' ' + w).trim().length * 6.6 > bw - (n.type === 'decision' ? 36 : 14) && ln) { lines.push(ln); ln = w; } else ln = (ln + ' ' + w).trim(); }); lines.push(ln);
        s += '<g data-k="' + esc(n.id) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(n.label + (n.type === 'decision' ? ' (a decision)' : '')) + '">' + shape + lines.slice(0, 3).map((l, k) => '<text x="' + f1(x) + '" y="' + f1(y + 4 + (k - (Math.min(3, lines.length) - 1) / 2) * 13) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + txt + '" pointer-events="none">' + esc(fitText(l, bw - 10, 11.5)) + '</text>').join('') + '</g>';
      });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      const a = document.activeElement, keep = a && this.$svg.contains(a) ? a.dataset.k : null; this.$svg.innerHTML = s; if (keep != null) { const g = this.$svg.querySelector('[data-k="' + CSS.escape(keep) + '"]'); g && g.focus({ preventScroll: true }); }
      this.el.querySelector('[data-walk]').textContent = this.walk < 0 ? 'Walk the main path' : this.walk >= this.path.length - 1 ? 'Walk it again' : 'Next step (' + (this.walk + 2) + ' of ' + this.path.length + ')';
      const n = this.sel ? byId(this.sel) : null;
      if (n) { const ins = this.edges.filter(e => e.to === n.id).map(e => byId(e.from).label), outs = this.edges.filter(e => e.from === n.id).map(e => (e.label ? e.label + ': ' : '') + byId(e.to).label); this.$note.innerHTML = '<b>' + esc(n.label) + '</b>.' + (n.note ? ' ' + esc(n.note) : '') + (ins.length ? ' Comes from: ' + ins.map(esc).join('; ') + '.' : '') + (outs.length ? ' Leads to: ' + outs.map(esc).join('; ') + '.' : ' This is the end.'); }
      else this.$note.innerHTML = '<b>' + this.nodes.length + ' boxes</b>, ' + this.nodes.filter(x => x.type === 'decision').length + ' of them decisions (diamonds). The main path has ' + this.path.length + ' stops. Tap a box, or walk the main path.';
    }
  }

  return { Beforeafter, Slidestory, Verdict, Annotline, Liveticker, Flowchart };
});
