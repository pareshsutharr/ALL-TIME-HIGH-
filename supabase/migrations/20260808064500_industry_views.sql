-- Distinct industry lists for filter dropdowns, computed in Postgres so the
-- result set is small (~100 rows) instead of relying on the API's row cap.
create view public.companies_industries
  with (security_invoker = true) as
  select distinct industry
  from public.companies
  where industry is not null
  order by industry;

create view public.sme_companies_industries
  with (security_invoker = true) as
  select distinct industry
  from public.sme_companies
  where industry is not null
  order by industry;
