-- refresh_daily_metric_peaks() refreshes several materialized views built
-- over main_data's 1.38M rows; that reliably exceeds the service_role
-- session's default statement_timeout (observed: "canceling statement due
-- to statement timeout" after a few views had already refreshed). Attach a
-- longer timeout to just this function rather than raising the timeout for
-- the role/session generally.
alter function public.refresh_daily_metric_peaks() set statement_timeout = '10min';
