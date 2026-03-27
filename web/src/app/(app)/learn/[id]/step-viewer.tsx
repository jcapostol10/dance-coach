"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Step {
  id: number;
  name: string;
  description: string;
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
}

const SPEED_OPTIONS = [
  { value: 25, label: "0.25x" },
  { value: 50, label: "0.5x" },
  { value: 75, label: "0.75x" },
  { value: 100, label: "1x" },
];

export function StepViewer({
  steps,
  videoUrl,
}: {
  steps: Step[];
  videoUrl: string | null;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const step = steps[currentStep];

  // Seek to step start when step changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !step) return;

    video.pause();
    setIsPlaying(false);
    video.currentTime = step.startTime;
  }, [step]);

  // Apply playback rate when speed changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed / 100;
  }, [speed]);

  // Loop within step boundaries
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !step) return;

    if (video.currentTime >= step.endTime) {
      video.currentTime = step.startTime;
    }
  }, [step]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !step) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime < step.startTime || video.currentTime >= step.endTime) {
        video.currentTime = step.startTime;
      }
      video.playbackRate = speed / 100;
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, step, speed]);

  // Parse description into instruction sections
  const parseInstructions = (description: string) => {
    const sections: { label: string; text: string }[] = [];
    const lines = description.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const match = line.match(/^\*\*(.+?)\*\*[:\s]*(.+)/);
      if (match) {
        sections.push({ label: match[1], text: match[2] });
      } else if (line.trim()) {
        sections.push({ label: "", text: line.trim() });
      }
    }

    return sections.length > 0 ? sections : [{ label: "", text: description }];
  };

  if (!step) return null;

  const instructions = parseInstructions(step.description);
  const stepDuration = step.endTime - step.startTime;

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold">
          Step-by-Step Breakdown
        </h2>
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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {stepDuration.toFixed(1)}s
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                Beats {step.startBeat}–{step.endBeat}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Clipped video player */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  preload="auto"
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="h-full w-full object-contain"
                />
                {/* Play/Pause overlay */}
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20"
                >
                  {!isPlaying && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
                      <svg className="ml-1 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </button>
                {/* Speed indicator on video */}
                {isPlaying && (
                  <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5">
                    <span className="font-mono text-xs text-white">
                      {speed / 100}x
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No video available
                </p>
              </div>
            )}
          </div>

          {/* Speed control under video */}
          {videoUrl && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                Speed
              </span>
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSpeed(opt.value)}
                  className={`rounded-md px-3 py-1.5 font-mono text-sm font-medium transition-colors ${
                    speed === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <Separator className="my-4" />

          {/* Detailed movement instructions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">How to Execute</h3>
            {instructions.map((inst, i) =>
              inst.label ? (
                <div key={i} className="flex gap-3">
                  <Badge
                    variant="outline"
                    className="mt-0.5 h-fit flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider"
                  >
                    {inst.label}
                  </Badge>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {inst.text}
                  </p>
                </div>
              ) : (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {inst.text}
                </p>
              ),
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
