import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Sparkles, Calendar, Target, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar · HYBRO" }] }),
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FourPointStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-700 opacity-80 animate-pulse">
      <path d="M12 0L15 9L24 12L15 15L12 24L9 15L0 12L9 9L12 0Z" fill="currentColor" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Conta criada! Vamos montar seu plano.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google") {
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Erro ao entrar com ${provider}`);
      setOauthLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#040405] text-zinc-200 font-sans selection:bg-amber-500/30 antialiased relative overflow-hidden px-6 py-8">
      
      {/* COMPONENTE DOS ANÉIS GEOMÉTRICOS DE LUZ (Corrigido e fechado corretamente) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <div className="relative w-full max-w-md h-[450px] flex items-center justify-center">
          
          {/* Anel Dourado (Esquerda) */}
          <div 
            className="absolute left-[-15%] w-[380px] h-[380px] rounded-full border border-amber-500/30 opacity-70"
            style={{
              boxShadow: "0 0 30px rgba(245, 158, 11, 0.15), inset 0 0 30px rgba(245, 158, 11, 0.15)"
            }}
          />
          {/* Brilho de fundo sutil âmbar */}
          <div className="absolute left-[-20%] w-[320px] h-[320px] rounded-full bg-amber-500/10 blur-[80px]" />

          {/* Anel Azul Cyber (Direita) */}
          <div 
            className="absolute right-[-15%] w-[380px] h-[380px] rounded-full border border-blue-500/30 opacity-70"
            style={{
              boxShadow: "0 0 35px rgba(59, 130, 246, 0.18), inset 0 0 35px rgba(59, 130, 246, 0.18)"
            }}
          />
          {/* Brilho de fundo sutil azul */}
          <div className="absolute right-[-20%] w-[320px] h-[320px] rounded-full bg-blue-600/10 blur-[80px]" />
          
        </div>
      </div>

      {/* 1. CABEÇALHO PREMIUM */}
      <div className="relative z-10 w-full text-center pt-4">
        <h1 className="text-3xl font-black tracking-[0.15em] text-white uppercase pl-[0.35em] sm:text-5xl">
          HYBRO
        </h1>
        <p className="mt-2 text-xs tracking-widest text-amber-200/60 font-medium">
          inteligência em treinamento híbrido
        </p>
      </div>

      {/* 2. CARD VIDRO FOSCO DE ALTA FIDELIDADE */}
      <div className="relative z-10 w-full max-w-[420px] mx-auto my-auto py-6">
        <Card className="rounded-[28px] border border-white/[0.07] bg-zinc-950/25 p-6 sm:p-10 backdrop-blur-3xl shadow-2xl shadow-black/95 text-zinc-100">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {mode === "signin" ? "Hey Bro 👋" : "Criar sua Conta ✨"}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              {mode === "signin" 
                ? "Acesse seu plano de corrida + musculação híbrida." 
                : "Monte seu cronograma personalizado inteligente."}
            </p>
          </div>

          {/* Botão Google */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="flex w-full h-11 items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/[0.07] hover:border-white/[0.15] disabled:opacity-50 cursor-pointer"
            >
              <GoogleIcon />
              {oauthLoading === "google" ? "Conectando..." : "Continuar com Google"}
            </button>
          </div>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-[10px] font-mono tracking-[0.2em] text-zinc-600">
              <span className="bg-transparent px-3 uppercase">ou e-mail</span>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1">
                <Label htmlFor="name" className="text-zinc-400 text-[11px] font-medium pl-0.5">Nome</Label>
                <Input 
                  id="name" 
                  placeholder="Seu nome"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="w-full h-11 px-4 border border-white/[0.07] bg-black/40 text-sm text-white focus-visible:ring-amber-500/30 placeholder:text-zinc-800 rounded-xl transition-all"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <Label htmlFor="email" className="text-zinc-400 text-[11px] font-medium pl-0.5">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 border border-white/[0.07] bg-black/40 text-sm text-white focus-visible:ring-amber-500/30 placeholder:text-zinc-800 rounded-xl transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="password">
                <span className="text-zinc-400 text-[11px] font-medium pl-0.5">Senha</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-11 pl-4 pr-10 border border-white/[0.07] bg-black/40 text-sm text-white focus-visible:ring-amber-500/30 placeholder:text-zinc-800 rounded-xl transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-11 rounded-xl bg-zinc-100 text-black hover:bg-zinc-200 font-bold text-xs tracking-wide transition-all cursor-pointer border-none mt-3 shadow-lg shadow-black/20"
            >
              {loading ? (
                "Carregando..."
              ) : mode === "signin" ? (
                "Entrar na conta"
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 fill-black" />
                  Criar minha conta de treino
                </>
              )}
            </Button>
          </form>

          {/* Alternador */}
          <p className="mt-6 text-center text-[11px] text-zinc-500">
            {mode === "signin" ? "Novo por aqui?" : "Já possui cadastro?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-amber-200/50 hover:text-amber-200/80 underline underline-offset-4 transition-colors ml-1 cursor-pointer"
            >
              {mode === "signin" ? "Criar conta híbrida" : "Fazer Login tradicional"}
            </button>
          </p>
        </Card>

        <p className="mt-4 text-center">
          <Link to="/" className="text-zinc-700 text-[10px] font-mono hover:text-zinc-500 transition-colors">
            ← voltar para a home
          </Link>
        </p>
      </div>

      {/* 3. RODAPÉ */}
      <div className="relative z-10 w-full max-w-4xl mx-auto border-t border-white/[0.04] pt-5 mt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center justify-center gap-4 text-zinc-500 text-[10px] font-medium tracking-wide">
          <div className="flex items-center gap-2 bg-white/[0.01] border border-white/[0.03] px-3 py-1.5 rounded-xl">
            <Calendar className="h-3.5 w-3.5 text-amber-200/30" />
            <span>Intelligent weekly schedule</span>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.01] border border-white/[0.03] px-3 py-1.5 rounded-xl">
            <Target className="h-3.5 w-3.5 text-blue-400/30" />
            <span>Adapted to your goal</span>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.01] border border-white/[0.03] px-3 py-1.5 rounded-xl">
            <Dumbbell className="h-3.5 w-3.5 text-zinc-600" />
            <span>Musculação em casa</span>
          </div>
        </div>

        <div className="hidden sm:block">
          <FourPointStar />
        </div>
      </div>

    </div>
  );
}