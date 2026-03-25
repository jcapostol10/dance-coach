import Link from "next/link";
import UserNav from "@/components/user-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/library" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                DC
              </span>
            </div>
            <span className="font-heading text-lg font-semibold tracking-tight">
              DanceCoach
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/library"
              className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Library
            </Link>
            <Link
              href="/dashboard"
              className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <UserNav />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-center text-xs text-muted-foreground">
            DanceCoach AI — Learn any dance, one beat at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
