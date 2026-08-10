export function DownloadExcelButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 w-fit shrink-0"
    >
      Download Excel
    </a>
  );
}
