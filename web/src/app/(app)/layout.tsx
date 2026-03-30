import Link from "next/link";
import UserNav from "@/components/user-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Ambient background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link
            href="/library"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:opacity-80 active:opacity-60"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary card-shadow">
              <span className="font-heading text-sm font-bold text-primary-foreground">
                DC
              </span>
            </div>
            <span className="font-heading text-lg font-semibold">
              DanceCoach
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/library"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground active:bg-accent/80"
            >
              Library
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground active:bg-accent/80"
            >
              Dashboard
            </Link>
            <UserNav />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/40 py-6">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-center text-xs text-muted-foreground/70">
            DanceCoach AI — Learn any dance, one beat at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
