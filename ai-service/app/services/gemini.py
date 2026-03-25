"""Gemini Flash integration for natural language dance move descriptions.

Uses Google's Gemini API to analyze dance videos and describe movements.
Requires: pip install google-genai
"""

import json
import os


async def describe_moves(video_path: str) -> list[dict]:
    """Send video to Gemini Flash and get structured move descriptions.

    Returns a list of dicts with keys: name, start_time, end_time, description.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return _fallback_descriptions()

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        # Upload video file
        video_file = client.files.upload(file=video_path)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                video_file,
                """Analyze this dance video and break it down into distinct moves/steps.
For each move, provide:
- name: a short descriptive name for the move
- start_time: approximate start time in seconds
- end_time: approximate end time in seconds
- description: detailed description of the body movements involved,
  including which body parts move, the direction, and any important technique notes.

Return your response as a JSON array of objects with these exact keys.
Only return the JSON array, no other text.""",
            ],
        )

        try:
            # Strip markdown code fences if present
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text.rsplit("```", 1)[0]
            if text.startswith("json"):
                text = text[4:]
            return json.loads(text.strip())
        except (json.JSONDecodeError, AttributeError):
            return _fallback_descriptions()

    except Exception:
        return _fallback_descriptions()


def _fallback_descriptions() -> list[dict]:
    """Placeholder descriptions for development without API key."""
    return [
        {
            "name": "Starting Position",
            "start_time": 0.0,
            "end_time": 2.0,
            "description": "Stand with feet shoulder-width apart, arms at sides, weight centered.",
        },
        {
            "name": "Basic Step",
            "start_time": 2.0,
            "end_time": 6.0,
            "description": "Step right foot to the side, bring left foot to meet it. Repeat to the left.",
        },
    ]
