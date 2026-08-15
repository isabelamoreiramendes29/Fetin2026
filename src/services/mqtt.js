// Servico MQTT — recepcao das leituras do sensor
//
// Unica coisa que o app ainda faz por MQTT. Tudo mais migrou para o Supabase,
// porque MQTT e bom em "o valor agora e este" e ruim em "quais sao as obras
// desta construtora" — ele entrega mensagem, nao responde pergunta.
//
// A conexao NAO e efemera: fica aberta enquanto a tela estiver montada,
// recebendo cada leitura por callback. Por isso a funcao devolve uma funcao de
// limpeza, que precisa ser chamada ao desmontar a tela.
//
// O sensor publica por caminhao, nao por obra — ver a explicacao em
// config/mqttConfig.js. Quem faz a ponte e o app, que sabe quais caminhoes
// foram despachados para a obra aberta.

import Paho from 'paho-mqtt';
import mqttConfig from '../config/mqttConfig';

// Cada conexao recebe um ID diferente: dois clientes com o mesmo ID derrubam
// um ao outro no broker
function gerarClientId() {
  return 'cemtinel_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// Aceita o numero solto ("28.4") ou um JSON com o campo. O numero solto e o
// formato recomendado — mais simples de montar no microcontrolador.
function lerValor(texto, ...camposPossiveis) {
  const direto = parseFloat(texto);
  if (!isNaN(direto)) return direto;

  try {
    const payload = JSON.parse(texto);
    for (const campo of camposPossiveis) {
      const valor = parseFloat(payload[campo]);
      if (!isNaN(valor)) return valor;
    }
  } catch {
    // Nao era JSON — cai no return abaixo
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// FORMATO ANTIGO
// Topico unico, com tudo dentro da carga:
//   { status, mensagem, caminhao: { id_obra, temperatura_interna, ... } }
//
// Aqui o filtro por obra precisa ser feito no app, porque o topico nao
// distingue — e exatamente a limitacao que a estrutura nova resolve.
// ─────────────────────────────────────────────────────────────
function lerFormatoLegado(texto, obraId) {
  let payload;
  try {
    payload = JSON.parse(texto);
  } catch {
    console.error('[MQTT] Payload nao e JSON valido:', texto);
    return null;
  }

  const dados = payload.caminhao;
  if (!dados) {
    console.log('[MQTT] Payload sem campo "caminhao", ignorado:', payload);
    return null;
  }

  // != e proposital: id_obra costuma chegar como number e obraId como string
  if (dados.id_obra != obraId) {
    console.log(`[MQTT] Ignorado — leitura da obra ${dados.id_obra}, esta tela e da ${obraId}`);
    return null;
  }

  const temperatura = parseFloat(dados.temperatura_interna);
  if (isNaN(temperatura)) {
    console.error('[MQTT] Temperatura invalida:', dados.temperatura_interna);
    return null;
  }

  const possiveis = [dados.caminhao, dados.id_caminhao, dados.identificacao, dados.placa];
  const caminhao = possiveis.find((v) => v !== undefined && v !== null && v !== '');

  return { temperatura, caminhao: caminhao === undefined ? null : String(caminhao) };
}

// ─────────────────────────────────────────────────────────────
// INSCREVER NAS LEITURAS DOS CAMINHOES DE UMA OBRA
//
//   obraId     — usado so pelo formato antigo, que filtra por obra na carga
//   caminhoes  — identificacoes despachadas para esta obra. Vazio = assina
//                todos, para dar para testar antes do primeiro envio
//   onTemperatura({ temperatura, caminhao })
//   onVolume({ volume, caminhao })
//   onEstado(conectado)
//
// Retorna a funcao de limpeza, ou null se nem conseguiu criar o cliente.
// ─────────────────────────────────────────────────────────────
export function inscreverSensor(
  obraId,
  caminhoes,
  {
    onTemperatura = () => {},
    onVolume = () => {},
    onUmidade = () => {},
    onEstado = () => {},
  } = {}
) {
  try {
    const lista = Array.isArray(caminhoes) ? caminhoes.filter(Boolean) : [];
    const simples = mqttConfig.sensorSimples;

    // Sem caminhao despachado nao ha topico especifico para assinar. Em vez de
    // ficar mudo, assina o coringa: assim da para testar com o sensor na
    // bancada antes de registrar qualquer envio.
    const topicos = lista.length
      ? lista.flatMap((c) => [
          mqttConfig.topicoTemperatura(c),
          mqttConfig.topicoVolume(c),
        ])
      : [mqttConfig.topicoTemperaturaTodos, mqttConfig.topicoVolumeTodos];

    if (mqttConfig.topicoLegado) topicos.push(mqttConfig.topicoLegado);

    // Topicos planos do sensor atual — ver a nota em config/mqttConfig.js
    if (simples) {
      topicos.push(simples.temperatura, simples.umidadeValor, simples.umidadeStatus);
    }

    console.log(
      `[MQTT] Conectando em ${mqttConfig.host}:${mqttConfig.porta} — ` +
      `${lista.length ? `caminhoes ${lista.join(', ')}` : 'todos os caminhoes'}`
    );

    const cliente = new Paho.Client(
      mqttConfig.host,
      mqttConfig.porta,
      mqttConfig.caminho,
      gerarClientId()
    );

    cliente.onConnectionLost = (resposta) => {
      onEstado(false);
      if (resposta.errorCode !== 0) {
        console.warn('[MQTT] Conexao perdida:', resposta.errorMessage);
      }
    };

    cliente.onMessageArrived = (mensagem) => {
      const topico = mensagem.destinationName;
      const texto = mensagem.payloadString;

      // ── SENSOR ATUAL, TOPICOS PLANOS ──
      // Sem caminhao no topico: assume o configurado, porque so existe um
      if (simples) {
        if (topico === simples.temperatura) {
          const temperatura = parseFloat(texto);
          if (isNaN(temperatura)) {
            console.error('[MQTT] Temperatura invalida:', texto);
            return;
          }
          console.log(`[MQTT] Sensor: ${temperatura} °C`);
          onTemperatura({ temperatura, caminhao: simples.caminhao });
          return;
        }

        if (topico === simples.umidadeValor) {
          const valor = parseFloat(texto);
          if (isNaN(valor)) {
            console.error('[MQTT] Umidade invalida:', texto);
            return;
          }
          console.log(`[MQTT] Sensor: umidade ${valor}`);
          onUmidade({ valor, caminhao: simples.caminhao });
          return;
        }

        if (topico === simples.umidadeStatus) {
          console.log(`[MQTT] Sensor: umidade ${texto}`);
          onUmidade({ status: texto.trim(), caminhao: simples.caminhao });
          return;
        }
      }

      // ── FORMATO ANTIGO ──
      if (topico === mqttConfig.topicoLegado) {
        const leitura = lerFormatoLegado(texto, obraId);
        if (leitura) {
          console.log(`[MQTT] (legado) ${leitura.temperatura} °C`);
          onTemperatura(leitura);
        }
        return;
      }

      const caminhao = mqttConfig.caminhaoDoTopico(topico);

      // ── TEMPERATURA ──
      if (topico.endsWith('/temperatura')) {
        const temperatura = lerValor(texto, 'temperatura', 'temperatura_interna');
        if (temperatura === null) {
          console.error('[MQTT] Temperatura invalida:', texto);
          return;
        }
        console.log(`[MQTT] Caminhao ${caminhao}: ${temperatura} °C`);
        onTemperatura({ temperatura, caminhao });
        return;
      }

      // ── VOLUME ──
      if (topico.endsWith('/volume')) {
        const volume = lerValor(texto, 'volume', 'volume_entregue');
        if (volume === null) {
          console.error('[MQTT] Volume invalido:', texto);
          return;
        }
        console.log(`[MQTT] Caminhao ${caminhao} descarregou ${volume} m³`);
        onVolume({ volume, caminhao });
      }
    };

    cliente.connect({
      useSSL: false,
      cleanSession: true,
      timeout: mqttConfig.timeout,

      onSuccess: () => {
        console.log('[MQTT] Conectado ao broker.');

        topicos.forEach((topico) => {
          cliente.subscribe(topico, {
            qos: mqttConfig.qos,
            onSuccess: () => {
              console.log('[MQTT] Inscrito em', topico);
              onEstado(true);
            },
            onFailure: (erro) => {
              console.warn(`[MQTT] Falha ao assinar ${topico}:`, erro.errorMessage);
            },
          });
        });
      },

      // console.warn e nao console.error de proposito: broker fora do ar e
      // condicao esperada — a tela continua funcionando, so sem dado ao vivo.
      // Com console.error o React Native abriria a tela vermelha por cima.
      onFailure: (erro) => {
        console.warn('[MQTT] Broker indisponivel:', erro.errorMessage);
        onEstado(false);
      },
    });

    return () => {
      try {
        if (cliente.isConnected()) {
          topicos.forEach((topico) => cliente.unsubscribe(topico));
          cliente.disconnect();
          console.log('[MQTT] Desconectado.');
        }
      } catch (erro) {
        console.warn('[MQTT] Erro ao desconectar:', erro.message);
      }
      onEstado(false);
    };

  } catch (erro) {
    console.error('[MQTT] Nao foi possivel criar o cliente:', erro.message);
    onEstado(false);
    return null;
  }
}
