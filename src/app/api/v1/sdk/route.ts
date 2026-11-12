import { listTemplates } from '@/lib/registry';
import { buildSdk, DEFAULT_BASE_URL } from '@/lib/sdk';
import { corsHeaders } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Live typed SDK covering every public template, including ones saved in the studio. */
export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin ?? DEFAULT_BASE_URL;
  const src = buildSdk(await listTemplates({ publicOnly: true }), base);
  return new Response(src, {
    headers: { ...corsHeaders(req.headers.get('origin')), 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300' },
  });
}
