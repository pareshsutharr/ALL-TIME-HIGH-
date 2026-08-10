-- Surface ipo_list_date (already on public.companies) in every dataset the
-- UI renders as a table. companies itself already has the column; the rest
-- get it via a left join on accord_code, which is a shared, unique key
-- across companies/sme_companies/main_data (verified: 1132/1155 sme_companies
-- rows and effectively all main_data rows resolve to a companies match;
-- unmatched rows just get a null ipo_list_date).

-- SME companies (SmeTable): thin wrapper table, no direct column for this.
create view public.sme_companies_enriched
  with (security_invoker = true) as
  select s.*, c.ipo_list_date
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code;

-- Main data (MainDataTable): 1.38M-row table, no direct column for this.
-- Plain-query path (no free-text search) uses this view directly.
create view public.main_data_enriched
  with (security_invoker = true) as
  select m.*, c.ipo_list_date
  from public.main_data m
  left join public.companies c on c.accord_code = m.accord_code;

-- Free-text search path (search_main_data RPC) needs the same join added.
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
  select matched.*, c.ipo_list_date, count(*) over() as total_count
  from matched
  left join public.companies c on c.accord_code = matched.accord_code
  order by matched.company_name asc, matched.qtr_date_end desc nulls last
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_main_data to anon, authenticated;

-- All-Time High tab (AthTable): rebuild companies_ath with ipo_list_date
-- added, same shape as the 20260808140000 version otherwise.
drop view if exists public.companies_ath;

create view public.companies_ath
  with (security_invoker = true) as
  select
    c.id,
    c.company_name,
    c.isin,
    c.nse_symbol,
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
    pm.peak_basis as ebidta_margin_peak_basis
  from public.companies c
  left join public.main_data_latest_quarter q on q.accord_code = c.accord_code
  left join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  left join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  left join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code
  left join public.main_data_peak_gross_sales_margin pg on pg.accord_code = c.accord_code
  left join public.main_data_peak_ebidta_margin pm on pm.accord_code = c.accord_code
  where c.bse_ath_price is not null and c.bse_ath_date is not null;

-- Custom ATH page (CustomAthTable): rebuild company_metric_peaks with
-- ipo_list_date added to every branch.
drop view if exists public.company_metric_peaks;

create view public.company_metric_peaks
  with (security_invoker = true) as
  select
    c.id, c.company_name, c.isin, c.nse_symbol, c.ipo_list_date,
    'sales'::text as metric,
    ps.peak_value, ps.peak_date,
    public.fiscal_year(ps.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(ps.peak_date) as peak_fiscal_quarter,
    ps.peak_basis
  from public.companies c
  join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol, c.ipo_list_date,
    'pat'::text as metric,
    pp.peak_value, pp.peak_date,
    public.fiscal_year(pp.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pp.peak_date) as peak_fiscal_quarter,
    pp.peak_basis
  from public.companies c
  join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol, c.ipo_list_date,
    'ebidta'::text as metric,
    pe.peak_value, pe.peak_date,
    public.fiscal_year(pe.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pe.peak_date) as peak_fiscal_quarter,
    pe.peak_basis
  from public.companies c
  join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol, c.ipo_list_date,
    'gross_sales_margin'::text as metric,
    pg.peak_value, pg.peak_date,
    public.fiscal_year(pg.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pg.peak_date) as peak_fiscal_quarter,
    pg.peak_basis
  from public.companies c
  join public.main_data_peak_gross_sales_margin pg on pg.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol, c.ipo_list_date,
    'ebidta_margin'::text as metric,
    pm.peak_value, pm.peak_date,
    public.fiscal_year(pm.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pm.peak_date) as peak_fiscal_quarter,
    pm.peak_basis
  from public.companies c
  join public.main_data_peak_ebidta_margin pm on pm.accord_code = c.accord_code;
