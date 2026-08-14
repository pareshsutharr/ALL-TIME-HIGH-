"use client";

import { useRef, useState } from "react";
import { formatDate, formatPrice } from "@/lib/format";

// The file itself transfers almost instantly (a few MB at most) — the real
// wait is the server processing ~7,750 companies, which has no native
// progress signal over a plain XHR response. So the bar is two phases: real
// byte progress while the request body is sending (0-15%), then an
// ease-out crawl toward 90% while waiting for the response, snapping to
// 100% only once the response actually arrives.
const UPLOAD_PHASE_WEIGHT = 15;
const PROCESSING_CEILING = 90;

type NewHigh = {
  accord_code: number;
  company_name: string;
  exchange: "BSE" | "NSE";
  kind: "ATH" | "52W";
  price: number;
  previous: number;
};

type FieldChange = { field: string; from: unknown; to: unknown };
type CompanyChange = { accord_code: number; company_name: string; changes: FieldChange[] };
type QuarterChange = { accord_code: number; company_name: string; qtr_date_end: string; changes: FieldChange[] };
type RoeRoceChange = { accord_code: number; company_name: string; fy_date_end: string; changes: FieldChange[] };

type IngestSummary = {
  noChanges: boolean;
  companiesInFile: number;
  companiesChanged: number;
  newCompanies: number;
  newHighs: NewHigh[];
  quarterRowsInFile: number;
  quarterRowsChanged: number;
  roeRoceRowsInFile: number;
  roeRoceRowsChanged: number;
  companyChanges: CompanyChange[];
  companyChangesTruncated: boolean;
  quarterChanges: QuarterChange[];
  quarterChangesTruncated: boolean;
  roeRoceChanges: RoeRoceChange[];
  roeRoceChangesTruncated: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  company_name: "Company name",
  ipo_list_date: "IPO date",
  isin: "ISIN",
  industry: "Industry",
  sector: "Sector",
  nse_symbol: "NSE symbol",
  bse_code: "BSE code",
  bse_52w_high_date: "BSE 52W high date",
  bse_52w_high_price: "BSE 52W high price",
  bse_ath_date: "BSE ATH date",
  bse_ath_price: "BSE ATH price",
  nse_52w_high_date: "NSE 52W high date",
  nse_52w_high_price: "NSE 52W high price",
  nse_ath_date: "NSE ATH date",
  nse_ath_price: "NSE ATH price",
  qtr_net_sales: "Net sales",
  qtr_profit_after_tax: "PAT",
  qtr_change_in_stocks: "Change in stocks",
  qtr_cost_of_services_raw_materials: "Cost of services / raw materials",
  qtr_purchase_of_finished_goods: "Purchase of finished goods",
  qtr_operating_profit_excl_oi: "Operating profit (excl. OI)",
  qtr_pbidtm_pct_excl_oi: "PBIDTM % (excl. OI)",
  shp_date_end: "Shareholding date",
  shp_institutions_pct: "Institutions %",
  shp_fii_pct: "FII %",
  shp_fvci_pct: "FVCI %",
  shp_fpi_pct: "FPI %",
  shp_ffi_banks_pct: "FFI/Banks %",
  shp_foreign_bodies_dr_pct: "Foreign bodies DR %",
  roe_pct: "ROE %",
  roce_pct: "ROCE %",
};

function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (typeof value === "string" && /date/i.test(field)) return formatDate(value);
  return String(value);
}

type Status = "idle" | "uploading" | "done" | "error";

