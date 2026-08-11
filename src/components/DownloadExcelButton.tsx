"use client";

import { useState } from "react";
import { Spinner } from "@/components/Spinner";

export function DownloadExcelButton({ href }: { href: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch(href);
      if (!res.ok) {
        throw new Error((await res.text().catch(() => "")) || "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? "export.xlsx";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (err) {
      console.error("Excel export failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 w-fit shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {status === "loading" ? (
        <>
          <Spinner className="h-3.5 w-3.5" />
          Downloading…
        </>
      ) : status === "error" ? (
        "Failed — retry"
      ) : (
        "Download Excel"
      )}
    </button>
  );
}
