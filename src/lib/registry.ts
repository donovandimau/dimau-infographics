import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { STARTER_TEMPLATES } from './starter-templates';
import type { InfographicTemplate } from './types';

/**
 * Template registry. Reads from Supabase when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set;
 * otherwise (and for any slug not yet in the database) it serves the built-in starter templates,
 * so a fresh deploy works before the database is connected.
 */

export const TABLE = {
  templates: 'infographic_templates',
  versions: 'infographic_template_versions',
  keys: 'infographic_api_keys',
} as const;

let client: SupabaseClient | null | undefined;
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

const COLUMNS = 'slug,title,domain,tags,engine,visual_type,dsl,card_dsl,variables,theme_tokens,current_version,is_public,updated_at';

export async function listTemplates(opts: { publicOnly?: boolean } = {}): Promise<InfographicTemplate[]> {
  const bySlug = new Map(STARTER_TEMPLATES.map((t) => [t.slug, t]));
  const sb = db();
  if (sb) {
    let q = sb.from(TABLE.templates).select(COLUMNS).order('updated_at', { ascending: false });
    if (opts.publicOnly) q = q.eq('is_public', true);
    const { data, error } = await q;
    if (!error && data) for (const row of data as InfographicTemplate[]) bySlug.set(row.slug, row);
  }
  const all = [...bySlug.values()];
  return opts.publicOnly ? all.filter((t) => t.is_public) : all;
}

export async function getTemplate(slug: string, version?: number): Promise<InfographicTemplate | null> {
  const sb = db();
  if (sb) {
    const { data } = await sb.from(TABLE.templates).select(COLUMNS).eq('slug', slug).maybeSingle();
    if (data) {
      const tpl = data as InfographicTemplate;
      if (version && version !== tpl.current_version) {
        const { data: tplRow } = await sb.from(TABLE.templates).select('id').eq('slug', slug).single();
        const { data: ver } = await sb
          .from(TABLE.versions)
          .select('dsl,card_dsl,variables,theme_tokens,version')
          .eq('template_id', tplRow!.id)
          .eq('version', version)
          .maybeSingle();
        if (!ver) return null;
        return { ...tpl, ...ver, current_version: ver.version } as InfographicTemplate;
      }
      return tpl;
    }
  }
  const starter = STARTER_TEMPLATES.find((t) => t.slug === slug) ?? null;
  if (starter && version && version !== starter.current_version) return null;
  return starter;
}

export type TemplateInput = Omit<InfographicTemplate, 'current_version' | 'updated_at'>;

/** Create or update a template. The database trigger snapshots each change into the versions table. */
export async function saveTemplate(input: TemplateInput): Promise<InfographicTemplate> {
  const sb = db();
  if (!sb) throw new Error('Database not connected: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  const { data, error } = await sb.from(TABLE.templates).upsert(input, { onConflict: 'slug' }).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return data as InfographicTemplate;
}
