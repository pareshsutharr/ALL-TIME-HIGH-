import Link from "next/link";
import {
  getCompanies,
  getSmeCompanies,
  getMainData,
  getCompanyAth,
  getIndustries,
  getTableCount,
} from "@/lib/data";
import { PAGE_SIZE, Tab, MIN_YEAR, MAX_YEAR, AthMetric, ATH_METRICS } from "@/lib/types";
import { Tabs } from "@/components/Tabs";
import { SearchControls } from "@/components/SearchControls";
import { Pagination } from "@/components/Pagination";
import { CompaniesTable } from "@/components/CompaniesTable";
import { SmeTable } from "@/components/SmeTable";
import { MainDataTable } from "@/components/MainDataTable";
import { AthTable } from "@/components/AthTable";
import { DownloadExcelButton } from "@/components/DownloadExcelButton";

type SearchParams = {
  tab?: string;
  q?: string;
  industry?: string;
  year?: string;
  metric?: string;
  page?: string;
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

// The home page fires several Supabase calls at once via Promise.all — a
// transient failure in any single one (a cold connection, a momentary
// pooler hiccup) would otherwise reject the whole batch and crash the page
// for everyone. Fall back to an empty/zero result per call instead, so one
// flaky query degrades that one number instead of taking down the page.
function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch((err) => {
    console.error("Home page data fetch failed, falling back:", err);
    return fallback;
  });
}

function safeMaybe<T>(promise: Promise<T> | null, fallback: T): Promise<T> | null {
  return promise === null ? null : safe(promise, fallback);
}

const EMPTY_LIST = { rows: [], count: 0 };

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
  ] = await Promise.all([
    safeMaybe(tab === "companies" ? getCompanies(listParams) : null, EMPTY_LIST),
    safeMaybe(tab === "sme" ? getSmeCompanies(listParams) : null, EMPTY_LIST),
    safeMaybe(tab === "main" ? getMainData({ ...listParams, year }) : null, EMPTY_LIST),
    safeMaybe(tab === "ath" ? getCompanyAth({ q, page, metric }) : null, EMPTY_LIST),
    safe(industriesTable ? getIndustries(industriesTable) : Promise.resolve([]), []),
    safe(getTableCount("companies"), 0),
    safe(getTableCount("sme_companies"), 0),
    safe(getTableCount("main_data"), 0),
    safe(getTableCount("companies_ath"), 0),
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

      <footer className="mt-2 pt-4 border-t border-black/10 dark:border-white/15">
        <Link href="/admin" className="text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70">
          Admin: daily data update →
        </Link>
      </footer>
    </div>
  );
}
