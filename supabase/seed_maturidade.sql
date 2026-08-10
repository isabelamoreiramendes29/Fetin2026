-- ─────────────────────────────────────────────────────────────
-- Dados de demonstracao para a Previsao de Resistencia
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- Para que serve: a maturidade integra a curva de temperatura ao longo da
-- cura, que leva 28 dias. Com leituras de poucas horas atras, toda maturidade
-- daria perto de zero e a tela nao teria o que mostrar.
--
-- Isto cria uma curva de 30 dias e reposiciona as areas ja marcadas em datas
-- passadas, para que a calibracao tenha pontos suficientes.
--
-- Roda na PRIMEIRA obra cadastrada. Se quiser outra, troque o "limit 1" por
-- um "where id = <numero>".
-- ─────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- 1) CURVA DE TEMPERATURA DE 30 DIAS, A CADA 2 HORAS
--
-- A forma imita o comportamento real do concreto:
--   - 21 °C de ambiente como base
--   - oscilacao diaria de ±4 °C entre dia e noite
--   - pico de hidratacao nos primeiros dias, decaindo — a reacao do cimento
--     libera calor, e e por isso que peca nova esquenta sozinha. O pico leva a
--     peca a uns 31 °C, dentro do que se ve numa laje real.
--   - um pouco de ruido, porque sensor real nao devolve numero redondo
-- ─────────────────────────────────────────────────────────────
insert into public.leituras_temperatura (id_obra, temperatura, medido_em)
select
  (select id::text from public.obras order by id limit 1),
  round((
      21
    + 4 * sin(2 * pi() * extract(epoch from t) / 86400)
    + 8 * exp(-extract(epoch from (t - (now() - interval '30 days'))) / 86400 / 1.5)
    + (random() - 0.5) * 1.2
  )::numeric, 1),
  t
from generate_series(
  now() - interval '30 days',
  now(),
  interval '2 hours'
) as t;


-- ─────────────────────────────────────────────────────────────
-- 2) REPOSICIONA AS AREAS JA MARCADAS EM DATAS PASSADAS
--
-- Sem isto todas as areas teriam sido concretadas hoje, e portanto teriam a
-- mesma maturidade — o ajuste precisa de pontos espalhados para existir.
--
-- Distribui as areas ao longo dos ultimos 28 dias pela ordem de criacao.
-- ─────────────────────────────────────────────────────────────
with numeradas as (
  select
    id,
    row_number() over (order by id) as posicao,
    count(*) over () as total
  from public.regioes_concretagem
)
update public.regioes_concretagem r
set data_concretagem = now() - (interval '1 day' * (28 - (n.posicao - 1) * 6))
from numeradas n
where r.id = n.id;


-- ─────────────────────────────────────────────────────────────
-- 3) MARCA COMO ROMPIDAS AS AREAS QUE JA TEM RESULTADO
--
-- O rompimento acontece 28 dias depois da concretagem, ou hoje, o que vier
-- primeiro. A maturidade de uma area rompida para nesse dia — depois disso o
-- concreto continua curando, mas o corpo de prova ja foi ensaiado.
-- ─────────────────────────────────────────────────────────────
update public.regioes_concretagem
set data_rompimento = least(data_concretagem + interval '28 days', now())
where resultado_mpa is not null;


-- Para desfazer a curva de temperatura criada aqui:
-- delete from public.leituras_temperatura
--  where id_obra = (select id::text from public.obras order by id limit 1);
