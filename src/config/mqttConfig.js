// Configuracoes do broker MQTT do Cemtinel
// Broker Mosquitto local rodando na rede da equipe

const mqttConfig = {
  // Endereco IP do broker na rede local
  host: '192.168.66.73',

  // Porta WebSocket do Mosquitto (obrigatoria para Expo Go / React Native)
  porta: 9001,

  // Nota: os topicos de login (app/log), cadastro (app/cad), resposta de login
  // (app/resp) e verificacao de e-mail (app/verifica_email, app/resp_email)
  // sairam daqui — usuario agora e autenticado pelo Supabase.
  // O backend ainda escuta esses topicos, mas o app nao publica mais neles.

  // Topico onde os cadastros de obra sao publicados
  topicoCadastroObra: 'app/obra',

  // Topico onde o backend publica a lista completa de obras
  // Formato: array JSON de obras (ver inscreverListaObras em services/mqtt.js)
  topicoRespostaObras: 'obras/resposta',

  // Topico onde o app publica o envio de um caminhao para uma obra
  // Formato: { caminhao, obra_id, obra_nome, data_envio }
  topicoEnviarCaminhao: 'app/enviar_caminhao',

  // Topico onde o backend responde ao envio de caminhao com a temperatura
  // Formato: { obra_id, temperatura } (campos extras sao ignorados)
  topicoRespostaCaminhao: 'app/enviar_caminhao/resp',

  // Topico onde o app publica uma nova compra de cimento (tela Financeiro)
  // Formato: { obra_id, valor_total, volume_comprado, data }
  topicoFinanceiro: 'app/financeiro',

  // Topico onde o backend responde com os dados financeiros atualizados da obra
  // Formato: { status, mensagem, id_financeiro, id_obra,
  //   resumo_obra: { total_gasto, total_gasto_cimento, total_cimento_comprado } }
  topicoRespostaFinanceiro: 'app/financeiro/resp',

  // Qualidade de servico — QoS 1 = entrega garantida pelo menos uma vez
  qos: 1,
};

export default mqttConfig;
