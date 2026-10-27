import { DomainBrowser } from "@/components/domain-browser";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">What do you want to learn?</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick a subject to start a quiz. Knowra learns what you know from how you answer.
        </p>
      </div>
      <DomainBrowser />
    </div>
  );
}
