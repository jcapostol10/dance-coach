import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import { lessons, steps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ANALYSIS_PROMPT = `You are a dance analysis AI. Analyze this dance video and return a JSON object with:

1. **bpm**: Estimated beats per minute of the music (number)
2. **beats**: Array of beat timestamps in seconds (e.g. [0.4, 0.8, 1.2, ...]) — estimate at least 8-16 beats
3. **duration**: Total video duration in seconds (number)
4. **steps**: Array of distinct dance moves/steps, each with:
   - id: sequential number starting from 1
   - name: short name for the move (e.g. "Body Roll", "Step Touch", "Arm Wave")
   - description: 1-2 sentence description of what the dancer is doing
   - start_time: when this move starts (seconds)
   - end_time: when this move ends (seconds)
   - start_beat: which beat number this move starts on
   - end_beat: which beat number this move ends on

Identify 3-8 distinct steps/moves. Be specific about the dance movements.

IMPORTANT: Return ONLY valid JSON, no markdown, no code fences. Example format:
{"bpm":120,"beats":[0.5,1.0,1.5],"duration":30,"steps":[{"id":1,"name":"Step Touch","description":"Side step with a touch","start_time":0,"end_time":5,"start_beat":1,"end_beat":10}]}`;

export async function POST(request: Request) {
  const body = await request.json();
  const { lessonId } = body;

  if (!lessonId) {
    return NextResponse.json(
      { error: "lessonId is required" },
      { status: 400 },
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

  try {
    // Download video to send to Gemini
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video from storage" },
        { status: 500 },
      );
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const base64Video = Buffer.from(videoBuffer).toString("base64");

    // Analyze with Gemini Flash (native video understanding)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: ANALYSIS_PROMPT },
      {
        inlineData: {
          mimeType: "video/mp4",
          data: base64Video,
        },
      },
    ]);

    const responseText = result.response.text();

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const analysis = JSON.parse(jsonStr);

    // Store analysis results in DB
    await db
      .update(lessons)
      .set({
        bpm: analysis.bpm,
        beats: analysis.beats,
        duration: analysis.duration,
        analyzedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId));

    // Store steps
    for (const step of analysis.steps) {
      await db.insert(steps).values({
        lessonId,
        stepNumber: step.id,
        name: step.name,
        description: step.description,
        startBeat: step.start_beat,
        endBeat: step.end_beat,
        startTime: step.start_time,
        endTime: step.end_time,
      });
    }

    return NextResponse.json({ success: true, lesson: analysis });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
