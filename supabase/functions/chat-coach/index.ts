// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é um Treinador Híbrido de Alta Performance, especialista em concurrent training (corrida + musculação), inspirado em Alex Viada. Seu papel é responder ao atleta de forma motivadora, científica e prática.

Diretrizes:
- Sempre considere o plano de treino ativo do usuário (fornecido no contexto) para contextualizar respostas.
- Quando o usuário relatar treinos feitos (ex: "ontem corri 6km"), analise o impacto na fadiga, sistema nervoso, recuperação e na musculação programada para os próximos dias.
- Sugira ajustes concretos (intensidade, ordem dos treinos, mobilidade, nutrição, sono) quando fizer sentido.
- Use linguagem direta, empática, em português do Brasil. Evite respostas genéricas. Seja específico.
- Não invente exercícios fora do plano sem justificar. Se sugerir substituição, explique o porquê fisiológico.
- Respostas curtas a médias (máx ~6 parágrafos). Use markdown leve quando ajudar a leitura.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Mensagem inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Contexto: plano ativo + perfil + últimas mensagens
    const [{ data: planoRow }, { data: profile }, { data: history }] = await Promise.all([
      supabase.from("planos_treino").select("plano").eq("user_id", userId).eq("ativo", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("name, nivel_corrida, dias_disponiveis, objetivo_principal, equipamentos_casa")
        .eq("user_id", userId).maybeSingle(),
      supabase.from("mensagens_chat").select("role, content").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const planoStr = planoRow?.plano ? JSON.stringify(planoRow.plano).slice(0, 8000) : "Nenhum plano ativo.";
    const profileStr = profile ? JSON.stringify(profile) : "Perfil não preenchido.";
    const histAsc = (history ?? []).slice().reverse();

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `Contexto do atleta:\nPerfil: ${profileStr}\n\nPlano de treino ativo (JSON):\n${planoStr}`,
      },
      ...histAsc.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, text);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao chamar a IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const reply = aiJson?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return new Response(JSON.stringify({ error: "IA retornou resposta vazia" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
