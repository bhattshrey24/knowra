"use client";

import { useState } from "react";
import { Check, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { scoreQuiz, type QuizSummary } from "@/lib/learning/scoring";
import type { Difficulty, Question } from "@/types/learning";

type Status = "setup" | "loading" | "active" | "error" | "results";
type QuizFormat = "mcq" | "multi";

const LEVELS: { value: Difficulty; label: string }[] = [
  { value: 1, label: "Beginner" },
  { value: 2, label: "Easy" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Hard" },
  { value: 5, label: "Expert" },
];

const FORMATS: { value: QuizFormat; label: string; hint: string }[] = [
  { value: "mcq", label: "Multiple choice", hint: "One correct answer" },
  { value: "multi", label: "Multiple select", hint: "One or more correct" },
];

export function QuizSession({
  domainSlug,
  domainName,
  recommendedDifficulty,
}: {
  domainSlug: string;
  domainName: string;
  recommendedDifficulty?: Difficulty;
}) {
  const [status, setStatus] = useState<Status>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>(recommendedDifficulty ?? 3);
  const [format, setFormat] = useState<QuizFormat>("mcq");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [summary, setSummary] = useState<QuizSummary | null>(null);

  async function startQuiz() {
    setStatus("loading");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: domainSlug, difficulty, count: 5, format }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { questions: Question[] };
      if (!data.questions?.length) throw new Error("No questions returned");
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setStatus("active");
    } catch {
      setStatus("error");
    }
  }

  function select(questionId: string, index: number) {
    const isMulti = questions.find((q) => q.id === questionId)?.format === "multi";
    setAnswers((prev) => {
      if (!isMulti) return { ...prev, [questionId]: [index] };
      const curr = prev[questionId] ?? [];
      const next = curr.includes(index)
        ? curr.filter((i) => i !== index)
        : [...curr, index].sort((a, b) => a - b);
      return { ...prev, [questionId]: next };
    });
  }

  function persistAttempt() {
    // Fire-and-forget: persistence is best-effort and no-ops without a backend.
    void fetch("/api/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        domain: domainSlug,
        difficulty,
        answers: questions.map((q) => ({
          prompt: q.prompt,
          options: q.options ?? [],
          selected: answers[q.id] ?? [],
          correctIndices: q.correctIndices ?? [],
          explanation: q.explanation,
        })),
      }),
    }).catch(() => {});
  }

  function advance() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      return;
    }
    setSummary(
      scoreQuiz(
        questions.map((q) => ({
          questionId: q.id,
          correctIndices: q.correctIndices ?? [],
          selected: answers[q.id] ?? [],
        })),
      ),
    );
    setStatus("results");
    persistAttempt();
  }

  function reset() {
    setStatus("setup");
    setQuestions([]);
    setSummary(null);
    setAnswers({});
    setCurrent(0);
  }

  if (status === "setup" || status === "loading" || status === "error") {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium">Choose a difficulty</p>
          <p className="text-muted-foreground text-sm">
            {recommendedDifficulty
              ? "Based on how you've done so far, Knowra suggests the highlighted level — but you always get the final say."
              : "Start wherever you like. As Knowra learns your level it will recommend one — you always get the final say."}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {LEVELS.map(({ value, label }) => {
            const active = difficulty === value;
            const recommended = recommendedDifficulty === value;
            return (
              <button
                key={value}
                type="button"
                aria-label={`Difficulty ${value}: ${label}${recommended ? " (recommended)" : ""}`}
                aria-pressed={active}
                disabled={status === "loading"}
                onClick={() => setDifficulty(value)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors disabled:opacity-60",
                  active
                    ? "border-primary bg-accent text-accent-foreground"
                    : "hover:border-primary/40",
                  recommended && !active && "border-primary/50",
                )}
              >
                {recommended && (
                  <span className="bg-primary text-primary-foreground absolute -top-2 rounded-full px-1.5 py-0.5 text-[9px] font-medium">
                    Suggested
                  </span>
                )}
                <span className="text-lg font-semibold">{value}</span>
                <span className="text-muted-foreground text-[11px]">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Question format</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map(({ value, label, hint }) => {
              const active = format === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  disabled={status === "loading"}
                  onClick={() => setFormat(value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
                    active
                      ? "border-primary bg-accent text-accent-foreground"
                      : "hover:border-primary/40",
                  )}
                >
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-muted-foreground text-xs">{hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            Something went wrong generating your quiz. Please try again.
          </p>
        )}

        <Button size="lg" onClick={startQuiz} disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            "Start quiz"
          )}
        </Button>
      </div>
    );
  }

  if (status === "results" && summary) {
    return (
      <div className="space-y-6">
        <div className="bg-accent text-accent-foreground rounded-xl border p-6 text-center">
          <p className="text-sm font-medium">You scored</p>
          <p className="mt-1 text-4xl font-semibold">{summary.percent}%</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary.correct} of {summary.total} correct on {domainName}
          </p>
        </div>

        <ul className="space-y-3">
          {questions.map((q) => {
            const result = summary.results.find((r) => r.questionId === q.id);
            const correct = result?.correct ?? false;
            const chosenText = (result?.selected ?? [])
              .map((i) => q.options?.[i])
              .filter(Boolean)
              .join(", ");
            const correctText = (q.correctIndices ?? [])
              .map((i) => q.options?.[i])
              .filter(Boolean)
              .join(", ");
            return (
              <li key={q.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                      correct ? "bg-emerald-600" : "bg-destructive",
                    )}
                    aria-hidden
                  >
                    {correct ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{q.prompt}</p>
                    {!correct && chosenText && (
                      <p className="text-muted-foreground text-sm">You chose: {chosenText}</p>
                    )}
                    {correctText && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        Correct: {correctText}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-muted-foreground text-sm">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <Button onClick={reset} variant="outline">
          <RotateCcw className="size-4" />
          New quiz
        </Button>
      </div>
    );
  }

  // status === "active"
  const question = questions[current];
  const selectedIndices = answers[question.id] ?? [];
  const answered = selectedIndices.length > 0;
  const isMulti = question.format === "multi";
  const isLast = current === questions.length - 1;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            Question {current + 1} of {questions.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3" /> Level {difficulty}
          </span>
        </div>
        <Progress value={((current + 1) / questions.length) * 100} />
      </div>

      <div>
        <h2 className="text-lg font-medium">{question.prompt}</h2>
        {isMulti && <p className="text-muted-foreground mt-1 text-xs">Select all that apply.</p>}
      </div>

      <div
        className="grid gap-2"
        role="listbox"
        aria-multiselectable={isMulti}
        aria-label="Answer options"
      >
        {question.options?.map((option, index) => {
          const active = selectedIndices.includes(index);
          return (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => select(question.id, index)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center border",
                  isMulti ? "rounded-sm" : "rounded-full",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
                aria-hidden
              >
                {active && <Check className="size-3" />}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      <Button size="lg" onClick={advance} disabled={!answered}>
        {isLast ? "Finish" : "Next question"}
      </Button>
    </div>
  );
}
