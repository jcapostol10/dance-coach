import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { practiceScores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const body = await request.json();
  const { lessonId, userId, userKeyframes } = body;

  if (!lessonId || !userId || !userKeyframes) {
    return NextResponse.json(
      { error: "lessonId, userId, and userKeyframes are required" },
      { status: 400 }
    );
  }

  // Send keyframes to AI service for comparison
  const compareResponse = await fetch(`${AI_SERVICE_URL}/compare/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lesson_id: lessonId,
      user_keyframes: userKeyframes,
    }),
  });

  if (!compareResponse.ok) {
    const error = await compareResponse.text();
    return NextResponse.json(
      { error: `Comparison failed: ${error}` },
      { status: 500 }
    );
  }

  const result = await compareResponse.json();

  // Store the score
  const [score] = await db
    .insert(practiceScores)
    .values({
      userId,
      lessonId,
      overallScore: result.overall_score,
      stepScores: result.steps,
    })
    .returning();

  return NextResponse.json(score);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const lessonId = searchParams.get("lessonId");

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
