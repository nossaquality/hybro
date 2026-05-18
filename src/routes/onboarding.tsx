import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  type Equipment,
  type Goal,
  type Level,
  saveOnboarding,
} from "@/lib/store";
import { Activity, Dumbbell, Target, Calendar, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [
      { title: "Get started · Stride" },
      { name: "description", content: "Build your personalized running + strength plan." },
    ],
  }),
});

const LEVELS: { id: Level; title: string; desc: string }[] = [
  { id: "beginner", title: "Beginner", desc: "New to running or returning after a break" },
  { id: "intermediate", title: "Intermediate", desc: "Running 15–30 km / week consistently" },
  { id: "advanced", title: "Advanced", desc: "Training for performance, 40+ km / week" },
];

const GOALS: { id: Goal; title: string; desc: string }[] = [
  { id: "endurance", title: "Build Endurance", desc: "Run longer, feel stronger" },
  { id: "speed", title: "Get Faster", desc: "Improve pace & race times" },
  { id: "weight_loss", title: "Lose Weight", desc: "Sustainable fat loss" },
  { id: "injury_prevention", title: "Stay Injury-Free", desc: "Resilience & mobility" },
];

const EQUIPMENT: { id: Equipment; title: string }[] = [
  { id: "bodyweight", title: "Bodyweight only" },
  { id: "dumbbells", title: "Dumbbells" },
  { id: "bands", title: "Resistance bands" },
  { id: "kettlebell", title: "Kettlebell" },
  { id: "pullup_bar", title: "Pull-up bar" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);

  const [name, setName] = useState("");
  const [level, setLevel] = useState<Level | null>(null);
  const [days, setDays] = useState<number>(4);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>(["bodyweight"]);

  const steps = ["You", "Level", "Schedule", "Goal", "Equipment"];

  const canNext =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && !!level) ||
    (step === 2 && days >= 2 && days <= 7) ||
    (step === 3 && !!goal) ||
    (step === 4 && equipment.length > 0);

  function toggleEquip(e: Equipment) {
    setEquipment((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  function finish() {
    setGenerating(true);
    setTimeout(() => {
      saveOnboarding({
        name: name.trim(),
        level: level!,
        daysPerWeek: days,
        goal: goal!,
        equipment,
        completedAt: new Date().toISOString(),
      });
      navigate({ to: "/app" });
    }, 2400);
  }

  if (generating) {
    return <GeneratingScreen name={name} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Stride</span>
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
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>

        <Card className="rounded-2xl border-border/60 p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome 👋</h1>
              <p className="text-muted-foreground">
                Let's build your personalized running + home strength plan. First, what should we call you?
              </p>
              <Input
                autoFocus
                placeholder="Your first name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">What's your running level?</h1>
              <div className="space-y-2">
                {LEVELS.map((l) => (
                  <OptionRow
                    key={l.id}
                    selected={level === l.id}
                    onClick={() => setLevel(l.id)}
                    title={l.title}
                    desc={l.desc}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-tight">How many days per week?</h1>
              <p className="text-muted-foreground">
                Including running, strength and mobility — be realistic.
              </p>
              <div className="grid grid-cols-6 gap-2">
                {[2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-xl border py-4 text-lg font-semibold transition-all",
                      days === d
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
              <h1 className="text-2xl font-semibold tracking-tight">What's your main goal?</h1>
              <div className="grid gap-2 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <OptionRow
                    key={g.id}
                    selected={goal === g.id}
                    onClick={() => setGoal(g.id)}
                    title={g.title}
                    desc={g.desc}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">Home gym equipment</h1>
              <p className="text-muted-foreground">Pick everything you have available.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EQUIPMENT.map((e) => {
                  const active = equipment.includes(e.id);
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
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button
                size="lg"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-xl"
              >
                Continue
              </Button>
            ) : (
              <Button
                size="lg"
                disabled={!canNext}
                onClick={finish}
                className="rounded-xl bg-energy text-energy-foreground hover:bg-energy/90"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Generate my plan
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
          <Hint icon={<Calendar className="h-4 w-4" />} label="Smart weekly schedule" />
          <Hint icon={<Target className="h-4 w-4" />} label="Built around your goal" />
          <Hint icon={<Dumbbell className="h-4 w-4" />} label="Home-friendly strength" />
        </div>
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
          Building your plan{name ? `, ${name}` : ""}…
        </h2>
        <p className="mt-2 text-muted-foreground">
          Our AI coach is balancing your runs, strength sessions and recovery.
        </p>
        <div className="mt-8 space-y-2 text-left text-sm">
          <Step label="Analyzing your level & goal" delay={0} />
          <Step label="Mapping weekly schedule" delay={600} />
          <Step label="Selecting home strength circuits" delay={1200} />
          <Step label="Finalizing your dashboard" delay={1800} />
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
