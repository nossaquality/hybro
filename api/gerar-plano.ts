import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT_PLANO = `Você é um treinador de corrida e força para atletas amadores que treinam em casa.
Gere um plano semanal personalizado em português brasileiro, equilibrando corrida (aquecimento, treino principal, desaquecimento)
e musculação adaptada ao equipamento disponível, com dias de mobilidade e descanso.
Retorne APENAS um JSON válido seguindo EXATAMENTE este schema (sem markdown, sem comentários):
{
  "semana": [
    {
      "dia": "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sab" | "Dom",
      "data": "Segunda-feira",
      "tarefas": [
        { "id": "seg-1", "tipo": "corrida"|"musculacao"|"mobilidade"|"descanso", "titulo": "string", "detalhe": "string", "duracao_min": number }
      ]
    }
  ],
  "corrida": [
    { "dia": "Segunda-feira", "titulo": "string", "aquecimento": "string", "principal": "string", "desaquecimento": "string", "notas": "string" }
  ],
  "musculacao": [
    { "dia": "Terça-feira", "titulo": "string", "foco": "string",
      "exercicios": [ { "nome": "string", "series": number, "repeticoes": "string", "notas": "string" } ] }
  ]
}
Regras:
- Distribua o número de dias de treino conforme a disponibilidade do usuário.
- Use APENAS equipamentos informados pelo usuário.
- Adapte volume e intensidade ao nível e objetivo.
- Use ids únicos por tarefa.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Não autorizado" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return res.status(401).json({ error: "Token inválido" });

  const { name, nivel_corrida, dias_disponiveis, objetivo_principal, equipamentos_casa } = req.body;

  const userPrompt = `Gere o plano para:
- Nome: ${name}
- Nível de corrida: ${nivel_corrida}
- Dias disponíveis por semana: ${dias_disponiveis}
- Objetivo principal: ${objetivo_principal}
- Equipamentos em casa: ${equipamentos_casa.join(", ")}`;

  const aiRes = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT_PLANO },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiRes.ok) return res.status(500).json({ error: "Erro na IA" });

  const aiData = await aiRes.json();
  const raw = aiData.choices?.[0]?.message?.content ?? "";

  let plano;
  try {
    plano = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
  } catch {
    return res.status(500).json({ error: "Plano inválido retornado pela IA" });
  }

  await supabase.from("profiles").update({
    name, nivel_corrida,
    dias_disponiveis: [dias_disponiveis],
    objetivo_principal, equipamentos_casa,
    onboarding_completed: true,
  }).eq("user_id", user.id);

  await supabase.from("planos_treino").update({ ativo: false }).eq("user_id", user.id).eq("ativo", true);

  const { data: inserted, error } = await supabase
    .from("planos_treino")
    .insert({ user_id: user.id, plano, plano_json: plano, ativo: true })
    .select("id").single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ id: inserted.id, plano });
}
