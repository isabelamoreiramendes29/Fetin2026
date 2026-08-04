// Historico de temperatura do Cemtinel
//
// Por que isto existe: MQTT nao guarda nada. Quem nao estava ouvindo no momento
// da publicacao perde a leitura para sempre. O grafico de historico precisa de
// uma serie, entao cada leitura recebida e gravada na tabela leituras_temperatura
// (ver supabase/schema.sql) e lida de volta daqui.
//
// A tela nunca conversa com o Supabase direto: ela chama buscarHistoricoTemperatura.
// Se um dia o backend do MQTT expuser um topico de historico, basta trocar o miolo
// desta funcao — a tela nao muda.

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────
// GRAVAR UMA LEITURA
// Chamada a cada valor que chega pelo MQTT. Falha de gravacao nao pode
// derrubar a exibicao ao vivo, entao o erro e apenas registrado.
// ─────────────────────────────────────────────────────────────
export async function salvarLeitura(obraId, temperatura) {
  const { error } = await supabase
    .from('leituras_temperatura')
    .insert({ id_obra: String(obraId), temperatura });

  if (error) {
    console.warn('[Historico] Nao gravou a leitura:', error.message);
    return false;
  }

  return true;
}

// Quando as leituras cabem nesta janela, agrupamos de 5 em 5 minutos
// em vez de por hora (ver agruparLeituras)
const JANELA_CURTA_MS = 2 * 60 * 60 * 1000; // 2 horas

// ─────────────────────────────────────────────────────────────
// AGRUPAR LEITURAS
// O sensor publica em intervalos irregulares — varias leituras por minuto.
// Mostrar cada uma deixaria o grafico ilegivel, entao elas sao agrupadas
// em faixas e cada faixa vira a media das suas leituras.
//
// O tamanho da faixa e adaptativo, e a razao e pratica: agrupando sempre
// por hora, uma demonstracao de 20 minutos viraria um unico ponto no
// grafico. Entao, se tudo o que existe cabe em 2 horas, agrupamos de 5 em
// 5 minutos; caso contrario, por hora.
//
// Retorna [{ hora: 'HH:MM', temp: number }] em ordem cronologica.
// ─────────────────────────────────────────────────────────────
function agruparLeituras(leituras) {
  if (leituras.length === 0) return [];

  const instantes = leituras.map((l) => new Date(l.medido_em).getTime());
  const intervalo = Math.max(...instantes) - Math.min(...instantes);
  const porMinuto = intervalo <= JANELA_CURTA_MS;

  const faixas = new Map();

  leituras.forEach(({ temperatura, medido_em }) => {
    const data = new Date(medido_em);

    // Rotulo da faixa: 'HH:MM' arredondado para baixo (5 min), ou 'HH:00'
    const minuto = porMinuto ? Math.floor(data.getMinutes() / 5) * 5 : 0;
    const rotulo =
      `${String(data.getHours()).padStart(2, '0')}:` +
      `${String(minuto).padStart(2, '0')}`;

    const faixa = faixas.get(rotulo) || { soma: 0, quantidade: 0 };
    faixa.soma += Number(temperatura);
    faixa.quantidade += 1;
    faixas.set(rotulo, faixa);
  });

  return Array.from(faixas.entries())
    .map(([hora, { soma, quantidade }]) => ({
      hora,
      temp: Math.round((soma / quantidade) * 10) / 10,
    }))
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

// ─────────────────────────────────────────────────────────────
// BUSCAR O HISTORICO DE UMA OBRA
// Traz as leituras das ultimas `horas` (padrao 24h) ja agrupadas por hora.
// Retorna [] quando a obra ainda nao tem leitura nenhuma — nao e erro.
// ─────────────────────────────────────────────────────────────
export async function buscarHistoricoTemperatura(obraId, horas = 24) {
  const desde = new Date(Date.now() - horas * 60 * 60 * 1000).toISOString();

  console.log(`[Historico] Buscando leituras da obra ${obraId} desde ${desde}`);

  const { data, error } = await supabase
    .from('leituras_temperatura')
    .select('temperatura, medido_em')
    .eq('id_obra', String(obraId))
    .gte('medido_em', desde)
    .order('medido_em', { ascending: true });

  if (error) {
    console.error('[Historico] Erro ao buscar:', error.message);
    throw new Error('Não foi possível carregar o histórico.');
  }

  console.log(`[Historico] ${data.length} leituras encontradas.`);

  return agruparLeituras(data);
}
