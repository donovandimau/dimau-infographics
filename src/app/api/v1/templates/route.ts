import { listTemplates } from '@/lib/registry';
import { corsHeaders, json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Catalogue of public templates: slug, title, domain, version and variable definitions. */
export async function GET(req: Request) {
  const list = await listTemplates({ publicOnly: true });
  return json(
    list.map(({ slug, title, domain, tags, engine, visual_type, variables, current_version, card_dsl }) => ({
      slug, title, domain, tags, engine, visual_type, variables, version: current_version, has_card: !!card_dsl,
    })),
    200,
    { ...corsHeaders(req.headers.get('origin')), 'cache-control': 'public, max-age=60, s-maxage=300' },
  );
}
