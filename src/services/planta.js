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
// Traduz o resultado do laboratorio em status, cor e rotulo para a tela.
// resultadoMpa nulo = corpo de prova ainda nao rompido (leva 28 dias).
// ─────────────────────────────────────────────────────────────
export function avaliarRegiao(regiao, fckProjeto) {
  if (regiao.resultadoMpa === null || regiao.resultadoMpa === undefined) {
    return {
      status: 'pendente',
      cor: corDoCaminhao(regiao.caminhao),
      rotulo: 'Aguardando rompimento',
    };
  }

  if (Number(regiao.resultadoMpa) >= Number(fckProjeto)) {
    return { status: 'aprovado', cor: '#22C55E', rotulo: 'Aprovado' };
  }

  return { status: 'reprovado', cor: '#DC2626', rotulo: 'Reprovado' };
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
  };
}

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
    .select('id, caminhao, pontos, corpo_prova, resultado_mpa, data_rompimento, data_concretagem')
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

  console.log(`[Planta] Enviando imagem para ${caminho}`);

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, decode(imagem.base64), {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (erroUpload) {
    console.error('[Planta] Erro no upload:', erroUpload.message);
    throw new Error('Não foi possível enviar a imagem da planta.');
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
    throw new Error('Não foi possível salvar a planta.');
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
    .select('id, caminhao, pontos, corpo_prova, resultado_mpa, data_rompimento, data_concretagem')
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
    .select('id, caminhao, pontos, corpo_prova, resultado_mpa, data_rompimento, data_concretagem')
    .single();

  if (error) {
    console.error('[Planta] Erro ao lancar resultado:', error.message);
    throw new Error('Não foi possível salvar o resultado.');
  }

  console.log(`[Planta] Regiao ${idRegiao} rompida com ${resultadoMpa} MPa.`);
  return normalizarRegiao(data);
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
