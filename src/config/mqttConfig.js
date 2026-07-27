// Configuracoes do broker MQTT do Cemtinel
// Broker Mosquitto local rodando na rede da equipe

const mqttConfig = {
  // Endereco IP do broker na rede local
  host: '192.168.66.54',

  // Porta WebSocket do Mosquitto (obrigatoria para Expo Go / React Native)
  porta: 9001,

  // URL completa para conexao via WebSocket
  url: 'ws://192.168.66.68:9001/mqtt',

  // Topico onde os cadastros de usuario sao publicados
  topicoCadastro: 'app/cad',

  // Topico onde os dados de login sao publicados
  topicoLogin: 'app/log',

  // Topico onde o backend publica a resposta da validacao do login
  // 0 = login/senha invalidos | diferente de 0 = login valido
  topicoResposta: 'app/resp',

  // Topico onde os cadastros de obra sao publicados
  topicoCadastroObra: 'app/obra',

  // Topico para perguntar ao backend se um e-mail ja esta cadastrado
  // Envia: { email, tipo_esperado }  (tipo_esperado: 0 = mestre, 1 = construtora)
  topicoVerificarEmail: 'app/verifica_email',

  // Topico onde o backend responde a verificacao de e-mail
  // Responde: { email, existe, tipo }  (existe: 1 = existe, 0 = nao existe)
  topicoRespostaEmail: 'app/resp_email',

  // Topico onde o sensor publica a temperatura atual do cimento
  // Formato: apenas o numero, sem JSON (ex: "75.5")
  topicoTemperatura: 'app/temperatura',

  // Topico onde o backend publica a lista completa de obras
  // Formato: array JSON de obras (ver inscreverListaObras em services/mqtt.js)
  topicoRespostaObras: 'obras/resposta',

  // Topico onde o app publica o envio de um caminhao para uma obra
  // Formato: { caminhao, obra_id, obra_nome, data_envio }
  topicoEnviarCaminhao: 'app/enviar_caminhao',

  // Topico onde o backend responde ao envio de caminhao com a temperatura
  // Formato: { obra_id, temperatura } (campos extras sao ignorados)
  topicoRespostaCaminhao: 'app/enviar_caminhao/resp',

  // Qualidade de servico — QoS 1 = entrega garantida pelo menos uma vez
  qos: 1,
};

export default mqttConfig;
