"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
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

export function StepViewer({
  steps,
  videoUrl,
}: {
  steps: Step[];
  videoUrl: string | null;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopCheckRef = useRef<number>(0);

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

  // Loop within step boundaries using timeupdate
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
      // Ensure we're within step bounds before playing
      if (video.currentTime < step.startTime || video.currentTime >= step.endTime) {
        video.currentTime = step.startTime;
      }
      video.playbackRate = speed / 100;
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, step, speed]);

  // Pause when component unmounts
  useEffect(() => {
    return () => {
      if (loopCheckRef.current) cancelAnimationFrame(loopCheckRef.current);
    };
  }, []);

  // Parse description into instruction sections
  const parseInstructions = (description: string) => {
    const sections: { label: string; text: string }[] = [];
    const lines = description.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const match = line.match(/^\*\*(.+?)\*\*[:\s]*(.+)/);
      if (match) {
        sections.push({ label: match[1], text: match[2] });
      } else if (line.trim()) {
        // Fallback for non-labeled lines
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
                  muted
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
                {/* Speed indicator */}
                {isPlaying && speed !== 100 && (
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
