// Estilos reutilizaveis em todo o aplicativo
import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const globalStyles = StyleSheet.create({
  // Container padrao de tela
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Container com padding lateral
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },

  // Card branco com sombra
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3, // sombra no Android
  },

  // Titulo de secao
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 16,
  },

  // Botao principal
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 8,
  },

  // Texto do botao
  buttonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Campo de entrada de texto
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginVertical: 6,
  },
});
