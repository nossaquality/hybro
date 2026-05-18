import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadOnboarding } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [ready, setReady] = useState(false);
  const [hasOnboarding, setHasOnboarding] = useState(false);

  useEffect(() => {
    setHasOnboarding(!!loadOnboarding());
    setReady(true);
  }, []);

  if (!ready) return null;
  return <Navigate to={hasOnboarding ? "/app" : "/onboarding"} />;
}
