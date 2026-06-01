import { supabase } from "@/integrations/supabase/client";

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

export async function gerarPlano(data: {
  name: string;
  nivel_corrida: string;
  dias_disponiveis: number;
  objetivo_principal: string;
  equipamentos_casa: string[];
}) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/gerar-plano", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function chatCoach(data: { message: string }) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/chat-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updatePlano(data: {
  planoId: string;
  novoPlano: unknown;
  motivo?: string;
}) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/update-plano", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function connectStrava() {
  const headers = await getAuthHeader();
  const res = await fetch("/api/connect-strava", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveStravaToken(data: { code: string }) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/save-strava-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}