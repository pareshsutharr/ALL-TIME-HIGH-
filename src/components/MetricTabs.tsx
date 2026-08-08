import Link from "next/link";
import { AthMetric, ATH_METRICS } from "@/lib/types";

function buildHref(metric: AthMetric, year: number, q?: string) {
  const params = new URLSearchParams();
  params.set("metric", metric);
  params.set("year", String(year));
  if (q) params.set("q", q);
  return `/custom-ath?${params.toString()}`;
}

export function MetricTabs({
  active,
  year,
  q,
  counts,
}: {
  active: AthMetric;
  year: number;
  q?: string;
  counts: Record<AthMetric, number>;
}) {
  const tabClass = (metric: AthMetric) =>
    `px-4 py-2 text-sm font-medium rounded-md ${
      active === metric
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      {ATH_METRICS.map((m) => (
        <Link
          key={m.value}
          href={buildHref(m.value, year, q)}
          className={tabClass(m.value)}
        >
          {m.label} ({counts[m.value].toLocaleString("en-IN")})
        </Link>
      ))}
    </div>
  );
}
