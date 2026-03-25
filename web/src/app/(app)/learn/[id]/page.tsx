import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StepViewer } from "./step-viewer";

// Placeholder until DB connected
const PLACEHOLDER_STEPS = [
  {
    id: 1,
    name: "Starting Position",
    description:
      "Stand with feet shoulder-width apart, knees slightly bent. Arms relaxed at your sides. Weight centered between both feet.",
    startBeat: 1,
    endBeat: 4,
    startTime: 0,
    endTime: 2.0,
  },
  {
    id: 2,
    name: "Rock Step",
    description:
      "Step your right foot back, shifting weight briefly. Then rock forward onto your left foot. Keep your upper body stable.",
    startBeat: 5,
    endBeat: 8,
    startTime: 2.0,
    endTime: 4.0,
  },
  {
    id: 3,
    name: "Side Step with Arms",
    description:
      "Step right foot to the side while bringing both arms up to shoulder height. Bring left foot to meet right. Arms swing naturally.",
    startBeat: 9,
    endBeat: 12,
    startTime: 4.0,
    endTime: 6.0,
  },
  {
    id: 4,
    name: "Body Roll",
    description:
      "Starting from the chest, roll your torso forward and down in a wave motion. Knees bend as the wave travels down. Finish by straightening up.",
    startBeat: 13,
    endBeat: 16,
    startTime: 6.0,
    endTime: 8.0,
  },
];

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/library"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Library
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            Basic Hip-Hop Groove
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            >
              Beginner
            </Badge>
            <Badge variant="outline" className="border-border/40 text-foreground/70">
              Hip-Hop
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              95 BPM
            </span>
          </div>
        </div>
        <Link href={`/practice/${id}`}>
          <Button>Practice This Dance</Button>
        </Link>
      </div>

      <Separator className="mb-6" />

      {/* Video player placeholder */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative aspect-video bg-muted">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                Video player — connect to upload a dance video
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Step-by-step viewer */}
      <StepViewer steps={PLACEHOLDER_STEPS} />
    </div>
  );
}
