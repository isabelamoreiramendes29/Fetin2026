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
// PUBLICAR ENVIO DE CAMINHAO
// Mesmo padrao autocontido da publicarCadastro/publicarCadastroObra.
// Cria o proprio cliente, conecta, publica e desconecta.
// ─────────────────────────────────────────────────────────────
export function publicarEnvioCaminhao(dados) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[MQTT Caminhão] Iniciando conexao...');
      console.log('[MQTT Caminhão] Dados recebidos:', dados);

      const cliente = new Paho.Client(
        mqttConfig.host,
        mqttConfig.porta,
        '/mqtt',
        gerarClientId()
      );

      cliente.onConnectionLost = (resposta) => {
        if (resposta.errorCode !== 0) {
          console.warn('[MQTT Caminhão] Conexao perdida:', resposta.errorMessage);
        }
      };

      cliente.connect({
        useSSL: false,
        cleanSession: true,
        timeout: 10,

        onSuccess: () => {
          console.log('[MQTT Caminhão] Conectado ao broker.');

          try {
            const payload = JSON.stringify({
              caminhao: dados.caminhao,       // 'X' ou 'Y'
              obra_id: dados.obraId,
              obra_nome: dados.obraNome,
              data_envio: new Date().toISOString(),
            });

            const mensagem = new Paho.Message(payload);
            mensagem.destinationName = mqttConfig.topicoEnviarCaminhao; // app/enviar_caminhao
            mensagem.qos = mqttConfig.qos;
            mensagem.retained = false;

            cliente.send(mensagem);

            console.log('[MQTT Caminhão] Publicado no topico', mqttConfig.topicoEnviarCaminhao);
            console.log('[MQTT Caminhão] Payload:', payload);

            if (cliente.isConnected()) {
              cliente.disconnect();
            }

            resolve();

          } catch (erroPublicar) {
            console.error('[MQTT Caminhão] Erro ao publicar:', erroPublicar.message);
            if (cliente.isConnected()) cliente.disconnect();
            reject(erroPublicar);
          }
        },

        onFailure: (erro) => {
          console.error('[MQTT Caminhão] Falha ao conectar:', erro.errorMessage);
          reject(new Error(erro.errorMessage));
        },
      });

    } catch (erro) {
      console.error('[MQTT Caminhão] Erro ao criar cliente:', erro.message);
      reject(erro);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLICAR COMPRA DE CIMENTO (TELA FINANCEIRO)
// Mesmo padrao autocontido da publicarCadastro/publicarEnvioCaminhao.
// Cria o proprio cliente, conecta, publica e desconecta.
// ─────────────────────────────────────────────────────────────
export function publicarFinanceiro(dados) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[MQTT Financeiro] Iniciando conexao...');
      console.log('[MQTT Financeiro] Dados recebidos:', dados);

      const cliente = new Paho.Client(
        mqttConfig.host,
        mqttConfig.porta,
        '/mqtt',
        gerarClientId()
      );

      cliente.onConnectionLost = (resposta) => {
        if (resposta.errorCode !== 0) {
          console.warn('[MQTT Financeiro] Conexao perdida:', resposta.errorMessage);
        }
      };

      cliente.connect({
        useSSL: false,
        cleanSession: true,
        timeout: 10,

        onSuccess: () => {
          console.log('[MQTT Financeiro] Conectado ao broker.');

          try {
            const payload = JSON.stringify({
              obra_id: dados.obraId,
              valor_total: parseFloat(dados.valorTotal) || 0,
              volume_comprado: parseFloat(dados.volumeComprado) || 0,
              data: new Date().toISOString(),
            });

            const mensagem = new Paho.Message(payload);
            mensagem.destinationName = mqttConfig.topicoFinanceiro; // app/financeiro
            mensagem.qos = mqttConfig.qos;
            mensagem.retained = false;

            cliente.send(mensagem);

            console.log('[MQTT Financeiro] Publicado no topico', mqttConfig.topicoFinanceiro);
            console.log('[MQTT Financeiro] Payload:', payload);

            if (cliente.isConnected()) {
              cliente.disconnect();
            }

            resolve();

          } catch (erroPublicar) {
            console.error('[MQTT Financeiro] Erro ao publicar:', erroPublicar.message);
            if (cliente.isConnected()) cliente.disconnect();
            reject(erroPublicar);
          }
        },

        onFailure: (erro) => {
          console.error('[MQTT Financeiro] Falha ao conectar:', erro.errorMessage);
          reject(new Error(erro.errorMessage));
        },
      });

    } catch (erro) {
      console.error('[MQTT Financeiro] Erro ao criar cliente:', erro.message);
      reject(erro);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// INSCREVER EM DADOS FINANCEIROS EM TEMPO REAL, FILTRADA POR OBRA
// Mesmo padrao persistente da inscreverTemperatura: conexao fica aberta
// enquanto a tela estiver montada, recebendo cada resposta via callback.
// Retorna uma funcao de cleanup (desinscreve + desconecta).
// Formato da mensagem: { status, mensagem, id_financeiro, id_obra,
//   resumo_obra: { total_gasto, total_gasto_cimento, total_cimento_comprado } }
// Usa != (nao !==) porque id_obra pode chegar como number/string e obraId como string.
// ─────────────────────────────────────────────────────────────
export function inscreverFinanceiro(obraId, callback) {
  try {
    console.log(`[MQTT Financeiro] Iniciando conexao... Filtro obra_id: ${obraId}`);

    const cliente = new Paho.Client(
      mqttConfig.host,
      mqttConfig.porta,
      '/mqtt',
      gerarClientId()
    );

    cliente.onConnectionLost = (resposta) => {
      if (resposta.errorCode !== 0) {
        console.warn('[MQTT Financeiro] Conexao perdida:', resposta.errorMessage);
      }
    };

    cliente.onMessageArrived = (mensagemRecebida) => {
      if (mensagemRecebida.destinationName !== mqttConfig.topicoRespostaFinanceiro) return;

      let payload;
      try {
        payload = JSON.parse(mensagemRecebida.payloadString);
      } catch (erro) {
        console.error('[MQTT Financeiro] Erro ao processar JSON:', erro.message);
        return;
      }

      console.log('[MQTT Financeiro] Payload completo:', payload);

      if (payload.status !== 'ok') {
        console.warn('[MQTT Financeiro] Status não ok:', payload);
        return;
      }

      const idObra = payload.id_obra;
      const resumo = payload.resumo_obra;

      if (!resumo) {
        console.warn('[MQTT Financeiro] Sem resumo_obra');
        return;
      }

      if (idObra != obraId) {
        console.log(`[MQTT Financeiro] Ignorado (obra ${idObra} != ${obraId})`);
        return;
      }

      const dadosFinanceiro = {
        idObra,
        totalGasto: parseFloat(resumo.total_gasto) || 0,
        totalGastoCimento: parseFloat(resumo.total_gasto_cimento) || 0,
        totalCimentoComprado: parseFloat(resumo.total_cimento_comprado) || 0,
      };

      console.log(`[MQTT Financeiro] Obra ${obraId} recebeu:`, dadosFinanceiro);
      callback(dadosFinanceiro);
    };

    cliente.connect({
      useSSL: false,
      cleanSession: true,
      timeout: 10,

      onSuccess: () => {
        console.log('[MQTT Financeiro] Conectado ao broker.');

        cliente.subscribe(mqttConfig.topicoRespostaFinanceiro, {
          qos: mqttConfig.qos,

          onSuccess: () => {
            console.log('[MQTT Financeiro] Inscrito no topico', mqttConfig.topicoRespostaFinanceiro);
          },

          onFailure: (erro) => {
            console.error('[MQTT Financeiro] Falha ao se inscrever:', erro.errorMessage);
          },
        });
      },

      onFailure: (erro) => {
        console.error('[MQTT Financeiro] Falha ao conectar:', erro.errorMessage);
      },
    });

    // Funcao de cleanup — desinscreve e desconecta a conexao persistente
    return () => {
      try {
        if (cliente.isConnected()) {
          cliente.unsubscribe(mqttConfig.topicoRespostaFinanceiro);
          cliente.disconnect();
          console.log(`[MQTT Financeiro] Desinscrito e desconectado (obra ${obraId}).`);
        }
      } catch (erro) {
        console.error('[MQTT Financeiro] Erro ao desinscrever:', erro.message);
      }
    };

  } catch (erro) {
    console.error('[MQTT Financeiro] Erro ao criar cliente:', erro.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// INSCREVER EM TEMPERATURA EM TEMPO REAL, FILTRADA POR OBRA
// Diferente das outras funcoes deste arquivo, esta conexao NAO e efemera:
// fica aberta enquanto a tela estiver montada, recebendo cada nova leitura
// via callback. Retorna uma funcao de cleanup (desinscreve + desconecta),
// que deve ser chamada quando a tela for desmontada.
// Formato da mensagem: { status, mensagem, caminhao: { id_obra, temperatura_interna, ... } }
// So usa caminhao.id_obra (filtro) e caminhao.temperatura_interna (valor) — o resto e ignorado.
// Usa == (nao ===) porque id_obra pode chegar como number e obraId como string.
// ─────────────────────────────────────────────────────────────
export function inscreverTemperatura(obraId, callback) {
  try {
    console.log(`[MQTT Temperatura] Iniciando conexao... Filtro obra_id: ${obraId}`);

    const cliente = new Paho.Client(
      mqttConfig.host,
      mqttConfig.porta,
      '/mqtt',
      gerarClientId()
    );

    cliente.onConnectionLost = (resposta) => {
      if (resposta.errorCode !== 0) {
        console.warn('[MQTT Temperatura] Conexao perdida:', resposta.errorMessage);
      }
    };

    cliente.onMessageArrived = (mensagemRecebida) => {
      if (mensagemRecebida.destinationName !== mqttConfig.topicoRespostaCaminhao) return;

      let payload;
      try {
        payload = JSON.parse(mensagemRecebida.payloadString);
      } catch (erro) {
        console.error('[MQTT Temperatura] Erro ao processar JSON:', erro.message);
        return;
      }

      // So interessa o objeto "caminhao" — status/mensagem na raiz sao ignorados
      const caminhao = payload.caminhao;
      if (!caminhao) {
        console.log('[MQTT Temperatura] Payload sem campo "caminhao", ignorado:', payload);
        return;
      }

      if (caminhao.id_obra != obraId) {
        console.log(`[MQTT Temperatura] Ignorado (obra ${caminhao.id_obra} != ${obraId})`);
        return;
      }

      const valor = parseFloat(caminhao.temperatura_interna);
      if (isNaN(valor)) {
        console.error('[MQTT Temperatura] Valor invalido:', caminhao.temperatura_interna);
        return;
      }

      console.log(`[MQTT Temperatura] Obra ${obraId} recebeu:`, valor);
      callback(valor);
    };

    cliente.connect({
      useSSL: false,
      cleanSession: true,
      timeout: 10,

      onSuccess: () => {
        console.log('[MQTT Temperatura] Conectado ao broker.');

        cliente.subscribe(mqttConfig.topicoRespostaCaminhao, {
          qos: mqttConfig.qos,

          onSuccess: () => {
            console.log('[MQTT Temperatura] Inscrito no topico', mqttConfig.topicoRespostaCaminhao);
          },

          onFailure: (erro) => {
            console.error('[MQTT Temperatura] Falha ao se inscrever:', erro.errorMessage);
          },
        });
      },

      onFailure: (erro) => {
        console.error('[MQTT Temperatura] Falha ao conectar:', erro.errorMessage);
      },
    });

    // Funcao de cleanup — desinscreve e desconecta a conexao persistente
    return () => {
      try {
        if (cliente.isConnected()) {
          cliente.unsubscribe(mqttConfig.topicoRespostaCaminhao);
          cliente.disconnect();
          console.log(`[MQTT Temperatura] Desinscrito e desconectado (obra ${obraId}).`);
        }
      } catch (erro) {
        console.error('[MQTT Temperatura] Erro ao desinscrever:', erro.message);
      }
    };

  } catch (erro) {
    console.error('[MQTT Temperatura] Erro ao criar cliente:', erro.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// INSCREVER NA LISTA DE OBRAS
// Mesmo padrao persistente da inscreverTemperatura: conexao fica aberta
// enquanto o app estiver aberto, recebendo a lista completa de obras
// toda vez que o backend publicar. Retorna funcao de cleanup.
// Formato esperado: array JSON de obras, campos em snake_case
// (data_inicio, data_termino, volume_cimento, email_construtora) —
// normalizados aqui para camelCase, igual ao formato usado no resto do app.
// ─────────────────────────────────────────────────────────────
export function inscreverListaObras(callback) {
  try {
    console.log('[MQTT Obras] Iniciando conexao...');

    const cliente = new Paho.Client(
      mqttConfig.host,
      mqttConfig.porta,
      '/mqtt',
      gerarClientId()
    );

    cliente.onConnectionLost = (resposta) => {
      if (resposta.errorCode !== 0) {
        console.warn('[MQTT Obras] Conexao perdida:', resposta.errorMessage);
      }
    };

    cliente.onMessageArrived = (mensagemRecebida) => {
      if (mensagemRecebida.destinationName !== mqttConfig.topicoRespostaObras) return;

      let payload;
      try {
        payload = JSON.parse(mensagemRecebida.payloadString);
      } catch (erro) {
        console.error('[MQTT Obras] Erro ao processar JSON:', erro.message);
        return;
      }

      // O backend pode mandar um array direto, ou um objeto
      // { status, tipo, quantidade, obras: [...] } — aceitamos os dois
      let listaObras;
      if (Array.isArray(payload)) {
        listaObras = payload;
      } else if (payload && Array.isArray(payload.obras)) {
        listaObras = payload.obras;
      } else {
        console.warn('[MQTT Obras] Formato desconhecido:', payload);
        return;
      }

      // Normaliza os campos do backend (snake_case) para o formato usado no app (camelCase),
      // com valores padrao para campos ausentes/nulos
      const listaNormalizada = listaObras.map((obra) => ({
        id: (obra.id_obra ?? obra.id ?? Date.now()).toString(),
        nome: obra.nome || 'Sem nome',
        status: obra.status || '',
        cep: obra.cep || '',
        endereco: obra.endereco || '',
        numero: obra.numero || '',
        complemento: obra.complemento || '',
        dataInicio: obra.data_inicio || '',
        dataTermino: obra.data_termino || '',
        volumeCimento: obra.volume_cimento || 0,
        emailConstrutora: obra.email_construtora || '',
      }));

      console.log('[MQTT Obras] Obras normalizadas:', listaNormalizada);
      callback(listaNormalizada);
    };

    cliente.connect({
      useSSL: false,
      cleanSession: true,
      timeout: 10,

      onSuccess: () => {
        console.log('[MQTT Obras] Conectado ao broker.');

        cliente.subscribe(mqttConfig.topicoRespostaObras, {
          qos: mqttConfig.qos,

          onSuccess: () => {
            console.log('[MQTT Obras] Inscrito no topico', mqttConfig.topicoRespostaObras);
          },

          onFailure: (erro) => {
            console.error('[MQTT Obras] Falha ao se inscrever:', erro.errorMessage);
          },
        });
      },

      onFailure: (erro) => {
        console.error('[MQTT Obras] Falha ao conectar:', erro.errorMessage);
      },
    });

    // Funcao de cleanup — desinscreve e desconecta a conexao persistente
    return () => {
      try {
        if (cliente.isConnected()) {
          cliente.unsubscribe(mqttConfig.topicoRespostaObras);
          cliente.disconnect();
          console.log('[MQTT Obras] Desinscrito e desconectado.');
        }
      } catch (erro) {
        console.error('[MQTT Obras] Erro ao desinscrever:', erro.message);
      }
    };

  } catch (erro) {
    console.error('[MQTT Obras] Erro ao criar cliente:', erro.message);
    return null;
  }
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
