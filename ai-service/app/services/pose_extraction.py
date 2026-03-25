"""Pose extraction using MediaPipe.

Extracts 33 body landmarks per frame from video files.
Requires: pip install mediapipe opencv-python
"""

from app.models.schemas import Landmark, PoseFrame


def extract_poses(video_path: str, fps: int = 5) -> list[PoseFrame]:
    """Extract pose landmarks from video at the specified frame rate.

    Args:
        video_path: Path to the video file.
        fps: Frames per second to sample (lower = faster, higher = more precise).

    Returns:
        List of PoseFrame objects with timestamps and 33 landmarks each.
    """
    try:
        import cv2
        import mediapipe as mp
    except ImportError:
        return _fallback_poses(video_path, fps)

    mp_pose = mp.solutions.pose

    cap = cv2.VideoCapture(video_path)
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(video_fps / fps) if video_fps > 0 else 1

    pose_frames: list[PoseFrame] = []
    frame_idx = 0

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                time = frame_idx / video_fps if video_fps > 0 else 0.0
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb_frame)

                if results.pose_landmarks:
                    landmarks = [
                        Landmark(
                            x=lm.x,
                            y=lm.y,
                            z=lm.z,
                            visibility=lm.visibility,
                        )
                        for lm in results.pose_landmarks.landmark
                    ]
                    pose_frames.append(PoseFrame(time=time, landmarks=landmarks))

            frame_idx += 1

    cap.release()
    return pose_frames


def _fallback_poses(video_path: str, fps: int) -> list[PoseFrame]:
    """Generate placeholder pose data when mediapipe is not available."""
    # Return empty frames for development
    return []
