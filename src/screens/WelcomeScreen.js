// Tela de Boas-vindas (Welcome) — primeira tela que o usuario ve ao abrir o app
// Contem o logo do Cemtinel e os botoes de Entrar e Cadastrar-se

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LogoCemtinel from '../components/LogoCemtinel';

// Pega a largura da tela para calcular tamanhos proporcionais
const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    // Fundo com gradiente azul (topo claro → meio escuro → base clara)
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >

      {/* ── AREA DO LOGO ── */}
      {/* Desenhada em vetor, nao carregada de PNG: o arquivo tem fundo branco
          e viraria um quadrado claro no meio do gradiente */}
      <View style={styles.logoArea}>
        <LogoCemtinel largura={width * 0.78} />
      </View>

      {/* ── BOTOES ── */}
      <View style={styles.buttonsArea}>

        {/* Botao ENTRAR — fundo verde solido */}
        <TouchableOpacity
          style={styles.buttonEntrar}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in-outline" size={22} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>ENTRAR</Text>
        </TouchableOpacity>

        {/* Botao CADASTRAR-SE — fundo transparente com borda verde */}
        <TouchableOpacity
          style={styles.buttonCadastrar}
          onPress={() => navigation.navigate('Cadastro')}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add-outline" size={22} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>CADASTRAR-SE</Text>
        </TouchableOpacity>
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Tela inteira com gradiente
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Agrupa a logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },

  // Agrupa os dois botoes
  buttonsArea: {
    width: width * 0.80,
    gap: 16,
  },

  // Botao ENTRAR — verde solido
  buttonEntrar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2ECC40',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },

  // Botao CADASTRAR-SE — transparente com borda verde
  buttonCadastrar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2ECC40',
    paddingVertical: 16,
  },

  // Espaco entre o icone e o texto do botao
  buttonIcon: {
    marginRight: 10,
  },

  // Texto dos botoes
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

});
