// Rastreamento dos caminhoes — camada de dados
//
// A construtora controla as betoneiras e escreve aqui; o mestre, no canteiro,
// le daqui para acompanhar a chegada. Sao aparelhos diferentes, entao a
// posicao precisa de um lugar comum — ver supabase/schema_caminhoes.sql.
//
// A chave e o par (obra, caminhao), nao a obra sozinha: uma concretagem usa
// varios caminhoes, e e exatamente por isso que o Mapa de Concretagem existe.
// Na primeira versao a obra era a chave, e o segundo caminhao despachado
// sobrescrevia a posicao do primeiro.
//
// Hoje quem alimenta e a simulacao da tela da construtora. Quando o modulo
// GPS/LoRa entrar, ele passa a alimentar esta mesma tabela.

import { supabase } from './supabase';

function normalizarPosicao(linha) {
  return {
    caminhao: linha.caminhao,
    progresso: Number(linha.progresso),
    emMovimento: linha.em_movimento,
    atualizadoEm: linha.atualizado_em,
  };
}

// ─────────────────────────────────────────────────────────────
// PUBLICAR A POSICAO DE UM CAMINHAO
// Chamada a cada avanco da simulacao. Falha aqui nao pode travar a animacao
// na tela de quem esta dirigindo o teste, entao o erro so e registrado.
// ─────────────────────────────────────────────────────────────
export async function publicarPosicao(obraId, caminhao, progresso, emMovimento) {
  const { error } = await supabase
    .from('posicao_caminhao')
    .upsert(
      {
        id_obra: obraId,
        caminhao,
        progresso,
        em_movimento: emMovimento,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'id_obra,caminhao' }
    );

  if (error) {
    console.warn('[Rastreamento] Nao publicou a posicao:', error.message);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// LER A POSICAO DE TODOS OS CAMINHOES A CAMINHO DE UMA OBRA
// Retorna [] quando nenhum caminhao foi despachado — situacao normal.
// ─────────────────────────────────────────────────────────────
export async function buscarPosicoes(obraId) {
  const { data, error } = await supabase
    .from('posicao_caminhao')
    .select('caminhao, progresso, em_movimento, atualizado_em')
    .eq('id_obra', obraId)
    .order('caminhao', { ascending: true });

  if (error) {
    console.error('[Rastreamento] Erro ao buscar posicoes:', error.message);
    throw new Error('Não foi possível carregar a posição dos caminhões.');
  }

  return data.map(normalizarPosicao);
}
