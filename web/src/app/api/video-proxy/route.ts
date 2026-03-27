import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy video requests to R2 to avoid CORS issues with canvas/MediaPipe.
 * Only proxies URLs from our R2 bucket domain.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Validate URL is from our R2 bucket
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const allowedHosts = [
    `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  ];
  if (process.env.R2_PUBLIC_URL) {
    try {
      allowedHosts.push(new URL(process.env.R2_PUBLIC_URL).host);
    } catch {
      // skip invalid URL
    }
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!allowedHosts.some((h) => parsedUrl.host.includes(h))) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  // Stream the video from R2
  const rangeHeader = request.headers.get("range");
  const headers: Record<string, string> = {};
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  const res = await fetch(url, { headers });

  if (!res.ok && res.status !== 206) {
    return NextResponse.json(
      { error: `Upstream error: ${res.status}` },
      { status: res.status }
    );
  }

  const responseHeaders = new Headers();
  const contentType = res.headers.get("content-type");
  if (contentType) responseHeaders.set("Content-Type", contentType);

  const contentLength = res.headers.get("content-length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);

  const contentRange = res.headers.get("content-range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  const acceptRanges = res.headers.get("accept-ranges");
  if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

  // Cache for 1 hour
  responseHeaders.set("Cache-Control", "private, max-age=3600");

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
