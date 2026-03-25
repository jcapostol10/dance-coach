"""Movement scoring using DTW and cosine similarity.

Compares user's pose keyframes against reference lesson poses
to produce per-step scores and feedback.
"""

import math
import os

from app.models.schemas import (
    ComparisonResult,
    JointFeedback,
    PoseFrame,
    StepScore,
)

# MediaPipe landmark names for human-readable feedback
LANDMARK_NAMES = [
    "NOSE",
    "LEFT_EYE_INNER",
    "LEFT_EYE",
    "LEFT_EYE_OUTER",
    "RIGHT_EYE_INNER",
    "RIGHT_EYE",
    "RIGHT_EYE_OUTER",
    "LEFT_EAR",
    "RIGHT_EAR",
    "MOUTH_LEFT",
    "MOUTH_RIGHT",
    "LEFT_SHOULDER",
    "RIGHT_SHOULDER",
    "LEFT_ELBOW",
    "RIGHT_ELBOW",
    "LEFT_WRIST",
    "RIGHT_WRIST",
    "LEFT_PINKY",
    "RIGHT_PINKY",
    "LEFT_INDEX",
    "RIGHT_INDEX",
    "LEFT_THUMB",
    "RIGHT_THUMB",
    "LEFT_HIP",
    "RIGHT_HIP",
    "LEFT_KNEE",
    "RIGHT_KNEE",
    "LEFT_ANKLE",
    "RIGHT_ANKLE",
    "LEFT_HEEL",
    "RIGHT_HEEL",
    "LEFT_FOOT_INDEX",
    "RIGHT_FOOT_INDEX",
]

# Key joints to focus scoring on (skip face landmarks)
KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]


def _normalize_pose(frame: PoseFrame) -> list[tuple[float, float, float]]:
    """Normalize pose by centering on torso midpoint and scaling by torso length."""
    landmarks = frame.landmarks
    if len(landmarks) < 33:
        return [(l.x, l.y, l.z) for l in landmarks]

    # Torso midpoint (between hips)
    mid_x = (landmarks[23].x + landmarks[24].x) / 2
    mid_y = (landmarks[23].y + landmarks[24].y) / 2
    mid_z = (landmarks[23].z + landmarks[24].z) / 2

    # Torso length (shoulder to hip)
    shoulder_mid_y = (landmarks[11].y + landmarks[12].y) / 2
    hip_mid_y = (landmarks[23].y + landmarks[24].y) / 2
    torso_length = abs(shoulder_mid_y - hip_mid_y)
    if torso_length < 0.01:
        torso_length = 0.01

    return [
        (
            (l.x - mid_x) / torso_length,
            (l.y - mid_y) / torso_length,
            (l.z - mid_z) / torso_length,
        )
        for l in landmarks
    ]


def _cosine_similarity(
    pose_a: list[tuple[float, float, float]],
    pose_b: list[tuple[float, float, float]],
    joints: list[int] | None = None,
) -> float:
    """Compute cosine similarity between two normalized poses on specified joints."""
    if joints is None:
        joints = KEY_JOINTS

    dot = 0.0
    mag_a = 0.0
    mag_b = 0.0

    for j in joints:
        if j >= len(pose_a) or j >= len(pose_b):
            continue
        ax, ay, az = pose_a[j]
        bx, by, bz = pose_b[j]
        dot += ax * bx + ay * by + az * bz
        mag_a += ax * ax + ay * ay + az * az
        mag_b += bx * bx + by * by + bz * bz

    if mag_a == 0 or mag_b == 0:
        return 0.0

    return dot / (math.sqrt(mag_a) * math.sqrt(mag_b))


def _dtw_score(
    ref_frames: list[PoseFrame], user_frames: list[PoseFrame]
) -> float:
    """Compute DTW-based alignment score between reference and user pose sequences."""
    if not ref_frames or not user_frames:
        return 0.0

    n = len(ref_frames)
    m = len(user_frames)

    # Normalize all poses
    ref_normalized = [_normalize_pose(f) for f in ref_frames]
    user_normalized = [_normalize_pose(f) for f in user_frames]

    # Build cost matrix
    cost = [[float("inf")] * (m + 1) for _ in range(n + 1)]
    cost[0][0] = 0.0

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sim = _cosine_similarity(ref_normalized[i - 1], user_normalized[j - 1])
            c = 1.0 - max(0.0, sim)  # Convert similarity to distance
            cost[i][j] = c + min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1])

    # Normalize by path length
    path_length = n + m
    raw_score = cost[n][m] / path_length if path_length > 0 else 1.0

    # Convert to 0-100 score (lower distance = higher score)
    return max(0.0, min(100.0, (1.0 - raw_score) * 100.0))


def _per_joint_scores(
    ref_frames: list[PoseFrame], user_frames: list[PoseFrame]
) -> dict[int, float]:
    """Calculate average cosine similarity per joint across matching frames."""
    if not ref_frames or not user_frames:
        return {}

    # Simple frame-by-frame comparison (take min length)
    n = min(len(ref_frames), len(user_frames))
    joint_scores: dict[int, list[float]] = {j: [] for j in KEY_JOINTS}

    for i in range(n):
        ref_norm = _normalize_pose(ref_frames[i])
        user_norm = _normalize_pose(user_frames[i])

        for j in KEY_JOINTS:
            sim = _cosine_similarity(ref_norm, user_norm, joints=[j])
            joint_scores[j].append(sim)

    return {
        j: sum(scores) / len(scores) if scores else 0.0
        for j, scores in joint_scores.items()
    }


def _identify_problem_joints(
    joint_scores: dict[int, float], threshold: float = 0.85
) -> list[tuple[int, float]]:
    """Identify joints scoring below the threshold."""
    problems = [
        (joint_idx, score)
        for joint_idx, score in joint_scores.items()
        if score < threshold
    ]
    return sorted(problems, key=lambda x: x[1])


async def score_performance(
    lesson_id: str,
    user_keyframes: list[PoseFrame],
) -> ComparisonResult:
    """Score user performance against a reference lesson.

    In production, this fetches the reference lesson from the database.
    For now, returns a placeholder comparison.
    """
    # TODO: fetch reference lesson from database by lesson_id
    # For now, return a development placeholder
    step_scores = [
        StepScore(
            step_id=1,
            score=75.0,
            timing_score=80.0,
            form_score=70.0,
            feedback="Good attempt! Focus on extending your arms fully during this move.",
            problem_joints=["RIGHT_SHOULDER", "LEFT_ELBOW"],
            detailed_feedback=[
                JointFeedback(
                    joint="RIGHT_SHOULDER",
                    issue="Shoulder dropping during arm extension",
                    suggestion="Keep your shoulder level while extending your arm outward.",
                ),
                JointFeedback(
                    joint="LEFT_ELBOW",
                    issue="Elbow not fully extended",
                    suggestion="Straighten your left arm completely during the reach.",
                ),
            ],
        )
    ]

    overall = sum(s.score for s in step_scores) / len(step_scores) if step_scores else 0

    return ComparisonResult(overall_score=overall, steps=step_scores)
