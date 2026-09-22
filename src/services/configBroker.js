// Endereco do broker MQTT, editavel dentro do aplicativo
//
// Por que isto existe: ate agora o IP do broker vivia so em config/mqttConfig.js.
// Trocar de rede — da bancada para a escola, da escola para o hotspot — exigia
// editar codigo e recarregar. Num APK instalado isso e impossivel: nao ha
// codigo para editar.
//
// Entao o IP passa a morar aqui, guardado no aparelho. O valor de mqttConfig
// vira apenas o PADRAO de fabrica, usado enquanto ninguem tiver digitado nada.
//
// Detalhe importante: services/mqtt.js le o host de forma SINCRONA, na hora de
// conectar, e AsyncStorage e assincrono. Por isso o valor fica espelhado numa
// variavel de modulo: carregarHost() enche esse espelho uma vez, na abertura do
// app, e hostAtual() devolve na hora, sem esperar.

import AsyncStorage from '@react-native-async-storage/async-storage';
import mqttConfig from '../config/mqttConfig';

const CHAVE = '@cemtinel:brokerHost';

// Espelho sincrono. Comeca com o padrao de fabrica para o app nunca ficar
// sem endereco nenhum, mesmo antes de carregarHost() terminar.
let hostEmMemoria = mqttConfig.host;

// ─────────────────────────────────────────────────────────────
// VALIDAR
// Aceita IPv4 (192.168.0.10) ou nome de maquina (broker.local).
// Rejeitar cedo evita o usuario salvar um endereco impossivel e passar meia
// hora achando que o problema e o sensor.
// ─────────────────────────────────────────────────────────────
export function validarHost(texto) {
  const valor = String(texto || '').trim();

  if (!valor) return 'Digite o endereço do broker.';
  if (/\s/.test(valor)) return 'O endereço não pode ter espaços.';

  // Erro classico: colar "ws://10.0.0.5:9001" inteiro no campo
  if (valor.includes('://') || valor.includes(':')) {
    return 'Digite só o IP, sem ws:// e sem a porta.';
  }

  const pareceIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(valor);

  if (pareceIPv4) {
    const partes = valor.split('.').map(Number);
    if (partes.some((n) => n > 255)) return 'IP inválido: cada número vai até 255.';
    return null;
  }

  // Nome de maquina
  if (/^[a-zA-Z0-9.-]+$/.test(valor)) return null;

  return 'Endereço inválido.';
}

// ─────────────────────────────────────────────────────────────
// LER (sincrono) — e o que services/mqtt.js usa na hora de conectar
// ─────────────────────────────────────────────────────────────
export function hostAtual() {
  return hostEmMemoria;
}

// ─────────────────────────────────────────────────────────────
// CARREGAR O QUE ESTAVA SALVO
// Chamada uma vez, na abertura do app. Falha aqui nao pode impedir o app de
// abrir: sem valor salvo, segue com o padrao de fabrica.
// ─────────────────────────────────────────────────────────────
export async function carregarHost() {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    if (salvo) {
      hostEmMemoria = salvo;
      console.log(`[Broker] Endereco salvo: ${salvo}`);
    } else {
      console.log(`[Broker] Sem endereco salvo, usando o padrao ${hostEmMemoria}`);
    }
  } catch (falha) {
    console.warn('[Broker] Nao leu o endereco salvo:', falha.message);
  }
  return hostEmMemoria;
}

// ─────────────────────────────────────────────────────────────
// GRAVAR UM ENDERECO NOVO
// Atualiza o espelho ANTES de gravar: a tela reconecta na hora, sem esperar
// o disco. Se a gravacao falhar, o endereco novo vale nesta sessao e volta ao
// anterior na proxima abertura — que e melhor que recusar a troca.
// ─────────────────────────────────────────────────────────────
export async function definirHost(texto) {
  const valor = String(texto).trim();
  const erro = validarHost(valor);
  if (erro) throw new Error(erro);

  hostEmMemoria = valor;

  try {
    await AsyncStorage.setItem(CHAVE, valor);
    console.log(`[Broker] Endereco gravado: ${valor}`);
  } catch (falha) {
    console.warn('[Broker] Nao gravou o endereco:', falha.message);
  }

  return valor;
}

// Volta ao valor escrito em config/mqttConfig.js
export async function restaurarPadrao() {
  hostEmMemoria = mqttConfig.host;
  try {
    await AsyncStorage.removeItem(CHAVE);
  } catch (falha) {
    console.warn('[Broker] Nao apagou o endereco salvo:', falha.message);
  }
  return hostEmMemoria;
}
