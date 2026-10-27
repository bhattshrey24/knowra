import { AppNav } from "@/components/app-nav";
import { AuthBootstrap } from "@/components/auth-bootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AuthBootstrap />
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
