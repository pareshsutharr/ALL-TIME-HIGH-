-- refresh_daily_metric_peaks() reliably exceeds Supabase's own HTTP-layer
-- timeouts (PostgREST/Supavisor for a normal RPC call, and separately the
-- Cloudflare edge in front of the Management API used by `supabase db
-- query`) once it's rebuilding views over main_data's 1.38M rows — a single
-- one-view refresh alone took over 100s and was killed by the gateway
-- before Postgres itself finished. A function-level `statement_timeout`
-- override doesn't rescue this either: the timeout timer for a top-level
-- RPC call is armed before the function's own SET takes effect.
--
-- The fix is to stop running the refresh on the HTTP request path at all.
-- pg_cron runs entirely inside Postgres, with no client connection or
-- gateway involved, so a job it runs has no such ceiling. This schedules
-- refresh_daily_metric_peaks() as a one-off pg_cron job a few seconds in
-- the future — cron.schedule() itself just inserts a row and returns
-- immediately, so the admin upload route can call it synchronously and
-- move on without waiting for the refresh to finish.
create extension if not exists pg_cron;

-- This Supabase project's pg_cron build only exposes the cron-expression
-- overloads of cron.schedule() (confirmed via pg_proc — no timestamptz
-- one-off overload), not the newer "run once at this timestamp" form. So
-- this fires on the next minute boundary via '* * * * *' under a fixed job
-- name, and the job's own command unschedules that name as its last step —
-- net effect is a one-shot run within ~60s, and re-triggering later just
-- re-registers the same name rather than accumulating job rows.
--
-- security definer, owned by the migration role (which administers
-- pg_cron) — service_role only needs to call this wrapper, not touch the
-- cron schema directly.
create or replace function public.schedule_daily_metric_peaks_refresh()
returns void
language sql
security definer
set search_path = public, cron
as $$
  select cron.schedule(
    'daily-metric-peaks-refresh',
    '* * * * *',
    $job$select public.refresh_daily_metric_peaks(); select cron.unschedule('daily-metric-peaks-refresh');$job$
  );
$$;

revoke all on function public.schedule_daily_metric_peaks_refresh() from public, anon, authenticated;
grant execute on function public.schedule_daily_metric_peaks_refresh() to service_role;
