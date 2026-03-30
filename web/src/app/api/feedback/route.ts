import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, lessons, steps, practiceScores } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { computeScores, generateFeedback } from "@/lib/scoring";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

/** Ensure a user row exists for the current session, return the DB user ID.
 *  Checks NextAuth session first, then falls back to X-User-Email header (mobile). */
async function getOrCreateUserId(
  request?: Request
): Promise<string | null> {
  const session = await auth();
  let email = session?.user?.email ?? null;

  // Fallback: mobile clients send X-User-Email header
  if (!email && request) {
    email = request.headers.get("x-user-email");
  }

  if (!email) return null;
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(users)
    .values({
      externalId: email,
      email,
      name: session?.user?.name || null,
      avatarUrl: session?.user?.image || null,
    })
    .returning({ id: users.id });

  return created.id;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { lessonId, userKeyframes } = body;

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

    // Auto-create user from session and store score
    const userId = await getOrCreateUserId(request);
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
  const userId = await getOrCreateUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const scores = await db
    .select({
      id: practiceScores.id,
      lessonId: practiceScores.lessonId,
      overallScore: practiceScores.overallScore,
      stepScores: practiceScores.stepScores,
      createdAt: practiceScores.createdAt,
      lessonTitle: lessons.title,
    })
    .from(practiceScores)
    .innerJoin(lessons, eq(practiceScores.lessonId, lessons.id))
    .where(eq(practiceScores.userId, userId))
    .orderBy(desc(practiceScores.createdAt))
    .limit(20);

  return NextResponse.json(scores);
}
