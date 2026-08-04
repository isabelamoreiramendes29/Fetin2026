// Servico de autenticacao do Cemtinel (Supabase)
// Substitui os topicos MQTT app/log (login) e app/cad (cadastro).
//
// Por que saiu do MQTT: la a senha trafegava em texto puro num topico
// que qualquer cliente da rede podia assinar, e qualquer um podia publicar
// em app/resp fingindo ser o backend. Aqui a senha vai por HTTPS e o
// Supabase guarda so o hash dela.
//
// O MQTT continua responsavel por temperatura ao vivo e financeiro.

import 'react-native-url-polyfill/auto'; // o supabase-js usa a API URL, que o RN nao traz nativamente
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseConfig from '../config/supabaseConfig';

// ── CLIENTE UNICO, COMPARTILHADO PELO APP ──
// Diferente do MQTT (onde cada funcao cria o proprio cliente), aqui um
// cliente so basta: ele nao mantem conexao aberta, so faz chamadas HTTP.
export const supabase = createClient(supabaseConfig.url, supabaseConfig.chaveAnon, {
  auth: {
    // Guarda a sessao no dispositivo — o usuario segue logado ao reabrir o app,
    // mesmo sem internet no momento da abertura
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Precisa ser false em React Native: nao existe URL de navegador para ler
    detectSessionInUrl: false,
  },
});

// ── NORMALIZACAO DE E-MAIL ──
// O e-mail e a unica coisa que liga o usuario (Supabase) as obras (MySQL do
// backend). Se um lado gravar "Joao@Empresa.com" e o outro "joao@empresa.com",
// o vinculo se perde — entao padronizamos em minusculo e sem espacos.
function normalizarEmail(email) {
  return email.trim().toLowerCase();
}

// ─────────────────────────────────────────────────────────────
// CADASTRAR NOVO USUARIO
// Cria o usuario no Auth e manda nome/telefone/tipo como metadados.
// A tabela perfis e preenchida por um trigger no banco (ver supabase/schema.sql),
// nao por um insert daqui — assim funciona mesmo com confirmacao de e-mail ligada.
//
// Retorna { sucesso, mensagem, precisaConfirmarEmail }
// ─────────────────────────────────────────────────────────────
export async function fazerCadastro({ nome, email, telefone, senha, tipo }) {
  const emailNormalizado = normalizarEmail(email);
  console.log('[Supabase Cadastro] Cadastrando:', emailNormalizado, 'tipo:', tipo);

  const { data, error } = await supabase.auth.signUp({
    email: emailNormalizado,
    password: senha,
    options: {
      data: { nome, telefone, tipo },
    },
  });

  // console.warn (e nao console.error) de proposito: e-mail repetido ou senha
  // curta sao erros do usuario, ja tratados com Alert na tela. Com console.error
  // o React Native ainda abriria a tela vermelha por cima do alerta.
  if (error) {
    console.warn('[Supabase Cadastro] Recusado:', error.message);
    return { sucesso: false, mensagem: traduzirErro(error.message) };
  }

  // Quando a confirmacao de e-mail esta ligada, o Supabase cria o usuario
  // mas nao devolve sessao — o login so funciona depois do clique no link
  const precisaConfirmarEmail = !data.session;

  console.log('[Supabase Cadastro] Criado. Confirmacao pendente:', precisaConfirmarEmail);

  return { sucesso: true, precisaConfirmarEmail };
}

// ─────────────────────────────────────────────────────────────
// FAZER LOGIN
// Valida e-mail e senha e, em seguida, confere se o tipo de usuario
// escolhido na tela bate com o tipo gravado no perfil — evita que uma
// conta de Construtora entre como Mestre e vice-versa (era o papel da
// antiga verificarEmailExiste no MQTT).
//
// Retorna { sucesso, mensagem, tipo, nome }
// ─────────────────────────────────────────────────────────────
export async function fazerLogin({ email, senha, tipoEsperado }) {
  const emailNormalizado = normalizarEmail(email);
  console.log('[Supabase Login] Entrando:', emailNormalizado, 'tipo esperado:', tipoEsperado);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailNormalizado,
    password: senha,
  });

  // Ver nota em fazerCadastro: senha errada e caso esperado, nao falha do app
  if (error) {
    console.warn('[Supabase Login] Recusado:', error.message);
    return { sucesso: false, mensagem: traduzirErro(error.message) };
  }

  // Busca o perfil para saber o tipo real do usuario
  const { data: perfil, error: erroPerfil } = await supabase
    .from('perfis')
    .select('nome, tipo')
    .eq('id', data.user.id)
    .single();

  if (erroPerfil) {
    console.error('[Supabase Login] Erro ao buscar perfil:', erroPerfil.message);
    await supabase.auth.signOut();
    return { sucesso: false, mensagem: 'Não foi possível carregar seu perfil.' };
  }

  // Tipo escolhido na tela precisa bater com o tipo da conta
  if (tipoEsperado !== undefined && perfil.tipo !== tipoEsperado) {
    const tipoDaConta = perfil.tipo === supabaseConfig.TIPO_MESTRE ? 'Mestre de Obra' : 'Construtora';
    console.warn('[Supabase Login] Tipo divergente. Conta e', perfil.tipo);
    await supabase.auth.signOut();
    return {
      sucesso: false,
      mensagem: `Esta conta está cadastrada como ${tipoDaConta}. Selecione a opção correta.`,
    };
  }

  console.log('[Supabase Login] Sucesso. Tipo:', perfil.tipo);

  return { sucesso: true, tipo: perfil.tipo, nome: perfil.nome };
}

// ─────────────────────────────────────────────────────────────
// SAIR DA CONTA
// Limpa a sessao guardada no AsyncStorage
// ─────────────────────────────────────────────────────────────
export async function fazerLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase Logout] Erro:', error.message);
    return { sucesso: false, mensagem: error.message };
  }
  console.log('[Supabase Logout] Sessao encerrada.');
  return { sucesso: true };
}

// ─────────────────────────────────────────────────────────────
// PERFIL DO USUARIO LOGADO
// Retorna null se nao houver sessao ativa.
// Util para pular a tela de login quando o usuario ja entrou antes.
// ─────────────────────────────────────────────────────────────
export async function obterPerfilAtual() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('nome, telefone, tipo')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('[Supabase Perfil] Erro:', error.message);
    return null;
  }

  return { ...perfil, email: session.user.email, id: session.user.id };
}

// ─────────────────────────────────────────────────────────────
// TRADUCAO DAS MENSAGENS DE ERRO
// O Supabase responde em ingles; aqui viram mensagens que fazem
// sentido para quem esta usando o app.
// ─────────────────────────────────────────────────────────────
function traduzirErro(mensagem) {
  const msg = mensagem.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Este e-mail já está cadastrado.';
  }
  if (msg.includes('password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (msg.includes('unable to validate email address') || msg.includes('invalid email')) {
    return 'E-mail inválido.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Sem conexão com a internet. Verifique sua rede.';
  }

  return mensagem;
}
