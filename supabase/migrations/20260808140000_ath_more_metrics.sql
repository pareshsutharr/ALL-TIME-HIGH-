-- Two more per-company peak metrics, same pattern as sales/pat/ebidta.
-- Gross Sales Margin isn't a raw column — it's the same derived formula used
-- in companies_ath: Net Sales - Change in Stocks + Cost of Services & Raw
-- Materials + Purchase of Finished Goods (missing sub-components as 0).
create materialized view public.main_data_peak_gross_sales_margin as
select distinct on (accord_code)
  accord_code,
  (
    coalesce(qtr_net_sales, 0)
    - coalesce(qtr_change_in_stocks, 0)
    + coalesce(qtr_cost_of_services_raw_materials, 0)
    + coalesce(qtr_purchase_of_finished_goods, 0)
  ) as peak_value,
  qtr_date_end as peak_date,
  qtr_basis as peak_basis
from public.main_data
where qtr_net_sales is not null and qtr_date_end is not null
order by
  accord_code,
  (
    coalesce(qtr_net_sales, 0)
    - coalesce(qtr_change_in_stocks, 0)
    + coalesce(qtr_cost_of_services_raw_materials, 0)
    + coalesce(qtr_purchase_of_finished_goods, 0)
  ) desc,
  qtr_date_end desc;

create unique index main_data_peak_gross_sales_margin_accord_code_idx
  on public.main_data_peak_gross_sales_margin (accord_code);

create materialized view public.main_data_peak_ebidta_margin as
select distinct on (accord_code)
  accord_code,
  qtr_pbidtm_pct_excl_oi as peak_value,
  qtr_date_end as peak_date,
  qtr_basis as peak_basis
from public.main_data
where qtr_pbidtm_pct_excl_oi is not null
order by accord_code, qtr_pbidtm_pct_excl_oi desc, qtr_date_end desc;

create unique index main_data_peak_ebidta_margin_accord_code_idx
  on public.main_data_peak_ebidta_margin (accord_code);

grant select on public.main_data_peak_gross_sales_margin to anon, authenticated;
grant select on public.main_data_peak_ebidta_margin to anon, authenticated;

-- Extend company_metric_peaks (Custom ATH page) with the two new metrics.
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
  join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'gross_sales_margin'::text as metric,
    pg.peak_value, pg.peak_date,
    public.fiscal_year(pg.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pg.peak_date) as peak_fiscal_quarter,
    pg.peak_basis
  from public.companies c
  join public.main_data_peak_gross_sales_margin pg on pg.accord_code = c.accord_code
  union all
  select
    c.id, c.company_name, c.isin, c.nse_symbol,
    'ebidta_margin'::text as metric,
    pm.peak_value, pm.peak_date,
    public.fiscal_year(pm.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pm.peak_date) as peak_fiscal_quarter,
    pm.peak_basis
  from public.companies c
  join public.main_data_peak_ebidta_margin pm on pm.accord_code = c.accord_code;

-- Extend companies_ath (main All Time High tab) with the two new peak metrics.
drop view if exists public.companies_ath;

create view public.companies_ath
  with (security_invoker = true) as
  select
    c.id,
    c.company_name,
    c.isin,
    c.nse_symbol,
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
