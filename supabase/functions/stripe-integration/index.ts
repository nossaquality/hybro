// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // ──────────────────────────────────────────
  // ROTA 1: create-checkout-session
  // ──────────────────────────────────────────
  if (action === "create-checkout-session") {
    try {
      // 1. Valida JWT do Supabase
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Não autorizado: token ausente." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

      // Cria client com a service key para ter acesso total
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Verifica o JWT do usuário (usa o token dele para buscar o usuário)
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Não autorizado: token inválido." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Extrai priceId e successUrl do body
      const { priceId, successUrl, cancelUrl } = await req.json();
      if (!priceId) {
        return new Response(
          JSON.stringify({ error: "priceId é obrigatório." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Busca ou cria o Customer no Stripe
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, name")
        .eq("user_id", user.id)
        .single();

      let customerId = profile?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile?.name ?? undefined,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;

        // Salva o customer_id no perfil
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
      }

      // 4. Cria a sessão de checkout com trial de 7 dias
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 7,
          metadata: { supabase_user_id: user.id },
        },
        success_url: successUrl ?? `${req.headers.get("origin")}/app/billing?status=success`,
        cancel_url: cancelUrl ?? `${req.headers.get("origin")}/app/billing?status=canceled`,
        allow_promotion_codes: true,
        locale: "pt-BR",
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("[create-checkout-session] Erro:", err);
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // ──────────────────────────────────────────
  // ROTA 2: webhook (chamado pelo Stripe)
  // ──────────────────────────────────────────
  if (action === "webhook") {
    try {
      const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
      const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Verifica assinatura do Stripe para segurança
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        return new Response("Assinatura do Stripe ausente.", { status: 400 });
      }

      const body = await req.text();
      let event: Stripe.Event;

      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error("[webhook] Assinatura inválida:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }

      console.log("[webhook] Evento recebido:", event.type);

      // Helper para buscar user_id pelo stripe_customer_id
      async function getUserIdByCustomer(customerId: string): Promise<string | null> {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();
        return data?.user_id ?? null;
      }

      // Helper para atualizar o perfil
      async function updateProfile(userId: string, patch: Record<string, unknown>) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update(patch)
          .eq("user_id", userId);
        if (error) console.error("[webhook] Erro ao atualizar perfil:", error);
      }

      // ── Processar eventos ──
      switch (event.type) {

        // Trial iniciado ou assinatura criada
        case "customer.subscription.created":
        case "customer.subscription.trial_will_end": {
          const sub = event.data.object as Stripe.Subscription;
          const userId = await getUserIdByCustomer(sub.customer as string);
          if (!userId) break;

          const trialEnd = sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null;

          await updateProfile(userId, {
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
            trial_ends_at: trialEnd,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          });
          break;
        }

        // Pagamento confirmado (assinatura ativa)
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          const sub = invoice.subscription
            ? await stripe.subscriptions.retrieve(invoice.subscription as string)
            : null;
          if (!sub) break;

          const userId = await getUserIdByCustomer(invoice.customer as string);
          if (!userId) break;

          await updateProfile(userId, {
            subscription_status: "active",
            stripe_subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            trial_ends_at: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
          });
          break;
        }

        // Pagamento falhou
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const userId = await getUserIdByCustomer(invoice.customer as string);
          if (!userId) break;
          await updateProfile(userId, { subscription_status: "past_due" });
          break;
        }

        // Assinatura atualizada (upgrade/downgrade/reativação)
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const userId = await getUserIdByCustomer(sub.customer as string);
          if (!userId) break;

          await updateProfile(userId, {
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            trial_ends_at: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
          });
          break;
        }

        // Assinatura cancelada
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const userId = await getUserIdByCustomer(sub.customer as string);
          if (!userId) break;
          await updateProfile(userId, {
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
          });
          break;
        }

        default:
          console.log(`[webhook] Evento ignorado: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[webhook] Erro interno:", err);
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Ação não reconhecida
  return new Response(
    JSON.stringify({ error: `Ação desconhecida: ${action}` }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
