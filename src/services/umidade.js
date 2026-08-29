// Umidade da mistura — leitura e deteccao de adicao de agua
//
// Ver supabase/schema_umidade.sql.
//
// O sensor fica dentro do tambor e mede a agua livre da massa. O valor e bruto
// (0 a 4095, direto do conversor do ESP32), entao nao serve para dizer "a massa
// tem 8% de agua". Serve para dizer "subiu 30% em dois minutos" — e e isso que
// importa.
//
// Porque importa: adicionar agua no canteiro deixa o concreto mais facil de
// lancar e destroi a resistencia. E proibido, acontece o tempo todo, e depois
// de lancado ninguem consegue provar. Quando o corpo de prova reprova 28 dias
// depois, comeca a briga entre a concreteira e a obra, sem registro de nada.
// Um salto de umidade com hora e caminhao encerra a discussao.

import { supabase } from './supabase';
import { registrarAlerta } from './alertas';

// Quantas leituras iniciais formam a linha de base da viagem. Poucas demais e
// o ruido vira referencia; muitas demais e a agua adicionada cedo entra na
// media e se esconde.
const LEITURAS_BASE = 5;

// Quanto o valor precisa subir, em porcentagem sobre a base, para ser
// considerado agua adicionada e nao oscilacao normal.
//
// ┌─────────────────────────────────────────────────────────────┐
// │ ESTE NUMERO PRECISA SER CALIBRADO NA BANCADA.               │
// │ Encham a betoneira, anotem o valor estavel, joguem um litro │
// │ de agua e vejam quanto muda. O limite fica entre a variacao │
// │ normal e a variacao causada pela agua.                      │
// └─────────────────────────────────────────────────────────────┘
const VARIACAO_SUSPEITA_PCT = 15;

function normalizar(linha) {
  return {
    id: String(linha.id),
    caminhao: linha.caminhao,
    valor: Number(linha.valor),
    status: linha.status,
    medidoEm: linha.medido_em,
  };
}

