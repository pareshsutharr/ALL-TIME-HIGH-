"use client";

import Link from "next/link";

export function ErrorState({
  retry,
  backHref,
}: {
  retry: () => void;
  backHref?: string;
}) {
  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-24 items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-black/60 dark:text-white/60 max-w-md">
        We couldn&apos;t load this page. This is usually temporary — try again in a moment.
      </p>
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={retry}
          className="text-sm px-4 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Try again
        </button>
        {backHref ? (
          <Link
            href={backHref}
            className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white underline underline-offset-2"
          >
            ← All Time High
          </Link>
        ) : null}
      </div>
    </div>
  );
}
