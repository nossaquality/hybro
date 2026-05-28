import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é o HYBRO Coach — o treinador de Concurrent Training mais avançado, estratégico e completo do mundo. Um sistema de inteligência de performance que atua com excelência em todos os níveis: do corredor iniciante absoluto ao atleta profissional de elite.

Seu conhecimento abrange em profundidade:
• Ciência completa da interferência (neural, metabólica, estrutural e hormonal) e estratégias avançadas de mitigação
• Periodização de alto nível: Block, Undulating, Polarized, High-Low, Conjugate, Reverse, Linear e Híbrida
• Metodologias de Renato Canova, Alex Viada, Jack Daniels, Steve Magness, Mike Israetel, Yuri Verkhoshansky e Tudor Bompa
• Biomecânica da corrida, economia de corrida, rigidez elástica, força reativa, pliometria e treinamento neuromuscular
• Treinamento de força específico adaptado por nível (iniciante, intermediário e avançado)
• Gestão avançada de fadiga do SNC, HRV, inflamação crônica, cortisol, testosterona, recuperação autonômica e supercompensação
• Nutrição esportiva completa: periodização de macros, carb cycling, timing peri-treino, recomposição corporal e emagrecimento sem perda de performance
• Prevenção, diagnóstico diferencial e reabilitação de todas as lesões comuns em corredores (patelar, aquiles, canelite, IT band, lombar, shin splints, etc.)

REGRAS DE INTELIGÊNCIA MESTRA:

1. **Adaptação por Nível**:
   - Iniciante: foco em consistência, técnica, prazer, construção de base e prevenção de lesões
   - Intermediário: progressão inteligente de volume, intensidade e força
   - Avançado/Profissional: otimização máxima de performance, peaking, periodização complexa e recuperação de elite

2. **Raciocínio Estratégico Avançado**:
   - Sempre analise o contexto completo (plano atual, histórico de conversas, queixas, recuperação, estresse de vida e objetivo)
   - Antecipe problemas com 8-16 semanas de antecedência
   - Pense como um consultor de alto rendimento

3. **Grandes Objetivos**:
   - Ao detectar qualquer objetivo significativo (maratona, meia, emagrecimento, PB, ultra, etc.):
     - Responda com confiança e clareza estratégica
     - Faça diagnóstico rápido
     - Entregue perguntas priorizadas e de altíssima qualidade
     - Construa planos progressivos, realistas e sustentáveis

4. **Perguntas Essenciais de Elite**:
   - Volume atual semanal + paces de referência
   - Dias e horários disponíveis realisticamente
   - Data da prova ou deadline do objetivo
   - Histórico completo de lesões + dores atuais
   - Qualidade do sono, estresse diário e recuperação percebida
   - Experiência e nível atual de musculação
   - Peso, idade e objetivos secundários

5. **Estilo de Resposta**:
   - Extremamente claro, direto, estratégico e conciso (máximo 8-10 linhas)
   - Adapte a linguagem: simples e motivadora para iniciantes, técnica e precisa para avançados
   - Use numeração e bullets quando ajudar na clareza
   - Seja empático, motivador e protetor da saúde acima de tudo

6. **Uso da Tool**:
   - Use 'atualizar_plano_treino' sempre que for realizar qualquer alteração concreta no plano
   - Seja conservador e protetor quando houver sinais de fadiga, dor ou recuperação comprometida

