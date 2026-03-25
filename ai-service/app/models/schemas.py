from pydantic import BaseModel


class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class PoseFrame(BaseModel):
    time: float
    landmarks: list[Landmark]


class Step(BaseModel):
    id: int
    name: str
    start_beat: int
    end_beat: int
    start_time: float
    end_time: float
    description: str
    keyframes: list[PoseFrame]


class LessonResult(BaseModel):
    bpm: float
    beats: list[float]
    steps: list[Step]
    duration: float


class JointFeedback(BaseModel):
    joint: str
    issue: str
    suggestion: str


class StepScore(BaseModel):
    step_id: int
    score: float
    timing_score: float
    form_score: float
    feedback: str
    problem_joints: list[str]
    detailed_feedback: list[JointFeedback]


class ComparisonResult(BaseModel):
    overall_score: float
    steps: list[StepScore]


class AnalyzeRequest(BaseModel):
    video_url: str


class CompareRequest(BaseModel):
    lesson_id: str
    user_keyframes: list[PoseFrame]
