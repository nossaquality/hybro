
-- Profiles table (1-to-1 with auth.users)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  nivel_corrida text,
  dias_disponiveis int,
  objetivo_principal text,
  equipamentos_casa text[] default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger reusable
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Planos de treino
create table public.planos_treino (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plano jsonb not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.planos_treino (user_id, ativo);
alter table public.planos_treino enable row level security;

create policy "Users read own planos" on public.planos_treino for select using (auth.uid() = user_id);
create policy "Users insert own planos" on public.planos_treino for insert with check (auth.uid() = user_id);
create policy "Users update own planos" on public.planos_treino for update using (auth.uid() = user_id);
create policy "Users delete own planos" on public.planos_treino for delete using (auth.uid() = user_id);

-- Progresso diario
create table public.progresso_diario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null default current_date,
  task_id text not null,
  completed boolean not null default true,
  mood text,
  esforco text check (esforco in ('Facil','Medio','Dificil')),
  created_at timestamptz not null default now(),
  unique (user_id, data, task_id)
);
alter table public.progresso_diario enable row level security;

create policy "Users read own progresso" on public.progresso_diario for select using (auth.uid() = user_id);
create policy "Users insert own progresso" on public.progresso_diario for insert with check (auth.uid() = user_id);
create policy "Users update own progresso" on public.progresso_diario for update using (auth.uid() = user_id);
create policy "Users delete own progresso" on public.progresso_diario for delete using (auth.uid() = user_id);

-- Mensagens chat
create table public.mensagens_chat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.mensagens_chat (user_id, created_at);
alter table public.mensagens_chat enable row level security;

create policy "Users read own mensagens" on public.mensagens_chat for select using (auth.uid() = user_id);
create policy "Users insert own mensagens" on public.mensagens_chat for insert with check (auth.uid() = user_id);
create policy "Users delete own mensagens" on public.mensagens_chat for delete using (auth.uid() = user_id);
