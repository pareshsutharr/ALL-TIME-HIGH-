-- The diff-aware daily upload needs to fetch EXISTING rows for the exact
-- (accord_code, qtr_date_end) / (accord_code, fy_date_end) pairs in a file
-- before deciding what changed. Doing that with two separate `.in()`
-- filters (accord_code IN (...) AND qtr_date_end IN (...)) is a cross
-- product, not a pair match — for a real daily file this matched 40,000+
-- main_data rows for a single ~260-company batch (each company's entire
-- quarterly history intersected with every date anyone in the batch
-- reported), which silently truncated at PostgREST's 1000-row response cap
-- and made almost every row look "new" even when it already existed.
--
-- These functions do the pair match server-side via a join against
-- jsonb_to_recordset, so only rows that actually match a requested pair
-- come back.
create or replace function public.get_main_data_for_quarters(pairs jsonb)
returns table (
  accord_code integer,
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
  shp_foreign_bodies_dr_pct numeric
)
language sql
security definer
set search_path = public
as $$
  select
    md.accord_code, md.qtr_date_end, md.qtr_net_sales, md.qtr_profit_after_tax,
    md.qtr_change_in_stocks, md.qtr_cost_of_services_raw_materials, md.qtr_purchase_of_finished_goods,
    md.qtr_operating_profit_excl_oi, md.qtr_pbidtm_pct_excl_oi, md.shp_date_end,
    md.shp_institutions_pct, md.shp_fii_pct, md.shp_fvci_pct, md.shp_fpi_pct,
    md.shp_ffi_banks_pct, md.shp_foreign_bodies_dr_pct
  from public.main_data md
  join jsonb_to_recordset(pairs) as p(accord_code integer, qtr_date_end date)
    on md.accord_code = p.accord_code and md.qtr_date_end = p.qtr_date_end;
$$;

revoke all on function public.get_main_data_for_quarters(jsonb) from public, anon, authenticated;
grant execute on function public.get_main_data_for_quarters(jsonb) to service_role;

create or replace function public.get_roe_roce_for_pairs(pairs jsonb)
returns table (
  accord_code integer,
  fy_date_end date,
  roe_pct numeric,
  roce_pct numeric
)
language sql
security definer
set search_path = public
as $$
  select rr.accord_code, rr.fy_date_end, rr.roe_pct, rr.roce_pct
  from public.roe_roce_data rr
  join jsonb_to_recordset(pairs) as p(accord_code integer, fy_date_end date)
    on rr.accord_code = p.accord_code and rr.fy_date_end = p.fy_date_end;
$$;

revoke all on function public.get_roe_roce_for_pairs(jsonb) from public, anon, authenticated;
grant execute on function public.get_roe_roce_for_pairs(jsonb) to service_role;
