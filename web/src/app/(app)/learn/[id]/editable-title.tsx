"use client";

import { useState, useRef, useEffect } from "react";

export function EditableTitle({
  lessonId,
  initialTitle,
}: {
  lessonId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle);
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to update title");
      setTitle(trimmed);
      setEditing(false);
    } catch {
      setTitle(initialTitle);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setTitle(initialTitle);
              setEditing(false);
            }
          }}
          onBlur={save}
          disabled={saving}
          className="font-heading text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary outline-none w-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 text-left rounded-md px-1 -mx-1 transition-colors duration-150 hover:bg-accent/50 focus-visible:bg-accent/50"
      title="Click to edit title"
    >
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        {title}
      </h1>
      <svg
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors duration-150 group-hover:text-foreground/70"
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
  );
}
