import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-24 items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">Not found</h2>
      <p className="text-sm text-black/60 dark:text-white/60 max-w-md">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="text-sm px-4 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
      >
        ← All Time High
      </Link>
    </div>
  );
}
