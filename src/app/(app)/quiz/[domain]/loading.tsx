import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant navigation feedback for the quiz setup page, which does async work
 * (recommended difficulty, diagnostic suggestion) on the server. Mirrors the
 * page's shape so pressing a subject never feels like a frozen screen.
 */
export default function QuizSetupLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-8" aria-busy="true" aria-label="Loading quiz setup">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
