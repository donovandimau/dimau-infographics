import fs from 'fs';
import path from 'path';
import { STARTER_TEMPLATES } from '../src/lib/starter-templates';

/** Generates supabase/seed.sql from src/lib/starter-templates.ts so the two never drift apart. */
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const j = (v: unknown) => (v === null ? 'null' : `${q(JSON.stringify(v))}::jsonb`);
const arr = (a: string[]) => `array[${a.map(q).join(',')}]::text[]`;

const rows = STARTER_TEMPLATES.map(
  (t) => `  (${[q(t.slug), q(t.title), `${q(t.domain)}::infographic_domain`, arr(t.tags), q(t.engine), q(t.visual_type), j(t.dsl), j(t.card_dsl), j(t.variables), j(t.theme_tokens), t.is_public].join(', ')})`,
);

const sql = `-- AUTO-GENERATED from src/lib/starter-templates.ts by scripts/build-seed.ts. Do not edit by hand.
-- Safe to re-run: existing starter rows are updated in place, and the version trigger records any change.
insert into public.infographic_templates
  (slug, title, domain, tags, engine, visual_type, dsl, card_dsl, variables, theme_tokens, is_public)
values
${rows.join(',\n')}
on conflict (slug) do update set
  title = excluded.title, domain = excluded.domain, tags = excluded.tags, engine = excluded.engine,
  visual_type = excluded.visual_type, dsl = excluded.dsl, card_dsl = excluded.card_dsl,
  variables = excluded.variables, theme_tokens = excluded.theme_tokens, is_public = excluded.is_public;
`;
fs.writeFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), sql, 'utf8');
console.log(`Wrote supabase/seed.sql (${STARTER_TEMPLATES.length} templates)`);
