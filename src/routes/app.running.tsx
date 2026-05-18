import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { RUNNING_PLAN } from "@/lib/mock-plan";
import { Footprints, Sunrise, Activity, Sunset, NotebookPen } from "lucide-react";

export const Route = createFileRoute("/app/running")({
  component: RunningPlan,
});

function RunningPlan() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-running text-running-foreground">
          <Footprints className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Running Plan</h1>
          <p className="text-muted-foreground">
            Full week of runs with warm-ups, main sets and cool-downs.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {RUNNING_PLAN.map((session) => (
          <Card
            key={session.day}
            className="overflow-hidden rounded-2xl border-running/20 shadow-sm"
          >
            <div className="border-b border-running/20 bg-running-soft/50 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-running">
                {session.day}
              </p>
              <h2 className="text-lg font-semibold">{session.title}</h2>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Block icon={<Sunrise className="h-4 w-4" />} label="Warm-up" text={session.warmup} />
              <Block icon={<Activity className="h-4 w-4" />} label="Main set" text={session.main} />
              <Block icon={<Sunset className="h-4 w-4" />} label="Cool-down" text={session.cooldown} />
              <Block icon={<NotebookPen className="h-4 w-4" />} label="Notes" text={session.notes} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Block({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-running">
        {icon} {label}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  );
}
