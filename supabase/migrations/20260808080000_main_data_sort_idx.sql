-- Every main_data query orders by (company_name, qtr_date_end desc), including
-- the unfiltered first page. Without a supporting index this forces a full
-- sequential scan + sort of all 1.38M rows even with LIMIT 25, which was
-- blowing the API role's statement timeout (57014). This index turns it into
-- a plain index scan.
create index main_data_company_name_date_idx
  on public.main_data (company_name, qtr_date_end desc nulls last);
