import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Footprints, Sunrise, Activity, Sunset, NotebookPen } from "lucide-react";
import { getActivePlan } from "@/lib/data";
import type { PlanoTreino } from "@/lib/plan-types";

export const Route = createFileRoute("/app/running")({
  component: RunningPlan,
});

function RunningPlan() {
  const [plano, setPlano] = useState<PlanoTreino | null>(null);
  useEffect(() => {
    getActivePlan().then(setPlano);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-running text-running-foreground">
          <Footprints className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Planilha de Corrida</h1>
          <p className="text-muted-foreground">
            Semana completa com aquecimento, treino principal e desaquecimento.
          </p>
        </div>
      </div>

      {!plano ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <div className="space-y-5">
          {plano.corrida.map((session, i) => (
            <Card
              key={`${session.dia}-${i}`}
              className="overflow-hidden rounded-2xl border-running/20 shadow-sm"
            >
              <div className="border-b border-running/20 bg-running-soft/50 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-running">
                  {session.dia}
                </p>
                <h2 className="text-lg font-semibold">{session.titulo}</h2>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Block icon={<Sunrise className="h-4 w-4" />} label="Aquecimento" text={session.aquecimento} />
                <Block icon={<Activity className="h-4 w-4" />} label="Principal" text={session.principal} />
                <Block icon={<Sunset className="h-4 w-4" />} label="Desaquecimento" text={session.desaquecimento} />
                <Block icon={<NotebookPen className="h-4 w-4" />} label="Notas" text={session.notas} />
              </div>
            </Card>
          ))}
        </div>
      )}
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
