-- Dedicated "All Time High" view: one ATH row per company, preferring NSE
-- price/date when both are present, falling back to BSE, and excluding
-- companies where neither exchange has a complete price+date pair.
create view public.companies_ath
  with (security_invoker = true) as
  select *
  from (
    select
      id,
      accord_code,
      company_name,
      isin,
      industry,
      sector,
      nse_symbol,
      case
        when nse_ath_price is not null and nse_ath_date is not null then nse_ath_price
        when bse_ath_price is not null and bse_ath_date is not null then bse_ath_price
      end as ath_price,
      case
        when nse_ath_price is not null and nse_ath_date is not null then nse_ath_date
        when bse_ath_price is not null and bse_ath_date is not null then bse_ath_date
      end as ath_date,
      case
        when nse_ath_price is not null and nse_ath_date is not null then 'NSE'
        when bse_ath_price is not null and bse_ath_date is not null then 'BSE'
      end as ath_exchange
    from public.companies
  ) t
  where ath_price is not null and ath_date is not null;

create view public.companies_ath_industries
  with (security_invoker = true) as
  select distinct industry
  from public.companies_ath
  where industry is not null
  order by industry;
