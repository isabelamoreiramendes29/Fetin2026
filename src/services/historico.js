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
import { verificarTemperatura } from './alertas';

// ─────────────────────────────────────────────────────────────
// GRAVAR UMA LEITURA
// Chamada a cada valor que chega pelo MQTT. Falha de gravacao nao pode
// derrubar a exibicao ao vivo, entao o erro e apenas registrado.
// ─────────────────────────────────────────────────────────────
export async function salvarLeitura(obraId, temperatura, contexto = {}) {
  const { error } = await supabase
    .from('leituras_temperatura')
    .insert({
      id_obra: String(obraId),
      temperatura,
      // De qual caminhao veio. Nulo quando o sensor nao identifica.
      caminhao: contexto.caminhao || null,
    });

  if (error) {
    console.warn('[Historico] Nao gravou a leitura:', error.message);
    return false;
  }

  // Toda leitura passa por aqui, entao este e o lugar certo para checar se ela
  // merece alerta — vale para o sensor e para os botoes de simulacao.
  // Sem await: a tela nao espera o alerta para atualizar o mostrador.
  verificarTemperatura(obraId, temperatura, contexto.obraNome, contexto.caminhao);

  return true;
}

// Quando as leituras cabem nesta janela, agrupamos de 5 em 5 minutos
// em vez de por hora (ver agruparLeituras)
// Os limites das faixas vivem dentro de agruparLeituras, junto da razao de
// cada um existir

// ─────────────────────────────────────────────────────────────
// ULTIMA LEITURA REGISTRADA DE UMA OBRA
// E o que a tela de temperatura mostra como "valor atual". Enquanto o sensor
// publicava por MQTT, o valor chegava sozinho; agora a tela pergunta ao banco,
// que e alimentado por quem estiver gravando as leituras.
//
// Retorna null quando a obra ainda nao tem leitura — nao e erro.
// ─────────────────────────────────────────────────────────────
export async function buscarUltimaLeitura(obraId, caminhao = null) {
  let consulta = supabase
    .from('leituras_temperatura')
    .select('temperatura, medido_em')
    .eq('id_obra', String(obraId));

  // Sem caminhao informado, devolve a ultima da obra — vale para leituras
  // antigas, gravadas antes de a coluna existir
  if (caminhao) consulta = consulta.eq('caminhao', caminhao);

  const { data, error } = await consulta
    .order('medido_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Historico] Erro ao buscar ultima leitura:', error.message);
    throw new Error('Não foi possível carregar a temperatura.');
  }

  if (!data) return null;

  return {
    temperatura: Number(data.temperatura),
    medidoEm: data.medido_em,
  };
}

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

  // Tres faixas, e a mais fina existe por experiencia propria: com faixa
  // minima de 5 minutos, um teste de tres minutos virava um unico ponto — e
  // com um ponto so, minima, maxima e ultima medicao mostravam o mesmo numero.
  let tamanhoMs;
  let comSegundos = false;

  if (intervalo <= 10 * 60 * 1000) {          // ate 10 minutos
    tamanhoMs = 30 * 1000;                    // faixas de 30 segundos
    comSegundos = true;
  } else if (intervalo <= 2 * 60 * 60 * 1000) { // ate 2 horas
    tamanhoMs = 5 * 60 * 1000;                // faixas de 5 minutos
  } else {
    tamanhoMs = 60 * 60 * 1000;               // faixas de 1 hora
  }

  const faixas = new Map();

  leituras.forEach(({ temperatura, medido_em }) => {
    const instante = new Date(medido_em).getTime();

    // A chave e o inicio da faixa em milissegundos. Agrupar pelo numero, e nao
    // pelo texto do horario, faz a ordenacao sair certa mesmo quando a serie
    // atravessa a meia-noite.
    const inicio = Math.floor(instante / tamanhoMs) * tamanhoMs;

    const faixa = faixas.get(inicio) || { soma: 0, quantidade: 0 };
    faixa.soma += Number(temperatura);
    faixa.quantidade += 1;
    faixas.set(inicio, faixa);
  });

  return Array.from(faixas.entries())
    .sort(([a], [b]) => a - b)
    .map(([inicio, { soma, quantidade }]) => {
      const d = new Date(inicio);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');

      return {
        hora: comSegundos ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`,
        temp: Math.round((soma / quantidade) * 10) / 10,
      };
    });
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
