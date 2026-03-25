import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, title, style, difficulty, videoUrl, duration } = body;

  if (!title || !videoUrl) {
    return NextResponse.json(
      { error: "title and videoUrl are required" },
      { status: 400 },
    );
  }

  const result = await db
    .insert(lessons)
    .values({
      ...(id ? { id } : {}),
      title,
      style: style || null,
      difficulty: difficulty || null,
      videoUrl,
      duration: duration || 0,
      isCurated: false,
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const style = searchParams.get("style");
  const difficulty = searchParams.get("difficulty");

  let query = db
    .select()
    .from(lessons)
    .orderBy(desc(lessons.createdAt))
    .$dynamic();

  if (style) {
    query = query.where(eq(lessons.style, style));
  }
  if (difficulty) {
    query = query.where(eq(lessons.difficulty, difficulty));
  }

  const result = await query;
  return NextResponse.json(result);
}
