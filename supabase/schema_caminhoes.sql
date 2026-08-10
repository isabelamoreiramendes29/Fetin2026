-- ─────────────────────────────────────────────────────────────
-- Envio de caminhoes — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- Ultima peca a sair do MQTT. Depois disto, o broker fica com uma unica
-- responsabilidade: entregar a leitura do sensor em tempo real.
--
-- Este arquivo tambem corrige uma falha de modelagem: a tabela de posicao
-- tinha o id_obra como chave primaria, ou seja, so cabia UM caminhao por obra.
-- Mas uma concretagem usa varios caminhoes — e essa e justamente a premissa do
-- Mapa de Concretagem, onde cada area registra qual caminhao a concretou.
-- ─────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- TABELA: envios_caminhao
-- Cada despacho de betoneira para uma obra.
--
-- Repare que aqui existe chave estrangeira de verdade para obras: agora que as
-- obras vivem neste mesmo banco, ha para onde apontar. Apagar a obra apaga os
-- envios dela junto, sem deixar registro orfao.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.envios_caminhao (
  id         bigserial   primary key,
  id_obra    bigint      not null references public.obras (id) on delete cascade,
  caminhao   text        not null,
  enviado_em timestamptz not null default now(),
  criado_por uuid        not null references auth.users (id) on delete cascade
);

create index if not exists envios_por_obra
  on public.envios_caminhao (id_obra, enviado_em desc);

alter table public.envios_caminhao enable row level security;

drop policy if exists "autenticado le envios"    on public.envios_caminhao;
drop policy if exists "autenticado grava envios" on public.envios_caminhao;
drop policy if exists "criador apaga envio"      on public.envios_caminhao;

-- Le os envios das obras que ja consegue enxergar. A subconsulta reaproveita
-- as policies da tabela obras: se a obra nao aparece para este usuario, os
-- envios dela tambem nao aparecem.
create policy "autenticado le envios"
  on public.envios_caminhao for select
  to authenticated
  using (id_obra in (select id from public.obras));

create policy "autenticado grava envios"
  on public.envios_caminhao for insert
  to authenticated
  with check (criado_por = auth.uid());

create policy "criador apaga envio"
  on public.envios_caminhao for delete
  to authenticated
  using (criado_por = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- CORRECAO: varios caminhoes por obra na tabela de posicao
--
-- O drop e seguro aqui, e so aqui: esta tabela guarda apenas o progresso da
-- viagem em andamento, que se refaz na proxima vez que alguem despachar um
-- caminhao. Nao ha historico a perder — diferente de leituras, compras ou
-- areas de concretagem, que nunca devem ser apagadas.
--
-- Recriar tambem permite trocar id_obra de text para bigint com chave
-- estrangeira, agora que as obras moram neste banco.
-- ─────────────────────────────────────────────────────────────
drop table if exists public.posicao_caminhao;

create table public.posicao_caminhao (
  id_obra       bigint      not null references public.obras (id) on delete cascade,
  caminhao      text        not null,

  -- Progresso ao longo da rota, de 0 a 100. Guardamos progresso e nao
  -- coordenadas porque a rota e conhecida pelos dois lados. Quando o GPS real
  -- entrar, viram duas colunas de latitude/longitude.
  progresso     numeric     not null default 0 check (progresso between 0 and 100),

  em_movimento  boolean     not null default false,
  atualizado_em timestamptz not null default now(),

  -- A chave agora e o par: cada caminhao a caminho da obra tem sua posicao
  primary key (id_obra, caminhao)
);

alter table public.posicao_caminhao enable row level security;

drop policy if exists "autenticado le posicao"    on public.posicao_caminhao;
drop policy if exists "autenticado grava posicao" on public.posicao_caminhao;
drop policy if exists "autenticado edita posicao" on public.posicao_caminhao;

create policy "autenticado le posicao"
  on public.posicao_caminhao for select
  to authenticated
  using (id_obra in (select id from public.obras));

create policy "autenticado grava posicao"
  on public.posicao_caminhao for insert to authenticated with check (true);

create policy "autenticado edita posicao"
  on public.posicao_caminhao for update to authenticated using (true);
