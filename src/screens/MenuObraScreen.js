// Tela Menu da Obra — exibida apos o usuario selecionar uma obra
// Mostra as 4 opcoes principais: Temperatura, Historico, Financeiro e Localizacao
// Recebe obraId e obraNome via route.params da tela SelecionarObra

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import CardMenu from '../components/CardMenu';
import { colors } from '../styles/colors';

const { width } = Dimensions.get('window');

export default function MenuObraScreen({ navigation, route }) {
  // Recupera os dados da obra passados pela SelecionarObraScreen
  const { obraId, obraNome } = route.params;

  // ── ITENS DO MENU ──
  // Cada item define: icone, familia do icone, texto exibido e a tela de destino
  const itensMenu = [
    {
      id: 'temperatura',
      icone: 'thermometer-outline',
      tipoIcone: 'Ionicons',
      texto: 'Temperatura e Volume',
      tela: 'Temperatura',
    },
    {
      id: 'historico',
      icone: 'chart-line',
      tipoIcone: 'MaterialCommunityIcons',
      texto: 'Histórico de temperatura',
      tela: 'HistoricoTemperatura',
    },
    {
      id: 'financeiro',
      icone: 'currency-usd',
      tipoIcone: 'MaterialCommunityIcons',
      texto: 'Financeiro',
      tela: 'Financeiro',
    },
    {
      id: 'localizacao',
      icone: 'location-outline',
      tipoIcone: 'Ionicons',
      texto: 'Localização',
      tela: 'Localizacao',
    },
  ];

  // Navega para a tela do item clicado, sempre passando obraId e obraNome
  function handleNavegar(tela) {
    navigation.navigate(tela, { obraId, obraNome });
  }

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── CABECALHO ── */}
        <View style={styles.cabecalho}>

          {/* Botao de voltar circular — fundo azul + borda verde */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Titulo MENU + linha decorativa verde */}
          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>MENU</Text>
            <View style={styles.linhaDecorada} />
          </View>

          {/* Icone de parede/construcao a direita do titulo */}
          <MaterialCommunityIcons
            name="wall"
            size={38}
            color="rgba(255,255,255,0.65)"
          />
        </View>

        {/* ── NOME DA OBRA SELECIONADA ── */}
        {/* Exibe o nome da obra para o usuario saber qual esta visualizando */}
        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── CARDS DO MENU ── */}
        {/*
          PONTINHOS DECORATIVOS NAS LATERAIS:
          Para adicionar pontinhos decorativos (estilo grade de pontos),
          crie dois componentes <View> com position: 'absolute',
          esquerda e direita, e use um grid de <View> pequenos (3x3 ou 4x4)
          com cor rgba(255,255,255,0.08). Adicionar aqui depois.
        */}
        <View style={styles.cardsContainer}>
          {itensMenu.map((item) => (
            <CardMenu
              key={item.id}
              icone={item.icone}
              tipoIcone={item.tipoIcone}
              texto={item.texto}
              onPress={() => handleNavegar(item.tela)}
            />
          ))}
        </View>

        {/* ── SILHUETA DECORATIVA DA FABRICA (rodape) ── */}
        <View style={styles.rodape}>
          <Ionicons name="business" size={90} color="rgba(255,255,255,0.08)" />
          <Ionicons name="business" size={70} color="rgba(255,255,255,0.06)" style={{ marginLeft: -20 }} />
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Tela inteira com gradiente
  container: {
    flex: 1,
  },

  // Conteudo interno do ScrollView
  scrollContent: {
    flexGrow: 1,
    paddingTop: 56,
    paddingBottom: 24,
  },

  // Linha do cabecalho: botao voltar | titulo centralizado | icone
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },

  // Botao voltar — circulo azul com borda verde sutil
  botaoVoltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Agrupa titulo e linha decorativa, centralizado
  tituloContainer: {
    alignItems: 'center',
  },

  // Titulo "MENU" — branco, bold, grande
  titulo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 6,
  },

  // Linha verde decorativa abaixo do titulo
  linhaDecorada: {
    width: 50,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },

  // Nome da obra selecionada — exibido abaixo do cabecalho
  nomeObra: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
    letterSpacing: 0.5,
  },

  // Agrupa os 4 cards centralizados
  cardsContainer: {
    width: width * 0.85,
    alignSelf: 'center',
  },

  // Silhueta decorativa no rodape
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
  },
});
