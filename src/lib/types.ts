export type Company = {
  id: number;
  accord_code: number;
  company_name: string;
  ipo_list_date: string | null;
  isin: string | null;
  industry: string | null;
  sector: string | null;
  nse_symbol: string | null;
  bse_code: string | null;
  bse_52w_high_date: string | null;
  bse_52w_high_price: number | null;
  bse_ath_date: string | null;
  bse_ath_price: number | null;
  nse_52w_high_date: string | null;
  nse_52w_high_price: number | null;
  nse_ath_date: string | null;
  nse_ath_price: number | null;
};

export type SmeCompany = {
  id: number;
  accord_code: number;
  company_name: string;
  isin: string | null;
  industry: string | null;
};

export type MainData = {
  id: number;
  source_year: number;
  accord_code: number;
  company_name: string;
  isin: string | null;
  industry: string | null;
  qtr_date_end: string | null;
  qtr_net_sales: number | null;
  qtr_profit_after_tax: number | null;
  qtr_change_in_stocks: number | null;
  qtr_cost_of_services_raw_materials: number | null;
  qtr_purchase_of_finished_goods: number | null;
  qtr_operating_profit_excl_oi: number | null;
  qtr_pbidtm_pct_excl_oi: number | null;
  shp_date_end: string | null;
  shp_institutions_pct: number | null;
  shp_fii_pct: number | null;
  shp_fvci_pct: number | null;
  shp_fpi_pct: number | null;
  shp_ffi_banks_pct: number | null;
  shp_foreign_bodies_dr_pct: number | null;
  qtr_basis: string | null;
};

export type CompanyAth = {
  id: number;
  company_name: string;
  isin: string | null;
  nse_symbol: string | null;
  ath_price: number;
  ath_date: string;
  qtr_date_end: string | null;
  qtr_basis: string | null;
  sales: number | null;
  pat: number | null;
  gross_sales_margin: number | null;
  ebidta: number | null;
  ebidta_margin: number | null;
  sales_peak: number | null;
  sales_peak_date: string | null;
  sales_peak_basis: string | null;
  pat_peak: number | null;
  pat_peak_date: string | null;
  pat_peak_basis: string | null;
  ebidta_peak: number | null;
  ebidta_peak_date: string | null;
  ebidta_peak_basis: string | null;
};

export type AthMetric = "sales" | "pat" | "ebidta";

export const ATH_METRICS: { value: AthMetric; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "pat", label: "PAT" },
  { value: "ebidta", label: "EBIDTA" },
];

export type CustomAthRow = {
  id: number;
  company_name: string;
  isin: string | null;
  nse_symbol: string | null;
  metric: AthMetric;
  peak_value: number;
  peak_date: string;
  peak_fiscal_year: number;
  peak_fiscal_quarter: number;
  peak_basis: string | null;
};

export type QuarterFilter = "all" | "q1" | "q2" | "q3" | "q4" | "latest";

export const QUARTER_OPTIONS: { value: QuarterFilter; label: string }[] = [
  { value: "all", label: "All quarters" },
  { value: "q1", label: "Q1 (Apr–Jun)" },
  { value: "q2", label: "Q2 (Jul–Sep)" },
  { value: "q3", label: "Q3 (Oct–Dec)" },
  { value: "q4", label: "Q4 (Jan–Mar)" },
  { value: "latest", label: "Latest quarter" },
];

export type Tab = "companies" | "sme" | "main" | "ath";

export const PAGE_SIZE = 25;

export const MIN_YEAR = 2001;
export const MAX_YEAR = 2026;

export const MIN_FISCAL_YEAR = 2001;
export const MAX_FISCAL_YEAR = 2027;
export const DEFAULT_FISCAL_YEAR = 2026;
