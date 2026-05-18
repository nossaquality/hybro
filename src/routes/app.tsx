import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { loadOnboarding, type OnboardingData } from "@/lib/store";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<OnboardingData | null>(null);

  useEffect(() => {
    setData(loadOnboarding());
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!data) return <Navigate to="/onboarding" />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Welcome back, <span className="font-medium text-foreground">{data.name}</span>
              </div>
              <div className="hidden items-center gap-2 text-xs sm:flex">
                <span className="rounded-full bg-running-soft px-2.5 py-1 font-medium text-running">
                  Running
                </span>
                <span className="rounded-full bg-strength-soft px-2.5 py-1 font-medium text-strength">
                  Strength
                </span>
                <span className="rounded-full bg-energy-soft px-2.5 py-1 font-medium text-energy">
                  Goal: {data.goal.replace("_", " ")}
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
