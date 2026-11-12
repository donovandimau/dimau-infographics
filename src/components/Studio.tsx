'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InfographicRenderer, type InfographicRendererHandle } from './InfographicRenderer';
import { findSlots } from '@/lib/substitute';
import { DOMAINS, PACIFIC_TOKENS, type AntvDsl, type CardDsl, type Domain, type InfographicTemplate, type TemplateVariable, type ThemeTokens } from '@/lib/types';

type Tab = 'schema' | 'variables' | 'theme';
const KEY_STORE = 'infographics-fiji-studio-key';

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

function parse<T>(text: string): { value: T | null; error: string | null } {
  try {
    return { value: JSON.parse(text) as T, error: null };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}

/** Every plain (non-slot) text value inside the data, with its path, so it can be promoted to a variable. */
function literalLeaves(value: unknown, path: (string | number)[] = [], out: { path: (string | number)[]; text: string }[] = []) {
  if (typeof value === 'string') {
    if (value.trim() && !/\{\{/.test(value)) out.push({ path, text: value });
  } else if (Array.isArray(value)) value.forEach((x, i) => literalLeaves(x, [...path, i], out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, x]) => literalLeaves(x, [...path, k], out));
  return out;
}

function setAt(root: unknown, path: (string | number)[], next: unknown) {
  const copy = structuredClone(root) as Record<string | number, unknown>;
  let cur = copy as Record<string | number, unknown>;
  for (const p of path.slice(0, -1)) cur = cur[p] as Record<string | number, unknown>;
  cur[path[path.length - 1]] = next;
  return copy;
}

const toSlotName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'value';

function reactCode(t: { slug: string; title: string; dsl: AntvDsl; variables: TemplateVariable[] }) {
  const name = t.slug.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase()).replace(/^[0-9]/, 'T$&');
  const props = t.variables.map((v) => `  /** Default: ${JSON.stringify(v.default)} */\n  ${v.name}?: string | number;`).join('\n');
  const defaults = Object.fromEntries(t.variables.map((v) => [v.name, v.default]));
  return `'use client';
// ${t.title} — exported from Infographics Fiji (${t.slug})
import { useEffect, useRef } from 'react';

const DSL = ${JSON.stringify(t.dsl, null, 2)} as const;
const DEFAULTS: Record<string, string> = ${JSON.stringify(defaults, null, 2)};

export interface ${name}Props {
${props}
  theme?: 'dark' | 'light';
  className?: string;
}

function fill(v: unknown, values: Record<string, string>): unknown {
  if (typeof v === 'string') return v.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g, (_, k) => values[k] ?? '');
  if (Array.isArray(v)) return v.map((x) => fill(x, values));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, values)]));
  return v;
}

export default function ${name}({ theme = 'dark', className, ...vars }: ${name}Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let chart: { render(o: unknown): void; destroy(): void } | undefined;
    let alive = true;
    import('@antv/infographic').then(({ Infographic }) => {
      if (!alive || !host.current) return;
      const values = { ...DEFAULTS, ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)])) };
      const d = fill(DSL, values) as typeof DSL;
      chart = new Infographic({ container: host.current, width: '100%', height: '100%' });
      chart.render({
        template: d.template, data: d.data, theme,
        themeConfig: { ...('themeConfig' in d ? d.themeConfig : {}), base: { text: { 'font-family': 'Inter, system-ui, sans-serif' } }, colorBg: theme === 'dark' ? '#07090E' : '#F8FAFC', colorPrimary: theme === 'dark' ? '#00E5FF' : '#FF5A36' },
      });
    });
    return () => { alive = false; chart?.destroy(); };
  }, [theme, JSON.stringify(vars)]);
  return <div ref={host} className={className} style={{ aspectRatio: '16 / 9' }} />;
}
`;
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function Studio({ initial, isNew }: { initial: InfographicTemplate; isNew: boolean }) {
  const router = useRouter();
  const renderer = useRef<InfographicRendererHandle>(null);

  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.title);
  const [domain, setDomain] = useState<Domain>(initial.domain);
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [mainText, setMainText] = useState(pretty(initial.dsl));
  const [cardText, setCardText] = useState(initial.card_dsl ? pretty(initial.card_dsl) : '');
  const [variables, setVariables] = useState<TemplateVariable[]>(initial.variables);
  const [tokens, setTokens] = useState<ThemeTokens>({ ...PACIFIC_TOKENS, ...initial.theme_tokens });
  const [tab, setTab] = useState<Tab>('schema');
  const [editing, setEditing] = useState<'main' | 'card'>('main');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<'main' | 'card'>('main');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [key, setKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [serverPreview, setServerPreview] = useState<string | null>(null);

  useEffect(() => setKey(localStorage.getItem(KEY_STORE) ?? ''), []);
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(id);
  }, [note]);

  const main = useMemo(() => parse<AntvDsl | CardDsl>(mainText), [mainText]);
  const card = useMemo(() => (cardText.trim() ? parse<CardDsl>(cardText) : { value: null, error: null }), [cardText]);
  const engine = main.value && 'tree' in main.value ? 'satori' : 'antv';
  const values = useMemo(() => Object.fromEntries(variables.map((v) => [v.name, v.default])), [variables]);
  const slots = useMemo(() => findSlots([main.value, card.value]), [main.value, card.value]);
  const unused = variables.filter((v) => !slots.has(v.name));
  const missing = [...slots].filter((s) => !variables.some((v) => v.name === s));
  const showCard = view === 'card' && !!card.value;
  const needsServer = showCard || engine === 'satori';

  const draft = useCallback(
    (): InfographicTemplate => ({
      slug,
      title,
      domain,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      engine,
      visual_type: initial.visual_type,
      dsl: main.value as AntvDsl,
      card_dsl: card.value,
      variables,
      theme_tokens: tokens,
      current_version: initial.current_version,
      is_public: initial.is_public,
    }),
    [slug, title, domain, tags, engine, initial, main.value, card.value, variables, tokens],
  );

  const serverRender = useCallback(
    async (format: 'svg' | 'png', variant: 'main' | 'card') => {
      const res = await fetch('/api/v1/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({ template: draft(), format, theme, variant, data: values }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Render failed (${res.status})`);
      return res.blob();
    },
    [draft, key, theme, values],
  );

  // Cards and satori templates are drawn on the server. Without a key, fall back to the saved public version.
  useEffect(() => {
    if (!needsServer || main.error || card.error) return;
    let url: string | null = null;
    const id = setTimeout(async () => {
      try {
        if (key) {
          url = URL.createObjectURL(await serverRender('svg', showCard ? 'card' : 'main'));
          setServerPreview(url);
        } else {
          setServerPreview(`/api/v1/render/${initial.slug}?theme=${theme}${showCard ? '&variant=card' : ''}&version=${initial.current_version}`);
        }
        setRenderError(null);
      } catch (e) {
        setRenderError((e as Error).message);
      }
    }, 350);
    return () => {
      clearTimeout(id);
      if (url) URL.revokeObjectURL(url);
    };
  }, [needsServer, showCard, key, serverRender, main.error, card.error, theme, initial.slug, initial.current_version]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      setNote({ tone: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const exportSvg = () =>
    run('svg', async () => {
      if (key) return download(`${slug}-${theme}.svg`, await serverRender('svg', showCard ? 'card' : 'main'));
      const svg = renderer.current?.getSvg();
      if (!svg) throw new Error('Nothing to export yet');
      download(`${slug}-${theme}.svg`, new Blob([svg], { type: 'image/svg+xml' }));
    });

  const exportPng = () =>
    run('png', async () => {
      if (key) return download(`${slug}-${theme}.png`, await serverRender('png', showCard ? 'card' : 'main'));
      const dataUrl = await renderer.current?.toPng();
      if (!dataUrl) throw new Error('Add the studio key to export PNG');
      download(`${slug}-${theme}.png`, await (await fetch(dataUrl)).blob());
    });

  const exportReact = () =>
    run('react', async () => {
      if (engine !== 'antv' || !main.value) throw new Error('React export is for antv templates');
      const code = reactCode({ slug, title, dsl: main.value as AntvDsl, variables });
      await navigator.clipboard.writeText(code).catch(() => undefined);
      download(`${slug}.tsx`, new Blob([code], { type: 'text/plain' }));
      setNote({ tone: 'ok', text: 'React component copied and downloaded' });
    });

  const askAi = () =>
    run('ai', async () => {
      if (!key) throw new Error('Add the studio key first');
      if (engine !== 'antv') throw new Error('AI editing works on antv templates');
      const res = await fetch('/api/v1/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({ mode: 'dsl', prompt, dsl: main.value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'AI request failed');
      setMainText(pretty(body.dsl));
      setEditing('main');
      setTab('schema');
      setPrompt('');
      setNote({ tone: 'ok', text: 'Updated — check the Variables tab' });
    });

  const save = () =>
    run('save', async () => {
      if (!key) throw new Error('Add the studio key first');
      if (main.error || card.error) throw new Error('Fix the schema first');
      if (missing.length) throw new Error(`Add variables for: ${missing.join(', ')}`);
      const res = await fetch(`/api/v1/templates/${slug}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-api-key': key },
        body: JSON.stringify(draft()),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Save failed');
      setNote({ tone: 'ok', text: `Saved v${body.current_version}` });
      if (isNew || slug !== initial.slug) router.replace(`/studio/${slug}`);
      else router.refresh();
    });

  const promote = (path: (string | number)[], text: string) => {
    if (!main.value) return;
    let name = toSlotName(text);
    while (variables.some((v) => v.name === name)) name = `${name}_2`;
    setMainText(pretty(setAt(main.value, ['data', ...path], `{{${name}}}`)));
    setVariables([...variables, { name, type: 'string', required: false, default: text }]);
  };

  // Drag to pan, wheel to zoom.
  const drag = useRef<{ x: number; y: number } | null>(null);
  const canvasHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => drag.current && setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }),
    onPointerUp: () => (drag.current = null),
    onWheel: (e: React.WheelEvent) => setZoom((z) => Math.min(4, Math.max(0.25, z * (e.deltaY < 0 ? 1.1 : 0.9)))),
  };

  const editingText = editing === 'card' ? cardText : mainText;
  const editingError = editing === 'card' ? card.error : main.error;
  const literals = main.value && engine === 'antv' ? literalLeaves((main.value as AntvDsl).data) : [];

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(360px,42%)_1fr] min-h-0">
      {/* Left: schema, variables, theme, AI */}
      <section className="border-b lg:border-b-0 lg:border-r border-edge flex flex-col min-h-0 lg:h-[calc(100dvh-3.5rem-2.5rem)]">
        <div className="p-3 flex flex-col gap-2 border-b border-edge">
          <div className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" className="flex-1 min-w-0 bg-transparent font-semibold outline-none" />
            <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)} aria-label="Domain" className="bg-panel border border-edge rounded-lg text-xs px-2">
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 text-xs">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              aria-label="Slug"
              className="flex-1 min-w-0 font-mono bg-panel border border-edge rounded-lg px-2 py-1 outline-none focus:border-lagoon"
            />
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags" aria-label="Tags" className="flex-1 min-w-0 bg-panel border border-edge rounded-lg px-2 py-1 outline-none focus:border-lagoon" />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) askAi();
            }}
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe data or layout changes to update DSL"
              className="flex-1 min-w-0 bg-panel border border-edge rounded-full px-3 py-1.5 text-sm outline-none focus:border-lagoon"
            />
            <button disabled={busy === 'ai' || !prompt.trim()} className="px-3 rounded-full bg-lagoon text-obsidian text-sm font-semibold disabled:opacity-40">
              {busy === 'ai' ? '…' : 'AI'}
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1 px-3 pt-2 text-xs">
          {(['schema', 'variables', 'theme'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full capitalize whitespace-nowrap ${tab === t ? 'bg-crisp text-obsidian font-semibold' : 'text-crisp/60 hover:text-crisp'}`}
            >
              {t === 'variables' ? (
                <>
                  <span className="sm:hidden">Variables</span>
                  <span className="hidden sm:inline">Variable Mapper</span>
                </>
              ) : (
                t
              )}
              {t === 'variables' && missing.length + unused.length > 0 && <span className="ml-1 text-coral">●</span>}
            </button>
          ))}
          {tab === 'schema' && (
            <div className="ml-auto flex gap-1">
              {(['main', 'card'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    if (p === 'card' && !cardText.trim()) setCardText(pretty({ width: 1200, height: 630, tree: { type: 'div', props: { style: { display: 'flex', width: 1088, height: 518, backgroundColor: tokens.obsidian, color: tokens.white, fontSize: 64, padding: 56 }, children: '{{' + (variables[0]?.name ?? 'headline') + '}}' } } }));
                    setEditing(p);
                  }}
                  className={`px-2 py-1 rounded-md whitespace-nowrap ${editing === p ? 'text-lagoon' : 'text-crisp/50'}`}
                >
                  {p === 'main' ? 'Main' : 'Share card'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 p-3 pt-2">
          {tab === 'schema' && (
            <div className="h-full flex flex-col gap-1.5">
              <textarea
                value={editingText}
                onChange={(e) => (editing === 'card' ? setCardText(e.target.value) : setMainText(e.target.value))}
                spellCheck={false}
                aria-label="Template schema"
                className={`flex-1 min-h-72 w-full resize-none rounded-xl bg-panel border p-3 font-mono text-[12px] leading-relaxed outline-none scrollbar-thin ${editingError ? 'border-coral' : 'border-edge focus:border-lagoon'}`}
              />
              {editingError && <p className="text-[11px] text-coral font-mono truncate">{editingError}</p>}
            </div>
          )}

          {tab === 'variables' && (
            <div className="h-full overflow-y-auto scrollbar-thin flex flex-col gap-2">
              {missing.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setVariables([...variables, { name, type: 'string', required: false, default: '' }])}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-coral/60 px-3 py-2 text-left text-sm"
                >
                  <code className="text-coral">{`{{${name}}}`}</code>
                  <span className="ml-auto text-xs text-coral">Add</span>
                </button>
              ))}
              {variables.map((v, i) => {
                const isUnused = !slots.has(v.name);
                const update = (patch: Partial<TemplateVariable>) => setVariables(variables.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={v.name} className={`rounded-xl border p-2.5 flex flex-col gap-1.5 ${isUnused ? 'border-gold/50' : 'border-edge'} bg-panel`}>
                    <div className="flex items-center gap-2">
                      <code className="text-[12px] text-lagoon">{`{{${v.name}}}`}</code>
                      <select value={v.type} onChange={(e) => update({ type: e.target.value as TemplateVariable['type'] })} aria-label="Type" className="ml-auto bg-obsidian border border-edge rounded-md text-[11px] px-1">
                        <option value="string">text</option>
                        <option value="number">number</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-crisp/60">
                        <input type="checkbox" checked={v.required} onChange={(e) => update({ required: e.target.checked })} />
                        required
                      </label>
                      <button type="button" onClick={() => setVariables(variables.filter((_, j) => j !== i))} aria-label={`Remove ${v.name}`} className="text-crisp/40 hover:text-coral px-1">
                        ×
                      </button>
                    </div>
                    <input value={v.default} onChange={(e) => update({ default: e.target.value })} aria-label="Default" className="bg-obsidian border border-edge rounded-lg px-2 py-1 text-sm outline-none focus:border-lagoon" />
                    {isUnused && <span className="text-[10px] text-gold">Not used in the schema</span>}
                  </div>
                );
              })}
              {literals.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {literals.slice(0, 40).map((l) => (
                    <button
                      key={l.path.join('.')}
                      type="button"
                      onClick={() => promote(l.path, l.text)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-panel"
                      title="Make this value dynamic"
                    >
                      <span className="text-crisp/40 font-mono">{l.path.join('.')}</span>
                      <span className="truncate">{l.text}</span>
                      <span className="ml-auto text-lagoon shrink-0">→ {'{{ }}'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'theme' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(tokens).map(([name, value]) => (
                <label key={name} className="rounded-xl border border-edge bg-panel p-2 flex items-center gap-2 text-xs">
                  <input type="color" value={value} onChange={(e) => setTokens({ ...tokens, [name]: e.target.value })} className="w-8 h-8 rounded-md bg-transparent border-0" />
                  <span className="flex flex-col">
                    <span className="capitalize">{name}</span>
                    <span className="font-mono text-crisp/40">{value}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-edge flex items-center gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              localStorage.setItem(KEY_STORE, e.target.value);
            }}
            placeholder="Studio key"
            aria-label="Studio key"
            className="flex-1 min-w-0 bg-panel border border-edge rounded-full px-3 py-1.5 text-xs outline-none focus:border-lagoon"
          />
          <button type="button" onClick={save} disabled={busy === 'save'} className="px-4 py-1.5 rounded-full bg-crisp text-obsidian text-sm font-semibold disabled:opacity-40">
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      {/* Right: live canvas */}
      <section className="relative flex flex-col min-h-[60dvh] lg:h-[calc(100dvh-3.5rem-2.5rem)]">
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-full border border-edge bg-obsidian/80 backdrop-blur text-xs">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))} className="px-3 py-1.5" aria-label="Zoom out">−</button>
            <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-2 py-1.5 tabular-nums" aria-label="Reset view">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" onClick={() => setZoom((z) => Math.min(4, z * 1.2))} className="px-3 py-1.5" aria-label="Zoom in">+</button>
          </div>
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-3 py-1.5 rounded-full border border-edge bg-obsidian/80 text-xs capitalize">
            {theme}
          </button>
          {card.value && (
            <button
              type="button"
              onClick={() => setView(view === 'main' ? 'card' : 'main')}
              className={`px-3 py-1.5 rounded-full border text-xs bg-obsidian/80 ${view === 'card' ? 'border-coral text-coral' : 'border-edge'}`}
            >
              Share card
            </button>
          )}
          <div className="ml-auto flex gap-1.5">
            {(['svg', 'png', 'react'] as const).map((f) => (
              <button
                key={f}
                type="button"
                disabled={!!busy}
                onClick={f === 'svg' ? exportSvg : f === 'png' ? exportPng : exportReact}
                className="px-3 py-1.5 rounded-full border border-edge bg-obsidian/80 text-xs uppercase hover:border-lagoon hover:text-lagoon disabled:opacity-40"
              >
                {busy === f ? '…' : f}
              </button>
            ))}
          </div>
        </div>

        <div
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
          style={{ backgroundImage: 'radial-gradient(rgba(248,250,252,0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          {...canvasHandlers}
        >
          <div className="w-full h-full grid place-items-center p-6 pt-16" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
            {needsServer ? (
              serverPreview ? (
                <img src={serverPreview} alt="Preview" draggable={false} className="max-w-full max-h-full rounded-xl shadow-2xl" />
              ) : null
            ) : main.value ? (
              <InfographicRenderer
                ref={renderer}
                dsl={main.value as AntvDsl}
                values={values}
                theme={theme}
                tokens={tokens}
                onError={setRenderError}
                className="w-full max-w-5xl aspect-[16/9] rounded-xl overflow-hidden shadow-2xl"
              />
            ) : null}
          </div>
        </div>

        {(renderError || note) && (
          <div
            role="status"
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs ${
              note?.tone === 'ok' ? 'bg-lagoon text-obsidian' : 'bg-coral text-crisp'
            }`}
          >
            {note?.text ?? renderError}
          </div>
        )}
      </section>
    </div>
  );
}
