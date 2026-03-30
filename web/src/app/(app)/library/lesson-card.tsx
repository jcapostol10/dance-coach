"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DANCE_STYLE_CATEGORIES } from "@/lib/dance-styles";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

interface LessonCardProps {
  lesson: {
    id: string;
    title: string;
    style: string | null;
    difficulty: string | null;
    thumbnailUrl: string | null;
    duration: number;
    bpm: number | null;
    isCurated: boolean;
    analyzedAt: Date | null;
  };
}

export function LessonCard({ lesson }: LessonCardProps) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [style, setStyle] = useState(lesson.style);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingStyle, setEditingStyle] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  async function patchLesson(updates: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === lesson.title) {
      setTitle(lesson.title);
      setEditingTitle(false);
      return;
    }
    const ok = await patchLesson({ title: trimmed });
    if (!ok) setTitle(lesson.title);
    setEditingTitle(false);
  }

  async function saveStyle(newStyle: string) {
    if (newStyle === style) {
      setEditingStyle(false);
      return;
    }
    setStyle(newStyle);
    setEditingStyle(false);
    const ok = await patchLesson({ style: newStyle });
    if (!ok) setStyle(lesson.style);
    else router.refresh();
  }

  return (
    <Card className="group cursor-pointer overflow-hidden card-shadow transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:elevated-shadow">
      <Link href={`/learn/${lesson.id}`}>
        <div className="relative aspect-video overflow-hidden bg-muted">
          {lesson.thumbnailUrl ? (
            <img
              src={lesson.thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                className="h-10 w-10 text-muted-foreground/40"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            {lesson.difficulty && (
              <Badge
                variant="outline"
                className={DIFFICULTY_COLORS[lesson.difficulty] || ""}
              >
                {lesson.difficulty}
              </Badge>
            )}
          </div>
          {!lesson.analyzedAt && (
            <div className="absolute right-2 top-2">
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs"
              >
                Not analyzed
              </Badge>
            </div>
          )}
        </div>
      </Link>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitle(lesson.title);
                  setEditingTitle(false);
                }
              }}
              onBlur={saveTitle}
              disabled={saving}
              className="flex-1 text-base font-semibold bg-transparent border-b-2 border-primary outline-none"
            />
          ) : (
            <Link href={`/learn/${lesson.id}`} className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{title}</CardTitle>
            </Link>
          )}
          {!editingTitle && (
            <button
              onClick={(e) => {
                e.preventDefault();
                setEditingTitle(true);
              }}
              className="shrink-0 rounded p-1 text-muted-foreground/50 hover:text-foreground"
              title="Edit title"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          )}
        </div>
        {/* Style badge — clickable to edit */}
        <div className="mt-1.5">
          {editingStyle ? (
            <select
              autoFocus
              value={style || ""}
              onChange={(e) => saveStyle(e.target.value)}
              onBlur={() => setEditingStyle(false)}
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
              onClick={(e) => {
                e.preventDefault();
                setEditingStyle(true);
              }}
              title="Click to change style"
              className="group/style"
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
              onClick={(e) => {
                e.preventDefault();
                setEditingStyle(true);
              }}
              className="text-xs text-muted-foreground/50 hover:text-foreground"
            >
              + Add style
            </button>
          )}
        </div>
      </CardHeader>
      <CardFooter className="text-xs text-muted-foreground">
        {lesson.duration > 0 && (
          <>
            <span>{formatDuration(lesson.duration)}</span>
            <span className="mx-2">·</span>
          </>
        )}
        {lesson.bpm && (
          <>
            <span className="font-mono">{Math.round(lesson.bpm)} BPM</span>
            <span className="mx-2">·</span>
          </>
        )}
        {lesson.isCurated && <span className="text-primary">Curated</span>}
      </CardFooter>
    </Card>
  );
}
