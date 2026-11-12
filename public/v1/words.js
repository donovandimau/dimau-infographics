/*! Words 1.0 · Dimau Infographics
 *  Six formats for text:
 *    Wordbars   the words used most, as bars; hide common words, search, tap a word for where it is used.
 *    Tagcloud   words sized by how often they are used, packed together; tap a word for its count.
 *    Wordtree   pick a word and see what follows it, as branches; tap a branch to follow the phrase.
 *    Textdiff   two versions of a text with what was added and removed; step through the changes.
 *    Readscore  how easy a text is to read, worked out as you type; the longest sentences are marked.
 *    Keyline    every place a word is used, lined up on the word; sort by what comes before or after.
 *
 *  new Wordbars(el, data, opts) · .on(event, fn) · .destroy()
 *  Theme: --di-bg --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-mono
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { ['Wordbars', 'Tagcloud', 'Wordtree', 'Textdiff', 'Readscore', 'Keyline'].forEach(function (k) { root[k] = m[k]; }); root.DimauWords = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#2f7fd1', '#d9822b', '#1fa38a', '#cf4b6a', '#8a5cd6', '#4a9c3b', '#b8862f', '#3b8fa8'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const pct = n => Math.round(n * 100) + '%';
  function themeOf(el) {
    const cs = getComputedStyle(el), v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { bg: v('--di-bg', '#eef7fb'), surface: v('--di-surface', '#ffffff'), fg: v('--di-fg', '#13263a'), muted: v('--di-muted', '#4f6578'), line: v('--di-line', '#c9dce8'), accent: v('--di-accent', '#0b6fa4'), mono: v('--di-mono', 'ui-monospace, monospace') };
  }
  const fitText = (t, w, size) => { const max = Math.floor(w / (size * 0.56)); t = String(t); return max < 2 ? '' : t.length > max ? t.slice(0, max - 1) + '…' : t; };

  /* Text helpers: words keep letters with accents and macrons, digits, apostrophes and inner hyphens. */
  const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
  const words = t => (String(t).match(WORD) || []);
  const norm = w => w.toLowerCase().replace(/’/g, "'");
  const STOP = new Set(('a an and are as at be been but by can do does for from had has have he her his how i if in into is it its just me more most my no not of on one or our out so some than that the their them then there these they this to too up us was we what when which who will with you your yours all any also about after again before both each few he\'ll here i\'m it\'s let\'s off only other over own same she should such through under until very were where while why would could may might must shall can\'t don\'t isn\'t won\'t yes').split(/\s+/));
  const sentences = t => String(t).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"“‘(])/u).map(s => s.trim()).filter(Boolean);
  function syllables(w) {
    w = norm(w).replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = w.match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1);
  }
  const textsOf = d => (d.texts || (d.text != null ? [{ label: d.label || '', text: d.text }] : [])).map((t, i) => (typeof t === 'string' ? { i, label: '', text: t } : Object.assign({ i }, t)));

  const STYLE = `
.dr{font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,#13263a);position:relative}
:where(.dr) button{font:inherit;color:inherit}
.dr :focus-visible{outline:2px solid var(--di-accent,#0b6fa4);outline-offset:2px}
.dr svg{display:block;width:100%}
.dr svg [data-k]{cursor:pointer}
.dr svg [data-k]:focus{outline:none}
.dr svg [data-k]:focus-visible>*:first-child{stroke:var(--di-fg,#13263a);stroke-width:2.5}
.dr-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.dr-bar input[type=search],.dr-bar input[type=text]{flex:1;min-width:150px;height:38px;border-radius:9px;border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);padding:0 12px;font:inherit;font-size:14px;color:inherit}
.dr-btn{border:1px solid var(--di-line,#c9dce8);background:var(--di-surface,#fff);border-radius:9px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}
.dr-btn[aria-pressed="true"]{background:var(--di-accent,#0b6fa4);border-color:var(--di-accent,#0b6fa4);color:var(--di-surface,#fff)}
.dr-btn:disabled{opacity:.45;cursor:default}
.dr-note{font-size:14px;line-height:1.55;margin:10px 0 0;min-height:1.5em}
.dr-quotes{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:6px}
.dr-quotes li{font-size:13.5px;line-height:1.5;background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);border-radius:9px;padding:8px 10px}
.dr-quotes li small{display:block;color:var(--di-muted,#4f6578);font-size:12px;margin-top:2px}
.dr mark{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 22%,transparent);color:inherit;border-radius:3px;padding:0 2px;font-weight:700}
.td-text{font-size:15px;line-height:1.75;background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);border-radius:12px;padding:14px 16px}
.td-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:640px){.td-cols{grid-template-columns:1fr}}
.td-cols h5{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--di-muted,#4f6578)}
.td-text del{background:#f6d5cf;color:#8a2a17;text-decoration:line-through;border-radius:3px;padding:0 2px}
.td-text ins{background:#cfeedd;color:#155c37;text-decoration:none;border-radius:3px;padding:0 2px;font-weight:600}
.td-text .on{outline:2px solid var(--di-fg,#13263a);outline-offset:1px}
.rs-box{width:100%;min-height:150px;box-sizing:border-box;border:1px solid var(--di-line,#c9dce8);border-radius:12px;background:var(--di-surface,#fff);padding:12px 14px;font:inherit;font-size:15px;line-height:1.6;color:inherit;resize:vertical}
.rs-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:12px 0}
.rs-stats div{background:var(--di-surface,#fff);border:1px solid var(--di-line,#c9dce8);border-radius:10px;padding:8px 10px}
.rs-stats b{display:block;font-size:20px}
.rs-stats span{font-size:12px;color:var(--di-muted,#4f6578)}
.rs-long{margin:6px 0 0;padding-left:18px;font-size:13.5px;line-height:1.55}
.kl-wrap{overflow-x:auto;border:1px solid var(--di-line,#c9dce8);border-radius:12px;background:var(--di-surface,#fff)}
.kl{display:grid;font-size:13.5px;min-width:0}
.kl button{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);width:100%;border:0;background:none;padding:0;text-align:inherit;cursor:pointer}
.kl span{padding:6px 8px;border-bottom:1px solid var(--di-line,#c9dce8);white-space:nowrap;overflow:hidden}
.kl .l{text-align:right;direction:rtl;text-overflow:ellipsis}
.kl .l bdi{direction:ltr}
.kl .k{font-weight:800;color:var(--di-accent,#0b6fa4)}
.kl .r{text-overflow:ellipsis}
.kl button:hover span,.kl button:focus-visible span{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 8%,transparent)}
.kl button[aria-pressed="true"] span{background:color-mix(in srgb,var(--di-accent,#0b6fa4) 16%,transparent)}
`;
  function injectStyle() {
    if (document.getElementById('dr-style')) return;
    const s = document.createElement('style'); s.id = 'dr-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Base {
    constructor(el, data, opts, defaults) {
      injectStyle();
      this.el = el; this.data = data || {}; this.o = Object.assign({}, defaults || {}, opts || {}); this._ev = {};
      el.classList.add('dr');
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
      c.addEventListener('keydown', e => { const g = e.target.closest('[data-k]'); if (g && g.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(g.dataset.k); } });
    }
    _keep(c, html) { const a = document.activeElement, k = a && c.contains(a) && a.dataset ? a.dataset.k : null; c.innerHTML = html; if (k != null) { const g = c.querySelector('[data-k="' + CSS.escape(k) + '"]'); g && g.focus({ preventScroll: true }); } }
    destroy() { this._ro.disconnect(); this._mo.disconnect(); this.el.innerHTML = ''; this.el.classList.remove('dr'); }
  }

  /** Short snippets around a word in the texts, with the word marked. */
  function snippets(texts, w, max) {
    const out = [], re = new RegExp('(^|[^\\p{L}\\p{N}])(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\p{L}\\p{N}])', 'iu');
    for (const t of texts) { const m = re.exec(t.text); if (!m) continue; const at = m.index + m[1].length, a = Math.max(0, at - 50), b = Math.min(t.text.length, at + w.length + 50); out.push({ label: t.label, html: (a ? '…' : '') + esc(t.text.slice(a, at)) + '<mark>' + esc(t.text.slice(at, at + m[2].length)) + '</mark>' + esc(t.text.slice(at + m[2].length, b)) + (b < t.text.length ? '…' : '') }); if (out.length >= max) break; }
    return out;
  }
  function counts(texts, hideCommon, extraStop) {
    const c = new Map(), stop = new Set((extraStop || []).map(norm));
    texts.forEach(t => words(t.text).forEach(w => { const n = norm(w); if (n.length < 2 && !/\d/.test(n)) return; if (hideCommon && (STOP.has(n) || stop.has(n))) return; c.set(n, (c.get(n) || 0) + 1); }));
    return [...c.entries()].map(([w, n]) => ({ w, n })).sort((a, b) => b.n - a.n || a.w.localeCompare(b.w));
  }

  /* ======================================================================================
   * Wordbars: most-used words as bars
   * data = { texts:[{label,text}] | text, stop?:[words] }  options: { top: 15, hideCommon: true }
   * ====================================================================================== */
  class Wordbars extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { top: 15, hideCommon: true });
      this.texts = textsOf(data); this.hide = !!this.o.hideCommon; this.q = ''; this.sel = null;
      this.total = this.texts.reduce((a, t) => a + words(t.text).length, 0);
      el.innerHTML = '<div class="dr-bar"><input type="search" placeholder="Find a word" aria-label="Find a word"><button type="button" class="dr-btn" data-hide aria-pressed="' + this.hide + '">Hide common words</button></div><svg role="group"></svg><p class="dr-note" aria-live="polite"></p><ul class="dr-quotes"></ul>';
      this.$q = el.querySelector('input'); this.$h = el.querySelector('[data-hide]'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dr-note'); this.$quotes = el.querySelector('.dr-quotes');
      this.$q.addEventListener('input', () => { this.q = norm(this.$q.value.trim()); this.sel = null; this.render(); this._emit('search', { query: this.q }); });
      this.$h.onclick = () => { this.hide = !this.hide; this.sel = null; this.render(); };
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { word: this.sel, count: (this._all.find(x => x.w === this.sel) || {}).n || 0 }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, all = this._all = counts(this.texts, this.hide, this.data.stop);
      const list = (this.q ? all.filter(x => x.w.includes(this.q)) : all).slice(0, this.o.top), rowH = 26, pl = narrow ? 92 : 130, pr = 40, H = Math.max(rowH, list.length * rowH) + 6, max = list.length ? list[0].n : 1;
      let s = '';
      list.forEach((x, k) => {
        const y = 3 + k * rowH, w = ((W - pl - pr) * x.n) / max, on = this.sel === x.w, dim = this.sel && !on;
        s += '<g data-k="' + esc(x.w) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(x.w + ': used ' + x.n + ' times') + '" opacity="' + (dim ? 0.4 : 1) + '"><rect x="' + pl + '" y="' + (y + 4) + '" width="' + f1(Math.max(2, w)) + '" height="' + (rowH - 8) + '" rx="4" fill="' + T.accent + '" opacity="' + (on ? 1 : 0.8) + '"/><rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          '<text x="' + (pl - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end" font-size="12.5" font-weight="' + (on ? 800 : 600) + '" fill="' + T.fg + '">' + esc(fitText(x.w, pl - 12, 12.5)) + '</text><text x="' + f1(pl + w + 6) + '" y="' + (y + rowH / 2 + 4) + '" font-size="11" fill="' + T.muted + '" font-family="' + esc(T.mono) + '">' + x.n + '</text></g>';
      });
      if (!list.length) s = '<text x="8" y="18" font-size="13" fill="' + T.muted + '">No word matches “' + esc(this.q) + '”.</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'The ' + list.length + ' most used words');
      this._keep(this.$svg, s);
      this.$h.setAttribute('aria-pressed', String(this.hide));
      if (this.sel) { const x = all.find(z => z.w === this.sel), sn = snippets(this.texts, this.sel, 3), inT = this.texts.filter(t => words(t.text).some(w => norm(w) === this.sel)).length; this.$note.innerHTML = '<b>' + esc(this.sel) + '</b>: used ' + x.n + ' time' + (x.n === 1 ? '' : 's') + (this.texts.length > 1 ? ', in ' + inT + ' of ' + this.texts.length + ' texts' : '') + '. ' + (sn.length ? 'For example:' : ''); this.$quotes.innerHTML = sn.map(q => '<li>' + q.html + (q.label ? '<small>' + esc(q.label) + '</small>' : '') + '</li>').join(''); }
      else { this.$quotes.innerHTML = ''; this.$note.innerHTML = '<b>' + this.total.toLocaleString() + '</b> words' + (this.texts.length > 1 ? ' in ' + this.texts.length + ' texts' : '') + ', ' + all.length.toLocaleString() + ' different' + (this.hide ? ' (leaving out common words such as “the” and “and”)' : '') + '. ' + (all.length ? 'Most used: <b>' + esc(all[0].w) + '</b> (' + all[0].n + '). ' : '') + 'Tap a word to see where it is used.'; }
    }
  }

  /* ======================================================================================
   * Tagcloud: words sized by use, packed on a spiral
   * data = { words:[{text,weight}] } | { texts | text, stop? }  options: { max: 60 }
   * ====================================================================================== */
  class Tagcloud extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { max: 60 });
      this.list = (data.words ? data.words.map(x => ({ w: String(x.text), n: +x.weight })) : counts(textsOf(data), true, data.stop)).sort((a, b) => b.n - a.n).slice(0, this.o.max);
      this.sel = null;
      el.innerHTML = '<svg role="group"></svg><p class="dr-note" aria-live="polite"></p>';
      this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dr-note');
      this._hot(this.$svg, k => { this.sel = this.sel === k ? null : k; this.render(); if (this.sel) this._emit('select', { word: this.sel }); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, H = narrow ? 300 : 380, L = this.list, mx = L[0] ? L[0].n : 1, mn = L.length ? L[L.length - 1].n : 1;
      const fs = n => (narrow ? 11 : 12) + (mx === mn ? 0.5 : (n - mn) / (mx - mn)) * (narrow ? 26 : 40), placed = [], boxes = [];
      const hit = b => b.x0 < 2 || b.y0 < 2 || b.x1 > W - 2 || b.y1 > H - 2 || boxes.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
      const ctx = (this._cv = this._cv || document.createElement('canvas')).getContext('2d'), fam = getComputedStyle(this.el).fontFamily || 'sans-serif';
      L.forEach((x, k) => {
        const size = fs(x.n); ctx.font = (k < 5 ? 800 : 600) + ' ' + size + 'px ' + fam;
        const w = (ctx.measureText ? ctx.measureText(x.w).width : x.w.length * size * 0.62) + 6, h = size * 1.2;
        for (let t = 0; t < 1400; t += 1) { const a = t * 0.35, r = t * (narrow ? 0.55 : 0.75), cx = W / 2 + Math.cos(a) * r * 1.3, cy = H / 2 + Math.sin(a) * r * 0.8, b = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 }; if (!hit(b)) { boxes.push(b); placed.push({ x, k, cx, cy, size }); break; } }
      });
      let s = '';
      placed.forEach(p => { const on = this.sel === p.x.w, dim = this.sel && !on; s += '<g data-k="' + esc(p.x.w) + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(p.x.w + ': ' + p.x.n) + '" opacity="' + (dim ? 0.3 : 1) + '"><text x="' + f1(p.cx) + '" y="' + f1(p.cy + p.size * 0.35) + '" text-anchor="middle" font-size="' + f1(p.size) + '" font-weight="' + (p.k < 5 ? 800 : 600) + '" fill="' + PALETTE[p.k % PALETTE.length] + '"' + (on ? ' stroke="' + T.fg + '" stroke-width="0.8"' : '') + '>' + esc(p.x.w) + '</text></g>'; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Word cloud of ' + placed.length + ' words; bigger means used more');
      this._keep(this.$svg, s);
      this._shown = placed.length;
      if (this.sel) { const x = L.find(z => z.w === this.sel), rank = L.indexOf(x) + 1; this.$note.innerHTML = '<b>' + esc(x.w) + '</b>: ' + x.n + (this.data.words ? '' : ' time' + (x.n === 1 ? '' : 's')) + ', number ' + rank + ' of ' + L.length + '.'; }
      else this.$note.innerHTML = '<b>' + placed.length + '</b> words; the bigger the word, the more it is used. Biggest: <b>' + L.slice(0, 3).map(x => esc(x.w)).join(', ') + '</b>. Tap a word for its count.' + (placed.length < L.length ? ' (' + (L.length - placed.length) + ' more did not fit.)' : '');
    }
  }

  /* ======================================================================================
   * Wordtree: what follows a word
   * data = { texts:[{label,text}] | text, root }  options: { depth: 3, branches: 6 }
   * ====================================================================================== */
  class Wordtree extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { depth: 3, branches: 6 });
      this.sents = textsOf(data).flatMap(t => sentences(t.text).map(s => ({ label: t.label, s, toks: words(s) })));
      this.phrase = words(data.root || '').map(norm);
      el.innerHTML = '<div class="dr-bar"><input type="text" aria-label="Start word" placeholder="Start word"><button type="button" class="dr-btn" data-back>Back</button></div><svg role="group"></svg><p class="dr-note" aria-live="polite"></p><ul class="dr-quotes"></ul>';
      this.$in = el.querySelector('input'); this.$back = el.querySelector('[data-back]'); this.$svg = el.querySelector('svg'); this.$note = el.querySelector('.dr-note'); this.$quotes = el.querySelector('.dr-quotes');
      this.$in.value = this.phrase.join(' ');
      this.$in.addEventListener('change', () => this.set(words(this.$in.value).map(norm)));
      this.$in.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.set(words(this.$in.value).map(norm)); } });
      this.$back.onclick = () => { if (this.phrase.length > 1) this.set(this.phrase.slice(0, -1)); };
      this._hot(this.$svg, k => this.set(this.phrase.concat(k.split(' '))));
      this.render();
    }
    set(p) { if (!p.length) return; this.phrase = p; this.$in.value = p.join(' '); this.render(); this._emit('phrase', { phrase: p.join(' '), count: this._hits.length }); }
    _find() {
      const P = this.phrase, out = [];
      this.sents.forEach(se => { const low = se.toks.map(norm); for (let i = 0; i + P.length <= low.length; i++) if (P.every((w, j) => low[i + j] === w)) out.push({ se, rest: se.toks.slice(i + P.length), at: i }); });
      return out;
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), narrow = W < 520, hits = this._hits = this._find(), D = this.o.depth, B = this.o.branches;
      // group continuations level by level
      const group = (list, d) => { if (d >= D) return []; const m = new Map(); list.forEach(h => { const w = h.rest[d]; if (!w) return; const k = norm(w); if (!m.has(k)) m.set(k, { w, list: [] }); m.get(k).list.push(h); }); return [...m.values()].sort((a, b) => b.list.length - a.list.length).slice(0, d === 0 ? B : 3).map(g => Object.assign(g, { kids: group(g.list, d + 1) })); };
      const tree = group(hits, 0), leaves = n => (n.kids.length ? n.kids.reduce((a, k) => a + leaves(k), 0) : 1), total = tree.reduce((a, g) => a + leaves(g), 0) || 1;
      const rowH = 24, H = Math.max(60, total * rowH + 10), colW = (W - 10) / (D + 1.2), rootW = Math.min(colW * 1.2, narrow ? 100 : 170), sz = n => clamp(11 + Math.sqrt(n) * 2.6, 11, narrow ? 18 : 24);
      let s = '', y0 = 5;
      const rootY = H / 2;
      s += '<text x="6" y="' + f1(rootY + 6) + '" font-size="' + (narrow ? 16 : 20) + '" font-weight="800" fill="' + T.accent + '">' + esc(fitText(this.phrase.join(' '), rootW - 10, narrow ? 16 : 20)) + '</text>';
      const draw = (g, d, x0, y0, path, py) => {
        const n = leaves(g), y = y0 + (n * rowH) / 2, x = rootW + d * colW, key = path.concat(norm(g.w)).join(' '), c = g.list.length, fsz = sz(c);
        s += '<path d="M' + f1(x0) + ' ' + f1(py) + ' C' + f1((x0 + x) / 2) + ' ' + f1(py) + ' ' + f1((x0 + x) / 2) + ' ' + f1(y) + ' ' + f1(x - 4) + ' ' + f1(y) + '" fill="none" stroke="' + T.line + '" stroke-width="' + f1(1 + Math.sqrt(c)) + '"/>';
        s += '<g data-k="' + esc(key) + '" tabindex="0" role="button" aria-label="' + esc(this.phrase.join(' ') + ' ' + key + ': ' + c + ' time' + (c === 1 ? '' : 's') + '. Follow this phrase.') + '"><text x="' + f1(x) + '" y="' + f1(y + fsz * 0.35) + '" font-size="' + f1(fsz) + '" font-weight="' + (d === 0 ? 700 : 500) + '" fill="' + T.fg + '">' + esc(fitText(g.w, colW - 10, fsz)) + '</text><rect x="' + f1(x - 2) + '" y="' + f1(y - fsz * 0.7) + '" width="' + f1(Math.min(colW - 6, g.w.length * fsz * 0.58 + 6)) + '" height="' + f1(fsz * 1.3) + '" fill="transparent"/></g>';
        let yy = y0; const ex = x + Math.min(colW - 10, g.w.length * fsz * 0.56) + 4; g.kids.forEach(k => { draw(k, d + 1, ex, yy, path.concat(norm(g.w)), y); yy += leaves(k) * rowH; });
      };
      const rx = Math.min(rootW - 6, 6 + this.phrase.join(' ').length * (narrow ? 9 : 11.3));
      tree.forEach(g => { draw(g, 0, rx, y0, [], rootY); y0 += leaves(g) * rowH; });
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + f1(H)); this.$svg.style.height = f1(H) + 'px';
      this.$svg.setAttribute('aria-label', 'What follows “' + this.phrase.join(' ') + '”');
      this._keep(this.$svg, s);
      this.$back.disabled = this.phrase.length < 2;
      const ex = hits.slice(0, 3);
      this.$quotes.innerHTML = ex.map(h => { const t = h.se.toks, p = this.phrase.length, i = h.at; return '<li>' + esc(t.slice(Math.max(0, i - 6), i).join(' ')) + ' <mark>' + esc(t.slice(i, i + p).join(' ')) + '</mark> ' + esc(t.slice(i + p, i + p + 10).join(' ')) + (h.se.label ? '<small>' + esc(h.se.label) + '</small>' : '') + '</li>'; }).join('');
      this.$note.innerHTML = hits.length ? '“<b>' + esc(this.phrase.join(' ')) + '</b>” appears <b>' + hits.length + '</b> time' + (hits.length === 1 ? '' : 's') + (tree.length ? '; most often followed by “' + esc(tree[0].w) + '” (' + tree[0].list.length + ')' : '') + '. Bigger words follow more often. Tap a word to follow the phrase.' : 'No sentence uses “' + esc(this.phrase.join(' ')) + '”. Try another start word.';
    }
  }

  /* ======================================================================================
   * Textdiff: what changed between two versions
   * data = { before:{label,text}, after:{label,text} }  options: { view: 'marked' }
   * ====================================================================================== */
  function diffWords(a, b) {
    const A = a.match(/\S+|\s+/g) || [], B = b.match(/\S+|\s+/g) || [], n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    const push = (t, s) => { const last = out[out.length - 1]; if (last && last.t === t) last.s += s; else out.push({ t, s }); };
    while (i < n && j < m) { if (A[i] === B[j]) { push('=', A[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]); else push('+', B[j++]); }
    while (i < n) push('-', A[i++]); while (j < m) push('+', B[j++]);
    // a phrase edited word by word becomes one removal and one addition
    const res = []; let k = 0;
    while (k < out.length) {
      if (out[k].t === '=') { res.push(out[k++]); continue; }
      let del = '', ins = '', j = k, pd = '', pi = '';
      while (j < out.length && (out[j].t !== '=' || (/^\s+$/.test(out[j].s) && j + 1 < out.length && out[j + 1].t !== '='))) {
        const p = out[j];
        if (p.t === '=') { pd = pi = p.s; } else if (p.t === '-') { del += (del ? pd : '') + p.s; pd = ''; } else { ins += (ins ? pi : '') + p.s; pi = ''; }
        j++;
      }
      if (del) res.push({ t: '-', s: del }); if (ins) res.push({ t: '+', s: ins }); k = j;
    }
    return res;
  }
  class Textdiff extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { view: 'marked' });
      this.parts = diffWords(String(data.before.text), String(data.after.text)); this.view = this.o.view; this.at = -1;
      this.changes = []; this.parts.forEach((p, k) => { if (p.t !== '=' && p.s.trim()) { const prev = this.changes[this.changes.length - 1]; if (prev && prev.last === k - 1 && prev.t !== p.t) { prev.last = k; prev.parts.push(k); } else this.changes.push({ t: p.t, last: k, parts: [k] }); } });
      el.innerHTML = '<div class="dr-bar"><button type="button" class="dr-btn" data-view="marked">Changes marked</button><button type="button" class="dr-btn" data-view="side">Side by side</button><button type="button" class="dr-btn" data-step="-1" aria-label="Previous change">← Previous</button><button type="button" class="dr-btn" data-step="1" aria-label="Next change">Next →</button></div><div class="td-body"></div><p class="dr-note" aria-live="polite"></p>';
      this.$body = el.querySelector('.td-body'); this.$note = el.querySelector('.dr-note');
      el.querySelector('.dr-bar').addEventListener('click', e => { const v = e.target.closest('[data-view]'), st = e.target.closest('[data-step]'); if (v) { this.view = v.dataset.view; this.render(); } if (st) this.step(+st.dataset.step); });
      this.render();
    }
    step(d) { if (!this.changes.length) return; this.at = (this.at + d + this.changes.length) % this.changes.length; if (this.at < 0) this.at = 0; this.render(); const on = this.$body.querySelector('.on'); on && on.scrollIntoView && on.scrollIntoView({ block: 'nearest' }); this._emit('step', { index: this.at, of: this.changes.length }); }
    render() {
      const d = this.data, cur = this.at >= 0 ? new Set(this.changes[this.at].parts) : new Set();
      const span = (p, k) => p.t === '=' ? esc(p.s) : p.s.trim() ? '<' + (p.t === '+' ? 'ins' : 'del') + (cur.has(k) ? ' class="on"' : '') + '>' + esc(p.s) + '</' + (p.t === '+' ? 'ins' : 'del') + '>' : esc(p.s);
      if (this.view === 'side') this.$body.innerHTML = '<div class="td-cols"><div><h5>' + esc(d.before.label || 'Before') + '</h5><div class="td-text">' + this.parts.map((p, k) => (p.t === '+' ? '' : span(p, k))).join('') + '</div></div><div><h5>' + esc(d.after.label || 'After') + '</h5><div class="td-text">' + this.parts.map((p, k) => (p.t === '-' ? '' : span(p, k))).join('') + '</div></div></div>';
      else this.$body.innerHTML = '<div class="td-text" aria-label="' + esc((d.before.label || 'Before') + ' to ' + (d.after.label || 'After') + ', with removed words struck through and added words underlined') + '">' + this.parts.map(span).join('') + '</div>';
      this.el.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === this.view)));
      const wc = t => this.parts.filter(p => p.t === t).reduce((a, p) => a + words(p.s).length, 0), add = wc('+'), rem = wc('-'), same = wc('=');
      if (this.at >= 0) { const c = this.changes[this.at], rm = c.parts.filter(k => this.parts[k].t === '-').map(k => this.parts[k].s.trim()).join(' '), ad = c.parts.filter(k => this.parts[k].t === '+').map(k => this.parts[k].s.trim()).join(' '); this.$note.innerHTML = 'Change <b>' + (this.at + 1) + ' of ' + this.changes.length + '</b>: ' + (rm && ad ? '“' + esc(rm) + '” became “<b>' + esc(ad) + '</b>”' : rm ? '“' + esc(rm) + '” was removed' : '“<b>' + esc(ad) + '</b>” was added') + '.'; }
      else this.$note.innerHTML = '<b>' + this.changes.length + '</b> changes: ' + add + ' word' + (add === 1 ? '' : 's') + ' added, ' + rem + ' removed, ' + same + ' kept (' + pct(same / Math.max(1, same + rem)) + ' of the ' + esc((d.before.label || 'first version').toLowerCase()) + '). Removed words are struck through in red, added words are in green. Step through the changes.';
    }
  }

  /* ======================================================================================
   * Readscore: reading ease as you type
   * data = { text, label? }  options: { editable: true }
   * ====================================================================================== */
  const BANDS = [[90, 'Very easy', 'about age 11'], [80, 'Easy', 'about age 12'], [70, 'Fairly easy', 'about age 13'], [60, 'Plain', 'ages 13 to 15'], [50, 'Fairly hard', 'ages 15 to 18'], [30, 'Hard', 'university level'], [-1e9, 'Very hard', 'specialist readers']];
  function readStats(t) {
    const S = sentences(t), Wd = words(t), syl = Wd.reduce((a, w) => a + syllables(w), 0), n = Math.max(1, Wd.length), ns = Math.max(1, S.length);
    const ease = 206.835 - 1.015 * (n / ns) - 84.6 * (syl / n), long = Wd.filter(w => syllables(w) >= 3).length;
    return { S, words: Wd.length, sents: S.length, ease: clamp(ease, 0, 100), perSent: n / ns, long, band: BANDS.find(b => ease >= b[0]) };
  }
  class Readscore extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { editable: true });
      el.innerHTML = '<textarea class="rs-box" aria-label="' + esc(data.label || 'Text to check') + '"' + (this.o.editable ? '' : ' readonly') + '></textarea><svg role="img"></svg><div class="rs-stats"></div><p class="dr-note" aria-live="polite"></p><ol class="rs-long"></ol>';
      this.$box = el.querySelector('textarea'); this.$svg = el.querySelector('svg'); this.$stats = el.querySelector('.rs-stats'); this.$note = el.querySelector('.dr-note'); this.$long = el.querySelector('.rs-long');
      this.$box.value = data.text || '';
      let t = null; this.$box.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { this.render(); this._emit('change', { ease: Math.round(this._r.ease) }); }, 150); });
      this.render();
    }
    render() {
      const T = themeOf(this.el), W = Math.max(280, this.$svg.clientWidth || 640), H = 56, r = this._r = readStats(this.$box.value), x = v => 8 + (v / 100) * (W - 16);
      const cols = ['#c2563a', '#d9822b', '#b8862f', '#4a9c3b', '#1fa38a', '#2f7fd1', '#2f7fd1'];
      let s = '', prev = 0; [30, 50, 60, 70, 80, 90, 100].forEach((b, k) => { s += '<rect x="' + f1(x(prev)) + '" y="14" width="' + f1(x(b) - x(prev) - 1) + '" height="14" fill="' + cols[k] + '" opacity=".75"/>'; prev = b; });
      s += '<text x="8" y="10" font-size="10.5" fill="' + T.muted + '">Harder</text><text x="' + (W - 8) + '" y="10" text-anchor="end" font-size="10.5" fill="' + T.muted + '">Easier</text>';
      s += '<path d="M' + f1(x(r.ease)) + ' 30 l-7 12 h14Z" fill="' + T.fg + '"/><text x="' + f1(clamp(x(r.ease), 30, W - 30)) + '" y="54" text-anchor="middle" font-size="11.5" font-weight="800" fill="' + T.fg + '">' + Math.round(r.ease) + ' · ' + esc(r.band[1]) + '</text>';
      this.$svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); this.$svg.style.height = H + 'px';
      this.$svg.setAttribute('aria-label', 'Reading ease ' + Math.round(r.ease) + ' out of 100: ' + r.band[1]);
      this.$svg.innerHTML = s;
      this.$stats.innerHTML = [[r.words, 'words'], [r.sents, 'sentences'], [f1(r.perSent), 'words per sentence'], [r.long, 'long words (3+ syllables)']].map(([v, l]) => '<div><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>').join('');
      const longest = r.S.map((s, i) => ({ s, i, n: words(s).length })).sort((a, b) => b.n - a.n).filter(x => x.n > 20).slice(0, 3);
      this.$long.innerHTML = longest.map(x => '<li>' + esc(x.s) + ' <small>(' + x.n + ' words)</small></li>').join('');
      this.$note.innerHTML = r.words ? 'Reading ease <b>' + Math.round(r.ease) + '</b> out of 100: <b>' + esc(r.band[1].toLowerCase()) + '</b>, for ' + esc(r.band[2]) + '. ' + (r.perSent > 20 ? 'Sentences average ' + f1(r.perSent) + ' words; under 20 is easier to follow. ' : 'Sentences are a comfortable length. ') + (longest.length ? 'Longest sentences:' : 'No sentence is over 20 words.') : 'Type or paste some text to check how easy it is to read.';
    }
  }

  /* ======================================================================================
   * Keyline: every use of a word, lined up
   * data = { texts:[{label,text}] | text, word }  options: { sort: 'order' }
   * ====================================================================================== */
  class Keyline extends Base {
    constructor(el, data, opts) {
      super(el, data, opts, { sort: 'order' });
      this.texts = textsOf(data); this.word = norm(data.word || ''); this.sort = this.o.sort; this.sel = null;
      el.innerHTML = '<div class="dr-bar"><input type="search" aria-label="Word to find" placeholder="Word to find"><button type="button" class="dr-btn" data-sort="order">In order</button><button type="button" class="dr-btn" data-sort="before">By word before</button><button type="button" class="dr-btn" data-sort="after">By word after</button></div><p class="dr-note" aria-live="polite"></p><div class="kl-wrap"><div class="kl" role="list"></div></div><ul class="dr-quotes"></ul>';
      this.$q = el.querySelector('input'); this.$list = el.querySelector('.kl'); this.$note = el.querySelector('.dr-note'); this.$quotes = el.querySelector('.dr-quotes');
      this.$q.value = this.word;
      this.$q.addEventListener('input', () => { this.word = norm(this.$q.value.trim()); this.sel = null; this.render(); this._emit('search', { word: this.word, count: this._hits.length }); });
      el.querySelector('.dr-bar').addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (b) { this.sort = b.dataset.sort; this.render(); } });
      this.$list.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; this.sel = this.sel === +b.dataset.i ? null : +b.dataset.i; this.render(); if (this.sel != null) this._emit('select', { index: this.sel }); const n = this.$list.querySelector('[data-i="' + b.dataset.i + '"]'); n && n.focus(); });
      this.render();
    }
    render() {
      const hits = this._hits = [];
      if (this.word) this.texts.forEach(t => { const tk = words(t.text); tk.forEach((w, i) => { if (norm(w) === this.word || norm(w).replace(/s$/, '') === this.word) hits.push({ t, tk, i }); }); });
      hits.forEach((h, k) => { h.k = k; h.before = norm(h.tk[h.i - 1] || ''); h.after = norm(h.tk[h.i + 1] || ''); });
      const order = this.sort === 'before' ? hits.slice().sort((a, b) => a.before.localeCompare(b.before) || a.k - b.k) : this.sort === 'after' ? hits.slice().sort((a, b) => a.after.localeCompare(b.after) || a.k - b.k) : hits;
      this.$list.innerHTML = order.map(h => '<button type="button" role="listitem" data-i="' + h.k + '" aria-pressed="' + (this.sel === h.k) + '" aria-label="' + esc(h.tk.slice(Math.max(0, h.i - 6), h.i + 7).join(' ') + (h.t.label ? ' — ' + h.t.label : '')) + '"><span class="l"><bdi>' + esc(h.tk.slice(Math.max(0, h.i - 8), h.i).join(' ')) + '</bdi></span><span class="k">' + esc(h.tk[h.i]) + '</span><span class="r">' + esc(h.tk.slice(h.i + 1, h.i + 9).join(' ')) + '</span></button>').join('');
      this.el.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sort === this.sort)));
      const by = k => { const m = new Map(); hits.forEach(h => { const w = h[k]; if (w && !STOP.has(w)) m.set(w, (m.get(w) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]; };
      if (this.sel != null) { const h = hits[this.sel]; this.$quotes.innerHTML = '<li>' + snippets([h.t], h.tk[h.i], 1).map(q => q.html).join('') + (h.t.label ? '<small>' + esc(h.t.label) + '</small>' : '') + '</li>'; }
      else this.$quotes.innerHTML = '';
      const inT = new Set(hits.map(h => h.t)).size, b = by('before'), a = by('after');
      this.$note.innerHTML = !this.word ? 'Type a word to see every place it is used.' : hits.length ? '“<b>' + esc(this.word) + '</b>” is used <b>' + hits.length + '</b> time' + (hits.length === 1 ? '' : 's') + (this.texts.length > 1 ? ', in ' + inT + ' of ' + this.texts.length + ' texts' : '') + '.' + (b && b[1] > 1 ? ' Often after “' + esc(b[0]) + '” (' + b[1] + ').' : '') + (a && a[1] > 1 ? ' Often before “' + esc(a[0]) + '” (' + a[1] + ').' : '') + ' Tap a line to read it in full.' : 'No text uses “' + esc(this.word) + '”.';
    }
  }

  return { Wordbars, Tagcloud, Wordtree, Textdiff, Readscore, Keyline, readStats, diffWords };
});
