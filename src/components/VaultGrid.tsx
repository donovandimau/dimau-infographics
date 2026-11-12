'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DOMAINS, type Domain, type InfographicTemplate } from '@/lib/types';

const DOMAIN_ACCENT: Record<Domain, string> = {
  fintech_capital: 'text-gold border-gold/40',
  social_community: 'text-coral border-coral/40',
  connectivity_telecom: 'text-lagoon border-lagoon/40',
  mapping_geo: 'text-emerald-300 border-emerald-300/40',
  executive_regulatory: 'text-violet-300 border-violet-300/40',
};

function useOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

function CopyChip({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      title={value}
      className="px-2.5 py-1 rounded-full border border-edge text-[11px] hover:border-lagoon hover:text-lagoon transition-colors"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function Card({ t, origin }: { t: InfographicTemplate; origin: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [variant, setVariant] = useState<'main' | 'card'>('main');
  const q = new URLSearchParams({ theme, version: String(t.current_version) });
  if (variant === 'card') q.set('variant', 'card');
  const preview = `/api/v1/render/${t.slug}?${q}`;
  const endpoint = `${origin}/api/v1/render/${t.slug}`;
  const embed = `<img src="${endpoint}?format=png" alt="${t.title}" loading="lazy" />`;
  const sdk = `getInfographicUrl('${t.slug}', { ${t.variables.slice(0, 2).map((v) => `${v.name}: '${v.default}'`).join(', ')} }, { format: 'png' })`;

  return (
    <article className="group rounded-2xl border border-edge bg-panel overflow-hidden flex flex-col">
      <Link href={`/studio/${t.slug}`} className="block relative aspect-[16/10] bg-obsidian overflow-hidden">
        <img
          src={preview}
          alt={t.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center gap-2">
          <code className="text-[13px] font-semibold truncate">{t.slug}</code>
          <span className="ml-auto text-[10px] text-crisp/40">v{t.current_version}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {t.variables.map((v) => (
            <span key={v.name} title={`Default: ${v.default}`} className="px-1.5 py-0.5 rounded-md bg-edge/60 text-[10px] font-mono text-crisp/70">
              {v.name}
            </span>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <CopyChip label="API" value={endpoint} />
          <CopyChip label="Embed" value={embed} />
          <CopyChip label="SDK" value={sdk} />
          <div className="ml-auto flex gap-1">
            {t.card_dsl && (
              <button
                type="button"
                onClick={() => setVariant(variant === 'main' ? 'card' : 'main')}
                className={`px-2 py-1 rounded-full text-[11px] border ${variant === 'card' ? 'border-coral text-coral' : 'border-edge text-crisp/60'}`}
                aria-pressed={variant === 'card'}
              >
                Card
              </button>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-7 h-7 rounded-full border border-edge grid place-items-center"
              aria-label="Switch preview theme"
            >
              <span className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-crisp' : 'bg-obsidian ring-1 ring-crisp'}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function VaultGrid({ templates }: { templates: InfographicTemplate[] }) {
  const [domain, setDomain] = useState<Domain | 'all'>('all');
  const [query, setQuery] = useState('');
  const origin = useOrigin();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter(
      (t) =>
        (domain === 'all' || t.domain === domain) &&
        (!q || t.slug.includes(q) || t.title.toLowerCase().includes(q) || t.tags.some((g) => g.includes(q))),
    );
  }, [templates, domain, query]);

  return (
    <div className="px-4 sm:px-6 py-5 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin -mx-1 px-1 pb-1">
          {[{ id: 'all' as const, label: 'All' }, ...DOMAINS].map((d) => {
            const count = d.id === 'all' ? templates.length : templates.filter((t) => t.domain === d.id).length;
            const active = domain === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDomain(d.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  active ? 'bg-crisp text-obsidian border-crisp font-semibold' : `border-edge hover:border-crisp/40 ${d.id === 'all' ? '' : DOMAIN_ACCENT[d.id].split(' ')[0]}`
                }`}
              >
                {d.label} <span className="opacity-50">{count}</span>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="sm:ml-auto w-full sm:w-56 px-3 py-1.5 rounded-full bg-panel border border-edge text-sm outline-none focus:border-lagoon"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {shown.map((t) => (
          <Card key={t.slug} t={t} origin={origin} />
        ))}
        <Link
          href="/studio/new"
          className="rounded-2xl border border-dashed border-edge min-h-56 grid place-items-center text-crisp/40 hover:text-lagoon hover:border-lagoon transition-colors"
          aria-label="New template"
        >
          <span className="text-5xl font-light">+</span>
        </Link>
      </div>
    </div>
  );
}
