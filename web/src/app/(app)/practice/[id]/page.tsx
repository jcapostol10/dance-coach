import Link from "next/link";
import { PracticeMode } from "./practice-mode";
import { db } from "@/lib/db";
import { lessons, steps } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch lesson + steps server-side so PracticeMode can show reference video
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, id))
    .limit(1);

  const lessonSteps = lesson
    ? await db
        .select()
        .from(steps)
        .where(eq(steps.lessonId, id))
        .orderBy(asc(steps.stepNumber))
    : [];

  // Generate a fresh presigned URL for the reference video
  let videoUrl: string | null = lesson?.videoUrl ?? null;
  if (videoUrl) {
    try {
      const urlObj = new URL(videoUrl);
      const key = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
      videoUrl = await getDownloadUrl(key);
    } catch {
      // Use as-is
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/learn/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Lesson
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            Practice Mode
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record yourself and get AI feedback on your moves
          </p>
        </div>
      </div>

      <PracticeMode
        lessonId={id}
        referenceVideoUrl={videoUrl}
        referenceSteps={lessonSteps.map((s) => ({
          id: s.stepNumber,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
        }))}
      />
    </div>
  );
}
