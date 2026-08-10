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
  ipo_list_date: string | null;
  nse_symbol: string | null;
  bse_code: string | null;
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
  ipo_list_date: string | null;
  nse_symbol: string | null;
  bse_code: string | null;
};

export type CompanyAth = {
  id: number;
  accord_code: number;
  company_name: string;
  isin: string | null;
  nse_symbol: string | null;
  bse_code: string | null;
  ipo_list_date: string | null;
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
  gross_sales_margin_peak: number | null;
  gross_sales_margin_peak_date: string | null;
  gross_sales_margin_peak_basis: string | null;
  ebidta_margin_peak: number | null;
  ebidta_margin_peak_date: string | null;
  ebidta_margin_peak_basis: string | null;
  fii_peak: number | null;
  fii_peak_date: string | null;
  fii_peak_basis: string | null;
  dii_peak: number | null;
  dii_peak_date: string | null;
  dii_peak_basis: string | null;
  nse_52w_high_peak: number | null;
  nse_52w_high_peak_date: string | null;
  nse_52w_high_peak_basis: string | null;
  bse_52w_high_peak: number | null;
  bse_52w_high_peak_date: string | null;
  bse_52w_high_peak_basis: string | null;
};

export type AthMetric =
  | "sales"
  | "pat"
  | "ebidta"
  | "gross_sales_margin"
  | "ebidta_margin"
  | "fii"
  | "dii"
  | "nse_52w_high"
  | "bse_52w_high";

// "cr" = ₹ crore financials, "percent" = a % figure, "price" = a per-share ₹ price.
export const ATH_METRICS: { value: AthMetric; label: string; unit: "cr" | "percent" | "price" }[] = [
  { value: "sales", label: "Sales", unit: "cr" },
  { value: "pat", label: "PAT", unit: "cr" },
  { value: "ebidta", label: "EBIDTA", unit: "cr" },
  { value: "gross_sales_margin", label: "Gross Sales Margin", unit: "cr" },
  { value: "ebidta_margin", label: "EBIDTA Margin", unit: "percent" },
  { value: "fii", label: "FII", unit: "percent" },
  { value: "dii", label: "DII", unit: "percent" },
  { value: "nse_52w_high", label: "NSE 52W High", unit: "price" },
  { value: "bse_52w_high", label: "BSE 52W High", unit: "price" },
];

export type CustomAthRow = {
  id: number;
  accord_code: number;
  company_name: string;
  isin: string | null;
  nse_symbol: string | null;
  bse_code: string | null;
  ipo_list_date: string | null;
  metric: AthMetric;
  peak_value: number;
  peak_date: string;
  peak_fiscal_year: number;
  peak_fiscal_quarter: number;
  peak_basis: string | null;
};

// "or" = company matches if it set an ATH record in ANY selected metric.
// "and" = company matches only if it set an ATH record in EVERY selected metric.
export type MatchMode = "or" | "and";

export type MultiMetricPeak = {
  value: number;
  date: string;
  fiscal_year: number;
  fiscal_quarter: number;
  basis: string | null;
};

export type MultiMetricRow = {
  accord_code: number;
  company_name: string;
  isin: string | null;
  nse_symbol: string | null;
  bse_code: string | null;
  ipo_list_date: string | null;
  peaks: Partial<Record<AthMetric, MultiMetricPeak>>;
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

// Cap on rows fetched for an Excel export — protects the biggest table
// (main_data, ~1.38M rows) from an unbounded query/response.
export const EXPORT_LIMIT = 20000;

export const MIN_YEAR = 2001;
export const MAX_YEAR = 2026;

export const MIN_FISCAL_YEAR = 2001;
export const MAX_FISCAL_YEAR = 2027;
export const DEFAULT_FISCAL_YEAR = 2026;
