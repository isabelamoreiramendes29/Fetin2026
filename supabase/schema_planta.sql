-- ─────────────────────────────────────────────────────────────
-- Mapa de Concretagem — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- O problema que isto resolve: o concreto de cada caminhao vai para um
-- trecho diferente da estrutura, e 28 dias depois o laboratorio rompe o
-- corpo de prova daquela carga. Se o resultado vier abaixo do fck, e
-- preciso saber exatamente QUAL parte da obra recebeu aquele concreto.
--
-- Aqui isso e guardado como: uma foto da planta por obra, e varias
-- regioes desenhadas em cima dela, cada uma ligada a um caminhao e ao
-- resultado do seu corpo de prova.
-- ─────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- TABELA: plantas
-- Uma planta por obra — a foto do projeto que serve de fundo.
--
-- largura/altura sao as dimensoes originais da imagem, guardadas para o
-- app calcular a proporcao de exibicao antes mesmo da foto carregar.
--
-- fck_projeto e a resistencia esperada em MPa (ex: concreto C25 = 25).
-- E o valor contra o qual cada resultado de laboratorio e comparado.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.plantas (
  id          bigserial   primary key,
  id_obra     text        not null,
  url_imagem  text        not null,
  largura     integer     not null,
  altura      integer     not null,
  fck_projeto numeric     not null default 25,
  criado_em   timestamptz not null default now()
);

-- Uma planta por obra: recadastrar substitui a anterior
create unique index if not exists plantas_obra_unica
  on public.plantas (id_obra);

alter table public.plantas enable row level security;

drop policy if exists "autenticado le plantas"   on public.plantas;
drop policy if exists "autenticado grava plantas" on public.plantas;
drop policy if exists "autenticado edita plantas" on public.plantas;
drop policy if exists "autenticado apaga plantas" on public.plantas;

create policy "autenticado le plantas"
  on public.plantas for select to authenticated using (true);

create policy "autenticado grava plantas"
  on public.plantas for insert to authenticated with check (true);

create policy "autenticado edita plantas"
  on public.plantas for update to authenticated using (true);

create policy "autenticado apaga plantas"
  on public.plantas for delete to authenticated using (true);


-- ─────────────────────────────────────────────────────────────
-- TABELA: regioes_concretagem
-- Cada area desenhada na planta, ligada ao caminhao que a concretou.
--
-- pontos e um array JSON de vertices do poligono: [{"x":0.12,"y":0.34}, ...]
-- As coordenadas sao NORMALIZADAS (0 a 1), nao pixels. Isso e essencial:
-- guardadas em pixels, as marcacoes sairiam do lugar em telas de tamanho
-- diferente do aparelho onde foram feitas.
--
-- resultado_mpa nulo significa "corpo de prova ainda nao rompido" — a
-- regiao aparece com a cor do caminhao ate o laudo chegar.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.regioes_concretagem (
  id              bigserial   primary key,
  id_planta       bigint      not null references public.plantas (id) on delete cascade,
  caminhao        text        not null,
  pontos          jsonb       not null,
  corpo_prova     text,
  resultado_mpa   numeric,
  data_rompimento timestamptz,
  data_concretagem timestamptz not null default now(),
  criado_em       timestamptz not null default now()
);

-- Registro de reforco estrutural, para areas que reprovaram no ensaio.
-- Fica em alter (e nao nas colunas acima) para que rodar este arquivo de novo
-- adicione as colunas em bancos que ja tinham a tabela criada antes.
--
-- Por que reforco nao vira "aprovado": uma area que reprovou e foi reforcada
-- nao e igual a uma que passou de primeira. Apagar essa diferenca destruiria
-- justamente o rastro que este mapa existe para guardar.
alter table public.regioes_concretagem
  add column if not exists reforco_descricao text,
  add column if not exists data_reforco       timestamptz;

create index if not exists regioes_por_planta
  on public.regioes_concretagem (id_planta);

alter table public.regioes_concretagem enable row level security;

drop policy if exists "autenticado le regioes"   on public.regioes_concretagem;
drop policy if exists "autenticado grava regioes" on public.regioes_concretagem;
drop policy if exists "autenticado edita regioes" on public.regioes_concretagem;
drop policy if exists "autenticado apaga regioes" on public.regioes_concretagem;

create policy "autenticado le regioes"
  on public.regioes_concretagem for select to authenticated using (true);

create policy "autenticado grava regioes"
  on public.regioes_concretagem for insert to authenticated with check (true);

create policy "autenticado edita regioes"
  on public.regioes_concretagem for update to authenticated using (true);

create policy "autenticado apaga regioes"
  on public.regioes_concretagem for delete to authenticated using (true);


-- ─────────────────────────────────────────────────────────────
-- STORAGE: bucket das fotos de planta
--
-- Bucket publico: qualquer um com o link ve a imagem. Para um prototipo
-- isso simplifica bastante (nao precisa gerar URL assinada a cada
-- carregamento). Se o app virar produto, vale trocar para privado —
-- planta de obra e documento do cliente.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('plantas', 'plantas', true)
on conflict (id) do nothing;

drop policy if exists "autenticado envia planta" on storage.objects;
drop policy if exists "autenticado troca planta" on storage.objects;
drop policy if exists "autenticado apaga planta" on storage.objects;

create policy "autenticado envia planta"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'plantas');

create policy "autenticado troca planta"
  on storage.objects for update
  to authenticated using (bucket_id = 'plantas');

create policy "autenticado apaga planta"
  on storage.objects for delete
  to authenticated using (bucket_id = 'plantas');
