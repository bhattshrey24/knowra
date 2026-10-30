import { Skeleton } from "@/components/ui/skeleton";

/** Instant feedback while the home catalogue + continue-learning data load. */
export default function HomeLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading home">
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
      <section className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
