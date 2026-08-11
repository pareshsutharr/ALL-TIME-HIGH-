import { createClient } from "@/utils/supabase/server";
import {
  Company,
  SmeCompany,
  MainData,
  CompanyAth,
  CustomAthRow,
  AthMetric,
  ATH_METRICS,
  QuarterFilter,
  PAGE_SIZE,
  EXPORT_LIMIT,
  MatchMode,
  MultiMetricRow,
  Board,
} from "@/lib/types";

type ListParams = {
  q?: string;
  industry?: string;
  page: number;
};

type MainDataListParams = ListParams & {
  year?: number;
};

// Supabase's PostgREST caps every request at 1000 rows server-side
// regardless of the `.range()` requested — a single `.range(0, N-1)` call
// silently truncates to 1000 rows for any N > 1000. Anywhere we need more
// than one page's worth of unpaginated data (exports, and the Custom ATH
// multi-metric query which groups in JS before paginating), page through
// in 1000-row chunks instead.
const SUPABASE_MAX_ROWS = 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  limit: number
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  while (offset < limit) {
    const to = Math.min(offset + SUPABASE_MAX_ROWS, limit) - 1;
    const page = await fetchPage(offset, to);
    rows.push(...page);
    if (page.length < to - offset + 1) break;
    offset += SUPABASE_MAX_ROWS;
  }
  return rows;
}

export async function getCompanies(params: ListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .order("company_name", { ascending: true })
    .range(from, to);

  if (params.q) {
    const term = params.q.replace(/[%_]/g, "");
    query = query.or(
      `company_name.ilike.%${term}%,isin.ilike.%${term}%,nse_symbol.ilike.%${term}%,bse_code.ilike.%${term}%`
    );
  }
  if (params.industry) {
    query = query.eq("industry", params.industry);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as Company[], count: count ?? 0 };
}

