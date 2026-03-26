import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="mx-auto max-w-2xl px-4 text-center">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl font-bold text-primary-foreground">DC</span>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            DanceCoach AI
          </h1>
        </div>

        <p className="mx-auto mb-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Upload any dance video. AI breaks it down step by step, syncs to the
          beat, and teaches you at your own pace.
        </p>
        <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
          Record yourself practicing and get real-time feedback on your form,
          timing, and technique.
        </p>

        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:justify-center">
          <Link href="/library">
            <Button size="lg" className="w-full">
              Browse Lessons
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {[
            {
              title: "AI Analysis",
              desc: "Upload a dance video and AI extracts every move, beat by beat.",
            },
            {
              title: "Learn at Your Pace",
              desc: "Step through moves one at a time. Slow down the music without changing pitch.",
            },
            {
              title: "Get Scored",
              desc: "Record yourself and get per-move scores with specific improvement tips.",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">{feature.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
