// Tela de Login - tela inicial do aplicativo
// Por enquanto exibe apenas um texto placeholder ate recebermos o design
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>Tela de Login em construcao...</Text>

      {/* Botao temporario — sera substituido pelo design real */}
      <TouchableOpacity
        style={styles.botao}
        onPress={() => navigation.navigate('SelecionarObra')}
      >
        <Text style={styles.botaoTexto}>ENTRAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  texto: {
    color: colors.textLight,
    fontSize: 18,
  },
  botao: {
    backgroundColor: colors.green,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
