import Link from "next/link";

export type SegmentOption = { value: string; label: string; href: string };

// A generic Link-driven segmented control. "vertical" renders full-width
// stacked buttons (e.g. a board picker); "horizontal" renders a compact
// pill-group sharing one bordered container (e.g. an Any/All toggle).
export function SegmentButtons({
  options,
  active,
  orientation = "horizontal",
}: {
  options: SegmentOption[];
  active: string;
  orientation?: "vertical" | "horizontal";
}) {
  if (orientation === "vertical") {
    return (
      <div className="flex flex-col gap-1.5">
        {options.map((opt) => {
          const isActive = opt.value === active;
          return (
            <Link
              key={opt.value}
              href={opt.href}
              aria-pressed={isActive}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium border ${
                isActive
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                  : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex w-full gap-1 rounded-md border border-black/10 dark:border-white/15 p-0.5">
      {options.map((opt) => {
        const isActive = opt.value === active;
        return (
          <Link
            key={opt.value}
            href={opt.href}
            aria-pressed={isActive}
            className={`flex-1 text-center px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wide ${
              isActive
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
