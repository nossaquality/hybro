import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/data";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setTarget("/login");
      const profile = await getProfile();
      setTarget(profile?.onboarding_completed ? "/app" : "/onboarding");
    })();
  }, []);

  if (!target) return null;
  return <Navigate to={target} />;
}
