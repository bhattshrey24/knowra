"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, BarChart3, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/profile-menu";

const links = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/home" className="text-lg font-semibold tracking-tight">
          Knowra<span className="text-primary">.</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <ThemeToggle />
          <div className="ml-1 border-l pl-1">
            <ProfileMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}
