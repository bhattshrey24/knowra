import type { Metadata } from "next";
import { ChatAssistant } from "@/components/chat-assistant";

export const metadata: Metadata = {
  title: "Assistant — Knowra",
  description: "Ask Knowra's learning assistant about your progress and what to study next.",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Learning assistant</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ask about your progress, weak spots, or what to study next. Answers are grounded in your
          knowledge profile and tailored to how you learn.
        </p>
      </div>
      <ChatAssistant />
    </div>
  );
}
