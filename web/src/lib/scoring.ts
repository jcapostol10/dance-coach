/**
 * Pose scoring engine — compares user keyframes against reference step descriptions.
 *
 * Approach:
 * 1. Normalize all poses (center on hip midpoint, scale by torso length)
 * 2. Compute per-frame self-consistency metrics (stability, range of motion)
 * 3. Map user frames to lesson steps by time proportion
 * 4. Send pose summary + step descriptions to Gemini for intelligent feedback
 */

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface PoseFrame {
  time: number;
  landmarks: Landmark[];
}

interface StepInfo {
  stepNumber: number;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
}

export interface StepScore {
  stepNumber: number;
  stepName: string;
  score: number;
  timingScore: number;
  formScore: number;
  feedback: string;
  problemJoints: string[];
}

export interface ScoringResult {
  overallScore: number;
  stepScores: StepScore[];
}

// MediaPipe landmark indices
const LANDMARK_NAMES: Record<number, string> = {
  0: "NOSE",
  11: "LEFT_SHOULDER",
  12: "RIGHT_SHOULDER",
  13: "LEFT_ELBOW",
  14: "RIGHT_ELBOW",
  15: "LEFT_WRIST",
  16: "RIGHT_WRIST",
  23: "LEFT_HIP",
  24: "RIGHT_HIP",
  25: "LEFT_KNEE",
  26: "RIGHT_KNEE",
  27: "LEFT_ANKLE",
  28: "RIGHT_ANKLE",
};

const KEY_INDICES = Object.keys(LANDMARK_NAMES).map(Number);

/**
 * Normalize a pose: center on hip midpoint, scale by torso length.
 */
function normalizePose(landmarks: Landmark[]): Landmark[] {
  if (landmarks.length < 33) return landmarks;

  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];

  const centerX = (lHip.x + rHip.x) / 2;
  const centerY = (lHip.y + rHip.y) / 2;
  const centerZ = (lHip.z + rHip.z) / 2;

  const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
  const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;
  const shoulderMidZ = (lShoulder.z + rShoulder.z) / 2;

  const torsoLength = Math.sqrt(
    (shoulderMidX - centerX) ** 2 +
      (shoulderMidY - centerY) ** 2 +
      (shoulderMidZ - centerZ) ** 2
  );

  const scale = torsoLength > 0.01 ? torsoLength : 1;

  return landmarks.map((lm) => ({
    x: (lm.x - centerX) / scale,
    y: (lm.y - centerY) / scale,
    z: (lm.z - centerZ) / scale,
    visibility: lm.visibility,
  }));
}

/**
 * Cosine similarity between two landmark arrays (using key joints only).
 */
