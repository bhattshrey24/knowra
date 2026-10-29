import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { subjectIcon } from "@/lib/subject-icons";

export interface RecentSubject {
  slug: string;
  name: string;
  outOfTen: number;
  accuracy: number;
  dueCount: number;
}

export interface ContinueLearningData {
  recent: RecentSubject[];
}

/** "Continue learning": recent subjects with progress and anything due to review. */
export function ContinueLearning({ data }: { data: ContinueLearningData }) {
  return (
    <div className="divide-y overflow-hidden rounded-xl border">
      {data.recent.map((r) => {
        const Icon = subjectIcon(r.slug);
        const meta =
          r.dueCount > 0
            ? `${r.dueCount} card${r.dueCount === 1 ? "" : "s"} to review`
            : `${r.accuracy}% correct so far`;
        return (
          <Link
            key={r.slug}
            href={`/quiz/${r.slug}`}
            className="hover:bg-muted flex items-center gap-4 px-4 py-3 transition-colors"
          >
            <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{r.name}</span>
                <span className="text-sm font-semibold">
                  {r.outOfTen}
                  <span className="text-muted-foreground">/10</span>
                </span>
              </span>
              <span className="text-muted-foreground block text-xs">{meta}</span>
              <Progress value={(r.outOfTen / 10) * 100} aria-label={`${r.name} mastery`} />
            </span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
