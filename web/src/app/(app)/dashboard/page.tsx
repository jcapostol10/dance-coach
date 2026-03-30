import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Placeholder data
const RECENT_SCORES = [
  { lesson: "Basic Hip-Hop Groove", score: 78, date: "2026-03-24", improvement: 12 },
  { lesson: "Salsa Basics", score: 65, date: "2026-03-23", improvement: 8 },
  { lesson: "Basic Hip-Hop Groove", score: 66, date: "2026-03-22", improvement: 0 },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Track your progress and see how you&apos;re improving.
      </p>

      <Separator className="my-8" />

      {/* Stats Overview */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="card-shadow transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:elevated-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Lessons Practiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-heading text-3xl font-bold tabular-nums">3</span>
          </CardContent>
        </Card>
        <Card className="card-shadow transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:elevated-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-heading text-3xl font-bold tabular-nums">70</span>
            <span className="ml-1.5 text-lg text-muted-foreground">/ 100</span>
          </CardContent>
        </Card>
        <Card className="card-shadow transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:elevated-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Practice Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-heading text-3xl font-bold tabular-nums">5</span>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="font-heading text-base">Recent Practice Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {RECENT_SCORES.map((entry, i) => (
              <div key={i}>
                <div className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition-colors duration-150 hover:bg-accent/50">
                  <div>
                    <p className="text-sm font-medium">{entry.lesson}</p>
                    <p className="text-xs text-muted-foreground font-mono tabular-nums">
                      {entry.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.improvement > 0 && (
                      <span className="text-xs font-mono tabular-nums text-emerald-400">
                        +{entry.improvement}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        entry.score >= 80
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono tabular-nums"
                          : entry.score >= 65
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20 font-mono tabular-nums"
                          : "bg-red-500/10 text-red-400 border-red-500/20 font-mono tabular-nums"
                      }
                    >
                      {entry.score}/100
                    </Badge>
                  </div>
                </div>
                {i < RECENT_SCORES.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
