-- Combined quarterly financials + shareholding pattern data from the yearly
-- Accord Fintech exports (2001.xlsx .. 2026.xlsx). Each source row already
-- cross-joins one quarterly result with one shareholding-pattern snapshot
-- for a company; source_year records which yearly file a row came from.
create table public.main_data (
  id bigint generated always as identity primary key,
  source_year integer not null,
  accord_code integer not null,
  company_name text not null,
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
  created_at timestamptz not null default now()
);

create index main_data_accord_code_idx on public.main_data (accord_code);
create index main_data_isin_idx on public.main_data (isin);
create index main_data_company_name_trgm_idx on public.main_data using gin (company_name extensions.gin_trgm_ops);
create index main_data_industry_idx on public.main_data (industry);
create index main_data_source_year_idx on public.main_data (source_year);
create index main_data_qtr_date_end_idx on public.main_data (qtr_date_end);
create index main_data_shp_date_end_idx on public.main_data (shp_date_end);

alter table public.main_data enable row level security;

create policy "Public read access"
  on public.main_data
  for select
  to anon, authenticated
  using (true);

create view public.main_data_industries
  with (security_invoker = true) as
  select distinct industry
  from public.main_data
  where industry is not null
  order by industry;
