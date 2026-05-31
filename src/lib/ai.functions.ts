import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanoTreino } from "./plan-types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

// ==================== SYSTEM PROMPTS ====================
const SYSTEM_PROMPT_PLANO = `Você é um treinador de corrida e força para atletas amadores que treinam em casa.
Gere um plano semanal personalizado em português brasileiro, equilibrando corrida (aquecimento, treino principal, desaquecimento)
e musculação adaptada ao equipamento disponível, com dias de mobilidade e descanso.
Retorne APENAS um JSON válido seguindo EXATAMENTE este schema (sem markdown, sem comentários):
{
  "semana": [
    {
      "dia": "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sab" | "Dom",
      "data": "Segunda-feira" (nome completo),
      "tarefas": [
        { "id": "seg-1", "tipo": "corrida"|"musculacao"|"mobilidade"|"descanso", "titulo": "string", "detalhe": "string", "duracao_min": number }
      ]
    } // sempre 7 dias
  ],
  "corrida": [
    { "dia": "Segunda-feira", "titulo": "string", "aquecimento": "string", "principal": "string", "desaquecimento": "string", "notas": "string" }
  ],
  "musculacao": [
    { "dia": "Terça-feira", "titulo": "string", "foco": "string",
      "exercicios": [ { "nome": "string", "series": number, "repeticoes": "string", "notas": "string" } ] }
  ]
}
Regras:
- Distribua o número de dias de treino conforme a disponibilidade do usuário; preencha o restante com mobilidade ou descanso.
- Use APENAS equipamentos informados pelo usuário (peso corporal sempre é uma opção).
- Adapte volume e intensidade ao nível (iniciante/intermediario/avancado) e ao objetivo (resistencia/velocidade/perda_peso/prevencao_lesoes).
- Use ids únicos por tarefa (ex: "seg-1", "ter-1").`;

const SYSTEM_PROMPT_CHAT = `Você é o Treinador IA do HYBRO (Stride) — um coach de corrida + musculação em casa extremamente competente, empático, estratégico e com "vida própria".
Você conhece profundamente o usuário: perfil, plano atual, histórico de treino e conversas anteriores.
Seu objetivo é ser o treinador pessoal dele: motivar, prevenir lesões, otimizar recuperação e progressão a longo prazo.
=== REGRAS IMPORTANTES ===
- Responda SEMPRE em português brasileiro, tom motivador + técnico.
- Seja proativo: faça perguntas quando precisar de mais contexto.
- Quando o usuário relatar cansaço, dor, exagero (ex: correu muito mais que o planejado, bebeu álcool, etc), analise o impacto e proponha um plano de recuperação claro.
- Você pode e deve sugerir alterações no plano quando necessário usando a ferramenta updatePlano.
- Seja um treinador que realmente se importa com o atleta.`;

// ==================== CALL GATEWAY ====================
async function callGateway(
  messages: Array<{ role: string; content: string }>,
  jsonMode = false
) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (res.status === 429)
    throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
  if (res.status === 402)
    throw new Error("Créditos de IA esgotados no workspace.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha na IA (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ==================== GERAR PLANO ====================
export const gerarPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1),
        nivel_corrida: z.enum(["iniciante", "intermediario", "avancado"]),
        dias_disponiveis: z.number().int().min(2).max(7),
        objetivo_principal: z.enum([
          "resistencia",
          "velocidade",
          "perda_peso",
          "prevencao_lesoes",
        ]),
        equipamentos_casa: z.array(z.string()).min(1),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const userPrompt = `Gere o plano para:
- Nome: ${data.name}
- Nível de corrida: ${data.nivel_corrida}
- Dias disponíveis por semana: ${data.dias_disponiveis}
- Objetivo principal: ${data.objetivo_principal}
- Equipamentos em casa: ${data.equipamentos_casa.join(", ")}`;

    const raw = await callGateway(
      [
        { role: "system", content: SYSTEM_PROMPT_PLANO },
        { role: "user", content: userPrompt },
      ],
      true
    );

    let plano: PlanoTreino;
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      plano = JSON.parse(cleaned);
    } catch (e) {
      throw new Error("A IA retornou um plano inválido. Tente novamente.");
    }

    const { supabase, userId } = context;

    await supabase
      .from("profiles")
      .update({
        name: data.name,
        nivel_corrida: data.nivel_corrida,
        dias_disponiveis: data.dias_disponiveis,
        objetivo_principal: data.objetivo_principal,
        equipamentos_casa: data.equipamentos_casa,
        onboarding_completed: true,
      })
      .eq("user_id", userId);

    await supabase
      .from("planos_treino")
      .update({ ativo: false })
      .eq("user_id", userId)
      .eq("ativo", true);

    const { data: inserted, error } = await supabase
      .from("planos_treino")
      .insert({ user_id: userId, plano: plano, ativo: true })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return { id: inserted.id, plano };
  });

// ==================== CHAT COACH ====================
export const chatCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ message: z.string().min(1).max(4000) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await supabase.from("mensagens_chat").insert({
      user_id: userId,
      role: "user",
      content: data.message,
    });

    const [historyRes, planoRes, profileRes, progressoRes] = await Promise.all([
      supabase
        .from("mensagens_chat")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(30),

      supabase
        .from("planos_treino")
        .select("id, plano")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),

      supabase
        .from("progresso_diario")
        .select("*")
        .eq("user_id", userId)
        .gte(
          "data",
          new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)
        ),
    ]);

    const profile = profileRes.data;
    const planoRow = planoRes.data;
    const progresso = progressoRes.data || [];

    const contextText = `
Perfil do usuário:
${JSON.stringify(profile, null, 2)}

Plano Atual (ID: ${planoRow?.id}):
${planoRow ? JSON.stringify(planoRow.plano).slice(0, 7000) : "Nenhum plano ativo"}

Progresso recente (últimas 2 semanas):
${JSON.stringify(progresso, null, 2)}
`.trim();

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT_CHAT}\n\n${contextText}` },
      ...(historyRes.data ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const reply = await callGateway(messages);

    await supabase.from("mensagens_chat").insert({
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    return { reply, planoId: planoRow?.id };
  });

// ==================== ATUALIZAR PLANO ====================
export const updatePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        planoId: z.string().uuid(),
        novoPlano: z.any(),
        motivo: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await supabase
      .from("planos_treino")
      .update({ ativo: false })
      .eq("user_id", userId)
      .eq("id", data.planoId);

    const { error } = await supabase.from("planos_treino").insert({
      user_id: userId,
      plano: data.novoPlano,
      ativo: true,
    });

    if (error) throw error;

    return { success: true, message: "Plano atualizado com sucesso pela IA!" };
  });

// ==================== STRAVA INTEGRATION ====================
export const connectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectUri = `${process.env.VITE_APP_URL}/auth/strava/callback`;

    const authUrl = `https://www.strava.com/oauth/mobile/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&approval_prompt=force&scope=read,activity:read_all`;

    return { authUrl };
  });

export const saveStravaToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: data.code,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) throw new Error("Falha ao obter token do Strava");

    const tokenData = await response.json();

    await supabase.from("strava_tokens").upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      athlete_id: tokenData.athlete.id,
    });

    return { success: true, message: "Conta Strava conectada com sucesso!" };
  });
