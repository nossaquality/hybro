import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Footprints, Dumbbell, Wind, Moon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivePlan, getTodayIndex } from "@/lib/data";
import type { PlanoTreino, TipoTarefa } from "@/lib/plan-types";

export const Route = createFileRoute("/app/calendar")({
  component: WeeklyCalendar,
});

const ICONS: Record<TipoTarefa, React.ComponentType<{ className?: string }>> = {
  corrida: Footprints,
  musculacao: Dumbbell,
  mobilidade: Wind,
  descanso: Moon,
};

const TONE: Record<TipoTarefa, string> = {
  corrida: "bg-running-soft text-running border-running/20 hover:border-running/40",
  musculacao: "bg-strength-soft text-strength border-strength/20 hover:border-strength/40",
  mobilidade: "bg-energy-soft text-energy border-energy/20 hover:border-energy/40",
  descanso: "bg-muted text-muted-foreground border-border",
};

const TIPO_LABEL: Record<TipoTarefa, string> = {
  corrida: "Corrida",
  musculacao: "Musculação",
  mobilidade: "Mobilidade",
  descanso: "Descanso",
};

// Map tipos to their detail pages
const TIPO_ROUTE: Partial<Record<TipoTarefa, string>> = {
  corrida: "/app/running",
  musculacao: "/app/strength",
  mobilidade: "/app/mobility",
};

function WeeklyCalendar() {
  const [plano, setPlano] = useState<PlanoTreino | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getActivePlan().then(setPlano);
  }, []);

  const todayIdx = getTodayIndex();

  function handleTaskClick(tipo: TipoTarefa) {
    const route = TIPO_ROUTE[tipo];
    if (route) navigate({ to: route as any });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Esta semana</h1>
        <p className="mt-1 text-muted-foreground">
          Sua agenda integrada. Clique em um treino para ver os detalhes.
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <Legend color="bg-running" label="Corrida" />
        <Legend color="bg-strength" label="Musculação" />
        <Legend color="bg-energy" label="Mobilidade" />
        <Legend color="bg-muted-foreground/40" label="Descanso" />
      </div>

      {!plano ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {plano.semana.map((day, i) => {
            const isToday = i === todayIdx;
            return (
              <Card
                key={`${day.dia}-${i}`}
                className={cn(
                  "flex min-h-56 flex-col gap-2 rounded-3xl border-border/60 p-4 shadow-sm transition-all",
                  isToday && "ring-2 ring-primary ring-offset-1",
                )}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {day.dia}
                    </p>
                    <p className="text-sm font-bold">{day.data.slice(0, 3)}</p>
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                      Hoje
                    </span>
                  )}
                </div>

                {/* Tasks */}
                <div className="mt-1 flex flex-1 flex-col gap-1.5">
                  {day.tarefas.map((t) => {
                    const Icon = ICONS[t.tipo] ?? Moon;
                    const isClickable = !!TIPO_ROUTE[t.tipo];
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleTaskClick(t.tipo)}
                        disabled={!isClickable}
                        className={cn(
                          "group w-full rounded-2xl border p-2.5 text-left transition-all",
                          TONE[t.tipo],
                          isClickable
                            ? "cursor-pointer hover:shadow-sm"
                            : "cursor-default",
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">
                              {TIPO_LABEL[t.tipo]}
                            </span>
                          </div>
                          {isClickable && (
                            <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                          )}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-tight text-foreground">
                          {t.titulo}
                        </div>
                        {t.duracao_min && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {t.duracao_min} min
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
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