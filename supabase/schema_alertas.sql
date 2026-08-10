-- ─────────────────────────────────────────────────────────────
-- Alertas — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
-- Depende de: schema_obras.sql
--
-- Por que existe: ate agora o app so respondia quando alguem perguntava. Era
-- preciso abrir a tela e olhar para descobrir que o concreto chegou a 38 °C.
-- Mas mestre de obra nao fica com o celular aberto no velocimetro — ele esta
-- tocando a obra. Se a betoneira chegou fora da faixa, ele precisa saber
-- naquele momento, porque depois de lancado nao tem volta.
--
-- O alerta fica no banco, e nao so na notificacao do celular, por dois
-- motivos: quem nao estava com o app aberto ve depois, e fica o registro de
-- que o problema foi detectado e quando.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.alertas (
  id        bigserial   primary key,
  id_obra   bigint      not null references public.obras (id) on delete cascade,

  -- Por enquanto so 'temperatura'. A coluna existe para que volume abaixo do
  -- comprado e corpo de prova reprovado possam entrar depois sem migracao.
  tipo      text        not null default 'temperatura',

  -- 'critica' exige acao, 'atencao' vale acompanhar
  severidade text       not null check (severidade in ('atencao', 'critica')),

  mensagem  text        not null,
  valor     numeric,
  caminhao  text,

  lido      boolean     not null default false,
  criado_em timestamptz not null default now()
);

-- A consulta e sempre "alertas desta obra, mais recentes primeiro"
create index if not exists alertas_por_obra
  on public.alertas (id_obra, criado_em desc);

alter table public.alertas enable row level security;

drop policy if exists "autenticado le alertas"   on public.alertas;
drop policy if exists "autenticado cria alerta"  on public.alertas;
drop policy if exists "autenticado marca lido"   on public.alertas;

-- Ve os alertas das obras que ja consegue enxergar. A subconsulta reaproveita
-- as policies de obras: obra que nao aparece, alerta que nao aparece.
create policy "autenticado le alertas"
  on public.alertas for select
  to authenticated
  using (id_obra in (select id from public.obras));

create policy "autenticado cria alerta"
  on public.alertas for insert
  to authenticated
  with check (id_obra in (select id from public.obras));

create policy "autenticado marca lido"
  on public.alertas for update
  to authenticated
  using (id_obra in (select id from public.obras));
