// Tela de Boas-vindas (Welcome) — primeira tela que o usuario ve ao abrir o app
// Contem o logo do Cemtinel e os botoes de Entrar e Cadastrar-se

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Importa a logo oficial do Cemtinel
const logo = require('../assets/images/logo.jpeg');

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
      <View style={styles.logoArea}>
        {/* Logo oficial do Cemtinel com fundo transparente */}
        <Image
          source={logo}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* ── BOTOES ── */}
      <View style={styles.buttonsArea}>

        {/* Botao ENTRAR — fundo verde solido */}
        <TouchableOpacity
          style={styles.buttonEntrar}
          onPress={() => navigation.navigate('SelecionarObra')}
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

      {/* ── SILHUETA DECORATIVA DA FABRICA (rodape) ── */}
      {/* Placeholder — substitua por <Image> quando tiver o arquivo */}
      <View style={styles.bottomDecoration}>
        <Ionicons name="business" size={90} color="rgba(255,255,255,0.08)" />
        <Ionicons name="business" size={70} color="rgba(255,255,255,0.06)" style={{ marginLeft: -20 }} />
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

  // Agrupa a imagem do logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },

  // Tamanho da imagem da logo
  logoImage: {
    width: width * 0.72,
    height: width * 0.72,
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

  // Silhueta decorativa no rodape da tela
  bottomDecoration: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});
