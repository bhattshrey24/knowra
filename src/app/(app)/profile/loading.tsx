import { Skeleton } from "@/components/ui/skeleton";

/** Instant feedback while the profile loads from the server. */
export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-8" aria-busy="true" aria-label="Loading profile">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
