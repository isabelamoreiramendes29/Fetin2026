// Servico MQTT do Cemtinel
// Cada funcao de publicacao e autocontida:
// cria o proprio cliente, conecta, publica e desconecta sozinha.
// Isso elimina a guerra pelo cliente compartilhado entre telas.

import Paho from 'paho-mqtt';
import mqttConfig from '../config/mqttConfig';

// ── GERAR ID UNICO PARA O CLIENTE ──
// Cada conexao recebe um ID diferente para evitar conflitos no broker
function gerarClientId() {
  return 'cemtinel_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// ─────────────────────────────────────────────────────────────
// PUBLICAR DADOS DE CADASTRO
// Cria o proprio cliente MQTT, conecta, publica e desconecta.
// Nao depende de nenhum estado global — pode ser chamado de qualquer tela.
// ─────────────────────────────────────────────────────────────
export function publicarCadastro(dados) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[MQTT Cadastro] Iniciando conexao...');

      // Cria cliente local — exclusivo desta publicacao
      const cliente = new Paho.Client(
        mqttConfig.host,
        mqttConfig.porta,
        '/mqtt',
        gerarClientId()
      );

      // Nao precisa tratar perda de conexao aqui pois a conexao e efemera
      cliente.onConnectionLost = (resposta) => {
        if (resposta.errorCode !== 0) {
          console.warn('[MQTT Cadastro] Conexao perdida:', resposta.errorMessage);
        }
      };

      cliente.connect({
        useSSL: false,
        cleanSession: true,
        timeout: 10,

        onSuccess: () => {
          console.log('[MQTT Cadastro] Conectado ao broker.');

          try {
            // Monta o payload exatamente como o backend espera receber
            const payload = JSON.stringify({
              nome: dados.nome,
              email: dados.email,
              telefone: dados.telefone,
              senha: dados.senha,
            });

            const mensagem = new Paho.Message(payload);
            mensagem.destinationName = mqttConfig.topicoCadastro; // app/cad
            mensagem.qos = mqttConfig.qos;                        // QoS 1
            mensagem.retained = false;

            cliente.send(mensagem);

            console.log('[MQTT Cadastro] Publicado no topico', mqttConfig.topicoCadastro);
            console.log('[MQTT Cadastro] Payload:', payload);

            // Desconecta apos publicar
            if (cliente.isConnected()) {
              cliente.disconnect();
            }

            resolve();

          } catch (erroPublicar) {
            console.error('[MQTT Cadastro] Erro ao publicar:', erroPublicar.message);
            if (cliente.isConnected()) cliente.disconnect();
            reject(erroPublicar);
          }
        },

        onFailure: (erro) => {
          console.error('[MQTT Cadastro] Falha ao conectar:', erro.errorMessage);
          reject(new Error(erro.errorMessage));
        },
      });

    } catch (erro) {
      console.error('[MQTT Cadastro] Erro ao criar cliente:', erro.message);
      reject(erro);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLICAR DADOS DE LOGIN
// Mesmo padrao autocontido da publicarCadastro.
// Cria o proprio cliente, conecta, publica e desconecta.
// ─────────────────────────────────────────────────────────────
export function publicarLogin(dados) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[MQTT Login] Iniciando conexao...');

      // Cria cliente local — exclusivo desta publicacao
      const cliente = new Paho.Client(
        mqttConfig.host,
        mqttConfig.porta,
        '/mqtt',
        gerarClientId()
      );

      cliente.onConnectionLost = (resposta) => {
        if (resposta.errorCode !== 0) {
          console.warn('[MQTT Login] Conexao perdida:', resposta.errorMessage);
        }
      };

      cliente.connect({
        useSSL: false,
        cleanSession: true,
        timeout: 10,

        onSuccess: () => {
          console.log('[MQTT Login] Conectado ao broker.');

          try {
            // Monta o payload exatamente como o backend espera receber
            const payload = JSON.stringify({
              email: dados.email,
              senha: dados.senha,
            });

            const mensagem = new Paho.Message(payload);
            mensagem.destinationName = mqttConfig.topicoLogin; // app/log
            mensagem.qos = mqttConfig.qos;                     // QoS 1
            mensagem.retained = false;

            cliente.send(mensagem);

            console.log('[MQTT Login] Publicado no topico', mqttConfig.topicoLogin);
            console.log('[MQTT Login] Payload:', payload);

            // Desconecta apos publicar
            if (cliente.isConnected()) {
              cliente.disconnect();
            }

            resolve();

          } catch (erroPublicar) {
            console.error('[MQTT Login] Erro ao publicar:', erroPublicar.message);
            if (cliente.isConnected()) cliente.disconnect();
            reject(erroPublicar);
          }
        },

        onFailure: (erro) => {
          console.error('[MQTT Login] Falha ao conectar:', erro.errorMessage);
          reject(new Error(erro.errorMessage));
        },
      });

    } catch (erro) {
      console.error('[MQTT Login] Erro ao criar cliente:', erro.message);
      reject(erro);
    }
  });
}
