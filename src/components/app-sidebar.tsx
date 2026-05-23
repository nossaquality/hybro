import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Activity, CalendarDays, Footprints, Dumbbell, Sparkles, Home, LogOut, UserCircle2, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Início / Hoje", url: "/app", icon: Home },
  { title: "Calendário Semanal", url: "/app/calendar", icon: CalendarDays },
  { title: "Planilha · Corrida", url: "/app/running", icon: Footprints },
  { title: "Planilha · Musculação", url: "/app/strength", icon: Dumbbell },
  { title: "Mobilidade & Pliometria", url: "/app/mobility", icon: Wind },
  { title: "Chat com Treinador IA", url: "/app/coach", icon: Sparkles },
  { title: "Meu Perfil", url: "/app/profile", icon: UserCircle2 },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Activity className="h-5 w-5" />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">HYBRO IA</span>
            <span className="text-xs text-muted-foreground">Seu Treino Híbrido inteligente</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.url === "/app"
                    ? pathname === "/app" || pathname === "/app/"
                    : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
