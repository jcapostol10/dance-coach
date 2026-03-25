"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function UploadPage() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("Hip-Hop");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  if (status === "loading") return null;
  if (!session || (session.user as { role?: string }).role !== "admin") {
    redirect("/login");
  }

  const STYLES = ["Hip-Hop", "Salsa", "Contemporary", "K-Pop", "Breaking", "House", "Jazz", "Ballet"];
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

  async function handleUpload() {
    if (!file || !title) return;

    try {
      setState("uploading");
      setProgress("Getting upload URL...");
      setError("");

      // Step 1: Get presigned upload URL
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!uploadRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, publicUrl, lessonId } = await uploadRes.json();

      // Step 2: Upload video directly to R2
      setProgress(`Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB...`);
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!putRes.ok) throw new Error("Failed to upload video to storage");

      // Step 3: Create lesson record
      setProgress("Creating lesson record...");
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

      // Step 4: Trigger AI analysis
      setState("analyzing");
      setProgress("AI is analyzing your video — detecting beats, extracting poses, describing moves...");

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errData.error || "Analysis failed");
      }

      const analysisResult = await analyzeRes.json();
      setResult(analysisResult.lesson);
      setState("done");
      setProgress("");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setProgress("");
    }
  }

  function reset() {
    setFile(null);
    setTitle("");
    setStyle("Hip-Hop");
    setDifficulty("Beginner");
    setState("idle");
    setProgress("");
    setResult(null);
    setError("");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Upload Dance Video</h1>
        <p className="text-sm text-muted-foreground">
          Upload a dance video for AI analysis — beat detection, pose extraction, and step-by-step breakdown.
        </p>
      </div>

      {state === "done" && result ? (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-green-400">Analysis Complete</span>
              <Badge variant="outline">{result.bpm.toFixed(0)} BPM</Badge>
              <Badge variant="outline">{result.steps.length} steps</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold">{result.bpm.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">BPM</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold">{result.steps.length}</p>
                <p className="text-xs text-muted-foreground">Steps</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold">{result.duration.toFixed(0)}s</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Detected Steps</h3>
              {result.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.name}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {step.start_time.toFixed(1)}s — {step.end_time.toFixed(1)}s
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={reset} className="w-full">Upload Another</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
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
                  <button
                    onClick={() => setFile(null)}
                    className="mt-2 text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a dance video here
                  </p>
                  <p className="text-xs text-muted-foreground">or</p>
                  <label className="mt-2 cursor-pointer rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20">
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
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                >
                  {STYLES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            {progress && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">{progress}</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || !title || state === "uploading" || state === "analyzing"}
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
