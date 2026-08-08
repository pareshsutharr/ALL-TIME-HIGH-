import Link from "next/link";
import { Tab } from "@/lib/types";

function buildTabHref(tab: Tab, q?: string) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (q) params.set("q", q);
  return `/?${params.toString()}`;
}

export function Tabs({
  active,
  q,
  companiesCount,
  smeCount,
  mainDataCount,
  athCount,
}: {
  active: Tab;
  q?: string;
  companiesCount: number;
  smeCount: number;
  mainDataCount: number;
  athCount: number;
}) {
  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-md ${
      active === tab
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={buildTabHref("ath", q)} className={tabClass("ath")}>
        All Time High ({athCount.toLocaleString("en-IN")})
      </Link>
      <Link href={buildTabHref("companies", q)} className={tabClass("companies")}>
        All Companies ({companiesCount.toLocaleString("en-IN")})
      </Link>
      <Link href={buildTabHref("sme", q)} className={tabClass("sme")}>
        SME List ({smeCount.toLocaleString("en-IN")})
      </Link>
      <Link href={buildTabHref("main", q)} className={tabClass("main")}>
        Quarterly &amp; Shareholding ({mainDataCount.toLocaleString("en-IN")})
      </Link>
    </div>
  );
}
