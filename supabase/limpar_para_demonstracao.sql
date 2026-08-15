-- ─────────────────────────────────────────────────────────────
-- Limpeza para demonstracao
--
-- Como usar: painel do Supabase > SQL Editor > New query,
-- cola este arquivo inteiro e clica em Run.
--
-- Apaga TODOS os dados operacionais e deixa o app como recem-instalado, para
-- a apresentacao comecar do zero: cadastrar a obra, despachar o caminhao,
-- receber as leituras, marcar as areas.
--
-- O QUE NAO E APAGADO: as contas de usuario e os perfis. Voce continua
-- entrando com o mesmo e-mail e senha.
--
-- ┌─────────────────────────────────────────────────────────────┐
-- │ ISTO APAGA DADOS DE VERDADE E NAO TEM DESFAZER.             │
-- │ Rode so quando quiser mesmo recomecar.                      │
-- └─────────────────────────────────────────────────────────────┘
-- ─────────────────────────────────────────────────────────────

-- A ordem importa: filhos primeiro, porque nem toda tabela tem cascade.
-- As que referenciam obra por texto (leituras, compras, plantas) nao seriam
-- apagadas junto com a obra, entao vao explicitamente.

-- Mapa de concretagem
delete from public.regioes_concretagem;
delete from public.plantas;

-- Sensores
delete from public.leituras_temperatura;
delete from public.leituras_umidade;

-- Financeiro
delete from public.compras_cimento;

-- Alertas
delete from public.alertas;

-- Viagens e posicoes
delete from public.posicao_caminhao;
delete from public.envios_caminhao;

-- Obras por ultimo
delete from public.obras;


-- ─────────────────────────────────────────────────────────────
-- FROTA
--
-- Deixada de fora de proposito: cadastrar caminhao com placa, motorista e
-- capacidade leva tempo, e raramente vale gastar isso na frente do professor.
--
-- Se quiser mostrar tambem o cadastro da frota, tire o comentario da linha
-- abaixo. Lembrando que a identificacao precisa voltar a bater com a que o
-- sensor publica.
-- ─────────────────────────────────────────────────────────────
-- delete from public.caminhoes;


-- ─────────────────────────────────────────────────────────────
-- CONFERENCIA
-- Deve voltar tudo zerado, menos a frota se voce a manteve.
-- ─────────────────────────────────────────────────────────────
select 'obras'        as tabela, count(*) from public.obras
union all select 'envios',        count(*) from public.envios_caminhao
union all select 'temperatura',   count(*) from public.leituras_temperatura
union all select 'umidade',       count(*) from public.leituras_umidade
union all select 'compras',       count(*) from public.compras_cimento
union all select 'alertas',       count(*) from public.alertas
union all select 'areas',         count(*) from public.regioes_concretagem
union all select 'plantas',       count(*) from public.plantas
union all select 'frota',         count(*) from public.caminhoes;
