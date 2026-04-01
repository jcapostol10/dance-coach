"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  initPoseLandmarker,
  detectPose,
  drawPose,
  extractFrame,
  type PoseFrame,
} from "@/lib/pose-detection";

type PracticeState =
  | "loading"
  | "idle"
  | "countdown"
  | "recording"
  | "upload_preview"
  | "processing"
  | "analyzing"
  | "results";

type InputMode = "record" | "upload";

interface StepScore {
  stepNumber: number;
  stepName: string;
  score: number;
  timingScore: number;
  formScore: number;
  feedback: string;
  problemJoints: string[];
}

interface ScoreResult {
  overallScore: number;
  steps: StepScore[];
}

export function PracticeMode({ lessonId }: { lessonId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const framesRef = useRef<PoseFrame[]>([]);
  const recordingStartRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<PracticeState>("loading");
  const [inputMode, setInputMode] = useState<InputMode>("record");
  const [countdown, setCountdown] = useState(3);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);

  // Initialize MediaPipe on mount
  useEffect(() => {
    initPoseLandmarker()
      .then(() => setState("idle"))
      .catch((err) => {
        console.error("Failed to load pose model:", err);
        setCameraError("Failed to load pose detection model. Please refresh.");
      });
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (uploadUrlRef.current) {
        URL.revokeObjectURL(uploadUrlRef.current);
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = "";
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
    return () => {
      stopCamera();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stopCamera]);

  // Pose detection loop — runs during recording or processing
  const poseLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(poseLoop);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const now = performance.now();
    const result = detectPose(video, Math.round(now));
    const ctx = canvas.getContext("2d");

    if (result && ctx) {
      drawPose(ctx, result, canvas.width, canvas.height);

      const elapsed = (now - recordingStartRef.current) / 1000;
      const lastFrameTime =
        framesRef.current.length > 0
          ? framesRef.current[framesRef.current.length - 1].time
          : -1;
      if (elapsed - lastFrameTime >= 0.2) {
        const frame = extractFrame(result, elapsed);
        if (frame) {
          framesRef.current.push(frame);
          setFrameCount(framesRef.current.length);
        }
      }

      setRecordingTime(elapsed);
    }

    rafRef.current = requestAnimationFrame(poseLoop);
  }, []);

  const submitFrames = async (capturedFrames: PoseFrame[]) => {
    if (capturedFrames.length < 5) {
      setAnalyzeError(
        "Not enough pose data captured. Make sure your full body is visible and try again."
      );
      setState("idle");
      return;
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, userKeyframes: capturedFrames }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scoring failed (${res.status})`);
      }

      const result = await res.json();
      setScore({
        overallScore: result.overallScore,
        steps: result.stepScores || [],
      });
      setState("results");
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Failed to analyze performance"
      );
      setState("idle");
    }
  };

  // --- Record flow ---
  const startRecording = async () => {
    await startCamera();
    setState("countdown");
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setState("recording");
        framesRef.current = [];
        recordingStartRef.current = performance.now();
        setFrameCount(0);
        setRecordingTime(0);
        rafRef.current = requestAnimationFrame(poseLoop);
      }
    }, 1000);
  };

  const stopRecording = async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setState("analyzing");
    setAnalyzeError(null);
    stopCamera();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    await submitFrames(framesRef.current);
  };

  // --- Upload flow ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadUrlRef.current) {
      URL.revokeObjectURL(uploadUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    uploadUrlRef.current = url;
    setUploadFileName(file.name);

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.src = url;
      video.load();
    }

    setState("upload_preview");
    setAnalyzeError(null);
  };

  const processUploadedVideo = async () => {
    const video = videoRef.current;
    if (!video || !uploadUrlRef.current) return;

    framesRef.current = [];
    recordingStartRef.current = performance.now();
    setFrameCount(0);
    setRecordingTime(0);
    setState("processing");

    // When video ends, stop loop and submit
    const onEnded = async () => {
      video.removeEventListener("ended", onEnded);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      setState("analyzing");
      setAnalyzeError(null);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }

      await submitFrames(framesRef.current);
    };

    video.addEventListener("ended", onEnded);
    video.currentTime = 0;
    await video.play();
    rafRef.current = requestAnimationFrame(poseLoop);
  };

  const reset = () => {
    setState("idle");
    setScore(null);
    setAnalyzeError(null);
    setUploadFileName(null);
    stopCamera();

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = "";
      video.srcObject = null;
    }

    if (uploadUrlRef.current) {
      URL.revokeObjectURL(uploadUrlRef.current);
      uploadUrlRef.current = null;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const scoreColor = (s: number) =>
    s >= 80
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : s >= 60
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20";

  const isVideoVisible =
    state === "countdown" ||
    state === "recording" ||
    state === "upload_preview" ||
    state === "processing";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Camera / Video View */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-muted">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-center text-sm text-destructive">{cameraError}</p>
            </div>
          ) : state === "idle" || state === "loading" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6">
              {state === "loading" ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading pose detection model...</p>
                </>
              ) : (
                <>
                  {/* Mode selector */}
                  <p className="text-sm font-medium text-muted-foreground">Choose how to practice</p>
                  <div className="grid w-full max-w-xs gap-3">
                    <button
                      onClick={() => setInputMode("record")}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        inputMode === "record"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40 hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${inputMode === "record" ? "bg-primary/10" : "bg-muted"}`}>
                        <svg className={`h-5 w-5 ${inputMode === "record" ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="4" strokeWidth={1.5} />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Record yourself</p>
                        <p className="text-xs text-muted-foreground">Use your camera live</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setInputMode("upload")}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        inputMode === "upload"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40 hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${inputMode === "upload" ? "bg-primary/10" : "bg-muted"}`}>
                        <svg className={`h-5 w-5 ${inputMode === "upload" ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Upload a video</p>
                        <p className="text-xs text-muted-foreground">Analyze an existing recording</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Video element — shown during recording, processing, and upload preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${isVideoVisible ? "block" : "hidden"}`}
            style={inputMode === "record" ? { transform: "scaleX(-1)" } : undefined}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full ${isVideoVisible ? "block" : "hidden"}`}
            style={inputMode === "record" ? { transform: "scaleX(-1)" } : undefined}
          />

          {/* Countdown overlay */}
          {state === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="font-heading text-8xl font-bold text-white">{countdown}</span>
            </div>
          )}

          {/* Recording indicator */}
          {state === "recording" && (
            <>
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                <span className="text-xs font-medium text-white">Recording</span>
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-3 rounded-lg bg-black/60 px-3 py-1.5">
                <span className="text-xs font-mono text-white">{Math.floor(recordingTime)}s</span>
                <span className="text-xs text-muted-foreground">{frameCount} frames</span>
              </div>
            </>
          )}

          {/* Processing indicator (uploaded video) */}
          {state === "processing" && (
            <>
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-primary/90 px-3 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                <span className="text-xs font-medium text-white">Processing</span>
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-3 rounded-lg bg-black/60 px-3 py-1.5">
                <span className="text-xs font-mono text-white">{Math.floor(recordingTime)}s</span>
                <span className="text-xs text-muted-foreground">{frameCount} frames</span>
              </div>
            </>
          )}

          {/* Upload preview — file selected, show filename overlay */}
          {state === "upload_preview" && uploadFileName && (
            <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/60 px-3 py-2">
              <p className="truncate text-xs text-white/80">{uploadFileName}</p>
            </div>
          )}

          {/* Analyzing overlay */}
          {state === "analyzing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-white">AI is analyzing your moves...</p>
                <p className="mt-1 text-xs text-muted-foreground">This may take 10–20 seconds</p>
              </div>
            </div>
          )}
        </div>

        <CardContent className="py-4">
          {analyzeError && (
            <p className="mb-3 text-center text-sm text-destructive">{analyzeError}</p>
          )}
          <div className="flex justify-center gap-3">
            {state === "idle" && inputMode === "record" && (
              <Button onClick={startRecording} className="w-full max-w-xs">
                Start Recording
              </Button>
            )}
            {state === "idle" && inputMode === "upload" && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full max-w-xs"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Choose Video File
              </Button>
            )}
            {state === "loading" && (
              <Button className="w-full max-w-xs" disabled>
                Loading...
              </Button>
            )}
            {state === "upload_preview" && (
              <div className="flex w-full max-w-xs gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  Change
                </Button>
                <Button onClick={processUploadedVideo} className="flex-1">
                  Analyze
                </Button>
              </div>
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <span className="font-heading text-5xl font-bold">
                    {Math.round(score.overallScore)}
                  </span>
                  <span className="mb-1 text-lg text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000"
                    style={{ width: `${score.overallScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {score.steps.map((stepScore) => (
              <Card key={stepScore.stepNumber}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Step {stepScore.stepNumber}
                      {stepScore.stepName && `: ${stepScore.stepName}`}
                    </CardTitle>
                    <Badge variant="outline" className={scoreColor(stepScore.score)}>
                      {Math.round(stepScore.score)}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{stepScore.feedback}</p>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>Form: <strong>{Math.round(stepScore.formScore)}</strong></span>
                    <span>Timing: <strong>{Math.round(stepScore.timingScore)}</strong></span>
                  </div>
                  {stepScore.problemJoints.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stepScore.problemJoints.map((joint) => (
                        <Badge key={joint} variant="outline" className="text-xs font-mono">
                          {joint.replaceAll("_", " ").toLowerCase()}
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
                <h3 className="font-heading text-lg font-semibold">How Practice Mode Works</h3>
                <ol className="mx-auto mt-4 max-w-sm space-y-3 text-left text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                    Choose to record live or upload an existing video
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                    AI tracks your body with 33 pose landmarks
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                    Perform the dance moves from the lesson
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">4</span>
                    AI scores your form per step with specific feedback
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
