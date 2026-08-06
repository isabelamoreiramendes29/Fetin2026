-- ─────────────────────────────────────────────────────────────
-- Financeiro — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- O que isto resolve: antes as compras viviam no FinanceiroContext, em
-- memoria — fechar o app apagava tudo. E os cards de resumo liam totais que
-- vinham do backend por MQTT, enquanto a lista vinha da memoria. Duas fontes
-- de verdade para o mesmo dado, e uma delas volatil.
--
-- Agora existe uma tabela so. Os totais sao somados a partir dela, entao
-- lista e resumo nao tem como divergir.
--
-- id_obra e text e nao tem chave estrangeira: as obras ainda vivem no MySQL
-- do backend, entao nao ha para onde apontar.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.compras_cimento (
  id          bigserial   primary key,
  id_obra     text        not null,
  data_compra date        not null,
  volume      numeric     not null check (volume > 0),  -- m³
  valor       numeric     not null check (valor  > 0),  -- R$
  criado_em   timestamptz not null default now()
);

-- A consulta da tela e sempre "compras desta obra, mais recentes primeiro"
create index if not exists compras_por_obra
  on public.compras_cimento (id_obra, data_compra desc);

alter table public.compras_cimento enable row level security;

drop policy if exists "autenticado le compras"    on public.compras_cimento;
drop policy if exists "autenticado grava compras" on public.compras_cimento;
drop policy if exists "autenticado apaga compras" on public.compras_cimento;

create policy "autenticado le compras"
  on public.compras_cimento for select to authenticated using (true);

create policy "autenticado grava compras"
  on public.compras_cimento for insert to authenticated with check (true);

create policy "autenticado apaga compras"
  on public.compras_cimento for delete to authenticated using (true);
