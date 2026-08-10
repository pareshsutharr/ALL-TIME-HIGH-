import { SmeCompany } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { CompanyLink } from "@/components/CompanyLink";

export function SmeTable({ rows }: { rows: SmeCompany[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60 py-10 text-center">
        No SME companies match your search.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm border-collapse min-w-[750px]">
        <thead>
          <tr className="bg-black/5 dark:bg-white/10 text-left">
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">Industry</th>
            <th className="px-3 py-2 font-medium">ISIN</th>
            <th className="px-3 py-2 font-medium">IPO Date</th>
            <th className="px-3 py-2 font-medium">Accord Code</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              <td className="px-3 py-2 font-medium">
                <CompanyLink name={c.company_name} nseSymbol={c.nse_symbol} bseCode={c.bse_code} />
              </td>
              <td className="px-3 py-2 text-black/70 dark:text-white/70">
                {c.industry ?? "—"}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-black/70 dark:text-white/70">
                {c.isin ?? "—"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                {formatDate(c.ipo_list_date)}
              </td>
              <td className="px-3 py-2 text-black/70 dark:text-white/70">
                {c.accord_code}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
