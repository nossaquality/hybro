// @ts-nocheck
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

// Classe simples para chamadas HTTP ao Supabase (100% Deno-native)
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.authHeader = null;
  }

  setAuthHeader(header) {
    this.authHeader = header;
  }

  async request(method, path, body = null) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.key}`,
    };

    if (this.authHeader) {
      headers["Authorization"] = this.authHeader;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.url}${path}`, options);
      const data = await response.json();

      return {
        data: data,
        error: response.ok ? null : { message: data?.message || "Erro na requisição" },
        ok: response.ok,
      };
    } catch (e) {
      return {
        data: null,
        error: { message: e.message },
        ok: false,
      };
    }
  }

  // Simular from().select().eq().maybeSingle()
  async from(table) {
    const self = this;
    return {
      select: (columns) => ({
        eq: (column, value) => ({
          maybeSingle: async () => {
            const query = `?select=${columns}&${column}=eq.${value}`;
            return self.request("GET", `/rest/v1/${table}${query}`);
          },
        }),
        order: (column, options) => ({
          limit: (n) => ({
            maybeSingle: async () => {
              const query = `?select=${columns}&order=${column}.${options.ascending ? "asc" : "desc"}&limit=${n}`;
              return self.request("GET", `/rest/v1/${table}${query}`);
            },
            eq: (col, val) => ({
              maybeSingle: async () => {
                const query = `?select=${columns}&${col}=eq.${val}&order=${column}.${options.ascending ? "asc" : "desc"}&limit=${n}`;
                return self.request("GET", `/rest/v1/${table}${query}`);
              },
            }),
          }),
        }),
      }),
      update: (payload) => ({
        eq: (column, value) => ({
          eq: async (col2, val2) => {
            const query = `?${column}=eq.${value}&${col2}=eq.${val2}`;
            return self.request("PATCH", `/rest/v1/${table}${query}`, payload);
          },
        }),
      }),
    };
  }

  async auth_getUser(token) {
    try {
      const response = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { user: null, error: { message: "Não autenticado" } };
      }

      const user = await response.json();
      return { user, error: null };
    } catch (e) {
      return { user: null, error: { message: e.message } };
    }
  }
}

