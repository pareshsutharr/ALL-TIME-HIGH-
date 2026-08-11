import { Spinner } from "@/components/Spinner";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-24 items-center justify-center gap-3">
      <Spinner className="h-6 w-6 text-black/40 dark:text-white/40" />
      <p className="text-sm text-black/50 dark:text-white/50">{label}</p>
    </div>
  );
}
