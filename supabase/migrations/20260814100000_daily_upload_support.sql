-- Support for the daily Accord Fintech snapshot file (Daily_file_v1.xlsx
-- and friends): ingested via the /admin upload page, which upserts
-- companies/main_data/roe_roce_data and then calls
-- refresh_daily_metric_peaks() so every *_peak materialized view reflects
-- the new data immediately.

-- roe_roce_data has no duplicate (accord_code, fy_date_end) pairs today
-- (verified against the live table before adding this), so a real upsert
-- key is safe here — unlike main_data, which already has ~316k duplicate
-- (accord_code, qtr_date_end) groups from historical bulk loads (the
-- documented SHP cross-join) and so cannot take a table-wide unique
-- constraint without a separate cleanup effort. The daily uploader instead
-- replaces main_data rows for a given (accord_code, qtr_date_end) pair
-- explicitly (see delete_main_data_for_quarters below) rather than relying
-- on ON CONFLICT.
alter table public.roe_roce_data
  add constraint roe_roce_data_accord_fy_unique unique (accord_code, fy_date_end);

-- Bulk-replace main_data rows for the quarters present in a daily upload,
-- ahead of inserting the fresh rows. Takes {accord_code, qtr_date_end}
-- pairs as jsonb so the whole day's file can be applied in one round trip
-- instead of one delete per company. security definer + revoked from
-- anon/authenticated: only the server-side admin upload route (using the
-- service role key) is meant to call this.
create or replace function public.delete_main_data_for_quarters(pairs jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.main_data md
  using jsonb_to_recordset(pairs) as p(accord_code integer, qtr_date_end date)
  where md.accord_code = p.accord_code
    and md.qtr_date_end = p.qtr_date_end;
$$;

revoke all on function public.delete_main_data_for_quarters(jsonb) from public, anon, authenticated;
grant execute on function public.delete_main_data_for_quarters(jsonb) to service_role;

-- Refresh every materialized view derived from main_data/roe_roce_data so
-- the *_peak views (and main_data_latest_quarter / main_data_quarterly_dedup)
-- reflect a just-completed daily upload. None of these views have a unique
-- index that covers the whole row (main_data_quarterly_dedup in particular
-- doesn't), so this uses a plain blocking REFRESH rather than CONCURRENTLY —
-- acceptable for a once-a-day admin action, not a hot request path.
create or replace function public.refresh_daily_metric_peaks()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view public.main_data_latest_quarter;
  refresh materialized view public.main_data_quarterly_dedup;
  refresh materialized view public.main_data_peak_sales;
  refresh materialized view public.main_data_peak_pat;
  refresh materialized view public.main_data_peak_ebidta;
  refresh materialized view public.main_data_peak_gross_sales_margin;
  refresh materialized view public.main_data_peak_ebidta_margin;
  refresh materialized view public.main_data_peak_fii;
  refresh materialized view public.main_data_peak_dii;
  refresh materialized view public.roe_roce_peak_roe;
  refresh materialized view public.roe_roce_peak_roce;
$$;

revoke all on function public.refresh_daily_metric_peaks() from public, anon, authenticated;
grant execute on function public.refresh_daily_metric_peaks() to service_role;
