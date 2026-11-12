/*! Learn 1.0 · Dimau Infographics
 *  Six formats for teaching and practice:
 *    Flashdeck  flip cards to learn terms; mark the ones you know and practise the rest.
 *    Quizline   one question at a time, an explanation after every answer, and a score at the end.
 *    Hotspot    a labelled diagram: tap a numbered point to learn what that part does, or take the tour.
 *    Checklist  a how-to with steps to tick off, time left, and the next step highlighted; progress can be saved.
 *    Scaleup    sizes compared as circles (area = amount); pick two to see how many times bigger one is.
 *    Sorter     sort items into groups (tap an item, then a group, or drag), then check the answers.
 *
 *  new Flashdeck(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono --di-c-<id>
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Flashdeck', 'Quizline', 'Hotspot', 'Checklist', 'Scaleup', 'Sorter'].forEach(function (k) { root[k] = m[k]; }); root.DimauLearn = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8', '#7a6bd1', '#c2563a'];
  const WRONG = '#c2563a';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const fmtNum = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : (Math.abs(n) < 10 ? 1 : 0) }) + (o.suffix || '') : '–'; };
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const colorFor = (el, item, i) => (getComputedStyle(el).getPropertyValue('--di-c-' + item.id) || '').trim() || item.color || PALETTE[i % PALETTE.length];
  const fitText = (t, w, size) => { const max = Math.max(3, Math.floor(w / (size * 0.56))); t = String(t); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } } };

  const STYLE = `
.dl{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dl) button{font:inherit;color:inherit}
.dl :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dl svg{display:block;width:100%}
.dl svg[hidden]{display:none}
.dl-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}
.dl-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer}
.dl-btn.primary,.dl-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dl-btn:disabled{opacity:.45;cursor:default}
.dl-note{font-size:14px;line-height:1.5;margin:10px 0 0;min-height:1.5em}
.dl-meter{height:8px;border-radius:99px;background:var(--di-line,#c9dce8);overflow:hidden}
.dl-meter i{display:block;height:100%;background:var(--di-accent,#0b6fa4);border-radius:99px;transition:width .3s}
.dl-small{font-size:13px;color:var(--di-muted,#4f6578)}
.fd-stage{perspective:1200px}
.fd-card{position:relative;display:block;width:100%;min-height:220px;border:0;padding:0;background:none;cursor:pointer;transform-style:preserve-3d;transition:transform .45s}
.fd-card.flip{transform:rotateY(180deg)}
.fd-face{position:absolute;inset:0;display:grid;place-content:center;gap:8px;text-align:center;padding:22px;border-radius:16px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.fd-back{transform:rotateY(180deg);background:var(--di-bg,#eef7fb)}
.fd-big{font-size:34px;font-weight:800;line-height:1.15}
.fd-mid{font-size:20px;font-weight:700;line-height:1.35}
.fd-tag{font:600 11.5px/1 var(--di-mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--di-muted,#4f6578)}
.fd-known{position:absolute;top:12px;right:14px;font-size:12px;font-weight:800;color:var(--di-accent,#0b6fa4)}
@media (prefers-reduced-motion:reduce){.fd-card{transition:none}}
.qz-dots{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.qz-dots span{width:22px;height:8px;border-radius:99px;background:var(--di-line,#c9dce8)}
.qz-dots span.ok{background:var(--di-accent,#0b6fa4)}
.qz-dots span.no{background:${WRONG}}
.qz-dots span.cur{outline:2px solid var(--di-fg,#13263a);outline-offset:1px}
.qz-card{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:14px;padding:18px;display:grid;gap:12px}
.qz-q{font-size:19px;font-weight:800;line-height:1.35;margin:0}
.qz-opts{display:grid;gap:8px}
.qz-opt{display:flex;gap:10px;align-items:center;text-align:left;border:1.5px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);border-radius:11px;padding:11px 14px;font-size:15px;font-weight:600;cursor:pointer}
.qz-opt b{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);font-size:12px}
.qz-opt.ok{border-color:var(--di-accent,#0b6fa4);background:var(--di-surface,#fff)}
.qz-opt.no{border-color:${WRONG};background:var(--di-surface,#fff)}
.qz-opt:disabled{cursor:default}
.qz-why{border-left:4px solid var(--di-accent,#0b6fa4);padding:8px 12px;background:var(--di-bg,#eef7fb);border-radius:0 10px 10px 0;font-size:14.5px;line-height:1.5}
.qz-why.no{border-left-color:${WRONG}}
.hs-wrap{display:grid;gap:14px;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start}
.hs-wrap.narrow{grid-template-columns:1fr}
.hs-panel{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:14px;padding:16px;display:grid;gap:8px}
.hs-panel h4{margin:0;font-size:18px}
.hs-panel p{margin:0;font-size:14.5px;line-height:1.55}
.hs-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.hs-list button{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:999px;padding:5px 11px;font-size:12.5px;cursor:pointer}
.hs-list button[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.hs-pin{cursor:pointer}
.hs-pin:focus{outline:none}
.hs-pin:focus-visible circle{stroke:var(--di-fg,#13263a);stroke-width:3}
.ck-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ck-item{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:auto 1fr auto;gap:4px 12px;align-items:start}
.ck-item.next{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 1px var(--di-accent,#0b6fa4) inset}
.ck-item input{width:22px;height:22px;margin:1px 0 0;accent-color:var(--di-accent,#0b6fa4);cursor:pointer}
.ck-item label{font-weight:700;font-size:15px;line-height:1.4;cursor:pointer}
.ck-item.done label{text-decoration:line-through;color:var(--di-muted,#4f6578)}
.ck-tag{font:600 11.5px/1.6 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578);white-space:nowrap}
.ck-more{grid-column:2/4;font-size:13.5px;line-height:1.5;color:var(--di-fg,#13263a)}
.ck-more[hidden]{display:none}
.ck-toggle{grid-column:2/4;justify-self:start;border:0;background:none;padding:0;font-size:12.5px;font-weight:700;color:var(--di-accent,#0b6fa4);cursor:pointer}
.ck-next{font:700 11px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-accent,#0b6fa4);letter-spacing:.05em}
.so-tray{display:flex;flex-wrap:wrap;gap:8px;min-height:44px;padding:10px;border:1.5px dashed var(--di-line,#c9dce8);border-radius:12px}
.so-bins{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-top:12px}
.so-bin{border:1.5px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);border-radius:12px;padding:10px;min-height:110px;display:flex;flex-direction:column;gap:8px;text-align:left;cursor:pointer}
.so-bin.armed{border-color:var(--di-accent,#0b6fa4);border-style:dashed}
.so-bin.over{background:var(--di-surface,#fff);border-color:var(--di-accent,#0b6fa4)}
.so-bin h5{margin:0;font-size:14px}
.so-in{display:flex;flex-wrap:wrap;gap:6px}
.so-chip{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:999px;padding:6px 12px;font-size:14px;font-weight:600;cursor:grab}
.so-chip[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.so-chip.ok{border-color:var(--di-accent,#0b6fa4);border-width:2px}
.so-chip.no{border-color:${WRONG};border-width:2px}
.so-chip .mk{margin-left:6px;font-weight:800}
`;
  function injectStyle() {
    if (document.getElementById('dl-style')) return;
    const s = document.createElement('style'); s.id = 'dl-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dl');
      this._ro = new ResizeObserver(() => { const w = el.clientWidth; if (w !== this._w) { this._w = w; this.render && this.render(); } });
      this._ro.observe(el);
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _save() { if (this.o.storageKey && this.getState) store.set(this.o.storageKey, this.getState()); }
    _load() { const s = this.o.storageKey ? store.get(this.o.storageKey) : null; if (s && this.setState) this.setState(s, true); }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this._teardown && this._teardown(); this.el.innerHTML = ''; this.el.classList.remove('dl'); }
  }

  /* ======================================================================================
   * Flashdeck: flip cards; mark the ones you know and practise the rest
   * data = { cards:[{id, front, back, hint?, tag?}] }  options: { storageKey? }
   * ====================================================================================== */
  class Flashdeck extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.cards = data.cards.map((c, i) => Object.assign({ i }, c));
      this.order = this.cards.map(c => c.i); this.pos = 0; this.flipped = false; this.known = new Set(); this.only = false;
      el.innerHTML = '<div class="dl-small" data-count aria-live="polite"></div><div class="dl-meter" style="margin:6px 0 12px"><i></i></div>' +
        '<div class="fd-stage"><button type="button" class="fd-card" aria-live="polite"><span class="fd-face fd-front"></span><span class="fd-face fd-back"></span></button></div>' +
        '<div class="dl-bar"><button type="button" class="dl-btn" data-prev aria-label="Previous card">←</button><button type="button" class="dl-btn" data-learning>Still learning</button><button type="button" class="dl-btn primary" data-know>I know this</button><button type="button" class="dl-btn" data-next aria-label="Next card">→</button></div>' +
        '<div class="dl-bar"><button type="button" class="dl-btn" data-only aria-pressed="false">Practise only the ones I’m learning</button><button type="button" class="dl-btn" data-shuffle>Shuffle</button></div>';
      this.$card = el.querySelector('.fd-card'); this.$front = el.querySelector('.fd-front'); this.$back = el.querySelector('.fd-back');
      this.$card.onclick = () => this.flip();
      el.querySelector('[data-prev]').onclick = () => this.go(-1);
      el.querySelector('[data-next]').onclick = () => this.go(1);
      el.querySelector('[data-know]').onclick = () => this.mark(true);
      el.querySelector('[data-learning]').onclick = () => this.mark(false);
      el.querySelector('[data-only]').onclick = () => { this.only = !this.only; this._reorder(); };
      el.querySelector('[data-shuffle]').onclick = () => this.shuffle();
      this._key = e => { if (e.target.closest('input,textarea')) return; if (e.key === 'ArrowRight') { e.preventDefault(); this.go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(-1); } };
      el.addEventListener('keydown', this._key);
      this._load(); this.render();
    }
    get current() { return this.cards[this.order[this.pos]]; }
    _reorder() {
      const cur = this.current; let ids = this.cards.map(c => c.i);
      if (this.only) { const rest = ids.filter(i => !this.known.has(this.cards[i].id)); if (rest.length) ids = rest; }
      this.order = ids; this.pos = Math.max(0, this.order.indexOf(cur ? cur.i : -1)); this.flipped = false; this.render();
    }
    flip() { this.flipped = !this.flipped; this.render(); this._emit('flip', { id: this.current.id, side: this.flipped ? 'back' : 'front' }); }
    go(d) { this.pos = (this.pos + d + this.order.length) % this.order.length; this.flipped = false; this.render(); }
    mark(k) {
      const c = this.current; if (k) this.known.add(c.id); else this.known.delete(c.id);
      this._emit('mark', { id: c.id, known: k }); this._save();
      if (this.known.size === this.cards.length) this._emit('done', { known: this.known.size, total: this.cards.length });
      if (this.only && k) this._reorder(); else this.go(1);
    }
    shuffle() { for (let i = this.order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.order[i], this.order[j]] = [this.order[j], this.order[i]]; } this.pos = 0; this.flipped = false; this.render(); }
    getState() { return { known: [...this.known] }; }
    setState(s, quiet) { this.known = new Set((s && s.known || []).filter(id => this.cards.some(c => c.id === id))); if (!quiet) this.render(); }
    render() {
      const c = this.current; if (!c) return;
      const k = this.known.has(c.id);
      this.$front.innerHTML = (c.tag ? '<span class="fd-tag">' + esc(c.tag) + '</span>' : '') + '<span class="fd-big">' + esc(c.front) + '</span>' + (c.hint ? '<span class="dl-small">' + esc(c.hint) + '</span>' : '') + '<span class="dl-small">Tap to turn over</span>' + (k ? '<span class="fd-known">✓ Known</span>' : '');
      this.$back.innerHTML = '<span class="fd-mid">' + esc(c.back) + '</span><span class="dl-small">' + esc(c.front) + '</span>';
      this.$card.classList.toggle('flip', this.flipped);
      this.$card.setAttribute('aria-label', (this.flipped ? 'Back: ' + c.back : 'Front: ' + c.front) + '. Press to turn over.');
      this.el.querySelector('[data-count]').textContent = 'Card ' + (this.pos + 1) + ' of ' + this.order.length + ' · you know ' + this.known.size + ' of ' + this.cards.length;
      this.el.querySelector('.dl-meter i').style.width = (100 * this.known.size / this.cards.length) + '%';
      this.el.querySelector('[data-only]').setAttribute('aria-pressed', String(this.only));
    }
    destroy() { this.el.removeEventListener('keydown', this._key); super.destroy(); }
  }

  /* ======================================================================================
   * Quizline: one question at a time with an explanation, then a score
   * data = { title?, questions:[{id, q, options:[string], answer:index, explain?}] }
   * ====================================================================================== */
  class Quizline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.qs = data.questions; this.restart(true);
      el.addEventListener('click', e => {
        const o = e.target.closest('[data-o]'); if (o) return this.answer(+o.dataset.o);
        if (e.target.closest('[data-next]')) return this.next();
        if (e.target.closest('[data-again]')) return this.restart();
      });
    }
    restart(first) { this.pos = 0; this.res = this.qs.map(() => null); this.picked = null; this.render(); if (!first) this._focus(); }
    answer(i) {
      if (this.picked != null) return; const q = this.qs[this.pos], ok = i === +q.answer;
      this.picked = i; this.res[this.pos] = ok; this.render(); this._focus('.qz-why');
      this._emit('answer', { id: q.id, choice: i, correct: ok });
    }
    next() {
      if (this.pos < this.qs.length - 1) { this.pos++; this.picked = null; this.render(); this._focus(); }
      else { this.pos = this.qs.length; this.render(); this._focus(); this._emit('finish', { score: this.score(), total: this.qs.length }); }
    }
    score() { return this.res.filter(Boolean).length; }
    _focus(sel) { const h = this.el.querySelector(sel || '[tabindex="-1"]'); h && h.focus({ preventScroll: true }); }
    render() {
      const n = this.qs.length;
      const dots = '<div class="qz-dots" aria-hidden="true">' + this.qs.map((q, i) => '<span class="' + (this.res[i] === true ? 'ok' : this.res[i] === false ? 'no' : '') + (i === this.pos ? ' cur' : '') + '"></span>').join('') + '</div>';
      if (this.pos >= n) {
        const s = this.score(), wrong = this.qs.filter((q, i) => !this.res[i]);
        this.el.innerHTML = dots + '<div class="qz-card"><p class="qz-q" tabindex="-1">You scored ' + s + ' out of ' + n + '.</p><p class="dl-small" style="margin:0">' + (s === n ? 'Every answer right.' : s >= n * 0.7 ? 'Well done. Worth another look:' : 'Here are the ones to go over:') + '</p>' +
          (wrong.length ? '<ul style="margin:0;padding-left:20px;display:grid;gap:6px;font-size:14px;line-height:1.45">' + wrong.map(q => '<li><b>' + esc(q.q) + '</b> ' + esc(q.options[+q.answer]) + '.</li>').join('') + '</ul>' : '') +
          '<div class="dl-bar" style="margin:0"><button type="button" class="dl-btn primary" data-again>Try again</button></div></div>';
        return;
      }
      const q = this.qs[this.pos], done = this.picked != null, ok = done && this.picked === +q.answer;
      this.el.innerHTML = dots + '<div class="qz-card"><span class="dl-small">Question ' + (this.pos + 1) + ' of ' + n + '</span><p class="qz-q" tabindex="-1">' + esc(q.q) + '</p><div class="qz-opts">' +
        q.options.map((o, i) => { const cls = done ? (i === +q.answer ? ' ok' : i === this.picked ? ' no' : '') : ''; return '<button type="button" class="qz-opt' + cls + '" data-o="' + i + '"' + (done ? ' disabled' : '') + '><b>' + (done && i === +q.answer ? '✓' : done && i === this.picked ? '✗' : String.fromCharCode(65 + i)) + '</b>' + esc(o) + '</button>'; }).join('') + '</div>' +
        (done ? '<div class="qz-why' + (ok ? '' : ' no') + '" tabindex="-1" aria-live="polite"><b>' + (ok ? 'Correct.' : 'Not quite.') + '</b> ' + (ok ? '' : 'The answer is ' + esc(q.options[+q.answer]) + '. ') + esc(q.explain || '') + '</div><div class="dl-bar" style="margin:0"><button type="button" class="dl-btn primary" data-next>' + (this.pos < n - 1 ? 'Next question' : 'See my score') + '</button></div>' : '') + '</div>';
    }
  }

  /* ======================================================================================
   * Hotspot: a labelled diagram with numbered points; tap one or take the tour
   * data = { viewBox:'0 0 W H', shapes:[{type:'rect'|'circle'|'ellipse'|'path'|'line'|'text', tone?:'surface'|'line'|'muted'|'accent'|'fg'|'bg', fillTone?, ...svg attributes}],
   *          spots:[{id,x,y,label,text}], title? }
   * ====================================================================================== */
  const SHAPE_ATTRS = ['x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r', 'ry', 'd', 'x1', 'y1', 'x2', 'y2', 'points', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'font-weight', 'text-anchor', 'transform'];
  class Hotspot extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.spots = data.spots.map((s, i) => Object.assign({ i }, s)); this.sel = null;
      el.innerHTML = '<div class="hs-wrap"><svg role="img"></svg><div class="hs-panel" aria-live="polite"></div></div><div class="hs-list" role="group" aria-label="Parts"></div>';
      this.$wrap = el.querySelector('.hs-wrap'); this.$svg = el.querySelector('svg'); this.$panel = el.querySelector('.hs-panel'); this.$list = el.querySelector('.hs-list');
      const pick = e => { const g = e.target.closest('[data-k]'); if (g) this.select(+g.dataset.k); };
      this.$svg.addEventListener('click', pick); this.$list.addEventListener('click', pick);
      this.$svg.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.select(+g.dataset.k); } });
      this.$panel.addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) this.select(((this.sel == null ? -1 : this.sel) + +b.dataset.step + this.spots.length) % this.spots.length, true); });
      this.render();
    }
    select(i, fromTour) { this.sel = i; this.render(); const s = this.spots[i]; this._emit('select', { id: s.id }); if (fromTour) { const b = this.$panel.querySelector('[data-step="1"]'); b && b.focus({ preventScroll: true }); } }
    render() {
      const T = themeOf(this.el), d = this.data, tone = k => ({ surface: T.surface, line: T.line, muted: T.muted, accent: T.accent, fg: T.fg, bg: T.bg })[k] || k || 'none';
      const narrow = this.el.clientWidth < 640; this.$wrap.classList.toggle('narrow', narrow);
      let s = (d.shapes || []).map(sh => {
        const t = ['rect', 'circle', 'ellipse', 'path', 'line', 'text', 'polygon'].includes(sh.type) ? sh.type : 'rect';
        const attrs = SHAPE_ATTRS.filter(a => sh[a] != null).map(a => a + '="' + esc(sh[a]) + '"').join(' ');
        const fill = t === 'line' ? 'none' : t === 'text' ? tone(sh.tone || 'muted') : tone(sh.fillTone || 'surface'), stroke = t === 'text' ? 'none' : tone(sh.tone || 'muted');
        return '<' + t + ' ' + attrs + ' fill="' + esc(fill) + '" stroke="' + esc(stroke) + '"' + (sh['stroke-width'] == null && t !== 'text' ? ' stroke-width="2"' : '') + '>' + (t === 'text' ? esc(sh.text || '') : '') + '</' + t + '>';
      }).join('');
      const vbW = +(String(d.viewBox || '0 0 600 400').split(/\s+/)[2]) || 600, sc = Math.max(1, (vbW / Math.max(1, this.$svg.clientWidth || vbW)) * 0.8);
      this.spots.forEach(p => {
        const on = this.sel === p.i;
        s += '<g class="hs-pin" tabindex="0" role="button" data-k="' + p.i + '" aria-pressed="' + on + '" aria-label="' + esc((p.i + 1) + '. ' + p.label) + '"><circle cx="' + p.x + '" cy="' + p.y + '" r="' + f1((on ? 17 : 14) * sc) + '" fill="' + (on ? T.fg : T.accent) + '" stroke="' + T.surface + '" stroke-width="' + f1(3 * sc) + '"/>' +
          '<text x="' + p.x + '" y="' + f1(p.y + 5 * sc) + '" text-anchor="middle" font-size="' + f1(14 * sc) + '" font-weight="800" fill="' + T.surface + '" pointer-events="none">' + (p.i + 1) + '</text></g>';
      });
      this.$svg.setAttribute('viewBox', d.viewBox || '0 0 600 400');
      this.$svg.setAttribute('aria-label', (d.title || 'Diagram') + ' with ' + this.spots.length + ' labelled parts');
      const a = document.activeElement, keep = a && this.$svg.contains(a) ? a.dataset.k : null;
      this.$svg.innerHTML = s;
      if (keep != null) { const g = this.$svg.querySelector('[data-k="' + keep + '"]'); g && g.focus({ preventScroll: true }); }
      const p = this.sel != null ? this.spots[this.sel] : null;
      this.$panel.innerHTML = p ? '<span class="dl-small">Part ' + (p.i + 1) + ' of ' + this.spots.length + '</span><h4>' + esc(p.label) + '</h4><p>' + esc(p.text) + '</p><div class="dl-bar" style="margin:4px 0 0"><button type="button" class="dl-btn" data-step="-1">← Previous</button><button type="button" class="dl-btn primary" data-step="1">Next part →</button></div>'
        : '<h4>' + esc(d.title || 'How it works') + '</h4><p>Tap a numbered point to see what that part does, or take the tour.</p><div class="dl-bar" style="margin:4px 0 0"><button type="button" class="dl-btn primary" data-step="1">Start the tour →</button></div>';
      this.$list.innerHTML = this.spots.map(q => '<button type="button" data-k="' + q.i + '" aria-pressed="' + (this.sel === q.i) + '">' + (q.i + 1) + '. ' + esc(q.label) + '</button>').join('');
    }
  }

  /* ======================================================================================
   * Checklist: a how-to with steps to tick off; time left and the next step highlighted
   * data = { title?, steps:[{id, label, detail?, minutes?, link?, linkLabel?}] }  options: { storageKey? }
   * ====================================================================================== */
  class Checklist extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.steps = data.steps.map((s, i) => Object.assign({ i }, s)); this.done = new Set(); this.open = new Set();
      el.innerHTML = '<div class="dl-small" data-sum aria-live="polite"></div><div class="dl-meter" style="margin:6px 0 12px"><i></i></div><ol class="ck-list"></ol><div class="dl-bar"><button type="button" class="dl-btn" data-reset>Clear all ticks</button></div>';
      this.$list = el.querySelector('.ck-list');
      this.$list.addEventListener('change', e => { const c = e.target.closest('input[data-id]'); if (c) this.toggle(c.dataset.id, c.checked); });
      this.$list.addEventListener('click', e => { const b = e.target.closest('[data-more]'); if (b) { const id = b.dataset.more; this.open.has(id) ? this.open.delete(id) : this.open.add(id); this.render(); this.$list.querySelector('[data-more="' + CSS.escape(id) + '"]').focus(); } });
      el.querySelector('[data-reset]').onclick = () => { this.done.clear(); this._save(); this.render(); this._emit('change', { done: [] }); };
      this._load(); this.render();
    }
    toggle(id, on) {
      if (on) this.done.add(id); else this.done.delete(id);
      this._save(); this.render(); const c = this.$list.querySelector('input[data-id="' + CSS.escape(id) + '"]'); c && c.focus();
      this._emit('change', { done: [...this.done] });
      if (this.done.size === this.steps.length) this._emit('complete', { total: this.steps.length });
    }
    getState() { return { done: [...this.done] }; }
    setState(s, quiet) { this.done = new Set((s && s.done || []).filter(id => this.steps.some(x => x.id === id))); if (!quiet) this.render(); }
    render() {
      const next = this.steps.find(s => !this.done.has(s.id)), left = this.steps.filter(s => !this.done.has(s.id)).reduce((t, s) => t + (+s.minutes || 0), 0), n = this.steps.length;
      this.el.querySelector('[data-sum]').innerHTML = this.done.size === n ? '<b>All ' + n + ' steps done.</b>' : '<b>' + this.done.size + ' of ' + n + ' done</b>' + (left ? ' · about ' + left + ' minutes left' : '');
      this.el.querySelector('.dl-meter i').style.width = (100 * this.done.size / n) + '%';
      this.$list.innerHTML = this.steps.map(s => {
        const d = this.done.has(s.id), isNext = next && next.id === s.id, o = this.open.has(s.id), cid = 'ck-' + esc(s.id);
        return '<li class="ck-item' + (d ? ' done' : '') + (isNext ? ' next' : '') + '"><input type="checkbox" id="' + cid + '" data-id="' + esc(s.id) + '"' + (d ? ' checked' : '') + '><label for="' + cid + '">' + (isNext ? '<span class="ck-next">UP NEXT</span><br>' : '') + (s.i + 1) + '. ' + esc(s.label) + '</label><span class="ck-tag">' + (s.minutes ? esc(s.minutes + ' min') : '') + '</span>' +
          (s.detail || s.link ? '<button type="button" class="ck-toggle" data-more="' + esc(s.id) + '" aria-expanded="' + o + '">' + (o ? 'Hide how' : 'Show how') + '</button><div class="ck-more"' + (o ? '' : ' hidden') + '>' + esc(s.detail || '') + (s.link ? ' <a href="' + esc(s.link) + '">' + esc(s.linkLabel || 'Open') + '</a>' : '') + '</div>' : '') + '</li>';
      }).join('');
    }
  }

  /* ======================================================================================
   * Scaleup: sizes compared as circles (area = amount); pick two to compare
   * data = { unit?, unitSingular?, items:[{id,label,value,note?,color?}] }
   * ====================================================================================== */
  class Scaleup extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.items = data.items.map((t, i) => Object.assign({ i }, t, { value: +t.value })).sort((a, b) => b.value - a.value);
      this.pick = [];
      el.innerHTML = '<svg role="img" data-row></svg><svg role="img" data-cmp hidden></svg><p class="dl-note" aria-live="polite"></p>';
      this.$row = el.querySelector('[data-row]'); this.$cmp = el.querySelector('[data-cmp]'); this.$note = el.querySelector('.dl-note');
      const hit = e => { const g = e.target.closest('[data-k]'); if (g) this.choose(+g.dataset.k); };
      this.$row.addEventListener('click', hit);
      this.$row.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.choose(+g.dataset.k); } });
      this.render();
    }
    choose(i) {
      const k = this.pick.indexOf(i); if (k >= 0) this.pick.splice(k, 1); else { this.pick.push(i); if (this.pick.length > 2) this.pick.shift(); }
      this.render(); this._emit('select', { ids: this.pick.map(j => this.items.find(t => t.i === j).id) });
    }
    render() {
      const T = themeOf(this.el), d = this.data, W = Math.max(280, this.$row.clientWidth || 640), narrow = W < 520, gap = narrow ? 6 : 12, its = this.items;
      const sq = its.reduce((s0, t) => s0 + Math.sqrt(Math.max(0, t.value)), 0), top = Math.sqrt(its[0].value || 1), fitK = Math.min((W - gap * (its.length - 1) - 4) / (2 * sq), 110 / top);
      const oneRow = fitK * Math.sqrt(Math.max(0, its[its.length - 1].value)) >= 10, k = oneRow ? fitK : (narrow ? 58 : 100) / top, minCell = oneRow ? 0 : (narrow ? 70 : 92);
      const cells = its.map(t => { const r = Math.max(2, k * Math.sqrt(Math.max(0, t.value))); return { t, r, w: Math.max(2 * r, minCell) }; }), rows = [[]];
      cells.forEach(c => { const row = rows[rows.length - 1], used = row.reduce((a2, z) => a2 + z.w + gap, 0); if (row.length && used + c.w > W - 4) rows.push([c]); else row.push(c); });
      let y0 = 0, s = '';
      rows.forEach(row => {
        const rMax = Math.max(...row.map(c => c.r)), base = y0 + rMax * 2 + 6, used = row.reduce((a2, z) => a2 + z.w, 0) + gap * (row.length - 1);
        let x = Math.max(2, (W - used) / 2);
        row.forEach(c => {
          const t = c.t, r = c.r, cx = x + c.w / 2, on = this.pick.includes(t.i), col = colorFor(this.el, t, t.i);
          s += '<g class="hs-pin" tabindex="0" role="button" data-k="' + t.i + '" aria-pressed="' + on + '" aria-label="' + esc(t.label + ': ' + fmtNum(t.value) + (d.unit ? ' ' + d.unit : '')) + '"><circle cx="' + f1(cx) + '" cy="' + f1(base - r) + '" r="' + f1(r) + '" fill="' + col + '" fill-opacity="' + (this.pick.length && !on ? 0.4 : 0.9) + '" stroke="' + (on ? T.fg : T.surface) + '" stroke-width="' + (on ? 3 : 1.5) + '"/>' +
            (r > 13 ? '<text x="' + f1(cx) + '" y="' + f1(base - r + 4) + '" text-anchor="middle" font-size="' + (r > 26 ? 13 : 10.5) + '" font-weight="800" fill="#ffffff" pointer-events="none">' + esc(fmtNum(t.value)) + '</text>' : '') +
            '<text x="' + f1(cx) + '" y="' + f1(base + 15) + '" text-anchor="middle" font-size="' + (narrow ? 10.5 : 11.5) + '" font-weight="700" fill="' + T.fg + '" pointer-events="none">' + esc(fitText(t.label, c.w + gap - 2, narrow ? 10.5 : 11.5)) + '</text>' +
            (r <= 13 ? '<text x="' + f1(cx) + '" y="' + f1(base + 29) + '" text-anchor="middle" font-size="10" fill="' + T.muted + '" pointer-events="none">' + esc(fmtNum(t.value)) + '</text>' : '') + '</g>';
          x += c.w + gap;
        });
        y0 = base + (row.some(c => c.r <= 13) ? 36 : 24);
      });
      const H = y0 + 4;
      this.$row.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$row.style.height = H + 'px';
      this.$row.setAttribute('aria-label', its.map(t => t.label + ' ' + fmtNum(t.value)).join(', ') + '. Circle areas are to scale.');
      const a = document.activeElement, keep = a && this.$row.contains(a) ? a.dataset.k : null;
      this.$row.innerHTML = s;
      if (keep != null) { const g = this.$row.querySelector('[data-k="' + keep + '"]'); g && g.focus({ preventScroll: true }); }
      const u = n => (n === 1 && d.unitSingular ? d.unitSingular : d.unit || '');
      if (this.pick.length === 2) {
        const [p, q] = this.pick.map(j => its.find(t => t.i === j)).sort((m, n) => n.value - m.value), ratio = q.value ? p.value / q.value : Infinity, CH = narrow ? 170 : 220, R1 = CH * 0.45, R2 = R1 * Math.sqrt(q.value / (p.value || 1)), cx = W / 2;
        this.$cmp.removeAttribute('hidden'); this.$cmp.setAttribute('viewBox', '0 0 ' + W + ' ' + CH); this.$cmp.style.height = CH + 'px';
        this.$cmp.innerHTML = '<circle cx="' + f1(cx) + '" cy="' + f1(CH - R1 - 4) + '" r="' + f1(R1) + '" fill="' + colorFor(this.el, p, p.i) + '" fill-opacity=".85"/><circle cx="' + f1(cx) + '" cy="' + f1(CH - R2 - 4) + '" r="' + f1(R2) + '" fill="' + colorFor(this.el, q, q.i) + '" stroke="' + T.surface + '" stroke-width="2"/>' +
          '<text x="' + f1(cx + R1 + 10) + '" y="' + f1(CH / 2) + '" font-size="13" font-weight="800" fill="' + T.fg + '">' + esc(fitText(p.label, W / 2 - R1 - 14, 13)) + '</text><text x="' + f1(cx + R1 + 10) + '" y="' + f1(CH / 2 + 18) + '" font-size="12" fill="' + T.muted + '">' + esc(fmtNum(p.value) + ' ' + u(p.value)) + '</text>' +
          '<text x="' + f1(cx - R1 - 10) + '" y="' + f1(CH - 30) + '" text-anchor="end" font-size="13" font-weight="800" fill="' + T.fg + '">' + esc(fitText(q.label, W / 2 - R1 - 14, 13)) + '</text><text x="' + f1(cx - R1 - 10) + '" y="' + f1(CH - 12) + '" text-anchor="end" font-size="12" fill="' + T.muted + '">' + esc(fmtNum(q.value) + ' ' + u(q.value)) + '</text>';
        this.$cmp.setAttribute('aria-label', p.label + ' against ' + q.label);
        this.$note.innerHTML = '<b>' + esc(p.label) + '</b> (' + esc(fmtNum(p.value) + ' ' + u(p.value)) + ') is ' + (isFinite(ratio) ? '<b>' + fmtNum(ratio, { decimals: 1 }) + ' times</b>' : 'far') + ' the size of <b>' + esc(q.label) + '</b> (' + esc(fmtNum(q.value) + ' ' + u(q.value)) + ').' + (ratio > 1.05 ? ' You could fit ' + esc(q.label) + ' into it about ' + Math.floor(ratio) + ' time' + (Math.floor(ratio) === 1 ? '' : 's') + '.' : '');
      } else {
        this.$cmp.setAttribute('hidden', ''); this.$cmp.innerHTML = '';
        const t = this.pick.length ? its.find(z => z.i === this.pick[0]) : null, tot = its.reduce((s2, z) => s2 + z.value, 0);
        this.$note.innerHTML = t ? '<b>' + esc(t.label) + '</b>: ' + esc(fmtNum(t.value) + ' ' + u(t.value)) + ', ' + Math.round(100 * t.value / (tot || 1)) + '% of the total.' + (t.note ? ' ' + esc(t.note) : '') + ' Pick another circle to compare.'
          : 'Each circle’s area is to scale. <b>' + esc(its[0].label) + '</b> is the biggest at ' + esc(fmtNum(its[0].value) + ' ' + u(its[0].value)) + '. Pick two circles to compare them.';
      }
    }
  }

  /* ======================================================================================
   * Sorter: sort items into groups, then check the answers
   * data = { bins:[{id,label}], items:[{id,label,bin,why?}], prompt? }
   * ====================================================================================== */
  class Sorter extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.bins = data.bins; this.items = data.items.map((t, i) => Object.assign({ i }, t));
      this.place = {}; this.held = null; this.checked = false;
      el.innerHTML = '<p class="dl-small" style="margin:0 0 8px">' + esc(data.prompt || 'Tap an item, then the group it belongs in. You can also drag.') + '</p><div class="so-tray" aria-label="Still to sort"></div><div class="so-bins"></div>' +
        '<div class="dl-bar"><button type="button" class="dl-btn primary" data-check>Check my answers</button><button type="button" class="dl-btn" data-reset>Start again</button></div><p class="dl-note" aria-live="polite"></p>';
      this.$tray = el.querySelector('.so-tray'); this.$bins = el.querySelector('.so-bins'); this.$note = el.querySelector('.dl-note');
      el.addEventListener('click', e => {
        const chip = e.target.closest('.so-chip'); if (chip) { e.stopPropagation(); return this.hold(chip.dataset.id); }
        const bin = e.target.closest('.so-bin'); if (bin) return this.drop(bin.dataset.bin);
        if (e.target.closest('.so-tray') && this.held) return this.drop(null);
        if (e.target.closest('[data-check]')) return this.check();
        if (e.target.closest('[data-reset]')) { this.place = {}; this.held = null; this.checked = false; this.render(); this.$note.textContent = ''; }
      });
      el.addEventListener('dragstart', e => { const c = e.target.closest('.so-chip'); if (c) { this.held = c.dataset.id; e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; } });
      el.addEventListener('dragover', e => { const b = e.target.closest('.so-bin,.so-tray'); if (b) { e.preventDefault(); b.classList.add('over'); } });
      el.addEventListener('dragleave', e => { const b = e.target.closest('.so-bin,.so-tray'); if (b) b.classList.remove('over'); });
      el.addEventListener('drop', e => { const b = e.target.closest('.so-bin,.so-tray'); if (!b) return; e.preventDefault(); this.held = e.dataTransfer.getData('text/plain') || this.held; this.drop(b.classList.contains('so-bin') ? b.dataset.bin : null); });
      this.render();
    }
    hold(id) { this.held = this.held === id ? null : id; this.render(); const c = this.el.querySelector('.so-chip[data-id="' + CSS.escape(id) + '"]'); c && c.focus({ preventScroll: true }); }
    drop(bin) {
      if (!this.held) return; const id = this.held;
      if (bin) this.place[id] = bin; else delete this.place[id];
      this.held = null; this.checked = false; this.render(); this.$note.textContent = '';
      const c = this.el.querySelector('.so-chip[data-id="' + CSS.escape(id) + '"]'); c && c.focus({ preventScroll: true });
      this._emit('place', { id, bin: bin || null });
    }
    check() {
      this.checked = true; this.render();
      const placed = this.items.filter(t => this.place[t.id]), right = placed.filter(t => this.place[t.id] === t.bin).length, left = this.items.length - placed.length;
      this.$note.innerHTML = '<b>' + right + ' of ' + this.items.length + ' right.</b>' + (left ? ' ' + left + ' still to sort.' : '') + (right < placed.length ? ' Items marked ✗ are in the wrong group: tap one to see why, then move it.' : right === this.items.length ? ' All sorted correctly.' : '');
      this._emit('check', { correct: right, total: this.items.length });
    }
    _chip(t) {
      const inBin = this.place[t.id], ok = this.checked && inBin ? inBin === t.bin : null;
      return '<button type="button" class="so-chip' + (ok === true ? ' ok' : ok === false ? ' no' : '') + '" draggable="true" data-id="' + esc(t.id) + '" aria-pressed="' + (this.held === t.id) + '"' + (ok === false && t.why ? ' title="' + esc(t.why) + '"' : '') + ' aria-label="' + esc(t.label + (ok === true ? ', correct' : ok === false ? ', not in the right group' : '')) + '">' + esc(t.label) + (ok === true ? '<span class="mk">✓</span>' : ok === false ? '<span class="mk" style="color:' + WRONG + '">✗</span>' : '') + '</button>';
    }
    render() {
      const a = document.activeElement, keep = a && this.el.contains(a) && a.dataset ? a.dataset.id : null;
      const loose = this.items.filter(t => !this.place[t.id]);
      this.$tray.innerHTML = loose.length ? loose.map(t => this._chip(t)).join('') : '<span class="dl-small">Everything is sorted. Check your answers below.</span>';
      this.$bins.innerHTML = this.bins.map(b => '<div class="so-bin' + (this.held ? ' armed' : '') + '" data-bin="' + esc(b.id) + '" role="button" tabindex="0" aria-label="' + esc('Put in ' + b.label) + '"><h5>' + esc(b.label) + '</h5><div class="so-in">' + this.items.filter(t => this.place[t.id] === b.id).map(t => this._chip(t)).join('') + '</div></div>').join('');
      this.$bins.querySelectorAll('.so-bin').forEach(b => b.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); this.drop(b.dataset.bin); } });
      if (this.checked) { const wrong = this.items.find(t => this.place[t.id] && this.place[t.id] !== t.bin && this.held === t.id); if (wrong && wrong.why) this.$note.innerHTML = '<b>' + esc(wrong.label) + '</b>: ' + esc(wrong.why); }
      if (keep) { const c = this.el.querySelector('.so-chip[data-id="' + CSS.escape(keep) + '"]'); c && c.focus({ preventScroll: true }); }
    }
  }

  return { Flashdeck, Quizline, Hotspot, Checklist, Scaleup, Sorter };
});
