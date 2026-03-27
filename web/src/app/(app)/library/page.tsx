import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const allLessons = await db
    .select()
    .from(lessons)
    .orderBy(desc(lessons.createdAt));

  // Group by style
  const grouped: Record<string, typeof allLessons> = {};
  for (const lesson of allLessons) {
    const style = lesson.style || "Uncategorized";
    if (!grouped[style]) grouped[style] = [];
    grouped[style].push(lesson);
  }

  // Sort categories alphabetically, but put "Uncategorized" last
  const sortedStyles = Object.keys(grouped).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Lesson Library
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a dance to learn. AI will break it down step by step and teach
          you at your own pace.
        </p>
        {allLessons.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {allLessons.length} lesson{allLessons.length !== 1 ? "s" : ""} across {sortedStyles.length} style{sortedStyles.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {allLessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">No lessons yet.</p>
          <Link
            href="/upload"
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Upload your first dance video
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedStyles.map((style) => (
            <section key={style}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  {style}
                </h2>
                <Badge variant="outline" className="font-mono text-xs">
                  {grouped[style].length}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[style].map((lesson) => (
                  <Link key={lesson.id} href={`/learn/${lesson.id}`}>
                    <Card className="group cursor-pointer overflow-hidden transition-colors hover:border-foreground/20">
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        {lesson.thumbnailUrl ? (
                          <img
                            src={lesson.thumbnailUrl}
                            alt={lesson.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg
                              className="h-10 w-10 text-muted-foreground/40"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 flex items-center gap-2">
                          {lesson.difficulty && (
                            <Badge
                              variant="outline"
                              className={DIFFICULTY_COLORS[lesson.difficulty] || ""}
                            >
                              {lesson.difficulty}
                            </Badge>
                          )}
                        </div>
                        {!lesson.analyzedAt && (
                          <div className="absolute right-2 top-2">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                              Not analyzed
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{lesson.title}</CardTitle>
                      </CardHeader>
                      <CardFooter className="text-xs text-muted-foreground">
                        {lesson.duration > 0 && (
                          <>
                            <span>{formatDuration(lesson.duration)}</span>
                            <span className="mx-2">·</span>
                          </>
                        )}
                        {lesson.bpm && (
                          <>
                            <span className="font-mono">{Math.round(lesson.bpm)} BPM</span>
                            <span className="mx-2">·</span>
                          </>
                        )}
                        {lesson.isCurated && (
                          <span className="text-primary">Curated</span>
                        )}
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
