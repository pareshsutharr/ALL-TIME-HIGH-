// screener.in resolves a company by NSE symbol or, absent an NSE listing, by
// bare BSE numeric code — both under the same /company/{id}/ path.
export function screenerUrl(
  nseSymbol: string | null | undefined,
  bseCode: string | null | undefined
): string | null {
  if (nseSymbol) return `https://www.screener.in/company/${encodeURIComponent(nseSymbol)}/`;
  if (bseCode) return `https://www.screener.in/company/${encodeURIComponent(bseCode)}/`;
  return null;
}
