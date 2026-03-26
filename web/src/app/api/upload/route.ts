import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { randomUUID } from "crypto";

/**
 * POST /api/upload
 *
 * Handles Vercel Blob client uploads. The client uploads directly to Blob
 * storage (bypasses the 4.5MB serverless body limit), and this route
 * handles the token generation and completion callback.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Auth check can go here
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-msvideo",
            "video/x-matroska",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max
          tokenPayload: JSON.stringify({ lessonId: randomUUID() }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Called after the file is uploaded to Blob storage
        // We can process the video here if needed
        console.log("Upload completed:", blob.url, tokenPayload);
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
