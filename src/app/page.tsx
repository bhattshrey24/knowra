import Link from "next/link";
import { ArrowRight, Brain, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  {
    icon: Brain,
    title: "Active recall",
    body: "You start by being quizzed, not by reading. Retrieving an answer is what builds durable memory.",
  },
  {
    icon: Target,
    title: "80/20 focus",
    body: "Knowra prioritises the foundational, high-value concepts first, then lets you go deeper where you want.",
  },
  {
    icon: RefreshCw,
    title: "Spaced repetition",
    body: "Weak concepts come back days and weeks later, so the system can tell real retention from a lucky guess.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
      <header className="flex items-center justify-between py-5">
        <span className="text-lg font-semibold tracking-tight">
          Knowra<span className="text-primary">.</span>
        </span>
        <Button render={<Link href="/home" />} variant="ghost" size="sm">
          Open app
        </Button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="text-muted-foreground mb-5 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
          Learn by testing yourself
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Find what you don&apos;t know, then{" "}
          <span className="text-primary">actually remember it.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-xl text-base text-pretty sm:text-lg">
          Knowra quizzes you across any subject, pinpoints your weak concepts, and schedules spaced
          revision so knowledge sticks for the long term.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href="/home" />} size="lg">
            Start a quiz
            <ArrowRight className="size-4" />
          </Button>
          <Button render={<Link href="/dashboard" />} size="lg" variant="outline">
            See the dashboard
          </Button>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        {principles.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="border-border/60">
            <CardHeader>
              <div className="bg-accent text-accent-foreground mb-2 flex size-9 items-center justify-center rounded-md">
                <Icon className="size-5" />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{body}</CardContent>
          </Card>
        ))}
      </section>

      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        Knowra — a hackathon prototype. Built with Next.js, Supabase, and a provider-agnostic AI
        layer.
      </footer>
    </main>
  );
}
