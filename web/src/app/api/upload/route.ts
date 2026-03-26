import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

/**
 * POST /api/upload
 *
 * Phase 1: Client uploads directly to Vercel Blob (no CORS, no size limit).
 * Phase 2: Client calls /api/upload/finalize to copy Blob → R2.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-msvideo",
            "video/x-matroska",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // No-op — finalization happens via /api/upload/finalize
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
