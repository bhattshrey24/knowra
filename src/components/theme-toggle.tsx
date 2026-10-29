"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/components/theme-provider";

const CYCLE: Theme[] = ["system", "light", "dark"];

const META: Record<Theme, { Icon: typeof Monitor; label: string }> = {
  system: { Icon: Monitor, label: "System" },
  light: { Icon: Sun, label: "Light" },
  dark: { Icon: Moon, label: "Dark" },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Avoid rendering the resolved icon until mounted so SSR and the first client
  // render agree (the stored preference is only known on the client).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : "system";
  const { Icon, label } = META[current];
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}. Switch to ${META[next].label}.`}
      title={`Theme: ${label}`}
    >
      <Icon className="size-4" />
    </Button>
  );
}
