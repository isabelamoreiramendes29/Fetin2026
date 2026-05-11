// Tela de Cadastro — permite que novos usuarios criem uma conta no Cemtinel
// Acessada pelo botao "CADASTRAR-SE" da tela Welcome

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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

const { width } = Dimensions.get('window');

export default function CadastroScreen({ navigation }) {
  // ── ESTADOS DOS CAMPOS ──
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');

  // Controla se a senha esta visivel ou oculta
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  // ── VALIDACAO DOS CAMPOS ──
  function validarCampos() {
    // Verifica se todos os campos foram preenchidos
    if (!nome || !email || !telefone || !senha) {
      Alert.alert('Campos obrigatorios', 'Por favor, preencha todos os campos.');
      return false;
    }

    // Valida formato do e-mail com regex
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      Alert.alert('E-mail invalido', 'Por favor, insira um e-mail valido.');
      return false;
    }

    // Valida tamanho minimo da senha
    if (senha.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter no minimo 6 caracteres.');
      return false;
    }

    // Valida tamanho minimo do telefone (10 digitos = DDD + numero)
    const telefoneSemMascara = telefone.replace(/\D/g, '');
    if (telefoneSemMascara.length < 10) {
      Alert.alert('Telefone invalido', 'Por favor, insira um telefone com DDD (minimo 10 digitos).');
      return false;
    }

    return true;
  }

  // ── ACAO DO BOTAO DE CADASTRAR ──
  function handleCadastro() {
    if (!validarCampos()) return;

    // Por enquanto navega para Login e exibe mensagem de sucesso
    // Futuramente: enviar dados para o backend
    Alert.alert(
      'Cadastro realizado!',
      'Sua conta foi criada com sucesso.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );
  }

  return (
    // Fundo com gradiente azul igual ao Welcome
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* KeyboardAvoidingView empurra os campos para cima quando o teclado abre */}
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
              {/* Botao olho — alterna entre mostrar e ocultar senha */}
              <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)}>
                <Ionicons
                  name={senhaVisivel ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.5)"
                  style={styles.iconeOlho}
                />
              </TouchableOpacity>
            </View>

          </View>

          {/* ── BOTAO DE CADASTRAR (seta) ── */}
          <TouchableOpacity
            style={styles.botaoCadastrar}
            onPress={handleCadastro}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-forward" size={28} color="#fff" />
          </TouchableOpacity>

          {/* ── DECORACAO DA FABRICA NO RODAPE ── */}
          <View style={styles.rodape}>
            <Ionicons name="business" size={90} color="rgba(255,255,255,0.08)" />
            <Ionicons name="business" size={70} color="rgba(255,255,255,0.06)" style={{ marginLeft: -20 }} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Tela inteira com gradiente
  container: {
    flex: 1,
  },

  // View que gerencia o comportamento do teclado
  keyboardView: {
    flex: 1,
  },

  // Conteudo interno do ScrollView
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },

  // Seta de voltar no canto superior esquerdo
  botaoVoltar: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
  },

  // Circulo azul com icone de pessoa no topo
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

  // Titulo "Cadastro"
  titulo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 28,
  },

  // Agrupa todos os campos
  formulario: {
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },

  // Container de cada campo (icone + separador + input)
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

  // Icone do lado esquerdo do campo
  campoIcone: {
    marginRight: 10,
  },

  // Linha vertical separando icone do texto
  separador: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 12,
  },

  // Campo de texto
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },

  // Input de senha precisa de espaco para o icone do olho
  inputSenha: {
    flex: 1,
  },

  // Icone do olho (mostrar/ocultar senha)
  iconeOlho: {
    marginLeft: 8,
  },

  // Botao verde com seta
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

  // Silhueta decorativa da fabrica no rodape
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
});
