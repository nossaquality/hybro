import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footprints, Dumbbell, Wind, Moon, Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { WEEK_PLAN, TODAY_INDEX } from "@/lib/mock-plan";
import { loadTaskLog, saveTaskLog, type TaskStatus, type TaskType } from "@/lib/store";

export const Route = createFileRoute("/app/")({
  component: Today,
});

const ICONS: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  run: Footprints,
  strength: Dumbbell,
  mobility: Wind,
  rest: Moon,
};

const TONES: Record<TaskType, { chip: string; ring: string; iconBg: string; label: string }> = {
  run: { chip: "bg-running-soft text-running", ring: "ring-running/30", iconBg: "bg-running text-running-foreground", label: "Running" },
  strength: { chip: "bg-strength-soft text-strength", ring: "ring-strength/30", iconBg: "bg-strength text-strength-foreground", label: "Strength" },
  mobility: { chip: "bg-energy-soft text-energy", ring: "ring-energy/30", iconBg: "bg-energy text-energy-foreground", label: "Mobility" },
  rest: { chip: "bg-muted text-muted-foreground", ring: "ring-border", iconBg: "bg-muted text-foreground", label: "Recovery" },
};

function Today() {
  const today = WEEK_PLAN[TODAY_INDEX];
  const [log, setLog] = useState<Record<string, TaskStatus>>({});

  useEffect(() => {
    setLog(loadTaskLog());
  }, []);

  function update(id: string, next: TaskStatus) {
    const updated = { ...log, [id]: next };
    setLog(updated);
    saveTaskLog(updated);
  }

  const completed = today.tasks.filter((t) => log[t.id]?.done).length;
  const totalMin = useMemo(
    () => today.tasks.reduce((sum, t) => sum + (t.durationMin ?? 0), 0),
    [today],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{today.date}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Today's checklist</h1>
          <p className="mt-1 text-muted-foreground">
            {completed} of {today.tasks.length} completed · ~{totalMin} min total
          </p>
        </div>
        <Card className="rounded-2xl border-energy/20 bg-energy-soft/40 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-energy text-energy-foreground">
              <Flame className="h-5 w-5" />
            </div>
            <div className="text-sm">
              <div className="font-semibold">5-day streak</div>
              <div className="text-muted-foreground">Keep showing up. Small wins compound.</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {today.tasks.map((task) => {
          const Icon = ICONS[task.type];
          const tone = TONES[task.type];
          const status = log[task.id] ?? { done: false };
          return (
            <Card
              key={task.id}
              className={cn(
                "rounded-2xl border-border/60 p-5 shadow-sm transition-all",
                status.done && "opacity-75",
              )}
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className={cn("grid h-12 w-12 place-items-center rounded-xl", tone.iconBg)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", tone.chip)}>
                      {tone.label}
                    </span>
                    {task.durationMin && (
                      <span className="text-xs text-muted-foreground">~{task.durationMin} min</span>
                    )}
                  </div>
                  <h3 className={cn("mt-1 text-lg font-semibold", status.done && "line-through")}>
                    {task.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{task.detail}</p>

                  {status.done && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">How did it feel?</span>
                      {(["easy", "medium", "hard"] as const).map((e) => (
                        <button
                          key={e}
                          onClick={() => update(task.id, { ...status, effort: e })}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                            status.effort === e
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant={status.done ? "outline" : "default"}
                  onClick={() => update(task.id, { done: !status.done, effort: status.effort })}
                  className={cn(
                    "rounded-xl",
                    !status.done && "bg-primary hover:bg-primary/90",
                  )}
                >
                  {status.done ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" /> Done
                    </>
                  ) : (
                    "Mark complete"
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
