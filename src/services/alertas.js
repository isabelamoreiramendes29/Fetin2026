// Alertas — deteccao e registro
//
// Ver supabase/schema_alertas.sql.
//
// Duas coisas acontecem quando uma leitura sai da faixa: um registro vai para
// o banco, e uma notificacao aparece no celular. O registro existe para quem
// nao estava com o app aberto; a notificacao, para quem estava.
//
// LIMITE IMPORTANTE: notificacao local so dispara com o app rodando ou em
// segundo plano. Com o app fechado de vez, o JavaScript nao roda e nada
// acontece. Alerta com o celular no bolso exigiria um servidor mandando push.

import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { avaliarTemperatura } from '../config/temperatura';

// Mostra a notificacao mesmo com o app aberto — sem isto, o alerta so
// apareceria se o usuario estivesse em outro aplicativo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Evita repetir o mesmo alerta a cada leitura. O sensor publica varias vezes
// por minuto; sem isto, uma betoneira quente geraria dezenas de avisos iguais.
// Guarda por obra qual foi a ultima zona alertada.
const ultimaZonaAlertada = new Map();

// ─────────────────────────────────────────────────────────────
// PEDIR PERMISSAO DE NOTIFICACAO
// Chamada uma vez, quando o app abre. Negar nao quebra nada: os alertas
// continuam sendo gravados e aparecem na tela de Alertas.
// ─────────────────────────────────────────────────────────────
export async function pedirPermissaoNotificacao() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;

    const { status: novoStatus } = await Notifications.requestPermissionsAsync();
    return novoStatus === 'granted';
  } catch (falha) {
    console.warn('[Alertas] Nao foi possivel pedir permissao:', falha.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// VERIFICAR UMA LEITURA E ALERTAR SE PRECISO
// Chamada a cada leitura gravada. Retorna o alerta criado, ou null quando a
// temperatura esta dentro do esperado.
// ─────────────────────────────────────────────────────────────
export async function verificarTemperatura(obraId, temperatura, obraNome = '', caminhao = null) {
  const zona = avaliarTemperatura(temperatura);

  // Voltou ao normal: libera o proximo alerta desta obra
  if (!zona.severidade) {
    ultimaZonaAlertada.delete(String(obraId));
    return null;
  }

  // Mesma zona da ultima vez: ja foi avisado, nao repete
  if (ultimaZonaAlertada.get(String(obraId)) === zona.nome) return null;
  ultimaZonaAlertada.set(String(obraId), zona.nome);

  const mensagem = caminhao
    ? `Caminhão ${caminhao}: ${temperatura} °C — ${zona.rotulo.toLowerCase()}`
    : `Temperatura em ${temperatura} °C — ${zona.rotulo.toLowerCase()}`;

  const alerta = await registrarAlerta({
    obraId,
    severidade: zona.severidade,
    mensagem,
    valor: temperatura,
    caminhao,
  });

  await notificar(
    zona.severidade === 'critica' ? '🔴 Temperatura crítica' : '🟡 Atenção na temperatura',
    obraNome ? `${obraNome} — ${mensagem}` : mensagem
  );

  return alerta;
}

// ─────────────────────────────────────────────────────────────
// GRAVAR UM ALERTA
// Falha aqui nao pode derrubar a leitura que o originou, entao so registra.
// ─────────────────────────────────────────────────────────────
export async function registrarAlerta({ obraId, severidade, mensagem, valor, caminhao, tipo = 'temperatura' }) {
  const { data, error } = await supabase
    .from('alertas')
    .insert({
      id_obra: obraId,
      tipo,
      severidade,
      mensagem,
      valor,
      caminhao,
    })
    .select('id, tipo, severidade, mensagem, valor, caminhao, lido, criado_em')
    .single();

  if (error) {
    console.warn('[Alertas] Nao gravou o alerta:', error.message);
    return null;
  }

  console.log(`[Alertas] ${severidade}: ${mensagem}`);
  return normalizarAlerta(data);
}

// Dispara a notificacao no aparelho. Sem trigger = aparece imediatamente.
async function notificar(titulo, corpo) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: corpo },
      trigger: null,
    });
  } catch (falha) {
    console.warn('[Alertas] Nao notificou:', falha.message);
  }
}

function normalizarAlerta(linha) {
  return {
    id: String(linha.id),
    tipo: linha.tipo,
    severidade: linha.severidade,
    mensagem: linha.mensagem,
    valor: linha.valor === null ? null : Number(linha.valor),
    caminhao: linha.caminhao,
    lido: linha.lido,
    criadoEm: linha.criado_em,
  };
}

// ─────────────────────────────────────────────────────────────
// BUSCAR OS ALERTAS DE UMA OBRA
// ─────────────────────────────────────────────────────────────
export async function buscarAlertas(obraId) {
  const { data, error } = await supabase
    .from('alertas')
    .select('id, tipo, severidade, mensagem, valor, caminhao, lido, criado_em')
    .eq('id_obra', obraId)
    .order('criado_em', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Alertas] Erro ao buscar:', error.message);
    throw new Error(`Não foi possível carregar os alertas: ${error.message}`);
  }

  return data.map(normalizarAlerta);
}

// ─────────────────────────────────────────────────────────────
// MARCAR TODOS COMO LIDOS
// ─────────────────────────────────────────────────────────────
export async function marcarTodosLidos(obraId) {
  const { error } = await supabase
    .from('alertas')
    .update({ lido: true })
    .eq('id_obra', obraId)
    .eq('lido', false);

  if (error) {
    console.warn('[Alertas] Nao marcou como lidos:', error.message);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// QUANTOS ALERTAS NAO LIDOS
// Alimenta o contador no menu.
// ─────────────────────────────────────────────────────────────
export async function contarNaoLidos(obraId) {
  const { count, error } = await supabase
    .from('alertas')
    .select('id', { count: 'exact', head: true })
    .eq('id_obra', obraId)
    .eq('lido', false);

  if (error) {
    console.warn('[Alertas] Nao contou os nao lidos:', error.message);
    return 0;
  }

  return count || 0;
}
