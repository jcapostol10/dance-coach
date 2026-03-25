"use client";

import { useState } from "react";
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

export function StepViewer({ steps }: { steps: Step[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(100);

  const step = steps[currentStep];
  if (!step) return null;

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
            <Badge variant="outline" className="font-mono text-xs">
              Beats {step.startBeat}–{step.endBeat}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>

          {/* Skeleton overlay placeholder */}
          <div className="relative aspect-video rounded-lg bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Pose skeleton overlay will render here
              </p>
            </div>
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
