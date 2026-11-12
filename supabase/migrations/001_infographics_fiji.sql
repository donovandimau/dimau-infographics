-- Infographics Fiji: template registry, version history and app API keys.
-- Tables are prefixed "infographic_" because they share a Supabase project with other Dimau apps.

create extension if not exists pgcrypto;

do $$ begin
  create type public.infographic_domain as enum (
    'fintech_capital', 'social_community', 'connectivity_telecom', 'mapping_geo', 'executive_regulatory'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.infographic_templates (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  title           text not null,
  domain          public.infographic_domain not null,
  tags            text[] not null default '{}',
  engine          text not null default 'antv' check (engine in ('antv', 'satori')),
  visual_type     text not null default '',
  dsl             jsonb not null,
  card_dsl        jsonb,
  variables       jsonb not null default '[]'::jsonb check (jsonb_typeof(variables) = 'array'),
  theme_tokens    jsonb not null default '{}'::jsonb,
  current_version integer not null default 1,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists infographic_templates_domain_idx on public.infographic_templates (domain);
create index if not exists infographic_templates_tags_idx on public.infographic_templates using gin (tags);

create table if not exists public.infographic_template_versions (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.infographic_templates (id) on delete cascade,
  version      integer not null,
  dsl          jsonb not null,
  card_dsl     jsonb,
  variables    jsonb not null,
  theme_tokens jsonb not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (template_id, version)
);

create table if not exists public.infographic_api_keys (
  id           uuid primary key default gen_random_uuid(),
  app_name     text not null,
  key_hash     text not null unique check (key_hash ~ '^[0-9a-f]{64}$'), -- sha256 hex; the raw key is never stored
  scopes       text[] not null default array['render'],
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- Every insert, and every change to the design (dsl, card, variables, theme), becomes a numbered version.
create or replace function public.infographic_snapshot_version() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.dsl is not distinct from old.dsl
       and new.card_dsl is not distinct from old.card_dsl
       and new.variables is not distinct from old.variables
       and new.theme_tokens is not distinct from old.theme_tokens then
      new.updated_at := now();
      return new;
    end if;
    new.current_version := old.current_version + 1;
  else
    new.current_version := 1;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.infographic_record_version() returns trigger
language plpgsql as $$
begin
  insert into public.infographic_template_versions (template_id, version, dsl, card_dsl, variables, theme_tokens)
  values (new.id, new.current_version, new.dsl, new.card_dsl, new.variables, new.theme_tokens)
  on conflict (template_id, version) do nothing;
  return null;
end $$;

drop trigger if exists infographic_templates_bump on public.infographic_templates;
create trigger infographic_templates_bump
  before insert or update on public.infographic_templates
  for each row execute function public.infographic_snapshot_version();

drop trigger if exists infographic_templates_record on public.infographic_templates;
create trigger infographic_templates_record
  after insert or update on public.infographic_templates
  for each row execute function public.infographic_record_version();

-- Row-level security: the public may read public templates; all writes go through the server's service role.
alter table public.infographic_templates enable row level security;
alter table public.infographic_template_versions enable row level security;
alter table public.infographic_api_keys enable row level security;

drop policy if exists "public templates are readable" on public.infographic_templates;
create policy "public templates are readable" on public.infographic_templates
  for select to anon, authenticated using (is_public);

drop policy if exists "versions of public templates are readable" on public.infographic_template_versions;
create policy "versions of public templates are readable" on public.infographic_template_versions
  for select to anon, authenticated
  using (exists (select 1 from public.infographic_templates t where t.id = template_id and t.is_public));

-- infographic_api_keys has no policies: only the service role can read or write it.
