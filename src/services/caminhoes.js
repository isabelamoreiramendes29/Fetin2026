// Envio de caminhoes — camada de dados
//
// Ver supabase/schema_caminhoes.sql.
//
// Ultima parte a sair do MQTT. Despachar um caminhao e um registro que precisa
// durar: e ele que explica, semanas depois, por que uma determinada carga
// estava naquela obra naquele dia. Publicar num topico nao guarda nada.
//
// Antes disto os envios viviam so na memoria do CaminhoesContext — fechar o
// app apagava o historico inteiro.

import { supabase } from './supabase';

function normalizarEnvio(linha) {
  return {
    id: String(linha.id),
    caminhao: linha.caminhao,
    obraId: String(linha.id_obra),
    obraNome: linha.obras?.nome || '',
    dataEnvio: linha.enviado_em,
    // Nulo enquanto o caminhao nao descarregou
    volumeEntregue: linha.volume_entregue === null ? null : Number(linha.volume_entregue),
    // Quanto o sensor de vazao marcava no inicio desta viagem
    volumeBase: linha.volume_base === null ? null : Number(linha.volume_base),
    medidoEm: linha.medido_em,
    // Nulo enquanto a viagem esta em andamento
    concluidoEm: linha.concluido_em,
  };
}

// O join traz o nome da obra junto, evitando uma segunda consulta so para
// exibir "Caminhao 4 → Obra do Centro"
const CAMPOS =
  'id, id_obra, caminhao, enviado_em, volume_entregue, volume_base, medido_em, ' +
  'concluido_em, obras ( nome )';

// ─────────────────────────────────────────────────────────────
// BUSCAR OS ENVIOS VISIVEIS
// As policies limitam ao que o usuario ja enxerga em obras.
// ─────────────────────────────────────────────────────────────
export async function buscarEnvios() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('envios_caminhao')
    .select(CAMPOS)
    .order('enviado_em', { ascending: false });

  if (error) {
    console.error('[Caminhoes] Erro ao buscar envios:', error.message);
    throw new Error(`Não foi possível carregar os envios: ${error.message}`);
  }

  console.log(`[Caminhoes] ${data.length} envios.`);
  return data.map(normalizarEnvio);
}

// ─────────────────────────────────────────────────────────────
// REGISTRAR O ENVIO DE UM CAMINHAO
// Cria tambem a posicao inicial dele, zerada: sem isso, a tela de
// rastreamento nao teria o que mostrar ate alguem apertar Iniciar.
// ─────────────────────────────────────────────────────────────
export async function registrarEnvio(obraId, caminhao) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sua sessão expirou. Entre novamente.');

  // Uma betoneira nao sai de novo sem ter descarregado. Sem esta checagem, a
  // obra acumulava varias viagens abertas do mesmo caminhao ao mesmo tempo.
  const { data: aberta } = await supabase
    .from('envios_caminhao')
    .select('id, obras ( nome )')
    .eq('caminhao', caminhao)
    .is('concluido_em', null)
    .limit(1)
    .maybeSingle();

  if (aberta) {
    const onde = aberta.obras?.nome ? ` para ${aberta.obras.nome}` : '';
    throw new Error(
      `O caminhão ${caminhao} já está em viagem${onde}. Conclua a entrega antes de despachá-lo de novo.`
    );
  }

  const { data, error } = await supabase
    .from('envios_caminhao')
    .insert({
      id_obra: obraId,
      caminhao,
      criado_por: session.user.id,
    })
    .select(CAMPOS)
    .single();

  if (error) {
    console.error('[Caminhoes] Erro ao registrar envio:', error.message);
    throw new Error(`Não foi possível registrar o envio: ${error.message}`);
  }

  // Posicao inicial. Falha aqui nao invalida o envio, que ja foi gravado —
  // a tela de rastreamento simplesmente comeca sem o caminhao na lista.
  const { error: erroPosicao } = await supabase
    .from('posicao_caminhao')
    .upsert(
      { id_obra: obraId, caminhao, progresso: 0, em_movimento: false },
      { onConflict: 'id_obra,caminhao' }
    );

  if (erroPosicao) {
    console.warn('[Caminhoes] Nao criou a posicao inicial:', erroPosicao.message);
  }

  console.log(`[Caminhoes] Caminhao ${caminhao} despachado para a obra ${obraId}.`);
  return normalizarEnvio(data);
}

// ─────────────────────────────────────────────────────────────
// REGISTRAR O VOLUME DESCARREGADO
// O valor vem do sensor do caminhao. Enquanto o hardware nao esta integrado,
// e informado na tela — o caminho ate o banco e o mesmo nos dois casos.
// ─────────────────────────────────────────────────────────────
export async function registrarVolumeEntregue(idEnvio, volume) {
  const { data, error } = await supabase
    .from('envios_caminhao')
    .update({
      volume_entregue: volume,
      medido_em: new Date().toISOString(),
    })
    .eq('id', idEnvio)
    .select(CAMPOS)
    .single();

  if (error) {
    console.error('[Caminhoes] Erro ao registrar volume:', error.message);
    throw new Error(`Não foi possível registrar o volume: ${error.message}`);
  }

  console.log(`[Caminhoes] Envio ${idEnvio} descarregou ${volume} m³.`);
  return normalizarEnvio(data);
}