export function DailyUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"uploading" | "processing">("uploading");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setSummary(null);
    setProgress(0);
    setPhase("uploading");

    const formData = new FormData();
    formData.append("file", file);

    let crawlInterval: ReturnType<typeof setInterval> | undefined;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload-daily");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      setProgress((event.loaded / event.total) * UPLOAD_PHASE_WEIGHT);
    };

    xhr.upload.onload = () => {
      setPhase("processing");
      setProgress(UPLOAD_PHASE_WEIGHT);
      // Ease toward (but never reach) the ceiling — ~90% of the remaining
      // gap closes every tick, so it slows down the longer processing runs
      // rather than stalling dead at a fixed number.
      crawlInterval = setInterval(() => {
        setProgress((p) => p + (PROCESSING_CEILING - p) * 0.05);
      }, 300);
    };

    xhr.onload = () => {
      if (crawlInterval) clearInterval(crawlInterval);
      let body: { summary?: IngestSummary; error?: string };
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        setError("Upload failed: could not read server response");
        setStatus("error");
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        setError(body.error || "Upload failed");
        setStatus("error");
        return;
      }
      setProgress(100);
      setSummary(body.summary!);
      setStatus("done");
    };

    xhr.onerror = () => {
      if (crawlInterval) clearInterval(crawlInterval);
      setError("Upload failed: network error");
      setStatus("error");
    };

    xhr.send(formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-lg">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Daily data file (.xlsx)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-black/10 dark:file:border-white/15 file:bg-transparent file:text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!fileName || status === "uploading"}
          className="text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed w-fit"
        >
          {status === "uploading" ? "Updating…" : "Upload & update"}
        </button>

        {status === "uploading" && (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-black dark:bg-white transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-black/50 dark:text-white/50">
              {phase === "uploading" ? "Uploading file…" : "Updating companies, quarters, and ROE/ROCE…"}
            </p>
          </div>
        )}

        <p className="text-xs text-black/50 dark:text-white/50">
          Only writes what actually changed (52-week/all-time highs only move
          up) and schedules a refresh of every all-time-high metric in the
          background when needed. If today&apos;s file matches what&apos;s
          already stored, nothing is written.
        </p>
      </form>

      {status === "error" && error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {status === "done" && summary && (
        <div className="flex flex-col gap-4">
          {summary.noChanges ? (
            <p className="text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.05]">
              Today&apos;s upload done — no changes made. This file matches what&apos;s already in the system
              ({summary.companiesInFile.toLocaleString("en-IN")} companies checked).
            </p>
          ) : (
            <p className="text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.05]">
              Today&apos;s upload done — changes applied below.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Companies checked" value={summary.companiesInFile} />
            <Stat label="Companies changed" value={summary.companiesChanged} />
            <Stat label="New companies" value={summary.newCompanies} />
            <Stat label="New highs today" value={summary.newHighs.length} />
            <Stat label="Quarter rows changed" value={summary.quarterRowsChanged} />
            <Stat label="ROE/ROCE rows changed" value={summary.roeRoceRowsChanged} />
          </div>

          {summary.newHighs.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">New all-time / 52-week highs today</h2>
              <div className="overflow-x-auto border border-black/10 dark:border-white/15 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-black/5 dark:bg-white/10 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium">Exchange</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">New price</th>
                      <th className="px-3 py-2 font-medium">Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.newHighs.map((h) => (
                      <tr key={`${h.accord_code}-${h.exchange}-${h.kind}`} className="border-t border-black/10 dark:border-white/15">
                        <td className="px-3 py-2">{h.company_name}</td>
                        <td className="px-3 py-2">{h.exchange}</td>
                        <td className="px-3 py-2">{h.kind === "ATH" ? "All-Time High" : "52-Week High"}</td>
                        <td className="px-3 py-2">{formatPrice(h.price)}</td>
                        <td className="px-3 py-2 text-black/60 dark:text-white/60">{formatPrice(h.previous)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ChangesTable
            title="Company changes"
            totalCount={summary.companiesChanged}
            truncated={summary.companyChangesTruncated}
            rows={summary.companyChanges.flatMap((c) =>
              c.changes.map((ch) => ({ key: c.company_name, ...ch }))
            )}
          />

          <ChangesTable
            title="Quarter changes"
            totalCount={summary.quarterRowsChanged}
            truncated={summary.quarterChangesTruncated}
            rows={summary.quarterChanges.flatMap((c) =>
              c.changes.map((ch) => ({ key: `${c.company_name} (Qtr ending ${formatDate(c.qtr_date_end)})`, ...ch }))
            )}
          />

          <ChangesTable
            title="ROE/ROCE changes"
            totalCount={summary.roeRoceRowsChanged}
            truncated={summary.roeRoceChangesTruncated}
            rows={summary.roeRoceChanges.flatMap((c) =>
              c.changes.map((ch) => ({ key: `${c.company_name} (FY ending ${formatDate(c.fy_date_end)})`, ...ch }))
            )}
          />

          <p className="text-xs text-black/50 dark:text-white/50">Updated {formatDate(new Date().toISOString())}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black/10 dark:border-white/15 rounded-lg px-3 py-2">
      <p className="text-xs text-black/50 dark:text-white/50">{label}</p>
      <p className="text-lg font-semibold">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}

function ChangesTable({
  title,
  totalCount,
  truncated,
  rows,
}: {
  title: string;
  totalCount: number;
  truncated: boolean;
  rows: { key: string; field: string; from: unknown; to: unknown }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">
        {title} ({totalCount.toLocaleString("en-IN")})
      </h2>
      <div className="overflow-x-auto border border-black/10 dark:border-white/15 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/10 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">To</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/10 dark:border-white/15">
                <td className="px-3 py-2">{r.key}</td>
                <td className="px-3 py-2 text-black/70 dark:text-white/70">{FIELD_LABELS[r.field] ?? r.field}</td>
                <td className="px-3 py-2 text-black/60 dark:text-white/60">{formatChangeValue(r.field, r.from)}</td>
                <td className="px-3 py-2">{formatChangeValue(r.field, r.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Showing the first {rows.length.toLocaleString("en-IN")} field changes — more not shown.
        </p>
      )}
    </div>
  );
}
