import { AthMetric, CompanyAth, ATH_METRICS } from "@/lib/types";
import { formatDate, formatFiscalQuarter, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { athPeakFor } from "@/lib/athPeaks";
import { CompanyLink } from "@/components/CompanyLink";

function formatByUnit(unit: "cr" | "percent" | "price") {
  if (unit === "percent") return formatPercent;
  if (unit === "price") return formatPrice;
  return formatNumber;
}

function metricInfo(metric: AthMetric) {
  return ATH_METRICS.find((m) => m.value === metric)!;
}

export function AthTable({ rows, metric }: { rows: CompanyAth[]; metric?: AthMetric }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60 py-10 text-center">
        No companies match your search.
      </p>
    );
  }

  const info = metric ? metricInfo(metric) : null;
  const formatPeak = formatByUnit(info?.unit ?? "cr");

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm border-collapse min-w-[1400px]">
        <thead>
          <tr className="bg-black/5 dark:bg-white/10 text-left">
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">IPO Date</th>
            <th className="px-3 py-2 font-medium">All-Time High</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Quarter</th>
            {info ? (
              <>
                <th className="px-3 py-2 font-medium">
                  All-Time High {info.label}
                  {info.unit === "cr" ? " (₹Cr)" : ""}
                </th>
                <th className="px-3 py-2 font-medium">{info.label} Quarter</th>
              </>
            ) : null}
            <th className="px-3 py-2 font-medium">Latest Financials</th>
            <th className="px-3 py-2 font-medium">Sales (₹Cr)</th>
            <th className="px-3 py-2 font-medium">PAT (₹Cr)</th>
            <th className="px-3 py-2 font-medium">Gross Sales Margin (₹Cr)</th>
            <th className="px-3 py-2 font-medium">EBIDTA (₹Cr)</th>
            <th className="px-3 py-2 font-medium">EBIDTA Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const peak = metric ? athPeakFor(c, metric) : null;
            return (
              <tr
                key={c.id}
                className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <td className="px-3 py-2 font-medium">
                  <CompanyLink name={c.company_name} isin={c.isin} nseSymbol={c.nse_symbol} bseCode={c.bse_code} />
                  {c.nse_symbol ? (
                    <span className="block text-xs font-normal text-black/50 dark:text-white/50">
                      {c.nse_symbol}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                  {formatDate(c.ipo_list_date)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  {formatPrice(c.ath_price)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                  {formatDate(c.ath_date)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                  {formatFiscalQuarter(c.ath_date)}
                </td>
                {peak ? (
                  <>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">
                      {formatPeak(peak.value)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                      {peak.date ? (
                        <>
                          {formatFiscalQuarter(peak.date)}
                          {peak.basis ? (
                            <span className="ml-1.5 inline-block rounded px-1.5 py-0.5 text-xs bg-black/10 dark:bg-white/15">
                              {peak.basis === "S" ? "Standalone" : "Consolidated"}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </>
                ) : null}
                <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                  {c.qtr_date_end ? (
                    <>
                      {formatFiscalQuarter(c.qtr_date_end)}
                      {c.qtr_basis ? (
                        <span className="ml-1.5 inline-block rounded px-1.5 py-0.5 text-xs bg-black/10 dark:bg-white/15">
                          {c.qtr_basis === "S" ? "Standalone" : "Consolidated"}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatNumber(c.sales)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatNumber(c.pat)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatNumber(c.gross_sales_margin)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatNumber(c.ebidta)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatPercent(c.ebidta_margin)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
