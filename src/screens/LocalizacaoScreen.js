// Tela GPS / Localização — mapa ilustrativo com caminhão animado
// Fluxo: MenuObra → Localizacao (esta tela)
// Sem comunicação real — LoRa em integração
// Caminhão se move ao longo de uma rota simulada via react-native-svg
// Recebe obraNome via route.params

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../styles/colors';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// ROTA — 6 pontos no espaço SVG (ViewBox 350×280)
// Usados tanto para o desenho do path quanto para mover o caminhão
// ─────────────────────────────────────────────────────────────
const ROTA_PONTOS = [
  { x: 60,  y: 35  },  // 0%   — Depósito
  { x: 95,  y: 80  },  // 20%
  { x: 155, y: 115 },  // 40%
  { x: 205, y: 158 },  // 60%
  { x: 255, y: 200 },  // 80%
  { x: 295, y: 248 },  // 100% — Obra
];

// Path bezier suave que passa pelos ROTA_PONTOS
const ROTA_PATH =
  'M 60 35 C 75 55, 85 70, 95 80 S 130 100, 155 115 ' +
  'S 190 145, 205 158 S 250 190, 255 200 S 285 235, 295 248';

const SVG_W          = 350;
const SVG_H          = 280;
const DISTANCIA_TOTAL = 12.5; // km fictício
const TEMPO_TOTAL     = 25;   // min fictício

// ─────────────────────────────────────────────────────────────
// Interpola a posição XY do caminhão ao longo de ROTA_PONTOS
// pct: 0 a 100
// ─────────────────────────────────────────────────────────────
function calcularPosicaoTruck(pct) {
  const t   = pct / 100;
  const n   = ROTA_PONTOS.length - 1;
  const idx = Math.min(Math.floor(t * n), n - 1);
  const f   = t * n - idx;
  const p1  = ROTA_PONTOS[idx];
  const p2  = ROTA_PONTOS[Math.min(idx + 1, n)];
  return {
    x: p1.x + (p2.x - p1.x) * f,
    y: p1.y + (p2.y - p1.y) * f,
  };
}

// Status textual + cor + ícone conforme posição do caminhão
function getStatus(pos) {
  if (pos === 0)   return { texto: 'Aguardando saída',   cor: '#FACC15', icone: 'time-outline'       };
  if (pos >= 100)  return { texto: 'Chegou ao destino!', cor: '#22C55E', icone: 'checkmark-circle'   };
  return                  { texto: 'Em trânsito',        cor: '#22C55E', icone: 'navigate-outline'   };
}

