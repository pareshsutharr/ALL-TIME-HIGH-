"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M3 5h14M6 10h8M8.5 15h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Reusable filter-panel shell: a sidebar fixed to the viewport's left edge
// on desktop (full height, independent of page scroll/width), collapsing
// into a "Filters" trigger + slide-in drawer below the lg breakpoint.
// `children` is the actual filter controls (rendered once for the desktop
// sidebar and once inside the drawer — cheap, since it's just links/inputs,
// and lets each surface keep independent local UI state like an expanded
// checklist).
export function FilterPanel({
  children,
  activeCount = 0,
}: {
  children: React.ReactNode;
  activeCount?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navKey = `${pathname}?${searchParams.toString()}`;

  const [open, setOpen] = useState(false);
  // Any filter change navigates (new searchParams) — treat that as "done,
  // close the drawer" rather than requiring a separate Apply/close action.
  // Adjusting state during render (rather than in an effect) avoids an extra
  // commit-then-correct render on every navigation.
  const [lastNavKey, setLastNavKey] = useState(navKey);
  if (navKey !== lastNavKey) {
    setLastNavKey(navKey);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <aside className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-52 lg:overflow-y-auto lg:border-r lg:border-black/10 dark:lg:border-white/15 lg:bg-white dark:lg:bg-[#0a0a0a] lg:px-6 lg:py-8">
        {children}
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center gap-2 self-start text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <FilterIcon />
        Filters
        {activeCount > 0 ? (
          <span className="rounded-full bg-black text-white dark:bg-white dark:text-black text-xs px-1.5 py-0.5 leading-none">
            {activeCount}
          </span>
        ) : null}
      </button>

      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={`absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white dark:bg-[#0a0a0a] shadow-xl transition-transform duration-200 flex flex-col ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/15 shrink-0">
            <span className="text-sm font-semibold">Filters</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </>
  );
}
