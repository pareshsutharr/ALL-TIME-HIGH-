-- Add FII and DII as full peer metrics alongside Sales/PAT/EBIDTA/Gross Sales
-- Margin/EBIDTA Margin, on both the Custom ATH page and the main All-Time
-- High tab's metric selector.
--
-- Source data has no direct DII column, and "FII" changed meaning mid-2014
-- when SEBI renamed the "Foreign Institutional Investors" shareholding
-- category to "Foreign Portfolio Investors" (shp_fii_pct is populated pre-
-- 2014, shp_fpi_pct after). Definitions used here (confirmed against
-- Reliance Industries and a 99.9%-consistent superset check across 950k
-- main_data rows):
--   FII = shp_fii_pct + shp_fpi_pct        (covers the full timeline)
--   DII = shp_institutions_pct             ("Institutions" is a total that
--         - shp_fii_pct - shp_fpi_pct        already includes the foreign
--         - shp_fvci_pct - shp_ffi_banks_pct sub-categories, so DII is what's
--                                             left after removing them)
-- DII is floored at 0 (excluded rather than surfaced as a negative peak) to
-- avoid the ~0.1% of rows where source data inconsistencies make the
-- subtraction go negative.

create materialized view public.main_data_peak_fii as
select distinct on (accord_code)
  accord_code,
  (coalesce(shp_fii_pct, 0) + coalesce(shp_fpi_pct, 0)) as peak_value,
  shp_date_end as peak_date,
  null::text as peak_basis
from public.main_data
where (shp_fii_pct is not null or shp_fpi_pct is not null) and shp_date_end is not null
order by
  accord_code,
  (coalesce(shp_fii_pct, 0) + coalesce(shp_fpi_pct, 0)) desc,
  shp_date_end desc;

create unique index main_data_peak_fii_accord_code_idx
  on public.main_data_peak_fii (accord_code);

create materialized view public.main_data_peak_dii as
select distinct on (accord_code)
  accord_code,
  (
    shp_institutions_pct
    - coalesce(shp_fii_pct, 0)
    - coalesce(shp_fpi_pct, 0)
    - coalesce(shp_fvci_pct, 0)
    - coalesce(shp_ffi_banks_pct, 0)
  ) as peak_value,
  shp_date_end as peak_date,
  null::text as peak_basis
from public.main_data
where
  shp_institutions_pct is not null
  and shp_date_end is not null
  and (
    shp_institutions_pct
    - coalesce(shp_fii_pct, 0)
    - coalesce(shp_fpi_pct, 0)
    - coalesce(shp_fvci_pct, 0)
    - coalesce(shp_ffi_banks_pct, 0)
  ) >= 0
order by
  accord_code,
  (
    shp_institutions_pct
    - coalesce(shp_fii_pct, 0)
    - coalesce(shp_fpi_pct, 0)
    - coalesce(shp_fvci_pct, 0)
    - coalesce(shp_ffi_banks_pct, 0)
  ) desc,
  shp_date_end desc;

create unique index main_data_peak_dii_accord_code_idx
  on public.main_data_peak_dii (accord_code);

grant select on public.main_data_peak_fii to anon, authenticated;
grant select on public.main_data_peak_dii to anon, authenticated;

-- Extend company_metric_peaks (Custom ATH page) with the two new metrics.
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
  join public.main_data_peak_ebidta_margin pm on pm.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol, c.ipo_list_date,
    'fii'::text as metric,
    pf.peak_value, pf.peak_date,
    public.fiscal_year(pf.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pf.peak_date) as peak_fiscal_quarter,
    pf.peak_basis
  from public.companies c
  join public.main_data_peak_fii pf on pf.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol, c.ipo_list_date,
    'dii'::text as metric,
    pd.peak_value, pd.peak_date,
    public.fiscal_year(pd.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pd.peak_date) as peak_fiscal_quarter,
    pd.peak_basis
  from public.companies c
  join public.main_data_peak_dii pd on pd.accord_code = c.accord_code;

-- Extend companies_ath (main All-Time High tab) with fii_peak/dii_peak so the
-- metric dropdown there ("Sort by All-Time High FII/DII") has a real column
-- to order by, matching the existing *_peak naming convention.
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
    pm.peak_basis as ebidta_margin_peak_basis,
    pf.peak_value as fii_peak,
    pf.peak_date as fii_peak_date,
    pf.peak_basis as fii_peak_basis,
    pd.peak_value as dii_peak,
    pd.peak_date as dii_peak_date,
    pd.peak_basis as dii_peak_basis
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
