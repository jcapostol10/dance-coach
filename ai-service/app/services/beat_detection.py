"""Beat detection using librosa.

Extracts BPM and beat positions from audio files.
Requires: pip install librosa
"""

import librosa


def detect_beats(audio_path: str) -> tuple[float, list[float]]:
    """Detect BPM and beat positions from an audio file.

    Returns:
        Tuple of (bpm, beat_positions) where beat_positions is a list of
        timestamps in seconds where beats occur.
    """
    y, sr = librosa.load(audio_path, sr=22050, mono=True)

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    bpm = float(tempo) if not hasattr(tempo, '__len__') else float(tempo[0])

    return bpm, [float(t) for t in beat_times]
