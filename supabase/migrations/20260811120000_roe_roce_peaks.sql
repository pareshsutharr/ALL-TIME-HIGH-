-- ROE/ROCE peak-per-company views, same distinct-on pattern as
-- main_data_peak_fii/dii, now that roe_roce_data is loaded (see
-- scripts/generate_roe_roce_seed.py). Surface both as full peer metrics on
-- the main All-Time High tab, the company detail page, and the Custom ATH
-- page (mainboard + SME — roe_roce_data covers SME accord codes too).

create materialized view public.roe_roce_peak_roe as
select distinct on (accord_code)
  accord_code,
  roe_pct as peak_value,
  fy_date_end as peak_date,
  basis as peak_basis
from public.roe_roce_data
where roe_pct is not null and fy_date_end is not null
order by accord_code, roe_pct desc, fy_date_end desc;

create unique index roe_roce_peak_roe_accord_code_idx
  on public.roe_roce_peak_roe (accord_code);

create materialized view public.roe_roce_peak_roce as
select distinct on (accord_code)
  accord_code,
  roce_pct as peak_value,
  fy_date_end as peak_date,
  basis as peak_basis
from public.roe_roce_data
where roce_pct is not null and fy_date_end is not null
order by accord_code, roce_pct desc, fy_date_end desc;

create unique index roe_roce_peak_roce_accord_code_idx
  on public.roe_roce_peak_roce (accord_code);

grant select on public.roe_roce_peak_roe to anon, authenticated;
grant select on public.roe_roce_peak_roce to anon, authenticated;

-- Extend companies_ath (main All-Time High tab) with roe_peak/roce_peak.
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
    null::text as bse_52w_high_peak_basis,
    pr.peak_value as roe_peak,
    pr.peak_date as roe_peak_date,
    pr.peak_basis as roe_peak_basis,
    prc.peak_value as roce_peak,
    prc.peak_date as roce_peak_date,
    prc.peak_basis as roce_peak_basis
  from public.companies c
  left join public.main_data_latest_quarter q on q.accord_code = c.accord_code
  left join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  left join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  left join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code
  left join public.main_data_peak_gross_sales_margin pg on pg.accord_code = c.accord_code
  left join public.main_data_peak_ebidta_margin pm on pm.accord_code = c.accord_code
  left join public.main_data_peak_fii pf on pf.accord_code = c.accord_code
  left join public.main_data_peak_dii pd on pd.accord_code = c.accord_code
  left join public.roe_roce_peak_roe pr on pr.accord_code = c.accord_code
  left join public.roe_roce_peak_roce prc on prc.accord_code = c.accord_code
  where c.bse_ath_price is not null and c.bse_ath_date is not null;

-- Extend company_metric_peaks (Custom ATH page, mainboard) with roe/roce.
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
  where c.bse_52w_high_price is not null and c.bse_52w_high_date is not null
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'roe'::text as metric,
    pr.peak_value, pr.peak_date,
    public.fiscal_year(pr.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pr.peak_date) as peak_fiscal_quarter,
    pr.peak_basis
  from public.companies c
  join public.roe_roce_peak_roe pr on pr.accord_code = c.accord_code
  union all
  select
    c.id, c.accord_code, c.company_name, c.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'roce'::text as metric,
    prc.peak_value, prc.peak_date,
    public.fiscal_year(prc.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(prc.peak_date) as peak_fiscal_quarter,
    prc.peak_basis
  from public.companies c
  join public.roe_roce_peak_roce prc on prc.accord_code = c.accord_code;

-- Extend sme_company_metric_peaks (Custom ATH page, SME) with roe/roce.
drop view if exists public.sme_company_metric_peaks;

create view public.sme_company_metric_peaks
  with (security_invoker = true) as
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'sales'::text as metric,
    ps.peak_value, ps.peak_date,
    public.fiscal_year(ps.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(ps.peak_date) as peak_fiscal_quarter,
    ps.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_sales ps on ps.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'pat'::text as metric,
    pp.peak_value, pp.peak_date,
    public.fiscal_year(pp.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pp.peak_date) as peak_fiscal_quarter,
    pp.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_pat pp on pp.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'ebidta'::text as metric,
    pe.peak_value, pe.peak_date,
    public.fiscal_year(pe.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pe.peak_date) as peak_fiscal_quarter,
    pe.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_ebidta pe on pe.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'gross_sales_margin'::text as metric,
    pg.peak_value, pg.peak_date,
    public.fiscal_year(pg.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pg.peak_date) as peak_fiscal_quarter,
    pg.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_gross_sales_margin pg on pg.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'ebidta_margin'::text as metric,
    pm.peak_value, pm.peak_date,
    public.fiscal_year(pm.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pm.peak_date) as peak_fiscal_quarter,
    pm.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_ebidta_margin pm on pm.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'fii'::text as metric,
    pf.peak_value, pf.peak_date,
    public.fiscal_year(pf.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pf.peak_date) as peak_fiscal_quarter,
    pf.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_fii pf on pf.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'dii'::text as metric,
    pd.peak_value, pd.peak_date,
    public.fiscal_year(pd.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pd.peak_date) as peak_fiscal_quarter,
    pd.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_dii pd on pd.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'roe'::text as metric,
    pr.peak_value, pr.peak_date,
    public.fiscal_year(pr.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pr.peak_date) as peak_fiscal_quarter,
    pr.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.roe_roce_peak_roe pr on pr.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'roce'::text as metric,
    prc.peak_value, prc.peak_date,
    public.fiscal_year(prc.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(prc.peak_date) as peak_fiscal_quarter,
    prc.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.roe_roce_peak_roce prc on prc.accord_code = s.accord_code;
