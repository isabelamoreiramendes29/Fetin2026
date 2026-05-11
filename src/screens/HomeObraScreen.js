// Tela Home da Obra — placeholder temporario
// Sera a tela principal de monitoramento de uma obra especifica
// Recebe obraId e obraNome como parametros de navegacao

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function HomeObraScreen({ navigation, route }) {
  // Recupera os dados da obra passados pela tela anterior
  const { obraNome } = route.params;

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.titulo}>{obraNome}</Text>
      <Text style={styles.subtitulo}>Tela em construcao...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  botaoVoltar: { position: 'absolute', top: 56, left: 24, padding: 4 },
  titulo: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
});
