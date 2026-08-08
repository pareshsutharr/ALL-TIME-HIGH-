-- Postgres badly overestimates selectivity for `ilike '%term%'` patterns on
-- main_data (e.g. estimates ~108k matches for '%jio%' when the true count is
-- 93). Combined with the company_name/qtr_date_end sort index, that pushes
-- the planner into scanning the table in sort order hoping to find LIMIT
-- matches quickly, which can read hundreds of thousands of rows before it
-- does. A `materialized` CTE forces the filter (which does use the trgm
-- indexes correctly) to run to completion before the sort/limit, sidestepping
-- the bad estimate. Only the text-search path needs this fence: plain
-- industry/year equality filters are estimated accurately and don't hit the
-- same trap, so they go through the plain (index-scan-friendly) path.
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
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
begin
  if p_q is not null and p_q <> '' then
    return query
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
  else
    return query
    select
      m.id, m.source_year, m.accord_code, m.company_name, m.isin, m.industry,
      m.qtr_date_end, m.qtr_net_sales, m.qtr_profit_after_tax, m.qtr_change_in_stocks,
      m.qtr_cost_of_services_raw_materials, m.qtr_purchase_of_finished_goods,
      m.qtr_operating_profit_excl_oi, m.qtr_pbidtm_pct_excl_oi,
      m.shp_date_end, m.shp_institutions_pct, m.shp_fii_pct, m.shp_fvci_pct,
      m.shp_fpi_pct, m.shp_ffi_banks_pct, m.shp_foreign_bodies_dr_pct, m.qtr_basis,
      count(*) over() as total_count
    from public.main_data m
    where (p_industry is null or m.industry = p_industry)
      and (p_year is null or m.source_year = p_year)
    order by m.company_name asc, m.qtr_date_end desc nulls last
    limit p_limit offset p_offset;
  end if;
end;
$$;

grant execute on function public.search_main_data to anon, authenticated;
