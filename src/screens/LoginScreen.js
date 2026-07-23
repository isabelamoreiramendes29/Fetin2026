// Tela de Login — acessada pelo botao "ENTRAR" da tela Welcome
// O usuario entra com email e senha para acessar o app

import React, { useState } from 'react';
import {
  View,
  Text,
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
import InputCampo from '../components/InputCampo';
import { colors } from '../styles/colors';
import { publicarLogin } from '../services/mqtt';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  // ── ESTADOS DOS CAMPOS ──
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState('');

  // Controla o estado de envio (evita duplo clique no botao)
  const [enviando, setEnviando] = useState(false);

  // ── VALIDACAO DOS CAMPOS ──
  function validarCampos() {
    if (!email) {
      Alert.alert('Campo obrigatorio', 'Por favor, preencha o e-mail.');
      return false;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      Alert.alert('E-mail invalido', 'Por favor, insira um e-mail valido.');
      return false;
    }

    if (!senha || senha.length < 6) {
      Alert.alert('Senha invalida', 'A senha deve ter no minimo 6 caracteres.');
      return false;
    }

    if (!tipoUsuario) {
      Alert.alert('Tipo de usuario', 'Por favor, selecione o tipo de usuario.');
      return false;
    }

    return true;
  }

  // ── ACAO DO BOTAO ENTRAR ──
  // 1. Valida formato dos campos
  // 2. Publica no MQTT e aguarda a validacao do backend (topico app/resp)
  // 3. Se valido, navega para SelecionarObra (Mestre) ou MenuConstrutora (Construtora)
  async function handleEntrar() {
    if (!validarCampos()) return;
    if (enviando) return;
    setEnviando(true);

    try {
      const resposta = await publicarLogin({ email, senha });

      if (!resposta.sucesso) {
        Alert.alert('Erro', resposta.mensagem);
        return;
      }

      if (tipoUsuario === 'construtora') {
        navigation.navigate('MenuConstrutora');
      } else {
        navigation.navigate('SelecionarObra');
      }

    } catch (erro) {
      console.error('[Login] Erro:', erro.message);
      Alert.alert('Erro', 'Nao foi possivel conectar ao servidor. Tente novamente.');
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
            <Ionicons name="log-in-outline" size={32} color="#fff" />
          </View>

          {/* ── TITULO ── */}
          <Text style={styles.titulo}>Login</Text>

          {/* ── CAMPOS DO FORMULARIO ── */}
          <View style={styles.formulario}>

            {/* Campo: E-mail */}
            <View style={styles.campoContainer}>
              <Ionicons name="mail-outline" size={20} color="#2ECC40" style={styles.campoIcone} />
              <View style={styles.separador} />
              <InputCampo
                placeholder="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.inputInterno}
              />
            </View>

            {/* Campo: Senha com botao mostrar/ocultar */}
            <View style={styles.campoContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#2ECC40" style={styles.campoIcone} />
              <View style={styles.separador} />
              <InputCampo
                placeholder="Senha"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!senhaVisivel}
                style={styles.inputInterno}
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

          </View>

          {/* ── LINK ESQUECI MINHA SENHA ── */}
          <TouchableOpacity style={styles.linkEsqueci} onPress={() => {}}>
            <Text style={styles.textoEsqueci}>Esqueci minha senha</Text>
          </TouchableOpacity>

          {/* ── SELETOR: TIPO DE USUARIO ── */}
          <View style={styles.tipoUsuarioContainer}>
            <Text style={styles.tipoUsuarioLabel}>Estou entrando como:</Text>
            <View style={styles.tipoUsuarioBotoes}>
              <TouchableOpacity
                style={[
                  styles.botaoTipo,
                  tipoUsuario === 'mestre' && styles.botaoTipoSelecionado,
                ]}
                onPress={() => setTipoUsuario('mestre')}
                activeOpacity={0.85}
              >
                <Ionicons name="person-outline" size={22} color="#fff" />
                <Text style={styles.botaoTipoTexto}>Mestre de Obra</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoTipo,
                  tipoUsuario === 'construtora' && styles.botaoTipoSelecionado,
                ]}
                onPress={() => setTipoUsuario('construtora')}
                activeOpacity={0.85}
              >
                <Ionicons name="car-outline" size={22} color="#fff" />
                <Text style={styles.botaoTipoTexto}>Construtora</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── BOTAO ENTRAR ── */}
          <TouchableOpacity
            style={[styles.botaoEntrar, enviando && styles.botaoEnviando]}
            onPress={handleEntrar}
            activeOpacity={0.85}
            disabled={enviando}
          >
            <Ionicons
              name={enviando ? 'cloud-upload-outline' : 'log-in-outline'}
              size={22}
              color="#fff"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.botaoTexto}>{enviando ? 'ENVIANDO...' : 'ENTRAR'}</Text>
          </TouchableOpacity>

          {/* ── LINK CADASTRE-SE ── */}
          <TouchableOpacity
            style={styles.linkCadastro}
            onPress={() => navigation.navigate('Cadastro')}
          >
            <Text style={styles.textoCadastroNormal}>Nao tem conta? </Text>
            <Text style={styles.textoCadastroLink}>Cadastre-se</Text>
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
    marginBottom: 12,
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
  inputInterno: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    height: 55,
  },
  iconeOlho: {
    marginLeft: 8,
  },
  linkEsqueci: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  textoEsqueci: {
    color: '#2ECC40',
    fontSize: 13,
  },
  tipoUsuarioContainer: {
    width: '100%',
    marginBottom: 20,
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
  botaoEntrar: {
    width: width * 0.85,
    height: 56,
    backgroundColor: '#2ECC40',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2ECC40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  botaoEnviando: {
    backgroundColor: '#27AE60',
    opacity: 0.8,
  },
  linkCadastro: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  textoCadastroNormal: {
    color: '#fff',
    fontSize: 14,
  },
  textoCadastroLink: {
    color: '#2ECC40',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});
