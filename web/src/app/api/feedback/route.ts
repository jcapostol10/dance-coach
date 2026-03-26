import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons, steps, practiceScores } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { computeScores, generateFeedback } from "@/lib/scoring";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const { lessonId, userKeyframes, userId } = body;

  if (!lessonId || !userKeyframes || !Array.isArray(userKeyframes)) {
    return NextResponse.json(
      { error: "lessonId and userKeyframes array are required" },
      { status: 400 }
    );
  }

  if (userKeyframes.length < 5) {
    return NextResponse.json(
      { error: "Not enough keyframes captured. Record for at least 3 seconds." },
      { status: 400 }
    );
  }

  // Fetch lesson steps
  const lessonRows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (lessonRows.length === 0) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const lessonSteps = await db
    .select()
    .from(steps)
    .where(eq(steps.lessonId, lessonId))
    .orderBy(asc(steps.stepNumber));

  if (lessonSteps.length === 0) {
    return NextResponse.json(
      { error: "This lesson has no analyzed steps to compare against." },
      { status: 400 }
    );
  }

  const stepInfos = lessonSteps.map((s) => ({
    stepNumber: s.stepNumber,
    name: s.name,
    description: s.description,
    startTime: s.startTime,
    endTime: s.endTime,
  }));

  // Compute pose metrics
  const { stepMetrics } = computeScores(userKeyframes, stepInfos);

  // Generate AI feedback via Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI feedback service not configured" },
      { status: 500 }
    );
  }

  try {
    const result = await generateFeedback(stepMetrics, apiKey);

    // Store score if userId provided
    if (userId) {
      await db.insert(practiceScores).values({
        userId,
        lessonId,
        overallScore: result.overallScore,
        stepScores: result.stepScores.map((s) => ({
          stepId: String(s.stepNumber),
          score: s.score,
          timingScore: s.timingScore,
          formScore: s.formScore,
          feedback: s.feedback,
          problemJoints: s.problemJoints,
        })),
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Scoring error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate feedback",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const lessonId = url.searchParams.get("lessonId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  let query = db
    .select()
    .from(practiceScores)
    .where(eq(practiceScores.userId, userId))
    .orderBy(desc(practiceScores.createdAt))
    .$dynamic();

  if (lessonId) {
    query = query.where(eq(practiceScores.lessonId, lessonId));
  }

  const scores = await query;
  return NextResponse.json(scores);
}
