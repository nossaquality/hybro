-- Adiciona colunas de billing à tabela profiles existente
alter table public.profiles
  add column if not exists subscription_status text
    check (subscription_status in ('trialing','active','past_due','canceled','incomplete'))
    default 'trialing',
  add column if not exists trial_ends_at timestamptz
    default (now() + interval '7 days'),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz;

-- Índice para busca rápida por customer_id no webhook
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);

-- Comentários para documentação
comment on column public.profiles.subscription_status is
  'trialing | active | past_due | canceled | incomplete';
comment on column public.profiles.trial_ends_at is
  'Quando o trial de 7 dias expira';
comment on column public.profiles.stripe_customer_id is
  'ID do Customer no Stripe (cus_xxx)';
comment on column public.profiles.stripe_subscription_id is
  'ID da Subscription no Stripe (sub_xxx)';
comment on column public.profiles.current_period_end is
  'Fim do período de cobrança atual';
