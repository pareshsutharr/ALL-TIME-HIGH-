"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState retry={retry} backHref="/" />;
}
