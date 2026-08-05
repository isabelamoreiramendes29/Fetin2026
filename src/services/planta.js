// Mapa de Concretagem — camada de dados
//
// Guarda a foto da planta de uma obra e as regioes desenhadas em cima dela,
// cada uma ligada ao caminhao que a concretou e ao resultado do corpo de prova.
// Ver supabase/schema_planta.sql para a estrutura das tabelas.
//
// Regra central: as coordenadas dos poligonos sao NORMALIZADAS (0 a 1), nunca
// pixels. A mesma marcacao precisa cair no lugar certo em qualquer tamanho de
// tela, e a conversao para pixels acontece so na hora de desenhar.

import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const BUCKET = 'plantas';

// ── CORES DOS CAMINHOES ──
// Enquanto o corpo de prova nao foi rompido, a regiao aparece na cor do
// caminhao que a concretou. Aprovado vira verde e reprovado vira vermelho,
// entao estas cores evitam de proposito esses dois tons.
const CORES_CAMINHAO = [
  '#3B82F6', // azul
  '#A855F7', // roxo
  '#F97316', // laranja
  '#06B6D4', // ciano
  '#EC4899', // rosa
  '#EAB308', // amarelo
];

// Mesma identificacao de caminhao sempre recebe a mesma cor, sem precisar
// guardar isso no banco: a cor e derivada do nome.
export function corDoCaminhao(caminhao) {
  const texto = String(caminhao || '');
  let soma = 0;
  for (let i = 0; i < texto.length; i++) soma += texto.charCodeAt(i);
  return CORES_CAMINHAO[soma % CORES_CAMINHAO.length];
}

// ─────────────────────────────────────────────────────────────
// AVALIAR UMA REGIAO
// Traduz o resultado do laboratorio em status, cor e tracejado para a tela.
//
// Sao quatro estados, e a distincao entre os dois ultimos importa:
//   pendente  — corpo de prova ainda nao rompido (leva 28 dias)
//   aprovado  — atingiu o fck de primeira (verde solido)
//   resolvido — reprovou, mas recebeu reforco estrutural (verde tracejado)
//   reprovado — abaixo do fck e ainda sem tratamento (vermelho)
//
// "resolvido" nao vira "aprovado" de proposito: a area teve um problema, e o
// mapa precisa continuar mostrando isso mesmo depois de corrigida.
// ─────────────────────────────────────────────────────────────
export function avaliarRegiao(regiao, fckProjeto) {
  if (regiao.resultadoMpa === null || regiao.resultadoMpa === undefined) {
    return {
      status: 'pendente',
      cor: corDoCaminhao(regiao.caminhao),
      rotulo: 'Aguardando rompimento',
      tracejado: false,
    };
  }

  if (Number(regiao.resultadoMpa) >= Number(fckProjeto)) {
    return { status: 'aprovado', cor: '#22C55E', rotulo: 'Aprovado', tracejado: false };
  }

  if (regiao.dataReforco) {
    return {
      status: 'resolvido',
      cor: '#22C55E',
      rotulo: 'Reforçado',
      tracejado: true,
    };
  }

  return { status: 'reprovado', cor: '#DC2626', rotulo: 'Reprovado', tracejado: false };
}

// Converte a linha do banco (snake_case) para o formato usado no app
function normalizarRegiao(linha) {
  return {
    id: linha.id,
    caminhao: linha.caminhao,
    pontos: linha.pontos,
    corpoProva: linha.corpo_prova,
    resultadoMpa: linha.resultado_mpa === null ? null : Number(linha.resultado_mpa),
    dataRompimento: linha.data_rompimento,
    dataConcretagem: linha.data_concretagem,
    reforcoDescricao: linha.reforco_descricao,
    dataReforco: linha.data_reforco,
  };
}

// Colunas lidas em toda consulta de regiao — evita esquecer alguma quando
// a tabela ganha campo novo
const CAMPOS_REGIAO =
  'id, caminhao, pontos, corpo_prova, resultado_mpa, data_rompimento, ' +
  'data_concretagem, reforco_descricao, data_reforco';

