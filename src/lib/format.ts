export function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

// Indian fiscal year runs April-March (Q1 Apr-Jun ... Q4 Jan-Mar). Parses the
// "YYYY-MM-DD" string directly rather than via Date to avoid local-timezone
// shifts landing a date on the wrong side of a quarter boundary.
export function formatFiscalQuarter(dateStr: string): string {
  const month = Number(dateStr.slice(5, 7));
  const year = Number(dateStr.slice(0, 4));
  const fyYear = month >= 4 ? year + 1 : year;
  const quarter = month >= 4 && month <= 6 ? 1 : month >= 7 && month <= 9 ? 2 : month >= 10 ? 3 : 4;
  return `Q${quarter} FY${fyYear}`;
}
