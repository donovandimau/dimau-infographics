import { renderTemplate } from '@/lib/render';
import { VariableError } from '@/lib/substitute';
import { isAdminKey, json } from '@/lib/http';
import type { InfographicTemplate } from '@/lib/types';
import type { RenderRequest } from '@/lib/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Studio-only: render an unsaved template draft (used for PNG export and the server preview). */
export async function POST(req: Request) {
  if (!isAdminKey(req.headers.get('x-api-key'))) return json({ error: 'Studio key required' }, 401);
  const { template, ...opts } = (await req.json()) as { template: InfographicTemplate } & RenderRequest;
  try {
    const out = await renderTemplate(template, opts);
    return new Response(out.body as BodyInit, { headers: { 'content-type': out.contentType, 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof VariableError) return json({ error: e.message, field: e.field }, 422);
    return json({ error: (e as Error).message }, 400);
  }
}
