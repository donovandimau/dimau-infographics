'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { fillSlots } from '@/lib/substitute';
import { PACIFIC_TOKENS, type AntvDsl, type RenderTheme, type ThemeTokens } from '@/lib/types';

export interface InfographicRendererHandle {
  /** The live SVG markup as drawn in the browser. */
  getSvg(): string | null;
  /** PNG data URL straight from the browser engine (fallback when the server export is unavailable). */
  toPng(): Promise<string | null>;
}

interface Props {
  dsl: AntvDsl;
  /** Values for {{slots}}; missing ones render blank. */
  values?: Record<string, string>;
  theme?: RenderTheme;
  tokens?: ThemeTokens;
  className?: string;
  onError?: (message: string | null) => void;
}

type Engine = { render(o: unknown): void; destroy(): void; toDataURL(o?: unknown): Promise<string> };

/**
 * Live @antv/infographic canvas. Fills {{variable}} slots from `values`, applies the Pacific palette
 * for the chosen theme, and re-renders on every change (cheap enough for typing in the studio).
 */
export const InfographicRenderer = forwardRef<InfographicRendererHandle, Props>(function InfographicRenderer(
  { dsl, values = {}, theme = 'dark', tokens = PACIFIC_TOKENS, className, onError },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    getSvg: () => host.current?.querySelector('svg')?.outerHTML ?? null,
    toPng: async () => (engine.current ? engine.current.toDataURL({ type: 'png' }).catch(() => null) : null),
  }));

  useEffect(() => {
    let alive = true;
    Promise.all([
      import('@antv/infographic'),
      // Measure text with the same font it is drawn in, or labels overlap.
      document.fonts?.load('400 16px Inter').catch(() => undefined),
      document.fonts?.load('700 16px Inter').catch(() => undefined),
    ]).then(([{ Infographic }]) => {
      if (!alive || !host.current) return;
      engine.current = new Infographic({ container: host.current, width: '100%', height: '100%' }) as unknown as Engine;
      setReady(true);
    });
    return () => {
      alive = false;
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !engine.current) return;
    const t = { ...PACIFIC_TOKENS, ...tokens };
    const filled = fillSlots(dsl, values);
    try {
      engine.current.render({
        template: filled.template,
        data: filled.data,
        padding: filled.padding ?? 32,
        theme,
        themeConfig: {
          ...(filled.themeConfig ?? {}),
          base: { text: { 'font-family': 'Inter' } },
          colorBg: theme === 'dark' ? t.obsidian : t.white,
          colorPrimary: theme === 'dark' ? t.lagoon : t.coral,
        },
      });
      onError?.(null);
    } catch (e) {
      onError?.((e as Error).message);
    }
  }, [ready, dsl, values, theme, tokens, onError]);

  return (
    <div
      ref={host}
      className={className}
      style={{ background: theme === 'dark' ? (tokens.obsidian ?? PACIFIC_TOKENS.obsidian) : (tokens.white ?? PACIFIC_TOKENS.white) }}
    />
  );
});
