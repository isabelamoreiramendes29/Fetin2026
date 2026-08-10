// Componente do velocimetro semicircular de temperatura
// Usa react-native-svg para desenhar o arco com 5 zonas coloridas e ponteiro
// Props:
//   temperatura  — numero entre 5 e 40 (°C)
//   corZona      — string de cor CSS da zona atual (usada no pivot do ponteiro)
//
// A escala vai de 5 a 40 °C porque e essa a faixa do concreto fresco. A versao
// anterior ia de 50 a 100 °C e chamava 85 °C de "ideal" — concreto a essa
// temperatura estaria arruinado, com pega acelerada e perda de resistencia.

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ZONAS, TEMP_MIN_ESCALA, TEMP_MAX_ESCALA } from '../config/temperatura';

// ── DIMENSOES DO CANVAS SVG ──
const W  = 380;   // largura do viewBox
const H  = 195;   // altura do viewBox
const cx = 190;   // centro horizontal do semicirculo
const cy = 175;   // centro vertical (ponto onde os dois lados do arco se encontram)

// ── RAIOS ──
const R_BG     = 158;  // disco de fundo escuro (ligeiramente maior que o arco)
const R_OUTER  = 145;  // borda externa da faixa colorida
const R_INNER  = 93;   // borda interna (define a espessura da faixa)
const R_NEEDLE = 115;  // comprimento do ponteiro ate a ponta
const R_LABEL  = 161;  // raio onde ficam os textos das zonas (acima da faixa)

// As zonas e os limites da escala vem de config/temperatura.js — mesma fonte
// que a tela de Temperatura, o Historico e os alertas usam
const TEMP_MIN = TEMP_MIN_ESCALA;
const TEMP_MAX = TEMP_MAX_ESCALA;

// ── FUNCOES AUXILIARES ──

