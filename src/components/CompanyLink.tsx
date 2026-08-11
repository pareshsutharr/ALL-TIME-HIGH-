import { screenerUrl } from "@/lib/screener";
import { CompanyLogo } from "@/components/CompanyLogo";

export function CompanyLink({
  name,
  isin,
  nseSymbol,
  bseCode,
}: {
  name: string;
  isin?: string | null;
  nseSymbol?: string | null;
  bseCode?: string | null;
}) {
  const href = screenerUrl(nseSymbol, bseCode);
  const content = (
    <span className="inline-flex items-center gap-2">
      <CompanyLogo isin={isin} />
      <span>{name}</span>
    </span>
  );
  if (!href) return content;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline underline-offset-2"
    >
      {content}
    </a>
  );
}
