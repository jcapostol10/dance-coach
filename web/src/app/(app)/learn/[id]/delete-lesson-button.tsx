"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete lesson");
        setDeleting(false);
        setConfirming(false);
        return;
      }
      router.push("/library");
      router.refresh();
    } catch {
      alert("Failed to delete lesson");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Delete this lesson?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Yes, delete"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => setConfirming(true)}
    >
      Delete
    </Button>
  );
}
