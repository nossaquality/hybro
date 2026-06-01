import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT_CHAT = `Você é o Treinador IA do HYBRO — um coach de corrida + musculação em casa extremamente competente, empático, estratégico.
Você conhece profundamente o usuário: perfil, plano atual, histórico de treino e conversas anteriores.
=== REGRAS IMPORTANTES ===
- Responda SEMPRE em português brasileiro, tom motivador + técnico.
- Seja proativo: faça perguntas quando precisar de mais contexto.
- Quando o usuário relatar cansaço, dor ou exagero, analise o impacto e proponha um plano de recuperação claro.
- Seja um treinador que realmente se importa com o atleta.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Não autorizado" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return res.status(401).json({ error: "Token inválido" });

  const { message } = req.body;

  await supabase.from("mensagens_chat").insert({ user_id: user.id, role: "user", content: message });

  const [historyRes, planoRes, profileRes, progressoRes] = await Promise.all([
    supabase.from("mensagens_chat").select("role, content").eq("user_id", user.id).order("created_at", { ascending: true }).limit(30),
    supabase.from("planos_treino").select("id, plano").eq("user_id", user.id).eq("ativo", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("progresso_diario").select("*").eq("user_id", user.id).gte("data", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ]);

  const contextText = `
Perfil: ${JSON.stringify(profileRes.data, null, 2)}
Plano Atual (ID: ${planoRes.data?.id}): ${planoRes.data ? JSON.stringify(planoRes.data.plano).slice(0, 7000) : "Nenhum plano ativo"}
Progresso recente: ${JSON.stringify(progressoRes.data ?? [])}`.trim();

  const messages = [
    { role: "system", content: `${SYSTEM_PROMPT_CHAT}\n\n${contextText}` },
    ...(historyRes.data ?? []).map((m) => ({ role: m.role, content: m.content })),
  ];

  const aiRes = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LOVABLE_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!aiRes.ok) return res.status(500).json({ error: "Erro na IA" });

  const aiData = await aiRes.json();
  const reply = aiData.choices?.[0]?.message?.content ?? "";

  await supabase.from("mensagens_chat").insert({ user_id: user.id, role: "assistant", content: reply });

  return res.status(200).json({ reply, planoId: planoRes.data?.id });
}
