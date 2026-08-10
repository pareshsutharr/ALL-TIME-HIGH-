import Link from "next/link";
import { AthMetric, ATH_METRICS, MatchMode, QuarterFilter } from "@/lib/types";

function buildHref(
  metrics: AthMetric[],
  mode: MatchMode,
  year: number,
  quarter: QuarterFilter,
  q?: string
) {
  const params = new URLSearchParams();
  params.set("metric", metrics.join(","));
  if (mode !== "or") params.set("mode", mode);
  params.set("year", String(year));
  if (quarter !== "all") params.set("quarter", quarter);
  if (q) params.set("q", q);
  return `/custom-ath?${params.toString()}`;
}

export function MetricTabs({
  active,
  mode,
  year,
  quarter,
  q,
  counts,
}: {
  active: AthMetric[];
  mode: MatchMode;
  year: number;
  quarter: QuarterFilter;
  q?: string;
  counts: Record<AthMetric, number>;
}) {
  const allValues = ATH_METRICS.map((m) => m.value);
  const allSelected = allValues.every((v) => active.includes(v));

  function toggleHref(metric: AthMetric) {
    const next = active.includes(metric)
      ? active.filter((m) => m !== metric)
      : [...active, metric];
    // Never allow deselecting the last remaining tab.
    return buildHref(next.length > 0 ? next : active, mode, year, quarter, q);
  }

  const tabClass = (metric: AthMetric) =>
    `px-4 py-2 text-sm font-medium rounded-md ${
      active.includes(metric)
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10"
    }`;

  const modeClass = (m: MatchMode) =>
    `px-2.5 py-1 text-xs font-semibold rounded uppercase tracking-wide ${
      mode === m
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10"
    }`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {ATH_METRICS.map((m) => (
          <Link
            key={m.value}
            href={toggleHref(m.value)}
            aria-pressed={active.includes(m.value)}
            className={tabClass(m.value)}
          >
            {m.label} ({counts[m.value].toLocaleString("en-IN")})
          </Link>
        ))}
        <Link
          href={buildHref(allSelected ? ["sales"] : allValues, mode, year, quarter, q)}
          className="ml-1 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white underline underline-offset-2"
        >
          {allSelected ? "Reset" : "Select all"}
        </Link>
      </div>
      {active.length > 1 ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-black/50 dark:text-white/50">Match:</span>
          <div className="flex gap-1 rounded-md border border-black/10 dark:border-white/15 p-0.5">
            <Link href={buildHref(active, "or", year, quarter, q)} className={modeClass("or")}>
              Any (OR)
            </Link>
            <Link href={buildHref(active, "and", year, quarter, q)} className={modeClass("and")}>
              All (AND)
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