function cosineSimilarity(a: Landmark[], b: Landmark[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const idx of KEY_INDICES) {
    if (idx >= a.length || idx >= b.length) continue;
    const ax = a[idx].x,
      ay = a[idx].y,
      az = a[idx].z;
    const bx = b[idx].x,
      by = b[idx].y,
      bz = b[idx].z;
    dot += ax * bx + ay * by + az * bz;
    magA += ax * ax + ay * ay + az * az;
    magB += bx * bx + by * by + bz * bz;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Compute frame-to-frame movement energy (how much the user is moving).
 */
function movementEnergy(frames: Landmark[][]): number {
  if (frames.length < 2) return 0;

  let totalDelta = 0;
  for (let i = 1; i < frames.length; i++) {
    for (const idx of KEY_INDICES) {
      if (idx >= frames[i].length || idx >= frames[i - 1].length) continue;
      const dx = frames[i][idx].x - frames[i - 1][idx].x;
      const dy = frames[i][idx].y - frames[i - 1][idx].y;
      totalDelta += Math.sqrt(dx * dx + dy * dy);
    }
  }
  return totalDelta / (frames.length - 1);
}

/**
 * Identify the joints with the lowest visibility or most erratic movement.
 */
function findProblemJoints(
  frames: Landmark[][],
  maxJoints: number = 3
): string[] {
  // Score each key joint by average visibility and stability
  const jointScores: { name: string; score: number }[] = [];

  for (const idx of KEY_INDICES) {
    let visSum = 0;
    let jitterSum = 0;

    for (let i = 0; i < frames.length; i++) {
      if (idx >= frames[i].length) continue;
      visSum += frames[i][idx].visibility ?? 0.5;
      if (i > 0 && idx < frames[i - 1].length) {
        const dx = frames[i][idx].x - frames[i - 1][idx].x;
        const dy = frames[i][idx].y - frames[i - 1][idx].y;
        jitterSum += Math.sqrt(dx * dx + dy * dy);
      }
    }

    const avgVis = visSum / frames.length;
    const avgJitter = frames.length > 1 ? jitterSum / (frames.length - 1) : 0;

    // Low visibility or high jitter = problem
    jointScores.push({
      name: LANDMARK_NAMES[idx],
      score: avgVis - avgJitter * 2,
    });
  }

  return jointScores
    .sort((a, b) => a.score - b.score)
    .slice(0, maxJoints)
    .map((j) => j.name);
}

/**
 * Score user performance against lesson steps.
 *
 * Uses pose self-consistency (stability, range of motion, visibility)
 * and maps frames to steps by time proportion.
 */
export function computeScores(
  userFrames: PoseFrame[],
  steps: StepInfo[]
): { stepMetrics: Array<{ step: StepInfo; frames: Landmark[][]; energy: number; avgSelfSim: number; problemJoints: string[] }> } {
  // Normalize all frames
  const normalizedFrames = userFrames.map((f) => ({
    time: f.time,
    landmarks: normalizePose(f.landmarks),
  }));

  const totalTime = normalizedFrames[normalizedFrames.length - 1]?.time || 1;
  const totalStepDuration = steps.length > 0
    ? steps[steps.length - 1].endTime - steps[0].startTime
    : totalTime;

  const stepMetrics = steps.map((step) => {
    // Map step time range to user recording time proportionally
    const stepStart = steps.length > 0
      ? ((step.startTime - steps[0].startTime) / totalStepDuration) * totalTime
      : 0;
    const stepEnd = steps.length > 0
      ? ((step.endTime - steps[0].startTime) / totalStepDuration) * totalTime
      : totalTime;

    const stepFrames = normalizedFrames
      .filter((f) => f.time >= stepStart && f.time <= stepEnd)
      .map((f) => f.landmarks);

    if (stepFrames.length === 0) {
      return {
        step,
        frames: [],
        energy: 0,
        avgSelfSim: 0,
        problemJoints: [],
      };
    }

    // Self-similarity: how consistent is the user's pose within this step
    let selfSimSum = 0;
    let selfSimCount = 0;
    for (let i = 1; i < stepFrames.length; i++) {
      selfSimSum += cosineSimilarity(stepFrames[i], stepFrames[i - 1]);
      selfSimCount++;
    }
    const avgSelfSim = selfSimCount > 0 ? selfSimSum / selfSimCount : 0.5;

    const energy = movementEnergy(stepFrames);
    const problemJoints = findProblemJoints(stepFrames);

    return { step, frames: stepFrames, energy, avgSelfSim, problemJoints };
  });

  return { stepMetrics };
}

/**
 * Use Gemini to generate intelligent feedback based on pose metrics + step descriptions.
 */
export async function generateFeedback(
  stepMetrics: Array<{
    step: StepInfo;
    frames: Landmark[][];
    energy: number;
    avgSelfSim: number;
    problemJoints: string[];
  }>,
  apiKey: string
): Promise<ScoringResult> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const stepSummaries = stepMetrics.map((m) => ({
    stepNumber: m.step.stepNumber,
    stepName: m.step.name,
    stepDescription: m.step.description,
    framesCaptures: m.frames.length,
    movementEnergy: Math.round(m.energy * 1000) / 1000,
    poseSelfConsistency: Math.round(m.avgSelfSim * 100) / 100,
    lowestVisibilityJoints: m.problemJoints,
  }));

  const prompt = `You are a dance instructor AI analyzing a student's practice session.

The student practiced a dance routine. For each step, I have pose analysis metrics from their webcam recording.

## Step metrics:
${JSON.stringify(stepSummaries, null, 2)}

## Metric meanings:
- **framesCaptures**: number of pose frames captured during this step (5fps). 0 means the student didn't perform this step.
- **movementEnergy**: average movement between frames (higher = more movement). For active dance moves, expect 0.05-0.3. Very low (<0.02) means barely moving.
- **poseSelfConsistency**: cosine similarity between consecutive frames (0-1). Higher = more stable/controlled. For held poses expect >0.95, for active moves 0.8-0.95.
- **lowestVisibilityJoints**: joints that were least visible or most erratic — likely problem areas.

## Your task:
Score each step and provide feedback. Return ONLY valid JSON matching this schema:
{
  "overallScore": <number 0-100>,
  "stepScores": [
    {
      "stepNumber": <number>,
      "stepName": "<string>",
      "score": <number 0-100>,
      "timingScore": <number 0-100>,
      "formScore": <number 0-100>,
      "feedback": "<specific actionable feedback, 1-2 sentences>",
      "problemJoints": ["<JOINT_NAME>", ...]
    }
  ]
}

Scoring guidelines:
- 0 frames = score 0, feedback should say they skipped or didn't reach this step
- Low energy for an active move = lower score (they're not moving enough)
- Low self-consistency for a held pose = lower score (they're unstable)
- High energy + high consistency = great execution
- Be encouraging but specific. Reference actual body parts and movements from the step description.
- problemJoints should use MediaPipe names like LEFT_SHOULDER, RIGHT_KNEE, etc.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI feedback response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ScoringResult;

  // Clamp scores to 0-100
  parsed.overallScore = Math.max(0, Math.min(100, parsed.overallScore));
  for (const s of parsed.stepScores) {
    s.score = Math.max(0, Math.min(100, s.score));
    s.timingScore = Math.max(0, Math.min(100, s.timingScore));
    s.formScore = Math.max(0, Math.min(100, s.formScore));
  }

  return parsed;
}
