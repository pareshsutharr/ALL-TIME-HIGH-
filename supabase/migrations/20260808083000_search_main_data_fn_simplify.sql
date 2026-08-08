-- The unfiltered branch of search_main_data (added in
-- 20260808082000_search_main_data_fn_fix.sql) turned out to have its own
-- problem: `count(*) over()` forces Postgres to materialize the window
-- aggregate over the *entire* matching set before LIMIT can apply, which for
-- an unfiltered query means scanning all 1.38M rows regardless of the index
-- that otherwise makes that query near-instant. That defeated the very index
-- this function was meant to route around.
--
-- Equality filters (industry, source_year) are estimated accurately by
-- Postgres and don't trigger the original bad-plan problem at all (verified
-- via EXPLAIN ANALYZE under the anon role: ~1ms). So this function now only
-- needs to handle the text-search (ilike) path; the app falls back to the
-- plain PostgREST query builder — with its separate, cheap count=exact
-- query — for the no-search-term case.
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
  select matched.*, count(*) over() as total_count
  from matched
  order by matched.company_name asc, matched.qtr_date_end desc nulls last
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_main_data to anon, authenticated;
