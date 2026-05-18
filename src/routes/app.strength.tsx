import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { STRENGTH_PLAN } from "@/lib/mock-plan";
import { Dumbbell } from "lucide-react";

export const Route = createFileRoute("/app/strength")({
  component: StrengthPlan,
});

function StrengthPlan() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-strength text-strength-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Home Strength Plan</h1>
          <p className="text-muted-foreground">
            Runner-focused circuits. Quality reps over heavy loads.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {STRENGTH_PLAN.map((session) => (
          <Card
            key={session.day}
            className="overflow-hidden rounded-2xl border-strength/20 shadow-sm"
          >
            <div className="border-b border-strength/20 bg-strength-soft/50 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-strength">
                {session.day}
              </p>
              <h2 className="text-lg font-semibold">{session.title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{session.focus}</p>
            </div>
            <div className="divide-y divide-border/60">
              <div className="grid grid-cols-12 gap-3 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-6">Exercise</div>
                <div className="col-span-2 text-center">Sets</div>
                <div className="col-span-4">Reps · Notes</div>
              </div>
              {session.exercises.map((ex) => (
                <div key={ex.name} className="grid grid-cols-12 gap-3 px-5 py-3 text-sm">
                  <div className="col-span-6 font-medium">{ex.name}</div>
                  <div className="col-span-2 text-center font-semibold text-strength">{ex.sets}</div>
                  <div className="col-span-4">
                    <div className="font-medium">{ex.reps}</div>
                    <div className="text-xs text-muted-foreground">{ex.notes}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
