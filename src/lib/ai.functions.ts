import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanoTreino } from "./plan-types";

// Tipo auxiliar para Supabase Json
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ====================== CONFIGURAÇÃO GEMINI ======================
const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT_PLANO = `Você é um treinador de corrida e força para atletas amadores que treinam em casa.
Gere um plano semanal personalizado em português brasileiro, equilibrando corrida (aquecimento, treino principal, desaquecimento)
e musculação adaptada ao equipamento disponível, com dias de mobilidade e descanso.

Retorne APENAS um JSON válido seguindo EXATAMENTE este schema (sem markdown, sem comentários, sem explicações):
{
  "semana": [
    {
      "dia": "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sab" | "Dom",
      "data": "Segunda-feira",
      "tarefas": [
        { "id": "string", "tipo": "corrida"|"musculacao"|"mobilidade"|"descanso", "titulo": "string", "detalhe": "string", "duracao_min": number }
      ]
    }
  ],
  "corrida": [
    { "dia": "string", "titulo": "string", "aquecimento": "string", "principal": "string", "desaquecimento": "string", "notas": "string" }
  ],
  "musculacao": [
    { "dia": "string", "titulo": "string", "foco": "string",
      "exercicios": [ { "nome": "string", "series": number, "repeticoes": "string", "notas": "string" } ] }
  ]
}

Regras importantes:
- Sempre retorne exatamente 7 dias na semana.
- Use APENAS os equipamentos informados (peso corporal sempre disponível).
- Adapte ao nível e objetivo do usuário.
- Use ids únicos (ex: seg-1, ter-1).`;

const SYSTEM_PROMPT_CHAT = `Você é o Treinador IA do app HYBRO. Responda SEMPRE em português brasileiro,
de forma curta (no máximo 3 frases), motivadora e empática. Use o plano atual do usuário para dar sugestões práticas.`;

function maskApiKey(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "***";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)} (${trimmed.length} chars)`;
}

function getInvisibleCharCodes(value: string) {
  return Array.from(value)
    .map((char, index) => ({ char, index, code: char.charCodeAt(0) }))
    .filter(({ code }) => code <= 32 || code === 127 || code === 65279);
}

async function callGateway(rawApiKey: string | undefined, messages: Array<{ role: string; content: string }>, jsonMode = false) {
  const apiKey = rawApiKey?.trim();

  console.log(
    "🔐 Gemini - GEMINI_API_KEY no runtime:",
    rawApiKey ? maskApiKey(rawApiKey) : "Undefined",
    rawApiKey ? { rawLength: rawApiKey.length, normalizedLength: apiKey?.length, invisibleChars: getInvisibleCharCodes(rawApiKey) } : "",
  );

  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY ausente em process.env no runtime do servidor");
    throw new Error("GEMINI_API_KEY não configurada no servidor. Cadastre o secret no Lovable Cloud.");
  }

  const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  console.log(`🔄 Gemini - Modelo: ${MODEL}`);

  // Separa system prompt
  const systemMessage = messages.find(m => m.role === "system");
  const chatMessages = messages.filter(m => m.role !== "system");

  const contents: any[] = [];

  if (systemMessage) {
    contents.push({
      role: "user",
      parts: [{ text: `[INSTRUÇÕES DO SISTEMA]\n${systemMessage.content}` }]
    });
    contents.push({
      role: "model",
      parts: [{ text: "Entendido. Vou seguir todas as instruções." }]
    });
  }

  chatMessages.forEach(m => {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    });
  });

  if (jsonMode && contents.length > 0) {
    const last = contents[contents.length - 1];
    if (last.role === "user") {
      last.parts[0].text += "\n\nResponda APENAS com um JSON válido, sem markdown, sem ```json, sem explicações.";
    }
  }

  const requestBody = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  };

  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await res.text();

  if (!res.ok) {
    console.error("❌ Gemini Error:", res.status, responseText);
    throw new Error(`Falha na IA (${res.status}): ${responseText.slice(0, 300)}`);
  }

  const data = JSON.parse(responseText);
  let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (jsonMode) {
    textResult = textResult
      .replace(/```json\s?/g, "")
      .replace(/```\s?$/g, "")
      .trim();
  }

  return textResult;
}

// ====================== GERAR PLANO ======================
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
- Equipamentos: ${data.equipamentos_casa.join(", ")}`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const raw = await callGateway(
      geminiApiKey,
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
      console.error("JSON Parse Error:", e);
      throw new Error("A IA retornou um plano inválido. Tente novamente.");
    }

    const { supabase, userId } = context;

    // Atualiza perfil
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

    // Desativa planos antigos
    await supabase
      .from("planos_treino")
      .update({ ativo: false })
      .eq("user_id", userId)
      .eq("ativo", true);

    // Insere novo plano (com cast para Json)
    const { data: inserted, error } = await supabase
      .from("planos_treino")
      .insert({ 
        user_id: userId, 
        plano: plano as unknown as Json,     // ✅ Correção definitiva
        ativo: true 
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return { id: inserted.id, plano };
  });

// ====================== CHAT COACH ======================
export const chatCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ message: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await supabase
      .from("mensagens_chat")
      .insert({ user_id: userId, role: "user", content: data.message });

    const { data: history } = await supabase
      .from("mensagens_chat")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    const { data: planoRow } = await supabase
      .from("planos_treino")
      .select("plano")
      .eq("user_id", userId)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planoContext = planoRow
      ? `Plano atual:\n${JSON.stringify(planoRow.plano).slice(0, 3000)}`
      : "Usuário sem plano ainda.";

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT_CHAT}\n\n${planoContext}` },
      ...((history ?? []).map((m) => ({ role: m.role, content: m.content }))),
    ];

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const reply = await callGateway(geminiApiKey, messages);

    await supabase
      .from("mensagens_chat")
      .insert({ user_id: userId, role: "assistant", content: reply });

    return { reply };
  });