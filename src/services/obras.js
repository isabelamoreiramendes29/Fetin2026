// Obras — camada de dados
//
// Ver supabase/schema_obras.sql.
//
// Saiu do MQTT porque obra e cadastro, nao telemetria. O app precisa
// PERGUNTAR ("quais sao as obras desta construtora"), e MQTT nao responde
// pergunta — o backend so conseguia empurrar a lista inteira para todos.
//
// Nao existe funcao de "buscar as obras de fulano": a filtragem acontece no
// servidor, pelas policies. Quem consulta recebe so as obras que criou ou
// aquelas em que o proprio e-mail foi informado como construtora. Antes esse
// filtro era feito no aplicativo, o que significa que os dados alheios
// chegavam ao aparelho e dependiam do app resolver ignora-los.

import { supabase } from './supabase';

// Converte a linha do banco (snake_case) para o formato usado no app (camelCase)
function normalizarObra(linha) {
  return {
    id: String(linha.id),
    nome: linha.nome,
    cep: linha.cep || '',
    endereco: linha.endereco || '',
    numero: linha.numero || '',
    complemento: linha.complemento || '',
    dataInicio: linha.data_inicio || '',
    dataTermino: linha.data_termino || '',
    volumeCimento: linha.volume_cimento || 0,
    emailConstrutora: linha.email_construtora || '',
  };
}

const CAMPOS =
  'id, nome, cep, endereco, numero, complemento, data_inicio, data_termino, ' +
  'volume_cimento, email_construtora';

// ─────────────────────────────────────────────────────────────
// BUSCAR AS OBRAS VISIVEIS PARA O USUARIO LOGADO
// Retorna [] quando nao ha sessao — sem token o servidor nao devolveria nada
// mesmo, e checar antes evita uma ida a rede inutil.
// ─────────────────────────────────────────────────────────────
export async function buscarObras() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('[Obras] Sem sessao — nada a carregar.');
    return [];
  }

  const { data, error } = await supabase
    .from('obras')
    .select(CAMPOS)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('[Obras] Erro ao buscar:', error.message);
    throw new Error(`Não foi possível carregar as obras: ${error.message}`);
  }

  console.log(`[Obras] ${data.length} obras visiveis para ${session.user.email}.`);
  return data.map(normalizarObra);
}

// ─────────────────────────────────────────────────────────────
// CADASTRAR UMA OBRA
// dataInicio e dataTermino sao objetos Date; o banco guarda so o dia.
// O e-mail da construtora e normalizado em minusculo — e por ele que a
// construtora enxerga a obra, e uma diferenca de maiuscula quebraria o vinculo.
// ─────────────────────────────────────────────────────────────
export async function criarObra(dados) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sua sessão expirou. Entre novamente.');

  const { data, error } = await supabase
    .from('obras')
    .insert({
      nome: dados.nome,
      cep: dados.cep,
      endereco: dados.endereco,
      numero: dados.numero,
      complemento: dados.complemento || null,
      data_inicio: dados.dataInicio.toISOString().slice(0, 10),
      data_termino: dados.dataTermino.toISOString().slice(0, 10),
      volume_cimento: Number(dados.volumeCimento),
      email_construtora: dados.emailConstrutora.trim().toLowerCase(),
      criado_por: session.user.id,
    })
    .select(CAMPOS)
    .single();

  if (error) {
    console.error('[Obras] Erro ao cadastrar:', error.message);
    throw new Error(`Não foi possível salvar a obra: ${error.message}`);
  }

  console.log(`[Obras] Obra ${data.id} cadastrada.`);
  return normalizarObra(data);
}

// ─────────────────────────────────────────────────────────────
// REMOVER UMA OBRA
// So o criador consegue — quem tenta remover obra alheia recebe erro do RLS.
// ─────────────────────────────────────────────────────────────
export async function removerObra(id) {
  const { error } = await supabase.from('obras').delete().eq('id', id);

  if (error) {
    console.error('[Obras] Erro ao remover:', error.message);
    throw new Error(`Não foi possível remover a obra: ${error.message}`);
  }

  console.log(`[Obras] Obra ${id} removida.`);
}
