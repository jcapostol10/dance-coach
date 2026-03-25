import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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
