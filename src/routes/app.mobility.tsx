import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Wind, Zap, ChevronDown, ChevronUp, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivePlan } from "@/lib/data";
import type { PlanoTreino } from "@/lib/plan-types";

export const Route = createFileRoute("/app/mobility")({
  component: MobilityPage,
});

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  cue: string;
  emoji: string;
}

interface Routine {
  title: string;
  focus: string;
  duration: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  softColor: string;
  exercises: Exercise[];
}

const MOBILITY_ROUTINE: Routine = {
  title: "Rotina de Mobilidade",
  focus: "Prevenção de lesões · articulações e amplitude",
  duration: "15–20 min",
  icon: Wind,
  color: "text-energy",
  softColor: "bg-energy-soft/60 border-energy/20",
  exercises: [
    {
      name: "Mobilidade de Tornozelo",
      sets: "2 séries",
      reps: "10 reps cada lado",
      cue: "Apoie a mão na parede, leve o joelho para frente sem tirar o calcanhar do chão. Aumente o alcance gradualmente.",
      emoji: "🦶",
    },
    {
      name: "Mobilidade de Quadril 90/90",
      sets: "2 séries",
      reps: "60s cada lado",
      cue: "Sente com ambas as pernas dobradas a 90°. Incline o tronco sobre a perna da frente, mantendo as costas retas.",
      emoji: "🧘",
    },
    {
      name: "Alongamento Dinâmico de Posteriores",
      sets: "2 séries",
      reps: "12 reps",
      cue: "Em pé, avance com um passo e incline o tronco mantendo a perna dianteira esticada. Alterne os lados com fluidez.",
      emoji: "🦵",
    },
    {
      name: "Rotação Torácica em Quatro Apoios",
      sets: "2 séries",
      reps: "10 reps cada lado",
      cue: "Em quatro apoios, coloque a mão atrás da cabeça e gire o cotovelo para cima acompanhando a coluna torácica.",
      emoji: "🔄",
    },
    {
      name: "Afundo com Alcance de Braço (Spiderman)",
      sets: "2 séries",
      reps: "8 reps cada lado",
      cue: "Avance em afundo, coloque a mão no chão na altura do pé e abra o braço oposto para o teto. Abra o quadril.",
      emoji: "🕷️",
    },
    {
      name: "Flexão de Panturrilha Excêntrica",
      sets: "3 séries",
      reps: "15 reps",
      cue: "Suba na ponta dos pés com as duas, desça lentamente apenas com uma. Essencial para corredores.",
      emoji: "🏃",
    },
  ],
};

const PLYOMETRY_ROUTINE: Routine = {
  title: "Circuito de Pliometria",
  focus: "Potência e elasticidade para o corredor",
  duration: "20–25 min",
  icon: Zap,
  color: "text-running",
  softColor: "bg-running-soft/60 border-running/20",
  exercises: [
    {
      name: "Saltos na Caixa (Box Jumps)",
      sets: "3 séries",
      reps: "6–8 reps",
      cue: "Use uma superfície sólida de 30–50cm. Aterrisse com joelhos semi-flexionados, absorvendo o impacto suavemente. Foco: explosão.",
      emoji: "📦",
    },
    {
      name: "Pulos Unilaterais (Single-leg Hops)",
      sets: "3 séries",
      reps: "10 reps cada perna",
      cue: "Salte com uma perna e aterrisse no mesmo pé, absorvendo o impacto. Controle o balanço antes de repetir. Fortifica tornozelo e quadril.",
      emoji: "🦘",
    },
    {
      name: "Saltos Verticais com Reatividade do Tornozelo",
      sets: "4 séries",
      reps: "10 reps",
      cue: "Saltos rápidos e curtos — contato mínimo com o chão. Foque em tempo de contato baixo, como se o chão estivesse quente.",
      emoji: "⚡",
    },
    {
      name: "Jump Squat (Agachamento com Salto)",
      sets: "3 séries",
      reps: "8 reps",
      cue: "Faça um agachamento profundo e exploda em salto vertical. Aterrisse suavemente e vá direto para o próximo rep.",
      emoji: "🚀",
    },
    {
      name: "Skipping A (marcha rápida com joelhos altos)",
      sets: "3 séries",
      reps: "20 metros ida e volta",
      cue: "Elevação rápida dos joelhos mantendo o tronco ereto e os braços em movimento ativo. Eleva a cadência de passada.",
      emoji: "🏃‍♂️",
    },
    {
      name: "Pulos Laterais (Lateral Bounds)",
      sets: "3 séries",
      reps: "10 reps cada lado",
      cue: "Salte lateralmente de um pé ao outro, aterrissando em uma perna. Fortifica estabilizadores do quadril e reduz risco de lesão.",
      emoji: "↔️",
    },
  ],
};

function MobilityPage() {
  const [plano, setPlano] = useState<PlanoTreino | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("mobility");
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  useEffect(() => {
    getActivePlan().then(setPlano);
  }, []);

  const routines = [
    { key: "mobility", routine: MOBILITY_ROUTINE },
    { key: "plyometry", routine: PLYOMETRY_ROUTINE },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-energy text-energy-foreground shadow-sm">
          <Wind className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mobilidade & Pliometria</h1>
          <p className="text-muted-foreground">
            Prevenção de lesões, amplitude de movimento e potência explosiva.
          </p>
        </div>
      </div>

      {/* Why it matters */}
      <Card className="mb-6 rounded-3xl border-energy/20 bg-gradient-to-r from-energy-soft/50 to-transparent p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-energy" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Por que incluir no seu treino?</p>
            <p className="mt-1 text-muted-foreground">
              Mobilidade aumenta a amplitude dos movimentos e reduz lesões. Pliometria melhora a
              economia de corrida e a potência da passada — corredores com maior capacidade
              elástica gastam menos energia em cada passada.
            </p>
          </div>
        </div>
      </Card>

      {/* Routines */}
      <div className="space-y-4">
        {routines.map(({ key, routine }) => {
          const Icon = routine.icon;
          const isOpen = openSection === key;

          return (
            <Card
              key={key}
              className={cn("overflow-hidden rounded-3xl border shadow-sm", routine.softColor)}
            >
              {/* Section header */}
              <button
                onClick={() => setOpenSection(isOpen ? null : key)}
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <div
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                    key === "mobility"
                      ? "bg-energy text-energy-foreground"
                      : "bg-running text-running-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{routine.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{routine.focus}</span>
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    <span>{routine.duration}</span>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Exercise list */}
              {isOpen && (
                <div className="divide-y divide-border/40 border-t border-border/40 bg-background">
                  {routine.exercises.map((ex, i) => {
                    const exKey = `${key}-${i}`;
                    const isExOpen = openExercise === exKey;
                    return (
                      <div key={exKey}>
                        <button
                          onClick={() => setOpenExercise(isExOpen ? null : exKey)}
                          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                        >
                          <span className="text-xl">{ex.emoji}</span>
                          <div className="flex-1">
                            <div className="font-medium">{ex.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ex.sets} · {ex.reps}
                            </div>
                          </div>
                          {isExOpen ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                        {isExOpen && (
                          <div className="border-t border-border/30 bg-muted/30 px-5 py-3">
                            <p className="text-sm leading-relaxed text-foreground">{ex.cue}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        <strong className="text-foreground">Dica de segurança:</strong> Faça os exercícios
        pliométricos com o corpo aquecido. Se sentir dor articular (não muscular), interrompa e
        consulte um profissional.
      </p>
    </div>
  );
}