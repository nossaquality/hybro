import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanoTreino } from "./plan-types";

// Tipo auxiliar para Supabase Json
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ====================== ENGENHARIA DE PROMPT AVANÇADA (ATLETA HÍBRIDO) ======================
const SYSTEM_PROMPT_PLANO = `Você é um treinador especialista em Treinamento Híbrido de Elite (ciência baseada nos conceitos de Alex Viada e no método Concurrent Training). Seu objetivo é montar planilhas que desenvolvam força máxima/hipertrofia e endurance cardiovascular simultaneamente, mitigando o Efeito de Interferência.

Diretrizes Científicas de Programação que você DEVE seguir:
1. Gerenciamento de Fadiga (Estratégia High-Low): Agrupe dias de alto estresse do Sistema Nervoso Central (ex: musculação intensa de membros inferiores ou treinos de velocidade/tiros) para criar janelas claras de 48h de recuperação. Dias "Low" devem focar em Rodagens Leves (Zona 2 - LSR), Mobilidade ou Descanso Puro.
2. Musculação Inteligente: Foque em movimentos compostos/multiarticulares adaptados aos equipamentos do usuário. O foco deve ser estabilidade de core, força reativa, equilíbrio de cadeias musculares (anterior/posterior) e resiliência articular para proteger a corrida.
3. Estruturação da Corrida: Varie as intensidades de forma ondulatória através de: Treinos de Tiro (Intervalados/VO2 Máx), Tempo Runs (Limiar de Lactato) e LSR (Long Slow Run - Rodagem longa de baixa intensidade para base aeróbica).
4. Sincronização de Pernas: Nunca programe um treino pesado de membros inferiores colado a um treino longo ou de tiros de corrida. Se precisarem ocorrer no mesmo dia, defina o descanso e a ordem lógica (ex: corrida primeiro se o foco for endurance bias).

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

Regras Cruciais:
- Sempre retorne exatamente 7 dias na semana.
- Use APENAS os equipamentos informados (peso corporal sempre disponível).
- Adapte a distribuição do volume de acordo com o objetivo (ex: perda de peso vs. velocidade).
- Use ids únicos por tarefa (ex: seg-1, ter-1).`;

const SYSTEM_PROMPT_CHAT = `Você é o Treinador IA do app HYBRO, especialista em metodologia de Atleta Híbrido (corrida + força). Responda SEMPRE em português brasileiro, de forma curta (no máximo 3 frases), motivadora e com embasamento técnico de fisiologia do exercício de forma simples.`;

// ====================== CÓDIGO INTEGRADO DO LOVABLE ======================
async function callLovableAI(messages: Array<{ role: string; content: string }>, jsonMode = false) {
  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      temperature: 0.3,
      response_format: jsonMode ? { type: "json_object" } : undefined
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha na IA integrada do Lovable: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content ?? "";
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
    // Definição da Skill conectada à inteligência de atletas híbridos
    const descricoesSkill = {
      iniciante: "Iniciante (Pouco ou nenhum histórico de corrida estruturada. Foco em adaptação neuromuscular, alternando corrida e caminhada rápida. Musculação focada em estabilidade estrutural e correção postural).",
      intermediario: "Intermediário (Capaz de correr de forma contínua por 5km-10km. Foco em construir capacidade de trabalho concorrente, tolerando treinos de força de potência moderada e rodagens em Zona 2 ampliadas).",
      avancado: "Avançado (Excelente base de endurance e força. Capaz de tolerar o verdadeiro split de Atleta Híbrido: sessões de alta intensidade de Sistema Nervoso Central, treinos de tiro em limiar de VO2 máx e levantamentos compostos pesados na mesma semana)."
    };

    const userPrompt = `Gere uma planilha de treinamento concorrente híbrido estruturada para o seguinte perfil:
- Nome do Atleta: ${data.name}
- Nível de Experiência Híbrida (Skill): ${descricoesSkill[data.nivel_corrida]}
- Dias de treino por semana: ${data.dias_disponiveis} dias
- Objetivo Principal do Ciclo: ${data.objetivo_principal}
- Equipamentos disponíveis para o treino de força em casa: ${data.equipamentos_casa.join(", ")}`;

    // Chamada usando a inteligência do Lovable munida do novo conhecimento
    const raw = await callLovableAI(
      [
        { role: "system", content: SYSTEM_PROMPT_PLANO },
        { role: "user", content: userPrompt },
      ],
      true,
    );

    let plano: PlanoTreino;
    try {
      plano = JSON.parse(raw);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("A IA do Lovable gerou um esquema de treino inválido. Tente novamente.");
    }

    const { supabase, userId } = context;

    // Salva perfil
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

    // Insere novo plano híbrido
    const { data: inserted, error } = await supabase
      .from("planos_treino")
      .insert({ 
        user_id: userId, 
        plano: plano as unknown as Json,
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
      ? `Plano Híbrido Atual do Atleta:\n${JSON.stringify(planoRow.plano).slice(0, 3000)}`
      : "O atleta ainda não gerou sua planilha híbrida.";

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT_CHAT}\n\n${planoContext}` },
      ...((history ?? []).map((m) => ({ role: m.role, content: m.content }))),
    ];

    const reply = await callLovableAI(messages);

    await supabase
      .from("mensagens_chat")
      .insert({ user_id: userId, role: "assistant", content: reply });

    return { reply };
  });