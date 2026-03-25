import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Placeholder data until DB is connected
const PLACEHOLDER_LESSONS = [
  {
    id: "1",
    title: "Basic Hip-Hop Groove",
    style: "Hip-Hop",
    difficulty: "Beginner",
    duration: 45,
    bpm: 95,
    thumbnailUrl: "https://placehold.co/400x225/1a1a2e/e0e0e0?text=Hip-Hop+Groove",
    isCurated: true,
  },
  {
    id: "2",
    title: "Salsa Basics — Cross Body Lead",
    style: "Salsa",
    difficulty: "Beginner",
    duration: 60,
    bpm: 180,
    thumbnailUrl: "https://placehold.co/400x225/1a1a2e/e0e0e0?text=Salsa+Basics",
    isCurated: true,
  },
  {
    id: "3",
    title: "Contemporary Flow Sequence",
    style: "Contemporary",
    difficulty: "Intermediate",
    duration: 90,
    bpm: 72,
    thumbnailUrl: "https://placehold.co/400x225/1a1a2e/e0e0e0?text=Contemporary+Flow",
    isCurated: true,
  },
  {
    id: "4",
    title: "K-Pop Choreography — Intro",
    style: "K-Pop",
    difficulty: "Intermediate",
    duration: 120,
    bpm: 128,
    thumbnailUrl: "https://placehold.co/400x225/1a1a2e/e0e0e0?text=K-Pop+Intro",
    isCurated: true,
  },
  {
    id: "5",
    title: "Breaking — Toprock Basics",
    style: "Breaking",
    difficulty: "Beginner",
    duration: 55,
    bpm: 110,
    thumbnailUrl: "https://placehold.co/400x225/1a1a2e/e0e0e0?text=Toprock+Basics",
    isCurated: true,
  },
  {
    id: "6",
    title: "House Dance Foundations",
    style: "House",
    difficulty: "Beginner",
    duration: 70,
    bpm: 124,
    thumbnailUrl: "https://placehold.co/400x225/1a1a2e/e0e0e0?text=House+Foundations",
    isCurated: true,
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Lesson Library
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a dance to learn. AI will break it down step by step and teach
          you at your own pace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_LESSONS.map((lesson) => (
          <Link key={lesson.id} href={`/learn/${lesson.id}`}>
            <Card className="group cursor-pointer overflow-hidden transition-colors hover:border-foreground/20">
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={lesson.thumbnailUrl}
                  alt={lesson.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={DIFFICULTY_COLORS[lesson.difficulty] || ""}
                  >
                    {lesson.difficulty}
                  </Badge>
                  <Badge variant="outline" className="border-border/40 text-foreground/70">
                    {lesson.style}
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{lesson.title}</CardTitle>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground">
                <span>{formatDuration(lesson.duration)}</span>
                <span className="mx-2">·</span>
                <span className="font-mono">{lesson.bpm} BPM</span>
                {lesson.isCurated && (
                  <>
                    <span className="mx-2">·</span>
                    <span className="text-primary">Curated</span>
                  </>
                )}
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
