"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = ["What am I weak at?", "What should I study next?", "How am I doing overall?"];

/**
 * AI learning assistant. Sends the learner's question (plus a short history) to
 * `/api/chat`, where the engine grounds the reply in their knowledge profile and
 * the LLM phrases it in their learning style. History is kept in client state
 * only (ephemeral) — no persistence in this version.
 */
export function ChatAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { reply: string; aiGenerated: boolean };
      setDegraded(!data.aiGenerated);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry — I couldn't answer just now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[70dvh] flex-col rounded-xl border">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {empty ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="text-primary size-8" />
            <p className="max-w-xs text-sm">
              Ask me about your progress, weak spots, or what to study next. I use your knowledge
              profile to answer.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="hover:bg-accent hover:text-accent-foreground rounded-full border px-3 py-1.5 text-xs transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  m.role === "user" ? "bg-accent" : "bg-primary/10 text-primary",
                )}
              >
                {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Bot className="text-primary size-4" />
            <Loader2 className="size-4 animate-spin" />
            <span>Thinking…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {degraded && !loading && (
        <p className="text-muted-foreground border-t px-4 py-2 text-center text-xs">
          AI coaching is unavailable right now — showing guidance from your profile.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your learning…"
          aria-label="Message the learning assistant"
          className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        <Button type="submit" size="sm" disabled={loading || !input.trim()} aria-label="Send">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
