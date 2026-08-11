"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <style>{`
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
            color: #171717;
            text-align: center;
            padding: 24px;
          }
          @media (prefers-color-scheme: dark) {
            body { background: #0a0a0a; color: #ededed; }
          }
          .ge-btn {
            font-size: 14px;
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid rgba(0, 0, 0, 0.15);
            background: transparent;
            color: inherit;
            cursor: pointer;
          }
          @media (prefers-color-scheme: dark) {
            .ge-btn { border-color: rgba(255, 255, 255, 0.15); }
          }
        `}</style>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: 14, opacity: 0.6, maxWidth: 400, margin: 0 }}>
          The app hit an unexpected error. Please try again.
        </p>
        <button className="ge-btn" onClick={() => retry()}>
          Try again
        </button>
      </body>
    </html>
  );
}