// ─────────────────────────────────────────────────────────────
// GRAVAR UMA LEITURA
// Falha de gravacao nao pode derrubar a exibicao ao vivo, entao so registra.
// ─────────────────────────────────────────────────────────────
export async function salvarUmidade(obraId, { valor, status, caminhao }) {
  const { error } = await supabase
    .from('leituras_umidade')
    .insert({
      id_obra: String(obraId),
      caminhao: caminhao || null,
      valor,
      status: status || null,
    });

  if (error) {
    console.warn('[Umidade] Nao gravou a leitura:', error.message);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// LEITURAS DE UM CAMINHAO NUMA OBRA
// Em ordem cronologica, para a deteccao comparar o agora com o comeco.
// ─────────────────────────────────────────────────────────────
export async function buscarUmidade(obraId, caminhao, desde = null) {
  let consulta = supabase
    .from('leituras_umidade')
    .select('id, caminhao, valor, status, medido_em')
    .eq('id_obra', String(obraId))
    .order('medido_em', { ascending: true })
    .limit(500);

  if (caminhao) consulta = consulta.eq('caminhao', caminhao);
  if (desde) consulta = consulta.gte('medido_em', new Date(desde).toISOString());

  const { data, error } = await consulta;

  if (error) {
    console.error('[Umidade] Erro ao buscar:', error.message);
    throw new Error('Não foi possível carregar as leituras de umidade.');
  }

  return data.map(normalizar);
}

// ─────────────────────────────────────────────────────────────
// AVALIAR SE HOUVE ADICAO DE AGUA
//
// Compara a leitura atual com a media das primeiras da viagem. Retorna null
// quando ainda nao ha base suficiente ou quando a variacao esta dentro do
// normal — a ausencia de alerta e o caso comum.
//
// Nota sobre o sinal: na maioria dos sensores capacitivos, MAIS agua significa
// MENOR leitura bruta. Por isso a suspeita e a queda, nao a subida. Se o
// sensor de voces se comportar ao contrario, inverta a comparacao aqui —
// descubram isso na bancada, molhando o sensor e vendo o numero.
// ─────────────────────────────────────────────────────────────
export function avaliarVariacao(leituras) {
  if (!leituras || leituras.length < LEITURAS_BASE + 1) return null;

  const base = leituras.slice(0, LEITURAS_BASE);
  const mediaBase = base.reduce((s, l) => s + l.valor, 0) / base.length;

  if (mediaBase === 0) return null;

  const atual = leituras[leituras.length - 1];
  const variacaoPct = ((atual.valor - mediaBase) / mediaBase) * 100;

  // Queda = mais agua na massa
  if (variacaoPct > -VARIACAO_SUSPEITA_PCT) return null;

  return {
    mediaBase,
    valorAtual: atual.valor,
    variacaoPct,
    caminhao: atual.caminhao,
    medidoEm: atual.medidoEm,
  };
}

// ─────────────────────────────────────────────────────────────
// ESTADO DA MASSA, EM LINGUAGEM DE GENTE
//
// O sensor publica um numero de 0 a 4095 — a leitura crua do conversor do
// ESP32. Esse numero nao diz nada para quem nao conhece o sensor, e ninguem
// que olha a tela conhece: nem o mestre de obra, nem o cliente, nem a banca.
//
// Traduzir para "a massa tem X% de agua" resolveria a legibilidade e seria
// mentira: sensor de umidade de solo dentro de concreto nao mede teor de agua,
// mede conducao eletrica entre dois pontos. O numero absoluto depende da
// posicao do sensor, do traco, da temperatura e do desgaste da sonda.
//
// O que ele mede de verdade e MUDANCA. Entao e a mudanca que a tela mostra:
// a massa esta como saiu da usina, ou esta mais liquida do que saiu? Essa
// pergunta qualquer pessoa entende, e o sensor sabe responder.
//
// A barra vai de 0% (como saiu) a -30% (bem mais liquida). O limite de
// suspeita, 15%, cai exatamente no meio dela.
// ─────────────────────────────────────────────────────────────

// Ja da para desconfiar, mas ainda nao e o suficiente para acusar
const ATENCAO_PCT = 8;

// Fim da escala da barra na tela
const ESCALA_BARRA_PCT = 30;

export const ESTADOS_UMIDADE = {
  aguardando: {
    rotulo: 'Aguardando leitura',
    explicacao: 'O sensor da betoneira ainda não enviou nenhuma medida.',
    cor: '#64748B',
  },
  referencia: {
    rotulo: 'Medindo a referência',
    explicacao: 'As primeiras leituras da viagem viram o ponto de comparação.',
    cor: '#64748B',
  },
  estavel: {
    rotulo: 'Massa estável',
    explicacao: 'A mistura está como saiu da usina.',
    cor: '#22C55E',
  },
  atencao: {
    rotulo: 'Variação incomum',
    explicacao: 'A massa está mais líquida que na saída. Vale verificar.',
    cor: '#FACC15',
  },
  agua: {
    rotulo: 'Possível adição de água',
    explicacao: 'A massa ficou bem mais líquida do que saiu da usina.',
    cor: '#DC2626',
  },
};

// ─────────────────────────────────────────────────────────────
// CLASSIFICAR
// Recebe a media da base e a leitura atual, devolve tudo o que a tela precisa
// desenhar. Funcao pura de proposito: da para testar sem banco e sem sensor.
// ─────────────────────────────────────────────────────────────
export function classificarUmidade({ mediaBase, valorAtual, temBase }) {
  if (valorAtual === null || valorAtual === undefined) {
    return { estado: 'aguardando', variacaoPct: null, posicao: 0, ...ESTADOS_UMIDADE.aguardando };
  }

  if (!temBase || !mediaBase) {
    return { estado: 'referencia', variacaoPct: null, posicao: 0, ...ESTADOS_UMIDADE.referencia };
  }

  const variacaoPct = ((valorAtual - mediaBase) / mediaBase) * 100;

  // Queda = mais agua. Subida = a massa secou, que nao e o risco vigiado aqui,
  // entao o ponteiro fica no inicio da escala.
  const quedaPct = Math.max(-variacaoPct, 0);
  const posicao = Math.min(quedaPct / ESCALA_BARRA_PCT, 1);

  let estado = 'estavel';
  if (quedaPct >= VARIACAO_SUSPEITA_PCT) estado = 'agua';
  else if (quedaPct >= ATENCAO_PCT) estado = 'atencao';

  return {
    estado,
    variacaoPct,
    posicao,
    ...ESTADOS_UMIDADE[estado],
  };
}

// ─────────────────────────────────────────────────────────────
// RESUMO PARA A TELA
// Duas consultas pequenas em vez de trazer a viagem inteira: as primeiras
// leituras (a referencia) e a ultima (o agora). A tela chama isso a cada
// poucos segundos, entao o peso da consulta importa.
// ─────────────────────────────────────────────────────────────
export async function resumoUmidade(obraId, caminhao = null) {
  const base = supabase
    .from('leituras_umidade')
    .select('valor')
    .eq('id_obra', String(obraId))
    .order('medido_em', { ascending: true })
    .limit(LEITURAS_BASE);

  const agora = supabase
    .from('leituras_umidade')
    .select('valor, status, medido_em')
    .eq('id_obra', String(obraId))
    .order('medido_em', { ascending: false })
    .limit(1);

  if (caminhao) {
    base.eq('caminhao', caminhao);
    agora.eq('caminhao', caminhao);
  }

  const [respBase, respAgora] = await Promise.all([base, agora]);

  if (respBase.error || respAgora.error) {
    console.warn('[Umidade] Erro no resumo:', (respBase.error || respAgora.error).message);
    return null;
  }

  const atual = respAgora.data?.[0];
  if (!atual) return { ...classificarUmidade({ valorAtual: null }), valor: null, statusSensor: null, medidoEm: null };

  const amostras = respBase.data || [];
  const temBase = amostras.length >= LEITURAS_BASE;
  const mediaBase = temBase
    ? amostras.reduce((s, l) => s + Number(l.valor), 0) / amostras.length
    : null;

  return {
    ...classificarUmidade({ mediaBase, valorAtual: Number(atual.valor), temBase }),
    valor: Number(atual.valor),
    statusSensor: atual.status,
    medidoEm: atual.medido_em,
    // Vai junto para a tela poder classificar sozinha a leitura que chegar
    // pelo MQTT, sem ter que consultar o banco a cada mensagem do sensor
    mediaBase: temBase ? mediaBase : null,
  };
}

// ─────────────────────────────────────────────────────────────
// VERIFICAR E ALERTAR
// Chamada depois de gravar uma leitura. So alerta uma vez por viagem: o
// objetivo e avisar que aconteceu, nao repetir o aviso a cada leitura.
// ─────────────────────────────────────────────────────────────
const jaAlertou = new Set();

export async function verificarAdicaoDeAgua(obraId, caminhao, obraNome = '') {
  const chave = `${obraId}:${caminhao}`;
  if (jaAlertou.has(chave)) return null;

  try {
    const leituras = await buscarUmidade(obraId, caminhao);
    const suspeita = avaliarVariacao(leituras);

    if (!suspeita) return null;

    jaAlertou.add(chave);

    const queda = Math.abs(suspeita.variacaoPct).toFixed(0);
    const mensagem = `Caminhão ${caminhao}: umidade da massa variou ${queda}% — possível adição de água`;

    console.warn('[Umidade]', mensagem);

    return await registrarAlerta({
      obraId,
      tipo: 'umidade',
      severidade: 'critica',
      mensagem,
      valor: suspeita.valorAtual,
      caminhao,
    });
  } catch (falha) {
    console.warn('[Umidade] Falha ao verificar variacao:', falha.message);
    return null;
  }
}

// Zera a memoria de quem ja foi alertado. Chamada ao despachar um caminhao:
// viagem nova, vigilancia nova.
export function reiniciarVigilancia(obraId, caminhao) {
  jaAlertou.delete(`${obraId}:${caminhao}`);
}