// ── COMPONENTE PRINCIPAL ──
export default function LocalizacaoScreen({ navigation, route }) {
  const { obraNome = 'Obra 1' } = route.params || {};

  const [posicaoCaminhao,    setPosicaoCaminhao]    = useState(0);
  const [simulandoMovimento, setSimulandoMovimento] = useState(false);

  // Avança 2% a cada 500ms enquanto simulandoMovimento = true
  useEffect(() => {
    if (!simulandoMovimento) return;

    const interval = setInterval(() => {
      setPosicaoCaminhao((pos) => {
        if (pos >= 100) {
          setSimulandoMovimento(false);
          return 100;
        }
        return pos + 2;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [simulandoMovimento]);

  // ── DERIVADOS ──
  const posicaoTruck      = calcularPosicaoTruck(posicaoCaminhao);
  const status            = getStatus(posicaoCaminhao);
  const distanciaRestante = (DISTANCIA_TOTAL * (100 - posicaoCaminhao) / 100).toFixed(1);
  const tempoRestante     = Math.round(TEMPO_TOTAL * (100 - posicaoCaminhao) / 100);

  // Grid de informações do card
  const infoItems = [
    { icone: 'location-outline',   label: 'ORIGEM',    valor: 'Depósito Central'       },
    { icone: 'flag-outline',        label: 'DESTINO',   valor: obraNome                 },
    { icone: 'speedometer-outline', label: 'DISTÂNCIA', valor: `${distanciaRestante} km`},
    { icone: 'time-outline',        label: 'ETA',       valor: `${tempoRestante} min`   },
    { icone: 'car-outline',         label: 'PLACA',     valor: 'ABC-1234'               },
    { icone: 'person-outline',      label: 'MOTORISTA', valor: 'João Silva'             },
  ];

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

        {/* ── CABEÇALHO ── */}
        <View style={styles.cabecalho}>

          {/* Botão voltar circular */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Título + linha decorativa */}
          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>GPS</Text>
            <View style={styles.linhaDecorada} />
          </View>

          {/* Ícone de navegação — quadrado com borda */}
          <View style={styles.iconeQuadrado}>
            <Ionicons name="navigate-outline" size={22} color="#22C55E" />
          </View>

        </View>

        {/* Nome da obra */}
        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── CARD MAPA SVG ── */}
        <View style={[styles.card, styles.cardMapa]}>

          <Svg
            width="100%"
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          >
            {/* ── FUNDO DO MAPA ── */}
            <Rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#0D2137" rx="10" />

            {/* ── BLOCOS DE QUADRA (cidade estilizada) ── */}
            <Rect x="15" y="10" width="45" height="30" rx="3" fill="#112845" />
            <Rect x="15" y="55" width="30" height="40" rx="3" fill="#112845" />
            <Rect x="105" y="45" width="35" height="25" rx="3" fill="#112845" />
            <Rect x="170" y="90" width="40" height="30" rx="3" fill="#112845" />
            <Rect x="230" y="130" width="35" height="30" rx="3" fill="#112845" />
            <Rect x="280" y="170" width="30" height="25" rx="3" fill="#112845" />
            <Rect x="75"  y="130" width="40" height="35" rx="3" fill="#112845" />
            <Rect x="130" y="175" width="45" height="30" rx="3" fill="#112845" />
            <Rect x="30"  y="180" width="40" height="30" rx="3" fill="#112845" />
            <Rect x="200" y="210" width="35" height="25" rx="3" fill="#112845" />
            <Rect x="310" y="90"  width="30" height="35" rx="3" fill="#112845" />
            <Rect x="310" y="210" width="30" height="35" rx="3" fill="#112845" />

            {/* ── RUAS HORIZONTAIS ── */}
            <Line x1="0" y1="100" x2={SVG_W} y2="100" stroke="#1A3A5C" strokeWidth="7" />
            <Line x1="0" y1="170" x2={SVG_W} y2="170" stroke="#1A3A5C" strokeWidth="6" />
            <Line x1="0" y1="230" x2={SVG_W} y2="230" stroke="#1A3A5C" strokeWidth="5" />

            {/* ── RUAS VERTICAIS ── */}
            <Line x1="70"  y1="0" x2="70"  y2={SVG_H} stroke="#1A3A5C" strokeWidth="5" />
            <Line x1="160" y1="0" x2="160" y2={SVG_H} stroke="#1A3A5C" strokeWidth="5" />
            <Line x1="250" y1="0" x2="250" y2={SVG_H} stroke="#1A3A5C" strokeWidth="5" />

            {/* ── ROTA — glow suave ── */}
            <Path
              d={ROTA_PATH}
              stroke="rgba(34, 197, 94, 0.18)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
            />

            {/* ── ROTA — linha principal verde ── */}
            <Path
              d={ROTA_PATH}
              stroke="#22C55E"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* ── WAYPOINTS intermediários ── */}
            {ROTA_PONTOS.slice(1, 5).map((pt, i) => (
              <Circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#1E3A5C"
                stroke="#2D5A7A"
                strokeWidth="1.5"
              />
            ))}

            {/* ── PONTO ORIGEM (azul) ── */}
            <Circle cx="60" cy="35" r="12" fill="#1D4ED8" stroke="#fff" strokeWidth="2" />
            <Circle cx="60" cy="35" r="5"  fill="#fff" />

            {/* ── PONTO DESTINO (verde) ── */}
            <Circle cx="295" cy="248" r="12" fill="#16A34A" stroke="#fff" strokeWidth="2" />
            <Circle cx="295" cy="248" r="5"  fill="#fff" />

            {/* ── LABEL ORIGEM ── */}
            <Rect x="6" y="12" width="48" height="16" rx="4" fill="rgba(29,78,216,0.9)" />
            <SvgText
              x="30" y="23"
              textAnchor="middle"
              fill="#fff"
              fontSize="8"
              fontWeight="bold"
            >
              Depósito
            </SvgText>

            {/* ── LABEL DESTINO ── */}
            <Rect x="261" y="254" width="68" height="16" rx="4" fill="rgba(22,163,74,0.9)" />
            <SvgText
              x="295" y="265"
              textAnchor="middle"
              fill="#fff"
              fontSize="8"
              fontWeight="bold"
            >
              {obraNome.length > 10 ? obraNome.slice(0, 10) + '…' : obraNome}
            </SvgText>

            {/* ── BADGE PORCENTAGEM (canto superior direito do mapa) ── */}
            <Rect
              x={SVG_W - 52} y="8"
              width="44" height="20"
              rx="10"
              fill="rgba(0,0,0,0.45)"
              stroke="#22C55E"
              strokeWidth="1"
            />
            <SvgText
              x={SVG_W - 30} y="21"
              textAnchor="middle"
              fill="#22C55E"
              fontSize="10"
              fontWeight="bold"
            >
              {posicaoCaminhao}%
            </SvgText>

            {/* ── CAMINHÃO ── */}
            {/* Centrado em (posicaoTruck.x, posicaoTruck.y) */}
            <G transform={`translate(${posicaoTruck.x - 13}, ${posicaoTruck.y - 9})`}>
              {/* Aura/glow do caminhão */}
              <Circle cx="13" cy="8" r="15" fill="rgba(34, 197, 94, 0.12)" />
              {/* Carroceria */}
              <Rect x="0" y="3" width="18" height="11" rx="2" fill={status.cor} />
              {/* Cabine */}
              <Rect x="13" y="0" width="9" height="10" rx="2" fill="#15803D" />
              {/* Para-brisa */}
              <Rect x="14" y="1" width="6" height="5" rx="1" fill="rgba(255,255,255,0.45)" />
              {/* Rodas */}
              <Circle cx="4"  cy="14" r="3" fill="#1E3A8A" stroke="#fff" strokeWidth="1" />
              <Circle cx="15" cy="14" r="3" fill="#1E3A8A" stroke="#fff" strokeWidth="1" />
            </G>

          </Svg>

        </View>

        {/* ── CARD DE INFORMAÇÕES ── */}
        <View style={[styles.card, styles.cardInfo]}>

          {/* Status dinâmico */}
          <View style={styles.statusRow}>
            <Ionicons name={status.icone} size={18} color={status.cor} />
            <Text style={[styles.statusTxt, { color: status.cor }]}>
              {'  '}{status.texto}
            </Text>
          </View>

          <View style={styles.separador} />

          {/* Grid 2 colunas com as 6 informações */}
          <View style={styles.infoGrid}>
            {infoItems.map((item) => (
              <View key={item.label} style={styles.infoItem}>
                <Ionicons name={item.icone} size={14} color="rgba(255,255,255,0.45)" />
                <View style={styles.infoTextos}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValor} numberOfLines={1}>{item.valor}</Text>
                </View>
              </View>
            ))}
          </View>

        </View>

        {/* ── BOTÕES DE CONTROLE ── */}
        <View style={styles.botoesControle}>

          {/* ▶️ Iniciar */}
          <TouchableOpacity
            style={[styles.botaoControle, styles.botaoIniciar]}
            onPress={() => {
              if (posicaoCaminhao >= 100) return;
              setSimulandoMovimento(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={15} color="#fff" />
            <Text style={styles.botaoControleTxt}>  Iniciar</Text>
          </TouchableOpacity>

          {/* ⏸️ Pausar */}
          <TouchableOpacity
            style={[styles.botaoControle, styles.botaoPausar]}
            onPress={() => setSimulandoMovimento(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={15} color="#fff" />
            <Text style={styles.botaoControleTxt}>  Pausar</Text>
          </TouchableOpacity>

          {/* 🔄 Resetar */}
          <TouchableOpacity
            style={[styles.botaoControle, styles.botaoResetar]}
            onPress={() => {
              setSimulandoMovimento(false);
              setPosicaoCaminhao(0);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.botaoControleTxt}>  Resetar</Text>
          </TouchableOpacity>

        </View>


        <Text style={styles.notaDemonstracao}>
          * Mapa simulado — LoRa em integração
        </Text>

      </ScrollView>
    </LinearGradient>
  );
}

// ── ESTILOS ──
const styles = StyleSheet.create({

  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 56,
    paddingBottom: 24,
  },

  // ── CABEÇALHO ──
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 4,
  },

  botaoVoltar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  tituloContainer: { alignItems: 'center' },

  titulo: {
    fontSize: 36, fontWeight: 'bold', color: '#fff',
    letterSpacing: 2, marginBottom: 5,
  },

  linhaDecorada: {
    width: 44, height: 3, backgroundColor: '#22C55E', borderRadius: 2,
  },

  iconeQuadrado: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(26, 86, 219, 0.5)',
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  nomeObra: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13,
    textAlign: 'center', marginBottom: 16, letterSpacing: 0.4,
  },

  // ── BASE CARD ──
  card: {
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  // ── CARD MAPA ──
  cardMapa: {
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',   // garante que o SVG respeita borderRadius
    padding: 0,
  },

  // ── CARD INFO ──
  cardInfo: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  statusTxt: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  separador: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  infoItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingRight: 8,
    gap: 6,
  },

  infoTextos: { flex: 1 },

  infoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 1,
  },

  infoValor: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── BOTÕES DE CONTROLE ──
  botoesControle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  botaoControle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },

  botaoIniciar: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22C55E',
  },

  botaoPausar: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    borderColor: '#FACC15',
  },

  botaoResetar: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },

  botaoControleTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },


  notaDemonstracao: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11, textAlign: 'center',
    fontStyle: 'italic', marginBottom: 4,
  },
});
