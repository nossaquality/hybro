import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Activity,
  Dumbbell,
  Target,
  Calendar,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { gerarPlano } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getProfile } from "@/lib/data";

type Nivel = "iniciante" | "intermediario" | "avancado";
type Objetivo = "resistencia" | "velocidade" | "perda_peso" | "prevencao_lesoes";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [
      { title: "Começar · HYBRO" },
      { name: "description", content: "Monte seu plano personalizado de corrida e musculação em casa." },
    ],
  }),
});

const NIVEIS: { id: Nivel; title: string; desc: string }[] = [
  { id: "iniciante", title: "Iniciante", desc: "Começando ou voltando depois de uma pausa" },
  { id: "intermediario", title: "Intermediário", desc: "Corre 15–30 km por semana com regularidade" },
  { id: "avancado", title: "Avançado", desc: "Treina para performance, 40+ km por semana" },
];

const OBJETIVOS: { id: Objetivo; title: string; desc: string }[] = [
  { id: "resistencia", title: "Ganhar Resistência", desc: "Correr mais longe, mais forte" },
  { id: "velocidade", title: "Ganhar Velocidade", desc: "Melhorar pace e tempos de prova" },
  { id: "perda_peso", title: "Perder Peso", desc: "Emagrecimento sustentável" },
  { id: "prevencao_lesoes", title: "Prevenir Lesões", desc: "Resiliência e mobilidade" },
];

const EQUIPAMENTOS = [
  { id: "peso_corporal", title: "Só peso corporal" },
  { id: "halteres", title: "Halteres" },
  { id: "elasticos", title: "Elásticos de resistência" },
  { id: "kettlebell", title: "Kettlebell" },
  { id: "barra_fixa", title: "Barra fixa" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);

  const [name, setName] = useState("");
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [dias, setDias] = useState<number>(4);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [equipamentos, setEquipamentos] = useState<string[]>(["peso_corporal"]);

  const gerar = useServerFn(gerarPlano);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthReady(true);
        return;
      }
      const profile = await getProfile();
      if (profile?.onboarding_completed) setAlreadyDone(true);
      if (profile?.name) setName(profile.name);
      setAuthed(true);
      setAuthReady(true);
    })();
  }, []);

  const steps = ["Você", "Nível", "Agenda", "Objetivo", "Equipamento"];

  const canNext =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && !!nivel) ||
    (step === 2 && dias >= 2 && dias <= 7) ||
    (step === 3 && !!objetivo) ||
    (step === 4 && equipamentos.length > 0);

  function toggleEquip(e: string) {
    setEquipamentos((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function finish() {
    setGenerating(true);
    try {
      await gerar({
        data: {
          name: name.trim(),
          nivel_corrida: nivel!,
          dias_disponiveis: dias,
          objetivo_principal: objetivo!,
          equipamentos_casa: equipamentos,
        },
      });
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar plano");
      setGenerating(false);
    }
  }

  if (!authReady) return null;
  if (!authed) return <Navigate to="/login" />;
  if (alreadyDone) return <Navigate to="/app" />;
  if (generating) return <GeneratingScreen name={name} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">HYBRO</span>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Etapa {step + 1} de {steps.length} · {steps[step]}
        </p>

        <Card className="rounded-2xl border-border/60 p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo(a) 👋</h1>
              <p className="text-muted-foreground">
                Vamos montar seu plano personalizado de corrida + musculação em casa. Primeiro, como podemos te chamar?
              </p>
              <Input
                autoFocus
                placeholder="Seu primeiro nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">Qual seu nível de corrida?</h1>
              <div className="space-y-2">
                {NIVEIS.map((l) => (
                  <OptionRow
                    key={l.id}
                    selected={nivel === l.id}
                    onClick={() => setNivel(l.id)}
                    title={l.title}
                    desc={l.desc}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-tight">Quantos dias por semana?</h1>
              <p className="text-muted-foreground">
                Incluindo corrida, musculação e mobilidade — seja realista.
              </p>
              <div className="grid grid-cols-6 gap-2">
                {[2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDias(d)}
                    className={cn(
                      "rounded-xl border py-4 text-lg font-semibold transition-all",
                      dias === d
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">Qual seu objetivo principal?</h1>
              <div className="grid gap-2 sm:grid-cols-2">
                {OBJETIVOS.map((g) => (
                  <OptionRow
                    key={g.id}
                    selected={objetivo === g.id}
                    onClick={() => setObjetivo(g.id)}
                    title={g.title}
                    desc={g.desc}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">Equipamentos em casa</h1>
              <p className="text-muted-foreground">Selecione tudo que você tem disponível.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EQUIPAMENTOS.map((e) => {
                  const active = equipamentos.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEquip(e.id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                        active
                          ? "border-strength bg-strength-soft/50"
                          : "border-border hover:border-strength/40",
                      )}
                    >
                      <span className="font-medium">{e.title}</span>
                      {active && (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-strength text-strength-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Voltar
            </Button>
            {step < steps.length - 1 ? (
              <Button
                size="lg"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-xl"
              >
                Continuar
              </Button>
            ) : (
              <Button
                size="lg"
                disabled={!canNext}
                onClick={finish}
                className="rounded-xl bg-energy text-energy-foreground hover:bg-energy/90"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Gerar meu plano
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
          <Hint icon={<Calendar className="h-4 w-4" />} label="Agenda semanal inteligente" />
          <Hint icon={<Target className="h-4 w-4" />} label="Adaptado ao seu objetivo" />
          <Hint icon={<Dumbbell className="h-4 w-4" />} label="Musculação em casa" />
        </div>

        <p className="mt-8 rounded-xl border border-energy/30 bg-energy-soft/40 p-4 text-center text-xs text-muted-foreground">
          <strong className="text-foreground">Nota:</strong> Este plano é gerado por inteligência artificial.
          Consulte um profissional de educação física ou médico antes de iniciar qualquer atividade física.
        </p>
      </div>
    </div>
  );
}

function OptionRow({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </button>
  );
}

function Hint({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function GeneratingScreen({ name }: { name: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 h-24 w-24">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
          <div className="absolute inset-0 grid place-items-center">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Montando seu plano{name ? `, ${name}` : ""}…
        </h2>
        <p className="mt-2 text-muted-foreground">
          Nossa IA está equilibrando suas corridas, treinos de força e recuperação.
        </p>
        <div className="mt-8 space-y-2 text-left text-sm">
          <Step label="Analisando seu nível e objetivo" delay={0} />
          <Step label="Mapeando a agenda semanal" delay={600} />
          <Step label="Selecionando circuitos de musculação em casa" delay={1200} />
          <Step label="Finalizando seu dashboard" delay={1800} />
        </div>
      </div>
    </div>
  );
}

function Step({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full border transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted",
        )}
      >
        {done ? <Check className="h-3 w-3" /> : null}
      </span>
      <span className={cn("transition-colors", done ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}
