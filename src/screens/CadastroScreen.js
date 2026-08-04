// Tela de Cadastro — permite que novos usuarios criem uma conta no Cemtinel
// Acessada pelo botao "CADASTRAR-SE" da tela Welcome
// Ao finalizar o cadastro, publica os dados no broker MQTT (topico: app/cad)

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { fazerCadastro } from '../services/supabase';

const { width } = Dimensions.get('window');

export default function CadastroScreen({ navigation }) {
  // ── ESTADOS DOS CAMPOS ──
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState(null);

  // Controla se a senha esta visivel ou oculta
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  // Controla o estado de envio (evita duplo clique)
  const [enviando, setEnviando] = useState(false);

  // ── VALIDACAO DOS CAMPOS ──
  function validarCampos() {
    if (!nome || !email || !telefone || !senha) {
      Alert.alert('Campos obrigatorios', 'Por favor, preencha todos os campos.');
      return false;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      Alert.alert('E-mail invalido', 'Por favor, insira um e-mail valido.');
      return false;
    }

    if (senha.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter no minimo 6 caracteres.');
      return false;
    }

    const telefoneSemMascara = telefone.replace(/\D/g, '');
    if (telefoneSemMascara.length < 10) {
      Alert.alert('Telefone invalido', 'Por favor, insira um telefone com DDD (minimo 10 digitos).');
      return false;
    }

    if (tipoUsuario === null) {
      Alert.alert('Tipo de usuario', 'Por favor, selecione o tipo de usuario.');
      return false;
    }

    return true;
  }

  // ── ACAO DO BOTAO DE CADASTRAR ──
  // 1. Valida os campos
  // 2. Cria a conta no Supabase (a tabela perfis e preenchida por trigger)
  // 3. Navega para Login
  async function handleCadastro() {
    if (!validarCampos()) return;
    if (enviando) return;
    setEnviando(true);

    try {
      const resposta = await fazerCadastro({ nome, email, telefone, senha, tipo: tipoUsuario });

      if (!resposta.sucesso) {
        Alert.alert('Erro', resposta.mensagem);
        return;
      }

      // Se a confirmacao de e-mail estiver ligada no painel do Supabase,
      // o login so funciona depois que o usuario clicar no link recebido
      const mensagem = resposta.precisaConfirmarEmail
        ? 'Conta criada! Confirme seu e-mail pelo link que enviamos e depois faca o login.'
        : 'Cadastro realizado com sucesso! Faca o login para entrar.';

      Alert.alert(
        'Sucesso',
        mensagem,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (erro) {
      console.error('[Cadastro] Erro:', erro.message);
      Alert.alert('Erro', 'Erro ao enviar cadastro. Verifique sua conexao.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── BOTAO DE VOLTAR ── */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* ── ICONE CIRCULAR DO TOPO ── */}
          <View style={styles.iconeTopo}>
            <Ionicons name="person-add" size={32} color="#fff" />
          </View>

          {/* ── TITULO ── */}
          <Text style={styles.titulo}>Cadastro</Text>

          {/* ── CAMPOS DO FORMULARIO ── */}
          <View style={styles.formulario}>

            {/* Campo: Nome */}
            <View style={styles.campoContainer}>
              <Ionicons name="person-outline" size={20} color="#2ECC40" style={styles.campoIcone} />
              <View style={styles.separador} />
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            </View>

            {/* Campo: E-mail */}
            <View style={styles.campoContainer}>
              <Ionicons name="mail-outline" size={20} color="#2ECC40" style={styles.campoIcone} />
              <View style={styles.separador} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Campo: Telefone */}
            <View style={styles.campoContainer}>
              <Ionicons name="call-outline" size={20} color="#2ECC40" style={styles.campoIcone} />
              <View style={styles.separador} />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Campo: Senha com botao de mostrar/ocultar */}
            <View style={styles.campoContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#2ECC40" style={styles.campoIcone} />
              <View style={styles.separador} />
              <TextInput
                style={[styles.input, styles.inputSenha]}
                placeholder="Senha"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!senhaVisivel}
              />
              <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)}>
                <Ionicons
                  name={senhaVisivel ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.5)"
                  style={styles.iconeOlho}
                />
              </TouchableOpacity>
            </View>

            {/* Campo: Tipo de Usuario */}
            <View style={styles.tipoUsuarioContainer}>
              <Text style={styles.tipoUsuarioLabel}>Tipo de Usuário:</Text>
              <View style={styles.tipoUsuarioBotoes}>
                <TouchableOpacity
                  style={[
                    styles.botaoTipo,
                    tipoUsuario === 0 && styles.botaoTipoSelecionado,
                  ]}
                  onPress={() => setTipoUsuario(0)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.botaoTipoTexto}>Mestre de Obra</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botaoTipo,
                    tipoUsuario === 1 && styles.botaoTipoSelecionado,
                  ]}
                  onPress={() => setTipoUsuario(1)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="truck"
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.botaoTipoTexto}>Construtora</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>

          {/* ── BOTAO DE CADASTRAR (seta) ── */}
          <TouchableOpacity
            style={[styles.botaoCadastrar, enviando && styles.botaoCadastrarEnviando]}
            onPress={handleCadastro}
            activeOpacity={0.85}
            disabled={enviando}
          >
            <Ionicons
              name={enviando ? 'cloud-upload-outline' : 'arrow-forward'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  botaoVoltar: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
  },
  iconeTopo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A56DB',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titulo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 28,
  },
  formulario: {
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },
  campoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2ECC40',
    borderRadius: 12,
    height: 55,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14,
  },
  campoIcone: {
    marginRight: 10,
  },
  separador: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  inputSenha: {
    flex: 1,
  },
  iconeOlho: {
    marginLeft: 8,
  },
  tipoUsuarioContainer: {
    width: '100%',
  },
  tipoUsuarioLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  tipoUsuarioBotoes: {
    flexDirection: 'row',
    gap: 10,
  },
  botaoTipo: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#2ECC40',
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  botaoTipoSelecionado: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  botaoTipoTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  botaoCadastrar: {
    width: width * 0.85,
    height: 56,
    backgroundColor: '#2ECC40',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2ECC40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 32,
  },
  botaoCadastrarEnviando: {
    backgroundColor: '#27AE60',
    opacity: 0.8,
  },
});
