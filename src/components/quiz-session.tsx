"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isAnswerCorrect, type QuizSummary } from "@/lib/learning/scoring";
import { gradeWritten, isWrittenCorrect } from "@/lib/learning/grade-written";
import type { Difficulty, Question } from "@/types/learning";

type Status = "setup" | "loading" | "active" | "error" | "results";
type QuizFormat = "mcq" | "multi" | "written";

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
  { value: "written", label: "Written", hint: "Type your answer" },
];

/** Minimum / maximum questions per quiz (the setup slider range). */
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 30;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FallbackNotice() {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
      The AI is temporarily unavailable, so we&apos;ve loaded a set of our own curated practice
      questions on this topic. Try again shortly for freshly generated, personalized ones.
    </p>
  );
}

/** A narrower topic/concept scope within the subject (Phase 6.1 navigation). */
export type QuizScope = { level: "topic" | "concept"; id: string; name: string };

export function QuizSession({
  domainSlug,
  domainName,
  recommendedDifficulty,
  scope,
  suggestDiagnostic = false,
}: {
  domainSlug: string;
  domainName: string;
  recommendedDifficulty?: Difficulty;
  scope?: QuizScope;
  suggestDiagnostic?: boolean;
}) {
  const [status, setStatus] = useState<Status>("setup");
  const [adaptive, setAdaptive] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>(recommendedDifficulty ?? 3);
  const [formats, setFormats] = useState<QuizFormat[]>(["mcq"]);
  // The level adaptive mode would use (shown on the Adaptive card).
  const adaptiveLevel: Difficulty = recommendedDifficulty ?? 3;
  const [count, setCount] = useState(MIN_QUESTIONS);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [remaining, setRemaining] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [fallback, setFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDiagnostic, setIsDiagnostic] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const userCancelledRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  function toggleFormat(value: QuizFormat) {
    setFormats((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value],
    );
  }

  function cancelQuiz() {
    userCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setStatus("setup");
    setProgress(0);
  }

  async function startQuiz(opts?: { diagnostic?: boolean }) {
    if (formats.length === 0) return;
    // Adaptive uses the recommended level; the active view shows it too.
    const level: Difficulty = adaptive ? adaptiveLevel : difficulty;
    setDifficulty(level);
    setIsDiagnostic(Boolean(opts?.diagnostic));
    userCancelledRef.current = false;
    setErrorMessage(null);
    setProgress(8);
    setStatus("loading");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          return Math.min(95, prev + 0.1);
        }
        if (prev >= 70) {
          return prev + 0.4;
        }
        if (prev >= 30) {
          return prev + 1.2;
        }
        return prev + 2.5;
      });
    }, 120);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    // The server generates in small sequential chunks (each under its own LLM
    // timeout), so a large quiz on a slow local model can take a while in total.
    // Give it generous headroom before the client gives up.
    const timer = setTimeout(() => controller.abort(), 150_000);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain: domainSlug,
          difficulty: level,
          count,
          formats,
          scope: scope ? { level: scope.level, id: scope.id } : undefined,
          diagnostic: opts?.diagnostic ?? false,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // 503 = generation temporarily unavailable (LLM down and no curated
        // questions for this content). Surface the server's message verbatim.
        if (res.status === 503) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setErrorMessage(
            body?.error ??
              "Question generation is temporarily unavailable. Please try again in a few minutes.",
          );
        }
        throw new Error(`Request failed: ${res.status}`);
      }
      const data = (await res.json()) as { questions: Question[]; fallback?: boolean };
      if (!data.questions?.length) throw new Error("No questions returned");

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);

      // Short delay so the user visibly sees the progress bar reach 100%
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isMountedRef.current || userCancelledRef.current) return;

      setFallback(Boolean(data.fallback));
      setQuestions(data.questions);
      setAnswers({});
      setWritten({});
      setCurrent(0);
      setRemaining(timerEnabled ? timerMinutes * 60 : 0);
      setStatus("active");
    } catch {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (isMountedRef.current) {
        if (userCancelledRef.current) {
          setStatus("setup");
        } else {
          setStatus("error");
        }
      }
    } finally {
      clearTimeout(timer);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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
          conceptId: q.conceptId,
          format: q.format,
          options: q.options ?? [],
          selected: answers[q.id] ?? [],
          correctIndices: q.correctIndices ?? [],
          explanation: q.explanation,
          writtenAnswer: written[q.id],
          referenceAnswer: q.referenceAnswer,
        })),
      }),
    }).catch(() => {});
  }

  function gradeQuestion(q: Question): boolean {
    if (q.format === "written") {
      return isWrittenCorrect(gradeWritten(q.referenceAnswer ?? "", written[q.id] ?? ""));
    }
    return isAnswerCorrect(q.correctIndices ?? [], answers[q.id] ?? []);
  }

  /** Grade everything answered so far and show results. Used by the last-question
   *  button and by the countdown timer when time runs out. */
  function finalize() {
    const results = questions.map((q) => ({
      questionId: q.id,
      selected: answers[q.id] ?? [],
      correct: gradeQuestion(q),
    }));
    const correctCount = results.filter((r) => r.correct).length;
    const total = results.length;
    setSummary({
      correct: correctCount,
      total,
      percent: total ? Math.round((correctCount / total) * 100) : 0,
      results,
    });
    setStatus("results");
    persistAttempt();
  }

  // Keep a stable handle to the latest finalize so the timer effect below can
  // call it without re-subscribing (and without stale answers).
  const finalizeRef = useRef(finalize);
  finalizeRef.current = finalize;

  // Tick the countdown each second while a timed quiz is active.
  useEffect(() => {
    if (status !== "active" || !timerEnabled) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [status, timerEnabled]);

  // When the timer hits zero, end the quiz with whatever's been answered.
  useEffect(() => {
    if (status === "active" && timerEnabled && remaining === 0) {
      finalizeRef.current();
    }
  }, [status, timerEnabled, remaining]);

  function advance() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      return;
    }
    finalize();
  }

  function reset() {
    setStatus("setup");
    setQuestions([]);
    setSummary(null);
    setAnswers({});
    setWritten({});
    setCurrent(0);
    setRemaining(0);
    setFallback(false);
    setProgress(0);
  }

  if (status === "loading") {
    const formatLabels = formats
      .map((f) => FORMATS.find((fmt) => fmt.value === f)?.label ?? f)
      .join(", ");

    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <div className="bg-card space-y-5 rounded-xl border p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {isDiagnostic
                ? `Preparing diagnostic quiz for ${domainName}`
                : `Generating quiz for ${scope ? scope.name : domainName}`}
            </h2>
            <p className="text-muted-foreground text-xs">
              {isDiagnostic
                ? "Calibrating key concepts across the subject"
                : `Level ${difficulty} · ${count} question${count === 1 ? "" : "s"} · ${formatLabels}`}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">
                {progress >= 100
                  ? "Questions ready! Loading your quiz…"
                  : progress < 30
                    ? "Designing questions tailored to your level…"
                    : progress < 70
                      ? "Generating questions, options, and explanations…"
                      : "Finalizing questions and checking coverage…"}
              </span>
              <span className="text-foreground font-semibold tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="[&_[data-slot=progress-track]]:h-2.5" />
          </div>

          <p className="text-muted-foreground text-xs">
            Writing fresh questions with the AI — a few seconds on a hosted model, longer on a local
            one.
          </p>

          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelQuiz}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "setup" || status === "error") {
    return (
      <div className="space-y-6">
        {suggestDiagnostic && (
          <div className="border-primary/30 bg-accent/40 space-y-3 rounded-xl border p-4">
            <div>
              <p className="text-sm font-medium">New area — want a quick diagnostic?</p>
              <p className="text-muted-foreground text-sm">
                A short calibration quiz across {domainName} estimates what you already know, so
                Knowra can pitch the right level. You can skip and just start below.
              </p>
            </div>
            <Button onClick={() => startQuiz({ diagnostic: true })}>Start diagnostic</Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Difficulty</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={adaptive}
              onClick={() => setAdaptive(true)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                adaptive
                  ? "border-primary bg-accent text-accent-foreground"
                  : "hover:border-primary/40",
              )}
            >
              <div className="text-sm font-medium">Adaptive</div>
              <div className="text-muted-foreground text-xs">
                Knowra picks — level {adaptiveLevel}
              </div>
            </button>
            <button
              type="button"
              aria-pressed={!adaptive}
              onClick={() => setAdaptive(false)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                !adaptive
                  ? "border-primary bg-accent text-accent-foreground"
                  : "hover:border-primary/40",
              )}
            >
              <div className="text-sm font-medium">Choose yourself</div>
              <div className="text-muted-foreground text-xs">Pick a fixed level 1–5</div>
            </button>
          </div>
        </div>

        {!adaptive && (
          <div className="grid grid-cols-5 gap-2">
            {LEVELS.map(({ value, label }) => {
              const active = difficulty === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`Difficulty ${value}: ${label}`}
                  aria-pressed={active}
                  onClick={() => setDifficulty(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
                    active
                      ? "border-primary bg-accent text-accent-foreground"
                      : "hover:border-primary/40",
                  )}
                >
                  <span className="text-lg font-semibold">{value}</span>
                  <span className="text-muted-foreground text-[11px]">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Question types</p>
          <p className="text-muted-foreground text-sm">
            Pick one or more — choose a couple and your quiz is a mix of those types.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map(({ value, label, hint }) => {
              const active = formats.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleFormat(value)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-accent text-accent-foreground"
                      : "hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                    aria-hidden
                  >
                    {active && <Check className="size-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="text-muted-foreground block text-xs">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {formats.length === 0 && (
            <p className="text-destructive text-xs">Choose at least one question type.</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Number of questions</p>
            <span className="text-sm font-semibold tabular-nums">{count}</span>
          </div>
          <input
            type="range"
            min={MIN_QUESTIONS}
            max={MAX_QUESTIONS}
            step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-label="Number of questions"
            className="accent-primary w-full cursor-pointer"
          />
          <div className="text-muted-foreground flex justify-between text-[11px]">
            <span>{MIN_QUESTIONS}</span>
            <span>{MAX_QUESTIONS}</span>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Clock className="text-muted-foreground size-4" />
              Timer
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={timerEnabled}
              aria-label="Enable timer"
              onClick={() => setTimerEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                timerEnabled ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "inline-block size-5 rounded-full bg-white shadow transition-transform",
                  timerEnabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
          {timerEnabled && (
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="timer-minutes" className="text-muted-foreground text-sm">
                Minutes
              </label>
              <input
                id="timer-minutes"
                type="number"
                min={1}
                max={120}
                value={timerMinutes}
                onChange={(e) =>
                  setTimerMinutes(Math.max(1, Math.min(120, Number(e.target.value) || 1)))
                }
                className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 w-20 rounded-md border px-2 py-1 text-sm outline-none focus-visible:ring-2"
              />
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            {timerEnabled
              ? `Your quiz ends automatically after ${timerMinutes} minute${
                  timerMinutes === 1 ? "" : "s"
                } — unanswered questions are marked wrong.`
              : "Turn on to race a countdown — the quiz auto-submits when time's up."}
          </p>
        </div>

        {status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {errorMessage ?? "Something went wrong generating your quiz. Please try again."}
          </p>
        )}

        <Button size="lg" onClick={() => startQuiz()} disabled={formats.length === 0}>
          Start quiz
        </Button>
      </div>
    );
  }

  if (status === "results" && summary) {
    return (
      <div className="space-y-6">
        {fallback && <FallbackNotice />}
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
                    {q.format === "written" ? (
                      <>
                        {written[q.id]?.trim() && (
                          <p className="text-muted-foreground text-sm">
                            Your answer: {written[q.id]}
                          </p>
                        )}
                        {q.referenceAnswer && (
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            Reference: {q.referenceAnswer}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {!correct && chosenText && (
                          <p className="text-muted-foreground text-sm">You chose: {chosenText}</p>
                        )}
                        {correctText && (
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            Correct: {correctText}
                          </p>
                        )}
                      </>
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
  const isMulti = question.format === "multi";
  const isWritten = question.format === "written";
  const answered = isWritten
    ? (written[question.id]?.trim().length ?? 0) > 0
    : selectedIndices.length > 0;
  const isLast = current === questions.length - 1;

  return (
    <div className="space-y-6">
      {fallback && <FallbackNotice />}
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            Question {current + 1} of {questions.length}
          </span>
          <span className="inline-flex items-center gap-3">
            {timerEnabled && (
              <span
                role="timer"
                aria-label="Time remaining"
                className={cn(
                  "inline-flex items-center gap-1 tabular-nums",
                  remaining <= 10 && "text-destructive font-medium",
                )}
              >
                <Clock className="size-3" /> {formatTime(remaining)}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3" /> Level {difficulty}
            </span>
          </span>
        </div>
        <Progress value={((current + 1) / questions.length) * 100} />
      </div>

      <div>
        <h2 className="text-lg font-medium">{question.prompt}</h2>
        {isMulti && <p className="text-muted-foreground mt-1 text-xs">Select all that apply.</p>}
        {isWritten && (
          <p className="text-muted-foreground mt-1 text-xs">Answer in your own words.</p>
        )}
      </div>

      {isWritten ? (
        <textarea
          value={written[question.id] ?? ""}
          onChange={(e) => setWritten((prev) => ({ ...prev, [question.id]: e.target.value }))}
          placeholder="Type your answer…"
          aria-label="Your answer"
          rows={5}
          className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
        />
      ) : (
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
      )}

      <Button size="lg" onClick={advance} disabled={!answered}>
        {isLast ? "Finish" : "Next question"}
      </Button>
    </div>
  );
}
