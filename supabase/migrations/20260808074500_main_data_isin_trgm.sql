-- The company_name.ilike/isin.ilike OR search on main_data was falling back
-- to a sequential scan for the isin branch (only a plain btree existed,
-- which can't serve a leading-wildcard ILIKE), blowing the statement
-- timeout on the 1.38M-row table. Add a trigram index to match company_name.
create index main_data_isin_trgm_idx on public.main_data using gin (isin extensions.gin_trgm_ops);
