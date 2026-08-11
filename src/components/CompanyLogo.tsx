import Image from "next/image";

const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

// Looked up by ISIN rather than ticker: ISIN is exchange-agnostic (no NSE/BSE
// suffix guessing needed) and every company/SME row already carries one.
// Logo.dev always returns *something* (a real logo, or a neutral monogram on
// a miss) — never a wrong company's branding — so no error handling needed.
export function CompanyLogo({
  isin,
  size = 20,
  className = "",
}: {
  isin: string | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!isin || !LOGO_DEV_TOKEN) return null;

  const src = `https://img.logo.dev/isin/${encodeURIComponent(isin)}?token=${LOGO_DEV_TOKEN}&size=${size * 2}&format=webp`;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src={src} alt="" width={size} height={size} className="h-full w-full object-contain" />
    </span>
  );
}
