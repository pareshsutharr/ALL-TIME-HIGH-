import { screenerUrl } from "@/lib/screener";

export function CompanyLink({
  name,
  nseSymbol,
  bseCode,
}: {
  name: string;
  nseSymbol?: string | null;
  bseCode?: string | null;
}) {
  const href = screenerUrl(nseSymbol, bseCode);
  if (!href) return <>{name}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline underline-offset-2"
    >
      {name}
    </a>
  );
}
