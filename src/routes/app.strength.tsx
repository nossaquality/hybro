import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";
import { getActivePlan } from "@/lib/data";
import type { PlanoTreino } from "@/lib/plan-types";

export const Route = createFileRoute("/app/strength")({
  component: StrengthPlan,
});

function StrengthPlan() {
  const [plano, setPlano] = useState<PlanoTreino | null>(null);
  useEffect(() => {
    getActivePlan().then(setPlano);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-strength text-strength-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Planilha de Musculação</h1>
          <p className="text-muted-foreground">
            Circuitos em casa, focados em corredores. Qualidade acima de carga.
          </p>
        </div>
      </div>

      {!plano ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <div className="space-y-5">
          {plano.musculacao.map((session, i) => (
            <Card
              key={`${session.dia}-${i}`}
              className="overflow-hidden rounded-2xl border-strength/20 shadow-sm"
            >
              <div className="border-b border-strength/20 bg-strength-soft/50 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-strength">
                  {session.dia}
                </p>
                <h2 className="text-lg font-semibold">{session.titulo}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{session.foco}</p>
              </div>
              <div className="divide-y divide-border/60">
                <div className="grid grid-cols-12 gap-3 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <div className="col-span-6">Exercício</div>
                  <div className="col-span-2 text-center">Séries</div>
                  <div className="col-span-4">Repetições · Notas</div>
                </div>
                {session.exercicios.map((ex, j) => (
                  <div key={`${ex.nome}-${j}`} className="grid grid-cols-12 gap-3 px-5 py-3 text-sm">
                    <div className="col-span-6 font-medium">{ex.nome}</div>
                    <div className="col-span-2 text-center font-semibold text-strength">{ex.series}</div>
                    <div className="col-span-4">
                      <div className="font-medium">{ex.repeticoes}</div>
                      <div className="text-xs text-muted-foreground">{ex.notas}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
