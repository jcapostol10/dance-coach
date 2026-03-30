import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { users, lessons, practiceScores } from "@/lib/db/schema";
import { eq, desc, count, avg } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Get user from DB
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  const userId = userRows[0]?.id;

  // Fetch real data if user exists
  let recentScores: Array<{
    id: string;
    lessonTitle: string;
    overallScore: number;
    createdAt: Date;
  }> = [];
  let totalSessions = 0;
  let avgScore = 0;
  let uniqueLessons = 0;

  if (userId) {
    const scores = await db
      .select({
        id: practiceScores.id,
        overallScore: practiceScores.overallScore,
        createdAt: practiceScores.createdAt,
        lessonTitle: lessons.title,
        lessonId: practiceScores.lessonId,
      })
      .from(practiceScores)
      .innerJoin(lessons, eq(practiceScores.lessonId, lessons.id))
      .where(eq(practiceScores.userId, userId))
      .orderBy(desc(practiceScores.createdAt))
      .limit(20);

    recentScores = scores.map((s) => ({
      id: s.id,
      lessonTitle: s.lessonTitle,
      overallScore: s.overallScore,
      createdAt: s.createdAt,
    }));

    totalSessions = scores.length;
    avgScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
          )
        : 0;
    uniqueLessons = new Set(scores.map((s) => s.lessonId)).size;
  }

  // Calculate improvement per entry (compared to previous attempt on same lesson)
  const scoresWithImprovement = recentScores.map((entry, i) => {
    const previousAttempt = recentScores
      .slice(i + 1)
      .find((s) => s.lessonTitle === entry.lessonTitle);
    const improvement = previousAttempt
      ? Math.round(entry.overallScore - previousAttempt.overallScore)
      : 0;
    return { ...entry, improvement };
  });

  const hasData = recentScores.length > 0;

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
            <span className="font-heading text-3xl font-bold tabular-nums">
              {uniqueLessons}
            </span>
          </CardContent>
        </Card>
        <Card className="card-shadow transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:elevated-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-heading text-3xl font-bold tabular-nums">
              {avgScore}
            </span>
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
            <span className="font-heading text-3xl font-bold tabular-nums">
              {totalSessions}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Recent Practice Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="space-y-4">
              {scoresWithImprovement.map((entry, i) => (
                <div key={entry.id}>
                  <div className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition-colors duration-150 hover:bg-accent/50">
                    <div>
                      <p className="text-sm font-medium">{entry.lessonTitle}</p>
                      <p className="text-xs text-muted-foreground font-mono tabular-nums">
                        {entry.createdAt.toLocaleDateString()}
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
                        className={`font-mono tabular-nums ${
                          entry.overallScore >= 80
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : entry.overallScore >= 65
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {Math.round(entry.overallScore)}/100
                      </Badge>
                    </div>
                  </div>
                  {i < scoresWithImprovement.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No practice sessions yet. Head to a lesson and try Practice
                Mode!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
