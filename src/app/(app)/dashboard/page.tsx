import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
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
        description="Take your first quiz and your knowledge profile, mastery estimates, and retention graphs will appear here."
      >
        <Button render={<Link href="/home" />}>Start a quiz</Button>
      </EmptyState>
    </div>
  );
}
