"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReanalyzeButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirming" | "running">("idle");
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  async function handleReanalyze() {
    setState("running");
    setPct(5);
    setLabel("Starting re-analysis...");
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, stream: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Re-analysis failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let aiTimer: ReturnType<typeof setInterval> | null = null;
      let currentAiPct = 35;

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
                if (data.phase === "ai_analyzing" && !aiTimer) {
                  currentAiPct = 35;
                  aiTimer = setInterval(() => {
                    if (currentAiPct < 78) {
                      currentAiPct += 0.5;
                      setPct(Math.round(currentAiPct));
                    }
                  }, 700);
                  setLabel(data.message);
                } else if (data.phase !== "ai_analyzing") {
                  if (aiTimer) { clearInterval(aiTimer); aiTimer = null; }
                  setPct(data.pct);
                  setLabel(data.message);
                }
              } else if (currentEvent === "done") {
                if (aiTimer) clearInterval(aiTimer);
                setPct(100);
                setLabel("Re-analysis complete! Refreshing...");
                setTimeout(() => {
                  router.refresh();
                  setState("idle");
                  setPct(0);
                  setLabel("");
                }, 1000);
                return;
              } else if (currentEvent === "error") {
                if (aiTimer) clearInterval(aiTimer);
                throw new Error(data.error);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "skip") {
                if (aiTimer) clearInterval(aiTimer);
                throw e;
              }
            }
            currentEvent = "";
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-analysis failed");
      setState("idle");
      setPct(0);
      setLabel("");
    }
  }

  if (state === "running") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Re-analyze? This replaces existing steps.
        </span>
        <Button size="sm" variant="outline" onClick={handleReanalyze}>
          Yes, re-analyze
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setState("idle"); setError(""); }}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setState("confirming")}
      >
        Re-analyze
      </Button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
