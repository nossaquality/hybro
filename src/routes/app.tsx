import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, type Profile } from "@/lib/data";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function DashboardHeader() {
  const [userName, setUserName] = useState("Atleta");

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "Atleta";
      setUserName(name);
    }
    fetchUser();
  }, []);

  return (
    <div className="text-sm text-muted-foreground">
      Olá, <span className="font-medium text-foreground">{userName}</span>
    </div>
  );
}

const OBJ_LABEL: Record<string, string> = {
  resistencia: "Resistência",
  velocidade: "Velocidade",
  perda_peso: "Perda de peso",
  prevencao_lesoes: "Prevenção de lesões",
};

function AppLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      // 1. Pega a sessão atual de forma assíncrona
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;

      if (!session) {
        setAuthed(false);
        setReady(true);
        return;
      }

      // 2. Se há sessão, busca o perfil com segurança
      try {
        const userProfile = await getProfile();
        if (isMounted) {
          setAuthed(true);
          setProfile(userProfile);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        if (isMounted) setReady(true);
      }
    }

    checkAuth();

    // 3. OUVINTE DE ESTADO DO SUPABASE: Evita que o F5 quebre a sessão ativa
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session) {
        setAuthed(true);
        if (!profile) {
          const userProfile = await getProfile();
          if (isMounted) setProfile(userProfile);
        }
      } else {
        setAuthed(false);
      }
      setReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Tela de carregamento amigável enquanto o Supabase autentica no F5 (Impede o "Not Found")
  if (!ready) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#040405] text-zinc-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span>Sincronizando perfil híbrido...</span>
        </div>
      </div>
    );
  }

  // Redirecionamentos seguros após a confirmação real do estado de Auth
  if (!authed) return <Navigate to="/" />;
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between">
              <DashboardHeader />

              <div className="hidden items-center gap-2 text-xs sm:flex">
                <span className="rounded-full bg-running-soft px-2.5 py-1 font-medium text-running">
                  Corrida
                </span>
                <span className="rounded-full bg-strength-soft px-2.5 py-1 font-medium text-strength">
                  Musculação
                </span>
                <span className="rounded-full bg-energy-soft px-2.5 py-1 font-medium text-energy">
                  Objetivo: {OBJ_LABEL[profile.objetivo_principal ?? ""] ?? "—"}
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}