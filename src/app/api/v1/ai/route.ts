import { AiError, generatePoster, textToDsl } from '@/lib/ai-infographic';
import { isAdminKey, json } from '@/lib/http';
import type { AntvDsl } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Studio-only. { mode: 'dsl', prompt, dsl } → updated definition; { mode: 'poster', prompt, image?, mask? } → PNG. */
export async function POST(req: Request) {
  if (!isAdminKey(req.headers.get('x-api-key'))) return json({ error: 'Studio key required' }, 401);
  const body = (await req.json()) as { mode?: string; prompt?: string; dsl?: AntvDsl; image?: string; mask?: string };
  if (!body.prompt?.trim()) return json({ error: 'Describe the change first', field: 'prompt' }, 422);
  try {
    if (body.mode === 'poster') {
      const png = await generatePoster(body.prompt, { image: body.image, mask: body.mask });
      return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
    }
    if (!body.dsl) return json({ error: 'Current definition missing', field: 'dsl' }, 422);
    return json({ dsl: await textToDsl(body.prompt, body.dsl) });
  } catch (e) {
    const status = e instanceof AiError ? 422 : 502;
    return json({ error: (e as Error).message }, status);
  }
}
