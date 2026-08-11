"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ATH_METRICS } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

export function SearchControls({
  industries,
  years,
  metrics,
}: {
  industries?: string[];
  years?: number[];
  metrics?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
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

  const hasFilters =
    q || searchParams.get("industry") || searchParams.get("year") || searchParams.get("metric");

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={q}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by company name, ISIN, or symbol..."
        className="w-full sm:w-80 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40"
      />
      {industries ? (
        <select
          value={searchParams.get("industry") ?? ""}
          onChange={(e) => updateParams({ industry: e.target.value || null })}
          className="w-full sm:w-64 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40"
        >
          <option value="">All industries</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      ) : null}
      {years ? (
        <select
          value={searchParams.get("year") ?? ""}
          onChange={(e) => updateParams({ year: e.target.value || null })}
          className="w-full sm:w-36 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40"
        >
          <option value="">All years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      ) : null}
      {metrics ? (
        <select
          value={searchParams.get("metric") ?? ""}
          onChange={(e) => updateParams({ metric: e.target.value || null })}
          className="w-full sm:w-48 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40"
        >
          <option value="">Sort by ATH date</option>
          {ATH_METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              All-Time High {m.label}
            </option>
          ))}
        </select>
      ) : null}
      {hasFilters && (
        <button
          onClick={() => {
            setQ("");
            updateParams({ q: null, industry: null, year: null, metric: null });
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
