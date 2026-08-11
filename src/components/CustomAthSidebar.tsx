import Link from "next/link";
import {
  AthMetric,
  ATH_METRICS,
  Board,
  BOARD_OPTIONS,
  DEFAULT_FISCAL_YEAR,
  DEFAULT_VISIBLE_ATH_METRICS,
  MatchMode,
  QuarterFilter,
  QUARTER_OPTIONS,
  SME_UNSUPPORTED_METRICS,
  MIN_FISCAL_YEAR,
  MAX_FISCAL_YEAR,
} from "@/lib/types";
import { FilterSection } from "@/components/filters/FilterSection";
import { SegmentButtons } from "@/components/filters/SegmentButtons";
import { CheckboxFilterList, CheckboxOption } from "@/components/filters/CheckboxFilterList";
import { SelectFilter } from "@/components/filters/SelectFilter";

const YEARS = Array.from(
  { length: MAX_FISCAL_YEAR - MIN_FISCAL_YEAR + 1 },
  (_, i) => MAX_FISCAL_YEAR - i
);

function buildHref(
  board: Board,
  metrics: AthMetric[],
  mode: MatchMode,
  year: number,
  quarter: QuarterFilter,
  q?: string
) {
  const params = new URLSearchParams();
  if (board !== "mainboard") params.set("board", board);
  params.set("metric", metrics.join(","));
  if (mode !== "or") params.set("mode", mode);
  params.set("year", String(year));
  if (quarter !== "all") params.set("quarter", quarter);
  if (q) params.set("q", q);
  return `/custom-ath?${params.toString()}`;
}

export function CustomAthSidebar({
  board,
  metrics,
  mode,
  year,
  quarter,
  q,
  counts,
}: {
  board: Board;
  metrics: AthMetric[];
  mode: MatchMode;
  year: number;
  quarter: QuarterFilter;
  q?: string;
  counts: Record<AthMetric, number>;
}) {
  const boardOptions = BOARD_OPTIONS.map((opt) => {
    // Switching to SME drops any selected metric it can't support (52-week
    // highs only exist on the mainboard `companies` table).
    const supported =
      opt.value === "sme" ? metrics.filter((m) => !SME_UNSUPPORTED_METRICS.includes(m)) : metrics;
    return {
      value: opt.value,
      label: opt.label,
      href: buildHref(opt.value, supported.length > 0 ? supported : ["sales"], mode, year, quarter, q),
    };
  });

  const availableMetrics =
    board === "sme" ? ATH_METRICS.filter((m) => !SME_UNSUPPORTED_METRICS.includes(m.value)) : ATH_METRICS;

  function metricHref(metric: AthMetric) {
    const next = metrics.includes(metric) ? metrics.filter((m) => m !== metric) : [...metrics, metric];
    // Never allow deselecting the last remaining metric.
    return buildHref(board, next.length > 0 ? next : metrics, mode, year, quarter, q);
  }

  const toOption = (m: (typeof ATH_METRICS)[number]): CheckboxOption => ({
    value: m.value,
    label: m.label,
    count: counts[m.value],
    href: metricHref(m.value),
    checked: metrics.includes(m.value),
  });

  const defaultVisible = new Set(DEFAULT_VISIBLE_ATH_METRICS);
  const visibleMetrics = availableMetrics.filter((m) => defaultVisible.has(m.value)).map(toOption);
  const hiddenMetrics = availableMetrics.filter((m) => !defaultVisible.has(m.value)).map(toOption);

  const allValues = availableMetrics.map((m) => m.value);
  const allSelected = allValues.every((v) => metrics.includes(v));
  const selectAllHref = buildHref(board, allSelected ? ["sales"] : allValues, mode, year, quarter, q);

  const matchOptions = [
    { value: "or", label: "Any", href: buildHref(board, metrics, "or", year, quarter, q) },
    { value: "and", label: "All", href: buildHref(board, metrics, "and", year, quarter, q) },
  ];

  const isDefaultFilters =
    board === "mainboard" &&
    metrics.length === 1 &&
    metrics[0] === "sales" &&
    mode === "or" &&
    year === DEFAULT_FISCAL_YEAR &&
    quarter === "all" &&
    !q;

  return (
    <div className="flex flex-col gap-6">
      {!isDefaultFilters ? (
        <Link
          href="/custom-ath"
          className="w-fit text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white underline underline-offset-2"
        >
          Clear all filters
        </Link>
      ) : null}

      <FilterSection label="Board">
        <SegmentButtons options={boardOptions} active={board} orientation="vertical" />
      </FilterSection>

      <FilterSection label="Metric">
        <CheckboxFilterList visible={visibleMetrics} hidden={hiddenMetrics} moreLabel="more metrics" />
        <Link
          href={selectAllHref}
          className="mt-1.5 w-fit text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white underline underline-offset-2"
        >
          {allSelected ? "Reset to Sales" : "Select all"}
        </Link>
      </FilterSection>

      {metrics.length > 1 ? (
        <FilterSection label="Match">
          <SegmentButtons options={matchOptions} active={mode} orientation="horizontal" />
        </FilterSection>
      ) : null}

      <FilterSection label="Period">
        <div className="flex flex-col gap-2">
          <SelectFilter
            param="year"
            value={String(year)}
            disabled={quarter === "latest"}
            disabledTitle='Ignored while "Latest quarter" is selected'
            options={YEARS.map((y) => ({ value: String(y), label: `FY${y}` }))}
          />
          <SelectFilter
            param="quarter"
            value={quarter}
            clearValue="all"
            options={QUARTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
      </FilterSection>
    </div>
  );
}
