import { Skeleton } from "@/components/ui/skeleton";

/** Instant feedback while flashcards + due-review data load. */
export default function FlashcardsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading flashcards">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
