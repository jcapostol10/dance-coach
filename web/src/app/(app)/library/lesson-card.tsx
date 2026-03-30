import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  return (
    <Card className="group cursor-pointer overflow-hidden card-shadow transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:elevated-shadow">
      <Link href={`/learn/${lesson.id}`}>
        <div className="relative aspect-video overflow-hidden bg-muted">
          {lesson.thumbnailUrl ? (
            <img
              src={lesson.thumbnailUrl}
              alt={lesson.title}
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
        <Link href={`/learn/${lesson.id}`} className="min-w-0">
          <CardTitle className="text-base truncate">{lesson.title}</CardTitle>
        </Link>
        {lesson.style && (
          <div className="mt-1.5">
            <Badge variant="outline" className="border-border/40 text-foreground/70">
              {lesson.style}
            </Badge>
          </div>
        )}
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
