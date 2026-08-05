// Planta interativa — a foto do projeto com as regioes de concretagem por cima
//
// Dois modos:
//   'visualizando' — toca numa regiao e o pai recebe qual foi (onTocarRegiao)
//   'marcando'     — cada toque vira um vertice do poligono em construcao
//
// As coordenadas entram e saem SEMPRE normalizadas (0 a 1). A conversao para
// pixels acontece so aqui dentro, na hora de desenhar. E o que faz a marcacao
// feita num aparelho cair no lugar certo em qualquer outro.

import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { avaliarRegiao } from '../services/planta';

// Centro aproximado do poligono — usado para posicionar o rotulo do caminhao.
// E a media dos vertices, nao o centroide geometrico: bem mais simples e
// suficiente para poligonos pequenos e razoavelmente regulares.
function centroAproximado(pontos) {
  const soma = pontos.reduce(
    (acumulado, p) => ({ x: acumulado.x + p.x, y: acumulado.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: soma.x / pontos.length, y: soma.y / pontos.length };
}

export default function PlantaInterativa({
  urlImagem,
  largura,
  altura,
  regioes = [],
  fckProjeto,
  modo = 'visualizando',
  pontosNovos = [],
  larguraDisponivel,
  onTocarPlanta,
  onTocarRegiao,
}) {
  // Altura proporcional a largura disponivel, preservando o formato da foto
  const larguraExibida = larguraDisponivel;
  const alturaExibida = larguraDisponivel * (altura / largura);

  const marcando = modo === 'marcando';

  // Normalizado (0..1) → pixels na tela
  const paraPixels = (ponto) => ({
    x: ponto.x * larguraExibida,
    y: ponto.y * alturaExibida,
  });

  // Formato que o react-native-svg espera: "x1,y1 x2,y2 ..."
  const paraSvg = (pontos) =>
    pontos
      .map((p) => {
        const pixel = paraPixels(p);
        return `${pixel.x},${pixel.y}`;
      })
      .join(' ');

  // Toque na planta em modo de marcacao — devolve a posicao normalizada.
  // O clamp protege de toques na borda que escapariam de 0..1.
  function handleToque(evento) {
    const { locationX, locationY } = evento.nativeEvent;

    const ponto = {
      x: Math.min(Math.max(locationX / larguraExibida, 0), 1),
      y: Math.min(Math.max(locationY / alturaExibida, 0), 1),
    };

    onTocarPlanta?.(ponto);
  }

  return (
    <View style={{ width: larguraExibida, height: alturaExibida }}>

      <Image
        source={{ uri: urlImagem }}
        style={[styles.imagem, { width: larguraExibida, height: alturaExibida }]}
        resizeMode="contain"
      />

      <Svg
        width={larguraExibida}
        height={alturaExibida}
        style={StyleSheet.absoluteFill}
        // Em modo de marcacao a camada de toque fica por cima, entao o SVG
        // nao pode interceptar nada
        pointerEvents={marcando ? 'none' : 'box-none'}
      >

        {/* ── REGIOES JA SALVAS ── */}
        {regioes.map((regiao) => {
          const { cor, tracejado } = avaliarRegiao(regiao, fckProjeto);
          const centro = paraPixels(centroAproximado(regiao.pontos));

          return (
            <React.Fragment key={regiao.id}>
              <Polygon
                points={paraSvg(regiao.pontos)}
                fill={cor}
                // Area reforcada fica mais transparente e com borda tracejada:
                // e verde porque esta resolvida, mas nao pode se confundir com
                // quem passou no ensaio de primeira
                fillOpacity={tracejado ? 0.2 : 0.35}
                stroke={cor}
                strokeWidth={2.5}
                strokeDasharray={tracejado ? '9,5' : undefined}
                onPress={() => onTocarRegiao?.(regiao)}
              />
              <SvgText
                x={centro.x}
                y={centro.y}
                fill="#fff"
                fontSize={13}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
                // O rotulo nao intercepta toque: quem responde e o poligono
                pointerEvents="none"
              >
                {regiao.caminhao}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* ── POLIGONO EM CONSTRUCAO ── */}
        {/* Com 3+ vertices ja mostra a area preenchida, para o usuario
            enxergar o formato antes de confirmar */}
        {pontosNovos.length >= 3 && (
          <Polygon
            points={paraSvg(pontosNovos)}
            fill="#22C55E"
            fillOpacity={0.25}
            stroke="#22C55E"
            strokeWidth={2}
            strokeDasharray="6,4"
          />
        )}

        {/* Com 2 vertices ainda e so uma linha */}
        {pontosNovos.length === 2 && (
          <Polyline
            points={paraSvg(pontosNovos)}
            fill="none"
            stroke="#22C55E"
            strokeWidth={2}
            strokeDasharray="6,4"
          />
        )}

        {/* Vertices marcados, para o usuario ver onde tocou */}
        {pontosNovos.map((ponto, indice) => {
          const pixel = paraPixels(ponto);
          return (
            <Circle
              key={indice}
              cx={pixel.x}
              cy={pixel.y}
              r={6}
              fill="#22C55E"
              stroke="#fff"
              strokeWidth={2}
            />
          );
        })}

      </Svg>

      {/* ── CAMADA DE TOQUE ── */}
      {/* So existe em modo de marcacao. Fica por cima de tudo para que o
          toque vire vertice, e nao selecao de regiao. */}
      {marcando && (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleToque} />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  imagem: {
    position: 'absolute',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
