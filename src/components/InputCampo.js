// Componente reutilizavel de campo de input
// Usado em todas as telas de formulario do app
// Props:
//   icone       — nome do icone Ionicons (string)
//   placeholder — texto de placeholder
//   value       — valor atual do campo
//   onChangeText — funcao chamada ao digitar
//   ...props    — qualquer outra prop do TextInput (keyboardType, secureTextEntry, etc.)

import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InputCampo({ icone, placeholder, value, onChangeText, style, ...props }) {
  return (
    <View style={[styles.container, style]}>
      {/* Icone opcional a esquerda */}
      {icone && (
        <Ionicons name={icone} size={18} color="#2ECC40" style={styles.icone} />
      )}

      {/* Campo de texto */}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.4)"
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Container com borda verde e fundo semi-transparente
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(46,204,64,0.5)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 12,
  },

  // Icone com espaco a direita
  icone: {
    marginRight: 8,
  },

  // Campo de texto ocupa o espaco restante
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
});
