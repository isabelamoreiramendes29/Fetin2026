-- ─────────────────────────────────────────────────────────────
-- Leituras de teste para a tela de Historico de Temperatura
--
-- Como usar: painel do Supabase > SQL Editor > New query, cola e Run.
--
-- Para que serve: enquanto o sensor nao esta integrado, isto popula a
-- tabela com uma curva realista para conferir grafico, tabela e as
-- estatisticas de minima/maxima/media.
--
-- A obra '1' e a que existe em obrasIniciais no ObrasContext — a mesma
-- que aparece no app quando o broker MQTT esta fora do ar.
--
-- Os horarios sao relativos a now(), entao as leituras sempre caem dentro
-- da janela de 24h que a tela consulta, nao importa quando isto for rodado.
--
-- Pode rodar mais de uma vez: cada execucao insere um novo lote. Para
-- limpar antes, use a linha comentada no final.
-- ─────────────────────────────────────────────────────────────

insert into public.leituras_temperatura (id_obra, temperatura, medido_em) values
  ('1', 72.5, now() - interval '10 hours'),
  ('1', 74.1, now() - interval '9 hours'),
  ('1', 76.8, now() - interval '8 hours'),
  ('1', 79.2, now() - interval '7 hours'),
  ('1', 81.5, now() - interval '6 hours'),
  ('1', 83.0, now() - interval '5 hours'),
  ('1', 84.6, now() - interval '4 hours'),
  ('1', 82.1, now() - interval '3 hours'),
  ('1', 79.4, now() - interval '2 hours'),
  ('1', 76.9, now() - interval '1 hour'),
  ('1', 75.3, now());

-- Curva acima: sobe de 72 ate ~85 e volta a cair — o comportamento
-- tipico da cura do cimento, passando pelas faixas Normal e Ideal.

-- Para apagar as leituras de teste desta obra:
-- delete from public.leituras_temperatura where id_obra = '1';
