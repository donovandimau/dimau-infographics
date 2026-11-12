/*! Archive Desk 1.0 · Dimau Infographics
 *  Read a story and see its pictures together. A 3D open book with turning pages sits beside a stack of
 *  pictures; turning a page brings its picture forward, tapping a picture turns the book to its page.
 *  Three modes: 'split' (read and watch), 'watch' (lightbox, magnifying loupe, auto-play) and
 *  'read' (book on its own, page or scroll view, text size, parchment or sepia, pictures as pop-up cards).
 *
 *  data = { title?, threads:[{ id, date?, title, pages:[{ kicker?, heading, body:[string] | string,
 *                                                       plates?:[imageId], href? }], sources?:[{title,href}] }],
 *           images:{ [imageId]: { src, fallback?, caption, credit?, sourceHref? } } }
 *  new ArchiveDesk(el, data, { mode?: 'split'|'watch'|'read', thread?, page?, autoplayMs?: 6500 })
 *  .on('turn'|'thread'|'mode'|'plate', fn) · .go(threadId, page) · .setMode(m) · getState()/setState() · .destroy()
 *  Theme: --di-fg --di-muted --di-surface --di-line --di-accent --di-font --di-display --di-mono, plus
 *         --ad-paper --ad-cloth --ad-brass --ad-ink (heritage defaults: parchment, terracotta, brass, ink).
 *  No dependencies: CSS 3D transforms and the Web Animations API.
 */
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { root.ArchiveDesk = m.ArchiveDesk; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ACCENTS = ['var(--ad-cloth)', 'var(--ad-brass)', 'var(--di-accent,#2E5A54)'];

  const STYLE = `
.ad{--ad-paper:#F3EFE6;--ad-edge:#E4DAC4;--ad-cloth:#A84232;--ad-brass:#C5A880;--ad-ink:#1E1E1C;--ad-fs:17px;
  position:relative;font-family:var(--di-font,system-ui,sans-serif);color:var(--di-fg,var(--ad-ink))}
.ad[data-light="sepia"]{--ad-paper:#EBDCC0;--ad-edge:#D2BC93}
.ad *,.ad *::before,.ad *::after{box-sizing:border-box}
.ad button{font:inherit;color:inherit;cursor:pointer}
.ad :focus-visible{outline:3px solid var(--di-accent,#2E5A54);outline-offset:2px}
.ad-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.ad-hud{display:flex;gap:4px;padding:4px;border-radius:99px;background:color-mix(in srgb,var(--di-surface,#fff) 70%,transparent);box-shadow:0 0 0 1px var(--di-line,#ddd),0 8px 24px -14px rgba(0,0,0,.4);backdrop-filter:blur(12px)}
.ad-hud button{border:0;background:none;border-radius:99px;padding:7px 14px;font-weight:700;font-size:13.5px}
.ad-hud button[aria-pressed="true"]{background:var(--ad-ink);color:var(--ad-paper)}
.ad-threads{display:flex;gap:6px;overflow-x:auto;padding:10px 1px 4px;scrollbar-width:thin}
.ad-threads button{flex:none;display:grid;text-align:left;gap:2px;border:1px solid var(--di-line,#ddd);background:var(--di-surface,#fff);border-radius:12px;padding:6px 11px}
.ad-threads small{font:700 10px/1 var(--di-mono,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--ad-cloth)}
.ad-threads span{font-size:13px;font-weight:600;white-space:nowrap}
.ad-threads button[aria-current="true"]{background:var(--di-accent,#2E5A54);border-color:var(--di-accent,#2E5A54);color:#fff}
.ad-threads button[aria-current="true"] small{color:var(--ad-brass)}
.ad-stage{display:grid;grid-template-columns:1.15fr 1fr;gap:clamp(14px,3vw,36px);align-items:center;margin-top:10px;perspective:1800px}
.ad-book-zone,.ad-plate-zone{position:relative;min-width:0}
.ad-book-zone{z-index:3}
.ad-plate-zone{overflow-x:clip}
.ad-tools{display:none;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:4px}
.ad-seg{display:inline-flex;border-radius:99px;padding:3px;background:var(--di-surface,#fff);box-shadow:0 0 0 1px var(--di-line,#ddd)}
.ad-seg button{border:0;background:none;border-radius:99px;padding:5px 11px;font-size:12.5px;font-weight:700}
.ad-seg button[aria-pressed="true"]{background:var(--di-accent,#2E5A54);color:#fff}
.ad-cradle{perspective:1800px;padding:26px 0 40px;position:relative}
.ad-cradle::after{content:"";position:absolute;left:6%;right:6%;bottom:12px;height:26px;border-radius:50%;background:radial-gradient(closest-side,rgba(30,30,28,.4),transparent);filter:blur(4px);z-index:-1}
.ad-book{--tilt:15deg;position:relative;display:grid;grid-template-columns:1fr 1fr;aspect-ratio:1.45;max-height:520px;transform-style:preserve-3d;transform:rotateX(var(--tilt)) rotateZ(-1deg);transition:transform .6s}
.ad-book::before{content:"";position:absolute;inset:-9px -11px -13px;border-radius:13px;z-index:-1;background:linear-gradient(180deg,color-mix(in srgb,var(--ad-cloth) 85%,#fff),var(--ad-cloth) 40%,color-mix(in srgb,var(--ad-cloth) 70%,#000));box-shadow:0 28px 56px rgba(30,30,28,.33),inset 0 0 0 2px color-mix(in srgb,var(--ad-brass) 55%,transparent);transform:translateZ(-6px)}
.ad-page{position:relative;overflow:hidden;padding:clamp(14px,2.4vw,30px);background:var(--ad-paper);color:var(--ad-ink);box-shadow:inset 0 0 40px rgba(122,96,52,.18);backface-visibility:hidden}
.ad-left{border-radius:9px 2px 2px 9px;background-image:linear-gradient(90deg,var(--ad-edge),var(--ad-paper) 6%,var(--ad-paper) 86%,rgba(30,30,28,.18))}
.ad-right{border-radius:2px 9px 9px 2px;background-image:linear-gradient(270deg,var(--ad-edge),var(--ad-paper) 6%,var(--ad-paper) 86%,rgba(30,30,28,.2))}
.ad-spine{position:absolute;top:0;bottom:0;left:50%;width:56px;margin-left:-28px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(30,30,28,.28) 45%,rgba(30,30,28,.38) 50%,rgba(30,30,28,.28) 55%,transparent);transform:translateZ(1px)}
.ad-leaf{position:absolute;top:0;bottom:0;left:50%;width:50%;transform-origin:left center;transform-style:preserve-3d;z-index:5}
.ad-leaf>.ad-page{position:absolute;inset:0;display:block!important;border-radius:2px 9px 9px 2px}
.ad-leaf>.ad-back{transform:rotateY(180deg)}
.ad-kicker{margin:0 0 6px;font:700 11px/1.2 var(--di-mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--ad-cloth)}
.ad-page h3{margin:0 0 10px;font:700 clamp(17px,1.8vw,25px)/1.15 var(--di-display,inherit)}
.ad-text{max-height:100%;overflow:auto;padding-right:4px;scrollbar-width:thin}
.ad-text p{margin:0 0 .8em;font-size:var(--ad-fs);line-height:1.6}
.ad-no{position:absolute;bottom:9px;right:16px;font:600 11px var(--di-mono,monospace);opacity:.5}
.ad-left .ad-no{left:16px;right:auto}
.ad-badge{display:inline-flex;margin:2px 6px 6px 0;padding:4px 10px;border-radius:99px;border:1px solid var(--ad-brass);background:color-mix(in srgb,var(--ad-brass) 18%,transparent);color:var(--ad-ink);font-size:12px;font-weight:700}
.ad-more{display:inline-block;margin-top:4px;font-size:13px;font-weight:700;color:var(--di-accent,#2E5A54)}
.ad-facing{display:grid;grid-template-rows:1fr auto;height:100%;gap:9px}
.ad-facing figure{margin:0;display:grid;place-items:center;min-height:0;border:1px solid var(--ad-brass);padding:7px;background:rgba(255,255,255,.35);cursor:zoom-in}
.ad-facing img{max-width:100%;max-height:100%;object-fit:contain;filter:sepia(.15)}
.ad-facing figcaption{font-size:12.5px;line-height:1.4;opacity:.8}
.ad-turn{position:relative;z-index:6;display:flex;align-items:center;justify-content:center;gap:12px}
.ad-turn button{width:42px;height:42px;border-radius:50%;border:1px solid var(--di-line,#ddd);background:var(--di-surface,#fff);font-size:22px;line-height:1}
.ad-turn button:disabled{opacity:.35;cursor:default}
.ad-folio{font:600 13px var(--di-mono,monospace);min-width:8.5em;text-align:center}
.ad-scroll{max-height:70vh;overflow:auto;padding:clamp(18px,4vw,44px);border-radius:12px;background:var(--ad-paper);color:var(--ad-ink);box-shadow:0 26px 56px rgba(30,30,28,.25),inset 0 0 50px rgba(122,96,52,.15)}
.ad-scroll article{position:relative;padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--ad-brass)}
.ad-scroll article:last-child{border:0}
.ad-scroll article.on h3{color:var(--ad-cloth)}
.ad-stack{position:relative;height:min(500px,60vh)}
.ad-plate{position:absolute;left:50%;top:50%;width:min(78%,370px);margin:0;padding:9px 9px 32px;border:0;background:#fbf8f1;color:var(--ad-ink);text-align:left;border-radius:4px;box-shadow:0 18px 38px rgba(30,30,28,.3),0 0 0 1px rgba(30,30,28,.06)}
.ad-plate::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:var(--a,var(--ad-brass))}
.ad-plate img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#e8e0cf;filter:sepia(.12)}
.ad-plate span{position:absolute;left:11px;right:11px;bottom:8px;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ad-plate.linked::after{content:"On this page";position:absolute;top:15px;right:15px;padding:3px 8px;border-radius:99px;background:var(--ad-cloth);color:var(--ad-paper);font:700 10px var(--di-font,inherit);letter-spacing:.05em}
.ad-light{display:grid;gap:12px}
.ad-frame{position:relative;overflow:hidden;height:min(52vh,500px);border-radius:6px;background:var(--ad-ink);box-shadow:0 26px 56px rgba(30,30,28,.38),0 0 0 6px #fbf8f1,0 0 0 7px var(--ad-brass)}
.ad-frame img{width:100%;height:100%;object-fit:contain}
.ad-frame.loupe-on{cursor:none}
.ad-loupe{position:absolute;width:170px;height:170px;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);border:4px solid var(--ad-brass);box-shadow:0 10px 30px rgba(0,0,0,.5);background:no-repeat var(--ad-ink)}
.ad-cap{font-size:14px;line-height:1.45}
.ad-cap small{display:block;margin-top:2px;font-size:12px;color:var(--di-muted,#5b564c)}
.ad-cap a{color:var(--di-accent,#2E5A54);font-weight:700}
.ad-ring{position:relative;height:120px;perspective:900px;overflow:hidden}
.ad-ring-in{position:absolute;left:50%;top:50%;transform-style:preserve-3d}
.ad-ring button{position:absolute;width:112px;height:84px;margin:-42px 0 0 -56px;padding:0;border:2px solid #fbf8f1;border-radius:4px;overflow:hidden;background:#ccc;box-shadow:0 8px 18px rgba(30,30,28,.35)}
.ad-ring button img{width:100%;height:100%;object-fit:cover}
.ad-ring button[aria-current="true"]{border-color:var(--ad-cloth)}
.ad-light-tools{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.ad-light-tools button{border:1px solid var(--di-line,#ddd);border-radius:99px;padding:7px 15px;background:var(--di-surface,#fff);font-weight:700;font-size:13px}
.ad-light-tools button[aria-pressed="true"]{background:var(--ad-ink);color:var(--ad-paper)}
.ad-sub{min-height:2.8em;margin:0;text-align:center;font-size:15px;font-style:italic}
.ad-card{position:absolute;right:0;top:40px;z-index:20;width:min(340px,90%);padding:11px 11px 13px;background:#fbf8f1;color:var(--ad-ink);border-radius:6px;box-shadow:0 28px 64px rgba(30,30,28,.45),0 0 0 1px var(--ad-brass);transform:rotateY(-8deg);transform-origin:right center}
.ad-card img{width:100%;max-height:46vh;object-fit:contain;background:#e8e0cf}
.ad-card p{margin:7px 0 2px;font-size:14px;font-weight:600}
.ad-card small{font-size:12px;opacity:.75}
.ad-card-x{position:absolute;top:-11px;right:-11px;width:32px;height:32px;border-radius:50%;border:0;background:var(--ad-ink);color:var(--ad-paper);font-size:19px}
.ad-foot{margin-top:14px;font-size:12.5px;text-align:center;color:var(--di-muted,#5b564c)}
.ad-foot a{color:var(--di-accent,#2E5A54);font-weight:700}
.ad[data-mode="watch"] .ad-stage,.ad[data-mode="read"] .ad-stage{grid-template-columns:1fr}
.ad[data-mode="watch"] .ad-plate-zone{order:1}
.ad[data-mode="watch"] .ad-stack,.ad:not([data-mode="watch"]) .ad-light{display:none}
.ad[data-mode="watch"] .ad-book-zone{order:2;max-width:760px;width:100%;margin:0 auto;padding:9px 14px;border-radius:16px 16px 0 0;background:color-mix(in srgb,var(--ad-paper) 85%,transparent);box-shadow:0 -10px 28px rgba(30,30,28,.18)}
.ad[data-mode="watch"] .ad-cradle{padding:0}
.ad[data-mode="watch"] .ad-cradle::after,.ad[data-mode="watch"] .ad-book::before,.ad[data-mode="watch"] .ad-spine,.ad[data-mode="watch"] .ad-left,.ad[data-mode="watch"] .ad-no,.ad[data-mode="watch"] .ad-badges,.ad[data-mode="watch"] .ad-text p:not(:first-child){display:none}
.ad[data-mode="watch"] .ad-book{aspect-ratio:auto;grid-template-columns:1fr;transform:none}
.ad[data-mode="watch"] .ad-right{background:transparent;box-shadow:none;padding:3px 3px 0}
.ad[data-mode="watch"] .ad-right h3{font-size:16px;margin-bottom:3px}
.ad[data-mode="watch"] .ad-text p{font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ad[data-mode="read"] .ad-plate-zone{display:none}
.ad[data-mode="read"] .ad-tools{display:flex}
.ad[data-mode="read"] .ad-book{--tilt:6deg}
.ad[data-mode="read"][data-view="scroll"] .ad-cradle{display:none}
.ad.narrow .ad-stage{grid-template-columns:1fr}
.ad.narrow .ad-book{grid-template-columns:1fr;aspect-ratio:auto;--tilt:8deg}
.ad.narrow .ad-left,.ad.narrow .ad-spine{display:none}
.ad.narrow .ad-right{min-height:330px;border-radius:9px}
.ad.narrow .ad-leaf{left:0;width:100%}
.ad.narrow .ad-stack{height:340px;margin-top:36px}
.ad.narrow .ad-plate-zone{z-index:1}
.ad.narrow .ad-frame{height:44vh}
.ad.narrow .ad-loupe{width:120px;height:120px}
.ad.narrow .ad-hud{width:100%;justify-content:space-between}
.ad.narrow .ad-hud button{flex:1;padding:7px 6px}
@media (prefers-reduced-motion:reduce){.ad-book{transition:none}}
`;
  function injectStyle() {
    if (document.getElementById('ad-style')) return;
    const s = document.createElement('style'); s.id = 'ad-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class ArchiveDesk {
    constructor(el, data, opts) {
      injectStyle();
      this.el = el; this.o = Object.assign({ mode: 'split', autoplayMs: 6500 }, opts || {});
      this.data = { title: (data && data.title) || '', threads: (data && data.threads) || [], images: (data && data.images) || {} };
      this.data.threads.forEach(t => t.pages.forEach(p => { if (!Array.isArray(p.body)) p.body = p.body ? [String(p.body)] : []; p.plates = p.plates || []; }));
      this._ev = {};
      const ti = this.data.threads.findIndex(t => t.id === this.o.thread);
      this.s = { mode: this.o.mode, thread: ti < 0 ? 0 : ti, page: Math.max(0, (this.o.page || 1) - 1), plate: null, font: 17, light: 'parchment', view: 'flip', loupe: false, playing: false, busy: false };
      el.classList.add('ad');
      el.innerHTML =
        '<div class="ad-top"><nav class="ad-hud" aria-label="How to explore">' +
        '<button type="button" data-mode="split">Read &amp; Watch</button><button type="button" data-mode="watch">Watch Images</button><button type="button" data-mode="read">Read Book</button></nav></div>' +
        '<nav class="ad-threads" aria-label="Choose a story"></nav>' +
        '<div class="ad-stage"><div class="ad-book-zone">' +
        '<div class="ad-tools"><div class="ad-seg"><button type="button" data-view="flip">Page view</button><button type="button" data-view="scroll">Scroll</button></div>' +
        '<div class="ad-seg"><button type="button" data-font="-1" aria-label="Smaller text">A−</button><button type="button" data-font="1" aria-label="Larger text">A+</button></div>' +
        '<div class="ad-seg"><button type="button" data-light="parchment">Parchment</button><button type="button" data-light="sepia">Sepia</button></div></div>' +
        '<div class="ad-cradle"><div class="ad-book" aria-live="polite"><div class="ad-page ad-left"></div><div class="ad-page ad-right"></div><div class="ad-spine" aria-hidden="true"></div></div></div>' +
        '<div class="ad-scroll" hidden></div>' +
        '<div class="ad-turn"><button type="button" class="ad-prev" aria-label="Previous page">‹</button><span class="ad-folio"></span><button type="button" class="ad-next" aria-label="Next page">›</button></div></div>' +
        '<div class="ad-plate-zone"><div class="ad-stack" aria-label="Pictures for this story"></div>' +
        '<div class="ad-light"><figure style="margin:0;display:grid;gap:8px"><div class="ad-frame"><img alt=""><div class="ad-loupe" hidden></div></div><figcaption class="ad-cap"></figcaption></figure>' +
        '<div class="ad-ring" aria-label="All pictures in this story"></div>' +
        '<div class="ad-light-tools"><button type="button" class="ad-loupe-btn" aria-pressed="false">Magnifying loupe</button><button type="button" class="ad-play" aria-pressed="false">Play visual story</button></div>' +
        '<p class="ad-sub" aria-live="polite"></p></div></div></div>' +
        '<aside class="ad-card" hidden aria-label="Picture"><button type="button" class="ad-card-x" aria-label="Close picture">×</button><img alt=""><p></p><small></small></aside>' +
        '<p class="ad-foot"></p>';
      const q = s => el.querySelector(s);
      this.$ = { threads: q('.ad-threads'), book: q('.ad-book'), left: q('.ad-left'), right: q('.ad-right'), folio: q('.ad-folio'), prev: q('.ad-prev'), next: q('.ad-next'),
        stack: q('.ad-stack'), frame: q('.ad-frame'), loupe: q('.ad-loupe'), cap: q('.ad-cap'), ring: q('.ad-ring'), sub: q('.ad-sub'), play: q('.ad-play'),
        scroll: q('.ad-scroll'), card: q('.ad-card'), foot: q('.ad-foot'), cradle: q('.ad-cradle') };
      this._wire();
      this._ro = new ResizeObserver(() => { const n = el.clientWidth < 760; if (n !== el.classList.contains('narrow')) el.classList.toggle('narrow', n); });
      this._ro.observe(el);
      this.setMode(this.s.mode, null, true);
      this._renderAll();
    }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    get thread() { return this.data.threads[this.s.thread]; }
    get pages() { return this.thread ? this.thread.pages : []; }
    page(i) { return this.pages[i == null ? this.s.page : i]; }
    plateIds() { const seen = new Set(); this.pages.forEach(p => p.plates.forEach(id => { if (this.data.images[id]) seen.add(id); })); return [...seen]; }
    pageFor(id) { const i = this.pages.findIndex(p => p.plates.includes(id)); return i < 0 ? this.s.page : i; }

    _img(id) {
      const p = this.data.images[id] || {};
      return '<img src="' + esc(p.src) + '"' + (p.fallback ? ' data-fallback="' + esc(p.fallback) + '"' : '') + ' alt="' + esc(p.caption) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
    }
    _text(i) {
      const p = this.page(i); if (!p) return '';
      return (p.kicker ? '<p class="ad-kicker">' + esc(p.kicker) + '</p>' : '') + '<h3>' + esc(p.heading) + '</h3><div class="ad-text">' +
        p.body.map(b => '<p>' + esc(b) + '</p>').join('') +
        '<div class="ad-badges">' + p.plates.filter(id => this.data.images[id]).map((id, n) => '<button type="button" class="ad-badge" data-plate="' + esc(id) + '" data-badge>View plate ' + (n + 1) + ' ↗</button>').join('') + '</div>' +
        (p.href ? '<a class="ad-more" href="' + esc(p.href) + '">Read the full story →</a>' : '') + '</div><span class="ad-no">' + (i + 1) + '</span>';
    }
    _facing(i) {
      const p = this.page(i), id = p && p.plates.find(x => this.data.images[x]);
      if (!id) return '<p class="ad-kicker">' + esc(this.thread.date || '') + '</p><h3>' + esc(this.thread.title) + '</h3>';
      return '<div class="ad-facing"><figure data-plate="' + esc(id) + '" data-facing>' + this._img(id) + '</figure><figcaption><b>Plate.</b> ' + esc(this.data.images[id].caption) + '</figcaption></div><span class="ad-no">' + esc(this.thread.date || '') + '</span>';
    }
    _renderBook() {
      if (!this.thread) return;
      this.$.left.innerHTML = this._facing(this.s.page);
      this.$.right.innerHTML = this._text(this.s.page);
      this.$.folio.textContent = 'Page ' + (this.s.page + 1) + ' of ' + this.pages.length;
      this.$.prev.disabled = this.s.page === 0;
      this.$.next.disabled = this.s.page >= this.pages.length - 1;
      this.el.style.setProperty('--ad-fs', this.s.font + 'px');
    }
    _renderThreads() {
      this.$.threads.hidden = this.data.threads.length < 2;
      this.$.threads.innerHTML = this.data.threads.map((t, i) => '<button type="button" data-thread="' + i + '" aria-current="' + (i === this.s.thread) + '">' + (t.date ? '<small>' + esc(t.date) + '</small>' : '') + '<span>' + esc(t.title) + '</span></button>').join('');
    }
    _renderFoot() {
      const src = (this.thread && this.thread.sources) || [];
      this.$.foot.innerHTML = src.length ? 'Sources: ' + src.map(s => '<a href="' + esc(s.href) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>').join(' · ') : '';
    }
    _renderAll() {
      this._renderThreads(); this._renderBook(); this._renderFoot();
      if (this.s.mode === 'split') this._renderStack();
      if (this.s.mode === 'watch') { this._renderRing(); this._inspect(this.page() && this.page().plates[0]); }
      this._applyView();
    }

    turn(to) {
      if (this.s.busy || to < 0 || to >= this.pages.length || to === this.s.page) return;
      const flip = this.s.mode !== 'watch' && !(this.s.mode === 'read' && this.s.view === 'scroll') && !reduced() && this.$.book.animate;
      if (!flip) { this.s.page = to; return this._afterTurn(); }
      this.s.busy = true;
      const fwd = to > this.s.page, single = this.el.classList.contains('narrow'), cur = this.s.page;
      const leaf = document.createElement('div'); leaf.className = 'ad-leaf';
      leaf.innerHTML = fwd
        ? '<div class="ad-page ad-right">' + this._text(cur) + '</div><div class="ad-page ad-left ad-back">' + (single ? this._text(to) : this._facing(to)) + '</div>'
        : '<div class="ad-page ad-right">' + this._text(to) + '</div><div class="ad-page ad-left ad-back">' + (single ? this._text(cur) : this._facing(cur)) + '</div>';
      this.$.book.appendChild(leaf);
      if (fwd) this.$.right.innerHTML = this._text(to); else this.$.left.innerHTML = this._facing(to);
      const a = leaf.animate([{ transform: 'rotateY(' + (fwd ? 0 : -180) + 'deg)' }, { transform: 'rotateY(' + (fwd ? -180 : 0) + 'deg)' }], { duration: 900, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
      a.onfinish = () => { leaf.remove(); this.s.page = to; this.s.busy = false; this._afterTurn(); };
    }
    _afterTurn() {
      this._renderBook();
      const ids = this.page().plates, pick = ids.includes(this.s.plate) ? this.s.plate : ids[0];
      if (this.s.mode === 'split' && pick) this._front(pick);
      else if (this.s.mode === 'watch') this._inspect(pick || this.s.plate);
      else if (pick) this.s.plate = pick;
      if (this.s.view === 'scroll') this._markScroll();
      this._emit('turn', { thread: this.thread.id, page: this.s.page + 1, pages: this.pages.length });
    }
    go(threadId, page) {
      const i = this.data.threads.findIndex(t => t.id === threadId);
      if (i >= 0 && i !== this.s.thread) { this.s.thread = i; this.s.page = 0; this.s.plate = null; this._stop(); this._renderAll(); this._emit('thread', { thread: threadId }); }
      if (page) this.turn(page - 1);
    }

    _renderStack() {
      const linked = new Set(this.page().plates);
      this.$.stack.innerHTML = this.plateIds().map((id, i) => '<button type="button" class="ad-plate' + (linked.has(id) ? ' linked' : '') + '" data-plate="' + esc(id) + '" style="--a:' + ACCENTS[i % 3] + '" aria-label="' + esc(this.data.images[id].caption) + ', open its page">' + this._img(id) + '<span>' + esc(this.data.images[id].caption) + '</span></button>').join('');
      this._layoutStack(true);
    }
    _layoutStack(instant) {
      const ids = this.plateIds(), front = ids.includes(this.s.plate) ? this.s.plate : (this.page().plates[0] || ids[0]);
      this.s.plate = front;
      const linked = new Set(this.page().plates);
      [front, ...ids.filter(x => x !== front)].forEach((id, d) => {
        const b = this.$.stack.querySelector('[data-plate="' + CSS.escape(id) + '"]'); if (!b) return;
        const n = Math.min(d, 7), seed = ((id.length * 37 + id.charCodeAt(id.length - 1) * 13) % 11) - 5;
        b.classList.toggle('linked', linked.has(id));
        b.style.zIndex = String(100 - d);
        b.style.opacity = d > 7 ? '0' : String(1 - n * 0.07);
        b.style.transition = instant || reduced() ? 'none' : 'transform .75s cubic-bezier(.2,.8,.2,1),opacity .5s';
        b.style.transform = d === 0 ? 'translate(-50%,-50%) translate3d(0,0,110px) rotateY(-6deg)'
          : 'translate(-50%,-50%) translate3d(' + (seed * 7 + n * 10) + 'px,' + (n * -15) + 'px,' + (-n * 70) + 'px) rotateY(' + (-14 + seed) + 'deg) rotateZ(' + (seed * 1.4) + 'deg)';
        b.tabIndex = d > 7 ? -1 : 0;
      });
    }
    _front(id) { this.s.plate = id; this._layoutStack(false); this._emit('plate', { id, page: this.pageFor(id) + 1 }); }

    _renderRing() {
      const ids = this.plateIds(), n = Math.max(ids.length, 1), r = Math.max(150, n * 28);
      this._r = r; this._angle = 0;
      this.$.ring.innerHTML = '<div class="ad-ring-in" style="transform:translateZ(' + (-r) + 'px)">' + ids.map((id, i) => '<button type="button" data-plate="' + esc(id) + '" style="transform:rotateY(' + (360 / n * i) + 'deg) translateZ(' + r + 'px)" aria-label="' + esc(this.data.images[id].caption) + '">' + this._img(id) + '</button>').join('') + '</div>';
    }
    _spin(id) {
      const ids = this.plateIds(), n = ids.length || 1, i = Math.max(0, ids.indexOf(id));
      let t = -(360 / n) * i;
      while (t - this._angle > 180) t -= 360; while (t - this._angle < -180) t += 360;
      this._angle = t;
      const inner = this.$.ring.querySelector('.ad-ring-in'); if (!inner) return;
      inner.style.transition = reduced() ? 'none' : 'transform .8s cubic-bezier(.2,.8,.2,1)';
      inner.style.transform = 'translateZ(' + (-this._r) + 'px) rotateY(' + t + 'deg)';
      this.$.ring.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b.dataset.plate === id)));
    }
    _inspect(id) {
      id = id || this.plateIds()[0]; const p = this.data.images[id]; if (!p) return;
      this.s.plate = id;
      const img = this.$.frame.querySelector('img');
      img.src = p.src; if (p.fallback) img.dataset.fallback = p.fallback; else delete img.dataset.fallback; img.alt = p.caption; img.referrerPolicy = 'no-referrer';
      this.$.cap.innerHTML = '<b>' + esc(p.caption) + '</b><small>' + esc(p.credit || '') + (p.sourceHref ? ' · <a href="' + esc(p.sourceHref) + '" target="_blank" rel="noopener">Original source ↗</a>' : '') + '</small>';
      const pg = this.page(this.pageFor(id));
      this.$.sub.textContent = pg && pg.body[0] ? '“' + pg.body[0] + '”' : '';
      this._spin(id);
      if (this._kb) this._kb.cancel();
      if (this.s.playing && !reduced() && img.animate) {
        const d = Math.random() > 0.5 ? 1 : -1;
        this._kb = img.animate([{ transform: 'scale(1.02)' }, { transform: 'scale(1.16) translate(' + (d * 3) + '%,-2%) rotate(' + (d * 0.6) + 'deg)' }], { duration: this.o.autoplayMs, easing: 'ease-in-out', fill: 'forwards' });
      }
      this._emit('plate', { id, page: this.pageFor(id) + 1 });
    }
    _moveLoupe(x, y) {
      const f = this.$.frame, img = f.querySelector('img'), L = this.$.loupe, r = f.getBoundingClientRect(), nw = img.naturalWidth, nh = img.naturalHeight;
      if (!nw) return;
      const s = Math.min(r.width / nw, r.height / nh), w = nw * s, h = nh * s, ox = (r.width - w) / 2, oy = (r.height - h) / 2, lx = x - r.left, ly = y - r.top;
      if (lx < ox || lx > ox + w || ly < oy || ly > oy + h) { L.hidden = true; return; }
      const z = 3, size = L.offsetWidth || 170;
      L.hidden = false; L.style.left = lx + 'px'; L.style.top = ly + 'px';
      L.style.backgroundImage = 'url("' + (img.currentSrc || img.src).replace(/"/g, '%22') + '")';
      L.style.backgroundSize = (w * z) + 'px ' + (h * z) + 'px';
      L.style.backgroundPosition = (-((lx - ox) * z - size / 2)) + 'px ' + (-((ly - oy) * z - size / 2)) + 'px';
    }
    _stop() { this.s.playing = false; clearInterval(this._timer); this.$.play.setAttribute('aria-pressed', 'false'); this.$.play.textContent = 'Play visual story'; }
    _step() {
      const ids = this.plateIds(), next = ids[(ids.indexOf(this.s.plate) + 1) % ids.length], to = this.pageFor(next);
      if (to !== this.s.page) { this.s.page = to; this._renderBook(); this._emit('turn', { thread: this.thread.id, page: to + 1, pages: this.pages.length }); }
      this._inspect(next);
    }

    _openCard(id) {
      const p = this.data.images[id]; if (!p) return;
      const c = this.$.card;
      c.querySelector('img').outerHTML = this._img(id);
      c.querySelector('p').textContent = p.caption;
      c.querySelector('small').innerHTML = esc(p.credit || '') + (p.sourceHref ? ' · <a href="' + esc(p.sourceHref) + '" target="_blank" rel="noopener">Original source ↗</a>' : '');
      c.hidden = false; c.querySelector('.ad-card-x').focus({ preventScroll: true });
      this._emit('plate', { id, page: this.pageFor(id) + 1 });
    }
    _closeCard() { this.$.card.hidden = true; }

    _applyView() {
      const scroll = this.s.mode === 'read' && this.s.view === 'scroll';
      this.el.dataset.view = scroll ? 'scroll' : 'flip';
      this.$.scroll.hidden = !scroll;
      this.el.querySelectorAll('[data-view]').forEach(b => { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.view === this.s.view)); });
      if (this._io) this._io.disconnect();
      if (!scroll) return;
      this.$.scroll.innerHTML = this.pages.map((p, i) => '<article data-page="' + i + '">' + this._text(i) + '</article>').join('');
      this._io = new IntersectionObserver(es => {
        const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) { this.s.page = Number(v.target.dataset.page); this._renderBook(); this._markScroll(); }
      }, { root: this.$.scroll, threshold: 0.3 });
      this.$.scroll.querySelectorAll('article').forEach(a => this._io.observe(a));
      this._markScroll();
      const cur = this.$.scroll.querySelector('[data-page="' + this.s.page + '"]'); if (cur) this.$.scroll.scrollTop = cur.offsetTop - 10;
    }
    _markScroll() { this.$.scroll.querySelectorAll('article').forEach(a => a.classList.toggle('on', Number(a.dataset.page) === this.s.page)); }
    _setLight(l) { this.s.light = l; this.el.dataset.light = l; this.el.querySelectorAll('button[data-light]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.light === l))); }

    setMode(mode, plate, quiet) {
      if (!['split', 'watch', 'read'].includes(mode)) return;
      if (mode !== 'watch') this._stop();
      this.s.mode = mode; this.el.dataset.mode = mode;
      this.el.querySelectorAll('.ad-hud button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      this._closeCard(); this._setLight(this.s.light);
      if (quiet) return;
      this._applyView();
      if (mode === 'watch') { this._renderRing(); this._inspect(plate || this.s.plate || (this.page() && this.page().plates[0])); }
      if (mode === 'split') this._renderStack();
      this._emit('mode', { mode });
    }

    _wire() {
      const el = this.el;
      this._click = e => {
        const t = e.target;
        const hud = t.closest('.ad-hud button'); if (hud) return this.setMode(hud.dataset.mode);
        const th = t.closest('[data-thread]'); if (th) { const tt = this.data.threads[Number(th.dataset.thread)]; return this.go(tt.id); }
        if (t.closest('.ad-prev')) return this.turn(this.s.page - 1);
        if (t.closest('.ad-next')) return this.turn(this.s.page + 1);
        if (t.closest('.ad-card-x')) return this._closeCard();
        const v = t.closest('button[data-view]'); if (v) { this.s.view = v.dataset.view; return this._applyView(); }
        const f = t.closest('[data-font]'); if (f) { this.s.font = Math.min(24, Math.max(14, this.s.font + Number(f.dataset.font) * 1.5)); return el.style.setProperty('--ad-fs', this.s.font + 'px'); }
        const l = t.closest('button[data-light]'); if (l) return this._setLight(l.dataset.light);
        if (t.closest('.ad-loupe-btn')) { this.s.loupe = !this.s.loupe; t.closest('.ad-loupe-btn').setAttribute('aria-pressed', String(this.s.loupe)); this.$.frame.classList.toggle('loupe-on', this.s.loupe); if (!this.s.loupe) this.$.loupe.hidden = true; return; }
        if (t.closest('.ad-play')) {
          if (this.s.playing) return this._stop();
          this.s.playing = true; this.$.play.setAttribute('aria-pressed', 'true'); this.$.play.textContent = 'Pause visual story';
          this._inspect(this.s.plate); this._timer = setInterval(() => this._step(), this.o.autoplayMs); return;
        }
        const p = t.closest('[data-plate]');
        if (p) {
          const id = p.dataset.plate;
          if (p.hasAttribute('data-badge') || this.s.mode === 'read') return this._openCard(id);
          if (p.hasAttribute('data-facing')) return this.s.mode === 'watch' ? this._inspect(id) : this.setMode('watch', id);
          this.s.plate = id;
          if (this.s.mode === 'watch') this._inspect(id); else this._front(id);
          const to = this.pageFor(id); if (to !== this.s.page) this.turn(to);
          return;
        }
        if (!t.closest('.ad-card')) this._closeCard();
      };
      el.addEventListener('click', this._click);
      this._key = e => {
        if (e.altKey || e.ctrlKey || e.metaKey || (e.target.closest && e.target.closest('input,textarea,select'))) return;
        if (e.key === 'ArrowRight') this.turn(this.s.page + 1);
        else if (e.key === 'ArrowLeft') this.turn(this.s.page - 1);
        else if (e.key === 'Escape') this._closeCard();
      };
      el.addEventListener('keydown', this._key);
      el.addEventListener('error', e => { const i = e.target; if (i.tagName === 'IMG' && i.dataset.fallback && i.src !== i.dataset.fallback) i.src = i.dataset.fallback; }, true);
      let sx = null;
      this.$.cradle.addEventListener('pointerdown', e => { sx = e.clientX; });
      this.$.cradle.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) this.turn(this.s.page + (dx < 0 ? 1 : -1)); });
      const f = this.$.frame;
      f.style.touchAction = 'pan-y';
      f.addEventListener('pointermove', e => { if (this.s.loupe) this._moveLoupe(e.clientX, e.clientY); });
      f.addEventListener('pointerdown', e => { if (this.s.loupe) { f.setPointerCapture(e.pointerId); this._moveLoupe(e.clientX, e.clientY); } });
      f.addEventListener('pointerleave', () => { this.$.loupe.hidden = true; });
    }

    getState() { return { v: 1, mode: this.s.mode, thread: this.thread && this.thread.id, page: this.s.page + 1, font: this.s.font, light: this.s.light, view: this.s.view }; }
    setState(st) {
      if (!st || st.v !== 1) return;
      if (st.font) this.s.font = st.font; if (st.light) this._setLight(st.light); if (st.view) this.s.view = st.view;
      const i = this.data.threads.findIndex(t => t.id === st.thread);
      if (i >= 0) this.s.thread = i;
      if (st.page) this.s.page = Math.min(Math.max(0, st.page - 1), this.pages.length - 1);
      this.setMode(st.mode || this.s.mode, null, true); this._renderAll();
    }
    destroy() {
      this._stop(); if (this._io) this._io.disconnect(); this._ro.disconnect();
      this.el.removeEventListener('click', this._click); this.el.removeEventListener('keydown', this._key);
      this.el.innerHTML = ''; this.el.classList.remove('ad', 'narrow');
      ['mode', 'view', 'light'].forEach(k => delete this.el.dataset[k]); this.el.style.removeProperty('--ad-fs');
    }
  }
  return { ArchiveDesk };
});
