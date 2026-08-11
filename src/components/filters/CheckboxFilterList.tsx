"use client";

import Link from "next/link";
import { useState } from "react";

export type CheckboxOption = {
  value: string;
  label: string;
  count?: number;
  href: string;
  checked: boolean;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden="true">
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckboxRow({ option }: { option: CheckboxOption }) {
  return (
    <Link
      href={option.href}
      aria-pressed={option.checked}
      className="flex items-start justify-between gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
    >
      <span className="flex items-start gap-2 min-w-0">
        <span
          className={`flex h-4 w-4 shrink-0 mt-0.5 items-center justify-center rounded-[4px] border ${
            option.checked
              ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
              : "border-black/25 dark:border-white/25"
          }`}
        >
          {option.checked ? <CheckIcon /> : null}
        </span>
        <span className="text-black/80 dark:text-white/80">{option.label}</span>
      </span>
      {option.count !== undefined ? (
        <span className="shrink-0 text-xs text-black/40 dark:text-white/40">
          {option.count.toLocaleString("en-IN")}
        </span>
      ) : null}
    </Link>
  );
}

// A checkbox-style filter list (each "checkbox" is really a Link that
// toggles the option and immediately updates results). Only `visible`
// renders by default; `hidden` stays behind a "+N more" expander so a long
// option list doesn't dump everything on screen at once.
export function CheckboxFilterList({
  visible,
  hidden,
  moreLabel = "more",
}: {
  visible: CheckboxOption[];
  hidden: CheckboxOption[];
  moreLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((opt) => (
        <CheckboxRow key={opt.value} option={opt} />
      ))}
      {expanded ? hidden.map((opt) => <CheckboxRow key={opt.value} option={opt} />) : null}
      {hidden.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 w-fit px-1.5 text-left text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white underline underline-offset-2"
        >
          {expanded ? "Show fewer" : `+ ${hidden.length} ${moreLabel}`}
        </button>
      ) : null}
    </div>
  );
}
