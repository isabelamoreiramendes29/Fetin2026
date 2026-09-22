-- ─────────────────────────────────────────────────────────────
-- Posicao real por GPS — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- O que muda: ate agora a tabela posicao_caminhao guardava so `progresso`,
-- um numero de 0 a 100 dizendo o quanto da rota o caminhao ja andou. A
-- posicao no mapa era CALCULADA interpolando entre o deposito e a obra.
--
-- Com o modulo GPS, o caminhao passa a publicar onde ele esta de verdade.
-- Estas colunas guardam essa medida.
--
-- Por que NULAVEL, e nao obrigatoria: GPS nao fixa dentro de predio, e a
-- antena leva de trinta segundos a varios minutos para pegar os satelites na
-- primeira vez. Enquanto nao houver coordenada, o app continua desenhando
-- pelo progresso, como sempre fez. Uma coisa nao substitui a outra — a
-- medida entra quando existe, e a simulacao cobre quando nao existe.
--
-- Isto NAO apaga nada e nao quebra o que ja funciona.
-- ─────────────────────────────────────────────────────────────

alter table public.posicao_caminhao
  add column if not exists latitude   double precision,
  add column if not exists longitude  double precision,
  add column if not exists satelites  integer,
  add column if not exists medido_em  timestamptz;

-- Coordenada fora do planeta e leitura suja do modulo, comum nos primeiros
-- segundos antes do fix firmar. O app ja descarta, mas o banco tambem recusa:
-- defesa em duas camadas, porque quem escreve aqui nao e so o app.
alter table public.posicao_caminhao
  drop constraint if exists posicao_coordenada_valida;

alter table public.posicao_caminhao
  add constraint posicao_coordenada_valida check (
    (latitude is null and longitude is null)
    or (
      latitude  between  -90 and  90 and
      longitude between -180 and 180 and
      not (latitude = 0 and longitude = 0)
    )
  );

comment on column public.posicao_caminhao.latitude  is 'Medida pelo GPS. Nulo enquanto nao ha fix.';
comment on column public.posicao_caminhao.longitude is 'Medida pelo GPS. Nulo enquanto nao ha fix.';
comment on column public.posicao_caminhao.satelites is 'Quantos satelites o modulo via. So para diagnostico.';
comment on column public.posicao_caminhao.medido_em is 'Quando a coordenada chegou. Serve para saber se o sinal caiu.';
