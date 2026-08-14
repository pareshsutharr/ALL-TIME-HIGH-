"use client";

import { useRef, useState } from "react";
import { formatDate, formatPrice } from "@/lib/format";

type NewHigh = {
  accord_code: number;
  company_name: string;
  exchange: "BSE" | "NSE";
  kind: "ATH" | "52W";
  price: number;
  previous: number;
};

type IngestSummary = {
  companiesInFile: number;
  companiesUpserted: number;
  newCompanies: number;
  newHighs: NewHigh[];
  quarterRowsReplaced: number;
  roeRoceRowsUpserted: number;
};

type Status = "idle" | "uploading" | "done" | "error";

export function DailyUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<IngestSummary | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setSummary(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload-daily", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Upload failed");
      setSummary(body.summary as IngestSummary);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
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
        <p className="text-xs text-black/50 dark:text-white/50">
          Updates companies (52-week/all-time highs only move up), replaces the
          latest quarter&apos;s financials and ROE/ROCE, then schedules a refresh
          of every all-time-high metric — that refresh runs in the background
          and can take several minutes to finish on the full dataset.
        </p>
      </form>

      {status === "error" && error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {status === "done" && summary && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Companies in file" value={summary.companiesInFile} />
            <Stat label="Companies updated" value={summary.companiesUpserted} />
            <Stat label="New companies" value={summary.newCompanies} />
            <Stat label="New highs today" value={summary.newHighs.length} />
            <Stat label="Quarter rows replaced" value={summary.quarterRowsReplaced} />
            <Stat label="ROE/ROCE rows updated" value={summary.roeRoceRowsUpserted} />
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
