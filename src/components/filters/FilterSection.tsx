export function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
        {label}
      </h3>
      {children}
    </div>
  );
}
