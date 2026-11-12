import { getTemplate, saveTemplate, type TemplateInput } from '@/lib/registry';
import { corsHeaders, isAdminKey, json } from '@/lib/http';
import { DOMAINS } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Raw template schema for client-side rendering in sister apps. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cors = corsHeaders(req.headers.get('origin'));
  const sp = new URL(req.url).searchParams;
  const tpl = await getTemplate(slug, sp.get('version') ? Number(sp.get('version')) : undefined);
  if (!tpl || !tpl.is_public) return json({ error: `Template "${slug}" not found` }, 404, cors);
  const { slug: s, current_version: version, engine, dsl, card_dsl, variables, theme_tokens } = tpl;
  return json({ slug: s, version, engine, dsl, card_dsl, variables, theme_tokens }, 200, {
    ...cors,
    'cache-control': 'public, max-age=60, s-maxage=300',
  });
}

/** Save from the studio (admin key only). Each save becomes a new version. */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cors = corsHeaders(req.headers.get('origin'));
  if (!isAdminKey(req.headers.get('x-api-key'))) return json({ error: 'Studio key required' }, 401, cors);
  let input: TemplateInput;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400, cors);
  }
  if (input.slug !== slug || !/^[a-z0-9-]{3,64}$/.test(slug)) return json({ error: 'Slug mismatch or invalid', field: 'slug' }, 422, cors);
  if (!DOMAINS.some((d) => d.id === input.domain)) return json({ error: 'Unknown domain', field: 'domain' }, 422, cors);
  if (!input.dsl || typeof input.dsl !== 'object') return json({ error: 'dsl must be an object', field: 'dsl' }, 422, cors);
  if (!Array.isArray(input.variables)) return json({ error: 'variables must be a list', field: 'variables' }, 422, cors);
  try {
    const saved = await saveTemplate({
      slug,
      title: input.title,
      domain: input.domain,
      tags: input.tags ?? [],
      engine: input.engine,
      visual_type: input.visual_type ?? '',
      dsl: input.dsl,
      card_dsl: input.card_dsl ?? null,
      variables: input.variables,
      theme_tokens: input.theme_tokens,
      is_public: input.is_public ?? true,
    });
    return json(saved, 200, cors);
  } catch (e) {
    return json({ error: (e as Error).message }, 503, cors);
  }
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}
