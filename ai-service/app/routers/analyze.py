import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.models.schemas import LessonResult
from app.services.beat_detection import detect_beats
from app.services.gemini import describe_moves
from app.services.pose_extraction import extract_poses
from app.services.segmentation import segment_into_steps

router = APIRouter()


@router.post("/video", response_model=LessonResult)
async def analyze_video(file: UploadFile):
    """Analyze a dance video: extract beats, poses, and generate step-by-step lesson."""
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        video_path = tmp_path / "input.mp4"

        content = await file.read()
        video_path.write_bytes(content)

        # Extract audio for beat detection
        audio_path = tmp_path / "audio.wav"
        subprocess.run(
            [
                "ffmpeg",
                "-i",
                str(video_path),
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ar",
                "44100",
                "-ac",
                "1",
                str(audio_path),
            ],
            capture_output=True,
            check=True,
        )

        # Run analysis pipeline in parallel where possible
        bpm, beats = detect_beats(str(audio_path))
        pose_frames = extract_poses(str(video_path), fps=5)
        move_descriptions = await describe_moves(str(video_path))

        # Get video duration
        probe = subprocess.run(
            [
                "ffprobe",
                "-v",
                "quiet",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(video_path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        duration = float(probe.stdout.strip())

        # Combine into steps
        steps = segment_into_steps(beats, pose_frames, move_descriptions)

        return LessonResult(
            bpm=bpm,
            beats=beats,
            steps=steps,
            duration=duration,
        )
