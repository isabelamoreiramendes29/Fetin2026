-- ─────────────────────────────────────────────────────────────
-- Histórico de temperatura para a demonstração
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
-- Depende de: schema.sql e schema_temperatura_caminhao.sql
--
-- POR QUE EXISTE
--
-- O MQTT não guarda nada: quem não estava ouvindo na hora da publicação perde
-- a leitura. Numa feira, o sensor fica ligado poucos minutos antes da banca
-- chegar — e a tela de Histórico abre vazia, que é o pior momento possível
-- para ela abrir vazia.
--
-- Este script grava uma série plausível das últimas 1h30. Ele NÃO substitui o
-- sensor: quando o sensor publica, as leituras dele entram na mesma tabela e
-- aparecem no mesmo gráfico.
--
-- A CURVA, E POR QUE ELA É ASSIM
--
--   21 °C ──▶ 27 °C ──▶ 36 °C ──▶ 28 °C
--   saída      estrada    pico      chegada
--
-- Ela conta a história do pitch: o concreto sai na faixa ideal, esquenta na
-- viagem, cruza os 35 °C (onde o app alerta) e volta. Quem olhar o gráfico vê
-- o problema acontecendo, não um valor parado.
--
-- Por padrão grava em TODAS as obras, para não haver risco de abrir a obra
-- errada na hora da apresentação e encontrar a tela vazia.
--
-- É SEGURO RODAR MAIS DE UMA VEZ. Antes de gravar, apaga as leituras das
-- últimas 3 horas, então rodar duas vezes não empilha séries. Leituras mais
-- antigas que 3 horas não são tocadas.
--
-- RODE DE NOVO POUCO ANTES DE APRESENTAR. A tela agrupa por 5 minutos
-- enquanto tudo cabe em 2 horas, e por hora depois disso — o que achataria o
-- gráfico. Regravar reposiciona a janela no "agora".
-- ─────────────────────────────────────────────────────────────

do $$
declare
  -- ┌───────────────────────────────────────────────────────────┐
  -- │ AJUSTE AQUI, SE PRECISAR                                  │
  -- └───────────────────────────────────────────────────────────┘

  -- NULL grava em todas as obras. Para gravar em uma só, ponha o id:
  --   v_obra text := '2';
  v_obra text := null;

  -- De qual caminhão vieram as leituras.
  -- Deixe NULL para que apareçam sempre, com ou sem caminhão selecionado na
  -- tela. Se quiser prendê-las a um caminhão, ponha o mesmo texto que o app
  -- usa para identificá-lo.
  v_caminhao text := null;

  -- 46 leituras de 2 em 2 minutos = 1h30. Esse intervalo faz a tela agrupar
  -- de 5 em 5 minutos (ver agruparLeituras em services/historico.js), o que
  -- dá 19 pontos no gráfico — legível, sem virar um traço só.
  c_passos  constant int := 45;
  c_minutos constant int := 2;

  r_obra record;
  i      int;
  v_base numeric;
  v_obras int := 0;
begin
  for r_obra in
    select id::text as id, nome
      from public.obras
     where v_obra is null or id::text = v_obra
     order by id
  loop
    -- Limpa a janela para o script poder ser rodado de novo sem duplicar
    delete from public.leituras_temperatura
     where id_obra = r_obra.id
       and medido_em > now() - interval '3 hours';

    for i in 0..c_passos loop
      -- Três trechos retos: sobe devagar, sobe forte, desce.
      v_base := case
        when i <= 14 then 21 + (i * 6.0 / 14)              -- saída da usina
        when i <= 29 then 27 + ((i - 14) * 9.0 / 15)       -- esquenta na estrada
        else              36 - ((i - 29) * 8.0 / 16)       -- chega e estabiliza
      end;

      -- Um ruído de ±0,4 °C. Sem ele a curva fica perfeita demais, e curva
      -- perfeita demais é a primeira coisa que um jurado desconfia.
      insert into public.leituras_temperatura (id_obra, temperatura, medido_em, caminhao)
      values (
        r_obra.id,
        round((v_base + (random() - 0.5) * 0.8)::numeric, 1),
        now() - make_interval(mins => (c_passos - i) * c_minutos),
        v_caminhao
      );
    end loop;

    v_obras := v_obras + 1;
    raise notice 'Obra % (%): % leituras gravadas.',
      r_obra.id, r_obra.nome, c_passos + 1;
  end loop;

  if v_obras = 0 then
    raise exception
      'Nenhuma obra encontrada. Cadastre uma obra no aplicativo antes de rodar isto.';
  end if;

  raise notice 'Pronto: % obra(s) com historico das ultimas % horas.',
    v_obras, round((c_passos * c_minutos) / 60.0, 1);
end $$;

-- Confere o que entrou, obra por obra. Toda obra listada deve mostrar 46.
select
  o.id,
  o.nome,
  count(l.id)       as leituras_24h,
  min(l.temperatura) as minima,
  max(l.temperatura) as maxima,
  max(l.medido_em)   as ultima
from public.obras o
left join public.leituras_temperatura l
  on l.id_obra = o.id::text
 and l.medido_em > now() - interval '24 hours'
group by o.id, o.nome
order by o.id;
