// Tela Historico de Entregas — placeholder temporario
// Acessada pelo card "Histórico de Entregas" do MenuConstrutoraScreen

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function HistoricoEntregasScreen({ navigation }) {
  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.titulo}>Histórico de Entregas</Text>
      <Text style={styles.subtitulo}>Em construção</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  botaoVoltar: { position: 'absolute', top: 56, left: 24, padding: 4 },
  titulo: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
});
