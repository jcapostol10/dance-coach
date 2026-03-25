import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PracticeMode } from "./practice-mode";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/learn/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Lesson
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            Practice Mode
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record yourself and get AI feedback on your moves
          </p>
        </div>
      </div>

      <PracticeMode lessonId={id} />
    </div>
  );
}
