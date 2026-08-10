import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import {
  getCompaniesExport,
  getSmeCompaniesExport,
  getMainDataExport,
  getCompanyAthExport,
  getCustomAth,
} from "@/lib/data";
import {
  buildCompaniesSheet,
  buildSmeSheet,
  buildMainDataSheet,
  buildAthSheet,
  buildCustomAthSheet,
  ExportSheet,
} from "@/lib/export";
import {
  AthMetric,
  ATH_METRICS,
  MatchMode,
  QuarterFilter,
  QUARTER_OPTIONS,
  DEFAULT_FISCAL_YEAR,
} from "@/lib/types";

export const runtime = "nodejs";

function resolveMetric(raw: string | null): AthMetric | undefined {
  return ATH_METRICS.some((m) => m.value === raw) ? (raw as AthMetric) : undefined;
}

function resolveMetrics(raw: string | null): AthMetric[] {
  const values = (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is AthMetric => ATH_METRICS.some((m) => m.value === v));
  const unique = Array.from(new Set(values));
  return unique.length > 0 ? unique : ["sales"];
}

function resolveMode(raw: string | null): MatchMode {
  return raw === "and" ? "and" : "or";
}

function resolveQuarter(raw: string | null): QuarterFilter {
  return QUARTER_OPTIONS.some((o) => o.value === raw) ? (raw as QuarterFilter) : "all";
}

async function buildSheet(sp: URLSearchParams): Promise<{ sheet: ExportSheet; filename: string }> {
  const type = sp.get("type");
  const q = sp.get("q")?.trim() || undefined;

  switch (type) {
    case "companies": {
      const industry = sp.get("industry") || undefined;
      const rows = await getCompaniesExport({ q, industry });
      return { sheet: buildCompaniesSheet(rows), filename: "companies.xlsx" };
    }
    case "sme": {
      const industry = sp.get("industry") || undefined;
      const rows = await getSmeCompaniesExport({ q, industry });
      return { sheet: buildSmeSheet(rows), filename: "sme-companies.xlsx" };
    }
    case "main": {
      const industry = sp.get("industry") || undefined;
      const year = Number(sp.get("year")) || undefined;
      const rows = await getMainDataExport({ q, industry, year });
      return { sheet: buildMainDataSheet(rows), filename: "main-data.xlsx" };
    }
    case "ath": {
      const metric = resolveMetric(sp.get("metric"));
      const rows = await getCompanyAthExport({ q, metric });
      return { sheet: buildAthSheet(rows, metric), filename: "all-time-high.xlsx" };
    }
    case "custom-ath": {
      const metrics = resolveMetrics(sp.get("metric"));
      const mode = resolveMode(sp.get("mode"));
      const fiscalYear = Number(sp.get("year")) || DEFAULT_FISCAL_YEAR;
      const quarter = resolveQuarter(sp.get("quarter"));
      const result = await getCustomAth({ metrics, mode, fiscalYear, quarter, q });
      return { sheet: buildCustomAthSheet(result.rows, metrics), filename: "custom-ath.xlsx" };
    }
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

export async function GET(req: NextRequest) {
  let sheet: ExportSheet;
  let filename: string;
  try {
    ({ sheet, filename } = await buildSheet(req.nextUrl.searchParams));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return new Response(message, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");
  worksheet.columns = sheet.columns;
  worksheet.addRows(sheet.rows);
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
