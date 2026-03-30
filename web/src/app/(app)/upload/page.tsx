"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DANCE_STYLE_CATEGORIES } from "@/lib/dance-styles";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UploadState = "idle" | "uploading" | "analyzing" | "done" | "error";

interface AnalysisResult {
  bpm: number;
  beats: number[];
  steps: Array<{
    id: number;
    name: string;
    description: string;
    start_time: number;
    end_time: number;
  }>;
  duration: number;
}

const PHASES = [
  { key: "upload_url", label: "Preparing upload", pctEnd: 5 },
  { key: "uploading", label: "Uploading video", pctEnd: 30 },
  { key: "create_lesson", label: "Creating lesson", pctEnd: 35 },
  { key: "fetch_lesson", label: "Loading lesson", pctEnd: 38 },
  { key: "download_video", label: "Downloading video", pctEnd: 45 },
  { key: "encode_video", label: "Preparing for AI", pctEnd: 50 },
  { key: "ai_analyzing", label: "AI analyzing moves", pctEnd: 85 },
  { key: "parse_results", label: "Parsing results", pctEnd: 90 },
  { key: "save_results", label: "Saving analysis", pctEnd: 95 },
  { key: "complete", label: "Complete", pctEnd: 100 },
] as const;

export default function UploadPage() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("Hip-Hop");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [state, setState] = useState<UploadState>("idle");
  const [pct, setPct] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  if (status === "loading") return null;
  if (!session || (session.user as { role?: string }).role !== "admin") {
    redirect("/login");
  }

  const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith("video/")) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  }

  /** Upload file to R2 with real progress tracking via XHR */
  function uploadToR2(url: string, fileToUpload: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", fileToUpload.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // Upload is 5-30% of total progress
          const uploadPct = 5 + (e.loaded / e.total) * 25;
          setPct(Math.round(uploadPct));
          const mbLoaded = (e.loaded / 1024 / 1024).toFixed(1);
          const mbTotal = (e.total / 1024 / 1024).toFixed(1);
          setPhaseLabel(`Uploading video — ${mbLoaded} / ${mbTotal} MB`);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Upload failed — network error"));
      xhr.send(fileToUpload);
    });
  }

  /** Listen to SSE progress from the analyze endpoint */
  async function streamAnalysis(lessonId: string): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      abortRef.current = controller;

      // Start a slow animation timer for the AI phase (35→85%)
      // since Gemini gives no intermediate progress
      let aiTimer: ReturnType<typeof setInterval> | null = null;
      let currentAiPct = 35;

      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, stream: true }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Analysis failed (${res.status})`);
          }

          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response stream");

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            let currentEvent = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) {
                currentEvent = line.slice(7).trim();
              } else if (line.startsWith("data: ") && currentEvent) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (currentEvent === "progress") {
                    const serverPct = data.pct as number;

                    // Start slow animation when AI analysis begins
                    if (data.phase === "ai_analyzing" && !aiTimer) {
                      currentAiPct = 35;
                      aiTimer = setInterval(() => {
                        // Creep slowly from 35→78% over ~60s
                        if (currentAiPct < 78) {
                          currentAiPct += 0.5;
                          setPct(Math.round(currentAiPct));
                        }
                      }, 700);
                      setPhaseLabel(data.message);
                    } else if (data.phase !== "ai_analyzing") {
                      // For non-AI phases, use server-reported %
                      if (aiTimer) {
                        clearInterval(aiTimer);
                        aiTimer = null;
                      }
                      setPct(serverPct);
                      setPhaseLabel(data.message);
                    }
                  } else if (currentEvent === "done") {
                    if (aiTimer) clearInterval(aiTimer);
                    setPct(100);
                    setPhaseLabel("Analysis complete!");
                    resolve(data.lesson);
                    return;
                  } else if (currentEvent === "error") {
                    if (aiTimer) clearInterval(aiTimer);
                    reject(new Error(data.error));
                    return;
                  }
                } catch {
                  // skip malformed JSON
                }
                currentEvent = "";
              }
            }
          }

          if (aiTimer) clearInterval(aiTimer);
          reject(new Error("Stream ended without result"));
        })
        .catch((err) => {
          if (aiTimer) clearInterval(aiTimer);
          reject(err);
        });
    });
  }

  async function handleUpload() {
    if (!file || !title) return;

    try {
      setState("uploading");
      setPct(2);
      setPhaseLabel("Getting upload URL...");
      setError("");

      // Step 1: Get presigned upload URL
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!uploadRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, publicUrl, lessonId } = await uploadRes.json();
      setPct(5);

      // Step 2: Upload video to R2 with progress
      await uploadToR2(uploadUrl, file);
      setPct(30);

      // Step 3: Create lesson record
      setPhaseLabel("Creating lesson record...");
      setPct(32);
      const lessonRes = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lessonId,
          title,
          style,
          difficulty,
          videoUrl: publicUrl,
          duration: 0,
        }),
      });

      if (!lessonRes.ok) throw new Error("Failed to create lesson");
      setPct(35);

      // Step 4: AI analysis with streamed progress
      setState("analyzing");
      setPhaseLabel("Starting AI analysis...");
      const analysis = await streamAnalysis(lessonId);

      setResult(analysis);
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPct(0);
      setPhaseLabel("");
    }
  }

  function reset() {
    if (abortRef.current) abortRef.current.abort();
    setFile(null);
    setTitle("");
    setStyle("Hip-Hop");
    setDifficulty("Beginner");
    setState("idle");
    setPct(0);
    setPhaseLabel("");
    setResult(null);
    setError("");
  }

  const activePhaseIdx = PHASES.findIndex((p) => pct <= p.pctEnd);
  const isWorking = state === "uploading" || state === "analyzing";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Upload Dance Video</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a dance video for AI analysis — beat detection, pose extraction, and step-by-step breakdown.
        </p>
      </div>

      {state === "done" && result ? (
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-emerald-400">Analysis Complete</span>
              <Badge variant="outline" className="font-mono">{result.bpm.toFixed(0)} BPM</Badge>
              <Badge variant="outline">{result.steps.length} steps</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/60 bg-surface-elevated p-4 text-center">
                <p className="font-heading text-2xl font-bold">{result.bpm.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">BPM</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-elevated p-4 text-center">
                <p className="font-heading text-2xl font-bold">{result.steps.length}</p>
                <p className="text-xs text-muted-foreground">Steps</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-elevated p-4 text-center">
                <p className="font-heading text-2xl font-bold">{result.duration.toFixed(0)}s</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-heading text-sm font-semibold">Detected Steps</h3>
              {result.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-elevated/50 p-3 transition-colors duration-150 hover:bg-surface-elevated">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary card-shadow">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">
                      {step.start_time.toFixed(1)}s — {step.end_time.toFixed(1)}s
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={reset} className="w-full card-shadow">Upload Another</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow">
          <CardContent className="space-y-5 pt-6">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border"
              }`}
            >
              {file ? (
                <>
                  <p className="text-sm font-medium text-green-400">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  {!isWorking && (
                    <button
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a dance video here
                  </p>
                  <p className="text-xs text-muted-foreground">or</p>
                  <label className="mt-2 cursor-pointer rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/20 focus-visible:bg-primary/20 active:bg-primary/25">
                    Browse files
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Basic Hip-Hop Groove"
                disabled={isWorking}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={isWorking}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
                >
                  {DANCE_STYLE_CATEGORIES.map((cat) => (
                    <optgroup key={cat.category} label={cat.category}>
                      {cat.styles.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={isWorking}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Progress bar */}
            {isWorking && (
              <div className="space-y-3">
                {/* Bar */}
                <div className="overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2.5 rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Percentage + label */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{phaseLabel}</p>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {pct}%
                  </span>
                </div>

                {/* Phase checklist */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {PHASES.map((phase, i) => {
                    const isDone = pct >= phase.pctEnd;
                    const isActive = i === activePhaseIdx;
                    return (
                      <div
                        key={phase.key}
                        className={`flex items-center gap-2 text-xs ${
                          isDone
                            ? "text-green-400"
                            : isActive
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                        }`}
                      >
                        {isDone ? (
                          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isActive ? (
                          <div className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border border-primary border-t-transparent" />
                        ) : (
                          <div className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-muted-foreground/30" />
                        )}
                        {phase.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || !title || isWorking}
              className="w-full"
            >
              {state === "uploading"
                ? "Uploading..."
                : state === "analyzing"
                  ? "Analyzing..."
                  : "Upload & Analyze"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
