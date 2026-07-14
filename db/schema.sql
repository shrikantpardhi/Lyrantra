create extension if not exists pgcrypto;

create table if not exists artists (
  id text primary key,
  slug text not null unique,
  name text not null,
  bio text not null default '',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists movies (
  id text primary key,
  slug text not null unique,
  title text not null,
  year integer not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists songs (
  id text primary key,
  slug text not null unique,
  title text not null,
  alternate_title text,
  description text not null default '',
  release_year integer not null,
  language text not null,
  category text not null,
  genre text not null,
  tags text[] not null default '{}',
  movie_id text references movies(id) on delete set null,
  artwork text,
  lyrics jsonb not null default '[]',
  platform_links jsonb not null default '[]',
  interpretation jsonb,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  featured boolean not null default false,
  views bigint not null default 0,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(alternate_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(lyrics::text, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table songs add column if not exists interpretation jsonb;

create index if not exists songs_search_idx on songs using gin(search_document);
create index if not exists songs_status_idx on songs(status);
create index if not exists songs_taxonomy_idx on songs(category, genre, language, release_year);

create table if not exists song_artists (
  song_id text not null references songs(id) on delete cascade,
  artist_id text not null references artists(id) on delete cascade,
  role text not null default 'primary',
  sort_order integer not null default 0,
  primary key (song_id, artist_id)
);

create index if not exists song_artists_artist_idx on song_artists(artist_id);

create table if not exists comments (
  id text primary key,
  song_id text not null references songs(id) on delete cascade,
  name text not null,
  email text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists comments_song_status_idx on comments(song_id, status);

create table if not exists contact_messages (
  id text primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_providers (
  id text primary key,
  name text not null,
  provider text not null check (provider in ('gemini', 'openai', 'anthropic', 'custom')),
  model text not null,
  encrypted_api_key text not null,
  base_url text,
  enabled boolean not null default true,
  daily_limit integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists ai_runs (
  id text primary key,
  provider_id text references ai_providers(id) on delete set null,
  status text not null check (status in ('queued', 'running', 'needs_review', 'completed', 'failed')),
  source text not null default 'manual' check (source = 'manual'),
  summary text not null default '',
  candidates integer not null default 0,
  details text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

update ai_runs set source = 'manual' where source <> 'manual';
alter table ai_runs drop constraint if exists ai_runs_source_check;
alter table ai_runs add constraint ai_runs_source_check check (source = 'manual');

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
