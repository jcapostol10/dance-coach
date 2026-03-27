"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomableVideo } from "./zoomable-video";

const SPEED_OPTIONS = [
  { value: 25, label: "0.25x" },
  { value: 50, label: "0.5x" },
  { value: 75, label: "0.75x" },
  { value: 100, label: "1x" },
];

export function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(100);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed / 100;
  }, [speed]);

  return (
    <div>
      <ZoomableVideo>
        <div className="relative aspect-video bg-muted">
          <video
            ref={videoRef}
            src={src}
            controls
            className="h-full w-full object-contain"
            preload="metadata"
          />
        </div>
      </ZoomableVideo>
      <div className="flex items-center justify-center gap-1.5 border-t border-border bg-card px-4 py-2.5">
        <span className="mr-1 text-xs font-medium text-muted-foreground">
          Speed
        </span>
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setSpeed(opt.value);
              const video = videoRef.current;
              if (video) video.playbackRate = opt.value / 100;
            }}
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
    </div>
  );
}
