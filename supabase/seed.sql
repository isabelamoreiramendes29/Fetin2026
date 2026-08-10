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
  ('1', 19.4, now() - interval '10 hours'),
  ('1', 20.8, now() - interval '9 hours'),
  ('1', 22.6, now() - interval '8 hours'),
  ('1', 24.9, now() - interval '7 hours'),
  ('1', 27.3, now() - interval '6 hours'),
  ('1', 29.1, now() - interval '5 hours'),
  ('1', 31.4, now() - interval '4 hours'),
  ('1', 29.8, now() - interval '3 hours'),
  ('1', 27.2, now() - interval '2 hours'),
  ('1', 24.5, now() - interval '1 hour'),
  ('1', 22.7, now());

-- Curva acima: sobe de 19 ate ~31 e volta a cair. E o comportamento tipico da
-- cura, com o calor da hidratacao do cimento levando a peca acima do ambiente
-- nas primeiras horas. Passa pelas faixas Ideal e Alta, sem chegar na critica.

-- Para apagar as leituras de teste desta obra:
-- delete from public.leituras_temperatura where id_obra = '1';
