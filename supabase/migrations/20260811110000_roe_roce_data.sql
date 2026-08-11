-- ROE/ROCE annual financial-ratio history (data/roc_roce.xlsx), one row per
-- company per fiscal-year-end + basis (S/C). Same accord_code join key as
-- main_data, but annual cadence (FR_Year End) rather than quarterly, and no
-- natural join key back to main_data's cross-joined quarterly rows — so this
-- gets its own table rather than new main_data columns. Loaded out-of-band
-- via scripts/generate_roe_roce_seed.py (same pattern as main_data's yearly
-- seed files); the peak views over this table are added in a follow-up
-- migration once the data is loaded.
create table public.roe_roce_data (
  id bigint generated always as identity primary key,
  accord_code integer not null,
  company_name text not null,
  isin text,
  industry text,
  fy_date_end date,
  roe_pct numeric,
  roce_pct numeric,
  basis text,
  created_at timestamptz not null default now()
);

create index roe_roce_data_accord_code_idx on public.roe_roce_data (accord_code);
create index roe_roce_data_fy_date_end_idx on public.roe_roce_data (fy_date_end);

alter table public.roe_roce_data enable row level security;

create policy "Public read access"
  on public.roe_roce_data
  for select
  to anon, authenticated
  using (true);
