-- ─────────────────────────────────────────────────────────────
-- Volume entregue — schema
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
-- Depende de: schema_caminhoes.sql
--
-- O sensor mede o volume descarregado, assim como mede a temperatura. Com esse
-- numero, o app compara tres coisas que ate agora nao se falavam:
--
--   planejado  — quanto a obra precisa      (obras.volume_cimento)
--   comprado   — quanto foi pago            (soma de compras_cimento.volume)
--   entregue   — quanto de fato chegou      (soma daqui)
--
-- A diferenca entre comprado e entregue e a que importa: pagar por 8 m³ e
-- receber 7,4 e prejuizo que hoje ninguem percebe.
--
-- O volume fica no envio, e nao numa tabela propria, porque cada viagem
-- descarrega uma vez. Uma linha por entrega, nao uma serie como a temperatura.
-- ─────────────────────────────────────────────────────────────

alter table public.envios_caminhao
  -- Nulo enquanto o caminhao nao descarregou. Nao e ausencia de dado: e uma
  -- entrega que ainda nao aconteceu.
  add column if not exists volume_entregue numeric check (volume_entregue >= 0),

  -- Quando a descarga foi medida
  add column if not exists medido_em timestamptz;

-- Os envios de uma obra sao consultados juntos para somar o total entregue
create index if not exists envios_com_volume
  on public.envios_caminhao (id_obra)
  where volume_entregue is not null;

-- A policy de update nao existia: ate agora um envio so era criado e lido.
-- Agora ele precisa receber o volume depois que o caminhao descarrega.
drop policy if exists "autenticado registra volume" on public.envios_caminhao;

create policy "autenticado registra volume"
  on public.envios_caminhao for update
  to authenticated
  using (id_obra in (select id from public.obras));
