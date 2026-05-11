// Componente reutilizavel de Card de Obra
// Usado tanto para os cards de obras quanto para o card "Adicionar"
// Props: nome (string), onPress (funcao), adicionar (boolean — muda visual para o card de adicionar)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CardObra({ nome, onPress, adicionar = false }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Icone circular da maleta a esquerda */}
      <View style={styles.iconeContainer}>
        <Ionicons
          name={adicionar ? 'add-circle-outline' : 'briefcase-outline'}
          size={22}
          color="#2ECC40"
        />
      </View>

      {/* Nome da obra ou texto "Adicionar" */}
      <Text style={styles.nome}>{nome}</Text>

      {/* Seta verde a direita */}
      <Ionicons name="chevron-forward" size={22} color="#2ECC40" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Card com fundo semi-transparente e borda sutil
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,204,64,0.4)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Circulo ao redor do icone da maleta
  iconeContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(46,204,64,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  // Nome da obra
  nome: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
