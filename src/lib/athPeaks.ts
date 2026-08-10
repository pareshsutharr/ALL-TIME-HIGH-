import { AthMetric, CompanyAth } from "@/lib/types";

export type AthPeak = { value: number | null; date: string | null; basis: string | null };

export function athPeakFor(row: CompanyAth, metric: AthMetric): AthPeak {
  switch (metric) {
    case "sales":
      return { value: row.sales_peak, date: row.sales_peak_date, basis: row.sales_peak_basis };
    case "pat":
      return { value: row.pat_peak, date: row.pat_peak_date, basis: row.pat_peak_basis };
    case "ebidta":
      return { value: row.ebidta_peak, date: row.ebidta_peak_date, basis: row.ebidta_peak_basis };
    case "gross_sales_margin":
      return {
        value: row.gross_sales_margin_peak,
        date: row.gross_sales_margin_peak_date,
        basis: row.gross_sales_margin_peak_basis,
      };
    case "ebidta_margin":
      return {
        value: row.ebidta_margin_peak,
        date: row.ebidta_margin_peak_date,
        basis: row.ebidta_margin_peak_basis,
      };
    case "fii":
      return { value: row.fii_peak, date: row.fii_peak_date, basis: row.fii_peak_basis };
    case "dii":
      return { value: row.dii_peak, date: row.dii_peak_date, basis: row.dii_peak_basis };
    case "nse_52w_high":
      return {
        value: row.nse_52w_high_peak,
        date: row.nse_52w_high_peak_date,
        basis: row.nse_52w_high_peak_basis,
      };
    case "bse_52w_high":
      return {
        value: row.bse_52w_high_peak,
        date: row.bse_52w_high_peak_date,
        basis: row.bse_52w_high_peak_basis,
      };
  }
}
