import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { DOMAINS } from "@/lib/domains";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { masteryOutOfTen, type MasteryState } from "@/lib/learning/mastery";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface MasteryRow extends MasteryState {
  domain_slug: string;
}

async function loadMastery(): Promise<MasteryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("domain_mastery")
    .select("domain_slug,mastery,confidence,attempts,correct")
    .eq("user_id", user.id)
    .order("mastery", { ascending: false });
  return (data as MasteryRow[] | null) ?? [];
}

export default async function DashboardPage() {
  const rows = await loadMastery();

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your progress</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Accuracy, estimated mastery, and retention over time — across every subject.
          </p>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No activity yet"
          description="Take your first quiz and your knowledge profile and mastery estimates will appear here."
        >
          <Button render={<Link href="/home" />}>Start a quiz</Button>
        </EmptyState>
      </div>
    );
  }

  const totalAnswered = rows.reduce((sum, r) => sum + r.attempts, 0);
  const totalCorrect = rows.reduce((sum, r) => sum + r.correct, 0);
  const overallAccuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your knowledge profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {totalAnswered} questions answered · {overallAccuracy}% overall accuracy
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => {
          const domain = DOMAINS.find((d) => d.slug === row.domain_slug);
          const outOfTen = masteryOutOfTen(row);
          const accuracy = row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0;
          return (
            <Card key={row.domain_slug}>
              <CardHeader className="pb-3">
                <div className="flex items-baseline justify-between">
                  <CardTitle className="text-base">{domain?.name ?? row.domain_slug}</CardTitle>
                  <span className="text-sm font-semibold">
                    {outOfTen}
                    <span className="text-muted-foreground">/10</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={row.mastery * 100} aria-label={`${domain?.name} mastery`} />
                <p className="text-muted-foreground text-xs">
                  {row.attempts} answered · {accuracy}% correct
                  {row.confidence < 0.5 ? " · still learning your level" : ""}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
