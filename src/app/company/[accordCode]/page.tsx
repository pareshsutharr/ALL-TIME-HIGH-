import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/data";
import { ATH_METRICS } from "@/lib/types";
import { athPeakFor } from "@/lib/athPeaks";
import { formatDate, formatFiscalQuarter, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { MainDataTable } from "@/components/MainDataTable";

function formatByUnit(unit: "cr" | "percent" | "price") {
  if (unit === "percent") return formatPercent;
  if (unit === "price") return formatPrice;
  return formatNumber;
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ accordCode: string }>;
}) {
  const { accordCode: raw } = await params;
  const accordCode = Number(raw);
  if (!Number.isFinite(accordCode)) notFound();

  const detail = await getCompanyDetail(accordCode);
  if (!detail) notFound();

  const { company, sme, ath, quarters } = detail;
  const name = company?.company_name ?? sme!.company_name;
  const isin = company?.isin ?? sme?.isin;
  const industry = company?.industry ?? sme?.industry;
  const sector = company?.sector;
  const ipoDate = company?.ipo_list_date ?? sme?.ipo_list_date ?? null;
  const nseSymbol = company?.nse_symbol;
  const bseCode = company?.bse_code;

  const peakRows = ath
    ? ATH_METRICS.map((m) => ({ metric: m, peak: athPeakFor(ath, m.value) })).filter(
        (r) => r.peak.value !== null
      )
    : [];

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white w-fit"
        >
          ← All Time High
        </Link>
        <h1 className="text-2xl font-semibold">{name}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/60 dark:text-white/60">
          {nseSymbol ? <span>NSE: {nseSymbol}</span> : null}
          {bseCode ? <span>BSE: {bseCode}</span> : null}
          {isin ? <span className="font-mono text-xs">{isin}</span> : null}
          {industry ? <span>{industry}{sector ? ` · ${sector}` : ""}</span> : null}
          {ipoDate ? <span>IPO: {formatDate(ipoDate)}</span> : null}
        </div>
      </header>

      {company ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-black/10 dark:border-white/15 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black/60 dark:text-white/60">BSE</h2>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-black/60 dark:text-white/60">All-Time High</span>
              <span className="font-medium">
                {formatPrice(company.bse_ath_price)}
                {company.bse_ath_date ? (
                  <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                    {formatDate(company.bse_ath_date)}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-black/60 dark:text-white/60">52W High</span>
              <span className="font-medium">
                {formatPrice(company.bse_52w_high_price)}
                {company.bse_52w_high_date ? (
                  <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                    {formatDate(company.bse_52w_high_date)}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-black/10 dark:border-white/15 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black/60 dark:text-white/60">NSE</h2>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-black/60 dark:text-white/60">All-Time High</span>
              <span className="font-medium">
                {formatPrice(company.nse_ath_price)}
                {company.nse_ath_date ? (
                  <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                    {formatDate(company.nse_ath_date)}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-black/60 dark:text-white/60">52W High</span>
              <span className="font-medium">
                {formatPrice(company.nse_52w_high_price)}
                {company.nse_52w_high_date ? (
                  <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                    {formatDate(company.nse_52w_high_date)}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {peakRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">All-Time High Financial Records</h2>
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/10 text-left">
                  <th className="px-3 py-2 font-medium">Metric</th>
                  <th className="px-3 py-2 font-medium">Peak Value</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Quarter</th>
                  <th className="px-3 py-2 font-medium">Basis</th>
                </tr>
              </thead>
              <tbody>
                {peakRows.map(({ metric, peak }) => {
                  const formatPeak = formatByUnit(metric.unit);
                  return (
                    <tr
                      key={metric.value}
                      className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                    >
                      <td className="px-3 py-2 font-medium">{metric.label}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatPeak(peak.value)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                        {formatDate(peak.date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                        {peak.date ? formatFiscalQuarter(peak.date) : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70 dark:text-white/70">
                        {peak.basis === "S" ? "Standalone" : peak.basis === "C" ? "Consolidated" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {quarters.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Quarterly Financials</h2>
          <MainDataTable rows={quarters} />
        </div>
      ) : null}

      {!company && !peakRows.length && !quarters.length ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No financial history on record for this company yet.
        </p>
      ) : null}
    </div>
  );
}
