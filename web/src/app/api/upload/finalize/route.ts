import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { copyUrlToR2, videoKey, getDownloadUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

// Allow up to 60s for large video transfers (Hobby max)
export const maxDuration = 60;

/**
 * POST /api/upload/finalize
 *
 * Copies a video from Vercel Blob (temp) → R2 (permanent, zero egress),
 * deletes the Blob copy, and returns the R2 URL.
 *
 * Body: { blobUrl: string, filename: string, contentType: string }
 */
export async function POST(req: NextRequest) {
  const { blobUrl, filename, contentType } = await req.json();

  if (!blobUrl || !filename) {
    return NextResponse.json(
      { error: "blobUrl and filename are required" },
      { status: 400 },
    );
  }

  try {
    const lessonId = randomUUID();
    const key = videoKey(lessonId, filename);

    // Stream from Vercel Blob → R2 (multipart upload)
    await copyUrlToR2(blobUrl, key, contentType || "video/mp4");

    // Delete temporary Blob copy
    await del(blobUrl).catch(() => {});

    // Get the R2 URL for playback (zero egress)
    const publicUrl = await getDownloadUrl(key);

    return NextResponse.json({ publicUrl, lessonId });
  } catch (err) {
    console.error("Finalize error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transfer failed" },
      { status: 500 },
    );
  }
}
