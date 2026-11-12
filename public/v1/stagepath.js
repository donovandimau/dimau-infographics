/*! Stagepath 1.0 · Dimau Infographics
 *  A journey of stages where every stage shows, on the picture itself, who holds it, how long it usually takes
 *  and what happens: a photo hero with a counted-up headline number, a "where the time goes" bar split by stage
 *  and coloured by holder, holder chips that filter, and a card for each stage. One column down a rail on phones.
 *
 *  const sp = new Stagepath(el, {
 *    kicker?, title?, sub?, photo?, unit?, groupLabel? ('Held by'), headline?: { value, label }, totalLabel?,
 *    barTitle? ('Where the time goes'), foot?,
 *    stages: [{ id, label, holders?: [..], amount?: number|null, amountLabel?, amountNote? ('usual <unit>'),
 *               text, kind?: 'goal'|'after', tag?, link?, linkLabel? }]
 *  }, { sequence: true, bar: true, tick: false, storageKey: null, select: false });
 *  Stages with kind 'goal' or 'after' are drawn but not counted in the total or the bar.
 *
 *  sp.on('filter' | 'select' | 'change' | 'complete' | 'open', handler) · sp.off(type, handler)
 *  sp.setFilter(name | null) · sp.getState() · sp.setState(state) · sp.destroy()
 *
 *  Theme: --di-fg --di-muted --di-line --di-surface --di-bg --di-font --di-display, one colour per holder from
 *  --di-c-<slug-of-holder-name>, otherwise the palette --sp-c1 … --sp-c6 (override on the container or above it).
 *  Strict style policies: nothing here writes a style="" attribute; per-element values are set through the CSSOM.
 *  The CSS is added once as <style id="sp-style">, and not at all if an element with that id is already on the
 *  page, so an app can serve v1/stagepath.css itself as <link id="sp-style" rel="stylesheet" …>.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Stagepath = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = ['#d98a14', '#08736a', '#2a6fb8', '#d1503a', '#7a4fb0', '#5c6b73'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const fmt = n => (typeof n === 'number' && isFinite(n) ? (Math.abs(n) >= 10000 ? n.toLocaleString('en-GB') : String(n)) : String(n == null ? '' : n));
  const safeHref = u => (/^\s*(javascript|data|vbscript):/i.test(String(u)) ? '' : String(u));
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } } };
  const win = typeof window !== 'undefined' ? window : null;
  const still = () => !!(win && win.matchMedia && win.matchMedia('(prefers-reduced-motion:reduce)').matches);

  const STYLE = `
.sp{--sp-ink:var(--di-fg,#0d2a36);--sp-muted:var(--di-muted,#4d636b);--sp-line:var(--di-line,#d5e3e1);--sp-card:var(--di-surface,#fff);--sp-bg:var(--di-bg,#f3f8f7);
  --sp-display:var(--di-display,"Vanua Display","Manrope",system-ui,-apple-system,"Segoe UI",sans-serif);
  --sp-font:var(--di-font,"Vanua Body","Manrope",system-ui,-apple-system,"Segoe UI",sans-serif);
  --sp-p1:var(--sp-c1,#d98a14);--sp-p2:var(--sp-c2,#08736a);--sp-p3:var(--sp-c3,#2a6fb8);--sp-p4:var(--sp-c4,#d1503a);
  display:block;font-family:var(--sp-font);color:var(--sp-ink);background:var(--sp-bg);border-radius:26px;overflow:hidden;
  box-shadow:0 18px 50px rgba(13,42,54,.14);border:1px solid var(--sp-line);text-align:left}
.sp *{box-sizing:border-box}

/* hero: photo, flat colour, or none */
.sp-hero{position:relative;min-height:250px;display:flex;align-items:flex-end;color:#fff;background:var(--sp-hero,#0d2a36) center/cover no-repeat}
.sp-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(6,30,40,.9) 0%,rgba(6,30,40,.68) 42%,rgba(6,30,40,.08) 78%)}
.sp-hero-in{position:relative;z-index:1;padding:30px 34px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:end;width:100%}
.sp-kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;opacity:.85;margin:0 0 8px;color:inherit}
.sp-title{font-family:var(--sp-display);font-size:40px;line-height:1.05;font-weight:800;margin:0 0 10px;letter-spacing:-.02em;color:inherit}
.sp-sub{margin:0;font-size:16px;line-height:1.5;max-width:46ch;opacity:.94;color:inherit}
.sp-total{background:rgba(255,255,255,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.35);border-radius:20px;padding:16px 22px;text-align:center;min-width:190px;max-width:340px}
.sp-total b{display:block;font-family:var(--sp-display);font-size:58px;line-height:1;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.sp-total span{display:block;font-size:13px;line-height:1.35;margin-top:6px;font-weight:600}
.sp-hero.sp-flat{min-height:0;background:var(--sp-hero,#0d2a36);
  background:radial-gradient(circle at 88% 0%,color-mix(in srgb,var(--sp-p2) 62%,transparent),transparent 58%),radial-gradient(circle at 0% 130%,color-mix(in srgb,var(--sp-p3) 48%,transparent),transparent 55%),var(--sp-hero,#0d2a36)}
.sp-hero.sp-flat::after{inset:auto 0 0 0;height:6px;background:linear-gradient(90deg,var(--sp-p1) 0 25%,var(--sp-p2) 25% 50%,var(--sp-p3) 50% 75%,var(--sp-p4) 75%)}
.sp-hero.sp-flat .sp-hero-in{padding:28px 34px 32px;align-items:center}
.sp-hero.sp-solo .sp-hero-in{grid-template-columns:1fr;justify-items:end}
.sp-nohero::before{content:"";display:block;height:6px;background:linear-gradient(90deg,var(--sp-p1) 0 25%,var(--sp-p2) 25% 50%,var(--sp-p3) 50% 75%,var(--sp-p4) 75%)}
.sp-lead{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin:0 0 22px}
.sp-lead b{font-family:var(--sp-display);font-size:46px;line-height:1;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:var(--sp-ink)}
.sp-lead span{font-size:14.5px;line-height:1.35;font-weight:700;color:var(--sp-muted)}

.sp-body{padding:26px 30px 30px}
.sp-h{font-family:var(--sp-display);font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:var(--sp-muted);margin:0 0 12px}

/* where the time goes */
.sp-time{display:flex;height:58px;border-radius:16px;overflow:hidden;gap:3px;background:var(--sp-bg)}
.sp-seg{position:relative;border:0;border-radius:0;margin:0;padding:0 10px;color:#fff;background:var(--c);font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;justify-content:center;min-width:24px;transition:filter .2s,opacity .2s,transform .2s}
.sp-seg b{font-size:18px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums}
.sp-seg span{font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.95;margin-top:3px}
.sp-seg:hover,.sp-seg:focus-visible{filter:brightness(1.12);outline:0}
.sp-seg:focus-visible{box-shadow:inset 0 0 0 3px #fff}
.sp-time+.sp-stages{margin-top:26px}
.sp-legend{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 26px}
.sp-chip{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--sp-line);background:var(--sp-card);color:var(--sp-ink);border-radius:999px;margin:0;padding:7px 14px 7px 9px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
.sp-chip i{width:14px;height:14px;border-radius:50%;background:var(--c);flex:none}
.sp-chip em{font-style:normal;font-weight:600;color:var(--sp-muted);font-variant-numeric:tabular-nums}
.sp-chip[aria-pressed=true]{background:var(--c);border-color:var(--c);color:#fff}
.sp-chip[aria-pressed=true] i{background:#fff}.sp-chip[aria-pressed=true] em{color:#fff}
.sp-chip:focus-visible{outline:3px solid var(--c);outline-offset:2px}

/* the stages */
.sp-stages{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px 22px}
.sp-stage{position:relative;margin:0;background:var(--sp-card);border-radius:20px;border:1px solid var(--sp-line);padding:0 0 16px;display:flex;flex-direction:column;min-width:0;transition:opacity .25s,transform .25s,box-shadow .25s;box-shadow:0 4px 14px rgba(13,42,54,.06)}
.sp-seq .sp-stage::before{content:"";position:absolute;right:-17px;top:38px;width:12px;height:12px;border-top:3px solid var(--c);border-right:3px solid var(--c);transform:rotate(45deg);opacity:.9}
.sp-seq .sp-stage:nth-child(4n)::before,.sp-seq .sp-stage:last-child::before{display:none}
.sp-top{background:var(--c);color:#fff;border-radius:19px 19px 0 0;padding:14px 16px;display:flex;align-items:center;gap:12px;min-height:76px}
.sp-top>div{flex:1;min-width:0}
.sp-n{font-family:var(--sp-display);font-size:34px;font-weight:800;line-height:1;opacity:.95;font-variant-numeric:tabular-nums}
.sp-name{font-family:var(--sp-display);font-size:17.5px;line-height:1.2;font-weight:800;margin:0;color:inherit;overflow-wrap:anywhere}
.sp-meta{padding:14px 16px 0;display:flex;flex-direction:column;gap:10px;flex:1}
.sp-who{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--sp-muted)}
.sp-who span{display:inline-flex;align-items:center;gap:6px;background:var(--sp-bg);background:color-mix(in srgb,var(--h) 14%,var(--sp-card));color:var(--sp-ink);color:color-mix(in srgb,var(--h) 78%,var(--sp-ink));border-radius:999px;padding:4px 10px;font-size:12.5px;letter-spacing:0;text-transform:none}
.sp-who span::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--h);flex:none}
.sp-days{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}
.sp-days b{font-family:var(--sp-display);font-size:30px;line-height:1;font-weight:800;color:var(--c);font-variant-numeric:tabular-nums}
.sp-days span{font-size:13px;font-weight:700;color:var(--sp-muted)}
.sp-bar{height:8px;border-radius:99px;background:var(--sp-line);background:color-mix(in srgb,var(--c) 14%,var(--sp-card));overflow:hidden}
.sp-bar i{display:block;height:100%;border-radius:99px;background:var(--c);width:0;transition:width .9s cubic-bezier(.2,.7,.2,1)}
.sp-go .sp-bar i{width:var(--w,0%)}
.sp-does{margin:0;font-size:14.5px;line-height:1.5;color:var(--sp-ink)}
.sp-link{align-self:flex-start;margin-top:auto;font-size:13.5px;font-weight:800;color:var(--c);text-decoration:none;border-bottom:2px solid currentColor;padding-bottom:1px}
.sp-link:hover{opacity:.8}
.sp-link:focus-visible{outline:3px solid var(--c);outline-offset:3px;border-radius:4px}
.sp-stage.sp-goal .sp-top{background:var(--c);background:linear-gradient(120deg,var(--c),color-mix(in srgb,var(--c) 60%,#000))}
.sp-stage.sp-after{border-style:dashed;border-width:2px;border-color:var(--c);background:var(--sp-card);background:color-mix(in srgb,var(--c) 5%,var(--sp-card))}
.sp-stage.sp-after .sp-top{border-radius:17px 17px 0 0}
.sp-tag{align-self:flex-start;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;background:rgba(255,255,255,.22);border-radius:999px;padding:3px 9px;margin-top:4px;display:inline-block}
.sp.sp-filter .sp-stage:not(.sp-on),.sp.sp-filter .sp-seg:not(.sp-on){opacity:.22}
.sp-stage.sp-flash{transform:translateY(-4px);box-shadow:0 14px 34px rgba(13,42,54,.25);box-shadow:0 14px 34px color-mix(in srgb,var(--c) 38%,transparent)}
.sp-foot{margin:22px 0 0;font-size:13.5px;line-height:1.5;color:var(--sp-muted)}

/* tick: a real checkbox in each header */
.sp-check{flex:none;display:grid;place-items:center;width:44px;height:44px;margin:-6px -8px -6px 0;cursor:pointer}
.sp-check input{-webkit-appearance:none;appearance:none;width:28px;height:28px;margin:0;border-radius:9px;border:2px solid rgba(255,255,255,.9);background:rgba(255,255,255,.16);cursor:pointer;display:grid;place-items:center;transition:background .2s,border-color .2s}
.sp-check input:checked::after{content:"";width:7px;height:13px;border:solid #fff;border-width:0 3px 3px 0;transform:translateY(-2px) rotate(45deg)}
.sp-check input:focus-visible{outline:3px solid #fff;outline-offset:2px}
.sp-stage.sp-done .sp-top{background:var(--sp-bg);background:color-mix(in srgb,var(--c) 15%,var(--sp-card));color:var(--sp-ink);color:color-mix(in srgb,var(--c) 80%,var(--sp-ink))}
.sp-stage.sp-done .sp-check input{background:var(--c);border-color:var(--c)}
.sp-stage.sp-done .sp-check input:focus-visible{outline-color:var(--c)}
.sp-stage.sp-done .sp-tag{background:var(--sp-card)}
.sp-stage.sp-done .sp-days,.sp-stage.sp-done .sp-bar,.sp-stage.sp-done .sp-who{opacity:.55}
.sp-stage.sp-done .sp-does{color:var(--sp-muted)}
.sp-stage.sp-done{box-shadow:none}

/* select: each card is a button */
.sp-select .sp-stage{cursor:pointer}
.sp-select .sp-stage:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(13,42,54,.12)}
.sp-select .sp-stage:focus-visible{outline:3px solid var(--c);outline-offset:3px}
.sp-pick{flex:none;width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.9);background:rgba(255,255,255,.16);display:grid;place-items:center;transition:background .2s}
.sp-select .sp-stage[aria-pressed=true]{transform:translateY(-2px);box-shadow:0 0 0 3px var(--c),0 14px 34px rgba(13,42,54,.2);box-shadow:0 0 0 3px var(--c),0 14px 34px color-mix(in srgb,var(--c) 34%,transparent)}
.sp-select .sp-stage[aria-pressed=true] .sp-pick{background:#fff}
.sp-select .sp-stage[aria-pressed=true] .sp-pick::after{content:"";width:6px;height:11px;border:solid var(--c);border-width:0 3px 3px 0;transform:translateY(-1.5px) rotate(45deg)}

/* fewer than four cards share the full width */
.sp-k1 .sp-stages{grid-template-columns:minmax(0,1fr)}.sp-k2 .sp-stages{grid-template-columns:repeat(2,minmax(0,1fr))}.sp-k3 .sp-stages{grid-template-columns:repeat(3,minmax(0,1fr))}
/* medium: two across (the script sets sp-m and sp-s from the width it is given, so it also fits a narrow column on a wide screen) */
.sp-m .sp-stages{grid-template-columns:repeat(2,minmax(0,1fr))}
.sp-m.sp-seq .sp-stage:nth-child(4n)::before{display:block}
.sp-m.sp-seq .sp-stage:nth-child(2n)::before,.sp-m.sp-seq .sp-stage:last-child::before{display:none}
/* small: one column with a coloured rail down the side */
.sp.sp-s{border-radius:20px}
.sp-s .sp-hero{min-height:0}.sp-s .sp-hero::after{background:linear-gradient(180deg,rgba(6,30,40,.5),rgba(6,30,40,.9))}
.sp-s .sp-hero.sp-flat::after{background:linear-gradient(90deg,var(--sp-p1) 0 25%,var(--sp-p2) 25% 50%,var(--sp-p3) 50% 75%,var(--sp-p4) 75%)}
.sp-s .sp-hero-in,.sp-s .sp-hero.sp-flat .sp-hero-in{grid-template-columns:1fr;padding:22px 18px;gap:16px;justify-items:stretch}
.sp-s .sp-hero.sp-flat .sp-hero-in{padding-bottom:26px}
.sp-s .sp-title{font-size:30px}.sp-s .sp-sub{font-size:15px}
.sp-s .sp-total{display:flex;align-items:center;gap:14px;text-align:left;padding:12px 16px;max-width:none}.sp-s .sp-total b{font-size:44px}.sp-s .sp-total span{margin:0}
.sp-s .sp-lead b{font-size:38px}
.sp-s .sp-body{padding:20px 14px 22px}
.sp-s .sp-time{height:44px;gap:2px}.sp-s .sp-seg{padding:0 4px;align-items:center;min-width:20px}.sp-s .sp-seg b{font-size:14px}.sp-s .sp-seg span{display:none}
.sp-s .sp-stages{grid-template-columns:minmax(0,1fr);gap:14px}
.sp-s.sp-seq .sp-stages{padding-left:26px;position:relative}
.sp-s.sp-seq .sp-stages::before{content:"";position:absolute;left:9px;top:10px;bottom:10px;width:4px;border-radius:4px;background:linear-gradient(var(--sp-p1),var(--sp-p2),var(--sp-p3),var(--sp-p4))}
.sp-s.sp-seq .sp-stage::before,.sp-s.sp-seq .sp-stage:nth-child(n)::before,.sp-s.sp-seq .sp-stage:last-child::before{display:block;left:-25px;right:auto;top:28px;width:16px;height:16px;border:4px solid var(--sp-card);border-radius:50%;background:var(--c);transform:none;opacity:1;box-shadow:0 0 0 2px var(--c)}
.sp-s .sp-top{min-height:0;padding:12px 14px}.sp-s .sp-n{font-size:28px}.sp-s .sp-name{font-size:17px}
@media (prefers-reduced-motion:reduce){.sp-bar i,.sp-stage,.sp-seg,.sp-chip,.sp-check input,.sp-pick{transition:none}.sp-select .sp-stage:hover,.sp-select .sp-stage[aria-pressed=true],.sp-stage.sp-flash{transform:none}}
`;

  function ensureStyle() {
    if (typeof document === 'undefined' || document.getElementById('sp-style')) return;
    const s = document.createElement('style'); s.id = 'sp-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  class Stagepath {
    constructor(el, data, options) {
      if (!el) throw new Error('Stagepath: there is no element to draw in');
      ensureStyle();
      this.el = el;
      this.data = data || {};
      this.o = Object.assign({ sequence: true, bar: true, tick: false, storageKey: null, select: false }, options);
      this._h = {};
      this._timers = [];
      this.filter = null;
      this.selected = null;
      this.done = [];
      this.stages = (this.data.stages || []).map((s, i) => ({
        id: s.id != null ? String(s.id) : 's' + (i + 1),
        label: s.label != null ? String(s.label) : 'Step ' + (i + 1),
        holders: (Array.isArray(s.holders) ? s.holders : s.holders ? [s.holders] : []).filter(h => h != null && h !== '').map(String),
        amount: typeof s.amount === 'number' && isFinite(s.amount) ? Math.max(0, s.amount) : null,
        amountLabel: s.amountLabel, amountNote: s.amountNote,
        text: s.text != null ? s.text : s.does,
        kind: s.kind === 'goal' || s.kind === 'after' ? s.kind : '',
        tag: s.tag, link: s.link ? safeHref(s.link) : '', linkLabel: s.linkLabel,
        raw: s
      }));
      const holders = [];
      this.stages.forEach(s => s.holders.forEach(h => { if (holders.indexOf(h) < 0) holders.push(h); }));
      this.holders = holders;
      this._render();
      if (this.o.storageKey) { const saved = store.get(this.o.storageKey); if (saved) this.setState(saved, true); }
      this._watch();
    }

    /* ---------- events ---------- */
    on(type, fn) { (this._h[type] = this._h[type] || []).push(fn); return this; }
    off(type, fn) { this._h[type] = (this._h[type] || []).filter(f => f !== fn); return this; }
    _emit(type, payload) { (this._h[type] || []).slice().forEach(fn => { try { fn(payload); } catch (e) { if (typeof console !== 'undefined') console.error(e); } }); }

    /* ---------- colours ---------- */
    _palette(i) { return 'var(--sp-c' + ((i % 6) + 1) + ',' + PALETTE[i % 6] + ')'; }
    _holderColour(name) { const k = slug(name), p = this._palette(Math.max(0, this.holders.indexOf(name))); return k ? 'var(--di-c-' + k + ',' + p + ')' : p; }
    _stageColour(s, i) { return s.holders.length ? this._holderColour(s.holders[0]) : this._palette(this.holders.length ? 5 : i); }

    /* ---------- the headline number ---------- */
    _headline() {
      const d = this.data, n = this.stages.length;
      if (this.o.tick) return { value: this.done.length, label: 'of ' + n + ' done', live: true };
      if (d.headline && d.headline.value != null) return { value: d.headline.value, label: d.headline.label || '' };
      if (this._counted.length) return { value: this._total, label: d.totalLabel || d.unit || '' };
      return { value: n, label: d.totalLabel || (n === 1 ? 'step' : 'steps') };
    }
    _paintHeadline(animate) {
      const h = this._headline(), num = this.$num;
      if (!num) return;
      if (this.$numLabel) this.$numLabel.textContent = h.label;
      if (win) { win.cancelAnimationFrame(this._raf); clearTimeout(this._fin); }
      const to = h.value, finish = () => { num.textContent = fmt(to); };
      if (!animate || typeof to !== 'number' || !isFinite(to) || still() || !win || !win.requestAnimationFrame) return finish();
      let t0 = null;
      const step = t => {
        if (this._dead) return;
        if (t0 == null) t0 = t;
        const p = Math.min(1, (t - t0) / 900);
        if (p >= 1) return finish();
        num.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
        this._raf = win.requestAnimationFrame(step);
      };
      this._raf = win.requestAnimationFrame(step);
      this._fin = setTimeout(finish, 1400); // frames can be paused (background tab): the number still lands
    }

    /* ---------- drawing ---------- */
    _render() {
      const d = this.data, o = this.o, el = this.el, st = this.stages;
      const unit = d.unit ? String(d.unit) : '';
      const group = d.groupLabel || 'Held by';
      const hasHolders = this.holders.length > 0;
      const counted = this._counted = st.filter(s => !s.kind && s.amount != null);
      this._total = counted.reduce((t, s) => t + s.amount, 0);
      const scaleBy = counted.length ? counted : st.filter(s => s.amount != null);
      const max = Math.max.apply(null, scaleBy.map(s => s.amount).concat(0)); // small bars compare the counted steps; a longer later stage simply fills its bar
      const showBar = o.bar !== false && counted.length > 0 && this._total > 0;
      const byHolder = {};
      counted.forEach(s => { if (s.holders.length) byHolder[s.holders[0]] = (byHolder[s.holders[0]] || 0) + s.amount; });
      const note = s => (s.amountNote != null ? String(s.amountNote) : unit ? 'usual ' + unit : '');
      const said = s => (s.amountNote != null ? fmt(s.amount) + ' ' + s.amountNote : unit ? 'usual ' + fmt(s.amount) + ' ' + unit : fmt(s.amount));
      const heldBy = s => (s.holders.length ? ', ' + group.toLowerCase() + ' ' + s.holders.join(' and ') : '');

      const hasWords = !!(d.kicker || d.title || d.sub);
      const hero = !!(d.photo || hasWords);
      const total = '<b class="sp-num">0</b><span class="sp-num-label"></span>';
      let h = '';
      if (hero) {
        h += '<div class="sp-hero' + (d.photo ? ' sp-photo' : ' sp-flat') + (hasWords ? '' : ' sp-solo') + '"><div class="sp-hero-in">' +
          (hasWords ? '<div>' + (d.kicker ? '<p class="sp-kicker">' + esc(d.kicker) + '</p>' : '') +
            (d.title ? '<h3 class="sp-title">' + esc(d.title) + '</h3>' : '') +
            (d.sub ? '<p class="sp-sub">' + esc(d.sub) + '</p>' : '') + '</div>' : '') +
          '<div class="sp-total"' + (o.tick ? ' role="status"' : '') + '>' + total + '</div></div></div>';
      }
      h += '<div class="sp-body">';
      if (!hero) h += '<p class="sp-lead"' + (o.tick ? ' role="status"' : '') + '>' + total + '</p>';
      if (showBar) {
        h += '<p class="sp-h">' + esc(d.barTitle || 'Where the time goes') + '</p>' +
          '<div class="sp-time" role="group" aria-label="' + esc((d.barTitle || 'Where the time goes') + ': press a part to go to that step') + '">';
        counted.forEach(s => {
          h += '<button type="button" class="sp-seg" data-go="' + esc(s.id) + '" data-h="' + esc(s.holders[0] || '') + '" aria-label="' + esc(s.label + ': ' + said(s) + heldBy(s)) + '">' +
            '<b>' + esc(fmt(s.amount)) + '</b><span>' + esc(s.label) + '</span></button>';
        });
        h += '</div>';
      }
      if (hasHolders) {
        h += '<div class="sp-legend" role="group" aria-label="' + esc(group + ': show one') + '">';
        this.holders.forEach(name => {
          h += '<button type="button" class="sp-chip" aria-pressed="false" data-holder="' + esc(name) + '"><i></i>' + esc(name) +
            (byHolder[name] ? ' <em>' + esc(fmt(byHolder[name]) + (unit ? ' ' + unit : '')) + '</em>' : '') + '</button>';
        });
        h += '</div>';
      }
      const list = o.select ? 'div' : o.sequence ? 'ol' : 'ul', item = o.select ? 'div' : 'li';
      h += '<' + list + ' class="sp-stages"' + (o.select ? ' role="group" aria-label="' + esc(d.title || 'Choose one') + '"' : '') + '>';
      st.forEach((s, i) => {
        h += '<' + item + ' class="sp-stage' + (s.kind ? ' sp-' + s.kind : '') + '" data-id="' + esc(s.id) + '"' +
          (o.select ? ' role="button" tabindex="0" aria-pressed="false"' : '') + '>' +
          '<div class="sp-top">' + (o.sequence ? '<span class="sp-n">' + (i + 1) + '</span>' : '') +
          '<div><h4 class="sp-name">' + esc(s.label) + '</h4>' + (s.tag ? '<span class="sp-tag">' + esc(s.tag) + '</span>' : '') + '</div>' +
          (o.tick ? '<label class="sp-check"><input type="checkbox" aria-label="' + esc('Done: ' + s.label) + '"></label>' : '') +
          (o.select && !o.tick ? '<span class="sp-pick" aria-hidden="true"></span>' : '') + '</div>' +
          '<div class="sp-meta">' +
          (s.holders.length ? '<div class="sp-who">' + esc(group) + ' ' + s.holders.map(n => '<span data-holder="' + esc(n) + '">' + esc(n) + '</span>').join('') + '</div>' : '') +
          (s.amount != null ? '<div class="sp-days"><b>' + esc(fmt(s.amount)) + '</b>' + (note(s) ? '<span>' + esc(note(s)) + '</span>' : '') + '</div>' +
            '<div class="sp-bar" aria-hidden="true"><i></i></div>'
            : s.amountLabel ? '<div class="sp-days"><b>' + esc(s.amountLabel) + '</b></div>' : '') +
          (s.text ? '<p class="sp-does">' + esc(s.text) + '</p>' : '') +
          (s.link ? '<a class="sp-link" href="' + esc(s.link) + '">' + esc(s.linkLabel || 'Open') + '</a>' : '') +
          '</div></' + item + '>';
      });
      h += '</' + list + '>' + (d.foot ? '<p class="sp-foot">' + esc(d.foot) + '</p>' : '') + '</div>';

      el.classList.add('sp');
      el.classList.toggle('sp-seq', !!o.sequence);
      el.classList.toggle('sp-tick', !!o.tick);
      el.classList.toggle('sp-select', !!o.select);
      el.classList.toggle('sp-nohero', !hero);
      if (st.length > 0 && st.length < 4) el.classList.add('sp-k' + st.length);
      el.innerHTML = h;

      // per-element values go in through the CSSOM, never as style="" text, so a strict style policy allows them
      if (d.photo) el.querySelector('.sp-hero').style.setProperty('background-image', 'url("' + String(d.photo).replace(/["\\\n\r]/g, encodeURIComponent) + '")');
      this.$num = el.querySelector('.sp-num');
      this.$numLabel = el.querySelector('.sp-num-label');
      this.$cards = Array.prototype.slice.call(el.querySelectorAll('.sp-stage'));
      this.$cards.forEach((card, i) => {
        const s = st[i];
        card.style.setProperty('--c', this._stageColour(s, i));
        const bar = card.querySelector('.sp-bar i');
        if (bar) bar.style.setProperty('--w', (max > 0 ? Math.min(100, Math.round(100 * s.amount / max)) : 0) + '%');
        card.querySelectorAll('.sp-who span').forEach(b => b.style.setProperty('--h', this._holderColour(b.getAttribute('data-holder'))));
      });
      el.querySelectorAll('.sp-seg').forEach((seg, i) => {
        const s = counted[i];
        seg.style.setProperty('--c', this._stageColour(s, st.indexOf(s)));
        seg.style.setProperty('flex', s.amount + ' 1 0px');
      });
      el.querySelectorAll('.sp-chip').forEach(chip => chip.style.setProperty('--c', this._holderColour(chip.getAttribute('data-holder'))));
      this._paintHeadline(false);
      if (!this._ran) { const h0 = this._headline(); if (typeof h0.value === 'number' && !o.tick) this.$num.textContent = '0'; }

      this._onClick = e => {
        const t = e.target;
        if (!t || !t.closest) return;
        const chip = t.closest('.sp-chip'), seg = t.closest('.sp-seg'), card = t.closest('.sp-stage');
        if (chip && el.contains(chip)) return this.setFilter(this.filter === chip.getAttribute('data-holder') ? null : chip.getAttribute('data-holder'));
        if (seg && el.contains(seg)) return this._open(seg.getAttribute('data-go'));
        if (card && el.contains(card) && o.select && !t.closest('a,.sp-check')) this._select(card.getAttribute('data-id'));
      };
      this._onKey = e => {
        if (!o.select || (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar')) return;
        const t = e.target;
        if (!t || !t.classList || !t.classList.contains('sp-stage')) return; // a link or checkbox inside keeps its own keys
        e.preventDefault();
        this._select(t.getAttribute('data-id'));
      };
      this._onChange = e => {
        const t = e.target, card = t && t.closest && t.closest('.sp-stage');
        if (!card || !t.matches('.sp-check input')) return;
        const id = card.getAttribute('data-id'), was = this.done.indexOf(id);
        if (t.checked && was < 0) this.done.push(id);
        if (!t.checked && was >= 0) this.done.splice(was, 1);
        this._paintDone();
        this._save();
        this._emit('change', { done: this.done.slice() });
        if (this.stages.length && this.done.length === this.stages.length) this._emit('complete', { done: this.done.slice() });
      };
      el.addEventListener('click', this._onClick);
      el.addEventListener('keydown', this._onKey);
      el.addEventListener('change', this._onChange);
    }

    _card(id) { for (let i = 0; i < this.$cards.length; i++) if (this.$cards[i].getAttribute('data-id') === String(id)) return this.$cards[i]; return null; }
    _stage(id) { for (let i = 0; i < this.stages.length; i++) if (this.stages[i].id === String(id)) return this.stages[i]; return null; }

    _open(id) {
      const card = this._card(id), s = this._stage(id);
      if (!card || !s) return;
      if (card.scrollIntoView) { try { card.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }); } catch (e) { card.scrollIntoView(); } }
      card.classList.add('sp-flash');
      this._timers.push(setTimeout(() => card.classList.remove('sp-flash'), 1400));
      this._emit('open', { id: s.id, stage: s.raw });
    }

    _select(id, quiet) {
      const s = id == null ? null : this._stage(id);
      this.selected = s ? s.id : null;
      this.$cards.forEach(c => { if (this.o.select) c.setAttribute('aria-pressed', String(!!s && c.getAttribute('data-id') === s.id)); });
      if (s && !quiet) { this._save(); this._emit('select', { id: s.id, stage: s.raw }); }
    }

    _paintDone() {
      this.$cards.forEach(c => {
        const on = this.done.indexOf(c.getAttribute('data-id')) >= 0, box = c.querySelector('.sp-check input');
        c.classList.toggle('sp-done', on && !!this.o.tick);
        if (box) box.checked = on;
      });
      if (this.o.tick) this._paintHeadline(false);
    }

    _save() { if (this.o.storageKey) store.set(this.o.storageKey, this.getState()); }

    /* ---------- first sight: the small bars grow and the headline counts up ---------- */
    _watch() {
      const el = this.el;
      const size = () => { // layout follows the width the picture is given, not the screen
        const w = el.clientWidth || (win ? win.innerWidth : 1200);
        el.classList.toggle('sp-m', w <= 900);
        el.classList.toggle('sp-s', w <= 620);
      };
      const run = () => {
        if (this._ran || this._dead) return;
        this._ran = true;
        if (this._io) { this._io.disconnect(); this._io = null; }
        el.classList.add('sp-go');
        this._paintHeadline(true);
      };
      const sized = () => { const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null; return !!r && r.width > 0 && r.height > 0; };
      size();
      if (!win) return run();
      // run when it is first seen; if that signal never comes (shown later inside a tab or <details>), run shortly after it has a size
      const later = () => { if (!this._ran && !this._soon) this._soon = setTimeout(run, 700); };
      if ('IntersectionObserver' in win) {
        this._io = new win.IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) run(); }, { threshold: 0.15 });
        this._io.observe(el);
      } else run();
      if ('ResizeObserver' in win) {
        this._ro = new win.ResizeObserver(() => { size(); if (sized()) later(); });
        this._ro.observe(el);
      } else {
        this._onResize = size;
        win.addEventListener('resize', size);
      }
      if (sized()) later();
      else if (!('ResizeObserver' in win)) this._soon = setTimeout(run, 700);
    }

    /* ---------- public ---------- */
    setFilter(name, quiet) {
      name = name != null && this.holders.indexOf(String(name)) >= 0 ? String(name) : null;
      const changed = name !== this.filter, el = this.el;
      this.filter = name;
      el.classList.toggle('sp-filter', !!name);
      el.querySelectorAll('.sp-chip').forEach(c => c.setAttribute('aria-pressed', String(c.getAttribute('data-holder') === name)));
      this.$cards.forEach((c, i) => c.classList.toggle('sp-on', !!name && this.stages[i].holders.indexOf(name) >= 0));
      el.querySelectorAll('.sp-seg').forEach(s => s.classList.toggle('sp-on', !!name && s.getAttribute('data-h') === name));
      if (changed && !quiet) { this._save(); this._emit('filter', { holder: name }); }
      return this;
    }

    getState() { return { v: 1, filter: this.filter, done: this.done.slice(), selected: this.selected }; }

    setState(s, quiet) {
      if (!s || typeof s !== 'object') return this;
      if ('filter' in s) this.setFilter(s.filter, true);
      if (Array.isArray(s.done)) { this.done = s.done.map(String).filter((id, i, a) => this._stage(id) && a.indexOf(id) === i); this._paintDone(); }
      if ('selected' in s) this._select(s.selected, true);
      if (!quiet) this._save();
      return this;
    }

    destroy() {
      this._dead = true;
      const el = this.el;
      if (this._io) this._io.disconnect();
      if (this._ro) this._ro.disconnect();
      if (this._onResize && win) win.removeEventListener('resize', this._onResize);
      if (win) win.cancelAnimationFrame(this._raf);
      clearTimeout(this._fin); clearTimeout(this._soon);
      this._timers.forEach(clearTimeout);
      el.removeEventListener('click', this._onClick);
      el.removeEventListener('keydown', this._onKey);
      el.removeEventListener('change', this._onChange);
      el.innerHTML = '';
      ['sp', 'sp-seq', 'sp-tick', 'sp-select', 'sp-nohero', 'sp-filter', 'sp-go', 'sp-m', 'sp-s', 'sp-k1', 'sp-k2', 'sp-k3'].forEach(c => el.classList.remove(c));
      this._h = {};
    }
  }

  Stagepath.css = STYLE; // the same rules as v1/stagepath.css, for apps that serve their own stylesheet
  return Stagepath;
});
