import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Variáveis de ambiente ausentes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Mensagem inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Autenticar usuário
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader },
    });

    if (!authRes.ok) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await authRes.json();
    const userId = userData?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Carregar contexto em paralelo
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

    const [planoList, profileList, historyList] = await Promise.all([
      planoRes.ok ? planoRes.json() : [],
      profileRes.ok ? profileRes.json() : [],
      historyRes.ok ? historyRes.json() : [],
    ]);

    const planoJson = planoList[0]?.plano_json;
    const profileData = profileList[0];
    const historyData = historyList || [];

    // Montar contexto
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

    // Chamar IA
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
      const errText = await aiRes.text();
      console.error(`IA error ${aiRes.status}:`, errText);
      
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Falha ao chamar a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    const aiMessage = aiJson?.choices?.[0]?.message || {};
    let finalReply = (aiMessage.content || "").trim() || "";
    const toolCalls = aiMessage.tool_calls || [];

    // Processar tool calls
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall?.function?.name === "atualizar_plano_treino") {
          try {
            const argumentos = JSON.parse(toolCall.function.arguments || "{}");
            const novoPlamoJson = JSON.parse(argumentos.novo_plano_json || "{}");

            const updateRes = await fetch(
              `${SUPABASE_URL}/rest/v1/planos_treino?user_id=eq.${userId}&ativo=eq.true`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({ plano_json: novoPlamoJson }),
              }
            );

            if (!updateRes.ok) {
              finalReply = "Erro ao atualizar plano. Tente novamente.";
            } else {
              // Segunda chamada à IA
              const updatedMessages = [
                ...messages,
                { role: "assistant", content: aiMessage.content || "" },
                {
                  role: "tool",
                  tool_call_id: toolCall.id || "",
                  content: "Plano atualizado com sucesso.",
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
                finalReply = (aiJson2?.choices?.[0]?.message?.content || "").trim();
                if (!finalReply) {
                  finalReply = "Plano atualizado com sucesso!";
                }
              } else {
                finalReply = "Plano atualizado com sucesso!";
              }
            }
          } catch (e) {
            console.error("Tool call error:", e);
            finalReply = "Erro ao processar atualização.";
          }
        }
      }
    }

    return new Response(JSON.stringify({ reply: finalReply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({
        error: "Erro interno",
        details: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
