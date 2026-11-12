import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { renderAntvToString } from './antv-ssr';
import { fillSlots, resolveValues } from './substitute';
import { flattenForeignText } from './svg-text';
import type { AntvDsl, CardDsl, InfographicTemplate, RenderFormat, RenderTheme, RenderVariant, ThemeTokens } from './types';
import { PACIFIC_TOKENS } from './types';

// Fonts ship with the functions via outputFileTracingIncludes in next.config.ts.
const FONT_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'fonts');
const FONT_FILES = [path.join(FONT_DIR, 'Inter_400Regular.ttf'), path.join(FONT_DIR, 'Inter_700Bold.ttf')];
let fontCache: { regular: Buffer; bold: Buffer } | null = null;
function fonts() {
  fontCache ??= {
    regular: fs.readFileSync(/*turbopackIgnore: true*/ FONT_FILES[0]),
    bold: fs.readFileSync(/*turbopackIgnore: true*/ FONT_FILES[1]),
  };
  return fontCache;
}

export interface RenderRequest {
  data?: Record<string, unknown>;
  format?: RenderFormat;
  theme?: RenderTheme;
  variant?: RenderVariant;
}

export interface RenderResult {
  body: Buffer | string;
  contentType: string;
}

function colours(tokens: ThemeTokens, theme: RenderTheme) {
  const t = { ...PACIFIC_TOKENS, ...tokens };
  return theme === 'dark'
    ? { bg: t.obsidian, fg: t.white, primary: t.lagoon }
    : { bg: t.white, fg: t.obsidian, primary: t.coral };
}

function withBackground(svg: string, bg: string): string {
  return svg.replace(/(<svg\b[^>]*>)/, `$1<rect x="-10000" y="-10000" width="20000" height="20000" fill="${bg}"/>`);
}

/** Render an antv options object (already filled) to a self-contained SVG string. */
export async function renderAntvSvg(dsl: AntvDsl, tokens: ThemeTokens, theme: RenderTheme): Promise<string> {
  const c = colours(tokens, theme);
  const raw = await renderAntvToString({
    template: dsl.template,
    data: dsl.data,
    width: dsl.width ?? 960,
    height: dsl.height ?? 540,
    padding: dsl.padding ?? 32,
    theme,
    themeConfig: { ...(dsl.themeConfig ?? {}), colorBg: c.bg, colorPrimary: c.primary },
  });
  return withBackground(flattenForeignText(raw), c.bg);
}

/** Light theme for satori cards: swap the dark background and light text tokens. */
function swapForLight<T>(node: T, tokens: ThemeTokens): T {
  const t = { ...PACIFIC_TOKENS, ...tokens };
  const json = JSON.stringify(node)
    .replaceAll(t.obsidian, '__BG__')
    .replaceAll(t.white, t.obsidian)
    .replaceAll('__BG__', t.white)
    .replaceAll('rgba(248,250,252,', 'rgba(7,9,14,');
  return JSON.parse(json) as T;
}

export async function renderCardSvg(card: CardDsl, tokens: ThemeTokens, theme: RenderTheme): Promise<string> {
  const f = fonts();
  const tree = theme === 'light' ? swapForLight(card.tree, tokens) : card.tree;
  return satori(tree as never, {
    width: card.width,
    height: card.height,
    fonts: [
      { name: 'Inter', data: f.regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: f.bold, weight: 700, style: 'normal' },
    ],
  });
}

export function svgToPng(svg: string, width = 1200): Buffer {
  const png = new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
    fitTo: { mode: 'width', value: width },
  }).render();
  return png.asPng();
}

/** Fill a stored template with caller data and render it in the requested format. */
export async function renderTemplate(tpl: InfographicTemplate, req: RenderRequest): Promise<RenderResult> {
  const theme: RenderTheme = req.theme === 'light' ? 'light' : 'dark';
  const format: RenderFormat = req.format === 'png' ? 'png' : 'svg';
  const values = resolveValues(tpl.variables, req.data);

  let svg: string;
  let width = 1200;
  if (req.variant === 'card' && tpl.card_dsl) {
    svg = await renderCardSvg(fillSlots(tpl.card_dsl, values), tpl.theme_tokens, theme);
    width = tpl.card_dsl.width;
  } else if (tpl.engine === 'satori') {
    const card = fillSlots(tpl.dsl as CardDsl, values);
    svg = await renderCardSvg(card, tpl.theme_tokens, theme);
    width = card.width;
  } else {
    svg = await renderAntvSvg(fillSlots(tpl.dsl as AntvDsl, values), tpl.theme_tokens, theme);
  }

  if (format === 'png') return { body: svgToPng(svg, width), contentType: 'image/png' };
  return { body: svg, contentType: 'image/svg+xml; charset=utf-8' };
}
