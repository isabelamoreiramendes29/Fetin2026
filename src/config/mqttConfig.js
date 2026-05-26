// Configuracoes do broker MQTT do Cemtinel
// Broker Mosquitto local rodando na rede da equipe

const mqttConfig = {
  // Endereco IP do broker na rede local
  host: '192.168.66.68',

  // Porta WebSocket do Mosquitto (obrigatoria para Expo Go / React Native)
  porta: 9001,

  // URL completa para conexao via WebSocket
  url: 'ws://192.168.66.68:9001/mqtt',

  // Topico onde os cadastros de usuario sao publicados
  topicoCadastro: 'app/cad',

  // Topico onde os dados de login sao publicados
  topicoLogin: 'app/log',

  // Qualidade de servico — QoS 1 = entrega garantida pelo menos uma vez
  qos: 1,
};

export default mqttConfig;
