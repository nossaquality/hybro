import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanoTreino } from "./plan-types";

// Apontando direto para a API oficial do Google Gemini
const MODEL = "gemini-1.5-flash";

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

const SYSTEM_PROMPT_CHAT = `Você é o Treinador IA do app HYBRO. Responda SEMPRE em português brasileiro,
de forma corta (no máximo 3 frases), motivadora e empática. Use o plano atual do usuário (contexto JSON)
para sugerir ajustes objetivos (trocar dias, reduzir intensidade, substituir exercícios, dicas rápidas de
recuperação ou nutrição). Quando propor um ajuste, diga exatamente o que muda. Use um tom positivo e direto,
sem jargão excessivo. Nunca substitua um profissional de saúde.`;

async function callGateway(messages: Array<{ role: string; content: string }>, jsonMode = false) {
  // Tenta ler do ambiente ou usa a sua chave válida como padrão definitivo
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCEwYtZuCdyE4zlQ8Xob0a0STOAPvPIb8o";
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${apiKey}`;

  // Se precisar de JSON, injetamos a ordem direto na mensagem para o Google não reclamar da configuração
  let formattedMessages = [...messages];
  if (jsonMode) {
    formattedMessages = messages.map(m => {
      if (m.role === "system" || m.role === "user") {
        return { ...m, content: m.content + "\nIMPORTANT: Return ONLY a valid JSON object. Do not include any markdown formatting like ```json or text before/after." };
      }
      return m;
    });
  }

  // Formata o histórico para o padrão aceito pela API da Google
  const contents = formattedMessages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  // Captura o prompt do sistema
  const systemInstructionText = formattedMessages.find(m => m.role === "system")?.content;

  // Montamos o corpo ultra limpo, sem os campos que o Google rejeitou
  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: 0.2
    }
  };

  if (systemInstructionText) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };
  }

  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha na IA (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Se o modelo teimosamente colocar crases de markdown (```json), a gente limpa na marra
  if (jsonMode) {
    textResult = textResult.replace(/```json\s?|```/g, "").trim();
  }

  return textResult;
}

export const gerarPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1),
        nivel_corrida: z.enum(["iniciante", "intermediario", "avancado"]),
        dias_disponiveis: z.number().int().min(2).max(7),
        objetivo_principal: z.enum(["resistencia", "velocidade", "perda_peso", "prevencao_lesoes"]),
        equipamentos_casa: z.array(z.string()).min(1),
      })
      .parse(input),
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
      true,
    );

    let plano: PlanoTreino;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      plano = JSON.parse(cleaned);
    } catch (e) {
      throw new Error("A IA retornou um plano inválido. Tente novamente.");
    }

    const { supabase, userId } = context;

    // Save profile answers
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

    // Deactivate previous plans
    await supabase.from("planos_treino").update({ ativo: false }).eq("user_id", userId).eq("ativo", true);

    const { data: inserted, error } = await supabase
      .from("planos_treino")
      .insert({ user_id: userId, plano: JSON.parse(JSON.stringify(plano)), ativo: true })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: inserted.id, plano };
  });

export const chatCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        message: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Persist user message
    const { error: insertErr } = await supabase
      .from("mensagens_chat")
      .insert({ user_id: userId, role: "user", content: data.message });
    if (insertErr) throw new Error(insertErr.message);

    // Load history (last 20)
    const { data: history } = await supabase
      .from("mensagens_chat")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Load active plan for context
    const { data: planoRow } = await supabase
      .from("planos_treino")
      .select("plano")
      .eq("user_id", userId)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planoContext = planoRow
      ? `Plano ativo do usuário (JSON):\n${JSON.stringify(planoRow.plano).slice(0, 4000)}`
      : "O usuário ainda não tem um plano ativo.";

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT_CHAT}\n\n${planoContext}` },
      ...((history ?? []).map((m) => ({ role: m.role, content: m.content }))),
    ];

    const reply = await callGateway(messages);

    await supabase
      .from("mensagens_chat")
      .insert({ user_id: userId, role: "assistant", content: reply });

    return { reply };
  });