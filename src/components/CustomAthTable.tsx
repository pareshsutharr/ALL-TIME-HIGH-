import { AthMetric, CustomAthRow } from "@/lib/types";
import { formatDate, formatFiscalQuarter, formatNumber } from "@/lib/format";

const METRIC_LABELS: Record<AthMetric, string> = {
  sales: "Sales",
  pat: "PAT",
  ebidta: "EBIDTA",
};

export function CustomAthTable({ rows, metric }: { rows: CustomAthRow[]; metric: AthMetric }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60 py-10 text-center">
        No companies set an all-time {METRIC_LABELS[metric]} record in this fiscal year.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-black/5 dark:bg-white/10 text-left">
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">All-Time High {METRIC_LABELS[metric]} (₹Cr)</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Quarter</th>
            <th className="px-3 py-2 font-medium">Basis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
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
              <td className="px-3 py-2 whitespace-nowrap font-medium">
                {formatNumber(r.peak_value)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {formatDate(r.peak_date)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {formatFiscalQuarter(r.peak_date)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {r.peak_basis === "S" ? "Standalone" : r.peak_basis === "C" ? "Consolidated" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
