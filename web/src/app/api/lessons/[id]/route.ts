import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons, steps, practiceScores } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { deleteObject, getDownloadUrl } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, id))
    .limit(1);

  if (lesson.length === 0) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const lessonSteps = await db
    .select()
    .from(steps)
    .where(eq(steps.lessonId, id))
    .orderBy(asc(steps.stepNumber));

  // Generate a fresh presigned download URL (stored URL may be expired)
  let videoUrl = lesson[0].videoUrl;
  if (videoUrl) {
    try {
      const urlObj = new URL(videoUrl);
      const key = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
      videoUrl = await getDownloadUrl(key);
    } catch {
      // If URL parsing fails, return as-is
    }
  }

  return NextResponse.json({
    ...lesson[0],
    videoUrl,
    steps: lessonSteps,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, style } = body;

  const updates: Record<string, string> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    updates.title = title.trim();
  }

  if (style !== undefined) {
    if (typeof style !== "string" || style.trim().length === 0) {
      return NextResponse.json({ error: "Style cannot be empty" }, { status: 400 });
    }
    updates.style = style.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, id))
    .limit(1);

  if (lesson.length === 0) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(lessons)
    .set(updates)
    .where(eq(lessons.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, id))
    .limit(1);

  if (lesson.length === 0) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Delete video from R2
  const videoUrl = lesson[0].videoUrl;
  if (videoUrl) {
    // Extract the R2 key from the URL (videos/lessonId.ext)
    const urlPath = new URL(videoUrl).pathname;
    const key = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
    try {
      await deleteObject(key);
    } catch (err) {
      console.error("Failed to delete video from R2:", err);
      // Continue with DB deletion even if R2 fails
    }
  }

  // Delete lesson (steps + practiceScores cascade via ON DELETE CASCADE)
  await db.delete(lessons).where(eq(lessons.id, id));

  return NextResponse.json({ success: true });
}
