-- ─────────────────────────────────────────────────────────────
-- Frota de caminhoes — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
-- Depende de: schema_obras.sql e schema_caminhoes.sql
--
-- Ate agora o caminhao era so um texto: a lista de envio tinha '4' e '5'
-- escritos no codigo, e a tela de rastreamento mostrava placa ABC-1234 e
-- motorista Joao Silva, ambos fixos. Nao havia a quem esses dados pertencerem.
--
-- Com a frota cadastrada, cada caminhao passa a ter placa, motorista e
-- capacidade proprios, e as telas mostram os dados do caminhao que esta de
-- fato naquela viagem.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.caminhoes (
  id            bigserial   primary key,

  -- Como o caminhao e chamado no dia a dia: numero da frota, apelido, o que
  -- for. E este texto que aparece nas outras tabelas.
  identificacao text        not null,

  placa         text,
  motorista     text,

  -- Quanto ele carrega, em m³. Permite comparar o volume planejado da obra
  -- com o que a frota consegue entregar.
  capacidade_m3 numeric,

  -- A construtora dona do caminhao
  dono          uuid        not null references auth.users (id) on delete cascade,

  criado_em     timestamptz not null default now(),

  -- Duas betoneiras da mesma construtora nao podem ter a mesma identificacao,
  -- justamente porque e por ela que as outras tabelas apontam para ca
  unique (dono, identificacao)
);

create index if not exists caminhoes_por_dono
  on public.caminhoes (dono);

-- ─────────────────────────────────────────────────────────────
-- NOTA SOBRE O VINCULO
--
-- envios_caminhao, posicao_caminhao e regioes_concretagem guardam a
-- identificacao em texto, e nao uma chave estrangeira para esta tabela.
--
-- E uma escolha consciente: chave estrangeira seria mais correta, mas
-- exigiria migrar tres tabelas que ja tem dados — inclusive as areas de
-- concretagem, que sao justamente o registro que nao se pode perder.
--
-- O custo dessa escolha e que renomear a identificacao de um caminhao
-- desliga o vinculo com o historico dele. Por isso a tela de frota permite
-- editar placa e motorista, mas nao a identificacao.
-- ─────────────────────────────────────────────────────────────

alter table public.caminhoes enable row level security;

drop policy if exists "ve caminhoes relacionados" on public.caminhoes;
drop policy if exists "dono cadastra caminhao"    on public.caminhoes;
drop policy if exists "dono edita caminhao"       on public.caminhoes;
drop policy if exists "dono apaga caminhao"       on public.caminhoes;

-- A construtora ve a frota dela. O mestre ve os caminhoes que ja foram
-- despachados para alguma obra que ele enxerga — e o que permite a tela de
-- rastreamento mostrar placa e motorista para quem esta no canteiro.
create policy "ve caminhoes relacionados"
  on public.caminhoes for select
  to authenticated
  using (
    dono = auth.uid()
    or identificacao in (
      select caminhao from public.envios_caminhao
      where id_obra in (select id from public.obras)
    )
  );

create policy "dono cadastra caminhao"
  on public.caminhoes for insert
  to authenticated with check (dono = auth.uid());

create policy "dono edita caminhao"
  on public.caminhoes for update
  to authenticated using (dono = auth.uid());

create policy "dono apaga caminhao"
  on public.caminhoes for delete
  to authenticated using (dono = auth.uid());
