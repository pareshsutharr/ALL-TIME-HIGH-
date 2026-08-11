-- Custom ATH by Year (company_metric_peaks) is built entirely from
-- public.companies, so it has only ever covered mainboard companies — SME
-- companies were silently excluded. Add the SME equivalent so the page can
-- toggle between Mainboard and SME boards.
--
-- sme_companies carries no price-history columns (see init_companies.sql),
-- so the two 52-week-high metrics — which company_metric_peaks sources
-- directly from companies.nse_52w_high_price/bse_52w_high_price rather than
-- from main_data — have no SME equivalent. This view only unions the seven
-- metrics that come from main_data peak views (sales, PAT, EBIDTA, gross
-- sales margin, EBIDTA margin, FII, DII), keyed by accord_code same as
-- company_metric_peaks. nse_symbol/bse_code/ipo_list_date are looked up via
-- the same left join to companies used by sme_companies_enriched — normally
-- null since SME and mainboard accord codes don't overlap in practice.

create view public.sme_company_metric_peaks
  with (security_invoker = true) as
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'sales'::text as metric,
    ps.peak_value, ps.peak_date,
    public.fiscal_year(ps.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(ps.peak_date) as peak_fiscal_quarter,
    ps.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_sales ps on ps.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'pat'::text as metric,
    pp.peak_value, pp.peak_date,
    public.fiscal_year(pp.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pp.peak_date) as peak_fiscal_quarter,
    pp.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_pat pp on pp.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'ebidta'::text as metric,
    pe.peak_value, pe.peak_date,
    public.fiscal_year(pe.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pe.peak_date) as peak_fiscal_quarter,
    pe.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_ebidta pe on pe.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'gross_sales_margin'::text as metric,
    pg.peak_value, pg.peak_date,
    public.fiscal_year(pg.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pg.peak_date) as peak_fiscal_quarter,
    pg.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_gross_sales_margin pg on pg.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'ebidta_margin'::text as metric,
    pm.peak_value, pm.peak_date,
    public.fiscal_year(pm.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pm.peak_date) as peak_fiscal_quarter,
    pm.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_ebidta_margin pm on pm.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'fii'::text as metric,
    pf.peak_value, pf.peak_date,
    public.fiscal_year(pf.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pf.peak_date) as peak_fiscal_quarter,
    pf.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_fii pf on pf.accord_code = s.accord_code
  union all
  select
    s.id, s.accord_code, s.company_name, s.isin, c.nse_symbol, c.bse_code, c.ipo_list_date,
    'dii'::text as metric,
    pd.peak_value, pd.peak_date,
    public.fiscal_year(pd.peak_date) as peak_fiscal_year,
    public.fiscal_quarter(pd.peak_date) as peak_fiscal_quarter,
    pd.peak_basis
  from public.sme_companies s
  left join public.companies c on c.accord_code = s.accord_code
  join public.main_data_peak_dii pd on pd.accord_code = s.accord_code;
