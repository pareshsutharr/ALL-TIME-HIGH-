import ExcelJS from "exceljs";

export type DailySnapshot = {
  accord_code: number;
  company_name: string | null;
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
  fy_date_end: string | null;
  roe_pct: number | null;
  roce_pct: number | null;
};

type FieldKind = "int" | "string" | "code" | "number" | "date_native" | "date_yyyymm";

const FIELD_KINDS: Record<keyof Omit<DailySnapshot, "accord_code">, FieldKind> = {
  company_name: "string",
  ipo_list_date: "date_native",
  isin: "string",
  industry: "string",
  sector: "string",
  nse_symbol: "string",
  bse_code: "code",
  bse_52w_high_date: "date_native",
  bse_52w_high_price: "number",
  bse_ath_date: "date_native",
  bse_ath_price: "number",
  nse_52w_high_date: "date_native",
  nse_52w_high_price: "number",
  nse_ath_date: "date_native",
  nse_ath_price: "number",
  qtr_date_end: "date_yyyymm",
  qtr_net_sales: "number",
  qtr_profit_after_tax: "number",
  qtr_change_in_stocks: "number",
  qtr_cost_of_services_raw_materials: "number",
  qtr_purchase_of_finished_goods: "number",
  qtr_operating_profit_excl_oi: "number",
  qtr_pbidtm_pct_excl_oi: "number",
  shp_date_end: "date_yyyymm",
  shp_institutions_pct: "number",
  shp_fii_pct: "number",
  shp_fvci_pct: "number",
  shp_fpi_pct: "number",
  shp_ffi_banks_pct: "number",
  shp_foreign_bodies_dr_pct: "number",
  fy_date_end: "date_yyyymm",
  roe_pct: "number",
  roce_pct: "number",
};

// Keyed by the header text lowercased with runs of whitespace collapsed to
// one space, so the source file's inconsistent "QTR_   Cost of..." spacing
// doesn't matter.
const HEADER_FIELD_MAP: Record<string, keyof DailySnapshot> = {
  "accord code": "accord_code",
  "company name": "company_name",
  "ipo_list date": "ipo_list_date",
  "cd_isin no": "isin",
  "cd_industry": "industry",
  "cd_sector1": "sector",
  "cd_nse symbol": "nse_symbol",
  "cd_bse code": "bse_code",
  "sc_bse 52 wk high date": "bse_52w_high_date",
  "sc_bse 52 wk high price": "bse_52w_high_price",
  "sc_bse all time high date": "bse_ath_date",
  "sc_bse all time high price": "bse_ath_price",
  "sc_nse 52 wk high date": "nse_52w_high_date",
  "sc_nse 52 wk high price": "nse_52w_high_price",
  "sc_nse all time high date": "nse_ath_date",
  "sc_nse all time high price": "nse_ath_price",
  "qtr_date end": "qtr_date_end",
  "qtr_net sales": "qtr_net_sales",
  "qtr_profit after tax": "qtr_profit_after_tax",
  "qtr_ (increase) / decrease in stocks": "qtr_change_in_stocks",
  "qtr_ cost of services & raw materials": "qtr_cost_of_services_raw_materials",
  "qtr_ purchase of finished goods": "qtr_purchase_of_finished_goods",
  "qtr_operating profit (excl oi)": "qtr_operating_profit_excl_oi",
  "qtr_pbidtm% (excl oi)": "qtr_pbidtm_pct_excl_oi",
  "shp_date end": "shp_date_end",
  "shp_institutions": "shp_institutions_pct",
  "shp_foreign institutional investors": "shp_fii_pct",
  "shp_foreign venture capital investors": "shp_fvci_pct",
  "shp_foreign portfolio investors": "shp_fpi_pct",
  "shp_foreign financial institutions / banks": "shp_ffi_banks_pct",
  "shp_foreign bodies dr": "shp_foreign_bodies_dr_pct",
  "frc_year end": "fy_date_end",
  "frc_roe (%)": "roe_pct",
  "frc_roce (%)": "roce_pct",
};

function normalizeHeader(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function yyyymmToEndOfMonth(value: number): string | null {
  const year = Math.floor(value / 100);
  const month = value % 100;
  if (!year || month < 1 || month > 12) return null;
  // Date.UTC's month is 0-indexed, so passing the 1-indexed source month
  // with day 0 lands on the last day of that month.
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function toCodeString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  return toStringOrNull(value);
}

// Excel cells can carry rich-text/formula-result objects instead of plain
// scalars; ExcelJS's own .text getter normalizes those, so route odd shapes
// through it instead of stringifying the object directly.
function cellScalar(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v !== null && typeof v === "object" && !(v instanceof Date)) return cell.text;
  return v;
}

/** Finds the header row by scanning for a cell that reads "Accord Code". */
function findHeaderRowNumber(sheet: ExcelJS.Worksheet): number {
  for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++) {
    const row = sheet.getRow(r);
    let found = false;
    row.eachCell((cell) => {
      if (normalizeHeader(cell.value) === "accord code") found = true;
    });
    if (found) return r;
  }
  throw new Error('Could not find a header row containing "Accord Code" in the first 20 rows');
}

export async function parseDailyWorkbookBuffer(buffer: Buffer): Promise<DailySnapshot[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook has no sheets");

  const headerRowNumber = findHeaderRowNumber(sheet);
  const headerRow = sheet.getRow(headerRowNumber);
  const columnMap = new Map<number, keyof DailySnapshot>();
  headerRow.eachCell((cell, colNumber) => {
    const field = HEADER_FIELD_MAP[normalizeHeader(cell.value)];
    if (field) columnMap.set(colNumber, field);
  });
  if (!Array.from(columnMap.values()).includes("accord_code")) {
    throw new Error('Header row is missing an "Accord Code" column');
  }

  const results: DailySnapshot[] = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const record: Partial<DailySnapshot> = {};
    for (const [colNumber, field] of columnMap) {
      const raw = cellScalar(row.getCell(colNumber));
      if (field === "accord_code") {
        const n = toNumber(raw);
        if (n !== null) record.accord_code = Math.trunc(n);
        continue;
      }
      const kind = FIELD_KINDS[field];
      let value: string | number | null;
      switch (kind) {
        case "string":
          value = toStringOrNull(raw);
          break;
        case "code":
          value = toCodeString(raw);
          break;
        case "number":
          value = toNumber(raw);
          break;
        case "date_native":
          value = toIsoDate(raw);
          break;
        case "date_yyyymm": {
          const n = toNumber(raw);
          value = n !== null ? yyyymmToEndOfMonth(n) : null;
          break;
        }
        default:
          value = null;
      }
      (record as Record<string, unknown>)[field] = value;
    }

    if (record.accord_code === undefined) continue; // blank/summary row
    results.push(record as DailySnapshot);
  }

  return results;
}

/**
 * Daily_file_v1.xlsx carries one row per company for most companies, but a
 * data-quality quirk in the vendor export sometimes repeats a company's row
 * with one field blanked out. Collapse to one record per accord_code, using
 * the first non-null value seen for each field (preserving file order).
 */
export function coalesceByAccordCode(rows: DailySnapshot[]): DailySnapshot[] {
  const byCode = new Map<number, DailySnapshot>();
  for (const row of rows) {
    const existing = byCode.get(row.accord_code);
    if (!existing) {
      byCode.set(row.accord_code, { ...row });
      continue;
    }
    for (const key of Object.keys(row) as (keyof DailySnapshot)[]) {
      if (existing[key] === null || existing[key] === undefined) {
        (existing as Record<string, unknown>)[key] = row[key];
      }
    }
  }
  return Array.from(byCode.values());
}
