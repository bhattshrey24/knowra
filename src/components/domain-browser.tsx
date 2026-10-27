"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import { DomainCard } from "@/components/domain-card";

export function DomainBrowser() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOMAINS;
    return DOMAINS.filter(
      (d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a subject or topic…"
          aria-label="Search subjects and topics"
          className="bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-ring/40 h-11 w-full rounded-lg border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-2"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No predefined subject matches &ldquo;{query}&rdquo;. Searching any custom topic and
          creating a new domain for it arrives in a later phase.
        </div>
      )}
    </div>
  );
}