// ─────────────────────────────────────────────────────────────
// BUSCAR A PLANTA DE UMA OBRA, COM SUAS REGIOES
// Retorna null quando a obra ainda nao tem planta cadastrada — nao e erro,
// e o estado inicial de toda obra.
// ─────────────────────────────────────────────────────────────
export async function buscarPlanta(obraId) {
  const { data: planta, error } = await supabase
    .from('plantas')
    .select('id, url_imagem, largura, altura, fck_projeto')
    .eq('id_obra', String(obraId))
    .maybeSingle();

  if (error) {
    console.error('[Planta] Erro ao buscar planta:', error.message);
    throw new Error('Não foi possível carregar a planta.');
  }

  if (!planta) {
    console.log(`[Planta] Obra ${obraId} ainda nao tem planta.`);
    return null;
  }

  const { data: regioes, error: erroRegioes } = await supabase
    .from('regioes_concretagem')
    .select(CAMPOS_REGIAO)
    .eq('id_planta', planta.id)
    .order('data_concretagem', { ascending: true });

  if (erroRegioes) {
    console.error('[Planta] Erro ao buscar regioes:', erroRegioes.message);
    throw new Error('Não foi possível carregar as áreas marcadas.');
  }

  console.log(`[Planta] Obra ${obraId}: ${regioes.length} regioes.`);

  return {
    id: planta.id,
    urlImagem: planta.url_imagem,
    largura: planta.largura,
    altura: planta.altura,
    fckProjeto: Number(planta.fck_projeto),
    regioes: regioes.map(normalizarRegiao),
  };
}

// ─────────────────────────────────────────────────────────────
// ENVIAR (OU SUBSTITUIR) A PLANTA DE UMA OBRA
// `imagem` e o objeto devolvido pelo expo-image-picker, com base64,
// width e height. O upload vai para o Storage e a linha para a tabela.
//
// A tabela tem indice unico por obra: reenviar substitui a planta anterior.
// Como isso apaga as regioes em cascata, a tela avisa antes de chamar aqui.
// ─────────────────────────────────────────────────────────────
export async function enviarPlanta(obraId, imagem, fckProjeto) {
  const caminho = `${obraId}/${Date.now()}.jpg`;

  // Sem base64 nao ha o que enviar. Acontece quando o picker e chamado sem a
  // opcao base64: true, ou quando a imagem escolhida nao pode ser lida.
  if (!imagem?.base64) {
    console.error('[Planta] Imagem veio sem base64:', Object.keys(imagem || {}));
    throw new Error('A imagem escolhida não pôde ser lida. Tente outra foto.');
  }

  // As policies do bucket valem para o papel "authenticated". Sem sessao, o
  // Supabase trata a requisicao como anonima e o RLS recusa com uma mensagem
  // que nao explica a causa — entao checamos antes e dizemos o que houve.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('[Planta] Sem sessao ativa — upload seria recusado pelo RLS.');
    throw new Error('Sua sessão expirou. Saia da conta e entre novamente.');
  }

  console.log(`[Planta] Enviando ${caminho} (${imagem.width}x${imagem.height}) como ${session.user.email}`);

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, decode(imagem.base64), {
      contentType: 'image/jpeg',
      // Sem upsert: o caminho leva timestamp, entao nunca colide. Evita que o
      // cliente tente um caminho de update, que exige permissao adicional.
      upsert: false,
    });

  if (erroUpload) {
    console.error('[Planta] Erro no upload:', erroUpload.message);
    // Repassa o motivo real: "Bucket not found" e "new row violates row-level
    // security policy" pedem correcoes bem diferentes, e esconder isso atras de
    // uma mensagem generica so atrasa o diagnostico.
    throw new Error(`Falha ao enviar a imagem: ${erroUpload.message}`);
  }

  const { data: publico } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

  // onConflict em id_obra: substitui a planta existente da obra
  const { data, error } = await supabase
    .from('plantas')
    .upsert(
      {
        id_obra: String(obraId),
        url_imagem: publico.publicUrl,
        largura: imagem.width,
        altura: imagem.height,
        fck_projeto: fckProjeto,
      },
      { onConflict: 'id_obra' }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[Planta] Erro ao salvar planta:', error.message);
    throw new Error(`Falha ao salvar a planta: ${error.message}`);
  }

  console.log(`[Planta] Planta ${data.id} salva para a obra ${obraId}.`);
  return data.id;
}

// ─────────────────────────────────────────────────────────────
// SALVAR UMA REGIAO MARCADA NA PLANTA
// `pontos` e o array de vertices ja normalizados: [{ x, y }] com x e y de 0 a 1.
// Nasce sem resultado — o corpo de prova so e rompido 28 dias depois.
// ─────────────────────────────────────────────────────────────
export async function salvarRegiao(idPlanta, { caminhao, pontos, corpoProva }) {
  const { data, error } = await supabase
    .from('regioes_concretagem')
    .insert({
      id_planta: idPlanta,
      caminhao,
      pontos,
      corpo_prova: corpoProva || null,
    })
    .select(CAMPOS_REGIAO)
    .single();

  if (error) {
    console.error('[Planta] Erro ao salvar regiao:', error.message);
    throw new Error('Não foi possível salvar a área marcada.');
  }

  console.log(`[Planta] Regiao ${data.id} salva (caminhao ${caminhao}).`);
  return normalizarRegiao(data);
}

