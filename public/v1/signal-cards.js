/*! Signal Cards 1.0 · Dimau Infographics
 *  Data-slot infographics: every value is a named variable with a default, so a card renders with no data
 *  at all and an app swaps in its own numbers. Each card is an interactive SVG (tap or hover any part for
 *  detail) that also exports as a PNG or SVG image, in three shapes: wide, tall (picked automatically for
 *  narrow screens) and a 1200x630 share card.
 *
 *  Templates in this file (each is its own global and catalog entry):
 *    SettlementFlow   rbf-sandbox-settlement-flow   multi-stage settlement sequence + KPI grid
 *    CommunityPulse   sota-kece-community-pulse     radial hub-and-spoke community pulse
 *    BackhaulMap      pacific-backhaul-node-map     uplink → island node matrix + network metrics
 *    DebtTrajectory   debt-freedom-trajectory       before/after payoff timeline + "sooner" gauge
 *
 *  const card = new SettlementFlow(el, { corridor_name: 'UK → Suva', … }, { theme:'dark', variant:'main' });
 *  card.set({ fee_reduction_pct: '80%' }) · card.setTheme('light') · card.setVariant('card')
 *  card.toSVG(opts) → string · card.toPNG({ scale }) → Promise<Blob> · card.download('png' | 'svg')
 *  card.on('select' | 'render' | 'change', fn) · card.destroy() · SettlementFlow.variables
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { root.SettlementFlow = m.SettlementFlow; root.CommunityPulse = m.CommunityPulse; root.BackhaulMap = m.BackhaulMap; root.DebtTrajectory = m.DebtTrajectory; root.DimauSignalCards = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- palette: obsidian / coral / lagoon / gold, light theme flipped ---------- */
  const PAL = {
    dark: { bg: '#07090E', panel: '#10141D', panel2: '#151B27', line: '#232B3A', fg: '#F8FAFC', muted: '#8E99AB', coral: '#FF5A36', lagoon: '#00E5FF', gold: '#F5B041', ok: '#3DDC97', warn: '#F5B041', bad: '#FF5A36' },
    light: { bg: '#F8FAFC', panel: '#FFFFFF', panel2: '#EEF2F7', line: '#D6DDE7', fg: '#07090E', muted: '#556072', coral: '#D8401C', lagoon: '#007C91', gold: '#9A6508', ok: '#14804F', warn: '#9A6508', bad: '#D8401C' }
  };
  const FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const DIMS = { wide: [1200, 675], tall: [720, 1240], card: [1200, 630] };
  const TAU = Math.PI * 2;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
  const f1 = n => Math.round(n * 10) / 10;

  /* ---------- text helpers (SVG has no wrapping, so wrap by estimated width) ---------- */
  const CW = 0.55; // average glyph width / font size for the sans stack
  function wrap(text, width, size, maxLines) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = [];
    const max = Math.max(4, Math.floor(width / (size * CW)));
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (t.length <= max) line = t;
      else { if (line) lines.push(line); line = w.length > max ? w.slice(0, max - 1) + '…' : w; }
    }
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/.?$/, '…'); }
    return lines;
  }
  function fit(text, width, maxSize, minSize, maxLines) {
    for (let s = maxSize; s >= minSize; s -= 2) { const l = wrap(text, width, s); if (l.length <= maxLines && !l.some(x => x.endsWith('…'))) return { size: s, lines: l }; }
    return { size: minSize, lines: wrap(text, width, minSize, maxLines) };
  }
  function text(x, y, lines, a) {
    a = a || {};
    const size = a.size || 16, lh = a.lh || 1.18;
    const attrs = 'x="' + f1(x) + '" y="' + f1(y) + '" font-size="' + size + '" font-weight="' + (a.weight || 400) + '" fill="' + (a.fill || 'currentColor') + '"' +
      (a.anchor ? ' text-anchor="' + a.anchor + '"' : '') + (a.ls ? ' letter-spacing="' + a.ls + '"' : '') + (a.base ? ' dominant-baseline="' + a.base + '"' : '') + (a.op ? ' opacity="' + a.op + '"' : '');
    if (!Array.isArray(lines)) return '<text ' + attrs + '>' + esc(lines) + '</text>';
    return '<text ' + attrs + '>' + lines.map((l, i) => '<tspan x="' + f1(x) + '" dy="' + (i ? f1(size * lh) : 0) + '">' + esc(l) + '</tspan>').join('') + '</text>';
  }
  const rect = (x, y, w, h, r, a) => '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="' + r + '" ' + (a || '') + '/>';
  const circle = (x, y, r, a) => '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" ' + (a || '') + '/>';
  function arc(cx, cy, r, a0, a1) {
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + f1(cx + r * Math.cos(a0)) + ' ' + f1(cy + r * Math.sin(a0)) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + f1(cx + r * Math.cos(a1)) + ' ' + f1(cy + r * Math.sin(a1));
  }
  /** An interactive group: hover / tap / keyboard focus shows `tip`, click emits 'select'. */
  const hot = (id, label, tip, inner) => '<g class="sc-hot" tabindex="0" role="button" data-id="' + esc(id) + '" data-tip="' + esc(tip) + '" aria-label="' + esc(label + '. ' + tip) + '">' + inner + '</g>';

  const STYLE = `
.sc{position:relative;width:100%;font-family:${FONT}}
.sc-stage svg{display:block;width:100%;height:auto;border-radius:16px}
.sc-hot{cursor:pointer;outline:none}
.sc-hot:focus-visible>*:first-child{stroke:currentColor;stroke-width:2.5}
.sc-hot:hover{filter:brightness(1.12)}
.sc-tip{position:absolute;z-index:5;max-width:260px;padding:9px 12px;border-radius:10px;font:500 13px/1.4 ${FONT};pointer-events:none;box-shadow:0 10px 28px rgba(0,0,0,.3)}
.sc-tip b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin-bottom:2px}
@keyframes sc-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.sc-anim .sc-in{animation:sc-rise .55s cubic-bezier(.2,.7,.2,1) both}
@media (prefers-reduced-motion:reduce){.sc-anim .sc-in{animation:none}}
`;
  function injectStyle() {
    if (document.getElementById('sc-style')) return;
    const s = document.createElement('style'); s.id = 'sc-style'; s.textContent = STYLE; document.head.appendChild(s);
  }
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- shared pieces ---------- */
  function pill(x, y, label, color, P, size) {
    size = size || 15;
    const w = label.length * size * 0.6 + 28;
    return rect(x, y, w, size + 16, (size + 16) / 2, 'fill="none" stroke="' + color + '" stroke-width="1.5"') +
      text(x + 14, y + (size + 16) / 2 + 1, label.toUpperCase(), { size: size - 2, weight: 700, fill: color, ls: '0.08em', base: 'middle' });
  }
  function header(x, y, w, eyebrow, title, P, mode) {
    const big = mode === 'tall' ? 50 : 54, t = fit(title, w, big, 30, mode === 'tall' ? 4 : 2);
    return '<g class="sc-in">' + (eyebrow ? pill(x, y, eyebrow, P.gold, P) : '') +
      text(x, y + 72 + t.size * 0.35, t.lines, { size: t.size, weight: 800, fill: P.fg, lh: 1.08 }) + '</g>' +
      { h: 72 + t.size * 0.35 + (t.lines.length - 1) * t.size * 1.08 + 18 }.h * 0; // height returned separately below
  }
  function headerHeight(w, title, mode) {
    const t = fit(title, w, mode === 'tall' ? 50 : 54, 30, mode === 'tall' ? 4 : 2);
    return 72 + t.size * 0.35 + (t.lines.length - 1) * t.size * 1.08 + 30;
  }
  function kpiTile(id, x, y, w, h, label, value, color, P, tip, delay) {
    const v = fit(value, w - 40, Math.min(38, h * 0.3), 16, 2);
    const inner = rect(x, y, w, h, 18, 'fill="' + P.panel + '" stroke="' + P.line + '"') +
      rect(x, y + h - 5, w, 5, 2.5, 'fill="' + color + '"') +
      text(x + 20, y + 32, label.toUpperCase(), { size: 13, weight: 700, fill: P.muted, ls: '0.08em' }) +
      text(x + 20, y + 40 + v.size, v.lines, { size: v.size, weight: 800, fill: color, lh: 1.05 });
    return '<g class="sc-in" style="animation-delay:' + (delay || 0) + 'ms">' + hot(id, label, tip || value, inner) + '</g>';
  }
  function kpiGrid(x, y, w, h, cols, items, P) {
    const gap = 16, rows = Math.ceil(items.length / cols);
    const tw = (w - gap * (cols - 1)) / cols, th = (h - gap * (rows - 1)) / rows;
    return items.map((it, i) => kpiTile(it.id, x + (i % cols) * (tw + gap), y + Math.floor(i / cols) * (th + gap), tw, th, it.label, it.value, it.color, P, it.tip, 120 + i * 70)).join('');
  }
  const credit = (W, H, P) => text(W - 28, H - 20, 'Dimau Infographics', { size: 12, weight: 600, fill: P.muted, anchor: 'end', ls: '0.04em', op: 0.8 });

  /* ---------- base class ---------- */
  class SignalCard {
    constructor(el, data, opts) {
      injectStyle();
      this.el = el;
      this.o = Object.assign({ theme: 'dark', variant: 'main', layout: 'auto', animate: true }, opts || {});
      this._ev = {};
      this.data = Object.assign({}, data || {});
      this.vars = this._merge(this.data);
      el.classList.add('sc');
      el.innerHTML = '<div class="sc-stage"></div><div class="sc-tip" role="tooltip" hidden></div>';
      this.$stage = el.firstChild; this.$tip = el.lastChild;
      this._bind();
      this._ro = new ResizeObserver(() => { if (this._mode && this._mode !== this.mode()) this.render(); });
      this._ro.observe(el);
      this.render();
    }
    static get variables() { return this.VARS.map(v => Object.assign({}, v)); }
    on(t, fn) { (this._ev[t] = this._ev[t] || []).push(fn); return this; }
    off(t, fn) { this._ev[t] = (this._ev[t] || []).filter(f => f !== fn); return this; }
    _emit(t, p) { (this._ev[t] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); }
    _merge(d) {
      const out = {};
      for (const v of this.constructor.VARS) out[v.name] = d[v.name] != null && String(d[v.name]).trim() !== '' ? String(d[v.name]) : v.default;
      return out;
    }
    set(vars) { Object.assign(this.data, vars || {}); this.vars = this._merge(this.data); this.render(); this._emit('change', { vars: Object.assign({}, this.vars) }); }
    setTheme(t) { this.o.theme = t === 'light' ? 'light' : 'dark'; this.render(); }
    setVariant(v) { this.o.variant = v === 'card' ? 'card' : 'main'; this.render(); }
    mode() {
      if (this.o.variant === 'card') return 'card';
      if (this.o.layout === 'wide' || this.o.layout === 'tall') return this.o.layout;
      return (this.el.clientWidth || 1200) < 640 ? 'tall' : 'wide';
    }
    /** Builds the full SVG string. Used for the live view and for exports. */
    build(o) {
      o = Object.assign({ theme: this.o.theme, mode: this.mode(), animate: false }, o || {});
      const P = PAL[o.theme] || PAL.dark, [W, H] = DIMS[o.mode], meta = this.constructor.META;
      const body = o.mode === 'card' ? this._card(W, H, P) : this._main(W, H, P, o.mode, o.animate);
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="' + esc(FONT) + '" role="img" aria-label="' + esc(meta.title) + '"' + (o.animate ? ' class="sc-anim"' : '') + ' style="color:' + P.fg + '">' +
        rect(0, 0, W, H, 0, 'fill="' + P.bg + '"') + body + credit(W, H, P) + '</svg>';
    }
    render() {
      this._mode = this.mode();
      this.$stage.innerHTML = this.build({ mode: this._mode, animate: this.o.animate && !reduced() });
      const P = PAL[this.o.theme] || PAL.dark;
      this.$tip.style.background = P.fg; this.$tip.style.color = P.bg;
      this._emit('render', { mode: this._mode, theme: this.o.theme });
    }
    toSVG(o) { return this.build(Object.assign({ mode: this.o.variant === 'card' ? 'card' : (this.o.layout === 'tall' ? 'tall' : 'wide') }, o || {})); }
    toPNG(o) {
      o = o || {};
      const svg = this.toSVG(o), scale = o.scale || 2;
      const [W, H] = DIMS[o.mode || (this.o.variant === 'card' ? 'card' : (this.o.layout === 'tall' ? 'tall' : 'wide'))];
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(b => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
        };
        img.onerror = () => reject(new Error('PNG export failed'));
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
    }
    download(format, o) {
      const name = (this.constructor.META.slug || 'infographic') + (this.o.variant === 'card' ? '-card' : '') + '.' + (format === 'svg' ? 'svg' : 'png');
      const go = blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      if (format === 'svg') { go(new Blob([this.toSVG(o)], { type: 'image/svg+xml' })); return Promise.resolve(); }
      return this.toPNG(o).then(go);
    }
    _bind() {
      const stage = this.$stage, tip = this.$tip;
      const show = g => {
        if (!g) { tip.hidden = true; return; }
        const r = g.getBoundingClientRect(), host = this.el.getBoundingClientRect();
        tip.innerHTML = '<b>' + esc(g.getAttribute('aria-label').split('. ')[0]) + '</b>' + esc(g.dataset.tip);
        tip.hidden = false;
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let x = r.left - host.left + r.width / 2 - tw / 2, y = r.top - host.top - th - 8;
        if (y < 0) y = r.bottom - host.top + 8;
        tip.style.left = clamp(x, 4, host.width - tw - 4) + 'px'; tip.style.top = y + 'px';
      };
      this._h = {
        over: e => show(e.target.closest('.sc-hot')),
        leave: () => show(null),
        focus: e => show(e.target.closest('.sc-hot')),
        click: e => { const g = e.target.closest('.sc-hot'); if (!g) return; show(g); this._emit('select', { id: g.dataset.id, detail: g.dataset.tip }); },
        key: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.sc-hot')) { e.preventDefault(); this._h.click(e); } }
      };
      stage.addEventListener('pointerover', this._h.over);
      stage.addEventListener('pointerleave', this._h.leave);
      stage.addEventListener('focusin', this._h.focus);
      stage.addEventListener('focusout', this._h.leave);
      stage.addEventListener('click', this._h.click);
      stage.addEventListener('keydown', this._h.key);
    }
    /** Share card: title and three key numbers on the left, the template's mini visual on the right. */
    _card(W, H, P) {
      const s = this._cardSpec(P), pad = 64, lw = 560;
      const t = fit(s.title, lw, 50, 30, 3);
      let out = pill(pad, pad, s.eyebrow, P.gold, P) + text(pad, pad + 76 + t.size * 0.3, t.lines, { size: t.size, weight: 800, fill: P.fg, lh: 1.08 });
      let y = pad + 76 + t.size * 0.3 + (t.lines.length - 1) * t.size * 1.08 + 46;
      const room = H - 60 - y, each = room / s.stats.length;
      s.stats.forEach((st, i) => {
        const yy = y + i * each, vs = Math.min(40, each * 0.5);
        out += rect(pad, yy + 4, 4, each - 18, 2, 'fill="' + st.color + '"') +
          text(pad + 20, yy + 18, st.label.toUpperCase(), { size: 13, weight: 700, fill: P.muted, ls: '0.08em' }) +
          text(pad + 20, yy + 22 + vs, fit(st.value, lw - 20, vs, 18, 1).lines[0], { size: fit(st.value, lw - 20, vs, 18, 1).size, weight: 800, fill: st.color });
      });
      out += rect(660, 40, W - 700, H - 80, 28, 'fill="' + P.panel + '" stroke="' + P.line + '"');
      out += s.mini(680, 60, W - 740, H - 120);
      return out;
    }
  }

  /* ======================================================================================
   * 1. RBF sandbox settlement flow — multi-stage sequence + KPI grid
   * ====================================================================================== */
  class SettlementFlow extends SignalCard {
    _stages(P) {
      const v = this.vars, corridor = v.corridor_name;
      const parts = corridor.split(/→|->|\bto\b/i), origin = (parts[0] || '').trim(), dest = parts[1] ? parts[1].trim().split(/\s+/)[0] : '';
      return [
        { id: 'stage-1', label: v.stage_1_label, sub: origin ? 'From ' + origin : 'Sender', tip: 'Funds enter the corridor' + (origin ? ' from ' + origin : '') + '.', color: P.coral },
        { id: 'stage-2', label: v.stage_2_label, sub: v.kyc_pass_rate, tip: 'Identity and anti-money-laundering checks: ' + v.kyc_pass_rate + '.', color: P.lagoon },
        { id: 'stage-3', label: v.stage_3_label, sub: v.fee_reduction_pct + ' lower fees', tip: 'Conversion and ledger entry. Fees are ' + v.fee_reduction_pct + ' lower.', color: P.lagoon },
        { id: 'stage-4', label: v.stage_4_label, sub: v.reserve_backing_fjd, tip: 'Payout is matched against the reserve: ' + v.reserve_backing_fjd + '.', color: P.gold },
        { id: 'stage-5', label: v.stage_5_label, sub: (dest ? 'In ' + dest + ', ' : '') + v.settlement_speed_sec, tip: 'Funds settle' + (dest ? ' in ' + dest : '') + ' in ' + v.settlement_speed_sec + '.', color: P.ok }
      ];
    }
    _flow(x, y, w, h, P, vertical, animate) {
      const st = this._stages(P), n = st.length, pts = [];
      for (let i = 0; i < n; i++) {
        if (vertical) pts.push([x + 46, y + h * (i + 0.5) / n]);
        else pts.push([x + w * (i + 0.5) / n, y + h * 0.45 + (i % 2 ? -1 : 1) * h * 0.1]);
      }
      let d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (let i = 1; i < n; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        d += vertical ? ' L' + x1 + ' ' + y1 : ' C' + f1((x0 + x1) / 2) + ' ' + y0 + ' ' + f1((x0 + x1) / 2) + ' ' + y1 + ' ' + x1 + ' ' + y1;
      }
      let out = '<path d="' + d + '" fill="none" stroke="' + P.line + '" stroke-width="10" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + P.lagoon + '" stroke-width="2.5" stroke-dasharray="2 12" stroke-linecap="round" opacity=".9"/>';
      if (animate) out += circle(0, 0, 8, 'fill="' + P.lagoon + '"').replace('/>', '><animateMotion dur="3.2s" repeatCount="indefinite" path="' + d + '"/></circle>');
      st.forEach((s, i) => {
        const [cx, cy] = pts[i], r = vertical ? 30 : 34;
        let lab;
        if (vertical) {
          const lw = w - 110;
          lab = text(cx + 54, cy - 4, wrap(s.label, lw, 22, 2), { size: 22, weight: 700, fill: P.fg }) + text(cx + 54, cy + 24, wrap(s.sub, lw, 16, 1), { size: 16, weight: 600, fill: s.color });
        } else {
          const lw = w / n - 16, below = i % 2 === 0, ly = below ? cy + r + 30 : cy - r - 50;
          lab = text(cx, ly, wrap(s.label, lw, 19, 2), { size: 19, weight: 700, fill: P.fg, anchor: 'middle' }) + text(cx, ly + (wrap(s.label, lw, 19, 2).length) * 22 + 2, wrap(s.sub, lw, 15, 1), { size: 15, weight: 600, fill: s.color, anchor: 'middle' });
        }
        out += '<g class="sc-in" style="animation-delay:' + (i * 90) + 'ms">' + hot(s.id, s.label, s.tip,
          circle(cx, cy, r, 'fill="' + P.panel + '" stroke="' + s.color + '" stroke-width="3"') +
          text(cx, cy + 1, String(i + 1), { size: 22, weight: 800, fill: s.color, anchor: 'middle', base: 'middle' }) + lab) + '</g>';
      });
      return out;
    }
    _kpis(P) {
      const v = this.vars;
      return [
        { id: 'kpi-speed', label: 'Settlement speed', value: v.settlement_speed_sec, color: P.lagoon, tip: 'Time from sender funding to payout.' },
        { id: 'kpi-fees', label: 'Fee reduction', value: v.fee_reduction_pct, color: P.coral, tip: 'Lower cost than the comparison route.' },
        { id: 'kpi-kyc', label: 'KYC pass rate', value: v.kyc_pass_rate, color: P.lagoon, tip: 'Share of customers cleared by automated checks.' },
        { id: 'kpi-reserve', label: 'Reserve backing', value: v.reserve_backing_fjd, color: P.gold, tip: 'Funds held aside to cover payouts.' }
      ];
    }
    _main(W, H, P, mode, animate) {
      const pad = mode === 'tall' ? 48 : 56, v = this.vars, hh = headerHeight(W - pad * 2, v.corridor_name, mode);
      let out = header(pad, pad, W - pad * 2, v.sandbox_phase, v.corridor_name, P, mode);
      if (mode === 'tall') {
        const fy = pad + hh, fh = 560;
        out += this._flow(pad, fy, W - pad * 2, fh, P, true, animate);
        out += kpiGrid(pad, fy + fh + 24, W - pad * 2, H - (fy + fh + 24) - 56, 2, this._kpis(P), P);
      } else {
        const gh = 150, fy = pad + hh + 34, fh = H - fy - gh - 64;
        out += this._flow(pad, fy, W - pad * 2, fh, P, false, animate);
        out += kpiGrid(pad, H - gh - 48, W - pad * 2, gh, 4, this._kpis(P), P);
      }
      return out;
    }
    _cardSpec(P) {
      const v = this.vars;
      return {
        eyebrow: v.sandbox_phase, title: v.corridor_name,
        stats: [{ label: 'Settlement speed', value: v.settlement_speed_sec, color: P.lagoon }, { label: 'Fee reduction', value: v.fee_reduction_pct, color: P.coral }, { label: 'Reserve backing', value: v.reserve_backing_fjd, color: P.gold }],
        mini: (x, y, w, h) => this._flow(x, y + 10, w, h - 20, P, true, false)
      };
    }
  }
  SettlementFlow.META = { slug: 'rbf-sandbox-settlement-flow', title: 'Sandbox settlement flow' };
  SettlementFlow.VARS = [
    { name: 'corridor_name', default: 'UK → Suva Instant Remittance & Settlement', description: 'Corridor or product name (headline)' },
    { name: 'settlement_speed_sec', default: '2.4s', description: 'Time to settle' },
    { name: 'fee_reduction_pct', default: '78%', description: 'Fee reduction versus the comparison route' },
    { name: 'kyc_pass_rate', default: '99.4% Automated AML/KYC', description: 'Automated compliance pass rate' },
    { name: 'reserve_backing_fjd', default: 'FJD 1.25M Ring-Fenced', description: 'Reserve held against payouts (example value)' },
    { name: 'sandbox_phase', default: 'Phase 2: Live Cohort Testing', description: 'Sandbox stage (pill)' },
    { name: 'stage_1_label', default: 'Sender funds', description: 'Stage 1 name' },
    { name: 'stage_2_label', default: 'Compliance check', description: 'Stage 2 name' },
    { name: 'stage_3_label', default: 'FX and ledger', description: 'Stage 3 name' },
    { name: 'stage_4_label', default: 'Reserve match', description: 'Stage 4 name' },
    { name: 'stage_5_label', default: 'Payout', description: 'Stage 5 name' }
  ];

  /* ======================================================================================
   * 2. Sota Kece community pulse — radial hub and spokes
   * ====================================================================================== */
  class CommunityPulse extends SignalCard {
    _sats(P) {
      const v = this.vars;
      return [
        { id: 'creators', label: 'Active creators', value: v.active_creators, color: P.lagoon, tip: v.active_creators + ' creators posted recently in ' + v.province_hub + '.' },
        { id: 'vibe', label: 'Daily vibe score', value: v.daily_vibe_score, color: P.ok, tip: 'Share of today’s reactions that were positive: ' + v.daily_vibe_score + '.' },
        { id: 'tag', label: 'Top cultural tag', value: v.top_cultural_tag, color: P.gold, tip: 'Most used tag today: ' + v.top_cultural_tag + '.' },
        { id: 'tips', label: 'Sevu tips', value: v.sevu_tips_volume_fjd, color: P.coral, tip: 'Tips sent to creators: ' + v.sevu_tips_volume_fjd + '.' }
      ];
    }
    _hub(cx, cy, R, P, animate, ex, ey) {
      const v = this.vars, hr = R * 0.44;
      let out = '';
      // orbit rings with drifting creator dots
      [0.72, 1].forEach((k, ri) => {
        const rr = R * k;
        out += '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy) + '" rx="' + f1(rr * ex) + '" ry="' + f1(rr * ey) + '" fill="none" stroke="' + P.line + '" stroke-width="1.5" stroke-dasharray="3 7"/>';
        let dots = '';
        const nd = ri ? 22 : 14;
        for (let i = 0; i < nd; i++) {
          const a = (i / nd) * TAU + ri * 0.4;
          dots += circle(cx + Math.cos(a) * rr * ex, cy + Math.sin(a) * rr * ey, i % 5 === 0 ? 4.5 : 2.6, 'fill="' + (i % 5 === 0 ? P.lagoon : P.muted) + '" opacity="' + (i % 5 === 0 ? 0.95 : 0.55) + '"');
        }
        out += animate && ex === ey ? '<g>' + dots + '<animateTransform attributeName="transform" type="rotate" from="0 ' + f1(cx) + ' ' + f1(cy) + '" to="' + (ri ? -360 : 360) + ' ' + f1(cx) + ' ' + f1(cy) + '" dur="' + (ri ? 90 : 60) + 's" repeatCount="indefinite"/></g>' : dots;
      });
      // vibe ring
      const vibe = num(v.daily_vibe_score), frac = isFinite(vibe) && vibe >= 0 && vibe <= 100 ? vibe / 100 : null;
      const ring = '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(hr + 14) + '" fill="none" stroke="' + P.line + '" stroke-width="8"/>' +
        (frac != null ? '<path d="' + arc(cx, cy, hr + 14, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(frac, 0.9999)) + '" fill="none" stroke="' + P.ok + '" stroke-width="8" stroke-linecap="round"/>' : '');
      const t = fit(v.province_hub, hr * 1.5, 26, 13, 3);
      const ty = cy + 12 - ((t.lines.length - 1) * t.size * 1.1) / 2;
      out += '<g class="sc-in">' + hot('hub', 'Hub', v.province_hub + (frac != null ? ' · vibe ' + v.daily_vibe_score : ''),
        ring + '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(hr) + '" fill="url(#sc-hubg)"/>' +
        text(cx, cy - hr * 0.56, 'PROVINCE HUB', { size: 12, weight: 700, fill: '#FFFFFF', anchor: 'middle', ls: '0.1em', op: 0.85 }) +
        text(cx, ty, t.lines, { size: t.size, weight: 800, fill: '#FFFFFF', anchor: 'middle', lh: 1.1 })) + '</g>';
      return out;
    }
    _defs(P) {
      return '<defs><radialGradient id="sc-hubg" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="' + P.coral + '"/><stop offset="1" stop-color="' + (P === PAL.dark ? '#7A1D0B' : '#9E2A0E') + '"/></radialGradient></defs>';
    }
    _main(W, H, P, mode, animate) {
      const pad = mode === 'tall' ? 48 : 56, v = this.vars;
      const title = 'Community pulse';
      const hh = headerHeight(W - pad * 2, title, mode);
      let out = this._defs(P) + header(pad, pad, W - pad * 2, 'Sota Kece · ' + v.province_hub, title, P, mode);
      const sats = this._sats(P);
      const by = pad + hh - 10, bh = H - by - 56, cx = W / 2, cy = by + bh / 2;
      const R = Math.min(W * 0.32, bh * 0.42);
      out += this._hub(cx, cy, R, P, animate, 1, 1);
      const sw = mode === 'tall' ? (W - pad * 2 - 20) / 2 : 250, sh = 104;
      const spots = mode === 'tall'
        ? [[pad, by], [W - pad - sw, by], [pad, by + bh - sh], [W - pad - sw, by + bh - sh]]
        : [[pad, cy - R * 0.9 - sh / 2], [W - pad - sw, cy - R * 0.9 - sh / 2], [pad, cy + R * 0.9 - sh / 2], [W - pad - sw, cy + R * 0.9 - sh / 2]];
      sats.forEach((s, i) => {
        const [sx, sy] = spots[i], ax = sx + (i % 2 ? 0 : sw), ay = sy + sh / 2;
        const hr = R * 0.44 + 22, ang = Math.atan2(ay - cy, ax - cx);
        out += '<line x1="' + f1(cx + Math.cos(ang) * hr) + '" y1="' + f1(cy + Math.sin(ang) * hr) + '" x2="' + f1(ax) + '" y2="' + f1(ay) + '" stroke="' + s.color + '" stroke-width="2" opacity=".7"/>' +
          circle(ax, ay, 5, 'fill="' + s.color + '"');
        const vf = fit(s.value, sw - 36, 34, 16, 1);
        out += '<g class="sc-in" style="animation-delay:' + (150 + i * 80) + 'ms">' + hot(s.id, s.label, s.tip,
          rect(sx, sy, sw, sh, 18, 'fill="' + P.panel + '" stroke="' + P.line + '"') +
          text(sx + 18, sy + 30, s.label.toUpperCase(), { size: 12.5, weight: 700, fill: P.muted, ls: '0.08em' }) +
          text(sx + 18, sy + 40 + vf.size, vf.lines[0], { size: vf.size, weight: 800, fill: s.color })) + '</g>';
      });
      return out;
    }
    _cardSpec(P) {
      const v = this.vars;
      return {
        eyebrow: 'Sota Kece pulse', title: v.province_hub,
        stats: [{ label: 'Active creators', value: v.active_creators, color: P.lagoon }, { label: 'Daily vibe', value: v.daily_vibe_score, color: P.ok }, { label: 'Sevu tips', value: v.sevu_tips_volume_fjd, color: P.coral }],
        mini: (x, y, w, h) => this._defs(P) + this._hub(x + w / 2, y + h / 2 - 10, Math.min(w, h) * 0.42, P, false, 1, 1) +
          text(x + w / 2, y + h - 6, v.top_cultural_tag, { size: 22, weight: 800, fill: P.gold, anchor: 'middle' })
      };
    }
  }
  CommunityPulse.META = { slug: 'sota-kece-community-pulse', title: 'Community pulse' };
  CommunityPulse.VARS = [
    { name: 'province_hub', default: 'Rewa / Suva Central', description: 'Province or hub at the centre' },
    { name: 'active_creators', default: '14,820', description: 'Active creators' },
    { name: 'daily_vibe_score', default: '94% Positive', description: 'Positive share today (a percentage draws the ring)' },
    { name: 'top_cultural_tag', default: '#VitiLevuCreators', description: 'Most used tag' },
    { name: 'sevu_tips_volume_fjd', default: 'FJD $42,900', description: 'Tips sent through Sevu' }
  ];

  /* ======================================================================================
   * 3. Pacific backhaul node map — uplink → island node matrix + metrics
   * ====================================================================================== */
  class BackhaulMap extends SignalCard {
    _nodes() {
      if (Array.isArray(this.data.nodes) && this.data.nodes.length) {
        return this.data.nodes.slice(0, 60).map((n, i) => ({ name: n.name || 'Node ' + String(i + 1).padStart(2, '0'), status: ['up', 'degraded', 'down'].includes(n.status) ? n.status : 'up' }));
      }
      const n = clamp(Math.round(num(this.vars.active_island_nodes)) || 18, 1, 60);
      return Array.from({ length: n }, (_, i) => ({ name: 'Node ' + String(i + 1).padStart(2, '0'), status: 'up' }));
    }
    _matrix(x, y, w, h, P, animate) {
      const nodes = this._nodes(), n = nodes.length, colour = s => (s === 'up' ? P.lagoon : s === 'degraded' ? P.warn : P.bad);
      const cols = Math.max(1, Math.round(Math.sqrt(n * (w / h)))), rows = Math.ceil(n / cols);
      const cw = w / cols, rh = h / rows, r = clamp(Math.min(cw, rh) * 0.24, 6, 18);
      let out = '';
      nodes.forEach((nd, i) => {
        const cx = x + cw * ((i % cols) + 0.5), cy = y + rh * (Math.floor(i / cols) + 0.4), c = colour(nd.status);
        const pulse = animate && nd.status === 'up' ? '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="none" stroke="' + c + '" stroke-width="2"><animate attributeName="r" from="' + f1(r) + '" to="' + f1(r * 2.1) + '" dur="2.4s" begin="' + (i % 8) * 0.3 + 's" repeatCount="indefinite"/><animate attributeName="opacity" from=".7" to="0" dur="2.4s" begin="' + (i % 8) * 0.3 + 's" repeatCount="indefinite"/></circle>' : '';
        out += hot('node-' + i, nd.name, nd.name + ' · ' + (nd.status === 'up' ? 'online' : nd.status === 'degraded' ? 'degraded' : 'offline'),
          circle(cx, cy, r + 6, 'fill="' + P.bg + '" fill-opacity="0" stroke="none"') + pulse + circle(cx, cy, r, 'fill="' + c + '"') +
          (rh > 46 ? text(cx, cy + r + 16, nd.name.replace('Node ', 'N'), { size: 11, weight: 600, fill: P.muted, anchor: 'middle' }) : ''));
      });
      return { svg: out, up: nodes.filter(nn => nn.status === 'up').length, n };
    }
    _uplink(cx, cy, P, targetX, targetY0, targetY1) {
      let fan = '';
      for (let i = 0; i < 6; i++) {
        const ty = targetY0 + (targetY1 - targetY0) * (i / 5);
        fan += '<path d="M' + f1(cx) + ' ' + f1(cy) + ' C' + f1((cx + targetX) / 2) + ' ' + f1(cy) + ' ' + f1((cx + targetX) / 2) + ' ' + f1(ty) + ' ' + f1(targetX) + ' ' + f1(ty) + '" fill="none" stroke="' + P.lagoon + '" stroke-width="1.5" opacity=".35"/>';
      }
      const v = this.vars, t = wrap(v.primary_uplink, 210, 16, 3);
      return fan + '<g class="sc-in">' + hot('uplink', 'Primary uplink', v.primary_uplink,
        circle(cx, cy, 46, 'fill="' + P.panel + '" stroke="' + P.gold + '" stroke-width="3"') +
        '<path d="' + arc(cx - 6, cy + 6, 9, -Math.PI / 2, 0) + ' M' + f1(cx - 6) + ' ' + f1(cy + 6) + ' ' + arc(cx - 6, cy + 6, 18, -Math.PI / 2, 0) + ' M' + f1(cx - 6) + ' ' + f1(cy + 6) + ' ' + arc(cx - 6, cy + 6, 27, -Math.PI / 2, 0) + '" stroke="' + P.gold + '" stroke-width="3" fill="none" stroke-linecap="round"/>' + circle(cx - 6, cy + 6, 4.5, 'fill="' + P.gold + '"') +
        text(cx, cy + 74, t, { size: 16, weight: 700, fill: P.fg, anchor: 'middle', lh: 1.15 })) + '</g>';
    }
    _metrics(x, y, w, h, P, up, n) {
      const v = this.vars, lat = num(v.avg_latency_ms), auto = num(v.grid_autonomy_pct);
      const rows = [
        { id: 'latency', label: 'Average latency', value: v.avg_latency_ms, color: P.lagoon, frac: isFinite(lat) ? clamp(lat / 200, 0.02, 1) : null, scale: '0–200 ms scale', tip: 'Average round-trip time: ' + v.avg_latency_ms + '.' },
        { id: 'esim', label: 'eSIM sessions', value: v.esim_active_sessions, color: P.gold, frac: null, tip: v.esim_active_sessions + '.' },
        { id: 'autonomy', label: 'Grid autonomy', value: v.grid_autonomy_pct, color: P.ok, frac: isFinite(auto) ? clamp(auto / 100, 0, 1) : null, scale: 'of nodes on own power', tip: v.grid_autonomy_pct + '.' },
        { id: 'online', label: 'Nodes online', value: up + ' of ' + n, color: P.lagoon, frac: n ? up / n : null, tip: up + ' of ' + n + ' island nodes reporting online.' }
      ];
      const gap = 14, rh = (h - gap * (rows.length - 1)) / rows.length;
      return rows.map((r, i) => {
        const yy = y + i * (rh + gap), vf = fit(r.value, w - 36, Math.min(30, rh * 0.36), 15, 1);
        let bar = '';
        if (r.frac != null) bar = rect(x + 18, yy + rh - 20, w - 36, 7, 3.5, 'fill="' + P.line + '"') + rect(x + 18, yy + rh - 20, Math.max(7, (w - 36) * r.frac), 7, 3.5, 'fill="' + r.color + '"');
        return '<g class="sc-in" style="animation-delay:' + (200 + i * 70) + 'ms">' + hot(r.id, r.label, r.tip,
          rect(x, yy, w, rh, 16, 'fill="' + P.panel + '" stroke="' + P.line + '"') +
          text(x + 18, yy + 26, r.label.toUpperCase(), { size: 12, weight: 700, fill: P.muted, ls: '0.08em' }) +
          (r.scale && rh > 90 ? text(x + w - 18, yy + 26, r.scale, { size: 11, weight: 500, fill: P.muted, anchor: 'end' }) : '') +
          text(x + 18, yy + 32 + vf.size, vf.lines[0], { size: vf.size, weight: 800, fill: r.color }) + bar) + '</g>';
      }).join('');
    }
    _main(W, H, P, mode, animate) {
      const pad = mode === 'tall' ? 48 : 56, v = this.vars, title = 'Pacific backhaul';
      const hh = headerHeight(W - pad * 2, title, mode);
      let out = header(pad, pad, W - pad * 2, v.active_island_nodes, title, P, mode);
      const by = pad + hh - 10;
      if (mode === 'tall') {
        const mx = pad, mw = W - pad * 2, my = by + 210, mh = 380;
        const m = this._matrix(mx, my, mw, mh, P, animate);
        out += this._uplink(W / 2, by + 60, P, W / 2, my, my).replace(/<path d="M[^"]*" fill="none" stroke="[^"]*" stroke-width="1.5" opacity=".35"\/>/g, '');
        out += '<line x1="' + W / 2 + '" y1="' + (by + 150) + '" x2="' + W / 2 + '" y2="' + (my - 6) + '" stroke="' + P.lagoon + '" stroke-width="2" stroke-dasharray="4 6"/>';
        out += m.svg + this._metrics(pad, my + mh + 20, W - pad * 2, H - (my + mh + 20) - 56, P, m.up, m.n);
      } else {
        const bh = H - by - 56, ux = pad + 90, mx = pad + 230, mw = W * 0.44, rx = mx + mw + 30, rw = W - pad - rx;
        const m = this._matrix(mx, by + 10, mw, bh - 20, P, animate);
        out += this._uplink(ux, by + bh / 2 - 30, P, mx - 6, by + 30, by + bh - 40);
        out += m.svg + this._metrics(rx, by, rw, bh, P, m.up, m.n);
      }
      return out;
    }
    _cardSpec(P) {
      const v = this.vars;
      return {
        eyebrow: 'Vanua backhaul', title: v.active_island_nodes + ' online',
        stats: [{ label: 'Primary uplink', value: v.primary_uplink, color: P.gold }, { label: 'Average latency', value: v.avg_latency_ms, color: P.lagoon }, { label: 'Grid autonomy', value: v.grid_autonomy_pct, color: P.ok }],
        mini: (x, y, w, h) => this._matrix(x + 10, y + 10, w - 20, h - 20, P, false).svg
      };
    }
  }
  BackhaulMap.META = { slug: 'pacific-backhaul-node-map', title: 'Pacific backhaul node map' };
  BackhaulMap.VARS = [
    { name: 'primary_uplink', default: 'Starlink LEO Gateway - Nasese', description: 'Main uplink' },
    { name: 'active_island_nodes', default: '18 Vanua Mesh Nodes', description: 'Node count (the first number sets how many dots are drawn, up to 60)' },
    { name: 'avg_latency_ms', default: '34ms', description: 'Average latency' },
    { name: 'esim_active_sessions', default: '3,410 Active Roaming Profiles', description: 'Active eSIM sessions' },
    { name: 'grid_autonomy_pct', default: '100% Solar + Battery Backed', description: 'Share of nodes on their own power' }
  ];

  /* ======================================================================================
   * 4. Debt freedom trajectory — before/after payoff timeline + "sooner" gauge
   * ====================================================================================== */
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function parseMonth(s) {
    s = String(s || '').toLowerCase();
    let m = s.match(/(\d{4})-(\d{1,2})/);
    if (m) return { y: +m[1], m: +m[2] - 1 };
    const yr = s.match(/(19|20)\d{2}/);
    const mi = MONTHS.findIndex(n => s.indexOf(n.slice(0, 3)) >= 0);
    if (yr && mi >= 0) return { y: +yr[0], m: mi };
    if (yr) return { y: +yr[0], m: 0 };
    return null;
  }
  const label = ym => MONTHS[((ym.m % 12) + 12) % 12].slice(0, 1).toUpperCase() + MONTHS[((ym.m % 12) + 12) % 12].slice(1, 3) + ' ' + ym.y;
  const addM = (ym, k) => { const t = ym.y * 12 + ym.m + k; return { y: Math.floor(t / 12), m: t % 12 }; };

  class DebtTrajectory extends SignalCard {
    _plan() {
      const v = this.vars, now = new Date();
      const start = parseMonth(v.start_month) || { y: now.getFullYear(), m: now.getMonth() };
      const end = parseMonth(v.debt_free_date), shaved = num(v.months_shaved);
      if (!end || !isFinite(shaved)) return { ok: false, start, shaved: isFinite(shaved) ? shaved : null };
      const plan = Math.max(1, (end.y * 12 + end.m) - (start.y * 12 + start.m)), base = plan + Math.max(0, shaved);
      return { ok: true, start, end, plan, base, baseEnd: addM(start, base), shaved, sooner: base ? Math.max(0, shaved) / base : 0 };
    }
    _timeline(x, y, w, h, P) {
      const v = this.vars, p = this._plan(), lw = Math.min(170, w * 0.3), bx = x + lw, bw = w - lw - 10;
      const base = p.ok ? p.base : 60, plan = p.ok ? p.plan : Math.max(1, 60 - (p.shaved || 0));
      const bh = Math.min(46, h * 0.17), y1 = y + h * 0.22, y2 = y + h * 0.58;
      const xs = mo => bx + (bw * mo) / base;
      let out = '';
      // year ticks
      if (p.ok) {
        for (let k = 0; k <= base; k++) {
          const ym = addM(p.start, k);
          if (ym.m === 0) out += '<line x1="' + f1(xs(k)) + '" y1="' + f1(y1 - 18) + '" x2="' + f1(xs(k)) + '" y2="' + f1(y2 + bh + 10) + '" stroke="' + P.line + '" stroke-dasharray="2 6"/>' + text(xs(k), y2 + bh + 32, String(ym.y), { size: 13, weight: 600, fill: P.muted, anchor: 'middle' });
        }
      }
      const row = (id, yy, months, color, name, endLabel, tip) => '<g class="sc-in">' + hot(id, name, tip,
        text(x, yy + bh / 2 + 1, wrap(name, lw - 16, 17, 2), { size: 17, weight: 700, fill: P.fg, base: 'middle', lh: 1.1 }) +
        rect(bx, yy, bw, bh, bh / 2, 'fill="' + P.panel2 + '"') + rect(bx, yy, Math.max(bh, xs(months) - bx), bh, bh / 2, 'fill="' + color + '"') +
        (endLabel ? text(Math.min(xs(months) - 14, bx + bw - 14), yy + bh / 2 + 1, endLabel, { size: 15, weight: 800, fill: P.bg, anchor: 'end', base: 'middle' }) : '')) + '</g>';
      out += row('before', y1, base, P.muted, 'Minimum payments', p.ok ? label(p.baseEnd) : '', p.ok ? 'Paying the minimum, debt clears around ' + label(p.baseEnd) + ' (' + base + ' months).' : 'Paying the minimum.');
      out += row('after', y2, plan, P.lagoon, 'Your plan', p.ok ? label(p.end) : v.debt_free_date, 'With ' + v.strategy_mode + ': debt-free by ' + v.debt_free_date + (p.ok ? ' (' + plan + ' months).' : '.'));
      if (p.ok && p.shaved > 0) {
        const gx0 = xs(plan), gx1 = xs(base), gy = y2 + bh / 2;
        out += '<g class="sc-in" style="animation-delay:250ms">' + hot('gap', 'Time saved', v.months_shaved,
          '<line x1="' + f1(gx0 + 8) + '" y1="' + f1(gy) + '" x2="' + f1(gx1) + '" y2="' + f1(gy) + '" stroke="' + P.coral + '" stroke-width="3" stroke-dasharray="6 6"/>' +
          circle(gx1, gy, 6, 'fill="' + P.coral + '"') + text((gx0 + gx1) / 2, gy - bh / 2 - 12, v.months_shaved, { size: 15, weight: 800, fill: P.coral, anchor: 'middle' })) + '</g>';
      }
      return out;
    }
    _gauge(cx, cy, R, P) {
      const v = this.vars, p = this._plan(), frac = p.ok ? p.sooner : null;
      let out = '<path d="' + arc(cx, cy, R, Math.PI, TAU) + '" fill="none" stroke="' + P.line + '" stroke-width="22" stroke-linecap="round"/>';
      if (frac != null) out += '<path d="' + arc(cx, cy, R, Math.PI, Math.PI + Math.PI * clamp(frac, 0.02, 1)) + '" fill="none" stroke="' + P.gold + '" stroke-width="22" stroke-linecap="round"/>';
      const iv = fit(v.interest_saved_fjd, R * 1.55, 34, 14, 1);
      out += text(cx, cy - R * 0.5, frac != null ? Math.round(frac * 100) + '% sooner' : v.months_shaved, { size: 19, weight: 800, fill: P.gold, anchor: 'middle' }) +
        text(cx, cy - 12, iv.lines[0], { size: iv.size, weight: 800, fill: P.fg, anchor: 'middle' }) +
        text(cx, cy + 22, 'INTEREST SAVED', { size: 12, weight: 700, fill: P.muted, anchor: 'middle', ls: '0.1em' });
      return '<g class="sc-in" style="animation-delay:180ms">' + hot('gauge', 'Interest saved', v.interest_saved_fjd + (frac != null ? '. Debt-free ' + Math.round(frac * 100) + '% sooner than paying the minimum.' : ''), out) + '</g>';
    }
    _main(W, H, P, mode) {
      const pad = mode === 'tall' ? 48 : 56, v = this.vars, title = 'Debt-free by ' + v.debt_free_date;
      const hh = headerHeight(W - pad * 2, title, mode);
      let out = header(pad, pad, W - pad * 2, v.strategy_mode, title, P, mode);
      const by = pad + hh - 6;
      out += text(pad, by + 4, 'Total debt ' + v.total_debt_fjd, { size: 20, weight: 600, fill: P.muted });
      if (mode === 'tall') {
        out += this._timeline(pad, by + 30, W - pad * 2, 330, P);
        out += this._gauge(W / 2, by + 30 + 330 + 230, 190, P);
        out += kpiGrid(pad, H - 56 - 150, W - pad * 2, 150, 2, [
          { id: 'k-months', label: 'Faster', value: v.months_shaved, color: P.coral },
          { id: 'k-debt', label: 'Total debt', value: v.total_debt_fjd, color: P.lagoon }], P);
      } else {
        const tw = (W - pad * 2) * 0.62;
        out += this._timeline(pad, by + 30, tw, H - by - 110, P);
        out += this._gauge(pad + tw + (W - pad * 2 - tw) / 2 + 10, by + (H - by - 56) * 0.66, Math.min(170, (W - pad * 2 - tw) / 2 - 10), P);
      }
      return out;
    }
    _cardSpec(P) {
      const v = this.vars;
      return {
        eyebrow: v.strategy_mode, title: 'Debt-free by ' + v.debt_free_date,
        stats: [{ label: 'Interest saved', value: v.interest_saved_fjd, color: P.gold }, { label: 'Time saved', value: v.months_shaved, color: P.coral }, { label: 'Total debt', value: v.total_debt_fjd, color: P.lagoon }],
        mini: (x, y, w, h) => this._timeline(x + 10, y + 20, w - 20, h - 40, P)
      };
    }
  }
  DebtTrajectory.META = { slug: 'debt-freedom-trajectory', title: 'Debt freedom trajectory' };
  DebtTrajectory.VARS = [
    { name: 'total_debt_fjd', default: 'FJD $18,500', description: 'Total debt' },
    { name: 'months_shaved', default: '19 Months Faster', description: 'Months saved versus minimum payments (the first number is used)' },
    { name: 'interest_saved_fjd', default: 'FJD $4,120 Saved', description: 'Interest saved (example value)' },
    { name: 'debt_free_date', default: 'August 2028', description: 'Debt-free month and year' },
    { name: 'strategy_mode', default: 'Avalanche High-APR Priority', description: 'Repayment strategy (pill)' },
    { name: 'start_month', default: '', description: 'Plan start month, e.g. "November 2026" (defaults to this month)' }
  ];

  return { SettlementFlow, CommunityPulse, BackhaulMap, DebtTrajectory, PALETTES: PAL };
});
