import Link from "next/link";
import {
  AthMetric,
  Board,
  BOARD_OPTIONS,
  MatchMode,
  QuarterFilter,
  SME_UNSUPPORTED_METRICS,
} from "@/lib/types";

function buildHref(
  board: Board,
  metrics: AthMetric[],
  mode: MatchMode,
  year: number,
  quarter: QuarterFilter,
  q?: string
) {
  // Switching to SME drops any selected metric it can't support (52-week
  // highs only exist on the mainboard `companies` table).
  const supported =
    board === "sme" ? metrics.filter((m) => !SME_UNSUPPORTED_METRICS.includes(m)) : metrics;
  const params = new URLSearchParams();
  if (board !== "mainboard") params.set("board", board);
  params.set("metric", (supported.length > 0 ? supported : ["sales"]).join(","));
  if (mode !== "or") params.set("mode", mode);
  params.set("year", String(year));
  if (quarter !== "all") params.set("quarter", quarter);
  if (q) params.set("q", q);
  return `/custom-ath?${params.toString()}`;
}

export function BoardTabs({
  active,
  metrics,
  mode,
  year,
  quarter,
  q,
}: {
  active: Board;
  metrics: AthMetric[];
  mode: MatchMode;
  year: number;
  quarter: QuarterFilter;
  q?: string;
}) {
  const tabClass = (board: Board) =>
    `px-4 py-2 text-sm font-medium rounded-md ${
      active === board
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      {BOARD_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={buildHref(opt.value, metrics, mode, year, quarter, q)}
          aria-pressed={active === opt.value}
          className={tabClass(opt.value)}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
