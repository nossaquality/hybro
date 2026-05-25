// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é um Treinador Híbrido de Elite, especialista em concurrent training (corrida + musculação), inspirado em Alex Viada. Seu papel é ser o parceiro mais experiente do atleta, orientando treinos, recuperação e performance.

DIRETRIZES CRÍTICAS:

1. SE O ATLETA RELATA CANSAÇO, DORES (joelho, costas, etc.), LESÕES OU IMPREVISTOS DE AGENDA:
   → Você DEVE usar a tool 'atualizar_plano_treino' para reorganizar inteligentemente a semana no banco de dados.
   → Gere um novo_plano_json válido mantendo a EXATA estrutura de chaves do plano original.
   → Explique as mudanças ao atleta de forma empática e científica.

2. SE O ATLETA FALA SOBRE ALIMENTAÇÃO, MACROS, RECOVERY, HIDRATAÇÃO, SONO:
   → Forneça consultoria científica detalhada APENAS EM TEXTO.
   → NÃO use a tool neste caso. Apenas texto puro.

3. NOTA DE SAÚDE GRAVE:
   → Se o atleta relatar dores graves, persistentes ou que limitam movimento, oriente-o FIRMEMENTE a buscar médico/fisioterapeuta antes de treinar.

4. COMPORTAMENTO GERAL:
   - Sempre considere o plano ativo do usuário para contextualizar respostas.
   - Analise impacto na fadiga, sistema nervoso, recuperação quando o usuário relata treinos.
   - Sugira ajustes concretos (intensidade, ordem, mobilidade, nutrição, sono).
   - Use linguagem direta, empática, em português do Brasil. Nada genérico.
   - Não invente exercícios fora do plano sem justificar.
   - Respostas curtas a médias (~6 parágrafos máx). Use markdown leve quando ajudar.`;

serve(async (req) => {
  console.log(`[CHAT-COACH] Requisição recebida: ${req.method}`);

  // CORS: Intercepta OPTIONS com status 200 imediato
  if (req.method === "OPTIONS") {
    console.log("[CHAT-COACH] Respondendo a OPTIONS");
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // === VALIDAÇÃO DE AMBIENTE ===
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("[CHAT-COACH] LOVABLE_API_KEY não configurada");
      return new Response(
        JSON.stringify({
          error: "LOVABLE_API_KEY não configurada",
          details: "Verifique variáveis de ambiente no Supabase",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[CHAT-COACH] Credenciais Supabase ausentes");
      return new Response(
        JSON.stringify({
          error: "Credenciais Supabase incompletas",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // === PARSE DO BODY ===
    let message = "";
    try {
      const bodyJson = await req.json();
      message = bodyJson?.message || "";
    } catch (bodyErr) {
      console.error("[CHAT-COACH] Erro ao fazer parse do body:", bodyErr);
      return new Response(
        JSON.stringify({
          error: "Body JSON inválido",
          details: bodyErr instanceof Error ? bodyErr.message : "Parse falhou",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!message || typeof message !== "string") {
      console.error("[CHAT-COACH] Mensagem ausente ou tipo inválido");
      return new Response(
        JSON.stringify({ error: "Mensagem inválida ou ausente" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[CHAT-COACH] Mensagem recebida: "${message.substring(0, 50)}..."`);

    // === AUTENTICAÇÃO ===
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error("[CHAT-COACH] Erro ao obter usuário:", userErr);
      return new Response(JSON.stringify({ error: "Erro de autenticação" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userData?.user?.id) {
      console.error("[CHAT-COACH] Usuário não autenticado");
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log(`[CHAT-COACH] Usuário autenticado: ${userId}`);

    // === CARREGAR CONTEXTO ===
    console.log("[CHAT-COACH] Carregando contexto (plano, perfil, histórico)...");
    let planoRow = null;
    let profile = null;
    let history = [];

    // Plano
    try {
      const planoRes = await supabase
        .from("planos_treino")
        .select("plano_json")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (planoRes.error) {
        console.error("[CHAT-COACH] Erro ao buscar plano:", planoRes.error);
      } else {
        planoRow = planoRes.data;
        console.log(`[CHAT-COACH] Plano carregado: ${planoRow ? "sim" : "não"}`);
      }
    } catch (e) {
      console.error("[CHAT-COACH] Exceção ao carregar plano:", e);
    }

    // Perfil
    try {
      const profileRes = await supabase
        .from("profiles")
        .select(
          "name, nivel_corrida, dias_disponiveis, objetivo_principal, equipamentos_casa"
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (profileRes.error) {
        console.error("[CHAT-COACH] Erro ao buscar perfil:", profileRes.error);
      } else {
        profile = profileRes.data;
        console.log(`[CHAT-COACH] Perfil carregado: ${profile ? "sim" : "não"}`);
      }
    } catch (e) {
      console.error("[CHAT-COACH] Exceção ao carregar perfil:", e);
    }

    // Histórico
    try {
      const historyRes = await supabase
        .from("mensagens_chat")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (historyRes.error) {
        console.error("[CHAT-COACH] Erro ao buscar histórico:", historyRes.error);
      } else {
        history = historyRes.data || [];
        console.log(`[CHAT-COACH] Histórico carregado: ${history.length} mensagens`);
      }
    } catch (e) {
      console.error("[CHAT-COACH] Exceção ao carregar histórico:", e);
    }

    // === MONTAR CONTEXTO ===
    const planoStr = planoRow?.plano_json
      ? JSON.stringify(planoRow.plano_json).slice(0, 8000)
      : "Nenhum plano ativo.";
    const profileStr = profile
      ? JSON.stringify(profile)
      : "Perfil não preenchido.";

    const histAsc = (history ?? [])
      .slice()
      .reverse()
      .map((m) => ({
        role: (m && m.role) || "user",
        content: (m && m.content) || "",
      }));

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
          description:
            "Atualiza o plano de treino do atleta no banco de dados quando há cansaço, dores, lesões ou imprevistos de agenda.",
          parameters: {
            type: "object",
            properties: {
              novo_plano_json: {
                type: "string",
                description:
                  "JSON string contendo o plano de treino atualizado, mantendo exatamente a estrutura de chaves original.",
              },
            },
            required: ["novo_plano_json"],
          },
        },
      },
    ];

    // === CHAMADA À IA ===
    console.log("[CHAT-COACH] Enviando mensagens para IA...");
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools,
        }),
      }
    );

    console.log(`[CHAT-COACH] Resposta da IA: status ${aiRes.status}`);

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error(`[CHAT-COACH] Erro da IA gateway (${aiRes.status}):`, text);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de uso atingido. Tente novamente em instantes.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos da IA esgotados. Adicione créditos no workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({
          error: "Falha ao chamar a IA",
          details: `Status ${aiRes.status}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiJson = await aiRes.json();
    console.log("[CHAT-COACH] JSON da IA parseado com sucesso");

    const aiMessage = aiJson?.choices?.[0]?.message || {};

    if (!aiMessage) {
      console.error("[CHAT-COACH] aiMessage está vazio");
      return new Response(
        JSON.stringify({ error: "IA retornou resposta vazia" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let finalReply = (aiMessage.content || "").trim() || "";
    const toolCalls = aiMessage.tool_calls || [];

    console.log(
      `[CHAT-COACH] Resposta da IA: reply="${finalReply.substring(0, 50)}...", tool_calls=${toolCalls.length}`
    );

    // === PROCESSAR TOOL CALLS ===
    if (toolCalls && toolCalls.length > 0) {
      console.log(`[CHAT-COACH] Processando ${toolCalls.length} tool call(s)...`);
      for (const toolCall of toolCalls) {
        if (toolCall?.function?.name === "atualizar_plano_treino") {
          try {
            console.log("[CHAT-COACH] Atualizando plano de treino...");
            const argumentos = JSON.parse(toolCall.function.arguments || "{}");
            const novoPlamoJson = JSON.parse(
              argumentos.novo_plano_json || "{}"
            );

            const { error: updateErr } = await supabase
              .from("planos_treino")
              .update({ plano_json: novoPlamoJson })
              .eq("user_id", userId)
              .eq("ativo", true);

            if (updateErr) {
              console.error("[CHAT-COACH] Erro ao atualizar plano:", updateErr);
              finalReply =
                "Não consegui atualizar seu plano agora. Tente novamente em instantes.";
            } else {
              console.log("[CHAT-COACH] Plano atualizado com sucesso!");

              // Segunda chamada à IA
              const updatedMessages = [
                ...messages,
                { role: "assistant", content: aiMessage.content || "" },
                {
                  role: "tool",
                  tool_call_id: toolCall.id || "",
                  content:
                    "Plano de treino atualizado com sucesso no banco de dados.",
                },
              ];

              const aiRes2 = await fetch(
                "https://ai.gateway.lovable.dev/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: updatedMessages,
                  }),
                }
              );

              if (aiRes2.ok) {
                const aiJson2 = await aiRes2.json();
                finalReply = (
                  aiJson2?.choices?.[0]?.message?.content || ""
                ).trim();
                if (!finalReply) {
                  finalReply =
                    "Plano atualizado com sucesso! Suas mudanças foram salvas.";
                }
                console.log("[CHAT-COACH] Segunda chamada à IA concluída");
              } else {
                finalReply =
                  "Plano atualizado com sucesso! Suas mudanças foram salvas.";
                console.log("[CHAT-COACH] Segunda chamada falhou, retornando mensagem padrão");
              }
            }
          } catch (parseErr) {
            console.error("[CHAT-COACH] Erro ao processar tool call:", parseErr);
            finalReply =
              "Houve um erro ao processar a atualização. Tente novamente.";
          }
        }
      }
    }

    console.log("[CHAT-COACH] Retornando resposta final ao cliente");
    return new Response(JSON.stringify({ reply: finalReply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[CHAT-COACH] ❌ ERRO CRÍTICO:", e);
    if (e instanceof Error) {
      console.error("[CHAT-COACH] Stack trace:", e.stack);
      console.error("[CHAT-COACH] Mensagem:", e.message);
      console.error("[CHAT-COACH] Causa:", e.cause);
    }
    return new Response(
      JSON.stringify({
        error: "Erro interno da Edge Function",
        details: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
