import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { saveStravaToken } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/strava/callback")({
  component: StravaCallback,
});

function StravaCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      toast.error("Erro ao conectar com o Strava");
      navigate({ to: "/app/settings" });
      return;
    }

    if (code) {
      saveStravaToken({ code })
        .then(() => {
          toast.success("Strava conectado com sucesso!");
          navigate({ to: "/app/settings" });
        })
        .catch(() => {
          toast.error("Falha ao salvar conexão com Strava");
          navigate({ to: "/app/settings" });
        });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-xl">Conectando sua conta Strava...</p>
        <p className="text-muted-foreground mt-2">Aguarde um momento</p>
      </div>
    </div>
  );
}