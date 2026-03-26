import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "dance-coach-videos";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // optional custom domain

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

/**
 * Generate a presigned URL for direct client-side upload.
 * The client PUTs the file directly to R2 — no server relay needed.
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, {
    expiresIn,
    unhoistableHeaders: new Set(["x-amz-checksum-crc32"]),
  });
}

/**
 * Upload a file directly to R2 from the server (avoids CORS issues).
 */
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/**
 * Generate a presigned URL for reading a private object.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Copy a file from a URL (e.g. Vercel Blob) into R2.
 * Used as part of the upload pipeline: Blob (temp) → R2 (permanent).
 */
export async function copyUrlToR2(
  sourceUrl: string,
  key: string,
  contentType: string,
): Promise<void> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch from source: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await uploadObject(key, buffer, contentType);
}

/**
 * Delete an object from R2.
 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

/**
 * Build the storage key for a video upload.
 */
export function videoKey(lessonId: string, filename: string): string {
  const ext = filename.split(".").pop() || "mp4";
  return `videos/${lessonId}.${ext}`;
}

/**
 * Build the storage key for a thumbnail.
 */
export function thumbnailKey(lessonId: string): string {
  return `thumbnails/${lessonId}.jpg`;
}
