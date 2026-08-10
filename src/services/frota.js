// Frota de caminhoes — camada de dados
//
// Ver supabase/schema_frota.sql.
//
// Antes disto o caminhao era so um texto: a tela de envio tinha uma lista fixa
// no codigo, e o rastreamento mostrava placa e motorista inventados, iguais
// para qualquer viagem. Aqui cada caminhao passa a existir de verdade.
//
// O vinculo com as outras tabelas e pela identificacao em texto, nao por chave
// estrangeira — a razao esta comentada no schema.

import { supabase } from './supabase';

function normalizarCaminhao(linha) {
  return {
    id: String(linha.id),
    identificacao: linha.identificacao,
    placa: linha.placa || '',
    motorista: linha.motorista || '',
    capacidadeM3: linha.capacidade_m3 === null ? null : Number(linha.capacidade_m3),
  };
}

const CAMPOS = 'id, identificacao, placa, motorista, capacidade_m3';

// ─────────────────────────────────────────────────────────────
// BUSCAR A FROTA VISIVEL
// A construtora recebe os caminhoes dela; o mestre, os que ja foram
// despachados para obras que ele enxerga. Quem filtra e o servidor.
// ─────────────────────────────────────────────────────────────
export async function buscarFrota() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('caminhoes')
    .select(CAMPOS)
    .order('identificacao', { ascending: true });

  if (error) {
    console.error('[Frota] Erro ao buscar:', error.message);
    throw new Error(`Não foi possível carregar a frota: ${error.message}`);
  }

  return data.map(normalizarCaminhao);
}

// Localiza um caminhao pela identificacao dentro de uma lista ja carregada.
// Usada pelas telas que tem so o texto do caminhao em maos (rastreamento,
// mapa de concretagem) e precisam dos dados completos dele.
export function acharCaminhao(frota, identificacao) {
  return frota.find((c) => c.identificacao === identificacao) || null;
}

// ─────────────────────────────────────────────────────────────
// CADASTRAR UM CAMINHAO
// ─────────────────────────────────────────────────────────────
export async function criarCaminhao({ identificacao, placa, motorista, capacidadeM3 }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sua sessão expirou. Entre novamente.');

  const { data, error } = await supabase
    .from('caminhoes')
    .insert({
      identificacao: identificacao.trim(),
      placa: placa?.trim().toUpperCase() || null,
      motorista: motorista?.trim() || null,
      capacidade_m3: capacidadeM3 ? Number(capacidadeM3) : null,
      dono: session.user.id,
    })
    .select(CAMPOS)
    .single();

  if (error) {
    // O indice unico (dono, identificacao) devolve o codigo 23505
    if (error.code === '23505') {
      throw new Error(`Já existe um caminhão com a identificação "${identificacao}".`);
    }
    console.error('[Frota] Erro ao cadastrar:', error.message);
    throw new Error(`Não foi possível cadastrar o caminhão: ${error.message}`);
  }

  console.log(`[Frota] Caminhao ${data.identificacao} cadastrado.`);
  return normalizarCaminhao(data);
}

// ─────────────────────────────────────────────────────────────
// ATUALIZAR PLACA, MOTORISTA E CAPACIDADE
// A identificacao nao muda de proposito: e por ela que os envios, as posicoes
// e as areas de concretagem apontam para este caminhao. Renomear desligaria
// o historico dele.
// ─────────────────────────────────────────────────────────────
export async function atualizarCaminhao(id, { placa, motorista, capacidadeM3 }) {
  const { data, error } = await supabase
    .from('caminhoes')
    .update({
      placa: placa?.trim().toUpperCase() || null,
      motorista: motorista?.trim() || null,
      capacidade_m3: capacidadeM3 ? Number(capacidadeM3) : null,
    })
    .eq('id', id)
    .select(CAMPOS)
    .single();

  if (error) {
    console.error('[Frota] Erro ao atualizar:', error.message);
    throw new Error(`Não foi possível salvar as alterações: ${error.message}`);
  }

  return normalizarCaminhao(data);
}

// ─────────────────────────────────────────────────────────────
// REMOVER UM CAMINHAO
// Nao apaga o historico: os envios e as areas ja concretadas continuam
// registrando a identificacao dele, porque aquilo aconteceu de fato.
// ─────────────────────────────────────────────────────────────
export async function removerCaminhao(id) {
  const { error } = await supabase.from('caminhoes').delete().eq('id', id);

  if (error) {
    console.error('[Frota] Erro ao remover:', error.message);
    throw new Error(`Não foi possível remover o caminhão: ${error.message}`);
  }

  console.log(`[Frota] Caminhao ${id} removido.`);
}
