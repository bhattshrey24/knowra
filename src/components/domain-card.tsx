import Link from "next/link";
import {
  Sigma,
  FlaskConical,
  Landmark,
  Globe2,
  Music2,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Domain } from "@/types/learning";

/** Maps `Domain.icon` names to lucide components. Falls back to a book icon. */
const ICONS: Record<string, LucideIcon> = {
  Sigma,
  FlaskConical,
  Landmark,
  Globe2,
  Music2,
};

export function DomainCard({ domain }: { domain: Domain }) {
  const Icon = ICONS[domain.icon] ?? BookOpen;
  return (
    <Link href={`/quiz/${domain.slug}`} className="group focus:outline-none">
      <Card className="group-hover:border-primary/40 group-focus-visible:border-primary h-full transition-colors">
        <CardHeader>
          <div className="bg-accent text-accent-foreground mb-1 flex size-10 items-center justify-center rounded-lg">
            <Icon className="size-5" />
          </div>
          <CardTitle className="text-base">{domain.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">{domain.description}</CardContent>
      </Card>
    </Link>
  );
}
