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
// ULTIMA LEITURA DE UMIDADE
// Alimenta a tela quando ela abre ou quando troca de caminhao — sem isso, o
// card so apareceria depois da proxima publicacao do sensor.
// ─────────────────────────────────────────────────────────────
export async function buscarUltimaUmidade(obraId, caminhao = null) {
  let consulta = supabase
    .from('leituras_umidade')
    .select('valor, status, medido_em')
    .eq('id_obra', String(obraId));

  if (caminhao) consulta = consulta.eq('caminhao', caminhao);

  const { data, error } = await consulta
    .order('medido_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Umidade] Erro ao buscar ultima leitura:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    valor: Number(data.valor),
    status: data.status,
    medidoEm: data.medido_em,
  };
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