serve(async (req) => {
  console.log(`[CHAT-COACH] Requisição: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // === VALIDAÇÃO ===
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[CHAT-COACH] Variáveis de ambiente ausentes");
      return new Response(
        JSON.stringify({ error: "Configuração incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === PARSE BODY ===
    let message = "";
    try {
      const body = await req.json();
      message = body?.message || "";
    } catch (e) {
      console.error("[CHAT-COACH] Erro ao parsear body:", e.message);
      return new Response(
        JSON.stringify({ error: "Body inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Mensagem inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CHAT-COACH] Mensagem: "${message.substring(0, 30)}..."`);

    // === AUTENTICAÇÃO (100% Deno-native) ===
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrair token do header
    const token = authHeader.replace("Bearer ", "");

    // Chamar auth/v1/user direto (100% Deno-native)
    console.log("[CHAT-COACH] Autenticando usuário...");
    let userResponse;
    try {
      userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: authHeader },
      });
    } catch (e) {
      console.error("[CHAT-COACH] Erro ao chamar auth endpoint:", e.message);
      return new Response(
        JSON.stringify({ error: "Erro de autenticação" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userResponse.ok) {
      console.error("[CHAT-COACH] Usuário não autenticado");
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userResponse.json();
    const userId = userData?.id;

    if (!userId) {
      console.error("[CHAT-COACH] User ID não encontrado");
      return new Response(
        JSON.stringify({ error: "User ID inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CHAT-COACH] ✅ Autenticado: ${userId}`);

    // === CARREGAR CONTEXTO (via REST API Supabase - 100% Deno-native) ===
    console.log("[CHAT-COACH] Carregando contexto...");

    let planoJson = null;
    let profileData = null;
    let historyData = [];

    // Plano
    try {
      const planoUrl = `${SUPABASE_URL}/rest/v1/planos_treino?select=plano_json&user_id=eq.${userId}&ativo=eq.true&order=created_at.desc&limit=1`;
      const planoRes = await fetch(planoUrl, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (planoRes.ok) {
        const planoList = await planoRes.json();
        if (planoList.length > 0) {
          planoJson = planoList[0].plano_json;
          console.log("[CHAT-COACH] ✅ Plano carregado");
        }
      }
    } catch (e) {
      console.error("[CHAT-COACH] Erro ao carregar plano:", e.message);
    }

    // Perfil
    try {
      const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?select=name,nivel_corrida,dias_disponiveis,objetivo_principal,equipamentos_casa&user_id=eq.${userId}`;
      const profileRes = await fetch(profileUrl, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (profileRes.ok) {
        const profileList = await profileRes.json();
        if (profileList.length > 0) {
          profileData = profileList[0];
          console.log("[CHAT-COACH] ✅ Perfil carregado");
        }
      }
    } catch (e) {
      console.error("[CHAT-COACH] Erro ao carregar perfil:", e.message);
    }

    // Histórico
    try {
      const historyUrl = `${SUPABASE_URL}/rest/v1/mensagens_chat?select=role,content&user_id=eq.${userId}&order=created_at.desc&limit=10`;
      const historyRes = await fetch(historyUrl, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (historyRes.ok) {
        historyData = await historyRes.json();
        console.log(`[CHAT-COACH] ✅ Histórico carregado: ${historyData.length} msgs`);
      }
    } catch (e) {
      console.error("[CHAT-COACH] Erro ao carregar histórico:", e.message);
    }

    // === MONTAR CONTEXTO ===
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
                description: "JSON string contendo o plano de treino atualizado.",
              },
            },
            required: ["novo_plano_json"],
          },
        },
      },
    ];

    // === CHAMADA À IA ===
    console.log("[CHAT-COACH] 🚀 Chamando IA gateway...");
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

    console.log(`[CHAT-COACH] ✅ IA respondeu: HTTP ${aiRes.status}`);

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error(`[CHAT-COACH] ❌ Erro IA (${aiRes.status}):`, text);

      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite atingido" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Falha ao chamar IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    const aiMessage = aiJson?.choices?.[0]?.message || {};
    let finalReply = (aiMessage.content || "").trim() || "";
    const toolCalls = aiMessage.tool_calls || [];

    console.log(
      `[CHAT-COACH] Resposta: ${finalReply.length} chars, ${toolCalls.length} tools`
    );

    // === PROCESSAR TOOL CALLS ===
    if (toolCalls && toolCalls.length > 0) {
      console.log(`[CHAT-COACH] ⚙️ Processando ${toolCalls.length} tool call(s)...`);

      for (const toolCall of toolCalls) {
        if (toolCall?.function?.name === "atualizar_plano_treino") {
          try {
            console.log("[CHAT-COACH] → Atualizando plano...");
            const argumentos = JSON.parse(toolCall.function.arguments || "{}");
            const novoPlamoJson = JSON.parse(
              argumentos.novo_plano_json || "{}"
            );

            // UPDATE via REST API (100% Deno-native)
            const updateUrl = `${SUPABASE_URL}/rest/v1/planos_treino?user_id=eq.${userId}&ativo=eq.true`;
            const updateRes = await fetch(updateUrl, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({ plano_json: novoPlamoJson }),
            });

            if (!updateRes.ok) {
              console.error("[CHAT-COACH] Erro ao atualizar plano");
              finalReply =
                "Erro ao atualizar plano. Tente novamente.";
            } else {
              console.log("[CHAT-COACH] ✅ Plano atualizado!");

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
                finalReply = (
                  aiJson2?.choices?.[0]?.message?.content || ""
                ).trim();
                if (!finalReply) {
                  finalReply = "Plano atualizado com sucesso!";
                }
              } else {
                finalReply = "Plano atualizado com sucesso!";
              }
            }
          } catch (parseErr) {
            console.error("[CHAT-COACH] Erro ao processar tool:", parseErr);
            finalReply = "Erro ao processar atualização.";
          }
        }
      }
    }

    console.log("[CHAT-COACH] ✅ Retornando resposta");
    return new Response(JSON.stringify({ reply: finalReply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[CHAT-COACH] ❌ ERRO CRÍTICO:", e.message);
    if (e instanceof Error) {
      console.error("[CHAT-COACH] Stack:", e.stack);
    }
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
