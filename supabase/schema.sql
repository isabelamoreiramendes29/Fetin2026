-- ─────────────────────────────────────────────────────────────
-- Schema do Cemtinel no Supabase (PostgreSQL)
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- O que este schema cobre: usuarios (login/cadastro) e o historico
-- de temperatura. Obras, financeiro e envio de caminhao continuam
-- no MySQL do backend, alimentados por MQTT.
-- ─────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- TABELA: perfis
-- O Supabase Auth ja guarda email e senha (com hash) em auth.users.
-- Esta tabela guarda o que e especifico do Cemtinel: nome, telefone
-- e o tipo de usuario. A coluna id aponta para auth.users — apagar o
-- usuario apaga o perfil junto.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text        not null,
  telefone  text,
  tipo      smallint    not null check (tipo in (0, 1)),  -- 0 = mestre, 1 = construtora
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Cada usuario so enxerga e edita o proprio perfil.
-- O drop antes de cada create existe para o script poder ser rodado de novo:
-- o Postgres nao aceita "create policy if not exists".
drop policy if exists "usuario le proprio perfil" on public.perfis;
drop policy if exists "usuario atualiza proprio perfil" on public.perfis;

create policy "usuario le proprio perfil"
  on public.perfis for select
  using (auth.uid() = id);

create policy "usuario atualiza proprio perfil"
  on public.perfis for update
  using (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────
-- TRIGGER: cria o perfil automaticamente ao cadastrar usuario
-- O app manda nome/telefone/tipo como metadados no signUp, e este
-- trigger copia esses valores para a tabela perfis.
--
-- Por que trigger, e nao um insert feito pelo app: se a confirmacao
-- de e-mail estiver ligada, o usuario nao tem sessao logo apos o
-- cadastro, e o RLS bloquearia o insert vindo do app. O trigger roda
-- no banco (security definer) e funciona nos dois casos.
-- ─────────────────────────────────────────────────────────────
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, nome, telefone, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    coalesce((new.raw_user_meta_data ->> 'tipo')::smallint, 0)
  );
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();


-- ─────────────────────────────────────────────────────────────
-- TABELA: leituras_temperatura
-- Serie historica das medicoes, que alimenta a tela de Historico.
--
-- Isto existe porque MQTT nao guarda nada: quem nao estava ouvindo
-- no momento da publicacao perde a leitura. O grafico precisa de uma
-- serie, entao ela e persistida aqui.
--
-- id_obra e text (nao FK) de proposito: as obras vivem no MySQL do
-- backend, entao nao ha para onde apontar uma chave estrangeira.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.leituras_temperatura (
  id          bigserial   primary key,
  id_obra     text        not null,
  temperatura numeric     not null,
  medido_em   timestamptz not null default now()
);

-- A consulta da tela e sempre "leituras da obra X, mais recentes primeiro"
create index if not exists leituras_obra_data
  on public.leituras_temperatura (id_obra, medido_em desc);

alter table public.leituras_temperatura enable row level security;

-- Qualquer usuario logado le e grava leituras.
-- Nota: isto e permissivo de proposito, porque o vinculo entre usuario
-- e obra mora no MySQL — o Postgres nao tem como validar essa relacao.
-- Se as obras migrarem para ca um dia, da para restringir por obra.
drop policy if exists "autenticado le leituras" on public.leituras_temperatura;
drop policy if exists "autenticado grava leituras" on public.leituras_temperatura;

create policy "autenticado le leituras"
  on public.leituras_temperatura for select
  to authenticated using (true);

create policy "autenticado grava leituras"
  on public.leituras_temperatura for insert
  to authenticated with check (true);
