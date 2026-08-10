-- Surface nse_symbol/bse_code everywhere the UI renders a company_name, so
-- every table can link a company straight out to its screener.in page
-- (https://www.screener.in/company/{nse_symbol|bse_code}/). Same join-on-
-- accord_code pattern as ipo_list_date_everywhere; sme_companies_enriched
-- and main_data_enriched had neither field at all, companies_ath and
-- company_metric_peaks already had nse_symbol but not bse_code.

drop view if exists public.sme_companies_enriched;

create view public.sme_companies_enriched
  with (security_invoker = true) as
  select s.*, c.ipo_list_date, c.nse_symbol, c.bse_code
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code;

drop view if exists public.main_data_enriched;

create view public.main_data_enriched
  with (security_invoker = true) as
  select m.*, c.ipo_list_date, c.nse_symbol, c.bse_code
  from public.main_data m
  left join public.companies c on c.accord_code = m.accord_code;

-- Free-text search path (search_main_data RPC) needs the same two columns.
drop function if exists public.search_main_data(text, text, integer, integer, integer);

create or replace function public.search_main_data(
  p_q text default null,
  p_industry text default null,
  p_year integer default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id bigint,
  source_year integer,
  accord_code integer,
  company_name text,
  isin text,
  industry text,
  qtr_date_end date,
  qtr_net_sales numeric,
  qtr_profit_after_tax numeric,
  qtr_change_in_stocks numeric,
  qtr_cost_of_services_raw_materials numeric,
  qtr_purchase_of_finished_goods numeric,
  qtr_operating_profit_excl_oi numeric,
  qtr_pbidtm_pct_excl_oi numeric,
  shp_date_end date,
  shp_institutions_pct numeric,
  shp_fii_pct numeric,
  shp_fvci_pct numeric,
  shp_fpi_pct numeric,
  shp_ffi_banks_pct numeric,
  shp_foreign_bodies_dr_pct numeric,
  qtr_basis text,
  ipo_list_date date,
  nse_symbol text,
  bse_code text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with matched as materialized (
    select
      m.id, m.source_year, m.accord_code, m.company_name, m.isin, m.industry,
      m.qtr_date_end, m.qtr_net_sales, m.qtr_profit_after_tax, m.qtr_change_in_stocks,
      m.qtr_cost_of_services_raw_materials, m.qtr_purchase_of_finished_goods,
      m.qtr_operating_profit_excl_oi, m.qtr_pbidtm_pct_excl_oi,
      m.shp_date_end, m.shp_institutions_pct, m.shp_fii_pct, m.shp_fvci_pct,
      m.shp_fpi_pct, m.shp_ffi_banks_pct, m.shp_foreign_bodies_dr_pct, m.qtr_basis
    from public.main_data m
    where (m.company_name ilike '%' || p_q || '%' or m.isin ilike '%' || p_q || '%')
      and (p_industry is null or m.industry = p_industry)
      and (p_year is null or m.source_year = p_year)
  )
  select matched.*, c.ipo_list_date, c.nse_symbol, c.bse_code, count(*) over() as total_count
  from matched
  left join public.companies c on c.accord_code = matched.accord_code
  order by matched.company_name asc, matched.qtr_date_end desc nulls last
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_main_data to anon, authenticated;

-- Add bse_code to companies_ath (nse_symbol already present).
drop view if exists public.companies_ath;

create view public.companies_ath
  with (security_invoker = true) as
  select
    c.id,
    c.accord_code,
    c.company_name,
    c.isin,
    c.nse_symbol,
    c.bse_code,
    c.ipo_list_date,
    c.bse_ath_price as ath_price,
    c.bse_ath_date as ath_date,
    q.qtr_date_end,
    q.qtr_basis,
    q.qtr_net_sales as sales,
    q.qtr_profit_after_tax as pat,
    case
      when q.qtr_net_sales is not null then
        coalesce(q.qtr_net_sales, 0)
        - coalesce(q.qtr_change_in_stocks, 0)
        + coalesce(q.qtr_cost_of_services_raw_materials, 0)
        + coalesce(q.qtr_purchase_of_finished_goods, 0)
    end as gross_sales_margin,
    q.qtr_operating_profit_excl_oi as ebidta,
    q.qtr_pbidtm_pct_excl_oi as ebidta_margin,
    ps.peak_value as sales_peak,
    ps.peak_date as sales_peak_date,
    ps.peak_basis as sales_peak_basis,
    pp.peak_value as pat_peak,
    pp.peak_date as pat_peak_date,
    pp.peak_basis as pat_peak_basis,
    pe.peak_value as ebidta_peak,
    pe.peak_date as ebidta_peak_date,
    pe.peak_basis as ebidta_peak_basis,
    pg.peak_value as gross_sales_margin_peak,
    pg.peak_date as gross_sales_margin_peak_date,
    pg.peak_basis as gross_sales_margin_peak_basis,
    pm.peak_value as ebidta_margin_peak,
    pm.peak_date as ebidta_margin_peak_date,
    pm.peak_basis as ebidta_margin_peak_basis,
    pf.peak_value as fii_peak,
    pf.peak_date as fii_peak_date,
    pf.peak_basis as fii_peak_basis,
    pd.peak_value as dii_peak,
    pd.peak_date as dii_peak_date,
    pd.peak_basis as dii_peak_basis,
    c.nse_52w_high_price as nse_52w_high_peak,
    c.nse_52w_high_date as nse_52w_high_peak_date,
    null::text as nse_52w_high_peak_basis,
    c.bse_52w_high_price as bse_52w_high_peak,
    c.bse_52w_high_date as bse_52w_high_peak_date,
    null::text as bse_52w_high_peak_basis
  from public.companies c
  left join public.main_data_latest_quarter q on q.accord_code = c.accord_code
  left join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  left join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  left join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code
  left join public.main_data_peak_gross_sales_margin pg on pg.accord_code = c.accord_code
  left join public.main_data_peak_ebidta_margin pm on pm.accord_code = c.accord_code
  left join public.main_data_peak_fii pf on pf.accord_code = c.accord_code
  left join public.main_data_peak_dii pd on pd.accord_code = c.accord_code
  where c.bse_ath_price is not null and c.bse_ath_date is not null;

-- Add bse_code to company_metric_peaks (nse_symbol already present).
drop view if exists public.company_metric_peaks;

create view public.company_metric_peaks
  with (security_invoker = true) as
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'sales'::text as metric,
    ps.peak_value, ps.peak_date,
    public.fiscal_year(ps.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(ps.peak_date) as peak_fiscal_quarter,
    ps.peak_basis
  from public.companies c
  join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'pat'::text as metric,
    pp.peak_value, pp.peak_date,
    public.fiscal_year(pp.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pp.peak_date) as peak_fiscal_quarter,
    pp.peak_basis
  from public.companies c
  join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'ebidta'::text as metric,
    pe.peak_value, pe.peak_date,
    public.fiscal_year(pe.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pe.peak_date) as peak_fiscal_quarter,
    pe.peak_basis
  from public.companies c
  join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'gross_sales_margin'::text as metric,
    pg.peak_value, pg.peak_date,
    public.fiscal_year(pg.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pg.peak_date) as peak_fiscal_quarter,
    pg.peak_basis
  from public.companies c
  join public.main_data_peak_gross_sales_margin pg on pg.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'ebidta_margin'::text as metric,
    pm.peak_value, pm.peak_date,
    public.fiscal_year(pm.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pm.peak_date) as peak_fiscal_quarter,
    pm.peak_basis
  from public.companies c
  join public.main_data_peak_ebidta_margin pm on pm.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'fii'::text as metric,
    pf.peak_value, pf.peak_date,
    public.fiscal_year(pf.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pf.peak_date) as peak_fiscal_quarter,
    pf.peak_basis
  from public.companies c
  join public.main_data_peak_fii pf on pf.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'dii'::text as metric,
    pd.peak_value, pd.peak_date,
    public.fiscal_year(pd.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pd.peak_date) as peak_fiscal_quarter,
    pd.peak_basis
  from public.companies c
  join public.main_data_peak_dii pd on pd.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'nse_52w_high'::text as metric,
    c.nse_52w_high_price as peak_value, c.nse_52w_high_date as peak_date,
    public.fiscal_year(c.nse_52w_high_date) as peak_fiscal_year,
    public.fiscal_quarter(c.nse_52w_high_date) as peak_fiscal_quarter,
    null::text as peak_basis
  from public.companies c
  where c.nse_52w_high_price is not null and c.nse_52w_high_date is not null
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'bse_52w_high'::text as metric,
    c.bse_52w_high_price as peak_value, c.bse_52w_high_date as peak_date,
    public.fiscal_year(c.bse_52w_high_date) as peak_fiscal_year,
    public.fiscal_quarter(c.bse_52w_high_date) as peak_fiscal_quarter,
    null::text as peak_basis
  from public.companies c
  where c.bse_52w_high_price is not null and c.bse_52w_high_date is not null;
