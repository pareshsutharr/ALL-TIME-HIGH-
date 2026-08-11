"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export function SelectFilter({
  param,
  value,
  options,
  disabled,
  disabledTitle,
  clearValue,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  disabledTitle?: string;
  // If the selected value equals this, the param is removed from the URL
  // entirely instead of set explicitly — keeps default-state URLs clean.
  clearValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (clearValue !== undefined && next === clearValue) {
      params.delete(param);
    } else {
      params.set(param, next);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:focus:border-white/40 disabled:opacity-40"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
