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
import { Footprints, Dumbbell, Wind, Moon, Check, Flame, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActivePlan,
  getTodayIndex,
  getTodayProgress,
  saveProgress,
  type Esforco,
  type ProgressoEntry,
} from "@/lib/data";
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

const TONES: Record<
  TipoTarefa,
  { chip: string; iconBg: string; label: string; cardBorder: string; glow: string }
> = {
  corrida: {
    chip: "bg-running-soft text-running",
    iconBg: "bg-running text-running-foreground",
    label: "Corrida",
    cardBorder: "border-running/20",
    glow: "shadow-running/10",
  },
  musculacao: {
    chip: "bg-strength-soft text-strength",
    iconBg: "bg-strength text-strength-foreground",
    label: "Musculação",
    cardBorder: "border-strength/20",
    glow: "shadow-strength/10",
  },
  mobilidade: {
    chip: "bg-energy-soft text-energy",
    iconBg: "bg-energy text-energy-foreground",
    label: "Mobilidade",
    cardBorder: "border-energy/20",
    glow: "shadow-energy/10",
  },
  descanso: {
    chip: "bg-muted text-muted-foreground",
    iconBg: "bg-muted text-foreground",
    label: "Descanso",
    cardBorder: "border-border",
    glow: "",
  },
};

const ESFORCOS: { id: Esforco; emoji: string; desc: string }[] = [
  { id: "Facil", emoji: "😊", desc: "Tranquilo, poderia ir mais" },
  { id: "Medio", emoji: "💪", desc: "Boa intensidade, no limite certo" },
  { id: "Dificil", emoji: "🔥", desc: "Dei o máximo hoje" },
];

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
  const total = today?.tarefas.length ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function toggleDone(taskId: string) {
    const cur = log[taskId];
    if (cur?.completed) {
      await saveProgress(taskId, false);
      setLog((p) => ({ ...p, [taskId]: { ...cur, completed: false } }));
    } else {
      await saveProgress(taskId, true);
      setLog((p) => ({
        ...p,
        [taskId]: {
          task_id: taskId,
          data: new Date().toISOString().slice(0, 10),
          completed: true,
        },
      }));
      setEffortFor(taskId);
    }
  }

  async function pickEsforco(esforco: Esforco) {
    if (!effortFor) return;
    await saveProgress(effortFor, true, esforco);
    setLog((p) => ({
      ...p,
      [effortFor]: { ...(p[effortFor] as ProgressoEntry), esforco },
    }));
    toast.success("Esforço registrado!");
    setEffortFor(null);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!today) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Card className="rounded-3xl p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhum plano ativo</h2>
          <p className="mt-2 text-muted-foreground">
            Volte ao onboarding para gerar seu plano com a IA.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary">{today.data}</p>
        <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">Checklist de hoje</h1>
      </div>

      {/* Progress ring + motivation card */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Progress card */}
        <Card className="flex items-center gap-5 rounded-3xl border-border/50 p-5 shadow-sm">
          {/* SVG ring */}
          <div className="relative shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted"
              />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - pct / 100)}`}
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
                transform="rotate(-90 36 36)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{pct}%</span>
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {completed} de {total} feitas
            </div>
            <div className="text-sm text-muted-foreground">~{totalMin} min no total</div>
          </div>
        </Card>

        {/* Motivation card */}
        <Card className="flex items-center gap-4 rounded-3xl border-energy/20 bg-gradient-to-br from-energy-soft/60 to-energy-soft/20 p-5 shadow-sm">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-energy text-energy-foreground shadow-sm">
            {completed === total && total > 0 ? (
              <Trophy className="h-5 w-5" />
            ) : (
              <Flame className="h-5 w-5" />
            )}
          </div>
          <div className="text-sm">
            {completed === total && total > 0 ? (
              <>
                <div className="font-semibold text-foreground">Treino concluído! 🎉</div>
                <div className="text-muted-foreground">Incrível. Descanse e hidrate-se bem.</div>
              </>
            ) : (
              <>
                <div className="font-semibold text-foreground">Constância vence tudo</div>
                <div className="text-muted-foreground">Pequenas vitórias formam grandes resultados.</div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Task cards — Apple Fitness style */}
      <div className="space-y-3">
        {today.tarefas.map((task) => {
          const Icon = ICONS[task.tipo] ?? Moon;
          const tone = TONES[task.tipo] ?? TONES.descanso;
          const status = log[task.id];
          const done = !!status?.completed;

          return (
            <Card
              key={task.id}
              className={cn(
                "rounded-3xl border p-5 shadow-sm transition-all duration-200",
                tone.cardBorder,
                done && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center rounded-2xl shadow-sm",
                    tone.iconBg,
                  )}
                >
                  <Icon className="h-7 w-7" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        tone.chip,
                      )}
                    >
                      {tone.label}
                    </span>
                    {task.duracao_min && (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3" /> {task.duracao_min} min
                      </span>
                    )}
                    {status?.esforco && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {status.esforco}
                      </span>
                    )}
                  </div>
                  <h3
                    className={cn(
                      "mt-1 text-base font-semibold leading-tight",
                      done && "line-through text-muted-foreground",
                    )}
                  >
                    {task.titulo}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{task.detalhe}</p>
                </div>

                {/* Button */}
                <Button
                  variant={done ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleDone(task.id)}
                  className={cn(
                    "shrink-0 rounded-xl",
                    done
                      ? "border-border text-muted-foreground"
                      : "bg-primary hover:bg-primary/90",
                  )}
                >
                  {done ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Feito
                    </>
                  ) : (
                    "Marcar"
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Effort Dialog */}
      <Dialog open={!!effortFor} onOpenChange={(o) => !o && setEffortFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Como foi o treino?</DialogTitle>
            <DialogDescription>
              Registre o esforço percebido para a IA ajustar seu plano.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {ESFORCOS.map((e) => (
              <button
                key={e.id}
                onClick={() => pickEsforco(e.id)}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center text-sm font-medium transition-all hover:border-primary hover:bg-primary/5"
              >
                <span className="text-2xl">{e.emoji}</span>
                <span className="font-semibold">{e.id}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{e.desc}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}