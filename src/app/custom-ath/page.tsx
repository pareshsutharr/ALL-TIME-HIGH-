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
} from "@/lib/types";
import { formatFiscalQuarter } from "@/lib/format";
import { MetricTabs } from "@/components/MetricTabs";
import { CustomAthControls } from "@/components/CustomAthControls";
import { CustomAthTable } from "@/components/CustomAthTable";
import { Pagination } from "@/components/Pagination";
import { DownloadExcelButton } from "@/components/DownloadExcelButton";

type SearchParams = {
  metric?: string;
  mode?: string;
  year?: string;
  quarter?: string;
  q?: string;
  page?: string;
};

function resolveMetrics(rawMetric: string | undefined): AthMetric[] {
  const values = (rawMetric ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is AthMetric => ATH_METRICS.some((m) => m.value === v));
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
  const metrics = resolveMetrics(params.metric);
  const mode = resolveMode(params.mode);
  const fiscalYear = Number(params.year) || DEFAULT_FISCAL_YEAR;
  const quarter = resolveQuarter(params.quarter);
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [result, counts] = await Promise.all([
    getCustomAth({ metrics, mode, fiscalYear, quarter, q, page }),
    getCustomAthCounts(fiscalYear, quarter),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.count / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const p = new URLSearchParams();
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
    p.set("metric", metrics.join(","));
    if (mode !== "or") p.set("mode", mode);
    p.set("year", String(fiscalYear));
    if (quarter !== "all") p.set("quarter", quarter);
    if (q) p.set("q", q);
    return `/api/export?${p.toString()}`;
  }

  const metricLabels = metrics.map((m) => ATH_METRICS.find((x) => x.value === m)!.label);
  const metricLabel =
    metricLabels.length === 1 ? metricLabels[0] : metricLabels.join(mode === "and" ? " AND " : " OR ");

  const periodLabel = (() => {
    if (quarter !== "latest") {
      return quarter === "all"
        ? `FY${fiscalYear}`
        : `${QUARTER_OPTIONS.find((o) => o.value === quarter)!.label.split(" ")[0]} FY${fiscalYear}`;
    }
    const dates = Array.from(new Set(Object.values(result.resolvedLatestDates ?? {})));
    return dates.length === 1 && dates[0]
      ? `the latest reported quarter (${formatFiscalQuarter(dates[0])})`
      : "the latest reported quarter";
  })();

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white w-fit"
        >
          ← All Time High
        </Link>
        <h1 className="text-2xl font-semibold">Custom ATH by Year</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Companies that set a new all-time record for a financial metric within a specific
          fiscal year (or quarter) — pick a period and a metric to see who broke their own
          record then.
        </p>
      </header>

      <MetricTabs
        active={metrics}
        mode={mode}
        year={fiscalYear}
        quarter={quarter}
        q={q}
        counts={counts}
      />

      <CustomAthControls />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-black/60 dark:text-white/60">
          Showing {result.rows.length} of {result.count.toLocaleString("en-IN")} companies with an
          all-time high {metricLabel} record in {periodLabel}
        </p>
        <DownloadExcelButton href={buildExportHref()} />
      </div>

      <CustomAthTable rows={result.rows} metrics={metrics} />

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
