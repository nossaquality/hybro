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
      // Tenta apanhar o nome completo do Google/Apple ou do metadado de registo
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
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setReady(true);
        return;
      }
      setAuthed(true);
      setProfile(await getProfile());
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (!authed) return <Navigate to="/login" />;
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between">
              
              {/* CORRIGIDO: Agora renderiza o componente seguro com o nome do Auth */}
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
