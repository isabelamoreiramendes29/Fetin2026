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
    medidoEm: linha.medido_em,
  };
}

// O join traz o nome da obra junto, evitando uma segunda consulta so para
// exibir "Caminhao 4 → Obra do Centro"
const CAMPOS =
  'id, id_obra, caminhao, enviado_em, volume_entregue, medido_em, obras ( nome )';

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
