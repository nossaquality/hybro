import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Target,
  Footprints,
  Lock,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, type Profile } from "@/lib/data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

const NIVEL_LABEL: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const OBJ_LABEL: Record<string, string> = {
  resistencia: "Ganhar Resistência",
  velocidade: "Ganhar Velocidade",
  perda_peso: "Perda de Peso",
  prevencao_lesoes: "Prevenção de Lesões",
};

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? "");
      const p = await getProfile();
      setProfile(p);
      setLoading(false);
    })();
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso! 🔐");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar senha.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) toast.error(error.message);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-muted-foreground">Carregando perfil…</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="mt-1 text-muted-foreground">Gerencie sua conta e preferências de treino.</p>
      </div>

      {/* Account Info */}
      <Card className="mb-5 overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <User className="h-4 w-4" /> Informações da Conta
          </h2>
        </div>
        <div className="divide-y divide-border/40 px-6">
          <InfoRow icon={<Mail className="h-4 w-4 text-primary" />} label="E-mail" value={email} />
          <InfoRow
            icon={<Footprints className="h-4 w-4 text-running" />}
            label="Nível de corrida"
            value={NIVEL_LABEL[profile?.nivel_corrida ?? ""] ?? "—"}
          />
          <InfoRow
            icon={<Target className="h-4 w-4 text-energy" />}
            label="Objetivo principal"
            value={OBJ_LABEL[profile?.objetivo_principal ?? ""] ?? "—"}
          />
        </div>
      </Card>

      {/* Change Password */}
      <Card className="mb-5 overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Lock className="h-4 w-4" /> Alterar Senha
          </h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={updatingPassword || !newPassword || !confirmPassword}
            className="w-full rounded-xl"
          >
            {updatingPassword ? "Atualizando…" : "Atualizar Senha"}
          </Button>
        </form>
      </Card>

      {/* Social Login */}
      <Card className="mb-5 overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Vincular Conta Social
          </h2>
        </div>
        <div className="space-y-3 px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Vincule sua conta Google para entrar mais facilmente.
          </p>
          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow dark:bg-card dark:text-foreground dark:hover:bg-muted"
          >
            <GoogleIcon />
            <span>Continuar com Google</span>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </Card>

      {/* Sign Out */}
      <Card className="overflow-hidden rounded-3xl border-destructive/20 shadow-sm">
        <div className="px-6 py-5">
          <Button
            variant="destructive"
            className="w-full rounded-xl"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da Conta
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Você será desconectado de todos os dispositivos.
          </p>
        </div>
      </Card>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
