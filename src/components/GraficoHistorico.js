// Componente do grafico de linha de temperatura — horario comercial (08:00-18:00)
// Renderiza UMA linha verde com pontos visiveis
// Props:
//   dados — array de { hora, temp }

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width: SCREEN_W } = Dimensions.get('window');

// Largura do grafico: tela - margem do card (16x2) - padding do card (14x2) - folga
const CHART_W = SCREEN_W - 64;
const CHART_H = 200;

// ── CONFIGURACAO VISUAL DO GRAFICO ──
// Linha unica, verde vibrante, pontos grandes, fundo azul royal
const CHART_CONFIG = {
  backgroundGradientFrom: '#1E3A8A',
  backgroundGradientTo: '#1E40AF',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,          // verde para a linha
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.9})`, // labels brancos
  strokeWidth: 3,
  propsForDots: {
    r: '6',            // pontos grandes e visiveis
    strokeWidth: '2',
    stroke: '#22C55E',
    fill: '#22C55E',
  },
  propsForLabels: {
    fontSize: 10,      // ligeiramente menor que 12 para caber os 11 labels sem sobreposicao
    fontWeight: 'bold',
  },
  propsForBackgroundLines: {
    strokeDasharray: '',   // linhas continuas (sem tracejado)
    stroke: 'rgba(255,255,255,0.1)',
    strokeWidth: '1',
  },
  yAxisSuffix: '°',
};

// Quantidade maxima de rotulos no eixo X sem que eles se sobreponham
const MAX_ROTULOS = 6;

export default function GraficoHistorico({ dados }) {
  if (!dados || dados.length === 0) return null;

  // Mostra no maximo MAX_ROTULOS rotulos, independente de quantos pontos
  // existam: o numero de leituras varia conforme o sensor e o agrupamento
  // (ver agruparLeituras em services/historico.js)
  const passoRotulo = Math.ceil(dados.length / MAX_ROTULOS);

  // Estrutura de dados: dataset unico com todas as temperaturas
  const data = {
    labels: dados.map((d, i) => (i % passoRotulo === 0 ? d.hora : '')),
    datasets: [
      {
        data: dados.map((d) => d.temp),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // verde vibrante
        strokeWidth: 3,
      },
    ],
  };

  return (
    <View style={styles.container}>

      {/* Titulo interno do grafico */}
      <Text style={styles.titulo}>TEMPERATURA</Text>

      {/* Grafico de linha unica com curvas bezier e pontos visiveis */}
      <LineChart
        data={data}
        width={CHART_W}
        height={CHART_H}
        chartConfig={CHART_CONFIG}
        bezier
        withShadow={false}
        withInnerLines={true}
        withOuterLines={false}
        fromZero={false}
        segments={4}
        style={styles.grafico}
      />

      {/* Label do eixo X */}
      <Text style={styles.labelX}>HORA</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },

  titulo: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },

  grafico: {
    borderRadius: 10,
  },

  labelX: {
    color: 'rgba(200, 230, 255, 0.75)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 6,
  },
});
