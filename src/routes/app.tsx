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

    // Força o aplicativo a destravar em 4 segundos caso o Supabase demore a responder
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !ready) {
        console.warn("⚠️ Timeout de segurança disparado. Destravando carregamento.");
        setReady(true);
      }
    }, 4000);

    async function checkAuth() {
      try {
        console.log("🔍 Verificando sessão do Supabase...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (!session) {
          console.log("❌ Nenhuma sessão ativa encontrada.");
          setAuthed(false);
          setReady(true);
          return;
        }

        console.log("✅ Sessão encontrada! Buscando perfil...");
        setAuthed(true);

        // Busca o perfil com uma trava de erro isolada para não travar o app inteiro
        try {
          const userProfile = await getProfile();
          console.log("👤 Perfil carregado com sucesso:", userProfile);
          if (isMounted) setProfile(userProfile);
        } catch (profileError) {
          console.error("🚨 Erro crítico ao rodar getProfile():", profileError);
          // Mesmo dando erro no perfil, define como pronto para não congelar a tela
        }

      } catch (err) {
        console.error("🚨 Erro na verificação de autenticação:", err);
      } finally {
        if (isMounted) {
          setReady(true);
          clearTimeout(safetyTimeout);
        }
      }
    }

    checkAuth();

    // Ouvinte de estado do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔔 Evento de Auth do Supabase: ${event}`);
      if (!isMounted) return;
      
      if (session) {
        setAuthed(true);
        if (!profile) {
          try {
            const userProfile = await getProfile();
            if (isMounted) setProfile(userProfile);
          } catch (e) {
            console.error("🚨 Erro ao atualizar perfil no onBorderChange:", e);
          }
        }
      } else {
        setAuthed(false);
      }
      setReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Tela de carregamento amigável
  if (!ready) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-muted-foreground font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span>Sincronizando perfil híbrido...</span>
        </div>
      </div>
    );
  }

  // Redirecionamentos após a checagem
  if (!authed) return <Navigate to="/" />;
  
  // Se o perfil deu erro ou não veio, evita quebrar a tela e deixa passar para checar
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" />;
  }

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
                  Objetivo: {profile ? (OBJ_LABEL[profile.objetivo_principal ?? ""] ?? "—") : "Geral"}
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
