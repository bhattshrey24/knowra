import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  FlaskConical,
  Globe2,
  Landmark,
  Music2,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  mathematics: Sigma,
  science: FlaskConical,
  history: Landmark,
  "world-politics": Globe2,
  music: Music2,
};

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
        const Icon = SUBJECT_ICONS[r.slug] ?? BookOpen;
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
