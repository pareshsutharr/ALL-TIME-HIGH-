-- One row per company: the most recent reported quarter (by qtr_date_end),
-- preferring the Consolidated (C) figure over Standalone (S) when both exist
-- for that same quarter. Materialized because main_data has 1.38M rows and
-- this is derived, static (bulk-loaded) data — recomputing DISTINCT ON over
-- the whole table on every All Time High page load would be wasteful.
create materialized view public.main_data_latest_quarter as
select distinct on (accord_code)
  accord_code,
  qtr_date_end,
  qtr_net_sales,
  qtr_profit_after_tax,
  qtr_change_in_stocks,
  qtr_cost_of_services_raw_materials,
  qtr_purchase_of_finished_goods,
  qtr_operating_profit_excl_oi,
  qtr_pbidtm_pct_excl_oi,
  qtr_basis
from public.main_data
where qtr_date_end is not null
order by accord_code, qtr_date_end desc, (qtr_basis = 'C') desc;

create unique index main_data_latest_quarter_accord_code_idx
  on public.main_data_latest_quarter (accord_code);

grant select on public.main_data_latest_quarter to anon, authenticated;

-- Rebuilt All Time High view: BSE all-time-high only (better data coverage
-- than NSE: 5,480 vs 3,330 companies), company identity fields only
-- (no Sr.No./Accord Code/Sector/Industry columns), enriched with each
-- company's latest-quarter financials and derived metrics:
--   Sales               = QTR_Net Sales
--   PAT                 = QTR_Profit after tax
--   Gross Sales Margin  = Net Sales - Change in Stocks + Cost of Services &
--                         Raw Materials + Purchase of Finished Goods
--                         (missing sub-components treated as 0; the whole
--                         figure is only computed when Sales itself exists)
--   EBIDTA              = QTR_Operating Profit (Excl OI)
--   EBIDTA Margin       = QTR_PBIDTM% (Excl OI)
drop view if exists public.companies_ath_industries;
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
    q.qtr_pbidtm_pct_excl_oi as ebidta_margin
  from public.companies c
  left join public.main_data_latest_quarter q on q.accord_code = c.accord_code
  where c.bse_ath_price is not null and c.bse_ath_date is not null;
