import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { LessonCard } from "./lesson-card";

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
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Lesson Library
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a dance to learn. AI will break it down step by step and teach
          you at your own pace.
        </p>
        {allLessons.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground font-mono tabular-nums">
            {allLessons.length} lesson{allLessons.length !== 1 ? "s" : ""} across {sortedStyles.length} style{sortedStyles.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {allLessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface-elevated/50 py-16">
          <p className="text-sm text-muted-foreground">No lessons yet.</p>
          <Link
            href="/upload"
            className="mt-3 text-sm font-medium text-primary transition-colors duration-150 hover:text-primary/80 hover:underline focus-visible:underline"
          >
            Upload your first dance video
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedStyles.map((style) => (
            <section key={style}>
              <div className="mb-5 flex items-center gap-3">
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  {style}
                </h2>
                <Badge variant="outline" className="font-mono text-xs tabular-nums">
                  {grouped[style].length}
                </Badge>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[style].map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
