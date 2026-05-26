// Componente reutilizavel de card do menu da obra
// Recebe: icone, tipoIcone, texto e onPress via props
// Usado na MenuObraScreen para renderizar cada opcao do menu

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CardMenu({ icone, tipoIcone = 'Ionicons', texto, onPress }) {

  // Renderiza o icone correto conforme a familia informada via prop
  function renderIcone() {
    const props = { name: icone, size: 26, color: '#fff' };

    if (tipoIcone === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons {...props} />;
    }

    // Padrao: Ionicons
    return <Ionicons {...props} />;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >

      {/* ── ICONE CIRCULAR A ESQUERDA ── */}
      <View style={styles.iconeCirculo}>
        {renderIcone()}
      </View>

      {/* ── TEXTO DO CARD NO CENTRO ── */}
      <Text style={styles.texto}>{texto}</Text>

      {/* ── SETA A DIREITA ── */}
      <Ionicons name="chevron-forward" size={22} color="#22C55E" />

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Card principal — fundo azul translucido, borda verde, cantos arredondados
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 32, 101, 0.55)',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  // Circulo com borda verde que envolve o icone
  iconeCirculo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  // Texto descritivo do card
  texto: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
