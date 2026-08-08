import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <Link
        href={buildHref(page - 1)}
        aria-disabled={prevDisabled}
        className={`px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 ${
          prevDisabled
            ? "pointer-events-none opacity-40"
            : "hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        Previous
      </Link>
      <span className="text-black/60 dark:text-white/60">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(page + 1)}
        aria-disabled={nextDisabled}
        className={`px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 ${
          nextDisabled
            ? "pointer-events-none opacity-40"
            : "hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        Next
      </Link>
    </div>
  );
}
