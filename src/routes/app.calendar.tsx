import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { WEEK_PLAN, TODAY_INDEX } from "@/lib/mock-plan";
import { Footprints, Dumbbell, Wind, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskType } from "@/lib/store";

export const Route = createFileRoute("/app/calendar")({
  component: WeeklyCalendar,
});

const ICONS: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  run: Footprints,
  strength: Dumbbell,
  mobility: Wind,
  rest: Moon,
};

const TONE: Record<TaskType, string> = {
  run: "bg-running-soft text-running border-running/20",
  strength: "bg-strength-soft text-strength border-strength/20",
  mobility: "bg-energy-soft text-energy border-energy/20",
  rest: "bg-muted text-muted-foreground border-border",
};

function WeeklyCalendar() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">This week</h1>
        <p className="mt-1 text-muted-foreground">
          Your integrated running, strength, mobility and recovery schedule.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <Legend color="bg-running" label="Running" />
        <Legend color="bg-strength" label="Strength" />
        <Legend color="bg-energy" label="Mobility" />
        <Legend color="bg-muted-foreground/40" label="Recovery" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {WEEK_PLAN.map((day, i) => {
          const isToday = i === TODAY_INDEX;
          return (
            <Card
              key={day.day}
              className={cn(
                "flex min-h-56 flex-col gap-2 rounded-2xl border-border/60 p-4 shadow-sm",
                isToday && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {day.day}
                  </p>
                  <p className="text-sm font-semibold">{day.date.slice(0, 3)}</p>
                </div>
                {isToday && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                    Today
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-1 flex-col gap-2">
                {day.tasks.map((t) => {
                  const Icon = ICONS[t.type];
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "rounded-xl border p-2.5",
                        TONE[t.type],
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                          {t.type}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium leading-tight text-foreground">
                        {t.title}
                      </div>
                      {t.durationMin && (
                        <div className="text-[11px] text-muted-foreground">
                          {t.durationMin} min
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}
