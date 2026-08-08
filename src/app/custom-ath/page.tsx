import Link from "next/link";
import { getCustomAth, getCustomAthCounts } from "@/lib/data";
import { AthMetric, ATH_METRICS, PAGE_SIZE, DEFAULT_FISCAL_YEAR } from "@/lib/types";
import { MetricTabs } from "@/components/MetricTabs";
import { CustomAthControls } from "@/components/CustomAthControls";
import { CustomAthTable } from "@/components/CustomAthTable";
import { Pagination } from "@/components/Pagination";

type SearchParams = {
  metric?: string;
  year?: string;
  q?: string;
  page?: string;
};

function resolveMetric(rawMetric: string | undefined): AthMetric {
  return ATH_METRICS.some((m) => m.value === rawMetric) ? (rawMetric as AthMetric) : "sales";
}

export default async function CustomAthPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const metric = resolveMetric(params.metric);
  const fiscalYear = Number(params.year) || DEFAULT_FISCAL_YEAR;
  const q = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [result, counts] = await Promise.all([
    getCustomAth({ metric, fiscalYear, q, page }),
    getCustomAthCounts(fiscalYear),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.count / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const p = new URLSearchParams();
    p.set("metric", metric);
    p.set("year", String(fiscalYear));
    if (q) p.set("q", q);
    p.set("page", String(targetPage));
    return `/custom-ath?${p.toString()}`;
  }

  const metricLabel = ATH_METRICS.find((m) => m.value === metric)!.label;

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
          fiscal year — pick a year and a metric to see who broke their own record then.
        </p>
      </header>

      <MetricTabs active={metric} year={fiscalYear} q={q} counts={counts} />

      <CustomAthControls />

      <p className="text-sm text-black/60 dark:text-white/60">
        Showing {result.rows.length} of {result.count.toLocaleString("en-IN")} companies with an
        all-time high {metricLabel} record in FY{fiscalYear}
      </p>

      <CustomAthTable rows={result.rows} metric={metric} />

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
