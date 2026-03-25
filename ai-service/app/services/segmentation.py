"""Step segmentation: combines beat grid, pose frames, and move descriptions
into structured dance steps."""

import math

from app.models.schemas import PoseFrame, Step


def _pose_delta(frame_a: PoseFrame, frame_b: PoseFrame) -> float:
    """Calculate the total movement between two pose frames (Euclidean distance sum)."""
    if not frame_a.landmarks or not frame_b.landmarks:
        return 0.0
    total = 0.0
    for la, lb in zip(frame_a.landmarks, frame_b.landmarks):
        dx = la.x - lb.x
        dy = la.y - lb.y
        dz = la.z - lb.z
        total += math.sqrt(dx * dx + dy * dy + dz * dz)
    return total


def _find_nearest_frame(
    pose_frames: list[PoseFrame], time: float
) -> PoseFrame | None:
    """Find the pose frame closest to the given timestamp."""
    if not pose_frames:
        return None
    return min(pose_frames, key=lambda f: abs(f.time - time))


def segment_into_steps(
    beats: list[float],
    pose_frames: list[PoseFrame],
    move_descriptions: list[dict],
) -> list[Step]:
    """Combine beat grid, pose frames, and Gemini descriptions into steps.

    Strategy:
    1. Use Gemini's move boundaries as the primary segmentation.
    2. Snap move boundaries to nearest beats for musical alignment.
    3. Attach pose keyframes to each step.
    """
    if not beats or not move_descriptions:
        return []

    steps: list[Step] = []

    for i, move in enumerate(move_descriptions):
        start_time = float(move.get("start_time", 0))
        end_time = float(move.get("end_time", start_time + 2))

        # Snap to nearest beats
        start_beat = _snap_to_beat(start_time, beats)
        end_beat = _snap_to_beat(end_time, beats)

        # Ensure end_beat > start_beat
        if end_beat <= start_beat:
            end_beat = min(start_beat + 1, len(beats) - 1)

        # Get beat times
        start_beat_time = beats[start_beat] if start_beat < len(beats) else start_time
        end_beat_time = beats[end_beat] if end_beat < len(beats) else end_time

        # Extract keyframes for this time window
        keyframes = [
            f for f in pose_frames if start_beat_time <= f.time <= end_beat_time
        ]

        steps.append(
            Step(
                id=i + 1,
                name=move.get("name", f"Step {i + 1}"),
                start_beat=start_beat + 1,
                end_beat=end_beat + 1,
                start_time=start_beat_time,
                end_time=end_beat_time,
                description=move.get("description", ""),
                keyframes=keyframes,
            )
        )

    return steps


def _snap_to_beat(time: float, beats: list[float]) -> int:
    """Find the index of the beat closest to the given time."""
    if not beats:
        return 0
    min_dist = float("inf")
    best_idx = 0
    for i, beat_time in enumerate(beats):
        dist = abs(beat_time - time)
        if dist < min_dist:
            min_dist = dist
            best_idx = i
    return best_idx
