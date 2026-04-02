import { NextResponse } from "next/server";
import { after } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import { lessons, steps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";
import { cleanupLesson } from "@/lib/lesson-cleanup";

export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const FILES_API_BASE = "https://generativelanguage.googleapis.com";

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

CRITICAL RULES:
- You MUST analyze the ENTIRE video from the very first second to the very last second. Do NOT skip any part.
- If the video contains multiple dance segments, routines, or songs, break down ALL of them — not just one.
- There is NO maximum limit on steps. Use as many steps as needed to cover every distinct move in the full video. A 30-second video might have 4-6 steps. A 2-minute video might have 15-25 steps.
- Steps must be in chronological order and their start_time/end_time must cover the full duration with no gaps.
- The first step must start at or near 0 seconds. The last step must end at or near the video's total duration.
- Write descriptions as clear instructions a student can follow, not observations of what the dancer does. Be specific about directions (left/right), angles, and body mechanics.

IMPORTANT: Return ONLY valid JSON, no markdown, no code fences. Each description should be a single string with newlines (\\n) between the labeled sections. Example format:
{"bpm":120,"beats":[0.5,1.0,1.5],"duration":30,"steps":[{"id":1,"name":"Step Touch","description":"**Arms & Hands:** Extend both arms to shoulder height...\\n**Core & Torso:** Keep your torso upright...\\n**Legs & Feet:** Step your right foot out to the side...\\n**Weight & Stance:** Shift your weight fully onto the stepping foot...\\n**Timing:** Step on beat 1, touch on beat 2","start_time":0,"end_time":5,"start_beat":1,"end_beat":10}]}`;

/**
 * Upload video buffer to Gemini Files API via multipart HTTP — no filesystem writes.
 * Returns the file URI to use in generateContent.
 */
async function uploadToGeminiFiles(buffer: Buffer, mimeType: string): Promise<string> {
  const boundary = `boundary_${Date.now()}`;
  const metadata = JSON.stringify({ file: { display_name: "dance-video" } });

  // Build multipart body
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n`;
  const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;

  const metaBuf = Buffer.from(metaPart);
  const filePartBuf = Buffer.from(filePart);
  const closingBuf = Buffer.from(closing);
  const body = Buffer.concat([metaBuf, filePartBuf, buffer, closingBuf]);

  // Step 1: initiate resumable upload
  const initRes = await fetch(
    `${FILES_API_BASE}/upload/v1beta/files?key=${GEMINI_API_KEY}&uploadType=resumable`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(buffer.length),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: "dance-video" } }),
    },
  );

  if (!initRes.ok) {
    throw new Error(`Files API init failed (${initRes.status}): ${await initRes.text()}`);
  }

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Files API did not return upload URL");

  // Step 2: upload the actual bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
      "Content-Length": String(buffer.length),
      "Content-Type": mimeType,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Files API upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }

  const uploadData = await uploadRes.json() as { file: { name: string; uri: string; state: string } };
  let file = uploadData.file;

  // Step 3: poll until ACTIVE
  while (file.state === "PROCESSING") {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `${FILES_API_BASE}/v1beta/${file.name}?key=${GEMINI_API_KEY}`,
    );
    if (pollRes.ok) {
      const pollData = await pollRes.json() as { name: string; uri: string; state: string };
      file = { ...file, ...pollData };
    }
  }

  if (file.state === "FAILED") throw new Error("Gemini file processing failed");

  return file.uri;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { lessonId, stream: useStream } = body;

  if (!lessonId) {
    return NextResponse.json(
      { error: "lessonId is required" },
      { status: 400 },
    );
  }

  if (!useStream) {
    return handleAnalysis(lessonId);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function send(event: string, data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        send("progress", { phase: "fetch_lesson", pct: 5, message: "Loading lesson data..." });

        const lesson = await db
          .select()
          .from(lessons)
          .where(eq(lessons.id, lessonId))
          .limit(1);

        if (lesson.length === 0) {
          // Lesson not found — nothing to clean up
          send("error", { error: "Lesson not found" });
          controller.close();
          return;
        }

        send("progress", { phase: "download_video", pct: 10, message: "Downloading video from storage..." });

        let videoUrl = lesson[0].videoUrl;
        try {
          const urlObj = new URL(videoUrl);
          const key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
          videoUrl = await getDownloadUrl(key);
        } catch {
          // Use as-is if URL parsing fails
        }

        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          send("error", { error: `Failed to fetch video (${videoResponse.status})` });
          after(() => cleanupLesson(lessonId));
          controller.close();
          return;
        }

        send("progress", { phase: "encode_video", pct: 20, message: "Uploading video to AI service..." });

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const mimeType = videoResponse.headers.get("content-type") || "video/mp4";

        let fileUri: string;
        try {
          fileUri = await uploadToGeminiFiles(videoBuffer, mimeType);
        } catch (err) {
          send("error", { error: err instanceof Error ? err.message : "File upload failed" });
          after(() => cleanupLesson(lessonId));
          controller.close();
          return;
        }

        send("progress", { phase: "ai_analyzing", pct: 35, message: "AI is analyzing dance movements..." });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
          { text: ANALYSIS_PROMPT },
          { fileData: { mimeType, fileUri } },
        ]);

        send("progress", { phase: "parse_results", pct: 80, message: "Parsing AI results..." });

        const responseText = result.response.text();
        const jsonStr = responseText
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();

        let analysis;
        try {
          analysis = JSON.parse(jsonStr);
        } catch {
          send("error", { error: "AI returned invalid response. Please try again." });
          after(() => cleanupLesson(lessonId));
          controller.close();
          return;
        }

        send("progress", { phase: "save_results", pct: 90, message: "Saving analysis to database..." });

        await db.delete(steps).where(eq(steps.lessonId, lessonId));
        await db
          .update(lessons)
          .set({ bpm: analysis.bpm, beats: analysis.beats, duration: analysis.duration, analyzedAt: new Date() })
          .where(eq(lessons.id, lessonId));

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

        send("progress", { phase: "complete", pct: 100, message: "Analysis complete!" });
        send("done", { lesson: analysis });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        send("error", { error: message });
        after(() => cleanupLesson(lessonId));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function handleAnalysis(lessonId: string) {
  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (lesson.length === 0) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  try {
    let videoUrl = lesson[0].videoUrl;
    try {
      const urlObj = new URL(videoUrl);
      const key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
      videoUrl = await getDownloadUrl(key);
    } catch {
      // Use as-is
    }

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      after(() => cleanupLesson(lessonId));
      return NextResponse.json(
        { error: `Failed to fetch video (${videoResponse.status})` },
        { status: 500 },
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const mimeType = videoResponse.headers.get("content-type") || "video/mp4";
    const fileUri = await uploadToGeminiFiles(videoBuffer, mimeType);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      { text: ANALYSIS_PROMPT },
      { fileData: { mimeType, fileUri } },
    ]);

    const responseText = result.response.text();
    const jsonStr = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch {
      after(() => cleanupLesson(lessonId));
      return NextResponse.json(
        { error: `AI returned invalid JSON: ${jsonStr.substring(0, 200)}` },
        { status: 500 },
      );
    }

    await db.delete(steps).where(eq(steps.lessonId, lessonId));
    await db
      .update(lessons)
      .set({ bpm: analysis.bpm, beats: analysis.beats, duration: analysis.duration, analyzedAt: new Date() })
      .where(eq(lessons.id, lessonId));

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
    after(() => cleanupLesson(lessonId));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
