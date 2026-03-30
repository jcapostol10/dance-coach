"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DANCE_STYLE_CATEGORIES } from "@/lib/dance-styles";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function EditableStyle({
  lessonId,
  initialStyle,
  difficulty,
  bpm,
}: {
  lessonId: string;
  initialStyle: string | null;
  difficulty: string | null;
  bpm: number | null;
}) {
  const [style, setStyle] = useState(initialStyle);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveStyle(newStyle: string) {
    if (newStyle === style) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: newStyle }),
      });
      if (!res.ok) throw new Error();
      setStyle(newStyle);
    } catch {
      setStyle(initialStyle);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {difficulty && (
        <Badge
          variant="outline"
          className={DIFFICULTY_COLORS[difficulty] || ""}
        >
          {difficulty}
        </Badge>
      )}
      {editing ? (
        <select
          autoFocus
          value={style || ""}
          onChange={(e) => saveStyle(e.target.value)}
          onBlur={() => setEditing(false)}
          disabled={saving}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none ring-ring focus:ring-2"
        >
          {DANCE_STYLE_CATEGORIES.map((cat) => (
            <optgroup key={cat.category} label={cat.category}>
              {cat.styles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : style ? (
        <button
          onClick={() => setEditing(true)}
          className="group"
          title="Click to change style"
        >
          <Badge variant="outline" className="border-border/40 text-foreground/70 cursor-pointer hover:border-primary/50 transition-colors">
            {style}
            <svg
              className="ml-1 inline h-2.5 w-2.5 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Badge>
        </button>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          + Add style
        </button>
      )}
      {bpm && (
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {Math.round(bpm)} BPM
        </span>
      )}
    </div>
  );
}
