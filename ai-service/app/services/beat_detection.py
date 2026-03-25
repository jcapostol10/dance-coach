"""Beat detection using Essentia.

Extracts BPM and beat positions from audio files.
Requires: pip install essentia
"""


def detect_beats(audio_path: str) -> tuple[float, list[float]]:
    """Detect BPM and beat positions from an audio file.

    Returns:
        Tuple of (bpm, beat_positions) where beat_positions is a list of
        timestamps in seconds where beats occur.
    """
    try:
        import essentia.standard as es
    except ImportError:
        # Fallback: return estimated beats if essentia not installed
        return _fallback_beat_detection(audio_path)

    audio = es.MonoLoader(filename=audio_path, sampleRate=44100)()

    rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
    bpm, beats, beats_confidence, _, _ = rhythm_extractor(audio)

    return float(bpm), [float(b) for b in beats]


def _fallback_beat_detection(audio_path: str) -> tuple[float, list[float]]:
    """Simple fallback when essentia is not available.

    Uses a fixed BPM estimate and generates evenly-spaced beats.
    This is only for development/testing.
    """
    import wave

    with wave.open(audio_path, "r") as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        duration = frames / float(rate)

    # Default to 120 BPM for fallback
    bpm = 120.0
    beat_interval = 60.0 / bpm
    beats = []
    t = beat_interval
    while t < duration:
        beats.append(t)
        t += beat_interval

    return bpm, beats
