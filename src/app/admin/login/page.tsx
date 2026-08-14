"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 w-full max-w-xs border border-black/10 dark:border-white/15 rounded-lg p-6"
      >
        <h1 className="text-lg font-semibold">Admin</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Enter the admin password to upload the daily data file.
        </p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setStatus("idle");
          }}
          placeholder="Password"
          className="border border-black/10 dark:border-white/15 rounded-md px-3 py-2 text-sm bg-transparent"
        />
        {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">Incorrect password.</p>}
        <button
          type="submit"
          disabled={status === "loading" || !password}
          className="text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
