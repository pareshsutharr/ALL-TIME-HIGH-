-- Sector (industry) performance by quarter, for the "Top Sector" home page
-- card — which industry has the highest combined Net Sales in a given
-- fiscal year (or fiscal year + quarter).
--
-- main_data cross-joins one quarterly result with one shareholding-pattern
-- snapshot per company (see main_data.sql's own comment), so the same
-- (accord_code, qtr_date_end) can appear multiple times with an identical
-- qtr_net_sales/qtr_profit_after_tax but a different shp_date_end. Dedup on
-- (accord_code, qtr_date_end) first — preferring Consolidated over
-- Standalone, the same tie-break main_data_latest_quarter uses — before
-- summing, or industries with heavier cross-join duplication would be
-- inflated relative to others.
create materialized view public.main_data_quarterly_dedup as
select distinct on (accord_code, qtr_date_end)
  accord_code,
  industry,
  qtr_date_end,
  qtr_net_sales,
  qtr_profit_after_tax,
  qtr_basis,
  public.fiscal_year(qtr_date_end) as fiscal_year,
  public.fiscal_quarter(qtr_date_end) as fiscal_quarter
from public.main_data
where qtr_date_end is not null
order by accord_code, qtr_date_end, (qtr_basis = 'C') desc;

create index main_data_quarterly_dedup_industry_idx
  on public.main_data_quarterly_dedup (industry, fiscal_year, fiscal_quarter);

grant select on public.main_data_quarterly_dedup to anon, authenticated;

-- Per industry, per fiscal quarter.
create view public.industry_quarterly_sales
  with (security_invoker = true) as
select
  industry,
  fiscal_year,
  fiscal_quarter,
  sum(qtr_net_sales) as total_sales,
  sum(qtr_profit_after_tax) as total_pat,
  count(distinct accord_code) as company_count
from public.main_data_quarterly_dedup
where industry is not null and qtr_net_sales is not null
group by industry, fiscal_year, fiscal_quarter;

-- Per industry, per full fiscal year (all quarters combined) — used when
-- the card's quarter filter is "All quarters".
create view public.industry_yearly_sales
  with (security_invoker = true) as
select
  industry,
  fiscal_year,
  sum(qtr_net_sales) as total_sales,
  sum(qtr_profit_after_tax) as total_pat,
  count(distinct accord_code) as company_count
from public.main_data_quarterly_dedup
where industry is not null and qtr_net_sales is not null
group by industry, fiscal_year;
