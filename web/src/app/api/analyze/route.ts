import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons, steps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const body = await request.json();
  const { lessonId } = body;

  if (!lessonId) {
    return NextResponse.json(
      { error: "lessonId is required" },
      { status: 400 }
    );
  }

  // Fetch lesson to get video URL
  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (lesson.length === 0) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const { videoUrl } = lesson[0];

  // Download video and forward to AI service
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }

  const videoBlob = await videoResponse.blob();
  const formData = new FormData();
  formData.append("file", videoBlob, "video.mp4");

  const analysisResponse = await fetch(`${AI_SERVICE_URL}/analyze/video`, {
    method: "POST",
    body: formData,
  });

  if (!analysisResponse.ok) {
    const error = await analysisResponse.text();
    return NextResponse.json(
      { error: `Analysis failed: ${error}` },
      { status: 500 }
    );
  }

  const result = await analysisResponse.json();

  // Store analysis results
  await db
    .update(lessons)
    .set({
      bpm: result.bpm,
      beats: result.beats,
      analyzedAt: new Date(),
    })
    .where(eq(lessons.id, lessonId));

  // Store steps
  for (const step of result.steps) {
    await db.insert(steps).values({
      lessonId,
      stepNumber: step.id,
      name: step.name,
      description: step.description,
      startBeat: step.start_beat,
      endBeat: step.end_beat,
      startTime: step.start_time,
      endTime: step.end_time,
      keyframes: step.keyframes,
    });
  }

  return NextResponse.json({ success: true, lesson: result });
}
