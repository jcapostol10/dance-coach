import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadObject, videoKey, getDownloadUrl } from "@/lib/storage";

/**
 * POST /api/upload
 *
 * Accepts video upload via multipart form data and streams it to R2.
 * Falls back to JSON mode for presigned URL flow.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  // Multipart upload — proxy through server to avoid R2 CORS issues
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const lessonId = (formData.get("lessonId") as string) || randomUUID();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Only video files are accepted" },
        { status: 400 },
      );
    }

    const key = videoKey(lessonId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadObject(key, buffer, file.type);
    const publicUrl = await getDownloadUrl(key);

    return NextResponse.json({ key, publicUrl, lessonId });
  }

  // JSON mode — return presigned URL (for mobile / external clients)
  const { filename, contentType: fileContentType, lessonId } = await req.json();

  if (!filename || !fileContentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 },
    );
  }

  if (!fileContentType.startsWith("video/")) {
    return NextResponse.json(
      { error: "Only video files are accepted" },
      { status: 400 },
    );
  }

  const id = lessonId || randomUUID();
  const key = videoKey(id, filename);

  const { getUploadUrl } = await import("@/lib/storage");
  const uploadUrl = await getUploadUrl(key, fileContentType);
  const publicUrl = await getDownloadUrl(key);

  return NextResponse.json({ uploadUrl, key, publicUrl, lessonId: id });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
