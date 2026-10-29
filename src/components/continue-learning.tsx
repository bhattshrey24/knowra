import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export interface RecentSubject {
  slug: string;
  name: string;
  outOfTen: number;
  accuracy: number;
}

export interface ReviseItem {
  id: string;
  front: string;
  hint: string;
}

export interface ContinueLearningData {
  recent: RecentSubject[];
  revise: ReviseItem[];
}

/** "Continue Learning": recent subjects with progress + cards due for revision. */
export function ContinueLearning({ data }: { data: ContinueLearningData }) {
  const { recent, revise } = data;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jump back in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.map((r) => (
            <Link
              key={r.slug}
              href={`/quiz/${r.slug}`}
              className="hover:border-primary/40 block rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-sm font-semibold">
                  {r.outOfTen}
                  <span className="text-muted-foreground">/10</span>
                </span>
              </div>
              <Progress
                value={(r.outOfTen / 10) * 100}
                className="mt-2"
                aria-label={`${r.name} mastery`}
              />
              <span className="text-muted-foreground mt-1.5 block text-xs">
                {r.accuracy}% correct so far
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="text-primary size-4" />
            Due for revision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {revise.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing due right now — your flashcards will resurface here when it&apos;s time.
            </p>
          ) : (
            <>
              {revise.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <p className="line-clamp-2 text-sm">{c.front}</p>
                  <Badge variant="outline" className="mt-2">
                    {c.hint}
                  </Badge>
                </div>
              ))}
              <Link
                href="/flashcards"
                className="text-primary inline-flex items-center gap-1 pt-1 text-sm font-medium hover:underline"
              >
                Review now
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
