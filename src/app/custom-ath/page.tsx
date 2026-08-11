import Link from "next/link";
import { getCustomAth, getCustomAthCounts } from "@/lib/data";
import {
  AthMetric,
  ATH_METRICS,
  PAGE_SIZE,
  DEFAULT_FISCAL_YEAR,
  QuarterFilter,
  QUARTER_OPTIONS,
  MatchMode,
  Board,
  SME_UNSUPPORTED_METRICS,
} from "@/lib/types";
import { CustomAthSidebar } from "@/components/CustomAthSidebar";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SearchBar } from "@/components/filters/SearchBar";
import { CustomAthTable } from "@/components/CustomAthTable";
import { Pagination } from "@/components/Pagination";
import { DownloadExcelButton } from "@/components/DownloadExcelButton";

type SearchParams = {
  metric?: string;
  mode?: string;
  year?: string;
  quarter?: string;
  board?: string;
  q?: string;
  page?: string;
};

function resolveBoard(rawBoard: string | undefined): Board {
  if (rawBoard === "sme") return "sme";
  if (rawBoard === "all") return "all";
  return "mainboard";
}

function resolveMetrics(rawMetric: string | undefined, board: Board): AthMetric[] {
  const supported =
    board === "sme"
      ? ATH_METRICS.filter((m) => !SME_UNSUPPORTED_METRICS.includes(m.value))
      : ATH_METRICS;
  const values = (rawMetric ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is AthMetric => supported.some((m) => m.value === v));
  const unique = Array.from(new Set(values));
  return unique.length > 0 ? unique : ["sales"];
}

function resolveMode(rawMode: string | undefined): MatchMode {
  return rawMode === "and" ? "and" : "or";
}

function resolveQuarter(rawQuarter: string | undefined): QuarterFilter {
  return QUARTER_OPTIONS.some((o) => o.value === rawQuarter) ? (rawQuarter as QuarterFilter) : "all";
}

export default async function CustomAthPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const board = resolveBoard(params.board);
  const metrics = resolveMetrics(params.metric, board);
  const mode = resolveMode(params.mode);
  const fiscalYear = Number(params.year) || DEFAULT_FISCAL_YEAR;
  const quarter = resolveQuarter(params.quarter);
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [result, counts] = await Promise.all([
    getCustomAth({ metrics, mode, fiscalYear, quarter, board, q, page }),
    getCustomAthCounts(fiscalYear, quarter, board),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.count / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const p = new URLSearchParams();
    if (board !== "mainboard") p.set("board", board);
    p.set("metric", metrics.join(","));
    if (mode !== "or") p.set("mode", mode);
    p.set("year", String(fiscalYear));
    if (quarter !== "all") p.set("quarter", quarter);
    if (q) p.set("q", q);
    p.set("page", String(targetPage));
    return `/custom-ath?${p.toString()}`;
  }

  function buildExportHref() {
    const p = new URLSearchParams();
    p.set("type", "custom-ath");
    if (board !== "mainboard") p.set("board", board);
    p.set("metric", metrics.join(","));
    if (mode !== "or") p.set("mode", mode);
    p.set("year", String(fiscalYear));
    if (quarter !== "all") p.set("quarter", quarter);
    if (q) p.set("q", q);
    return `/api/export?${p.toString()}`;
  }

  const boardLabel =
    board === "sme" ? "SME companies" : board === "all" ? "listed companies" : "companies";

  // How many filter categories differ from their default — surfaced as the
  // "Filters (N)" badge on the mobile drawer trigger.
  let activeCount = 0;
  if (board !== "mainboard") activeCount++;
  if (!(metrics.length === 1 && metrics[0] === "sales")) activeCount++;
  if (mode !== "or") activeCount++;
  if (fiscalYear !== DEFAULT_FISCAL_YEAR) activeCount++;
  if (quarter !== "all") activeCount++;
  if (q) activeCount++;

  return (
    <div className="flex-1 flex flex-col w-full px-4 sm:px-6 lg:pl-[250px] py-8 gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white w-fit"
        >
          ← All Time High
        </Link>
        <h1 className="text-2xl font-semibold">Custom ATH by Year</h1>
      </header>

      <FilterPanel activeCount={activeCount}>
        <CustomAthSidebar
          board={board}
          metrics={metrics}
          mode={mode}
          year={fiscalYear}
          quarter={quarter}
          q={q}
          counts={counts}
        />
      </FilterPanel>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchBar placeholder="Search by company name, ISIN, or symbol..." />
          <DownloadExcelButton href={buildExportHref()} />
        </div>

        <p className="text-sm text-black/60 dark:text-white/60">
          Showing {result.rows.length} of {result.count.toLocaleString("en-IN")} {boardLabel}
        </p>

        <CustomAthTable rows={result.rows} metrics={metrics} />

        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
