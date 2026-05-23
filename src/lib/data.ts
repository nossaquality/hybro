import { supabase } from "@/integrations/supabase/client";
import type { PlanoTreino } from "./plan-types";

export type Esforco = "Facil" | "Medio" | "Dificil";

export interface ProgressoEntry {
  task_id: string;
  data: string;
  completed: boolean;
  esforco?: Esforco | null;
  mood?: string | null;
}

export interface Profile {
  user_id: string;
  name: string | null;
  nivel_corrida: string | null;
  dias_disponiveis: number | null;
  objetivo_principal: string | null;
  equipamentos_casa: string[] | null;
  onboarding_completed: boolean;
}

let memoryProfile: Profile | null = null;

export function forceOnboardingCompletedInMemory(patch?: Partial<Profile>) {
  memoryProfile = {
    user_id: memoryProfile?.user_id ?? "",
    name: memoryProfile?.name ?? null,
    nivel_corrida: memoryProfile?.nivel_corrida ?? null,
    dias_disponiveis: memoryProfile?.dias_disponiveis ?? null,
    objetivo_principal: memoryProfile?.objetivo_principal ?? null,
    equipamentos_casa: memoryProfile?.equipamentos_casa ?? null,
    ...(patch ?? {}),
    onboarding_completed: true,
  };
}

export function clearProfileMemory() {
  memoryProfile = null;
}

export async function getProfile(): Promise<Profile | null> {
  if (memoryProfile?.onboarding_completed) return memoryProfile;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (data) memoryProfile = data as Profile;
  return (data as Profile) ?? null;
}

export async function getActivePlan(): Promise<PlanoTreino | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("planos_treino")
    .select("plano") // CORREÇÃO TS: Mudado de plano_json para plano
    .eq("user_id", user.id)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.plano as unknown as PlanoTreino) ?? null; // CORREÇÃO TS: Lendo de plano
}

export async function getTodayProgress(): Promise<Record<string, ProgressoEntry>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("progresso_diario")
    .select("task_id, data, completed, esforco, mood")
    .eq("user_id", user.id)
    .eq("data", today);
  const map: Record<string, ProgressoEntry> = {};
  for (const row of data ?? []) map[row.task_id] = row as ProgressoEntry;
  return map;
}

export async function saveProgress(taskId: string, completed: boolean, esforco?: Esforco) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("progresso_diario")
    .upsert(
      { user_id: user.id, data: today, task_id: taskId, completed, esforco: esforco ?? null },
      { onConflict: "user_id,data,task_id" },
    );
}

export async function getChatMessages() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("mensagens_chat")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// Returns the index in the plan's "semana" matching today's weekday (0 = Mon).
export function getTodayIndex(): number {
  // JS: 0=Sunday..6=Saturday. Convert to Mon=0..Sun=6.
  const js = new Date().getDay();
  return (js + 6) % 7;
}
