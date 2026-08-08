create extension if not exists pg_trgm with schema extensions;

-- Companies master list (Data_One_time.xlsx): listed companies with price-high stats.
create table public.companies (
  id bigint generated always as identity primary key,
  accord_code integer not null unique,
  company_name text not null,
  ipo_list_date date,
  isin text,
  industry text,
  sector text,
  nse_symbol text,
  bse_code text,
  bse_52w_high_date date,
  bse_52w_high_price numeric,
  bse_ath_date date,
  bse_ath_price numeric,
  nse_52w_high_date date,
  nse_52w_high_price numeric,
  nse_ath_date date,
  nse_ath_price numeric,
  created_at timestamptz not null default now()
);

create index companies_company_name_trgm_idx on public.companies using gin (company_name extensions.gin_trgm_ops);
create index companies_industry_idx on public.companies (industry);
create index companies_sector_idx on public.companies (sector);

alter table public.companies enable row level security;

create policy "Public read access"
  on public.companies
  for select
  to anon, authenticated
  using (true);

-- SME company list (Data_SME_list.xlsx): lighter record, kept as its own table.
create table public.sme_companies (
  id bigint generated always as identity primary key,
  accord_code integer not null unique,
  company_name text not null,
  isin text,
  industry text,
  created_at timestamptz not null default now()
);

create index sme_companies_company_name_trgm_idx on public.sme_companies using gin (company_name extensions.gin_trgm_ops);
create index sme_companies_industry_idx on public.sme_companies (industry);

alter table public.sme_companies enable row level security;

create policy "Public read access"
  on public.sme_companies
  for select
  to anon, authenticated
  using (true);
