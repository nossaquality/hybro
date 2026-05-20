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
  ChevronRight,
  ChevronLeft,
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
  { id: "iniciante", title: "Iniciante Híbrido", desc: "Construindo base aeróbica e adaptação muscular inicial" },
  { id: "intermediario", title: "Intermediário Híbrido", desc: "Corre 15–30 km/semana e já treina força de forma consistente" },
  { id: "avancado", title: "Avançado / Performance", desc: "Foco em alto rendimento concorrente (40+ km/semana + carga pesada)" },
];

const OBJETIVOS: { id: Objetivo; title: string; desc: string }[] = [
  { id: "resistencia", title: "Resistência Híbrida", desc: "Desenvolver fôlego extremo sem perder massa muscular" },
  { id: "velocidade", title: "Ganhar Velocidade", desc: "Otimizar limiar de lactato, explosão e ritmo de prova" },
  { id: "perda_peso", title: "Recomposição Corporal", desc: "Queima de gordura otimizada mantendo a força ativa" },
  { id: "prevencao_lesoes", title: "Longevidade e Resiliência", desc: "Fortalecimento articular e blindagem contra lesões" },
];

const EQUIPAMENTOS = [
  { id: "peso_corporal", title: "Só peso corporal" },
  { id: "halteres", title: "Halteres" },
  { id: "elasticos", title: "Elásticos de resistência" },
  { id: "kettlebell", title: "Kettlebell" },
  { id: "barra_fixa", title: "Barra fixa" },
];

function FourPointStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-700 opacity-80 animate-pulse">
      <path d="M12 0L15 9L24 12L15 15L12 24L9 15L0 12L9 9L12 0Z" fill="currentColor" />
    </svg>
  );
}

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
    <div className="flex min-h-screen flex-col justify-between bg-[#040405] text-zinc-200 font-sans selection:bg-amber-500/30 antialiased relative overflow-hidden px-6 py-8">
      
      {/* ANÉIS GEOMÉTRICOS DE LUZ DE ALTA FIDELIDADE */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <div className="relative w-full max-w-xl h-[500px] flex items-center justify-center">
          {/* Anel Dourado (Esquerda) */}
          <div 
            className="absolute left-[-10%] w-[420px] h-[420px] rounded-full border border-amber-500/25 opacity-60"
            style={{
              boxShadow: "0 0 30px rgba(245, 158, 11, 0.12), inset 0 0 30px rgba(245, 158, 11, 0.12)"
            }}
          />
          <div className="absolute left-[-15%] w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[90px]" />

          {/* Anel Azul Cyber (Direita) */}
          <div 
            className="absolute right-[-10%] w-[420px] h-[420px] rounded-full border border-blue-500/25 opacity-60"
            style={{
              boxShadow: "0 0 35px rgba(59, 130, 246, 0.15), inset 0 0 35px rgba(59, 130, 246, 0.15)"
            }}
          />
          <div className="absolute right-[-15%] w-[350px] h-[350px] rounded-full bg-blue-600/5 blur-[90px]" />
        </div>
      </div>

      {/* 1. CABEÇALHO PREMIUM UNIFICADO */}
      <div className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-between pt-4 mb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase pl-[0.3em]">
            HYBRO
          </h1>
          <p className="mt-0.5 text-[10px] tracking-widest text-amber-200/30 font-medium">
            inteligência em treinamento híbrido
          </p>
        </div>
        <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] text-zinc-400 backdrop-blur-sm">
          PASSO {step + 1} / {steps.length}
        </span>
      </div>

      {/* Linha de Progresso Linear Slim */}
      <div className="relative z-10 w-full max-w-2xl mx-auto mb-8 flex items-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= step 
                ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                : "bg-zinc-900 border border-white/[0.02]"
            )}
          />
        ))}
      </div>

      {/* 2. CARD GLASSMORPHISM DE ALTA FIDELIDADE */}
      <div className="relative z-10 w-full max-w-2xl mx-auto my-auto py-2">
        <Card className="rounded-[28px] border border-white/[0.07] bg-zinc-950/25 p-6 sm:p-10 backdrop-blur-3xl shadow-2xl shadow-black/95 text-zinc-100">
          
          {step === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">Bem-vindo(a) 👋</h2>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Vamos montar seu plano personalizado de corrida + musculação em casa. Primeiro, como podemos te chamar?
                </p>
              </div>
              <Input
                autoFocus
                placeholder="Seu primeiro nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 text-sm border border-white/[0.07] bg-black/40 text-white focus-visible:ring-amber-500/30 placeholder:text-zinc-800 rounded-xl transition-all"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-white">Qual seu nível de corrida?</h2>
                <p className="text-zinc-400 text-xs">Selecione sua quilometragem e constância atual.</p>
              </div>
              <div className="space-y-3">
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
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-white">Quantos dias por semana?</h2>
                <p className="text-zinc-400 text-xs">
                  Incluindo corrida, musculação e mobilidade — seja realista.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDias(d)}
                    className={cn(
                      "rounded-xl border py-3 text-lg font-black transition-all duration-200 cursor-pointer",
                      dias === d
                        ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "border-white/[0.06] bg-black/40 text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-white">Qual seu objetivo principal?</h2>
                <p className="text-zinc-400 text-xs">A inteligência artificial irá periodizar os blocos baseado nisso.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-white">Equipamentos em casa</h2>
                <p className="text-zinc-400 text-xs">Selecione tudo que você tem disponível.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {EQUIPAMENTOS.map((e) => {
                  const active = equipamentos.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleEquip(e.id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer",
                        active
                          ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                          : "border-white/[0.06] bg-black/40 text-zinc-300 hover:border-white/[0.12]"
                      )}
                    >
                      <span className="font-semibold text-xs">{e.title}</span>
                      <div className={cn(
                        "grid h-5 w-5 place-items-center rounded-full border transition-all",
                        active ? "border-amber-500 bg-amber-500 text-black" : "border-white/[0.06] bg-zinc-900"
                      )}>
                        {active && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botões de Navegação Inferiores */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/[0.05] pt-6">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="px-4 h-11 rounded-xl border border-white/[0.06] bg-black/40 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-20 transition-all cursor-pointer flex items-center"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
            
            {step < steps.length - 1 ? (
              <Button
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="px-6 h-11 rounded-xl bg-zinc-100 text-black hover:bg-zinc-200 font-bold text-xs disabled:opacity-30 transition-all cursor-pointer flex items-center border-none shadow-md"
              >
                Continuar
                <ChevronRight className="ml-1 h-4 w-4 stroke-[2.5]" />
              </Button>
            ) : (
              <Button
                disabled={!canNext}
                onClick={finish}
                className="px-6 h-11 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/10 hover:opacity-95 transition-all cursor-pointer flex items-center border-none"
              >
                <Sparkles className="mr-1.5 h-4 w-4 fill-black" />
                Gerar meu plano
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* 3. RODAPÉ SUPORTE / NOTA DA IA */}
      <div className="relative z-10 w-full max-w-2xl mx-auto mt-6 space-y-6">
        <div className="grid grid-cols-3 gap-4 text-center text-[10px] text-zinc-600 font-mono tracking-wide border-t border-white/[0.04] pt-5">
          <Hint icon={<Calendar className="h-3.5 w-3.5 text-amber-200/20" />} label="Schedule semanal inteligente" />
          <Hint icon={<Target className="h-3.5 w-3.5 text-blue-400/20" />} label="Foco no seu objetivo" />
          <Hint icon={<Dumbbell className="h-3.5 w-3.5 text-zinc-700" />} label="Musculação estruturada" />
        </div>

        <p className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 text-center text-[11px] text-zinc-500 leading-relaxed backdrop-blur-sm">
          <strong className="text-zinc-400">Nota:</strong> Este plano é gerado por inteligência artificial com base em diretrizes de treinamento concorrente. Consulte um profissional de saúde antes de iniciar.
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
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer block",
        selected
          ? "border-amber-500 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          : "border-white/[0.06] bg-black/40 text-zinc-300 hover:border-white/[0.12]",
      )}
    >
      <div className="font-bold text-sm text-white">{title}</div>
      <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{desc}</div>
    </button>
  );
}

function Hint({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
      <span>{icon}</span>
      <span className="text-zinc-500">{label}</span>
    </div>
  );
}

function GeneratingScreen({ name }: { name: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#040405] text-white px-6 relative overflow-hidden">
      <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
      <div className="w-full max-w-md text-center relative z-10">
        <div className="relative mx-auto mb-10 h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/10" />
          <div className="absolute inset-0 grid place-items-center rounded-full bg-zinc-950 border border-white/[0.06]">
            <Sparkles className="h-7 w-7 text-amber-300 animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          Montando seu ecossistema híbrido{name ? `, ${name}` : ""}…
        </h2>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Nossa inteligência está calculando as vias metabólicas ideais para conciliar força e endurance.
        </p>
        
        <div className="mt-10 space-y-3.5 border border-white/[0.06] bg-zinc-950/40 backdrop-blur-md p-6 rounded-[24px] text-left text-xs text-zinc-500">
          <LoadingStep label="Analisando perfil metabólico e objetivos" delay={0} />
          <LoadingStep label="Aplicando modelo High-Low para gerenciamento de fadiga" delay={700} />
          <LoadingStep label="Sincronizando stimuli de corrida e treinos de força" delay={1400} />
          <LoadingStep label="Mitigando efeitos de interferência sistêmica" delay={2100} />
          <LoadingStep label="Estruturando rotinas de mobilidade e seu dashboard" delay={2800} />
        </div>
      </div>
    </div>
  );
}

function LoadingStep({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full border transition-all text-[10px]",
          done ? "border-amber-500 bg-amber-500 text-black font-bold" : "border-white/[0.06] bg-black",
        )}
      >
        {done ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
      </span>
      <span className={cn("transition-colors", done ? "text-zinc-200" : "text-zinc-600")}>
        {label}
      </span>
    </div>
  );
}