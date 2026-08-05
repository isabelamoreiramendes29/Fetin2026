-- ─────────────────────────────────────────────────────────────
-- Rastreamento do caminhao — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- Por que esta tabela existe: quem controla a betoneira e a construtora, mas
-- quem precisa acompanhar a chegada e o mestre, no canteiro. Sao aparelhos
-- diferentes, entao a posicao nao pode viver so na memoria de uma tela — ela
-- precisa de um lugar comum.
--
-- E o mesmo desenho que o GPS real vai usar: o caminhao publica onde esta, e
-- quem quiser acompanhar le dali. Hoje quem escreve e a simulacao da tela da
-- construtora; amanha sera o modulo GPS. Quem le nao muda.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.posicao_caminhao (
  -- Uma posicao por obra: e sempre "o caminhao que esta indo para esta obra"
  id_obra       text        primary key,

  -- Progresso ao longo da rota, de 0 a 100.
  -- Guardamos progresso, e nao latitude/longitude, porque a rota e conhecida
  -- pelos dois lados. Quando o GPS real entrar, viram duas colunas de
  -- coordenada e o progresso deixa de ser necessario.
  progresso     numeric     not null default 0 check (progresso between 0 and 100),

  -- Distingue "parado no meio do caminho" de "andando" na tela de quem observa
  em_movimento  boolean     not null default false,

  atualizado_em timestamptz not null default now()
);

alter table public.posicao_caminhao enable row level security;

drop policy if exists "autenticado le posicao"    on public.posicao_caminhao;
drop policy if exists "autenticado grava posicao" on public.posicao_caminhao;
drop policy if exists "autenticado edita posicao" on public.posicao_caminhao;

create policy "autenticado le posicao"
  on public.posicao_caminhao for select to authenticated using (true);

create policy "autenticado grava posicao"
  on public.posicao_caminhao for insert to authenticated with check (true);

create policy "autenticado edita posicao"
  on public.posicao_caminhao for update to authenticated using (true);
