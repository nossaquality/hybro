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
    // 1. Busca a SUA chave direto das configurações de ambiente do Supabase
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada nas variáveis de ambiente do Supabase." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 2. Extrai o userInput vindo do frontend
    const { userInput, systemPrompt } = await req.json()
    if (!userInput) {
      return new Response(
        JSON.stringify({ error: "Dados do usuário (userInput) não fornecidos." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Montagem do prompt
    const userPrompt = `Monte o plano híbrido semanal em JSON conforme o schema, baseado nestes dados do usuário:

Nome: ${userInput.name || "Atleta"}
Nível de corrida: ${userInput.nivel_corrida || "Iniciante"}
Dias disponíveis por semana: ${userInput.dias_disponiveis || 4}
Objetivo principal: ${userInput.objetivo_principal || "Resistência"}
Equipamentos em casa: ${(userInput.equipamentos_casa ?? []).join(", ") || "apenas peso corporal"}

Responda APENAS com o JSON válido (sem markdown, sem comentários).`;

    const defaultSystemPrompt = "Você é um treinador especialista em corrida e musculação (treino híbrido). Monte um cronograma perfeito focado nos objetivos do usuário e retorne um objeto JSON puro.";
    const finalSystemInstruction = systemPrompt || defaultSystemPrompt;

    // 4. Chamada DIRETA para o endpoint oficial do Google AI Studio (Gemini 2.5 Flash)
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Passando as instruções do sistema nas configurações oficiais da Google
          systemInstruction: {
            parts: [{ text: finalSystemInstruction }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            // Força a resposta a vir estruturada como JSON puro
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("Google Gemini API error:", aiRes.status, text);
      return new Response(
        JSON.stringify({ error: `Falha na API da Google (${aiRes.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiJson = await aiRes.json();
    
    // Mapeia a resposta da estrutura nativa da Google
    const content = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Resposta da Google veio sem conteúdo." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 5. Trata e valida se a resposta é um JSON correto (Ultra-blindado)
    let plano: unknown;
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      plano = JSON.parse(cleanContent);
    } catch {
      const match = cleanContent.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Conteúdo bruto que quebrou:", content);
        return new Response(
          JSON.stringify({ error: "A IA não retornou um formato JSON válido estruturado." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      try {
        plano = JSON.parse(match[0]);
      } catch (parseErr) {
        console.error("Falha ao parsear o bloco regex:", match[0], parseErr);
        return new Response(
          JSON.stringify({ error: "Erro crítico de análise no formato do plano." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // 6. Retorna o plano limpo para o front-end
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