-- Visitor counter schema. Run once in the Supabase SQL editor.
-- NOTE: re-running this resets the counts (it recreates the table).
--
-- Unique visitors are tracked by IP, stored HASHED (md5 + salt) so raw IPs are never
-- persisted. The browser never sees or sends its IP: record_visit() reads it
-- server-side from the request headers Supabase/PostgREST forwards. Anonymous clients
-- can only call the two SECURITY DEFINER functions below; the table itself is private.
-- "On-site" (live viewers) is Supabase Realtime presence and needs no table.

drop function if exists public.record_visit(uuid);
drop function if exists public.record_visit();
drop function if exists public.get_visit_stats();
drop table if exists public.visitors;

create table public.visitors (
  visitor_key text        primary key,  -- md5(ip + salt); anonymized, not reversible to the raw IP
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  visit_count integer     not null default 1
);

alter table public.visitors enable row level security;
-- No policies => anon has no direct table access. All access is via the functions below.

-- Record a visit keyed by the caller's hashed IP. A new IP is a new unique visitor;
-- a returning IP just bumps its visit_count.
create or replace function public.record_visit()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  -- x-forwarded-for may be "client, proxy1, proxy2"; the client is the first entry.
  v_ip := trim(split_part(coalesce(
            v_headers ->> 'x-forwarded-for',
            v_headers ->> 'x-real-ip',
            ''), ',', 1));
  if v_ip is null or v_ip = '' then v_ip := 'unknown'; end if;

  insert into public.visitors (visitor_key)
    values (md5(v_ip || '|jh-visitor-salt-v1'))
  on conflict (visitor_key) do update
    set visit_count = public.visitors.visit_count + 1,
        last_seen   = now();
end;
$$;

-- Aggregate stats for the widget.
create or replace function public.get_visit_stats()
returns table (total_visits bigint, unique_visitors bigint)
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(visit_count), 0)::bigint as total_visits,
         count(*)::bigint                       as unique_visitors
  from public.visitors;
$$;

grant execute on function public.record_visit()    to anon;
grant execute on function public.get_visit_stats() to anon;