// Converte temperatura para angulo matematico (anti-horario a partir do eixo positivo X)
// 5°C = 180° (esquerda), 22,5°C = 90° (topo), 40°C = 0° (direita)
function tempParaAngulo(temp) {
  return 180 - ((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 180;
}

// Converte angulo + raio para ponto SVG {x, y}
// Nota: em SVG o eixo Y e invertido, por isso subtraimos em vez de somar
function pt(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  };
}

// Formata numero para string com 2 casas decimais (necessario para paths SVG precisos)
function f(n) {
  return n.toFixed(2);
}

// Constroi o path SVG de uma fatia do arco (zona colorida)
// Forma: arco externo (sentido horario) + linha + arco interno (anti-horario)
function buildZonePath(minTemp, maxTemp) {
  const a1 = tempParaAngulo(minTemp); // angulo da borda esquerda (menor temperatura)
  const a2 = tempParaAngulo(maxTemp); // angulo da borda direita (maior temperatura)

  const outerStart = pt(a1, R_OUTER); // ponto de inicio no arco externo
  const outerEnd   = pt(a2, R_OUTER); // ponto de fim no arco externo
  const innerEnd   = pt(a2, R_INNER); // ponto de fim no arco interno
  const innerStart = pt(a1, R_INNER); // ponto de inicio no arco interno

  // Arco externo: sweep=1 (horario em SVG), large-arc=0 (arco menor, 36°)
  // Arco interno: sweep=0 (anti-horario em SVG), voltando ao ponto inicial
  return [
    `M${f(outerStart.x)} ${f(outerStart.y)}`,
    `A${R_OUTER} ${R_OUTER} 0 0 1 ${f(outerEnd.x)} ${f(outerEnd.y)}`,
    `L${f(innerEnd.x)} ${f(innerEnd.y)}`,
    `A${R_INNER} ${R_INNER} 0 0 0 ${f(innerStart.x)} ${f(innerStart.y)}`,
    'Z',
  ].join(' ');
}

// ── COMPONENTE ──
export default function VelocimetroTemperatura({ temperatura = 22, corZona = '#22C55E' }) {
  // Garante que a temperatura fica dentro do intervalo desenhado
  const tempClamp = Math.max(TEMP_MIN, Math.min(TEMP_MAX, temperatura));

  // ── CALCULO DO PONTEIRO ──
  // O ponteiro e um triangulo fino: base larga no centro, ponta na temperatura
  const needleDeg = tempParaAngulo(tempClamp);
  const needleRad = (needleDeg * Math.PI) / 180;
  const perpRad   = ((needleDeg + 90) * Math.PI) / 180; // perpendicular ao ponteiro
  const BASE_W    = 5; // meia largura da base do triangulo

  const tip = {
    x: cx + R_NEEDLE * Math.cos(needleRad),
    y: cy - R_NEEDLE * Math.sin(needleRad),
  };
  const base1 = {
    x: cx + BASE_W * Math.cos(perpRad),
    y: cy - BASE_W * Math.sin(perpRad),
  };
  const base2 = {
    x: cx - BASE_W * Math.cos(perpRad),
    y: cy + BASE_W * Math.sin(perpRad),
  };

  return (
    // container com aspect ratio fixo — garante proporcao correta independente da largura da tela
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >

        {/* ── DISCO DE FUNDO ESCURO ── */}
        {/* Circulo completo — a metade de baixo fica fora do viewBox (cortada) */}
        <Circle cx={f(cx)} cy={f(cy)} r={R_BG} fill="#09163A" />

        {/* Anel externo para dar profundidade e separar do fundo da tela */}
        <Circle
          cx={f(cx)} cy={f(cy)} r={R_BG}
          fill="none"
          stroke="#1E3A80"
          strokeWidth="4"
        />

        {/* ── ZONAS COLORIDAS DO ARCO ── */}
        {ZONAS.map((z) => (
          <Path key={z.nome} d={buildZonePath(z.min, z.max)} fill={z.cor} />
        ))}

        {/* ── LINHAS DIVISORAS ENTRE AS ZONAS ── */}
        {/* Derivadas das proprias zonas: o limite superior de cada uma, menos
            a ultima, que termina na borda do arco */}
        {ZONAS.slice(0, -1).map((z) => z.max).map((temp) => {
          const a  = tempParaAngulo(temp);
          const po = pt(a, R_OUTER + 1);
          const pi = pt(a, R_INNER - 1);
          return (
            <Line
              key={temp}
              x1={f(po.x)} y1={f(po.y)}
              x2={f(pi.x)} y2={f(pi.y)}
              stroke="#09163A"
              strokeWidth="3.5"
            />
          );
        })}

        {/* ── LABELS DAS ZONAS ── */}
        {/* Posicionados no angulo central de cada zona, levemente acima do arco */}
        {ZONAS.map((z) => {
          const midAngle = (tempParaAngulo(z.min) + tempParaAngulo(z.max)) / 2;
          const pos = pt(midAngle, R_LABEL);
          return (
            <SvgText
              key={z.nome + '_lbl'}
              x={f(pos.x)}
              y={f(pos.y + 3.5)} // +3.5 para centralizar visualmente (baseline vs centro)
              fill={z.cor}
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              {z.nome}
            </SvgText>
          );
        })}

        {/* ── PONTEIRO (triangulo fino branco) ── */}
        <Path
          d={`M${f(base1.x)} ${f(base1.y)} L${f(tip.x)} ${f(tip.y)} L${f(base2.x)} ${f(base2.y)}Z`}
          fill="#ffffff"
        />

        {/* ── CIRCULO CENTRAL (pivot / rolamento do ponteiro) ── */}
        {/* Circulo externo: fundo escuro com borda na cor da zona atual */}
        <Circle
          cx={f(cx)} cy={f(cy)} r="15"
          fill="#09163A"
          stroke={corZona}
          strokeWidth="2.5"
        />
        {/* Circulo interno: bolinha colorida no centro */}
        <Circle cx={f(cx)} cy={f(cy)} r="7" fill={corZona} />

      </Svg>
    </View>
  );
}
