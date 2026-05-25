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
      headers: { Authorization: authHeader },
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
          model: "mixtral-8x7b-32768",
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
              console.error(`[ERROR] Update failed: ${updateRes.status}`);
              finalReply = "Erro ao atualizar plano.";
            } else {
              console.log("[18] Plano atualizado, segunda chamada ao Groq");
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
                "https://api.groq.com/openai/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: updatedMessages,
                    temperature: 0.7,
                    max_tokens: 512,
                  }),
                }
              );

              if (aiRes2.ok) {
                const aiJson2 = await aiRes2.json();
                finalReply = (aiJson2?.choices?.[0]?.message?.content || "").trim();
                if (!finalReply) {
                  finalReply = "Plano atualizado com sucesso!";
                }
                console.log("[19] Segunda chamada concluída");
              } else {
                finalReply = "Plano atualizado com sucesso!";
                console.log("[19] Segunda chamada falhou, usando fallback");
              }
            }
          } catch (e) {
            console.error(`[ERROR] Tool call error: ${e.message}`);
            finalReply = "Erro ao processar atualização.";
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
