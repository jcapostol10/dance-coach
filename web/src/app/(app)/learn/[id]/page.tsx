import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StepViewer } from "./step-viewer";
import { DeleteLessonButton } from "./delete-lesson-button";
import { db } from "@/lib/db";
import { lessons, steps } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const dynamic = "force-dynamic";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lessonRows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, id))
    .limit(1);

  if (lessonRows.length === 0) {
    notFound();
  }

  const lesson = { ...lessonRows[0] };

  // Generate fresh presigned download URL (stored URL may be expired)
  if (lesson.videoUrl) {
    try {
      const urlObj = new URL(lesson.videoUrl);
      const key = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
      lesson.videoUrl = await getDownloadUrl(key);
    } catch {
      // If URL parsing fails, use as-is
    }
  }

  const lessonSteps = await db
    .select()
    .from(steps)
    .where(eq(steps.lessonId, id))
    .orderBy(asc(steps.stepNumber));

  const formattedSteps = lessonSteps.map((s) => ({
    id: s.stepNumber,
    name: s.name,
    description: s.description,
    startBeat: s.startBeat,
    endBeat: s.endBeat,
    startTime: s.startTime,
    endTime: s.endTime,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/library"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Library
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            {lesson.title}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            {lesson.difficulty && (
              <Badge
                variant="outline"
                className={DIFFICULTY_COLORS[lesson.difficulty] || ""}
              >
                {lesson.difficulty}
              </Badge>
            )}
            {lesson.style && (
              <Badge variant="outline" className="border-border/40 text-foreground/70">
                {lesson.style}
              </Badge>
            )}
            {lesson.bpm && (
              <span className="text-xs text-muted-foreground font-mono">
                {Math.round(lesson.bpm)} BPM
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DeleteLessonButton lessonId={id} />
          <Link href={`/practice/${id}`}>
            <Button>Practice This Dance</Button>
          </Link>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Video player */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative aspect-video bg-muted">
          {lesson.videoUrl ? (
            <video
              src={lesson.videoUrl}
              controls
              className="h-full w-full object-contain"
              preload="metadata"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    className="h-8 w-8 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  No video available
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Step-by-step viewer */}
      {formattedSteps.length > 0 ? (
        <StepViewer steps={formattedSteps} />
      ) : (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {lesson.analyzedAt
              ? "No steps were detected for this video."
              : "This video hasn't been analyzed yet. Upload it again or trigger analysis."}
          </p>
        </div>
      )}
    </div>
  );
}
