import {
  AthMetric,
  ATH_METRICS,
  Company,
  SmeCompany,
  MainData,
  CompanyAth,
  MultiMetricRow,
} from "@/lib/types";
import { formatFiscalQuarter } from "@/lib/format";
import { athPeakFor } from "@/lib/athPeaks";

export type ExportColumn = { header: string; key: string; width?: number };
export type ExportSheet = { columns: ExportColumn[]; rows: Record<string, unknown>[] };

function metricInfo(metric: AthMetric) {
  return ATH_METRICS.find((m) => m.value === metric)!;
}

function basisLabel(basis: string | null | undefined) {
  return basis === "S" ? "Standalone" : basis === "C" ? "Consolidated" : "";
}

function quarterLabel(date: string | null | undefined) {
  return date ? formatFiscalQuarter(date) : "";
}

export function buildCompaniesSheet(rows: Company[]): ExportSheet {
  return {
    columns: [
      { header: "Company", key: "company_name", width: 32 },
      { header: "Industry", key: "industry", width: 24 },
      { header: "Sector", key: "sector", width: 18 },
      { header: "NSE Symbol", key: "nse_symbol", width: 14 },
      { header: "BSE Code", key: "bse_code", width: 12 },
      { header: "ISIN", key: "isin", width: 16 },
      { header: "IPO Date", key: "ipo_list_date", width: 12 },
      { header: "BSE 52W High Price", key: "bse_52w_high_price", width: 16 },
      { header: "BSE 52W High Date", key: "bse_52w_high_date", width: 16 },
      { header: "NSE 52W High Price", key: "nse_52w_high_price", width: 16 },
      { header: "NSE 52W High Date", key: "nse_52w_high_date", width: 16 },
      { header: "BSE ATH Price", key: "bse_ath_price", width: 14 },
      { header: "BSE ATH Date", key: "bse_ath_date", width: 14 },
      { header: "NSE ATH Price", key: "nse_ath_price", width: 14 },
      { header: "NSE ATH Date", key: "nse_ath_date", width: 14 },
    ],
    rows,
  };
}

export function buildSmeSheet(rows: SmeCompany[]): ExportSheet {
  return {
    columns: [
      { header: "Company", key: "company_name", width: 32 },
      { header: "Industry", key: "industry", width: 24 },
      { header: "ISIN", key: "isin", width: 16 },
      { header: "IPO Date", key: "ipo_list_date", width: 12 },
      { header: "Accord Code", key: "accord_code", width: 12 },
    ],
    rows,
  };
}

export function buildMainDataSheet(rows: MainData[]): ExportSheet {
  return {
    columns: [
      { header: "Company", key: "company_name", width: 32 },
      { header: "Industry", key: "industry", width: 24 },
      { header: "IPO Date", key: "ipo_list_date", width: 12 },
      { header: "Source Year", key: "source_year", width: 12 },
      { header: "Basis", key: "basis", width: 14 },
      { header: "Quarter End", key: "qtr_date_end", width: 12 },
      { header: "Net Sales (₹Cr)", key: "qtr_net_sales", width: 16 },
      { header: "PAT (₹Cr)", key: "qtr_profit_after_tax", width: 14 },
      { header: "Operating Profit (₹Cr)", key: "qtr_operating_profit_excl_oi", width: 18 },
      { header: "PBIDTM %", key: "qtr_pbidtm_pct_excl_oi", width: 12 },
      { header: "SHP End", key: "shp_date_end", width: 12 },
      { header: "Institutions %", key: "shp_institutions_pct", width: 14 },
      { header: "FII %", key: "shp_fii_pct", width: 12 },
    ],
    rows: rows.map((r) => ({ ...r, basis: basisLabel(r.qtr_basis) })),
  };
}

export function buildAthSheet(rows: CompanyAth[], metric?: AthMetric): ExportSheet {
  const info = metric ? metricInfo(metric) : null;

  const columns: ExportColumn[] = [
    { header: "Company", key: "company_name", width: 32 },
    { header: "NSE Symbol", key: "nse_symbol", width: 14 },
    { header: "IPO Date", key: "ipo_list_date", width: 12 },
    { header: "All-Time High Price", key: "ath_price", width: 16 },
    { header: "ATH Date", key: "ath_date", width: 12 },
    { header: "ATH Quarter", key: "ath_quarter", width: 12 },
  ];
  if (info) {
    columns.push(
      { header: `All-Time High ${info.label}${info.unit === "cr" ? " (₹Cr)" : ""}`, key: "metric_value", width: 20 },
      { header: `${info.label} Peak Date`, key: "metric_date", width: 14 },
      { header: `${info.label} Peak Quarter`, key: "metric_quarter", width: 16 },
      { header: `${info.label} Peak Basis`, key: "metric_basis", width: 14 }
    );
  }
  columns.push(
    { header: "Latest Qtr End", key: "qtr_date_end", width: 14 },
    { header: "Latest Qtr Basis", key: "qtr_basis_label", width: 14 },
    { header: "Sales (₹Cr)", key: "sales", width: 14 },
    { header: "PAT (₹Cr)", key: "pat", width: 14 },
    { header: "Gross Sales Margin (₹Cr)", key: "gross_sales_margin", width: 18 },
    { header: "EBIDTA (₹Cr)", key: "ebidta", width: 14 },
    { header: "EBIDTA Margin %", key: "ebidta_margin", width: 16 }
  );

  const exportRows = rows.map((r) => {
    const peak = metric ? athPeakFor(r, metric) : null;
    return {
      ...r,
      ath_quarter: quarterLabel(r.ath_date),
      metric_value: peak?.value ?? "",
      metric_date: peak?.date ?? "",
      metric_quarter: peak?.date ? quarterLabel(peak.date) : "",
      metric_basis: basisLabel(peak?.basis),
      qtr_basis_label: basisLabel(r.qtr_basis),
    };
  });

  return { columns, rows: exportRows };
}

export function buildCustomAthSheet(rows: MultiMetricRow[], metrics: AthMetric[]): ExportSheet {
  const columns: ExportColumn[] = [
    { header: "Company", key: "company_name", width: 32 },
    { header: "NSE Symbol", key: "nse_symbol", width: 14 },
    { header: "IPO Date", key: "ipo_list_date", width: 12 },
  ];
  for (const metric of metrics) {
    const info = metricInfo(metric);
    columns.push(
      { header: `${info.label}${info.unit === "cr" ? " (₹Cr)" : ""}`, key: `${metric}_value`, width: 18 },
      { header: `${info.label} Date`, key: `${metric}_date`, width: 14 },
      { header: `${info.label} Quarter`, key: `${metric}_quarter`, width: 16 },
      { header: `${info.label} Basis`, key: `${metric}_basis`, width: 14 }
    );
  }

  const exportRows = rows.map((r) => {
    const flat: Record<string, unknown> = {
      company_name: r.company_name,
      nse_symbol: r.nse_symbol,
      ipo_list_date: r.ipo_list_date,
    };
    for (const metric of metrics) {
      const peak = r.peaks[metric];
      flat[`${metric}_value`] = peak?.value ?? "";
      flat[`${metric}_date`] = peak?.date ?? "";
      flat[`${metric}_quarter`] = peak ? quarterLabel(peak.date) : "";
      flat[`${metric}_basis`] = basisLabel(peak?.basis);
    }
    return flat;
  });

  return { columns, rows: exportRows };
}
