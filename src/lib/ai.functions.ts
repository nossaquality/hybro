import { supabase } from "@/integrations/supabase/client";
import type { PlanoTreino } from "./plan-types";

// ====================== PROMPT AVANÇADO ======================
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
- Adapte a distribution do volume de acordo com o objetivo (ex: perda de peso vs. velocidade).
- Use ids únicos por tarefa (ex: seg-1, ter-1).`;

// ====================== GERAR PLANO ======================
export async function gerarPlano(input: {
  name: string;
  nivel_corrida: string;
  dias_disponiveis: number;
  objetivo_principal: string;
  equipamentos_casa: string[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");
  const userId = user.id;

  const { data, error: functionError } = await supabase.functions.invoke("generate-plan", {
    body: {
      userInput: input,
      systemPrompt: SYSTEM_PROMPT_PLANO,
    },
  });

  if (functionError || !data?.plano) {
    throw new Error(functionError?.message || "Falha ao gerar plano com IA");
  }

  const plano = data.plano;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: input.name,
      onboarding_completed: true,
    })
    .eq("user_id", userId);

  if (profileError) {
    console.error("Erro detalhado no profiles:", profileError);
    throw profileError;
  }

  await supabase
    .from("planos_treino")
    .update({ ativo: false })
    .eq("user_id", userId);

  const { error: planError } = await supabase
    .from("planos_treino")
    .insert({
      user_id: userId,
      plano_json: plano,
      ativo: true,
    } as any);

  if (planError) throw planError;

  return plano;
}

// ====================== CHAT COACH ======================
export async function chatCoach(input: { message: string }) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Usuário não autenticado");
  }

  const userId = session.user.id;

  // 1. Salva mensagem do usuário
  const { error: userMsgError } = await supabase
    .from("mensagens_chat")
    .insert({ user_id: userId, role: "user", content: input.message });

  if (userMsgError) throw userMsgError;

  try {
    // 2. Chama a Edge Function com token explícito
    const { data, error: fnError } = await supabase.functions.invoke("chat-coach", {
      body: { message: input.message },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (fnError || !data?.reply) {
      console.error("Erro da Edge Function:", fnError);
      const reply = "⚠️ O servidor da IA recusou a conexão. Tente novamente.";
      
      await supabase.from("mensagens_chat").insert({
        user_id: userId,
        role: "assistant",
        content: reply,
      });
      
      return { reply };
    }

    const reply = data.reply;

    // 3. Salva resposta da IA
    await supabase.from("mensagens_chat").insert({
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    return { reply };

  } catch (e) {
    console.error("Erro ao chamar chat-coach:", e);
    const reply = "Erro de comunicação com o treinador IA.";

    await supabase.from("mensagens_chat").insert({
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    return { reply };
  }
}
