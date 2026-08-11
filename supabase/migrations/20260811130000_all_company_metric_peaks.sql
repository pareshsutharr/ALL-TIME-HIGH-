-- "All Listed" board for the Custom ATH page — a straight union of the
-- mainboard and SME peak views. Both already share the exact same column
-- list/order (id, accord_code, company_name, isin, nse_symbol, bse_code,
-- ipo_list_date, metric, peak_value, peak_date, peak_fiscal_year,
-- peak_fiscal_quarter, peak_basis), so this is just composition — no new
-- logic. `id` is not unique across the union (each source table has its own
-- identity sequence), so callers must key rows by accord_code, not id.
create view public.all_company_metric_peaks
  with (security_invoker = true) as
  select * from public.company_metric_peaks
  union all
  select * from public.sme_company_metric_peaks;
