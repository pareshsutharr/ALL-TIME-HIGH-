-- Indian fiscal quarter (1-4) of a date: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec,
-- Q4 Jan-Mar. Matches formatFiscalQuarter() on the client and fiscal_year()
-- added earlier.
create or replace function public.fiscal_quarter(d date)
returns integer
language sql
immutable
as $$
  select case
    when extract(month from d) between 4 and 6 then 1
    when extract(month from d) between 7 and 9 then 2
    when extract(month from d) between 10 and 12 then 3
    else 4
  end;
$$;

drop view if exists public.company_metric_peaks;

create view public.company_metric_peaks
  with (security_invoker = true) as
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'sales'::text as metric,
    ps.peak_value, ps.peak_date,
    public.fiscal_year(ps.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(ps.peak_date) as peak_fiscal_quarter,
    ps.peak_basis
  from public.companies c
  join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'pat'::text as metric,
    pp.peak_value, pp.peak_date,
    public.fiscal_year(pp.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pp.peak_date) as peak_fiscal_quarter,
    pp.peak_basis
  from public.companies c
  join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'ebidta'::text as metric,
    pe.peak_value, pe.peak_date,
    public.fiscal_year(pe.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pe.peak_date) as peak_fiscal_quarter,
    pe.peak_basis
  from public.companies c
  join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code;
