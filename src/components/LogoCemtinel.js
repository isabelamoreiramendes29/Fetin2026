// Logo do Cemtinel desenhada em vetor, para uso sobre o fundo azul do app
//
// Por que nao e uma imagem: o PNG da logo tem fundo branco, e sobre o gradiente
// azul isso vira um quadrado branco no meio da tela. Remover o fundo do arquivo
// e trabalhoso — o automatico come os realces claros do silo e deixa branco
// dentro das letras. Desenhada aqui, nao existe fundo para remover.
//
// E uma versao simplificada da logo completa: mantem os tres pinos, que sao a
// ideia central (agua, temperatura e sensor sendo monitorados), e dispensa o
// silo, que a esse tamanho viraria uma mancha cinza.
//
// As cores mudam de proposito em relacao a logo impressa: sobre azul, o "tinel"
// azul e o pino azul sumiriam no fundo, entao vao para tons que separam.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Rect } from 'react-native-svg';

// Cores dos tres pinos, claras o bastante para separar do fundo azul
const AGUA        = '#29A8E0';
const TEMPERATURA = '#E8621A';
const SENSOR      = '#5CB825';

const ONDA = 'rgba(255,255,255,0.35)';

// Um pino: circulo com cauda apontada para baixo, como marcador de mapa
function Pino({ cx, cy, cor, children }) {
  const r = 27;

  return (
    <G>
      <Path
        d={`M ${cx - 13} ${cy + 20} L ${cx} ${cy + 52} L ${cx + 13} ${cy + 20} Z`}
        fill={cor}
      />
      <Circle cx={cx} cy={cy} r={r} fill={cor} />
      {children}
    </G>
  );
}

// Ondas de sinal saindo dos dois lados do pino
function Ondas({ cx, cy }) {
  return (
    <G fill="none" stroke={ONDA} strokeLinecap="round">
      <Path d={`M ${cx - 36} ${cy - 17} A 40 40 0 0 0 ${cx - 36} ${cy + 17}`} strokeWidth={4} />
      <Path d={`M ${cx - 47} ${cy - 25} A 56 56 0 0 0 ${cx - 47} ${cy + 25}`} strokeWidth={3.5} />
      <Path d={`M ${cx + 36} ${cy - 17} A 40 40 0 0 1 ${cx + 36} ${cy + 17}`} strokeWidth={4} />
      <Path d={`M ${cx + 47} ${cy - 25} A 56 56 0 0 1 ${cx + 47} ${cy + 25}`} strokeWidth={3.5} />
    </G>
  );
}

export default function LogoCemtinel({ largura = 260, mostrarSlogan = true }) {
  // O SVG mantem a proporcao do viewBox; o texto abaixo escala junto
  const escala = largura / 320;

  return (
    <View style={{ width: largura, alignItems: 'center' }}>

      <Svg width={largura} height={largura * (150 / 320)} viewBox="0 0 320 150">

        {/* Ondas atras dos pinos */}
        <Ondas cx={68}  cy={86} />
        <Ondas cx={160} cy={58} />
        <Ondas cx={252} cy={86} />

        {/* ── AGUA ── */}
        <Pino cx={68} cy={86} cor={AGUA}>
          <Path
            d="M68 70 C 78 82, 82 88, 82 94 A 14 14 0 0 1 54 94 C 54 88, 58 82, 68 70 Z"
            fill="#FFFFFF"
          />
        </Pino>

        {/* ── TEMPERATURA ── */}
        <Pino cx={160} cy={58} cor={TEMPERATURA}>
          <Path d="M160 42 L160 62" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" />
          <Circle cx={160} cy={70} r={9} fill="#FFFFFF" />
        </Pino>

        {/* ── SENSOR ── */}
        <Pino cx={252} cy={86} cor={SENSOR}>
          <Rect
            x={238} y={73} width={28} height={26} rx={4}
            fill="none" stroke="#FFFFFF" strokeWidth={4}
          />
          <Path
            d="M242 86 L247 86 L250 79 L254 93 L257 86 L262 86"
            fill="none" stroke="#FFFFFF" strokeWidth={3.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        </Pino>

      </Svg>

      {/* ── NOME ── */}
      {/* Texto de verdade, nao imagem: fica nitido em qualquer densidade de tela */}
      <View style={styles.nomeLinha}>
        <Text style={[styles.nome, styles.nomeCem, { fontSize: 54 * escala }]}>cem</Text>
        <Text style={[styles.nome, styles.nomeTinel, { fontSize: 54 * escala }]}>tinel</Text>
      </View>

      {mostrarSlogan && (
        <Text style={[styles.slogan, { fontSize: 9.5 * escala }]}>
          MONITORANDO A QUALIDADE DO CIMENTO
        </Text>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  nomeLinha: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },

  nome: {
    fontWeight: 'bold',
    letterSpacing: -1,
  },

  // Na logo impressa o "cem" e cinza-escuro; sobre o azul, branco
  nomeCem: { color: '#FFFFFF' },

  // Na logo impressa o "tinel" e azul, que sumiria neste fundo — vai no verde
  // que o app ja usa como cor de acao
  nomeTinel: { color: '#2ECC40' },

  slogan: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    letterSpacing: 1.6,
    marginTop: 8,
    textAlign: 'center',
  },
});
