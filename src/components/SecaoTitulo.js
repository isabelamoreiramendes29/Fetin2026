// Componente reutilizavel de titulo de secao
// Exibe o nome da secao em verde, usado para organizar os formularios
// Props: titulo (string)

import React from 'react';
import { Text, StyleSheet } from 'react-native';

export default function SecaoTitulo({ titulo }) {
  return <Text style={styles.titulo}>{titulo}</Text>;
}

const styles = StyleSheet.create({
  titulo: {
    color: '#2ECC40',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
});
