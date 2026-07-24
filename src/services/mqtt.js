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
      console.log('[MQTT Cadastro] Dados recebidos:', dados);

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
              tipo: dados.tipo,
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
// PUBLICAR CADASTRO DE OBRA
// Mesmo padrao autocontido da publicarCadastro.
// Cria o proprio cliente, conecta, publica e desconecta.
// Volume de cimento e sempre em m³ — nao existe campo de unidade.
// ─────────────────────────────────────────────────────────────
export function publicarCadastroObra(dados) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[MQTT CadastroObra] Iniciando conexao...');
      console.log('[MQTT CadastroObra] Dados recebidos:', dados);

      // Cria cliente local — exclusivo desta publicacao
      const cliente = new Paho.Client(
        mqttConfig.host,
        mqttConfig.porta,
        '/mqtt',
        gerarClientId()
      );

      cliente.onConnectionLost = (resposta) => {
        if (resposta.errorCode !== 0) {
          console.warn('[MQTT CadastroObra] Conexao perdida:', resposta.errorMessage);
        }
      };

      cliente.connect({
        useSSL: false,
        cleanSession: true,
        timeout: 10,

        onSuccess: () => {
          console.log('[MQTT CadastroObra] Conectado ao broker.');

          try {
            // Monta o payload exatamente como o backend espera receber
            const payload = JSON.stringify({
              nome: dados.nome,
              cep: dados.cep,
              endereco: dados.endereco,
              numero: dados.numero,
              complemento: dados.complemento,
              data_inicio: dados.dataInicio,
              data_termino: dados.dataTermino,
              volume_cimento: Number(dados.volumeCimento),
              email_construtora: dados.emailConstrutora,
            });

            const mensagem = new Paho.Message(payload);
            mensagem.destinationName = mqttConfig.topicoCadastroObra; // app/obra
            mensagem.qos = mqttConfig.qos;                            // QoS 1
            mensagem.retained = false;

            cliente.send(mensagem);

            console.log('[MQTT CadastroObra] Publicado no topico', mqttConfig.topicoCadastroObra);
            console.log('[MQTT CadastroObra] Payload:', payload);

            // Desconecta apos publicar
            if (cliente.isConnected()) {
              cliente.disconnect();
            }

            resolve();

          } catch (erroPublicar) {
            console.error('[MQTT CadastroObra] Erro ao publicar:', erroPublicar.message);
            if (cliente.isConnected()) cliente.disconnect();
            reject(erroPublicar);
          }
        },

        onFailure: (erro) => {
          console.error('[MQTT CadastroObra] Falha ao conectar:', erro.errorMessage);
          reject(new Error(erro.errorMessage));
        },
      });

    } catch (erro) {
      console.error('[MQTT CadastroObra] Erro ao criar cliente:', erro.message);
      reject(erro);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// VERIFICAR SE UM E-MAIL JA ESTA CADASTRADO
// Mesmo padrao de espera de resposta da publicarLogin: se inscreve
// em topicoRespostaEmail ANTES de publicar a pergunta, aguarda o
// backend responder, com timeout de 5s.
// So resolve { existe: true } se existe === 1 E o tipo bater com
// tipoEsperado (0 = mestre, 1 = construtora) — evita que um e-mail
// de Construtora seja aceito como Mestre por engano, e vice-versa.
// ─────────────────────────────────────────────────────────────
export function verificarEmailExiste(email, tipoEsperado) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[MQTT VerificaEmail] Iniciando conexao...');

      const cliente = new Paho.Client(
        mqttConfig.host,
        mqttConfig.porta,
        '/mqtt',
        gerarClientId()
      );

      let jaRespondeu = false;
      let timeoutId = null;

      function encerrar() {
        clearTimeout(timeoutId);
        if (cliente.isConnected()) {
          cliente.disconnect();
        }
      }

      cliente.onConnectionLost = (resposta) => {
        if (resposta.errorCode !== 0) {
          console.warn('[MQTT VerificaEmail] Conexao perdida:', resposta.errorMessage);
        }
      };

      cliente.onMessageArrived = (mensagemRecebida) => {
        if (mensagemRecebida.destinationName !== mqttConfig.topicoRespostaEmail) return;

        let resposta;
        try {
          resposta = JSON.parse(mensagemRecebida.payloadString);
        } catch {
          return; // mensagem invalida, ignora e continua esperando
        }

        // So processa a resposta referente ao e-mail que perguntamos
        if (resposta.email !== email) return;
        if (jaRespondeu) return;
        jaRespondeu = true;

        console.log('[MQTT VerificaEmail] Resposta:', resposta);
        encerrar();

        const existeEValido = resposta.existe === 1 && resposta.tipo === tipoEsperado;
        resolve(existeEValido ? { existe: true, tipo: resposta.tipo } : { existe: false });
      };

      cliente.connect({
        useSSL: false,
        cleanSession: true,
        timeout: 10,

        onSuccess: () => {
          console.log('[MQTT VerificaEmail] Conectado ao broker.');

          cliente.subscribe(mqttConfig.topicoRespostaEmail, {
            qos: mqttConfig.qos,

            onSuccess: () => {
              console.log('[MQTT VerificaEmail] Inscrito em', mqttConfig.topicoRespostaEmail);

              try {
                const payload = JSON.stringify({ email, tipo_esperado: tipoEsperado });

                const mensagem = new Paho.Message(payload);
                mensagem.destinationName = mqttConfig.topicoVerificarEmail; // app/verifica_email
                mensagem.qos = mqttConfig.qos;
                mensagem.retained = false;

                cliente.send(mensagem);
                console.log('[MQTT VerificaEmail] Publicado no topico', mqttConfig.topicoVerificarEmail);
                console.log('[MQTT VerificaEmail] Payload:', payload);

                timeoutId = setTimeout(() => {
                  if (jaRespondeu) return;
                  jaRespondeu = true;
                  console.warn('[MQTT VerificaEmail] Timeout: servidor nao respondeu.');
                  encerrar();
                  reject(new Error('Servidor nao respondeu. Tente novamente.'));
                }, 5000);

              } catch (erroPublicar) {
                console.error('[MQTT VerificaEmail] Erro ao publicar:', erroPublicar.message);
                encerrar();
                reject(erroPublicar);
              }
            },

            onFailure: (erro) => {
              console.error('[MQTT VerificaEmail] Falha ao se inscrever:', erro.errorMessage);
              encerrar();
              reject(new Error(erro.errorMessage));
            },
          });
        },

        onFailure: (erro) => {
          console.error('[MQTT VerificaEmail] Falha ao conectar:', erro.errorMessage);
          reject(new Error(erro.errorMessage));
        },
      });

    } catch (erro) {
      console.error('[MQTT VerificaEmail] Erro ao criar cliente:', erro.message);
      reject(erro);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLICAR DADOS DE LOGIN
// Mesmo padrao autocontido da publicarCadastro, mas dessa vez
// tambem se inscreve em topicoResposta (app/resp) e aguarda o
// backend validar o login antes de resolver a Promise.
// Resposta "0" = login/senha invalidos | diferente de "0" = valido
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

      let jaRespondeu = false;
      let timeoutId = null;

      // Encerra a conexao efemera, seja apos resposta ou apos timeout
      function encerrar() {
        clearTimeout(timeoutId);
        if (cliente.isConnected()) {
          cliente.disconnect();
        }
      }

      cliente.onConnectionLost = (resposta) => {
        if (resposta.errorCode !== 0) {
          console.warn('[MQTT Login] Conexao perdida:', resposta.errorMessage);
        }
      };

      // Handler unico do cliente Paho para qualquer mensagem recebida
      cliente.onMessageArrived = (mensagemRecebida) => {
        if (mensagemRecebida.destinationName !== mqttConfig.topicoResposta) return;
        if (jaRespondeu) return;
        jaRespondeu = true;

        const resposta = mensagemRecebida.payloadString;
        console.log('[MQTT Login] Resposta do backend:', resposta);

        encerrar();

        if (resposta === '0') {
          resolve({ sucesso: false, mensagem: 'Login ou senha incorretos.' });
        } else {
          resolve({ sucesso: true, tipo: resposta });
        }
      };

      cliente.connect({
        useSSL: false,
        cleanSession: true,
        timeout: 10,

        onSuccess: () => {
          console.log('[MQTT Login] Conectado ao broker.');

          // Se inscreve em app/resp ANTES de publicar, pra nao perder
          // a resposta caso o backend seja mais rapido que o esperado
          cliente.subscribe(mqttConfig.topicoResposta, {
            qos: mqttConfig.qos,

            onSuccess: () => {
              console.log('[MQTT Login] Inscrito em', mqttConfig.topicoResposta);

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

                // Timeout de 5s — se o backend nao responder, rejeita
                timeoutId = setTimeout(() => {
                  if (jaRespondeu) return;
                  jaRespondeu = true;
                  console.warn('[MQTT Login] Timeout: servidor nao respondeu.');
                  encerrar();
                  reject(new Error('Servidor nao respondeu. Tente novamente.'));
                }, 5000);

              } catch (erroPublicar) {
                console.error('[MQTT Login] Erro ao publicar:', erroPublicar.message);
                encerrar();
                reject(erroPublicar);
              }
            },

            onFailure: (erro) => {
              console.error('[MQTT Login] Falha ao se inscrever:', erro.errorMessage);
              encerrar();
              reject(new Error(erro.errorMessage));
            },
          });
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
