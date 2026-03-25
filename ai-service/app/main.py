from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analyze, compare

app = FastAPI(
    title="DanceCoach AI Service",
    description="AI-powered dance video analysis and movement scoring",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
app.include_router(compare.router, prefix="/compare", tags=["compare"])


@app.get("/health")
async def health():
    return {"status": "ok"}
