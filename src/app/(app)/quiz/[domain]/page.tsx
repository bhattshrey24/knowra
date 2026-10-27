import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import { DifficultyPicker } from "@/components/difficulty-picker";

export function generateStaticParams() {
  return DOMAINS.map((d) => ({ domain: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const found = DOMAINS.find((d) => d.slug === domain);
  return { title: found ? `Quiz · ${found.name}` : "Quiz" };
}

export default async function QuizStartPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const found = DOMAINS.find((d) => d.slug === domain);
  if (!found) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <Link
        href="/home"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        All subjects
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{found.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{found.description}</p>
      </div>

      <DifficultyPicker domainName={found.name} />
    </div>
  );
}
