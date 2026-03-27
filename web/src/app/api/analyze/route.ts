import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import { lessons, steps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 120;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ANALYSIS_PROMPT = `You are a dance instructor AI. Analyze this dance video and return a JSON object with:

1. **bpm**: Estimated beats per minute of the music (number)
2. **beats**: Array of beat timestamps in seconds (e.g. [0.4, 0.8, 1.2, ...]) — estimate at least 8-16 beats
3. **duration**: Total video duration in seconds (number)
4. **steps**: Array of distinct dance moves/steps, each with:
   - id: sequential number starting from 1
   - name: short name for the move (e.g. "Body Roll", "Step Touch", "Arm Wave")
   - description: Detailed execution instructions written as if teaching someone how to perform the move. Use this exact format with **bold labels** on each line:
     **Arms & Hands:** describe exact arm positions, hand shapes, wrist angles, and arm paths through space
     **Core & Torso:** describe any torso rotation, lean, isolation, chest pop, or body roll
     **Legs & Feet:** describe exact foot placement, knee bend, which foot steps where and when
     **Weight & Stance:** describe weight distribution, transfers between feet, center of gravity shifts
     **Timing:** describe how the movement syncs to the beat count (e.g. "step on 1, hold on 2")
   - start_time: when this move starts (seconds)
   - end_time: when this move ends (seconds)
   - start_beat: which beat number this move starts on
   - end_beat: which beat number this move ends on

Identify 3-8 distinct steps/moves. Write descriptions as clear instructions a student can follow, not observations of what the dancer does. Be specific about directions (left/right), angles, and body mechanics.

IMPORTANT: Return ONLY valid JSON, no markdown, no code fences. Each description should be a single string with newlines (\\n) between the labeled sections. Example format:
{"bpm":120,"beats":[0.5,1.0,1.5],"duration":30,"steps":[{"id":1,"name":"Step Touch","description":"**Arms & Hands:** Extend both arms to shoulder height...\\n**Core & Torso:** Keep your torso upright...\\n**Legs & Feet:** Step your right foot out to the side...\\n**Weight & Stance:** Shift your weight fully onto the stepping foot...\\n**Timing:** Step on beat 1, touch on beat 2","start_time":0,"end_time":5,"start_beat":1,"end_beat":10}]}`;

export async function POST(request: Request) {
  const body = await request.json();
  const { lessonId } = body;

  if (!lessonId) {
    return NextResponse.json(
      { error: "lessonId is required" },
      { status: 400 },
    );
  }

  // Fetch lesson from DB
  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (lesson.length === 0) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  try {
    // Download video from R2 using the stored URL
    const { videoUrl } = lesson[0];
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch video from storage (${videoResponse.status})` },
        { status: 500 },
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const base64Video = videoBuffer.toString("base64");

    // Analyze with Gemini 2.5 Flash (native video understanding)
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

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: `AI returned invalid JSON: ${jsonStr.substring(0, 200)}` },
        { status: 500 },
      );
    }

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
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
