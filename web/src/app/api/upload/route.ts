import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getUploadUrl, videoKey, getDownloadUrl } from "@/lib/storage";

/**
 * POST /api/upload
 *
 * Returns a presigned URL for the client to upload a video directly to R2.
 * Body: { filename: string, contentType: string, lessonId?: string }
 */
export async function POST(req: NextRequest) {
  const { filename, contentType, lessonId } = await req.json();

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 },
    );
  }

  if (!contentType.startsWith("video/")) {
    return NextResponse.json(
      { error: "Only video files are accepted" },
      { status: 400 },
    );
  }

  const id = lessonId || randomUUID();
  const key = videoKey(id, filename);

  const uploadUrl = await getUploadUrl(key, contentType);
  const publicUrl = await getDownloadUrl(key);

  return NextResponse.json({ uploadUrl, key, publicUrl, lessonId: id });
}
