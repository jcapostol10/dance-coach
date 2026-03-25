from fastapi import APIRouter

from app.models.schemas import CompareRequest, ComparisonResult
from app.services.scoring import score_performance

router = APIRouter()


@router.post("/score", response_model=ComparisonResult)
async def compare_performance(request: CompareRequest):
    """Compare user's pose keyframes against a reference lesson and generate feedback."""
    result = await score_performance(
        lesson_id=request.lesson_id,
        user_keyframes=request.user_keyframes,
    )
    return result
