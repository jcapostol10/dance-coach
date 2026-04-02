import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { deleteObject } from "@/lib/storage";

/**
 * Deletes a lesson and its associated R2 video.
 * Safe to call multiple times — no-ops if the lesson doesn't exist.
 * Steps and practiceScores are removed via ON DELETE CASCADE.
 *
 * Designed for use with Next.js `after()` so it runs as background work
 * after an error response is already sent to the client.
 */
export async function cleanupLesson(lessonId: string): Promise<void> {
  let videoUrl: string | null = null;

  try {
    const [lesson] = await db
      .select({ videoUrl: lessons.videoUrl })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson) return; // already gone
    videoUrl = lesson.videoUrl;
  } catch (err) {
    console.error(`[cleanup] DB lookup failed for lesson ${lessonId}:`, err);
    return;
  }

  // Delete R2 video — extract key from the stored URL
  if (videoUrl) {
    try {
      const urlPath = new URL(videoUrl).pathname;
      const key = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
      await deleteObject(key);
    } catch (err) {
      // Log but don't abort — still need to remove the DB row
      console.error(`[cleanup] R2 delete failed for lesson ${lessonId}:`, err);
    }
  }

  // Delete lesson row (steps + practiceScores cascade via FK ON DELETE CASCADE)
  try {
    await db.delete(lessons).where(eq(lessons.id, lessonId));
    console.log(`[cleanup] Deleted lesson ${lessonId} after analysis failure`);
  } catch (err) {
    console.error(`[cleanup] DB delete failed for lesson ${lessonId}:`, err);
  }
}
