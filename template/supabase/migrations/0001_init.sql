create table if not exists public.line_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  dedupe_key text,
  payload jsonb not null,
  status text not null default 'pending',
  attempts int not null default 0,
  reply_token_used boolean not null default false,
  last_error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz
);

create unique index if not exists line_jobs_dedupe_key_idx
  on public.line_jobs (dedupe_key)
  where dedupe_key is not null;

create index if not exists line_jobs_pending_idx
  on public.line_jobs (created_at)
  where status = 'pending';

create table if not exists public.line_users (
  line_user_id text primary key,
  display_name text,
  picture_url text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.line_jobs enable row level security;
alter table public.line_users enable row level security;

create or replace function public.claim_line_jobs(batch_size int default 10)
returns setof public.line_jobs
language sql
as $$
  update public.line_jobs
     set status = 'processing',
         attempts = attempts + 1,
         claimed_at = now()
   where id in (
     select id
       from public.line_jobs
      where status = 'pending'
         or (status = 'processing' and claimed_at < now() - interval '5 minutes' and attempts < 5)
      order by created_at
      limit batch_size
      for update skip locked
   )
  returning *;
$$;
