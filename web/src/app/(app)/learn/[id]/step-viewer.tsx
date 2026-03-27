"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  initPoseLandmarker,
  detectPose,
  drawPose,
} from "@/lib/pose-detection";

interface Step {
  id: number;
  name: string;
  description: string;
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
}

export function StepViewer({
  steps,
  videoUrl,
}: {
  steps: Step[];
  videoUrl: string | null;
}) {
  // Proxy the video URL through our API to avoid CORS issues with canvas/MediaPipe
  const proxiedVideoUrl = videoUrl
    ? `/api/video-proxy?url=${encodeURIComponent(videoUrl)}`
    : null;
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(100);
  const [poseReady, setPoseReady] = useState(false);
  const [poseLoading, setPoseLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderedStep = useRef<number>(-1);

  const step = steps[currentStep];

  // Init MediaPipe
  useEffect(() => {
    if (!videoUrl) return;
    setPoseLoading(true);
    initPoseLandmarker()
      .then(() => setPoseReady(true))
      .catch((err) => console.error("Pose init failed:", err))
      .finally(() => setPoseLoading(false));
  }, [videoUrl]);

  // Seek video + detect pose when step changes
  const renderPoseForStep = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !poseReady || !step) return;
    if (video.readyState < 2) return;

    // Use midpoint of the step for the best representative frame
    const seekTime = (step.startTime + step.endTime) / 2;
    video.currentTime = seekTime;
  }, [poseReady, step]);

  // When video seeks to the right time, detect pose
  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !poseReady) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const result = detectPose(video, Math.round(performance.now()));
    const ctx = canvas.getContext("2d");
    if (result && ctx) {
      // Draw video frame first
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Draw skeleton overlay on top
      drawPose(ctx, result, canvas.width, canvas.height);
    }
    lastRenderedStep.current = currentStep;
  }, [poseReady, currentStep]);

  // Trigger pose render when step changes or pose becomes ready
  useEffect(() => {
    if (poseReady && step && lastRenderedStep.current !== currentStep) {
      renderPoseForStep();
    }
  }, [poseReady, step, currentStep, renderPoseForStep]);

  // Handle video loaded
  const handleLoadedData = useCallback(() => {
    if (poseReady && step) {
      renderPoseForStep();
    }
  }, [poseReady, step, renderPoseForStep]);

  if (!step) return null;

  return (
    <div>
      {/* Hidden video element for pose extraction */}
      {proxiedVideoUrl && (
        <video
          ref={videoRef}
          src={proxiedVideoUrl}
          preload="auto"
          muted
          playsInline
          onLoadedData={handleLoadedData}
          onSeeked={handleSeeked}
          className="hidden"
        />
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">
          Step-by-Step Breakdown
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Speed</span>
          <Slider
            value={[speed]}
            onValueChange={(v) => setSpeed(Array.isArray(v) ? v[0] : v)}
            min={25}
            max={100}
            step={25}
            className="w-28"
          />
          <span className="w-10 text-right font-mono text-xs text-muted-foreground">
            {speed / 100}x
          </span>
        </div>
      </div>

      {/* Step navigation */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(i)}
            className={`flex-shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
              i === currentStep
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            }`}
          >
            <div className="text-xs font-medium">Step {s.id}</div>
            <div className="text-xs opacity-70">{s.name}</div>
          </button>
        ))}
      </div>

      {/* Current step detail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Step {step.id}: {step.name}
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              Beats {step.startBeat}–{step.endBeat}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>

          {/* Pose skeleton overlay from reference video */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            {videoUrl ? (
              <>
                <canvas
                  ref={canvasRef}
                  className="h-full w-full object-contain"
                />
                {(poseLoading || (!poseReady && videoUrl)) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-xs text-muted-foreground">
                        Loading pose detection...
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No video available for pose overlay
                </p>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              ← Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
              }
              disabled={currentStep === steps.length - 1}
            >
              Next →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
