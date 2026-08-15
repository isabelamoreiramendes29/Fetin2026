-- ─────────────────────────────────────────────────────────────
-- Conclusao da viagem
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
-- Depende de: schema_caminhoes.sql
--
-- Faltava o conceito de viagem encerrada. Sem ele, o app deixava despachar o
-- mesmo caminhao quantas vezes quisessem, e a obra acumulava quatro viagens
-- abertas do caminhao 4 ao mesmo tempo — coisa que nao existe na realidade:
-- a betoneira nao sai de novo sem ter descarregado.
--
-- Varias viagens ao longo do tempo continua certo. O que passa a ser
-- impedido e ter duas abertas do mesmo caminhao simultaneamente.
-- ─────────────────────────────────────────────────────────────

alter table public.envios_caminhao
  -- Nulo enquanto a viagem esta em andamento
  add column if not exists concluido_em timestamptz;

-- A consulta que interessa e "este caminhao tem viagem aberta?"
create index if not exists envios_abertos
  on public.envios_caminhao (caminhao)
  where concluido_em is null;


-- ─────────────────────────────────────────────────────────────
-- LIMPEZA DAS VIAGENS DUPLICADAS QUE JA EXISTEM
--
-- Encerra todas as viagens antigas de cada caminhao, mantendo aberta apenas
-- a mais recente. Sem isso o app continuaria bloqueando o despacho por causa
-- das viagens fantasma criadas antes desta regra existir.
-- ─────────────────────────────────────────────────────────────
update public.envios_caminhao e
set concluido_em = enviado_em
where concluido_em is null
  and exists (
    select 1 from public.envios_caminhao mais_nova
    where mais_nova.caminhao = e.caminhao
      and mais_nova.id_obra = e.id_obra
      and mais_nova.enviado_em > e.enviado_em
  );
