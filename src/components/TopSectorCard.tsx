import {
  IndustryStat,
  QuarterFilter,
  QUARTER_OPTIONS,
  MIN_FISCAL_YEAR,
  MAX_FISCAL_YEAR,
} from "@/lib/types";
import { SelectFilter } from "@/components/filters/SelectFilter";

const YEARS = Array.from(
  { length: MAX_FISCAL_YEAR - MIN_FISCAL_YEAR + 1 },
  (_, i) => MAX_FISCAL_YEAR - i
);

// "Latest" isn't a meaningful concept for a sector aggregate (there's no
// single "latest" quarter shared across every industry), so this card only
// offers All quarters / Q1-Q4.
const SECTOR_QUARTER_OPTIONS = QUARTER_OPTIONS.filter((o) => o.value !== "latest");

function formatCr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

export function TopSectorCard({
  fiscalYear,
  quarter,
  industries,
}: {
  fiscalYear: number;
  quarter: QuarterFilter;
  industries: IndustryStat[];
}) {
  const [top, ...rest] = industries;

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15 p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-medium text-black/60 dark:text-white/60">Top Sector</h2>
          <p className="text-xs text-black/40 dark:text-white/40">Ranked by total quarterly Net Sales</p>
        </div>
        <div className="flex gap-2">
          <div className="w-28">
            <SelectFilter
              param="sectorYear"
              value={String(fiscalYear)}
              options={YEARS.map((y) => ({ value: String(y), label: `FY${y}` }))}
            />
          </div>
          <div className="w-40">
            <SelectFilter
              param="sectorQuarter"
              value={quarter}
              clearValue="all"
              options={SECTOR_QUARTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
        </div>
      </div>

      {top ? (
        <>
          <div>
            <p className="text-xl font-semibold">{top.industry}</p>
            <p className="text-sm text-black/60 dark:text-white/60">
              {formatCr(top.total_sales)} across {top.company_count.toLocaleString("en-IN")} companies
            </p>
          </div>

          {rest.length > 0 ? (
            <ol className="flex flex-col gap-1.5 text-sm border-t border-black/5 dark:border-white/10 pt-3">
              {rest.map((r, i) => (
                <li
                  key={r.industry}
                  className="flex items-center justify-between gap-4 text-black/70 dark:text-white/70"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-4 shrink-0 text-black/40 dark:text-white/40">{i + 2}</span>
                    <span className="truncate">{r.industry}</span>
                  </span>
                  <span className="shrink-0 text-black/50 dark:text-white/50">
                    {formatCr(r.total_sales)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-black/60 dark:text-white/60">No sector data for this period.</p>
      )}
    </div>
  );
}