export async function getCompaniesExport(params: Omit<ListParams, "page">) {
  const supabase = await createClient();
  return fetchAllRows<Company>(async (from, to) => {
    let query = supabase
      .from("companies")
      .select("*")
      .order("company_name", { ascending: true })
      .range(from, to);

    if (params.q) {
      const term = params.q.replace(/[%_]/g, "");
      query = query.or(
        `company_name.ilike.%${term}%,isin.ilike.%${term}%,nse_symbol.ilike.%${term}%,bse_code.ilike.%${term}%`
      );
    }
    if (params.industry) {
      query = query.eq("industry", params.industry);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Company[];
  }, EXPORT_LIMIT);
}

export async function getSmeCompanies(params: ListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("sme_companies_enriched")
    .select("*", { count: "exact" })
    .order("company_name", { ascending: true })
    .range(from, to);

  if (params.q) {
    const term = params.q.replace(/[%_]/g, "");
    query = query.or(`company_name.ilike.%${term}%,isin.ilike.%${term}%`);
  }
  if (params.industry) {
    query = query.eq("industry", params.industry);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as SmeCompany[], count: count ?? 0 };
}

export async function getSmeCompaniesExport(params: Omit<ListParams, "page">) {
  const supabase = await createClient();
  return fetchAllRows<SmeCompany>(async (from, to) => {
    let query = supabase
      .from("sme_companies_enriched")
      .select("*")
      .order("company_name", { ascending: true })
      .range(from, to);

    if (params.q) {
      const term = params.q.replace(/[%_]/g, "");
      query = query.or(`company_name.ilike.%${term}%,isin.ilike.%${term}%`);
    }
    if (params.industry) {
      query = query.eq("industry", params.industry);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as SmeCompany[];
  }, EXPORT_LIMIT);
}

export async function getMainData(params: MainDataListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * PAGE_SIZE;

  // Plain ORDER BY + range() is fast here (the composite index on
  // (company_name, qtr_date_end) covers it directly, and industry/year
  // equality filters are estimated accurately by Postgres). Free-text `q`
  // uses `ilike '%term%'`, which Postgres badly overestimates the
  // selectivity of — combined with that same sort index it can pick a plan
  // that scans hundreds of thousands of rows instead of using the trigram
  // indexes. The search_main_data RPC fences the filter behind a materialized
  // CTE to force the good plan, so route only the q-present case through it.
  if (params.q) {
    const term = params.q.replace(/[%_]/g, "");
    const { data, error } = await supabase.rpc("search_main_data", {
      p_q: term,
      p_industry: params.industry ?? null,
      p_year: params.year ?? null,
      p_limit: PAGE_SIZE,
      p_offset: from,
    });
    if (error) throw error;
    const rows = (data ?? []) as (MainData & { total_count: number })[];
    const count = rows[0]?.total_count ?? 0;
    return { rows: rows as MainData[], count };
  }

  const to = from + PAGE_SIZE - 1;
  let query = supabase
    .from("main_data_enriched")
    .select("*", { count: "exact" })
    .order("company_name", { ascending: true })
    .order("qtr_date_end", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (params.industry) {
    query = query.eq("industry", params.industry);
  }
  if (params.year) {
    query = query.eq("source_year", params.year);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as MainData[], count: count ?? 0 };
}

export async function getMainDataExport(params: Omit<MainDataListParams, "page">) {
  const supabase = await createClient();

  if (params.q) {
    const term = params.q.replace(/[%_]/g, "");
    return fetchAllRows<MainData>(async (from, to) => {
      const { data, error } = await supabase.rpc("search_main_data", {
        p_q: term,
        p_industry: params.industry ?? null,
        p_year: params.year ?? null,
        p_limit: to - from + 1,
        p_offset: from,
      });
      if (error) throw error;
      return (data ?? []) as MainData[];
    }, EXPORT_LIMIT);
  }

  return fetchAllRows<MainData>(async (from, to) => {
    let query = supabase
      .from("main_data_enriched")
      .select("*")
      .order("company_name", { ascending: true })
      .order("qtr_date_end", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (params.industry) {
      query = query.eq("industry", params.industry);
    }
    if (params.year) {
      query = query.eq("source_year", params.year);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as MainData[];
  }, EXPORT_LIMIT);
}

export async function getCompanyAth(
  params: Omit<ListParams, "industry"> & { metric?: AthMetric }
) {
  const supabase = await createClient();
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from("companies_ath").select("*", { count: "exact" });

  // Peak-metric columns live on a table small enough (~5.5k rows) that a
  // plain sort is trivially fast — no index/materialization concerns here
  // the way there were for the 1.38M-row main_data table.
  if (params.metric) {
    query = query.order(`${params.metric}_peak`, { ascending: false, nullsFirst: false });
  } else {
    query = query.order("ath_date", { ascending: false });
  }
  query = query.range(from, to);

  if (params.q) {
    const term = params.q.replace(/[%_]/g, "");
    query = query.or(
      `company_name.ilike.%${term}%,isin.ilike.%${term}%,nse_symbol.ilike.%${term}%`
    );
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as CompanyAth[], count: count ?? 0 };
}

export async function getCompanyAthExport(params: { q?: string; metric?: AthMetric }) {
  const supabase = await createClient();
  return fetchAllRows<CompanyAth>(async (from, to) => {
    let query = supabase.from("companies_ath").select("*").range(from, to);

    if (params.metric) {
      query = query.order(`${params.metric}_peak`, { ascending: false, nullsFirst: false });
    } else {
      query = query.order("ath_date", { ascending: false });
    }

    if (params.q) {
      const term = params.q.replace(/[%_]/g, "");
      query = query.or(
        `company_name.ilike.%${term}%,isin.ilike.%${term}%,nse_symbol.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CompanyAth[];
  }, EXPORT_LIMIT);
}

// Safety ceiling for company_metric_peaks (companies × metrics, realistically
// well under this) — not a deliberate cap on results the way EXPORT_LIMIT is.
const CUSTOM_ATH_FETCH_LIMIT = 50000;

const QUARTER_NUMBERS: Record<string, number> = { q1: 1, q2: 2, q3: 3, q4: 4 };

type MetricPeaksTable =
  | "company_metric_peaks"
  | "sme_company_metric_peaks"
  | "all_company_metric_peaks";

function metricPeaksTable(board?: Board): MetricPeaksTable {
  if (board === "sme") return "sme_company_metric_peaks";
  if (board === "all") return "all_company_metric_peaks";
  return "company_metric_peaks";
}

// "Latest" deliberately ignores the fiscal-year filter — it means "the most
// recent quarter in which anyone actually set an all-time record for this
// metric," which is a global concept per metric, not scoped to a year.
async function getLatestPeakDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  metric: AthMetric,
  table: MetricPeaksTable
) {
  const { data, error } = await supabase
    .from(table)
    .select("peak_date")
    .eq("metric", metric)
    .order("peak_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.peak_date as string | undefined;
}

export async function getCustomAth(params: {
  metrics: AthMetric[];
  mode: MatchMode;
  fiscalYear: number;
  quarter?: QuarterFilter;
  board?: Board;
  q?: string;
  // Omit to get every matching row back unpaginated (used for exports).
  page?: number;
}) {
  const supabase = await createClient();
  const table = metricPeaksTable(params.board);

  let resolvedLatestDates: Partial<Record<AthMetric, string>> | undefined;
  let orFilter: string | undefined;

  if (params.quarter === "latest") {
    // "Latest" is a per-metric concept (each metric's own most recent record
    // quarter), so resolve one date per metric and OR the (metric, date) pairs.
    const entries = await Promise.all(
      params.metrics.map(async (m) => [m, await getLatestPeakDate(supabase, m, table)] as const)
    );
    resolvedLatestDates = Object.fromEntries(
      entries.filter((e): e is [AthMetric, string] => Boolean(e[1]))
    );
    orFilter = Object.entries(resolvedLatestDates)
      .map(([m, date]) => `and(metric.eq.${m},peak_date.eq.${date})`)
      .join(",");
  }

  // company_metric_peaks (or sme_company_metric_peaks) is bounded by
  // (companies × metrics), which can exceed PostgREST's 1000-row-per-request
  // cap once several metrics are selected — page through it rather than risk
  // silently dropping matches.
  const rawRows = await fetchAllRows<CustomAthRow>(async (from, to) => {
    let query = supabase
      .from(table)
      .select("*")
      .in("metric", params.metrics)
      .range(from, to);

    if (params.quarter === "latest") {
      query = orFilter ? query.or(orFilter) : query.eq("peak_date", "");
    } else {
      query = query.eq("peak_fiscal_year", params.fiscalYear);
      const quarterNumber = params.quarter ? QUARTER_NUMBERS[params.quarter] : undefined;
      if (quarterNumber) query = query.eq("peak_fiscal_quarter", quarterNumber);
    }

    if (params.q) {
      const term = params.q.replace(/[%_]/g, "");
      query = query.or(
        `company_name.ilike.%${term}%,isin.ilike.%${term}%,nse_symbol.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CustomAthRow[];
  }, CUSTOM_ATH_FETCH_LIMIT);

  // Selecting multiple metrics means each company can have one peak row per
  // metric — group those into a single row per company so AND/OR matching
  // and the table (one column pair per metric) both work off the same shape.
  // Keyed by accord_code (the one identifier guaranteed unique across both
  // the mainboard and SME source tables) rather than company_name, since the
  // "all" board unions rows from both.
  const byCompany = new Map<number, MultiMetricRow>();
  for (const r of rawRows) {
    let entry = byCompany.get(r.accord_code);
    if (!entry) {
      entry = {
        accord_code: r.accord_code,
        company_name: r.company_name,
        isin: r.isin,
        nse_symbol: r.nse_symbol,
        bse_code: r.bse_code,
        ipo_list_date: r.ipo_list_date,
        peaks: {},
      };
      byCompany.set(r.accord_code, entry);
    }
    entry.peaks[r.metric] = {
      value: r.peak_value,
      date: r.peak_date,
      fiscal_year: r.peak_fiscal_year,
      fiscal_quarter: r.peak_fiscal_quarter,
      basis: r.peak_basis,
    };
  }

  let rows = Array.from(byCompany.values());
  if (params.mode === "and") {
    rows = rows.filter((r) => params.metrics.every((m) => r.peaks[m]));
  }

  rows.sort((a, b) => {
    const score = (r: MultiMetricRow) =>
      params.metrics.reduce((sum, m) => sum + (r.peaks[m]?.value ?? 0), 0);
    return score(b) - score(a);
  });

  const count = rows.length;
  if (params.page === undefined) {
    return { rows, count, resolvedLatestDates };
  }
  const from = (params.page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(from, from + PAGE_SIZE);

  return { rows: pageRows, count, resolvedLatestDates };
}

export async function getCustomAthCounts(
  fiscalYear: number,
  quarter?: QuarterFilter,
  board?: Board
): Promise<Record<AthMetric, number>> {
  const supabase = await createClient();
  const table = metricPeaksTable(board);
  const metrics = ATH_METRICS.map((m) => m.value);
  const counts = await Promise.all(
    metrics.map(async (metric) => {
      let query = supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("metric", metric);

      if (quarter === "latest") {
        const latestDate = await getLatestPeakDate(supabase, metric, table);
        query = latestDate ? query.eq("peak_date", latestDate) : query.eq("peak_date", "");
      } else {
        query = query.eq("peak_fiscal_year", fiscalYear);
        const quarterNumber = quarter ? QUARTER_NUMBERS[quarter] : undefined;
        if (quarterNumber) query = query.eq("peak_fiscal_quarter", quarterNumber);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    })
  );
  return Object.fromEntries(metrics.map((m, i) => [m, counts[i]])) as Record<AthMetric, number>;
}

export async function getTableCount(
  table: "companies" | "sme_companies" | "main_data" | "companies_ath"
) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getIndustries(table: "companies" | "sme_companies" | "main_data") {
  const view =
    table === "companies"
      ? "companies_industries"
      : table === "sme_companies"
        ? "sme_companies_industries"
        : "main_data_industries";
  const supabase = await createClient();
  const { data, error } = await supabase.from(view).select("industry");
  if (error) throw error;
  return (data ?? []).map((r) => r.industry as string);
}

// A single company's history can't exceed a few hundred quarters even at
// quarterly granularity since 2001 — well under the 1000-row PostgREST cap,
// so no chunked fetch is needed here.
const COMPANY_QUARTERS_LIMIT = 500;

export type CompanyDetail = {
  company: Company | null;
  sme: SmeCompany | null;
  ath: CompanyAth | null;
  quarters: MainData[];
};

export async function getCompanyDetail(accordCode: number): Promise<CompanyDetail | null> {
  const supabase = await createClient();

  const [companyRes, smeRes, athRes, quartersRes] = await Promise.all([
    supabase.from("companies").select("*").eq("accord_code", accordCode).maybeSingle(),
    supabase.from("sme_companies_enriched").select("*").eq("accord_code", accordCode).maybeSingle(),
    supabase.from("companies_ath").select("*").eq("accord_code", accordCode).maybeSingle(),
    supabase
      .from("main_data_enriched")
      .select("*")
      .eq("accord_code", accordCode)
      .order("qtr_date_end", { ascending: false, nullsFirst: false })
      .limit(COMPANY_QUARTERS_LIMIT),
  ]);

  if (companyRes.error) throw companyRes.error;
  if (smeRes.error) throw smeRes.error;
  if (athRes.error) throw athRes.error;
  if (quartersRes.error) throw quartersRes.error;

  const company = (companyRes.data ?? null) as Company | null;
  const sme = (smeRes.data ?? null) as SmeCompany | null;
  if (!company && !sme) return null;

  return {
    company,
    sme,
    ath: (athRes.data ?? null) as CompanyAth | null,
    quarters: (quartersRes.data ?? []) as MainData[],
  };
}
