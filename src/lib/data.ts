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
  MatchMode,
  MultiMetricRow,
} from "@/lib/types";

type ListParams = {
  q?: string;
  industry?: string;
  page: number;
};

type MainDataListParams = ListParams & {
  year?: number;
};

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

const QUARTER_NUMBERS: Record<string, number> = { q1: 1, q2: 2, q3: 3, q4: 4 };

// "Latest" deliberately ignores the fiscal-year filter — it means "the most
// recent quarter in which anyone actually set an all-time record for this
// metric," which is a global concept per metric, not scoped to a year.
async function getLatestPeakDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  metric: AthMetric
) {
  const { data, error } = await supabase
    .from("company_metric_peaks")
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
  q?: string;
  page: number;
}) {
  const supabase = await createClient();

  let resolvedLatestDates: Partial<Record<AthMetric, string>> | undefined;

  let query = supabase.from("company_metric_peaks").select("*").in("metric", params.metrics);

  if (params.quarter === "latest") {
    // "Latest" is a per-metric concept (each metric's own most recent record
    // quarter), so resolve one date per metric and OR the (metric, date) pairs.
    const entries = await Promise.all(
      params.metrics.map(async (m) => [m, await getLatestPeakDate(supabase, m)] as const)
    );
    resolvedLatestDates = Object.fromEntries(
      entries.filter((e): e is [AthMetric, string] => Boolean(e[1]))
    );
    const orFilter = Object.entries(resolvedLatestDates)
      .map(([m, date]) => `and(metric.eq.${m},peak_date.eq.${date})`)
      .join(",");
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

  // Selecting multiple metrics means each company can have one peak row per
  // metric — group those into a single row per company so AND/OR matching
  // and the table (one column pair per metric) both work off the same shape.
  const byCompany = new Map<string, MultiMetricRow>();
  for (const r of (data ?? []) as CustomAthRow[]) {
    let entry = byCompany.get(r.company_name);
    if (!entry) {
      entry = {
        company_name: r.company_name,
        isin: r.isin,
        nse_symbol: r.nse_symbol,
        ipo_list_date: r.ipo_list_date,
        peaks: {},
      };
      byCompany.set(r.company_name, entry);
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
  const from = (params.page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(from, from + PAGE_SIZE);

  return { rows: pageRows, count, resolvedLatestDates };
}

export async function getCustomAthCounts(
  fiscalYear: number,
  quarter?: QuarterFilter
): Promise<Record<AthMetric, number>> {
  const supabase = await createClient();
  const metrics = ATH_METRICS.map((m) => m.value);
  const counts = await Promise.all(
    metrics.map(async (metric) => {
      let query = supabase
        .from("company_metric_peaks")
        .select("*", { count: "exact", head: true })
        .eq("metric", metric);

      if (quarter === "latest") {
        const latestDate = await getLatestPeakDate(supabase, metric);
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
