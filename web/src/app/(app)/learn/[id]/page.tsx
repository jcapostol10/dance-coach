import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StepViewer } from "./step-viewer";
import { VideoPlayer } from "./video-player";
import { DeleteLessonButton } from "./delete-lesson-button";
import { EditableTitle } from "./editable-title";
import { EditableStyle } from "./editable-style";
import { db } from "@/lib/db";
import { lessons, steps } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </Link>
          <div className="mt-3">
            <EditableTitle lessonId={id} initialTitle={lesson.title} />
          </div>
          <EditableStyle
            lessonId={id}
            initialStyle={lesson.style}
            difficulty={lesson.difficulty}
            bpm={lesson.bpm}
          />
        </div>
        <div className="flex items-center gap-3">
          <DeleteLessonButton lessonId={id} />
          <Link href={`/practice/${id}`}>
            <Button className="card-shadow transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:elevated-shadow">
              Practice This Dance
            </Button>
          </Link>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Video player */}
      <Card className="mb-8 overflow-hidden card-shadow">
        {lesson.videoUrl ? (
          <VideoPlayer src={lesson.videoUrl} />
        ) : (
          <div className="relative aspect-video bg-muted">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 card-shadow">
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
          </div>
        )}
      </Card>

      {/* Step-by-step viewer */}
      {formattedSteps.length > 0 ? (
        <StepViewer steps={formattedSteps} videoUrl={lesson.videoUrl} />
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-surface-elevated/50 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {lesson.analyzedAt
              ? "No steps were detected for this video."
              : "This video hasn\u2019t been analyzed yet. Upload it again or trigger analysis."}
          </p>
        </div>
      )}
    </div>
  );
}
