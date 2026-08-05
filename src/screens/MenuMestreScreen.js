// Tela Menu do Mestre de Obra — exibida apos o usuario selecionar uma obra
// Mostra as 4 opcoes principais: Temperatura, Historico, Financeiro e Localizacao
// Recebe obraId e obraNome via route.params da tela SelecionarObra
// Renomeada de MenuObraScreen para MenuMestreScreen

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

export default function MenuMestreScreen({ navigation, route }) {
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
      // So acompanha: a betoneira e da construtora, e e ela quem controla
      // a viagem. O mestre le a posicao publicada por ela.
      params: { somenteLeitura: true },
    },
    {
      id: 'mapa-concretagem',
      icone: 'map-marker-radius',
      tipoIcone: 'MaterialCommunityIcons',
      texto: 'Mapa de concretagem',
      tela: 'MapaConcretagem',
      // So consulta: quem cadastra a planta, marca as areas e lanca o
      // resultado do laboratorio e a construtora, nao o mestre
      params: { somenteLeitura: true },
    },
  ];

  // Navega para a tela do item clicado, sempre passando obraId e obraNome.
  // params permite que um item leve dados extras (ver mapa-concretagem).
  function handleNavegar(tela, params) {
    navigation.navigate(tela, { obraId, obraNome, ...params });
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

          {/* Titulo MENU MESTRE + linha decorativa verde */}
          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>MENU MESTRE</Text>
            <View style={styles.linhaDecorada} />
          </View>

          {/* Icone de parede/construcao a direita do titulo */}
          <MaterialCommunityIcons
            name="wall"
            size={38}
            color="rgba(255,255,255,0.65)"
            style={styles.iconeCabecalho}
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
              onPress={() => handleNavegar(item.tela, item.params)}
            />
          ))}
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

  // Linha do cabecalho: titulo sempre centralizado no meio da tela
  cabecalho: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  // Botao voltar — circulo azul com borda verde sutil
  // Posicionado em absolute pra nao empurrar o titulo do centro
  botaoVoltar: {
    position: 'absolute',
    top: 0,
    left: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icone a direita do cabecalho — tambem em absolute
  iconeCabecalho: {
    position: 'absolute',
    top: 0,
    right: 24,
    zIndex: 10,
  },

  // Agrupa titulo e linha decorativa, centralizado
  tituloContainer: {
    alignItems: 'center',
  },

  // Titulo — branco, bold, centralizado
  // paddingHorizontal reserva espaco fixo pra nunca ficar embaixo do botao/icone
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    alignSelf: 'center',
    paddingHorizontal: 60,
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

});
