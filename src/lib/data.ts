import { createClient } from "@/utils/supabase/server";
import {
  Company,
  SmeCompany,
  MainData,
  CompanyAth,
  CustomAthRow,
  AthMetric,
  PAGE_SIZE,
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
    .from("sme_companies")
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
    .from("main_data")
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

export async function getCustomAth(params: {
  metric: AthMetric;
  fiscalYear: number;
  q?: string;
  page: number;
}) {
  const supabase = await createClient();
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("company_metric_peaks")
    .select("*", { count: "exact" })
    .eq("metric", params.metric)
    .eq("peak_fiscal_year", params.fiscalYear)
    .order("peak_value", { ascending: false })
    .range(from, to);

  if (params.q) {
    const term = params.q.replace(/[%_]/g, "");
    query = query.or(
      `company_name.ilike.%${term}%,isin.ilike.%${term}%,nse_symbol.ilike.%${term}%`
    );
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as CustomAthRow[], count: count ?? 0 };
}

export async function getCustomAthCounts(fiscalYear: number): Promise<Record<AthMetric, number>> {
  const supabase = await createClient();
  const metrics: AthMetric[] = ["sales", "pat", "ebidta"];
  const counts = await Promise.all(
    metrics.map(async (metric) => {
      const { count, error } = await supabase
        .from("company_metric_peaks")
        .select("*", { count: "exact", head: true })
        .eq("metric", metric)
        .eq("peak_fiscal_year", fiscalYear);
      if (error) throw error;
      return count ?? 0;
    })
  );
  return { sales: counts[0], pat: counts[1], ebidta: counts[2] };
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
