-- ─────────────────────────────────────────────────────────────
-- Obras — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- Ultima peca a sair do MQTT. Obra nao e telemetria: e cadastro, precisa ser
-- consultada ("obras desta construtora"), e MQTT nao responde pergunta — o
-- backend so conseguia empurrar a lista inteira para todo mundo.
--
-- E aqui esta o ganho maior: com as obras no mesmo banco dos usuarios, o
-- filtro por construtora deixa de ser feito no aplicativo e passa a ser feito
-- pelo servidor. Antes, todo aparelho recebia todas as obras e o app escolhia
-- quais mostrar — quem soubesse ouvir o topico via as obras alheias.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.obras (
  id             bigserial   primary key,

  nome           text        not null,
  cep            text,
  endereco       text,
  numero         text,
  complemento    text,

  data_inicio    date,
  data_termino   date,

  -- Sempre em m³ — nao existe campo de unidade no cadastro
  volume_cimento numeric,

  -- Liga a obra a construtora responsavel. E por este campo que a construtora
  -- enxerga as obras dela; guardado em minusculo para o filtro nao falhar por
  -- diferenca de maiuscula.
  email_construtora text     not null,

  -- Quem cadastrou (o mestre de obra)
  criado_por     uuid        not null references auth.users (id) on delete cascade,

  criado_em      timestamptz not null default now()
);

create index if not exists obras_por_construtora
  on public.obras (lower(email_construtora));

create index if not exists obras_por_criador
  on public.obras (criado_por);

alter table public.obras enable row level security;

drop policy if exists "usuario le suas obras"    on public.obras;
drop policy if exists "usuario cria obra"        on public.obras;
drop policy if exists "criador edita sua obra"   on public.obras;
drop policy if exists "criador apaga sua obra"   on public.obras;

-- ─────────────────────────────────────────────────────────────
-- QUEM VE O QUE
-- Duas formas de enxergar uma obra:
--   o mestre ve as que ele cadastrou;
--   a construtora ve aquelas em que o e-mail dela foi informado.
-- Qualquer outra pessoa nao recebe a linha — o servidor nem envia.
-- ─────────────────────────────────────────────────────────────
create policy "usuario le suas obras"
  on public.obras for select
  to authenticated
  using (
    criado_por = auth.uid()
    or lower(email_construtora) = lower(auth.jwt() ->> 'email')
  );

-- O with check impede cadastrar obra em nome de outra pessoa
create policy "usuario cria obra"
  on public.obras for insert
  to authenticated
  with check (criado_por = auth.uid());

create policy "criador edita sua obra"
  on public.obras for update
  to authenticated
  using (criado_por = auth.uid());

create policy "criador apaga sua obra"
  on public.obras for delete
  to authenticated
  using (criado_por = auth.uid());
