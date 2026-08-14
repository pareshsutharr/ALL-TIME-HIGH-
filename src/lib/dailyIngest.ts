import { SupabaseClient } from "@supabase/supabase-js";
import { DailySnapshot } from "@/lib/dailyUpload";

export type NewHigh = { accord_code: number; company_name: string; exchange: "BSE" | "NSE"; kind: "ATH" | "52W"; price: number; previous: number };

export type IngestSummary = {
  companiesInFile: number;
  companiesUpserted: number;
  newCompanies: number;
  newHighs: NewHigh[];
  quarterRowsReplaced: number;
  roeRoceRowsUpserted: number;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type ExistingCompany = {
  accord_code: number;
  company_name: string;
  ipo_list_date: string | null;
  isin: string | null;
  industry: string | null;
  sector: string | null;
  nse_symbol: string | null;
  bse_code: string | null;
  bse_52w_high_date: string | null;
  bse_52w_high_price: number | null;
  bse_ath_date: string | null;
  bse_ath_price: number | null;
  nse_52w_high_date: string | null;
  nse_52w_high_price: number | null;
  nse_ath_date: string | null;
  nse_ath_price: number | null;
};

// Only move a peak price up, never down, and only when the incoming file
// actually carries a value for it — a blank cell shouldn't erase a
// previously recorded high.
function ratchet(
  newPrice: number | null,
  newDate: string | null,
  existingPrice: number | null,
  existingDate: string | null
): { price: number | null; date: string | null; isNewRecord: boolean } {
  if (newPrice !== null && (existingPrice === null || newPrice > existingPrice)) {
    return { price: newPrice, date: newDate ?? existingDate, isNewRecord: existingPrice !== null };
  }
  return { price: existingPrice, date: existingDate, isNewRecord: false };
}

async function fetchExistingCompanies(
  supabase: SupabaseClient,
  accordCodes: number[]
): Promise<Map<number, ExistingCompany>> {
  const byCode = new Map<number, ExistingCompany>();
  for (const codes of chunk(accordCodes, 300)) {
    const { data, error } = await supabase
      .from("companies")
      .select(
        "accord_code, company_name, ipo_list_date, isin, industry, sector, nse_symbol, bse_code, bse_52w_high_date, bse_52w_high_price, bse_ath_date, bse_ath_price, nse_52w_high_date, nse_52w_high_price, nse_ath_date, nse_ath_price"
      )
      .in("accord_code", codes);
    if (error) throw new Error(`Failed to load existing companies: ${error.message}`);
    for (const row of data ?? []) byCode.set(row.accord_code, row as ExistingCompany);
  }
  return byCode;
}

function yyyymmYear(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

export async function ingestDailySnapshot(
  supabase: SupabaseClient,
  snapshots: DailySnapshot[]
): Promise<IngestSummary> {
  const accordCodes = snapshots.map((s) => s.accord_code);
  const existingByCode = await fetchExistingCompanies(supabase, accordCodes);

  const companiesPayload: Record<string, unknown>[] = [];
  const newHighs: NewHigh[] = [];
  let newCompanies = 0;

  for (const s of snapshots) {
    const existing = existingByCode.get(s.accord_code);
    const companyName = s.company_name ?? existing?.company_name ?? null;
    if (!companyName) continue; // can't insert/keep a company with no name

    if (!existing) newCompanies++;

    const bse52w = ratchet(s.bse_52w_high_price, s.bse_52w_high_date, existing?.bse_52w_high_price ?? null, existing?.bse_52w_high_date ?? null);
    const bseAth = ratchet(s.bse_ath_price, s.bse_ath_date, existing?.bse_ath_price ?? null, existing?.bse_ath_date ?? null);
    const nse52w = ratchet(s.nse_52w_high_price, s.nse_52w_high_date, existing?.nse_52w_high_price ?? null, existing?.nse_52w_high_date ?? null);
    const nseAth = ratchet(s.nse_ath_price, s.nse_ath_date, existing?.nse_ath_price ?? null, existing?.nse_ath_date ?? null);

    if (bse52w.isNewRecord) newHighs.push({ accord_code: s.accord_code, company_name: companyName, exchange: "BSE", kind: "52W", price: bse52w.price!, previous: existing!.bse_52w_high_price! });
    if (bseAth.isNewRecord) newHighs.push({ accord_code: s.accord_code, company_name: companyName, exchange: "BSE", kind: "ATH", price: bseAth.price!, previous: existing!.bse_ath_price! });
    if (nse52w.isNewRecord) newHighs.push({ accord_code: s.accord_code, company_name: companyName, exchange: "NSE", kind: "52W", price: nse52w.price!, previous: existing!.nse_52w_high_price! });
    if (nseAth.isNewRecord) newHighs.push({ accord_code: s.accord_code, company_name: companyName, exchange: "NSE", kind: "ATH", price: nseAth.price!, previous: existing!.nse_ath_price! });

    companiesPayload.push({
      accord_code: s.accord_code,
      company_name: companyName,
      ipo_list_date: s.ipo_list_date ?? existing?.ipo_list_date ?? null,
      isin: s.isin ?? existing?.isin ?? null,
      industry: s.industry ?? existing?.industry ?? null,
      sector: s.sector ?? existing?.sector ?? null,
      nse_symbol: s.nse_symbol ?? existing?.nse_symbol ?? null,
      bse_code: s.bse_code ?? existing?.bse_code ?? null,
      bse_52w_high_date: bse52w.date,
      bse_52w_high_price: bse52w.price,
      bse_ath_date: bseAth.date,
      bse_ath_price: bseAth.price,
      nse_52w_high_date: nse52w.date,
      nse_52w_high_price: nse52w.price,
      nse_ath_date: nseAth.date,
      nse_ath_price: nseAth.price,
    });
  }

  for (const batch of chunk(companiesPayload, 500)) {
    const { error } = await supabase.from("companies").upsert(batch, { onConflict: "accord_code" });
    if (error) throw new Error(`Failed to upsert companies: ${error.message}`);
  }

  // main_data has no per-quarter unique key across its historical bulk
  // load (see the daily_upload_support migration), so replace rows for the
  // exact (accord_code, qtr_date_end) pairs in this file explicitly instead
  // of relying on ON CONFLICT.
  const quarterRows = snapshots.filter((s) => s.qtr_date_end !== null);
  if (quarterRows.length > 0) {
    const pairs = quarterRows.map((s) => ({ accord_code: s.accord_code, qtr_date_end: s.qtr_date_end }));
    for (const batch of chunk(pairs, 2000)) {
      const { error } = await supabase.rpc("delete_main_data_for_quarters", { pairs: batch });
      if (error) throw new Error(`Failed to clear existing quarter rows: ${error.message}`);
    }

    const mainDataPayload = quarterRows.map((s) => ({
      source_year: yyyymmYear(s.qtr_date_end!),
      accord_code: s.accord_code,
      company_name: s.company_name ?? existingByCode.get(s.accord_code)?.company_name ?? "",
      isin: s.isin,
      industry: s.industry,
      qtr_date_end: s.qtr_date_end,
      qtr_net_sales: s.qtr_net_sales,
      qtr_profit_after_tax: s.qtr_profit_after_tax,
      qtr_change_in_stocks: s.qtr_change_in_stocks,
      qtr_cost_of_services_raw_materials: s.qtr_cost_of_services_raw_materials,
      qtr_purchase_of_finished_goods: s.qtr_purchase_of_finished_goods,
      qtr_operating_profit_excl_oi: s.qtr_operating_profit_excl_oi,
      qtr_pbidtm_pct_excl_oi: s.qtr_pbidtm_pct_excl_oi,
      shp_date_end: s.shp_date_end,
      shp_institutions_pct: s.shp_institutions_pct,
      shp_fii_pct: s.shp_fii_pct,
      shp_fvci_pct: s.shp_fvci_pct,
      shp_fpi_pct: s.shp_fpi_pct,
      shp_ffi_banks_pct: s.shp_ffi_banks_pct,
      shp_foreign_bodies_dr_pct: s.shp_foreign_bodies_dr_pct,
      qtr_basis: null,
    }));
    for (const batch of chunk(mainDataPayload, 500)) {
      const { error } = await supabase.from("main_data").insert(batch);
      if (error) throw new Error(`Failed to insert quarter rows: ${error.message}`);
    }
  }

  const roeRoceRows = snapshots.filter(
    (s) => s.fy_date_end !== null && (s.roe_pct !== null || s.roce_pct !== null)
  );
  if (roeRoceRows.length > 0) {
    const roeRocePayload = roeRoceRows.map((s) => ({
      accord_code: s.accord_code,
      company_name: s.company_name ?? existingByCode.get(s.accord_code)?.company_name ?? "",
      isin: s.isin,
      industry: s.industry,
      fy_date_end: s.fy_date_end,
      roe_pct: s.roe_pct,
      roce_pct: s.roce_pct,
      basis: null,
    }));
    for (const batch of chunk(roeRocePayload, 500)) {
      const { error } = await supabase
        .from("roe_roce_data")
        .upsert(batch, { onConflict: "accord_code,fy_date_end" });
      if (error) throw new Error(`Failed to upsert ROE/ROCE rows: ${error.message}`);
    }
  }

  // The refresh itself reliably takes longer than any HTTP gateway timeout
  // (see the daily_upload_async_refresh migration), so this only schedules
  // it — the actual REFRESH MATERIALIZED VIEW calls run a few seconds later
  // inside a pg_cron background job, decoupled from this request.
  const { error: refreshError } = await supabase.rpc("schedule_daily_metric_peaks_refresh");
  if (refreshError) throw new Error(`Failed to schedule peak view refresh: ${refreshError.message}`);

  return {
    companiesInFile: snapshots.length,
    companiesUpserted: companiesPayload.length,
    newCompanies,
    newHighs,
    quarterRowsReplaced: quarterRows.length,
    roeRoceRowsUpserted: roeRoceRows.length,
  };
}
