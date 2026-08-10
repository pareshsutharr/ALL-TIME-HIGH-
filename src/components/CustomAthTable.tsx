import { Fragment } from "react";
import { AthMetric, MultiMetricRow, ATH_METRICS } from "@/lib/types";
import { formatDate, formatFiscalQuarter, formatNumber, formatPercent } from "@/lib/format";

function metricInfo(metric: AthMetric) {
  return ATH_METRICS.find((m) => m.value === metric)!;
}

export function CustomAthTable({
  rows,
  metrics,
}: {
  rows: MultiMetricRow[];
  metrics: AthMetric[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60 py-10 text-center">
        No companies match the selected metrics in this period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-black/5 dark:bg-white/10 text-left">
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">IPO Date</th>
            {metrics.map((metric) => {
              const info = metricInfo(metric);
              return (
                <Fragment key={metric}>
                  <th className="px-3 py-2 font-medium">
                    All-Time High {info.label}
                    {info.isPercent ? "" : " (₹Cr)"}
                  </th>
                  <th className="px-3 py-2 font-medium">{info.label} Quarter</th>
                </Fragment>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.company_name}
              className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              <td className="px-3 py-2 font-medium">
                {r.company_name}
                {r.nse_symbol ? (
                  <span className="block text-xs font-normal text-black/50 dark:text-white/50">
                    {r.nse_symbol}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {formatDate(r.ipo_list_date)}
              </td>
              {metrics.map((metric) => {
                const info = metricInfo(metric);
                const formatPeak = info.isPercent ? formatPercent : formatNumber;
                const peak = r.peaks[metric];
                return (
                  <Fragment key={metric}>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">
                      {peak ? formatPeak(peak.value) : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                      {peak ? (
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
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
