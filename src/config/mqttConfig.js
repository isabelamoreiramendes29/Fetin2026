// Configuracao do broker MQTT
//
// O MQTT ficou com uma responsabilidade so: entregar a leitura do sensor em
// tempo real. Login, obras, frota, financeiro e envio de caminhao vivem no
// Supabase — sairam daqui porque sao cadastro e consulta, e pub/sub nao
// responde pergunta.
//
// ┌─────────────────────────────────────────────────────────────┐
// │ ESTES SAO OS VALORES QUE MUDAM NO DIA DA INTEGRACAO.        │
// │ Se o app nao receber nada, e quase sempre um destes tres:   │
// │ o IP do broker, a porta, ou o nome do topico.               │
// └─────────────────────────────────────────────────────────────┘

// ─────────────────────────────────────────────────────────────
// ESTRUTURA DOS TOPICOS
//
//   cemtinel/caminhao/{caminhao}/temperatura
//   cemtinel/caminhao/{caminhao}/volume
//
// O identificador e o CAMINHAO, e nao a obra, por um motivo pratico: o sensor
// e fixo no caminhao e sabe quem ele e — o numero fica gravado no codigo dele,
// uma vez. Ja a obra muda a cada viagem, e o sensor nao tem como saber para
// onde esta indo sem alguem reconfigurar a cada saida.
//
// O app faz a ponte: ele sabe quais caminhoes foram despachados para cada obra
// (tabela envios_caminhao) e assina so os topicos desses caminhoes. O filtro
// continua acontecendo no broker, e o sensor continua burro, que e o certo.
// ─────────────────────────────────────────────────────────────

const RAIZ = 'cemtinel';

const mqttConfig = {
  // IP do broker na rede local.
  // ATENCAO: a versao antiga do projeto tinha 192.168.66.73 num campo e
  // 192.168.66.68 em outro. Confirme o valor atual antes de testar — IP de
  // rede local muda quando o roteador redistribui os enderecos.
  host: '192.168.66.55',

  // Porta WebSocket do Mosquitto. Precisa ser a de WebSocket, nao a 1883:
  // React Native nao fala TCP puro, so WebSocket.
  porta: 9001,

  // Caminho do WebSocket no broker
  caminho: '/mqtt',

  // Topicos de um caminhao especifico
  topicoTemperatura: (caminhao) => `${RAIZ}/caminhao/${caminhao}/temperatura`,
  topicoVolume:      (caminhao) => `${RAIZ}/caminhao/${caminhao}/volume`,

  // Usados quando a obra ainda nao tem caminhao despachado: sem isso, nao
  // haveria o que assinar e testar ficaria impossivel antes do primeiro envio
  topicoTemperaturaTodos: `${RAIZ}/caminhao/+/temperatura`,
  topicoVolumeTodos:      `${RAIZ}/caminhao/+/volume`,

  // Tira o identificador do caminho: de 'cemtinel/caminhao/4/temperatura' → '4'
  caminhaoDoTopico: (topico) => {
    const partes = String(topico).split('/');
    const indice = partes.indexOf('caminhao');
    return indice >= 0 && partes[indice + 1] ? partes[indice + 1] : null;
  },

  // ── COMPATIBILIDADE ──
  // Enquanto o sensor nao migrar para a estrutura acima, o app tambem assina
  // o topico antigo. Assim a integracao funciona com o que ja existe, e a
  // mudanca pode ser feita com calma depois.
  //
  // Formato antigo: { status, mensagem, caminhao: { id_obra, temperatura_interna } }
  // Deixe como null para parar de assinar o legado.
  topicoLegado: 'app/enviar_caminhao/resp',

  // QoS 1 = entrega garantida pelo menos uma vez
  qos: 1,

  // Segundos ate desistir da conexao
  timeout: 10,
};

export default mqttConfig;
