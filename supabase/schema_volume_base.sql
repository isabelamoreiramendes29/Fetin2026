-- ─────────────────────────────────────────────────────────────
-- Referencia do sensor de vazao
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
-- Depende de: schema_caminhoes.sql e schema_volume.sql
--
-- Sensor de vazao acumula desde que foi ligado. Se ele ja marcava 27 m³ quando
-- a viagem comecou, a viagem nao pode registrar 27 — ela entregou zero ate
-- agora.
--
-- Esta coluna guarda quanto o sensor marcava no inicio da viagem. O volume
-- entregue passa a ser a diferenca entre a leitura atual e essa referencia.
--
-- Isso resolve sem depender do firmware: nao e preciso zerar o contador do
-- sensor entre uma viagem e outra, nem reiniciar o ESP32 antes de demonstrar.
-- ─────────────────────────────────────────────────────────────

alter table public.envios_caminhao
  -- Leitura bruta do sensor no momento em que a viagem comecou a ser medida.
  -- Nula ate a primeira leitura chegar.
  add column if not exists volume_base numeric;
