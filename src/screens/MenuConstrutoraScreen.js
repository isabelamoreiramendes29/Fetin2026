// Tela Menu da Construtora — exibida apos o login como Construtora
// Mostra as 4 opcoes principais: Enviar Caminhao, Rastrear, Historico de Entregas e Monitorar Temperatura
// Copia da estrutura visual da MenuMestreScreen — muda apenas titulo, opcoes e icone do cabecalho

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

export default function MenuConstrutoraScreen({ navigation, route }) {
  // Dados da obra selecionada na tela anterior (SelecionarObraConstrutora)
  const { obraId, obraNome } = route.params || {};

  // ── ITENS DO MENU ──
  // Cada item define: icone, familia do icone, texto exibido e a tela de destino
  const itensMenu = [
    {
      id: 'enviar-caminhao',
      icone: 'truck',
      tipoIcone: 'MaterialCommunityIcons',
      texto: 'Enviar Caminhão',
      tela: 'EnviarCaminhao',
    },
    {
      id: 'rastrear-caminhoes',
      icone: 'location-outline',
      tipoIcone: 'Ionicons',
      texto: 'Rastrear Caminhões',
      tela: 'RastrearCaminhoes',
    },
    {
      id: 'historico-entregas',
      icone: 'chart-line',
      tipoIcone: 'MaterialCommunityIcons',
      texto: 'Histórico de Entregas',
      tela: 'HistoricoEntregas',
    },
    {
      id: 'monitorar-temperatura',
      icone: 'thermometer-outline',
      tipoIcone: 'Ionicons',
      texto: 'Monitorar Temperatura',
      tela: 'MonitorarTemperatura',
    },
  ];

  // Navega para a tela do item clicado
  function handleNavegar(tela) {
    navigation.navigate(tela);
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

          {/* Botao de voltar circular — fundo azul + borda verde — volta para Selecionar Obra */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.navigate('SelecionarObraConstrutora')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Titulo MENU CONSTRUTORA + nome da obra + linha decorativa verde */}
          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>MENU CONSTRUTORA</Text>
            {obraNome && (
              <Text style={styles.nomeObra}>{obraNome}</Text>
            )}
            <View style={styles.linhaDecorada} />
          </View>

          {/* Icone de caminhao a direita do titulo */}
          <MaterialCommunityIcons
            name="truck"
            size={38}
            color="rgba(255,255,255,0.65)"
            style={styles.iconeCabecalho}
          />
        </View>

        {/* ── CARDS DO MENU ── */}
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

  // Nome da obra selecionada, exibido abaixo do titulo
  nomeObra: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    textAlign: 'center',
  },

  // Linha verde decorativa abaixo do titulo
  linhaDecorada: {
    width: 50,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },

  // Agrupa os 4 cards centralizados
  cardsContainer: {
    width: width * 0.85,
    alignSelf: 'center',
    marginTop: 32,
  },

});
