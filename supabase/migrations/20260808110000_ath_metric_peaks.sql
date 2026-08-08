-- For each company, the single best quarter ever reported for Sales, PAT,
-- and EBIDTA respectively (independent per metric — a company's peak Sales
-- quarter is often not the same quarter as its peak PAT or EBIDTA). Ties on
-- the metric value break on the most recent qtr_date_end. Materialized for
-- the same reason as main_data_latest_quarter: this scans all 1.38M
-- main_data rows and is static, bulk-loaded data.
create materialized view public.main_data_peak_sales as
select distinct on (accord_code)
  accord_code,
  qtr_net_sales as peak_value,
  qtr_date_end as peak_date,
  qtr_basis as peak_basis
from public.main_data
where qtr_net_sales is not null
order by accord_code, qtr_net_sales desc, qtr_date_end desc;

create unique index main_data_peak_sales_accord_code_idx
  on public.main_data_peak_sales (accord_code);

create materialized view public.main_data_peak_pat as
select distinct on (accord_code)
  accord_code,
  qtr_profit_after_tax as peak_value,
  qtr_date_end as peak_date,
  qtr_basis as peak_basis
from public.main_data
where qtr_profit_after_tax is not null
order by accord_code, qtr_profit_after_tax desc, qtr_date_end desc;

create unique index main_data_peak_pat_accord_code_idx
  on public.main_data_peak_pat (accord_code);

create materialized view public.main_data_peak_ebidta as
select distinct on (accord_code)
  accord_code,
  qtr_operating_profit_excl_oi as peak_value,
  qtr_date_end as peak_date,
  qtr_basis as peak_basis
from public.main_data
where qtr_operating_profit_excl_oi is not null
order by accord_code, qtr_operating_profit_excl_oi desc, qtr_date_end desc;

create unique index main_data_peak_ebidta_accord_code_idx
  on public.main_data_peak_ebidta (accord_code);

grant select on public.main_data_peak_sales to anon, authenticated;
grant select on public.main_data_peak_pat to anon, authenticated;
grant select on public.main_data_peak_ebidta to anon, authenticated;

-- Rebuild companies_ath to also expose each company's all-time peak for
-- Sales / PAT / EBIDTA (value + the quarter + basis it happened in),
-- alongside the existing latest-quarter figures.
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
    pe.peak_basis as ebidta_peak_basis
  from public.companies c
  left join public.main_data_latest_quarter q on q.accord_code = c.accord_code
  left join public.main_data_peak_sales ps on ps.accord_code = c.accord_code
  left join public.main_data_peak_pat pp on pp.accord_code = c.accord_code
  left join public.main_data_peak_ebidta pe on pe.accord_code = c.accord_code
  where c.bse_ath_price is not null and c.bse_ath_date is not null;
