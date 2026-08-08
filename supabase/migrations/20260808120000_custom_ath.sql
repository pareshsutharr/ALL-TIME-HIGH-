-- Indian fiscal year (Apr-Mar) of a date, e.g. 2026-01-15 -> 2026,
-- 2025-04-15 -> 2026. Matches the "Qn FYyyyy" labels used throughout the UI.
create or replace function public.fiscal_year(d date)
returns integer
language sql
immutable
as $$
  select case
    when extract(month from d) >= 4 then extract(year from d)::int + 1
    else extract(year from d)::int
  end;
$$;

-- One row per (company, metric) for every company that has ever recorded a
-- peak in that metric — independent of whether the company also has a BSE
-- stock-price all-time-high (this is about financial-metric records, not
-- price records). Lets the "Custom ATH" page ask "which companies' all-time
-- peak for metric X fell in fiscal year Y" via a single WHERE clause.
create view public.company_metric_peaks
  with (security_invoker = true) as
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'sales'::text as metric,
    ps.peak_value, ps.peak_date, public.fiscal_year(ps.peak_date) as peak_fiscal_year, ps.peak_basis
  from public.companies c
  join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'pat'::text as metric,
    pp.peak_value, pp.peak_date, public.fiscal_year(pp.peak_date) as peak_fiscal_year, pp.peak_basis
  from public.companies c
  join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'ebidta'::text as metric,
    pe.peak_value, pe.peak_date, public.fiscal_year(pe.peak_date) as peak_fiscal_year, pe.peak_basis
  from public.companies c
  join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code;
