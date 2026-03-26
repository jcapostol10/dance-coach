import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  type PoseLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export type { NormalizedLandmark };

export interface PoseFrame {
  time: number;
  landmarks: NormalizedLandmark[];
}

let landmarker: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

/**
 * Initialize the MediaPipe Pose Landmarker (singleton, loads WASM + model once).
 */
export async function initPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return landmarker;
  })();

  return initPromise;
}

/**
 * Run pose detection on a single video frame.
 */
export function detectPose(
  video: HTMLVideoElement,
  timestampMs: number
): PoseLandmarkerResult | null {
  if (!landmarker) return null;
  try {
    return landmarker.detectForVideo(video, timestampMs);
  } catch {
    return null;
  }
}

/**
 * Draw pose landmarks + connections on a canvas overlaying the video.
 */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  result: PoseLandmarkerResult,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);

  if (!result.landmarks || result.landmarks.length === 0) return;

  const drawingUtils = new DrawingUtils(ctx);

  for (const landmarks of result.landmarks) {
    // Draw connections (skeleton lines)
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: "#6366F1",
      lineWidth: 3,
    });

    // Draw landmarks (joints)
    drawingUtils.drawLandmarks(landmarks, {
      color: "#A5B4FC",
      fillColor: "#6366F1",
      lineWidth: 1,
      radius: 4,
    });
  }
}

/**
 * Extract a simplified PoseFrame from a detection result.
 */
export function extractFrame(
  result: PoseLandmarkerResult,
  time: number
): PoseFrame | null {
  if (!result.landmarks || result.landmarks.length === 0) return null;
  return {
    time,
    landmarks: result.landmarks[0].map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility ?? 0,
    })),
  };
}
