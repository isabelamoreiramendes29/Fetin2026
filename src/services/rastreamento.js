// Rastreamento do caminhao — camada de dados
//
// A construtora controla a betoneira e escreve aqui; o mestre, no canteiro,
// le daqui para acompanhar a chegada. Sao aparelhos diferentes, entao a
// posicao precisa de um lugar comum — ver supabase/schema_rastreamento.sql.
//
// Hoje quem alimenta e a simulacao da tela da construtora. Quando o modulo
// GPS/LoRa entrar, ele passa a alimentar esta mesma tabela e nada mais muda.

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────
// PUBLICAR A POSICAO DO CAMINHAO
// Chamada a cada avanco da simulacao. Falha aqui nao pode travar a animacao
// na tela de quem esta dirigindo o teste, entao o erro so e registrado.
// ─────────────────────────────────────────────────────────────
export async function publicarPosicao(obraId, progresso, emMovimento) {
  const { error } = await supabase
    .from('posicao_caminhao')
    .upsert(
      {
        id_obra: String(obraId),
        progresso,
        em_movimento: emMovimento,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'id_obra' }
    );

  if (error) {
    console.warn('[Rastreamento] Nao publicou a posicao:', error.message);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// LER A POSICAO ATUAL DO CAMINHAO DE UMA OBRA
// Retorna { progresso: 0, emMovimento: false } quando ainda nao ha registro —
// obra cujo caminhao nunca saiu e situacao normal, nao erro.
// ─────────────────────────────────────────────────────────────
export async function buscarPosicao(obraId) {
  const { data, error } = await supabase
    .from('posicao_caminhao')
    .select('progresso, em_movimento, atualizado_em')
    .eq('id_obra', String(obraId))
    .maybeSingle();

  if (error) {
    console.error('[Rastreamento] Erro ao buscar posicao:', error.message);
    throw new Error('Não foi possível carregar a posição do caminhão.');
  }

  if (!data) return { progresso: 0, emMovimento: false, atualizadoEm: null };

  return {
    progresso: Number(data.progresso),
    emMovimento: data.em_movimento,
    atualizadoEm: data.atualizado_em,
  };
}
