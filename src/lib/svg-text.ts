import { DOMParser } from 'linkedom';

const SVG_NS = 'http://www.w3.org/2000/svg';

function parseStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const i = part.indexOf(':');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/**
 * Break text into exactly `count` lines, as even as possible. The engine already sized the box for
 * the text, so the box height (not a width guess) says how many lines it expects.
 */
function wrap(text: string, count: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (count <= 1 || words.length <= 1) return [words.join(' ')];
  const target = text.length / count;
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && next.length > target && lines.length < count - 1) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  lines.push(cur);
  return lines;
}

/**
 * @antv/infographic lays text out as HTML inside <foreignObject>. Browsers draw that, but PNG
 * rasterisers (resvg) and many email/social previews do not. This swaps every foreignObject for
 * plain SVG <text>, keeping position, size, colour, weight and alignment, and drops the external
 * font stylesheets so the file is self-contained.
 */
export function flattenForeignText(svg: string, fontFamily = 'Inter'): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml') as unknown as Document;
  for (const fo of [...doc.querySelectorAll('foreignObject')]) {
    const span = fo.firstElementChild;
    const content = span?.textContent?.trim();
    if (!span || !content) {
      fo.remove();
      continue;
    }
    const st = parseStyle(span.getAttribute('style') || '');
    const size = parseFloat(st['font-size']) || 14;
    const lineHeight = (parseFloat(st['line-height']) || 1.4) * size;
    const w = Number(fo.getAttribute('width')) || 200;
    const h = Number(fo.getAttribute('height')) || lineHeight;
    const x = Number(fo.getAttribute('x')) || 0;
    const y = Number(fo.getAttribute('y')) || 0;
    const align = st['text-align'] || 'left';
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    const tx = anchor === 'middle' ? x + w / 2 : anchor === 'end' ? x + w : x;
    const bold = /bold|[6-9]00/.test(st['font-weight'] || '');
    const lines = wrap(content, Math.max(1, Math.round(h / lineHeight)));
    const total = lines.length * lineHeight;
    const v = st['align-items'] || 'flex-start';
    const top = y + (v === 'center' ? (h - total) / 2 : v === 'flex-end' ? h - total : 0);

    const t = doc.createElementNS(SVG_NS, 'text');
    t.setAttribute('font-size', String(size));
    t.setAttribute('font-family', fontFamily);
    t.setAttribute('fill', st.color || '#000');
    t.setAttribute('text-anchor', anchor);
    if (bold) t.setAttribute('font-weight', '700');
    lines.forEach((line, i) => {
      const ts = doc.createElementNS(SVG_NS, 'tspan');
      ts.setAttribute('x', tx.toFixed(1));
      ts.setAttribute('y', (top + lineHeight * i + size * 1.05).toFixed(1));
      ts.textContent = line;
      t.appendChild(ts);
    });
    fo.replaceWith(t);
  }
  return String(doc).replace(/<\?xml-stylesheet[^>]*\?>\s*/g, '');
}