// Guarda a primeira leitura baixa de cada viagem enquanto ela nao e
// confirmada. Ver a explicacao em registrarLeituraVazao.
const quedasPendentes = new Map();

// ─────────────────────────────────────────────────────────────
// REGISTRAR UMA LEITURA DO SENSOR DE VAZAO
//
// O sensor acumula desde que foi ligado, e nao zera entre viagens. Se ele ja
// marcava 27 m³ quando a viagem comecou, a viagem entregou zero — nao 27.
//
// Por isso a primeira leitura de cada viagem vira a REFERENCIA, e o volume
// entregue passa a ser a diferenca. Assim nao e preciso zerar o contador do
// sensor nem reiniciar o ESP32 entre uma viagem e outra.
//
// `leituraBruta` e o numero cru que veio do sensor.
// ─────────────────────────────────────────────────────────────
export async function registrarLeituraVazao(envio, leituraBruta) {
  let base = envio.volumeBase;

  // Primeira leitura da viagem: esta e a referencia
  if (base === null || base === undefined) base = leituraBruta;

  // Leitura menor que a referencia sugere que o contador do sensor foi zerado
  // — religado, reprogramado, queda de energia. Mas um unico zero passageiro
  // (falha de comunicacao, glitch na leitura) causaria o mesmo sintoma, e
  // adotar esse zero como referencia faria a viagem seguinte "entregar" todo o
  // acumulado do sensor de uma vez.
  //
  // Por isso a queda so e aceita depois de confirmada por uma segunda leitura
  // igualmente baixa. Uma leitura solta e descartada.
  else if (leituraBruta < base) {
    const quedaPendente = quedasPendentes.get(envio.id);

    if (quedaPendente === undefined) {
      quedasPendentes.set(envio.id, leituraBruta);
      console.warn(
        `[Caminhoes] Viagem ${envio.id}: leitura ${leituraBruta} abaixo da base ${base}. ` +
        'Aguardando confirmacao antes de tratar como reinicio do sensor.'
      );
      return envio;
    }

    // Confirmou: o contador foi mesmo zerado, recomeca dali
    console.warn(`[Caminhoes] Viagem ${envio.id}: reinicio do sensor confirmado, nova base ${leituraBruta}`);
    quedasPendentes.delete(envio.id);
    base = leituraBruta;
  } else {
    // Voltou a subir: se havia queda pendente, era ruido
    quedasPendentes.delete(envio.id);
  }

  const entregue = Number((leituraBruta - base).toFixed(2));

  // Nada mudou desde a ultima gravacao: nao vale ida ao banco
  if (envio.volumeBase === base && envio.volumeEntregue === entregue) {
    return envio;
  }

  const { data, error } = await supabase
    .from('envios_caminhao')
    .update({
      volume_base: base,
      volume_entregue: entregue,
      medido_em: new Date().toISOString(),
    })
    .eq('id', envio.id)
    .select(CAMPOS)
    .single();

  if (error) {
    console.error('[Caminhoes] Erro ao registrar vazao:', error.message);
    throw new Error(`Não foi possível registrar o volume: ${error.message}`);
  }

  console.log(
    `[Caminhoes] Viagem ${envio.id}: sensor em ${leituraBruta}, base ${base} → ${entregue} m³`
  );

  return normalizarEnvio(data);
}

// ─────────────────────────────────────────────────────────────
// CONCLUIR UMA VIAGEM
// Marca a entrega como terminada, liberando o caminhao para sair de novo.
// A partir daqui as leituras do sensor deixam de alimentar esta viagem.
// ─────────────────────────────────────────────────────────────
export async function concluirViagem(idEnvio) {
  const { data, error } = await supabase
    .from('envios_caminhao')
    .update({ concluido_em: new Date().toISOString() })
    .eq('id', idEnvio)
    .select(CAMPOS)
    .single();

  if (error) {
    console.error('[Caminhoes] Erro ao concluir viagem:', error.message);
    throw new Error(`Não foi possível concluir a entrega: ${error.message}`);
  }

  // A viagem terminou; a vigilancia de queda do sensor nao vale mais
  quedasPendentes.delete(String(idEnvio));

  console.log(`[Caminhoes] Viagem ${idEnvio} concluida.`);
  return normalizarEnvio(data);
}

// ─────────────────────────────────────────────────────────────
// TOTAL DESCARREGADO NUMA OBRA
// Soma so as entregas ja medidas — viagem em andamento nao entra na conta.
// ─────────────────────────────────────────────────────────────
export function totalEntregue(envios, obraId) {
  return envios
    .filter((e) => e.obraId === String(obraId) && e.volumeEntregue !== null)
    .reduce((soma, e) => soma + e.volumeEntregue, 0);
}

// ─────────────────────────────────────────────────────────────
// REMOVER UM ENVIO
// ─────────────────────────────────────────────────────────────
export async function removerEnvio(id) {
  const { error } = await supabase.from('envios_caminhao').delete().eq('id', id);

  if (error) {
    console.error('[Caminhoes] Erro ao remover envio:', error.message);
    throw new Error(`Não foi possível remover o envio: ${error.message}`);
  }

  console.log(`[Caminhoes] Envio ${id} removido.`);
}