// ─────────────────────────────────────────────────────────────
// LANCAR O RESULTADO DO LABORATORIO NUMA REGIAO
// A comparacao com o fck acontece na exibicao (ver avaliarRegiao), nao aqui:
// o banco guarda o numero medido, e so.
// ─────────────────────────────────────────────────────────────
export async function lancarResultado(idRegiao, resultadoMpa) {
  const { data, error } = await supabase
    .from('regioes_concretagem')
    .update({
      resultado_mpa: resultadoMpa,
      data_rompimento: new Date().toISOString(),
    })
    .eq('id', idRegiao)
    .select(CAMPOS_REGIAO)
    .single();

  if (error) {
    console.error('[Planta] Erro ao lancar resultado:', error.message);
    throw new Error('Não foi possível salvar o resultado.');
  }

  console.log(`[Planta] Regiao ${idRegiao} rompida com ${resultadoMpa} MPa.`);
  return normalizarRegiao(data);
}

// ─────────────────────────────────────────────────────────────
// REGISTRAR REFORCO ESTRUTURAL NUMA AREA REPROVADA
// Nao altera o resultado_mpa: o ensaio deu o que deu, e esse numero fica.
// O que muda e que a area passa a ter um tratamento registrado, e a tela
// mostra isso como "Reforçado" — verde tracejado, distinto de aprovado.
// ─────────────────────────────────────────────────────────────
export async function registrarReforco(idRegiao, descricao) {
  const { data, error } = await supabase
    .from('regioes_concretagem')
    .update({
      reforco_descricao: descricao,
      data_reforco: new Date().toISOString(),
    })
    .eq('id', idRegiao)
    .select(CAMPOS_REGIAO)
    .single();

  if (error) {
    console.error('[Planta] Erro ao registrar reforco:', error.message);
    throw new Error(`Falha ao registrar o reforço: ${error.message}`);
  }

  console.log(`[Planta] Reforco registrado na regiao ${idRegiao}.`);
  return normalizarRegiao(data);
}

// ─────────────────────────────────────────────────────────────
// SITUACAO GERAL DA CONCRETAGEM
// Resume o estado das areas para o selo no topo da tela. A ordem das
// verificacoes e proposital: reprovacao sem tratamento e o que mais pesa,
// entao aparece antes de qualquer outra pendencia.
// ─────────────────────────────────────────────────────────────
export function situacaoGeral(regioes, fckProjeto) {
  if (regioes.length === 0) {
    return { status: 'vazio', cor: '#64748B', texto: 'Nenhuma área marcada' };
  }

  const avaliadas = regioes.map((r) => avaliarRegiao(r, fckProjeto));

  const reprovadas = avaliadas.filter((a) => a.status === 'reprovado').length;
  if (reprovadas > 0) {
    return {
      status: 'reprovado',
      cor: '#DC2626',
      texto: reprovadas === 1
        ? '1 área reprovada aguardando reforço'
        : `${reprovadas} áreas reprovadas aguardando reforço`,
    };
  }

  const pendentes = avaliadas.filter((a) => a.status === 'pendente').length;
  if (pendentes > 0) {
    return {
      status: 'pendente',
      cor: '#FACC15',
      texto: pendentes === 1
        ? '1 área aguardando ensaio'
        : `${pendentes} áreas aguardando ensaio`,
    };
  }

  const reforcadas = avaliadas.filter((a) => a.status === 'resolvido').length;
  return {
    status: 'liberado',
    cor: '#22C55E',
    texto: reforcadas > 0
      ? `Todas as áreas liberadas (${reforcadas} com reforço)`
      : 'Todas as áreas liberadas',
  };
}

// ─────────────────────────────────────────────────────────────
// APAGAR UMA REGIAO
// Usado quando a marcacao sai errada — desenhar poligono em tela pequena
// erra com alguma frequencia.
// ─────────────────────────────────────────────────────────────
export async function removerRegiao(idRegiao) {
  const { error } = await supabase
    .from('regioes_concretagem')
    .delete()
    .eq('id', idRegiao);

  if (error) {
    console.error('[Planta] Erro ao remover regiao:', error.message);
    throw new Error('Não foi possível remover a área.');
  }

  console.log(`[Planta] Regiao ${idRegiao} removida.`);
}
