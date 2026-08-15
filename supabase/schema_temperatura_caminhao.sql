-- ─────────────────────────────────────────────────────────────
-- Temperatura por caminhao
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
-- Depende de: schema.sql
--
-- A tabela guardava obra, valor e hora — sem o caminhao. Com um sensor so
-- isso nao aparecia, mas o modelo estava errado: temperatura e da CARGA, nao
-- da obra. Cada betoneira traz um concreto diferente, com sua propria
-- temperatura, e uma obra recebe varias ao longo da concretagem.
--
-- Sem esta coluna, as leituras de dois caminhoes entravam na mesma serie e a
-- media por faixa horaria misturava cargas distintas — um numero que nao
-- descreve nenhuma das duas.
--
-- Leituras antigas ficam com caminhao nulo. Elas continuam aparecendo quando
-- nenhum caminhao esta selecionado.
-- ─────────────────────────────────────────────────────────────

alter table public.leituras_temperatura
  add column if not exists caminhao text;

-- A consulta passa a ser "leituras desta obra, deste caminhao, mais recentes
-- primeiro"
create index if not exists leituras_obra_caminhao
  on public.leituras_temperatura (id_obra, caminhao, medido_em desc);
