import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { connectStrava } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Activity } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {

  async function handleConnect() {
    try {
      const { authUrl } = await connectStrava();
      window.location.href = authUrl;
    } catch (err) {
      toast.error("Erro ao conectar com Strava");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Link to="/app">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-semibold">Configurações</h1>
      </div>
      <Card className="p-8 rounded-3xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-[#FC4C02]/10 flex items-center justify-center">
            <Activity className="h-8 w-8 text-[#FC4C02]" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Conectar Strava</h2>
            <p className="text-muted-foreground">
              Deixe seu treinador IA mais inteligente
            </p>
          </div>
        </div>
        <Button
          onClick={handleConnect}
          className="w-full h-14 text-lg bg-[#FC4C02] hover:bg-[#e64402] text-white rounded-2xl"
        >
          🔗 Conectar com Strava
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Suas corridas serão usadas para ajustar seu plano automaticamente
        </p>
      </Card>
    </div>
  );
}
