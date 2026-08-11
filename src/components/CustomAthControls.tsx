"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { MIN_FISCAL_YEAR, MAX_FISCAL_YEAR, DEFAULT_FISCAL_YEAR, QUARTER_OPTIONS } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

const YEARS = Array.from(
  { length: MAX_FISCAL_YEAR - MIN_FISCAL_YEAR + 1 },
  (_, i) => MAX_FISCAL_YEAR - i
);

export function CustomAthControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const quarter = searchParams.get("quarter") ?? "all";
  const isLatest = quarter === "latest";
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(urlQ);
  const [syncedQ, setSyncedQ] = useState(urlQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (urlQ !== syncedQ) {
    setSyncedQ(urlQ);
    setQ(urlQ);
  }

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function onSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ q: value || null }), 300);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={q}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by company name, ISIN, or symbol..."
        className="w-full sm:w-80 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40"
      />
      <select
        value={searchParams.get("year") ?? String(DEFAULT_FISCAL_YEAR)}
        onChange={(e) => updateParams({ year: e.target.value || null })}
        disabled={isLatest}
        title={isLatest ? "Ignored while \"Latest quarter\" is selected" : undefined}
        className="w-full sm:w-36 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40 disabled:opacity-40"
      >
        {YEARS.map((year) => (
          <option key={year} value={year}>
            FY{year}
          </option>
        ))}
      </select>
      <select
        value={quarter}
        onChange={(e) => updateParams({ quarter: e.target.value === "all" ? null : e.target.value })}
        className="w-full sm:w-44 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40"
      >
        {QUARTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {(q || quarter !== "all") && (
        <button
          onClick={() => {
            setQ("");
            updateParams({ q: null, quarter: null });
          }}
          className="text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Clear
        </button>
      )}
      {isPending ? (
        <span className="flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50 sm:self-center">
          <Spinner className="h-3.5 w-3.5" />
          Loading…
        </span>
      ) : null}
    </div>
  );
}
