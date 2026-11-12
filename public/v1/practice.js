/*! Practice 1.0 · Dimau Infographics
 *  Six ways to practise and check learning:
 *    Matchup      match each item on the left with its partner on the right; mistakes are counted.
 *    Sequence     put things in the right order with the arrow buttons, then check.
 *    Fillgap      sentences with gaps; choose the word for each gap, then check.
 *    Estimator    guess a number on a slider, then see the answer and how close you were.
 *    Masterygrid  learners by skills, coloured by level; see who needs help with what.
 *    Leitner      flash cards that move up the boxes when you know them and back to the start when you don't.
 *
 *  new Matchup(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Matchup', 'Sequence', 'Fillgap', 'Estimator', 'Masterygrid', 'Leitner'].forEach(function (k) { root[k] = m[k]; }); root.DimauPractice = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, o) => { o = o || {}; return isFinite(n) ? (o.prefix || '') + (+n).toLocaleString(undefined, { maximumFractionDigits: o.decimals != null ? o.decimals : 1 }) + (o.suffix || '') : '–'; };
  const pct = n => Math.round(n * 100) + '%';
  /** Shuffle with a fixed seed, so the same page always starts the same way (and never already solved). */
  function shuffle(a, seed) {
    const out = a.slice(); let s = (seed || 7) >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    if (out.length > 1 && out.every((x, i) => x === a[i])) out.push(out.shift());
    return out;
  }
  const LEVEL_COLOURS = ['#e7edf2', '#f1c27d', '#a9d18e', '#1f8a5b'];

  const STYLE = `
.de{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.de) button{font:inherit;color:inherit}
.de :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.de-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 0}
.de-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer}
.de-btn.main{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.de-btn:disabled{opacity:.45;cursor:default}
.de-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.de-ok{color:#1f8a5b;font-weight:800}.de-no{color:#c2563a;font-weight:800}
.mu{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mu h5{margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--di-muted,#4f6578)}
.mu ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.mu button{width:100%;text-align:left;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:10px;padding:10px 12px;font-size:14px;cursor:pointer;min-height:44px}
.mu button[aria-pressed="true"]{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.mu button.done{background:#e3f4ea;border-color:#1f8a5b;color:#155c37;cursor:default}
.mu button.bad{animation:de-shake .35s;border-color:#c2563a}
@keyframes de-shake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@media (prefers-reduced-motion:reduce){.mu button.bad{animation:none}}
.sq{list-style:none;margin:0;padding:0;display:grid;gap:6px;counter-reset:sq}
.sq li{display:grid;grid-template-columns:2em 1fr auto;gap:8px;align-items:center;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:10px;padding:6px 8px 6px 10px}
.sq li .n{font:800 15px/1 var(--di-mono,ui-monospace,monospace);color:var(--di-muted,#4f6578)}
.sq li .t{font-size:14px}
.sq li .t small{display:block;color:var(--di-muted,#4f6578);font-size:12px}
.sq li .mv{display:flex;gap:4px}
.sq li .mv button{width:36px;height:36px;border-radius:8px;border:1px solid var(--di-line,#c9dce8);background:var(--di-bg,#eef7fb);cursor:pointer;font-weight:800}
.sq li.ok{border-color:#1f8a5b;background:#e3f4ea}.sq li.no{border-color:#c2563a;background:#fbe9e5}
.fg p{font-size:16px;line-height:2.1;margin:0 0 6px}
.fg select{font:inherit;font-size:15px;border-radius:8px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:3px 6px;color:inherit}
.fg select.ok{border-color:#1f8a5b;background:#e3f4ea}.fg select.no{border-color:#c2563a;background:#fbe9e5}
.fg .why{display:block;font-size:12.5px;line-height:1.5;color:var(--di-muted,#4f6578);margin:-4px 0 8px}
.es-q{font-size:17px;font-weight:800;margin:0 0 6px}
.es-val{font:800 30px/1.1 var(--di-mono,ui-monospace,monospace);margin:6px 0}
.es input[type=range]{width:100%;accent-color:var(--di-accent,#0b6fa4);height:28px}
.es svg{display:block;width:100%;height:58px;margin-top:6px}
.es small{color:var(--di-muted,#4f6578)}
.mg-wrap{overflow-x:auto}
.mg{border-collapse:separate;border-spacing:3px;font-size:13px}
.mg th{font-weight:700;text-align:left;padding:4px 6px;white-space:nowrap}
.mg thead th{font-size:11.5px;color:var(--di-muted,#4f6578);vertical-align:bottom;max-width:90px;white-space:normal}
.mg td button{width:44px;height:30px;border:0;border-radius:6px;cursor:pointer;font:700 11px/1 var(--di-mono,ui-monospace,monospace)}
.mg td button[aria-pressed="true"]{outline:2.5px solid var(--di-fg,#13263a)}
.mg-key{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;color:var(--di-muted,#4f6578)}
.mg-key i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.lt-boxes{display:grid;gap:6px;margin-bottom:12px}
.lt-box{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:10px;padding:6px;text-align:center;font-size:12px;color:var(--di-muted,#4f6578)}
.lt-box b{display:block;font-size:20px;color:var(--di-fg,#13263a)}
.lt-box.on{border-color:var(--di-accent,#0b6fa4);box-shadow:0 0 0 2px var(--di-accent,#0b6fa4) inset}
.lt-card{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:16px;min-height:150px;display:grid;place-items:center;text-align:center;padding:18px;cursor:pointer;width:100%}
.lt-card .f{font-size:22px;font-weight:800}
.lt-card .b{font-size:18px;color:var(--di-accent,#0b6fa4);font-weight:700;margin-top:6px}
.lt-card small{display:block;color:var(--di-muted,#4f6578);font-size:12px;margin-top:8px}
`;
  function injectStyle() {
    if (document.getElementById('de-style')) return;
    const s = document.createElement('style'); s.id = 'de-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('de');
      this._mo = new MutationObserver(() => this.render && this.render());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _focus(sel) { const n = this.el.querySelector(sel); n && n.focus({ preventScroll: true }); }
    destroy() { this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('de'); }
  }

  /* ======================================================================================
   * Matchup: match pairs
   * data = { left?:{label}, right?:{label}, pairs:[{id,a,b}] }  options: { seed }
   * ====================================================================================== */
  class Matchup extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { seed: 7 });
      this.pairs = data.pairs.map((p, i) => Object.assign({ i }, p, { id: p.id || 'p' + i })); this._reset();
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-side]'); if (b && !b.classList.contains('done')) return this.pick(b.dataset.side, b.dataset.id);
        if (e.target.closest('[data-again]')) { this._reset(); this.render(); this._focus('[data-side="a"]'); }
      });
      this.render();
    }
    _reset() { this.right = shuffle(this.pairs.map(p => p.id), this.o.seed); this.done = new Set(); this.miss = 0; this.pick_ = { a: null, b: null }; this.last = null; }
    pick(side, id) {
      this.pick_[side] = this.pick_[side] === id ? null : id; this.last = null;
      if (this.pick_.a && this.pick_.b) {
        const ok = this.pick_.a === this.pick_.b, a = this.pairs.find(p => p.id === this.pick_.a);
        if (ok) this.done.add(a.id); else this.miss++;
        this.last = { ok, a: a, b: this.pairs.find(p => p.id === this.pick_.b) };
        this._emit('match', { id: a.id, correct: ok });
        const wrongB = this.pick_.b; this.pick_ = { a: null, b: null }; this.render();
        if (!ok) { const n = this.el.querySelector('[data-side="b"][data-id="' + CSS.escape(wrongB) + '"]'); n && n.classList.add('bad'); }
        if (this.done.size === this.pairs.length) this._emit('finish', { misses: this.miss });
        const next = this.el.querySelector('[data-side="a"]:not(.done)'); next && next.focus({ preventScroll: true });
        return;
      }
      this.render(); this._focus('[data-side="' + side + '"][data-id="' + CSS.escape(id) + '"]');
    }
    render() {
      const d = this.data, btn = (side, p, text) => '<li><button type="button" data-side="' + side + '" data-id="' + esc(p.id) + '" class="' + (this.done.has(p.id) ? 'done' : '') + '" aria-pressed="' + (this.pick_[side] === p.id) + '"' + (this.done.has(p.id) ? ' aria-disabled="true"' : '') + '>' + esc(text) + (this.done.has(p.id) ? ' ✓' : '') + '</button></li>';
      this.el.innerHTML = '<div class="mu"><div><h5>' + esc((d.left && d.left.label) || 'Match') + '</h5><ul>' + this.pairs.map(p => btn('a', p, p.a)).join('') + '</ul></div><div><h5>' + esc((d.right && d.right.label) || 'With') + '</h5><ul>' + this.right.map(id => this.pairs.find(p => p.id === id)).map(p => btn('b', p, p.b)).join('') + '</ul></div></div><div class="de-bar"><button type="button" class="de-btn" data-again>Start again</button></div><p class="de-note" aria-live="polite"></p>';
      const n = this.el.querySelector('.de-note'), all = this.done.size === this.pairs.length;
      n.innerHTML = all ? '<span class="de-ok">All ' + this.pairs.length + ' matched</span> with ' + (this.miss ? this.miss + ' miss' + (this.miss === 1 ? '' : 'es') : 'no misses') + '.' : (this.last ? (this.last.ok ? '<span class="de-ok">Right:</span> ' + esc(this.last.a.a) + ' goes with ' + esc(this.last.a.b) + '. ' : '<span class="de-no">Not quite:</span> ' + esc(this.last.a.a) + ' does not go with ' + esc(this.last.b.b) + '. ') : '') + this.done.size + ' of ' + this.pairs.length + ' matched' + (this.miss ? ', ' + this.miss + ' miss' + (this.miss === 1 ? '' : 'es') : '') + '. Tap one on each side.';
    }
  }

  /* ======================================================================================
   * Sequence: put in order
   * data = { prompt?, items:[{id,label,order,when?,note?}] }  options: { seed }
   * ====================================================================================== */
  class Sequence extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { seed: 11 });
      this.items = data.items.map((x, i) => Object.assign({ i }, x, { id: x.id || 's' + i })); this.right = this.items.slice().sort((a, b) => a.order - b.order).map(x => x.id); this._reset();
      el.addEventListener('click', e => {
        const mv = e.target.closest('[data-mv]'); if (mv) { const [id, d] = mv.dataset.mv.split(':'); return this.move(id, +d); }
        if (e.target.closest('[data-check]')) return this.check();
        if (e.target.closest('[data-show]')) { this.cur = this.right.slice(); this.checked = true; this.shown = true; this.render(); return; }
        if (e.target.closest('[data-again]')) { this._reset(); this.render(); }
      });
      this.render();
    }
    _reset() { this.cur = shuffle(this.right, this.o.seed); this.checked = false; this.shown = false; this.tries = 0; }
    move(id, d) { const i = this.cur.indexOf(id), j = clamp(i + d, 0, this.cur.length - 1); if (i === j) return; [this.cur[i], this.cur[j]] = [this.cur[j], this.cur[i]]; this.checked = false; this.render(); this._focus('[data-mv="' + CSS.escape(id) + ':' + d + '"]:not(:disabled), [data-mv="' + CSS.escape(id) + ':' + -d + '"]'); this._emit('move', { order: this.cur.slice() }); }
    check() { this.checked = true; this.tries++; this.render(); const ok = this.cur.filter((id, i) => this.right[i] === id).length; this._emit('check', { correct: ok, of: this.cur.length }); }
    render() {
      const by = id => this.items.find(x => x.id === id), n = this.cur.length, ok = this.cur.filter((id, i) => this.right[i] === id).length;
      this.el.innerHTML = (this.data.prompt ? '<p class="es-q">' + esc(this.data.prompt) + '</p>' : '') + '<ol class="sq">' + this.cur.map((id, i) => { const x = by(id), st = this.checked ? (this.right[i] === id ? 'ok' : 'no') : ''; return '<li class="' + st + '"><span class="n">' + (i + 1) + '</span><span class="t">' + esc(x.label) + (this.checked && x.when ? '<small>' + esc(x.when) + (x.note && this.shown ? ' — ' + esc(x.note) : '') + '</small>' : '') + '</span><span class="mv"><button type="button" data-mv="' + esc(id) + ':-1" aria-label="Move ' + esc(x.label) + ' up"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-mv="' + esc(id) + ':1" aria-label="Move ' + esc(x.label) + ' down"' + (i === n - 1 ? ' disabled' : '') + '>↓</button></span></li>'; }).join('') + '</ol><div class="de-bar"><button type="button" class="de-btn main" data-check>Check</button><button type="button" class="de-btn" data-show>Show the answer</button><button type="button" class="de-btn" data-again>Shuffle again</button></div><p class="de-note" aria-live="polite"></p>';
      const note = this.el.querySelector('.de-note');
      note.innerHTML = this.shown ? 'This is the right order.' : this.checked ? (ok === n ? '<span class="de-ok">All ' + n + ' in the right place</span>' + (this.tries > 1 ? ' after ' + this.tries + ' checks' : ' first time') + '.' : '<span class="de-no">' + ok + ' of ' + n + '</span> in the right place (green). Move the red ones and check again.') : 'Use the arrows to put them in order, then check.';
    }
  }

  /* ======================================================================================
   * Fillgap: choose words for the gaps
   * data = { sentences:[{id,text:'… [right|wrong|wrong] …', why?}] }  (the first word in each [ ] is right)
   * ====================================================================================== */
  class Fillgap extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { seed: 5 });
      this.gaps = []; this.sents = data.sentences.map((s, i) => { const parts = []; let k = 0; String(s.text).replace(/\[([^\]]+)\]|([^\[]+)/g, (m, g, t) => { if (g) { const opts2 = g.split('|').map(x => x.trim()), id = i + '.' + k++; this.gaps.push({ id, right: opts2[0], opts: shuffle(opts2, this.o.seed + this.gaps.length) }); parts.push({ gap: id }); } else parts.push({ t }); return m; }); return Object.assign({ i, parts }, s); });
      this.ans = {}; this.checked = false;
      el.addEventListener('change', e => { const s = e.target.closest('select[data-g]'); if (!s) return; this.ans[s.dataset.g] = s.value; this.checked = false; this._mark(); this._emit('answer', { gap: s.dataset.g, value: s.value }); });
      el.addEventListener('click', e => { if (e.target.closest('[data-check]')) { this.checked = true; this._mark(); const ok = this.gaps.filter(g => this.ans[g.id] === g.right).length; this._emit('check', { correct: ok, of: this.gaps.length }); } if (e.target.closest('[data-again]')) { this.ans = {}; this.checked = false; this.render(); } });
      this.render();
    }
    render() {
      this.el.innerHTML = '<div class="fg">' + this.sents.map(s => '<p>' + s.parts.map(p => { if (p.t != null) return esc(p.t); const g = this.gaps.find(x => x.id === p.gap); return '<select data-g="' + g.id + '" aria-label="Gap ' + (this.gaps.indexOf(g) + 1) + '"><option value="">…</option>' + g.opts.map(o => '<option' + (this.ans[g.id] === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>'; }).join('') + '</p><span class="why" data-why="' + s.i + '" hidden>' + esc(s.why || '') + '</span>').join('') + '</div><div class="de-bar"><button type="button" class="de-btn main" data-check>Check</button><button type="button" class="de-btn" data-again>Start again</button></div><p class="de-note" aria-live="polite"></p>';
      this._mark();
    }
    _mark() {
      const done = this.gaps.filter(g => this.ans[g.id]).length, ok = this.gaps.filter(g => this.ans[g.id] === g.right).length;
      this.gaps.forEach(g => { const s = this.el.querySelector('[data-g="' + g.id + '"]'); s.classList.toggle('ok', this.checked && this.ans[g.id] === g.right); s.classList.toggle('no', this.checked && this.ans[g.id] !== g.right); s.setAttribute('aria-invalid', String(this.checked && this.ans[g.id] !== g.right)); });
      this.sents.forEach(s => { const w = this.el.querySelector('[data-why="' + s.i + '"]'); if (w) w.hidden = !(this.checked && s.why && s.parts.some(p => p.gap && this.ans[p.gap] !== this.gaps.find(g => g.id === p.gap).right)); });
      this.el.querySelector('.de-note').innerHTML = this.checked ? (ok === this.gaps.length ? '<span class="de-ok">All ' + ok + ' right.</span>' : '<span class="de-no">' + ok + ' of ' + this.gaps.length + ' right.</span> ' + (done < this.gaps.length ? (this.gaps.length - done) + ' still empty. ' : '') + 'The red ones need another look; a hint shows under the sentence.') : done + ' of ' + this.gaps.length + ' gaps filled. Choose a word for each gap, then check.';
    }
  }

  /* ======================================================================================
   * Estimator: guess, then see how close
   * data = { questions:[{id,q,min,max,step?,answer,unit?,prefix?,decimals?,source?}] }
   * ====================================================================================== */
  class Estimator extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.qs = data.questions.map((q, i) => Object.assign({ i }, q, { id: q.id || 'q' + i })); this.k = 0; this.res = []; this.locked = false; this.val = null;
      el.addEventListener('input', e => { if (e.target.matches('input[type=range]')) { this.val = +e.target.value; this._val(); } });
      el.addEventListener('click', e => {
        if (e.target.closest('[data-lock]')) { const q = this.qs[this.k], g = this.val != null ? this.val : this._mid(q), off = Math.abs(g - q.answer) / (q.max - q.min), score = Math.round(clamp(100 - off * 200, 0, 100)); this.res[this.k] = { guess: g, score }; this.locked = true; this.render(); this._emit('guess', { id: q.id, guess: g, answer: q.answer, score }); this._focus('[data-next]'); }
        if (e.target.closest('[data-next]')) { this.k++; this.locked = false; this.val = null; this.render(); if (this.k >= this.qs.length) this._emit('finish', { score: this._total() }); else this._focus('input[type=range]'); }
        if (e.target.closest('[data-again]')) { this.k = 0; this.res = []; this.locked = false; this.val = null; this.render(); }
      });
      this.render();
    }
    _mid(q) { const st = q.step || 1; return Math.round(((q.min + q.max) / 2) / st) * st; }
    _total() { return Math.round(this.res.reduce((a, r) => a + r.score, 0) / Math.max(1, this.res.length)); }
    _val() { const q = this.qs[this.k], v = this.val != null ? this.val : this._mid(q), F = { prefix: q.prefix, suffix: q.unit ? ' ' + q.unit : '', decimals: q.decimals }, n = this.el.querySelector('.es-val'); if (n) n.textContent = fmt(v, F); const r = this.el.querySelector('input[type=range]'); r && r.setAttribute('aria-valuetext', fmt(v, F)); }
    render() {
      if (this.k >= this.qs.length) { const t = this._total(); this.el.innerHTML = '<div class="es"><p class="es-q">Your score: ' + t + ' out of 100</p><p class="de-note">' + this.qs.map((q, i) => esc(q.q) + ' You said ' + fmt(this.res[i].guess, { prefix: q.prefix, decimals: q.decimals }) + ', the answer is <b>' + fmt(q.answer, { prefix: q.prefix, suffix: q.unit ? ' ' + q.unit : '', decimals: q.decimals }) + '</b>.').join('<br>') + '</p><div class="de-bar"><button type="button" class="de-btn main" data-again>Play again</button></div></div>'; return; }
      const q = this.qs[this.k], st = q.step || 1, F = { prefix: q.prefix, suffix: q.unit ? ' ' + q.unit : '', decimals: q.decimals }, r = this.res[this.k], sx = v => 8 + ((v - q.min) / (q.max - q.min)) * 84;
      let mark = '';
      if (this.locked) mark = '<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><line x1="8" y1="15" x2="92" y2="15" stroke="#9aaebd" stroke-width="1" vector-effect="non-scaling-stroke"/><line x1="' + sx(r.guess) + '" y1="15" x2="' + sx(q.answer) + '" y2="15" stroke="' + (r.score >= 70 ? '#1f8a5b' : '#c2563a') + '" stroke-width="6" vector-effect="non-scaling-stroke" opacity=".5"/><circle cx="' + sx(r.guess) + '" cy="15" r="3" fill="#4f6578"/><circle cx="' + sx(q.answer) + '" cy="15" r="3.5" fill="#1f8a5b"/></svg><small>Grey: your guess. Green: the answer.</small>';
      this.el.innerHTML = '<div class="es"><p class="dm-small" style="font-size:12.5px;color:var(--di-muted,#4f6578);margin:0 0 4px">Question ' + (this.k + 1) + ' of ' + this.qs.length + '</p><p class="es-q">' + esc(q.q) + '</p><div class="es-val" aria-hidden="true"></div><input type="range" min="' + q.min + '" max="' + q.max + '" step="' + st + '" value="' + (this.val != null ? this.val : this._mid(q)) + '" aria-label="Your guess"' + (this.locked ? ' disabled' : '') + '><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--di-muted,#4f6578)"><span>' + esc(fmt(q.min, F)) + '</span><span>' + esc(fmt(q.max, F)) + '</span></div>' + mark + '<div class="de-bar">' + (this.locked ? '<button type="button" class="de-btn main" data-next>' + (this.k === this.qs.length - 1 ? 'See your score' : 'Next question') + '</button>' : '<button type="button" class="de-btn main" data-lock>Lock in my guess</button>') + '</div><p class="de-note" aria-live="polite"></p></div>';
      this._val();
      this.el.querySelector('.de-note').innerHTML = this.locked ? 'The answer is <b>' + fmt(q.answer, F) + '</b>; you said ' + fmt(r.guess, F) + ' — ' + (r.guess === q.answer ? 'spot on' : fmt(Math.abs(r.guess - q.answer), F) + ' ' + (r.guess > q.answer ? 'too high' : 'too low')) + '. <b>' + r.score + ' points.</b>' + (q.source ? ' <small>' + esc(q.source) + '</small>' : '') : 'Slide to your best guess, then lock it in.';
    }
  }

  /* ======================================================================================
   * Masterygrid: learners by skills
   * data = { levels:[4 labels], skills:[{id,label}], learners:[{id,label,scores:[level index per skill]}] }  options: { sort:'name' }
   * ====================================================================================== */
  class Masterygrid extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'listed' });
      this.sk = data.skills.map((s, i) => Object.assign({ i }, s)); this.ln = data.learners.map((l, i) => Object.assign({ i }, l)); this.lv = data.levels || ['Not started', 'Learning', 'Nearly there', 'Got it']; this.sort = this.o.sort; this.sel = null; this.help = false;
      el.addEventListener('click', e => {
        const c = e.target.closest('[data-cell]'); if (c) { this.sel = this.sel === c.dataset.cell ? null : c.dataset.cell; this.render(); this._focus('[data-cell="' + CSS.escape(c.dataset.cell) + '"]'); if (this.sel) { const [l, s] = this.sel.split(':').map(Number); this._emit('select', { learner: this.ln[l].id, skill: this.sk[s].id, level: this.ln[l].scores[s] }); } return; }
        const so = e.target.closest('[data-sort]'); if (so) { this.sort = so.dataset.sort; this.render(); return; }
        if (e.target.closest('[data-help]')) { this.help = !this.help; this.render(); this._emit('filter', { needsHelp: this.help }); }
      });
      el.addEventListener('keydown', e => { const c = e.target.closest('[data-cell]'); if (!c) return; const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!d) return; e.preventDefault(); const rows = [...this.el.querySelectorAll('tbody tr')], r = rows.indexOf(c.closest('tr')), k = [...c.closest('tr').querySelectorAll('[data-cell]')].indexOf(c), t = rows[clamp(r + d[0], 0, rows.length - 1)].querySelectorAll('[data-cell]')[clamp(k + d[1], 0, this.sk.length - 1)]; t && t.focus(); });
      this.render();
    }
    render() {
      const sum = l => l.scores.reduce((a, b) => a + b, 0), top = this.lv.length - 1;
      let rows = this.ln.slice(); if (this.sort === 'total') rows.sort((a, b) => sum(a) - sum(b)); if (this.sort === 'name') rows.sort((a, b) => String(a.label).localeCompare(b.label));
      if (this.help) rows = rows.filter(l => l.scores.some(v => v <= 1));
      const cell = (l, s) => { const v = l.scores[s.i], k = l.i + ':' + s.i, on = this.sel === k; return '<td><button type="button" data-cell="' + k + '" tabindex="' + (l === rows[0] && s.i === 0 ? 0 : -1) + '" aria-pressed="' + on + '" aria-label="' + esc(l.label + ', ' + s.label + ': ' + this.lv[v]) + '" style="background:' + LEVEL_COLOURS[clamp(Math.round((v / top) * 3), 0, 3)] + ';color:' + (v === top ? '#fff' : '#13263a') + (this.help && v > 1 ? ';opacity:.3' : '') + '">' + (v + 1) + '</button></td>'; };
      this.el.innerHTML = '<div class="de-bar" style="margin:0 0 10px"><button type="button" class="de-btn" data-sort="listed" aria-pressed="' + (this.sort === 'listed') + '">As listed</button><button type="button" class="de-btn" data-sort="total" aria-pressed="' + (this.sort === 'total') + '">Most help needed first</button><button type="button" class="de-btn" data-help aria-pressed="' + this.help + '">Only who needs help</button></div><div class="mg-wrap"><table class="mg"><thead><tr><th scope="col"></th>' + this.sk.map(s => '<th scope="col">' + esc(s.label) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(l => '<tr><th scope="row">' + esc(l.label) + '</th>' + this.sk.map(s => cell(l, s)).join('') + '</tr>').join('') + '</tbody></table></div><div class="mg-key">' + this.lv.map((x, i) => '<span><i style="background:' + LEVEL_COLOURS[clamp(Math.round((i / top) * 3), 0, 3)] + '"></i>' + (i + 1) + ' ' + esc(x) + '</span>').join('') + '</div><p class="de-note" aria-live="polite"></p>';
      this.el.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sort === this.sort)));
      const n = this.el.querySelector('.de-note');
      if (this.sel) { const [l, s] = this.sel.split(':').map(Number), v = this.ln[l].scores[s], same = this.ln.filter(x => x.scores[s] <= 1).map(x => x.label); n.innerHTML = '<b>' + esc(this.ln[l].label) + '</b>, ' + esc(this.sk[s].label.toLowerCase()) + ': <b>' + esc(this.lv[v].toLowerCase()) + '</b>.' + (v <= 1 && same.length > 1 ? ' ' + (same.length - 1) + ' other' + (same.length > 2 ? 's' : '') + ' also need help with this: ' + same.filter(x => x !== this.ln[l].label).map(esc).join(', ') + ' — a small group could work on it together.' : ''); }
      else { const per = this.sk.map(s => ({ s, n: this.ln.filter(l => l.scores[s.i] <= 1).length })).sort((a, b) => b.n - a.n), got = this.ln.reduce((a, l) => a + l.scores.filter(v => v === top).length, 0); n.innerHTML = '<b>' + pct(got / (this.ln.length * this.sk.length)) + '</b> of skills are “' + esc(this.lv[top].toLowerCase()) + '”. Most help needed with <b>' + esc(per[0].s.label.toLowerCase()) + '</b> (' + per[0].n + ' of ' + this.ln.length + ')' + (per[1] && per[1].n ? ', then ' + esc(per[1].s.label.toLowerCase()) + ' (' + per[1].n + ')' : '') + '. Tap a square, or use the arrow keys.'; }
    }
  }

  /* ======================================================================================
   * Leitner: flash cards in boxes
   * data = { cards:[{id,front,back,hint?}], boxes?: 3 }
   * ====================================================================================== */
  class Leitner extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, {});
      this.nb = clamp(+data.boxes || 3, 2, 6); this.cards = data.cards.map((c, i) => Object.assign({ i }, c, { id: c.id || 'c' + i, box: 0, seen: 0 })); this.flip = false; this.turn = 0; this.cur = this._next();
      el.addEventListener('click', e => {
        if (e.target.closest('.lt-card')) { this.flip = !this.flip; this.render(); this._focus(this.flip ? '[data-knew]' : '.lt-card'); return; }
        const k = e.target.closest('[data-knew]'); if (k) return this.answer(k.dataset.knew === '1');
        if (e.target.closest('[data-again]')) { this.cards.forEach(c => { c.box = 0; c.seen = 0; }); this.turn = 0; this.flip = false; this.cur = this._next(); this.render(); }
      });
      this.render();
    }
    _next() { const left = this.cards.filter(c => c.box < this.nb - 1 || c.seen === 0); if (!left.length) return null; const low = Math.min(...left.map(c => c.box)); const pool = left.filter(c => c.box === low).sort((a, b) => a.seen - b.seen || a.i - b.i); return pool[0]; }
    answer(knew) { const c = this.cur; c.seen++; c.box = knew ? Math.min(this.nb - 1, c.box + 1) : 0; this.turn++; this.flip = false; this._emit('answer', { id: c.id, knew, box: c.box + 1 }); this.cur = this._next(); this.render(); if (!this.cur) this._emit('finish', { turns: this.turn }); else this._focus('.lt-card'); }
    render() {
      const counts = Array.from({ length: this.nb }, (_, b) => this.cards.filter(c => c.box === b).length), c = this.cur;
      this.el.innerHTML = '<div class="lt-boxes" style="grid-template-columns:repeat(' + this.nb + ',1fr)">' + counts.map((n, b) => '<div class="lt-box' + (c && c.box === b ? ' on' : '') + '"><b>' + n + '</b>Box ' + (b + 1) + (b === 0 ? ' · new' : b === this.nb - 1 ? ' · known' : '') + '</div>').join('') + '</div>' +
        (c ? '<button type="button" class="lt-card" aria-label="' + esc(this.flip ? c.front + ': ' + c.back : c.front + '. Tap to see the answer.') + '"><span><span class="f">' + esc(c.front) + '</span>' + (this.flip ? '<span class="b" style="display:block">' + esc(c.back) + '</span>' : '<small>' + esc(c.hint || 'Think of the answer, then tap the card.') + '</small>') + '</span></button><div class="de-bar">' + (this.flip ? '<button type="button" class="de-btn main" data-knew="1">I knew it</button><button type="button" class="de-btn" data-knew="0">I didn’t</button>' : '') + '</div>' : '<p class="es-q">All ' + this.cards.length + ' cards are in the last box.</p><div class="de-bar"><button type="button" class="de-btn main" data-again>Start again</button></div>') + '<p class="de-note" aria-live="polite"></p>';
      this.el.querySelector('.de-note').innerHTML = c ? (this.flip ? 'Be honest: if you knew it, it moves up a box; if not, it goes back to box 1 and comes round again sooner.' : '<b>' + counts[this.nb - 1] + ' of ' + this.cards.length + '</b> known so far, after ' + this.turn + ' turn' + (this.turn === 1 ? '' : 's') + '. Cards in lower boxes come round more often.') : 'Done in <b>' + this.turn + '</b> turns. Cards you found hard came round more often until you knew them.';
    }
  }

  return { Matchup, Sequence, Fillgap, Estimator, Masterygrid, Leitner, shuffle };
});
