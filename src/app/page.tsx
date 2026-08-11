import Link from "next/link";
import {
  getCompanies,
  getSmeCompanies,
  getMainData,
  getCompanyAth,
  getIndustries,
  getTableCount,
  getTopIndustries,
} from "@/lib/data";
import {
  PAGE_SIZE,
  Tab,
  MIN_YEAR,
  MAX_YEAR,
  AthMetric,
  ATH_METRICS,
  QuarterFilter,
  DEFAULT_FISCAL_YEAR,
} from "@/lib/types";
import { Tabs } from "@/components/Tabs";
import { SearchControls } from "@/components/SearchControls";
import { Pagination } from "@/components/Pagination";
import { CompaniesTable } from "@/components/CompaniesTable";
import { SmeTable } from "@/components/SmeTable";
import { MainDataTable } from "@/components/MainDataTable";
import { AthTable } from "@/components/AthTable";
import { DownloadExcelButton } from "@/components/DownloadExcelButton";
import { TopSectorCard } from "@/components/TopSectorCard";

type SearchParams = {
  tab?: string;
  q?: string;
  industry?: string;
  year?: string;
  metric?: string;
  page?: string;
  sectorYear?: string;
  sectorQuarter?: string;
};

function resolveMetric(rawMetric: string | undefined): AthMetric | undefined {
  return ATH_METRICS.some((m) => m.value === rawMetric) ? (rawMetric as AthMetric) : undefined;
}

const YEAR_OPTIONS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MAX_YEAR - i
);

function resolveTab(rawTab: string | undefined): Tab {
  if (rawTab === "sme" || rawTab === "main" || rawTab === "ath") return rawTab;
  return "companies";
}

function resolveSectorQuarter(raw: string | undefined): QuarterFilter {
  return raw === "q1" || raw === "q2" || raw === "q3" || raw === "q4" ? raw : "all";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tab = resolveTab(params.tab);
  const q = params.q?.trim() || undefined;
  const industry = params.industry || undefined;
  const year = Number(params.year) || undefined;
  const metric = resolveMetric(params.metric);
  const page = Math.max(1, Number(params.page) || 1);
  const sectorYear = Number(params.sectorYear) || DEFAULT_FISCAL_YEAR;
  const sectorQuarter = resolveSectorQuarter(params.sectorQuarter);

  const industriesTable =
    tab === "sme" ? "sme_companies" : tab === "main" ? "main_data" : tab === "ath" ? null : "companies";
  const listParams = { q, industry, page };

  const [
    companiesResult,
    smeResult,
    mainResult,
    athResult,
    industries,
    companiesCount,
    smeCount,
    mainDataCount,
    athCount,
    topIndustries,
  ] = await Promise.all([
    tab === "companies" ? getCompanies(listParams) : null,
    tab === "sme" ? getSmeCompanies(listParams) : null,
    tab === "main" ? getMainData({ ...listParams, year }) : null,
    tab === "ath" ? getCompanyAth({ q, page, metric }) : null,
    industriesTable ? getIndustries(industriesTable) : Promise.resolve([]),
    getTableCount("companies"),
    getTableCount("sme_companies"),
    getTableCount("main_data"),
    getTableCount("companies_ath"),
    getTopIndustries({ fiscalYear: sectorYear, quarter: sectorQuarter, limit: 5 }),
  ]);

  const activeResult = companiesResult ?? smeResult ?? mainResult ?? athResult!;
  const rowCount = activeResult.count;
  const rowsShown = activeResult.rows.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const p = new URLSearchParams();
    p.set("tab", tab);
    if (q) p.set("q", q);
    if (industry) p.set("industry", industry);
    if (year) p.set("year", String(year));
    if (metric) p.set("metric", metric);
    if (sectorYear !== DEFAULT_FISCAL_YEAR) p.set("sectorYear", String(sectorYear));
    if (sectorQuarter !== "all") p.set("sectorQuarter", sectorQuarter);
    p.set("page", String(targetPage));
    return `/?${p.toString()}`;
  }

  function buildExportHref() {
    const p = new URLSearchParams();
    p.set("type", tab);
    if (q) p.set("q", q);
    if (industry) p.set("industry", industry);
    if (year) p.set("year", String(year));
    if (metric) p.set("metric", metric);
    return `/api/export?${p.toString()}`;
  }

  const tabLabel =
    tab === "sme"
      ? "SME companies"
      : tab === "main"
        ? "records"
        : tab === "ath"
          ? "all-time highs"
          : "companies";

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">All Time High</h1>
          <Link
            href="/custom-ath"
            className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Custom ATH by Year →
          </Link>
        </div>
        <p className="text-sm text-black/60 dark:text-white/60">
          Indian listed companies with BSE / NSE 52-week highs, plus quarterly
          financials and shareholding pattern history (2001–2026).
        </p>
      </header>

      <TopSectorCard fiscalYear={sectorYear} quarter={sectorQuarter} industries={topIndustries} />

      <Tabs
        active={tab}
        q={q}
        companiesCount={companiesCount}
        smeCount={smeCount}
        mainDataCount={mainDataCount}
        athCount={athCount}
      />

      <SearchControls
        industries={tab === "ath" ? undefined : industries}
        years={tab === "main" ? YEAR_OPTIONS : undefined}
        metrics={tab === "ath"}
      />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-black/60 dark:text-white/60">
          Showing {rowsShown} of {rowCount.toLocaleString("en-IN")} {tabLabel}
        </p>
        <DownloadExcelButton href={buildExportHref()} />
      </div>

      {tab === "sme" ? (
        <SmeTable rows={smeResult!.rows} />
      ) : tab === "main" ? (
        <MainDataTable rows={mainResult!.rows} />
      ) : tab === "ath" ? (
        <AthTable rows={athResult!.rows} metric={metric} />
      ) : (
        <CompaniesTable rows={companiesResult!.rows} />
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
