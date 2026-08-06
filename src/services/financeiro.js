// Financeiro — camada de dados
//
// Compras de cimento por obra. Ver supabase/schema_financeiro.sql.
//
// Saiu do MQTT porque registrar uma compra e uma escrita transacional de um
// usuario, nao telemetria: precisa de confirmacao, de historico e de controle
// de quem ve o que. MQTT publica e torce — nao devolve nem "gravei".
//
// E havia um problema pior: as compras viviam no FinanceiroContext, em memoria,
// enquanto os totais dos cards vinham do backend por MQTT. Fechar o app apagava
// a lista, e as duas fontes podiam discordar. Aqui existe uma tabela so, e os
// totais sao somados dela.

import { supabase } from './supabase';

// Converte a linha do banco (snake_case) para o formato usado no app
function normalizarCompra(linha) {
  return {
    id: String(linha.id),
    data: linha.data_compra,
    volume: Number(linha.volume),
    valor: Number(linha.valor),
  };
}

// ─────────────────────────────────────────────────────────────
// BUSCAR AS COMPRAS DE UMA OBRA
// Mais recentes primeiro. Retorna [] quando ainda nao ha compra — nao e erro.
// ─────────────────────────────────────────────────────────────
export async function buscarCompras(obraId) {
  const { data, error } = await supabase
    .from('compras_cimento')
    .select('id, data_compra, volume, valor')
    .eq('id_obra', String(obraId))
    .order('data_compra', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error('[Financeiro] Erro ao buscar compras:', error.message);
    throw new Error(`Não foi possível carregar as compras: ${error.message}`);
  }

  console.log(`[Financeiro] Obra ${obraId}: ${data.length} compras.`);
  return data.map(normalizarCompra);
}

// ─────────────────────────────────────────────────────────────
// REGISTRAR UMA COMPRA
// `data` e um objeto Date; o banco guarda so o dia, sem hora.
// ─────────────────────────────────────────────────────────────
export async function adicionarCompra(obraId, { data, volume, valor }) {
  const { data: linha, error } = await supabase
    .from('compras_cimento')
    .insert({
      id_obra: String(obraId),
      // toISOString devolve 'AAAA-MM-DDTHH:MM:SS...'; a coluna e date, entao
      // fica so a parte da data
      data_compra: data.toISOString().slice(0, 10),
      volume,
      valor,
    })
    .select('id, data_compra, volume, valor')
    .single();

  if (error) {
    console.error('[Financeiro] Erro ao salvar compra:', error.message);
    throw new Error(`Não foi possível salvar a compra: ${error.message}`);
  }

  console.log(`[Financeiro] Compra ${linha.id} registrada na obra ${obraId}.`);
  return normalizarCompra(linha);
}

// ─────────────────────────────────────────────────────────────
// REMOVER UMA COMPRA
// Lancamento errado acontece, e sem isto a unica saida seria mexer no banco.
// ─────────────────────────────────────────────────────────────
export async function removerCompra(idCompra) {
  const { error } = await supabase
    .from('compras_cimento')
    .delete()
    .eq('id', idCompra);

  if (error) {
    console.error('[Financeiro] Erro ao remover compra:', error.message);
    throw new Error(`Não foi possível remover a compra: ${error.message}`);
  }

  console.log(`[Financeiro] Compra ${idCompra} removida.`);
}

// ─────────────────────────────────────────────────────────────
// TOTAIS DA OBRA
// Somados a partir da mesma lista que a tela exibe — e o que garante que o
// resumo nunca discorde do historico logo abaixo dele.
// ─────────────────────────────────────────────────────────────
export function calcularTotais(compras) {
  return compras.reduce(
    (totais, compra) => ({
      gasto: totais.gasto + compra.valor,
      volume: totais.volume + compra.volume,
    }),
    { gasto: 0, volume: 0 }
  );
}
