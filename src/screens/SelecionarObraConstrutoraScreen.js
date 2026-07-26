// Tela de Selecionar Obra (Construtora) — aparece logo apos o login como Construtora
// Diferente do Mestre, a Construtora nao pode adicionar obras: ve as obras
// cadastradas pelo Mestre, vindas do contexto global (ObrasContext).
// TODO: quando integrar com MQTT, filtrar por email_construtora em vez de mostrar todas.

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { useObras } from '../context/ObrasContext';

export default function SelecionarObraConstrutoraScreen({ navigation }) {
  // Acessa a lista real de obras do contexto global, cadastradas pelo Mestre
  const { obras } = useObras();

  // Vai para o menu da obra selecionada, passando os dados como parametro
  function handlePressCard(item) {
    navigation.navigate('MenuConstrutora', {
      obraId: item.id,
      obraNome: item.nome,
    });
  }

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >

      {/* ── CABECALHO ── */}
      <View style={styles.cabecalho}>
        <View style={styles.cabecalhoEsquerda}>

          {/* Botao de voltar */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Titulo e linha decorativa */}
          <View>
            <Text style={styles.titulo}>Selecionar Obra</Text>
            <View style={styles.linhaDecorada} />
          </View>
        </View>

        {/* Icone de construcao a direita do titulo */}
        <MaterialCommunityIcons name="wall" size={36} color="rgba(255,255,255,0.7)" />
      </View>

      {/* ── LISTA DE OBRAS ── */}
      <FlatList
        data={obras}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handlePressCard(item)}
            activeOpacity={0.8}
          >
            {/* Icone circular do predio a esquerda */}
            <View style={styles.iconeContainer}>
              <MaterialCommunityIcons name="office-building-outline" size={22} color="#2ECC40" />
            </View>

            {/* Nome da obra + endereco */}
            <View style={styles.textoContainer}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.endereco}>
                {[item.endereco, item.numero, item.cep].filter(Boolean).join(', ')}
              </Text>
            </View>

            {/* Seta verde a direita */}
            <Ionicons name="chevron-forward" size={22} color="#2ECC40" />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        // Mensagem exibida quando ainda nao ha nenhuma obra cadastrada
        ListEmptyComponent={
          <View style={styles.vazioContainer}>
            <Ionicons name="business-outline" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.vazioTexto}>
              Nenhuma obra disponível ainda.{'\n'}Aguarde um Mestre de Obra cadastrar obras.
            </Text>
          </View>
        }
        // Rodape com silhueta da fabrica
        ListFooterComponent={
          <View style={styles.rodape}>
            <Ionicons name="business" size={90} color="rgba(255,255,255,0.08)" />
            <Ionicons name="business" size={70} color="rgba(255,255,255,0.06)" style={{ marginLeft: -20 }} />
          </View>
        }
      />

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Tela inteira com gradiente
  container: {
    flex: 1,
    paddingTop: 56,
  },

  // Linha do cabecalho (titulo + icone)
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 28,
  },

  // Lado esquerdo do cabecalho (botao voltar + titulo)
  cabecalhoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Seta de voltar
  botaoVoltar: {
    padding: 4,
  },

  // Titulo "Selecionar Obra"
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },

  // Linha verde decorativa abaixo do titulo
  linhaDecorada: {
    width: 60,
    height: 3,
    backgroundColor: '#2ECC40',
    borderRadius: 2,
  },

  // Padding interno da lista
  lista: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  // Card de obra com fundo semi-transparente e borda sutil
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

  // Circulo ao redor do icone do predio
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

  // Agrupa nome e endereco
  textoContainer: {
    flex: 1,
  },

  // Nome da obra
  nome: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Endereco da obra, menor e mais discreto
  endereco: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
  },

  // Estado vazio: nenhuma obra vinculada
  vazioContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },

  vazioTexto: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },

  // Silhueta decorativa no rodape
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 16,
  },
});
