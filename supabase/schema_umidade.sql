-- ─────────────────────────────────────────────────────────────
-- Umidade da mistura — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- O sensor de umidade de solo fica dentro do tambor da betoneira. Ele nao mede
-- umidade do ar: mede a agua livre da massa, que e um retrato do fator
-- agua/cimento — a variavel que mais determina a resistencia final.
--
-- O valor e a leitura BRUTA do conversor do ESP32, de 0 a 4095. Nao e "X% de
-- agua": calibrar para unidade de engenharia exigiria ensaio de laboratorio.
-- Por isso o que interessa aqui e a VARIACAO, nao o numero absoluto.
--
-- E a variacao responde uma pergunta que hoje ninguem consegue responder:
-- alguem adicionou agua no canteiro? Isso e proibido, acontece o tempo todo,
-- destroi a resistencia, e depois de lancado nao ha como provar. Um salto na
-- umidade, com hora e caminhao, e prova.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.leituras_umidade (
  id        bigserial   primary key,
  id_obra   text        not null,

  -- Qual caminhao. Nulo quando o sensor nao identifica — hoje ele nao
  -- identifica, e o app assume o caminhao configurado.
  caminhao  text,

  -- Leitura bruta do ADC: 0 a 4095. Maior costuma significar mais seco.
  valor     numeric     not null,

  -- Texto que o proprio sensor manda junto (SECO, UMIDO...). Guardado como
  -- veio, sem interpretacao: e o firmware que decide o que significa.
  status    text,

  medido_em timestamptz not null default now()
);

-- A consulta e sempre "leituras desta obra, mais recentes primeiro"
create index if not exists umidade_por_obra
  on public.leituras_umidade (id_obra, medido_em desc);

alter table public.leituras_umidade enable row level security;

drop policy if exists "autenticado le umidade"   on public.leituras_umidade;
drop policy if exists "autenticado grava umidade" on public.leituras_umidade;

create policy "autenticado le umidade"
  on public.leituras_umidade for select to authenticated using (true);

create policy "autenticado grava umidade"
  on public.leituras_umidade for insert to authenticated with check (true);
