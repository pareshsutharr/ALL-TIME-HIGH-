-- The scheduled job still hit "canceling statement due to statement
-- timeout" at exactly 2 minutes — this project's Postgres has a 2min
-- statement_timeout baked into the server config (not a role/db setting,
-- confirmed via `show statement_timeout` with no matching pg_db_role_setting
-- row), and function-local SET (the previous fix, ALTER FUNCTION ... SET
-- statement_timeout) does NOT override it: Postgres arms a top-level
-- statement's timeout timer using whatever GUC value was in effect when
-- that statement started, before a function-local SET inside its body ever
-- takes effect.
--
-- A plain top-level `SET statement_timeout` run as its own statement,
-- ahead of the refresh call in the same session, doesn't have that problem
-- — the GUC change is already active by the time the *next* top-level
-- statement (the refresh call) starts and arms its own timer. pg_cron runs
-- each semicolon-separated statement in a job's command as its own
-- top-level statement within one session, so this just adds that as step 1.
create or replace function public.schedule_daily_metric_peaks_refresh()
returns void
language sql
security definer
set search_path = public, cron
as $$
  select cron.schedule(
    'daily-metric-peaks-refresh',
    '* * * * *',
    $job$set statement_timeout = '30min'; select public.refresh_daily_metric_peaks(); select cron.unschedule('daily-metric-peaks-refresh');$job$
  );
$$;
