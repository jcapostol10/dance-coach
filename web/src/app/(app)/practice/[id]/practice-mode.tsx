"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PracticeState = "idle" | "countdown" | "recording" | "analyzing" | "results";

interface ScoreResult {
  overallScore: number;
  steps: Array<{
    stepId: number;
    score: number;
    feedback: string;
    problemJoints: string[];
  }>;
}

export function PracticeMode({ lessonId }: { lessonId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<PracticeState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreResult | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch {
      setCameraError(
        "Camera access denied. Please allow camera access to practice."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startRecording = async () => {
    await startCamera();
    setState("countdown");
    setCountdown(3);

    // Countdown timer
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setState("recording");
        // In production: start pose extraction loop here
        // MediaPipe would run on each frame via requestAnimationFrame
      }
    }, 1000);
  };

  const stopRecording = () => {
    setState("analyzing");

    // Simulate analysis delay (in production: send keyframes to API)
    setTimeout(() => {
      setScore({
        overallScore: 78,
        steps: [
          {
            stepId: 1,
            score: 92,
            feedback: "Great starting position! Weight well centered.",
            problemJoints: [],
          },
          {
            stepId: 2,
            score: 75,
            feedback:
              "Rock step timing is slightly early. Try waiting for the beat.",
            problemJoints: ["LEFT_KNEE"],
          },
          {
            stepId: 3,
            score: 68,
            feedback:
              "Arms need to reach shoulder height. Right shoulder is dropping.",
            problemJoints: ["RIGHT_SHOULDER", "RIGHT_ELBOW"],
          },
          {
            stepId: 4,
            score: 72,
            feedback:
              "Body roll is smooth but initiate from the chest more clearly.",
            problemJoints: ["LEFT_HIP"],
          },
        ],
      });
      setState("results");
      stopCamera();
    }, 2000);
  };

  const reset = () => {
    setState("idle");
    setScore(null);
    stopCamera();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Camera / Recording View */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-muted">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-center text-sm text-destructive">
                {cameraError}
              </p>
            </div>
          ) : state === "idle" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                  <svg
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  Position yourself so your full body is visible
                </p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Pose overlay canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                style={{ transform: "scaleX(-1)" }}
              />
            </>
          )}

          {/* Countdown overlay */}
          {state === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="font-heading text-8xl font-bold text-white">
                {countdown}
              </span>
            </div>
          )}

          {/* Recording indicator */}
          {state === "recording" && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span className="text-xs font-medium text-white">Recording</span>
            </div>
          )}

          {/* Analyzing overlay */}
          {state === "analyzing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-white">Analyzing your moves...</p>
              </div>
            </div>
          )}
        </div>

        <CardContent className="py-4">
          <div className="flex justify-center gap-3">
            {state === "idle" && (
              <Button onClick={startRecording} className="w-full max-w-xs">
                Start Recording
              </Button>
            )}
            {state === "recording" && (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="w-full max-w-xs"
              >
                Stop Recording
              </Button>
            )}
            {state === "results" && (
              <Button onClick={reset} variant="outline" className="w-full max-w-xs">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Panel */}
      <div>
        {state === "results" && score ? (
          <div className="space-y-4">
            {/* Overall Score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <span className="font-heading text-5xl font-bold">
                    {score.overallScore}
                  </span>
                  <span className="mb-1 text-lg text-muted-foreground">
                    / 100
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000"
                    style={{ width: `${score.overallScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Per-step feedback */}
            {score.steps.map((stepScore) => (
              <Card key={stepScore.stepId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Step {stepScore.stepId}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        stepScore.score >= 85
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : stepScore.score >= 70
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }
                    >
                      {stepScore.score}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {stepScore.feedback}
                  </p>
                  {stepScore.problemJoints.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                      {stepScore.problemJoints.map((joint) => (
                        <Badge
                          key={joint}
                          variant="outline"
                          className="text-xs font-mono"
                        >
                          {joint.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <h3 className="font-heading text-lg font-semibold">
                  How Practice Mode Works
                </h3>
                <ol className="mx-auto mt-4 max-w-sm space-y-3 text-left text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      1
                    </span>
                    Position yourself so your full body is visible in the camera
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      2
                    </span>
                    Hit record and perform the dance moves you learned
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      3
                    </span>
                    AI will analyze your form and give you specific feedback
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      4
                    </span>
                    Practice again to improve your score
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
