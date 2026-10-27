import Link from "next/link";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Flashcards" };

export default function FlashcardsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Personalised revision cards for your weak concepts, plus foundational cards for the
          essentials — scheduled with spaced repetition.
        </p>
      </div>
      <EmptyState
        icon={Layers}
        title="No cards due"
        description="As you answer quizzes, Knowra creates weakness and foundational flashcards and brings them back at the right time."
      >
        <Button render={<Link href="/home" />}>Take a quiz</Button>
      </EmptyState>
    </div>
  );
}
