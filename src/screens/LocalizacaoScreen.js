// Tela Localizacao — placeholder temporario
// Exibira o mapa com a localizacao do caminhao de cimento
// Recebe obraId e obraNome via route.params

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function LocalizacaoScreen({ navigation, route }) {
  const { obraNome } = route.params;

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* Botao de voltar */}
      <TouchableOpacity
        style={styles.botaoVoltar}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Icone ilustrativo */}
      <Ionicons name="location-outline" size={72} color="rgba(255,255,255,0.25)" style={styles.icone} />

      {/* Titulo da tela */}
      <Text style={styles.titulo}>Localização</Text>
      <Text style={styles.nomeObra}>{obraNome}</Text>

      {/* Indicador de construcao */}
      <View style={styles.badge}>
        <Ionicons name="construct-outline" size={16} color="#22C55E" style={{ marginRight: 6 }} />
        <Text style={styles.badgeTexto}>Em construção</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoVoltar: {
    position: 'absolute',
    top: 56,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icone: {
    marginBottom: 16,
  },
  titulo: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  nomeObra: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeTexto: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
});
