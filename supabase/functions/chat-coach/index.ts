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
  // CORS: Intercepta OPTIONS com status 200 imediato
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const bodyJson = await req.json();
    const { message } = bodyJson || {};
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Mensagem inválida" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // === Contexto: plano ativo + perfil + histórico ===
    const [{ data: planoRow }, { data: profile }, { data: history }] =
      await Promise.all([
        supabase
          .from("planos_treino")
          .select("plano_json")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select(
            "name, nivel_corrida, dias_disponiveis, objetivo_principal, equipamentos_casa"
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("mensagens_chat")
          .select("role, content")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const planoStr = planoRow?.plano_json
      ? JSON.stringify(planoRow.plano_json).slice(0, 8000)
      : "Nenhum plano ativo.";
    const profileStr = profile
      ? JSON.stringify(profile)
      : "Perfil não preenchido.";

    // Mapeamento do histórico com fallback para strings vazias
    const histAsc = (history ?? [])
      .slice()
      .reverse()
      .map((m) => ({
        role: m?.role || "user",
        content: m?.content || "",
      }));

    // === Primeira chamada à IA com tools ===
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

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, text);
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
            error:
              "Créditos da IA esgotados. Adicione créditos no workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return new Response(JSON.stringify({ error: "Falha ao chamar a IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const aiMessage = aiJson?.choices?.[0]?.message || {};

    if (!aiMessage) {
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

    // === Se há tool_calls, processa a atualização ===
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall?.function?.name === "atualizar_plano_treino") {
          try {
            // Parse seguro dos argumentos
            const argumentos = JSON.parse(toolCall.function.arguments || "{}");
            const novoPlamoJson = JSON.parse(
              argumentos.novo_plano_json || "{}"
            );

            // Atualiza no banco de dados
            const { error: updateErr } = await supabase
              .from("planos_treino")
              .update({ plano_json: novoPlamoJson })
              .eq("user_id", userId)
              .eq("ativo", true);

            if (updateErr) {
              console.error("Erro ao atualizar plano:", updateErr);
              finalReply =
                "Não consegui atualizar seu plano agora. Tente novamente em instantes.";
            } else {
              // === Segunda chamada à IA com histórico atualizado ===
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
              } else {
                finalReply =
                  "Plano atualizado com sucesso! Suas mudanças foram salvas.";
              }
            }
          } catch (parseErr) {
            console.error("Erro ao fazer parse da tool call:", parseErr);
            finalReply =
              "Houve um erro ao processar a atualização. Tente novamente.";
          }
        }
      }
    }

    // === Retorno final (sempre JSON { reply: ... } com corsHeaders) ===
    return new Response(JSON.stringify({ reply: finalReply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro interno detalhado na execução:", e);
    if (e instanceof Error) {
      console.error("Stack trace:", e.stack);
      console.error("Mensagem:", e.message);
    }
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