Você não é um coach comum. Você é um estrategista de performance obsessivo, cientificamente rigoroso e profundamente protetor. Seu objetivo é entregar os melhores resultados possíveis com a maior sustentabilidade e menor risco de lesão ou burnout. Seja o treinador definitivo que todo atleta sonha ter.`;

serve(async (req) => {
  console.log("[1] Iniciando requisição");
  
  if (req.method === "OPTIONS") {
    console.log("[2] OPTIONS request");
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    console.log("[3] Validando env vars");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!GROQ_API_KEY) {
      console.error("[ERROR] GROQ_API_KEY ausente");
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[ERROR] Supabase env vars ausentes");
      return new Response(
        JSON.stringify({ error: "Supabase env incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[4] Parseando body");
    const body = await req.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      console.error("[ERROR] Message invalid");
      return new Response(
        JSON.stringify({ error: "Invalid message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[5] Verificando auth header");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[ERROR] Auth header ausente");
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[6] Autenticando usuário via REST");
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!authRes.ok) {
      console.error(`[ERROR] Auth failed: ${authRes.status}`);
      return new Response(
        JSON.stringify({ error: "Auth failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await authRes.json();
    const userId = userData?.id;

    if (!userId) {
      console.error("[ERROR] User ID não encontrado");
      return new Response(
        JSON.stringify({ error: "Invalid user ID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[7] User autenticado: ${userId}`);

    console.log("[8] Carregando contexto (plano, perfil, histórico)");
    const [planoRes, profileRes, historyRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/planos_treino?select=plano_json&user_id=eq.${userId}&ativo=eq.true&order=created_at.desc&limit=1`,
        { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" } }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=name,nivel_corrida,dias_disponiveis,objetivo_principal,equipamentos_casa&user_id=eq.${userId}`,
        { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" } }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/mensagens_chat?select=role,content&user_id=eq.${userId}&order=created_at.desc&limit=10`,
        { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" } }
      ),
    ]);

    console.log(`[9] Respostas recebidas: plano=${planoRes.ok}, profile=${profileRes.ok}, history=${historyRes.ok}`);

    const [planoList, profileList, historyList] = await Promise.all([
      planoRes.ok ? planoRes.json() : [],
      profileRes.ok ? profileRes.json() : [],
      historyRes.ok ? historyRes.json() : [],
    ]);

    console.log(`[10] Dados parseados: plano=${planoList?.length || 0}, profile=${profileList?.length || 0}, history=${historyList?.length || 0}`);

    const planoJson = planoList[0]?.plano_json;
    const profileData = profileList[0];
    const historyData = historyList || [];

    const planoStr = planoJson
      ? JSON.stringify(planoJson).slice(0, 8000)
      : "Nenhum plano ativo.";
    const profileStr = profileData
      ? JSON.stringify(profileData)
      : "Perfil não preenchido.";

    const histAsc = (historyData || [])
      .slice()
      .reverse()
      .map((m) => ({
        role: m?.role || "user",
        content: m?.content || "",
      }));

    console.log("[11] Montando messages para IA");
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `Contexto do atleta:\nPerfil: ${profileStr}\n\nPlano de treino ativo (JSON):\n${planoStr}`,
      },
      ...histAsc,
      { role: "user", content: message },
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "atualizar_plano_treino",
          description: "Atualiza o plano de treino do atleta.",
          parameters: {
            type: "object",
            properties: {
              novo_plano_json: {
                type: "string",
                description: "JSON string com o plano atualizado.",
              },
            },
            required: ["novo_plano_json"],
          },
        },
      },
    ];

    console.log("[12] Chamando Groq API");
    const aiRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          tools,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1024,
        }),
      }
    );

    console.log(`[13] Groq respondeu com status: ${aiRes.status}`);

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`[ERROR] Groq error ${aiRes.status}: ${errText}`);

      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Groq call failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[14] Parseando resposta do Groq");
    const aiJson = await aiRes.json();
    const aiMessage = aiJson?.choices?.[0]?.message || {};
    let finalReply = (aiMessage.content || "").trim() || "";
    const toolCalls = aiMessage.tool_calls || [];

    console.log(`[15] Groq response: reply=${finalReply.length} chars, toolCalls=${toolCalls.length}`);

    if (toolCalls && toolCalls.length > 0) {
      console.log("[16] Processando tool calls");
      
      for (const toolCall of toolCalls) {
        if (toolCall?.function?.name === "atualizar_plano_treino") {
          try {
            console.log("[17] Atualizando plano");
            const argumentos = JSON.parse(toolCall.function.arguments || "{}");
            let novoPlanoJson;

            // Proteção contra JSON inválido
            try {
              novoPlanoJson = typeof argumentos.novo_plano_json === "string" 
                ? JSON.parse(argumentos.novo_plano_json) 
                : argumentos.novo_plano_json;
            } catch (e) {
              console.error("JSON do plano inválido");
              finalReply = "Erro ao processar o novo plano. Tente novamente.";
              continue;
            }

            if (!novoPlanoJson || typeof novoPlanoJson !== "object") {
              finalReply = "Erro: plano gerado inválido.";
              continue;
            }

            const updateRes = await fetch(
              `${SUPABASE_URL}/rest/v1/planos_treino?user_id=eq.${userId}&ativo=eq.true`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({ plano_json: novoPlanoJson }),
              }
            );

            if (!updateRes.ok) {
              const errorText = await updateRes.text();
              console.error(`[ERROR] Update failed: ${updateRes.status} - ${errorText}`);
              finalReply = "Não consegui atualizar o plano no momento. Tente novamente.";
            } else {
              console.log("[18] Plano atualizado com sucesso");
              finalReply = "Plano atualizado com sucesso! Fiz os ajustes necessários.";
            }
          } catch (e) {
            console.error(`[ERROR] Tool call error: ${e.message}`);
            finalReply = "Ocorreu um erro ao tentar atualizar o plano.";
          }
        }
      }
    }

    console.log("[20] Retornando resposta final");
    return new Response(JSON.stringify({ reply: finalReply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[CRITICAL ERROR] ${e.message}`);
    if (e instanceof Error) {
      console.error(`[STACK] ${e.stack}`);
    }
    return new Response(
      JSON.stringify({
        error: "Critical error",
        details: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
