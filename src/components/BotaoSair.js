// Botao de sair da conta
// Usado nas telas de Selecionar Obra (Mestre e Construtora), que sao a raiz
// da sessao logada — dali nao ha para onde voltar a nao ser saindo.
//
// Faz duas coisas: encerra a sessao no Supabase (limpando o que estava
// guardado no AsyncStorage) e reinicia a pilha de navegacao na Welcome.
// O reset e importante: sem ele, o botao voltar do aparelho devolveria
// o usuario para dentro do app mesmo depois de sair.

import React from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fazerLogout } from '../services/supabase';

export default function BotaoSair({ navigation, style }) {
  function confirmarSaida() {
    Alert.alert('Sair da conta', 'Deseja mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  }

  async function sair() {
    await fazerLogout();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }

  return (
    <TouchableOpacity
      style={[styles.botao, style]}
      onPress={confirmarSaida}
      activeOpacity={0.8}
    >
      <Ionicons name="log-out-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Mesmo formato circular dos botoes de voltar das outras telas
  botao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
