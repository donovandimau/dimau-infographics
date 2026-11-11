import { getTemplate } from '@/lib/registry';
import { renderTemplate, type RenderRequest } from '@/lib/render';
import { VariableError } from '@/lib/substitute';
import { checkApiKey, clientIp, corsHeaders, json, rateLimited } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESERVED = new Set(['format', 'theme', 'variant', 'version']);

async function respond(req: Request, slug: string, body: RenderRequest & { version?: number }, needPublic: boolean) {
  const cors = corsHeaders(req.headers.get('origin'));
  const tpl = await getTemplate(slug, body.version ? Number(body.version) : undefined);
  if (!tpl || (needPublic && !tpl.is_public)) return json({ error: `Template "${slug}" not found` }, 404, cors);
  try {
    const out = await renderTemplate(tpl, body);
    const cache = needPublic
      ? 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
      : 'private, no-store';
    return new Response(out.body as BodyInit, {
      headers: { ...cors, 'content-type': out.contentType, 'cache-control': cache, 'x-template-version': String(tpl.current_version) },
    });
  } catch (e) {
    if (e instanceof VariableError) return json({ error: e.message, field: e.field }, 422, cors);
    console.error('render failed', slug, e);
    return json({ error: 'Render failed' }, 500, cors);
  }
}

/** Public embed: /api/v1/render/<slug>?var=value&format=png&theme=dark&variant=card (public templates only). */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (rateLimited(clientIp(req))) return json({ error: 'Too many requests' }, 429, corsHeaders(req.headers.get('origin')));
  const sp = new URL(req.url).searchParams;
  const data: Record<string, string> = {};
  for (const [k, v] of sp) if (!RESERVED.has(k)) data[k] = v;
  return respond(req, slug, {
    data,
    format: sp.get('format') as RenderRequest['format'],
    theme: sp.get('theme') as RenderRequest['theme'],
    variant: sp.get('variant') as RenderRequest['variant'],
    version: sp.get('version') ? Number(sp.get('version')) : undefined,
  }, true);
}

/** Keyed render: POST { data, format, theme, variant?, version? } with header x-api-key. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cors = corsHeaders(req.headers.get('origin'));
  const auth = await checkApiKey(req.headers.get('x-api-key'));
  if (!auth.ok) return json({ error: 'Missing or revoked API key' }, 401, cors);
  let body: RenderRequest & { version?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400, cors);
  }
  if (body.data !== undefined && (typeof body.data !== 'object' || Array.isArray(body.data))) {
    return json({ error: '"data" must be an object', field: 'data' }, 422, cors);
  }
  return respond(req, slug, body, false);
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}
