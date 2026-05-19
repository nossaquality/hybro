import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Footprints, Dumbbell, Wind, Moon, Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivePlan, getTodayIndex, getTodayProgress, saveProgress, type Esforco, type ProgressoEntry } from "@/lib/data";
import type { PlanoTreino, TipoTarefa } from "@/lib/plan-types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: Today,
});

const ICONS: Record<TipoTarefa, React.ComponentType<{ className?: string }>> = {
  corrida: Footprints,
  musculacao: Dumbbell,
  mobilidade: Wind,
  descanso: Moon,
};

const TONES: Record<TipoTarefa, { chip: string; iconBg: string; label: string }> = {
  corrida: { chip: "bg-running-soft text-running", iconBg: "bg-running text-running-foreground", label: "Corrida" },
  musculacao: { chip: "bg-strength-soft text-strength", iconBg: "bg-strength text-strength-foreground", label: "Musculação" },
  mobilidade: { chip: "bg-energy-soft text-energy", iconBg: "bg-energy text-energy-foreground", label: "Mobilidade" },
  descanso: { chip: "bg-muted text-muted-foreground", iconBg: "bg-muted text-foreground", label: "Descanso" },
};

const ESFORCOS: Esforco[] = ["Facil", "Medio", "Dificil"];
const ESFORCO_LABEL: Record<Esforco, string> = { Facil: "Fácil", Medio: "Médio", Dificil: "Difícil" };

function Today() {
  const [plano, setPlano] = useState<PlanoTreino | null>(null);
  const [log, setLog] = useState<Record<string, ProgressoEntry>>({});
  const [loading, setLoading] = useState(true);
  const [effortFor, setEffortFor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([getActivePlan(), getTodayProgress()]);
      setPlano(p);
      setLog(l);
      setLoading(false);
    })();
  }, []);

  const today = useMemo(() => {
    if (!plano || !plano.semana?.length) return null;
    const idx = Math.min(getTodayIndex(), plano.semana.length - 1);
    return plano.semana[idx];
  }, [plano]);

  const totalMin = useMemo(
    () => today?.tarefas.reduce((s, t) => s + (t.duracao_min ?? 0), 0) ?? 0,
    [today],
  );
  const completed = today?.tarefas.filter((t) => log[t.id]?.completed).length ?? 0;

  async function toggleDone(taskId: string) {
    const cur = log[taskId];
    if (cur?.completed) {
      // Mark incomplete
      await saveProgress(taskId, false);
      setLog((p) => ({ ...p, [taskId]: { ...cur, completed: false } }));
    } else {
      await saveProgress(taskId, true);
      setLog((p) => ({
        ...p,
        [taskId]: { task_id: taskId, data: new Date().toISOString().slice(0, 10), completed: true },
      }));
      setEffortFor(taskId);
    }
  }

  async function pickEsforco(esforco: Esforco) {
    if (!effortFor) return;
    await saveProgress(effortFor, true, esforco);
    setLog((p) => ({ ...p, [effortFor]: { ...(p[effortFor] as ProgressoEntry), esforco } }));
    toast.success("Esforço registrado!");
    setEffortFor(null);
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Carregando seu plano…</div>;
  }

  if (!today) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Card className="rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhum plano ativo</h2>
          <p className="mt-2 text-muted-foreground">Volte ao onboarding para gerar seu plano com a IA.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{today.data}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Checklist de hoje</h1>
          <p className="mt-1 text-muted-foreground">
            {completed} de {today.tarefas.length} concluídas · ~{totalMin} min no total
          </p>
        </div>
        <Card className="rounded-2xl border-energy/20 bg-energy-soft/40 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-energy text-energy-foreground">
              <Flame className="h-5 w-5" />
            </div>
            <div className="text-sm">
              <div className="font-semibold">Constância vence</div>
              <div className="text-muted-foreground">Pequenas vitórias somam grandes resultados.</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {today.tarefas.map((task) => {
          const Icon = ICONS[task.tipo] ?? Moon;
          const tone = TONES[task.tipo] ?? TONES.descanso;
          const status = log[task.id];
          const done = !!status?.completed;
          return (
            <Card
              key={task.id}
              className={cn(
                "rounded-2xl border-border/60 p-5 shadow-sm transition-all",
                done && "opacity-75",
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
                    {task.duracao_min && (
                      <span className="text-xs text-muted-foreground">~{task.duracao_min} min</span>
                    )}
                    {status?.esforco && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Esforço: {status.esforco}
                      </span>
                    )}
                  </div>
                  <h3 className={cn("mt-1 text-lg font-semibold", done && "line-through")}>
                    {task.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground">{task.detalhe}</p>
                </div>
                <Button
                  variant={done ? "outline" : "default"}
                  onClick={() => toggleDone(task.id)}
                  className={cn("rounded-xl", !done && "bg-primary hover:bg-primary/90")}
                >
                  {done ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" /> Concluída
                    </>
                  ) : (
                    "Marcar como feita"
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!effortFor} onOpenChange={(o) => !o && setEffortFor(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Como foi o treino?</DialogTitle>
            <DialogDescription>
              Registre o esforço percebido para a IA ajustar seu plano.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {ESFORCOS.map((e) => (
              <button
                key={e}
                onClick={() => pickEsforco(e)}
                className="rounded-xl border border-border p-4 text-sm font-medium transition-all hover:border-primary hover:bg-primary/5"
              >
                {e}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
