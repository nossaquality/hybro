// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada no servidor." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 1. Extrai o userInput vindo do frontend
    const { userInput, systemPrompt } = await req.json()
    if (!userInput) {
      return new Response(
        JSON.stringify({ error: "Dados do usuário (userInput) não fornecidos." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. AQUI ENTRA O SEU USER PROMPT EXATAMENTE ONDE DEVE FICAR:
    const userPrompt = `Monte o plano híbrido semanal em JSON conforme o schema, baseado nestes dados do usuário:

Nome: ${userInput.name || "Atleta"}
Nível de corrida: ${userInput.nivel_corrida || "Iniciante"}
Dias disponíveis por semana: ${userInput.dias_disponiveis || 4}
Objetivo principal: ${userInput.objetivo_principal || "Resistência"}
Equipamentos em casa: ${(userInput.equipamentos_casa ?? []).join(", ") || "apenas peso corporal"}

Responda APENAS com o JSON válido (sem markdown, sem comentários).`;

    const defaultSystemPrompt = "Você é um treinador especialista em corrida e musculação (treino híbrido). Monte um cronograma perfeito focado nos objetivos do usuário e retorne um objeto JSON puro.";

    // 3. Faz a chamada real para a IA (Gemini 2.5 Flash via Lovable Gateway)
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt || defaultSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI Gateway error:", aiRes.status, text);
      return new Response(
        JSON.stringify({ error: `Falha na IA (${aiRes.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Resposta da IA vazia." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 4. Trata e valida se a IA respondeu um JSON correto
    let plano: unknown;
    try {
      plano = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return new Response(
          JSON.stringify({ error: "Resposta da IA não contém um JSON válido." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      plano = JSON.parse(match[0]);
    }

    // 5. Retorna o plano montado de verdade para o frontend!
    return new Response(
      JSON.stringify({ plano }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})