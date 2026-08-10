import { MainData } from "@/lib/types";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

export function MainDataTable({ rows }: { rows: MainData[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60 py-10 text-center">
        No records match your search.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm border-collapse min-w-[1200px]">
        <thead>
          <tr className="bg-black/5 dark:bg-white/10 text-left">
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">IPO Date</th>
            <th className="px-3 py-2 font-medium">Year / Basis</th>
            <th className="px-3 py-2 font-medium">Qtr End</th>
            <th className="px-3 py-2 font-medium">Net Sales (₹Cr)</th>
            <th className="px-3 py-2 font-medium">PAT (₹Cr)</th>
            <th className="px-3 py-2 font-medium">Op. Profit (₹Cr)</th>
            <th className="px-3 py-2 font-medium">PBIDTM%</th>
            <th className="px-3 py-2 font-medium">SHP End</th>
            <th className="px-3 py-2 font-medium">Institutions%</th>
            <th className="px-3 py-2 font-medium">FII%</th>
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
                {r.industry ? (
                  <span className="block text-xs font-normal text-black/50 dark:text-white/50">
                    {r.industry}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {formatDate(r.ipo_list_date)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {r.source_year}
                {r.qtr_basis ? (
                  <span className="ml-1.5 inline-block rounded px-1.5 py-0.5 text-xs bg-black/10 dark:bg-white/15">
                    {r.qtr_basis === "S" ? "Standalone" : "Consolidated"}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {formatDate(r.qtr_date_end)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{formatNumber(r.qtr_net_sales)}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatNumber(r.qtr_profit_after_tax)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatNumber(r.qtr_operating_profit_excl_oi)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatPercent(r.qtr_pbidtm_pct_excl_oi)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {formatDate(r.shp_date_end)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatPercent(r.shp_institutions_pct)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{formatPercent(r.shp_fii_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
